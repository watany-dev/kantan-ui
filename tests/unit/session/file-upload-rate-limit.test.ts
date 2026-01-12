import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionManager } from "../../../src/session/manager";

describe("File Upload Rate Limit", () => {
	let sessionManager: SessionManager;
	const testSessionId = "test-session-123";

	beforeEach(() => {
		vi.useFakeTimers();
		sessionManager = new SessionManager(
			{},
			{
				fileUploadRateLimit: {
					maxUploadsPerMinute: 5,
					maxBytesPerMinute: 10 * 1024 * 1024, // 10MB
					maxConcurrentUploads: 2,
					uploadRateLimitCooldown: 5000,
				},
			},
		);
		sessionManager.createSession(testSessionId);
	});

	afterEach(() => {
		sessionManager.stopCleanupInterval();
		vi.useRealTimers();
	});

	describe("checkFileUploadRateLimit", () => {
		it("should allow upload within limits", () => {
			const result = sessionManager.checkFileUploadRateLimit(testSessionId, 1024);
			expect(result.allowed).toBe(true);
			expect(result.reason).toBeUndefined();
		});

		it("should reject when upload count exceeds limit", () => {
			// Perform 5 uploads (the limit)
			for (let i = 0; i < 5; i++) {
				sessionManager.recordFileUploadCompletion(testSessionId, 1024);
			}

			const result = sessionManager.checkFileUploadRateLimit(testSessionId, 1024);
			expect(result.allowed).toBe(false);
			expect(result.reason).toBe("count_exceeded");
			expect(result.retryAfter).toBeDefined();
		});

		it("should reject when bytes exceed limit", () => {
			// Record 10MB upload
			sessionManager.recordFileUploadCompletion(testSessionId, 10 * 1024 * 1024);

			const result = sessionManager.checkFileUploadRateLimit(testSessionId, 1024);
			expect(result.allowed).toBe(false);
			expect(result.reason).toBe("bytes_exceeded");
		});

		it("should reject when concurrent uploads exceed limit", () => {
			// Start 2 concurrent uploads (the limit)
			sessionManager.incrementConcurrentUploads(testSessionId);
			sessionManager.incrementConcurrentUploads(testSessionId);

			const result = sessionManager.checkFileUploadRateLimit(testSessionId, 1024);
			expect(result.allowed).toBe(false);
			expect(result.reason).toBe("concurrent_exceeded");
		});

		it("should allow after concurrent upload completes", () => {
			sessionManager.incrementConcurrentUploads(testSessionId);
			sessionManager.incrementConcurrentUploads(testSessionId);

			// Complete one upload
			sessionManager.decrementConcurrentUploads(testSessionId);

			const result = sessionManager.checkFileUploadRateLimit(testSessionId, 1024);
			expect(result.allowed).toBe(true);
		});

		it("should reset limits after 1 minute window", () => {
			// Perform 5 uploads (the limit)
			for (let i = 0; i < 5; i++) {
				sessionManager.recordFileUploadCompletion(testSessionId, 1024);
			}

			// Verify limit is reached
			let result = sessionManager.checkFileUploadRateLimit(testSessionId, 1024);
			expect(result.allowed).toBe(false);

			// Advance time by 1 minute
			vi.advanceTimersByTime(60 * 1000);

			// Should be allowed again
			result = sessionManager.checkFileUploadRateLimit(testSessionId, 1024);
			expect(result.allowed).toBe(true);
		});

		it("should allow for unknown session", () => {
			const result = sessionManager.checkFileUploadRateLimit("unknown-session", 1024);
			expect(result.allowed).toBe(true);
		});

		it("should check file size before upload starts", () => {
			// File that would exceed bytes limit
			const largeFileSize = 11 * 1024 * 1024; // 11MB, exceeds 10MB limit
			const result = sessionManager.checkFileUploadRateLimit(testSessionId, largeFileSize);
			expect(result.allowed).toBe(false);
			expect(result.reason).toBe("bytes_exceeded");
		});
	});

	describe("concurrent upload tracking", () => {
		it("should track concurrent uploads correctly", () => {
			expect(sessionManager.getConcurrentUploads(testSessionId)).toBe(0);

			sessionManager.incrementConcurrentUploads(testSessionId);
			expect(sessionManager.getConcurrentUploads(testSessionId)).toBe(1);

			sessionManager.incrementConcurrentUploads(testSessionId);
			expect(sessionManager.getConcurrentUploads(testSessionId)).toBe(2);

			sessionManager.decrementConcurrentUploads(testSessionId);
			expect(sessionManager.getConcurrentUploads(testSessionId)).toBe(1);

			sessionManager.decrementConcurrentUploads(testSessionId);
			expect(sessionManager.getConcurrentUploads(testSessionId)).toBe(0);
		});

		it("should not go below zero", () => {
			sessionManager.decrementConcurrentUploads(testSessionId);
			expect(sessionManager.getConcurrentUploads(testSessionId)).toBe(0);
		});
	});

	describe("upload completion recording", () => {
		it("should accumulate bytes uploaded", () => {
			sessionManager.recordFileUploadCompletion(testSessionId, 1024);
			sessionManager.recordFileUploadCompletion(testSessionId, 2048);

			// 3rd upload should succeed (3KB total)
			const result = sessionManager.checkFileUploadRateLimit(testSessionId, 1024);
			expect(result.allowed).toBe(true);
		});

		it("should track upload count", () => {
			for (let i = 0; i < 4; i++) {
				sessionManager.recordFileUploadCompletion(testSessionId, 100);
			}

			// 5th upload should succeed (limit is 5)
			let result = sessionManager.checkFileUploadRateLimit(testSessionId, 100);
			expect(result.allowed).toBe(true);

			sessionManager.recordFileUploadCompletion(testSessionId, 100);

			// 6th upload should fail
			result = sessionManager.checkFileUploadRateLimit(testSessionId, 100);
			expect(result.allowed).toBe(false);
			expect(result.reason).toBe("count_exceeded");
		});
	});
});
