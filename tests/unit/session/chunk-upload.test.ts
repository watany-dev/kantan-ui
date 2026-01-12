import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionManager } from "../../../src/session/manager";
import type { ChunkUploadStartMessage } from "../../../src/websocket/types";

describe("SessionManager - Chunk Upload", () => {
	let manager: SessionManager;
	let sessionId: string;

	beforeEach(() => {
		manager = new SessionManager();
		const session = manager.createSession();
		sessionId = session.id;
	});

	afterEach(() => {
		manager.stopCleanupInterval();
	});

	describe("startChunkUpload", () => {
		it("creates a chunk upload session and returns uploadId", () => {
			const message: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 10240,
				totalChunks: 10,
				chunkSize: 1024,
			};

			const result = manager.startChunkUpload(sessionId, message);

			expect(result).toBe("upload-123");
		});

		it("returns null for invalid session", () => {
			const message: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 10240,
				totalChunks: 10,
				chunkSize: 1024,
			};

			const result = manager.startChunkUpload("invalid-session", message);

			expect(result).toBeNull();
		});

		it("returns null if duplicate uploadId", () => {
			const message: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 10240,
				totalChunks: 10,
				chunkSize: 1024,
			};

			manager.startChunkUpload(sessionId, message);
			const result = manager.startChunkUpload(sessionId, message);

			expect(result).toBeNull();
		});
	});

	describe("receiveChunk", () => {
		it("receives a chunk and returns true", () => {
			const message: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 2048,
				totalChunks: 2,
				chunkSize: 1024,
			};
			manager.startChunkUpload(sessionId, message);

			// Base64 encoded "Hello, World!"
			const data = "SGVsbG8sIFdvcmxkIQ==";
			const result = manager.receiveChunk("upload-123", 0, data);

			expect(result).toBe(true);
		});

		it("returns false for non-existent uploadId", () => {
			const data = "SGVsbG8sIFdvcmxkIQ==";
			const result = manager.receiveChunk("non-existent", 0, data);

			expect(result).toBe(false);
		});

		it("returns false for duplicate chunk index (idempotent)", () => {
			const message: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 2048,
				totalChunks: 2,
				chunkSize: 1024,
			};
			manager.startChunkUpload(sessionId, message);

			const data = "SGVsbG8sIFdvcmxkIQ==";
			manager.receiveChunk("upload-123", 0, data);
			const result = manager.receiveChunk("upload-123", 0, data);

			expect(result).toBe(false);
		});

		it("accepts chunks out of order", () => {
			const message: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 3072,
				totalChunks: 3,
				chunkSize: 1024,
			};
			manager.startChunkUpload(sessionId, message);

			// Send chunks out of order
			expect(manager.receiveChunk("upload-123", 2, "Y2h1bmsy")).toBe(true);
			expect(manager.receiveChunk("upload-123", 0, "Y2h1bmsx")).toBe(true);
			expect(manager.receiveChunk("upload-123", 1, "Y2h1bmsz")).toBe(true);
		});

		it("returns false for invalid chunk index", () => {
			const message: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 2048,
				totalChunks: 2,
				chunkSize: 1024,
			};
			manager.startChunkUpload(sessionId, message);

			// Chunk index out of range
			expect(manager.receiveChunk("upload-123", -1, "data")).toBe(false);
			expect(manager.receiveChunk("upload-123", 2, "data")).toBe(false);
		});

		it("returns false for invalid base64 data", () => {
			const message: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 2048,
				totalChunks: 2,
				chunkSize: 1024,
			};
			manager.startChunkUpload(sessionId, message);

			// Invalid base64 - atob will throw
			const result = manager.receiveChunk("upload-123", 0, "!!!invalid-base64!!!");

			expect(result).toBe(false);
		});
	});

	describe("completeChunkUpload", () => {
		it("completes upload and returns assembled data", () => {
			const message: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 12,
				totalChunks: 2,
				chunkSize: 6,
			};
			manager.startChunkUpload(sessionId, message);

			// "Hello," and " World" in Base64
			manager.receiveChunk("upload-123", 0, "SGVsbG8s");
			manager.receiveChunk("upload-123", 1, "IFdvcmxk");

			const result = manager.completeChunkUpload("upload-123");

			expect(result).not.toBeNull();
			if (result) {
				const text = new TextDecoder().decode(result);
				expect(text).toBe("Hello, World");
			}
		});

		it("returns null if not all chunks received", () => {
			const message: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 2048,
				totalChunks: 2,
				chunkSize: 1024,
			};
			manager.startChunkUpload(sessionId, message);

			// Only send one chunk
			manager.receiveChunk("upload-123", 0, "SGVsbG8s");

			const result = manager.completeChunkUpload("upload-123");

			expect(result).toBeNull();
		});

		it("returns null for non-existent uploadId", () => {
			const result = manager.completeChunkUpload("non-existent");

			expect(result).toBeNull();
		});

		it("cleans up chunk upload state after completion", () => {
			const message: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 6,
				totalChunks: 1,
				chunkSize: 6,
			};
			manager.startChunkUpload(sessionId, message);
			manager.receiveChunk("upload-123", 0, "SGVsbG8s");
			manager.completeChunkUpload("upload-123");

			// After completion, the upload state should be cleaned up
			const result = manager.completeChunkUpload("upload-123");
			expect(result).toBeNull();
		});
	});

	describe("getChunkUploadProgress", () => {
		it("returns progress information", () => {
			const message: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 3072,
				totalChunks: 3,
				chunkSize: 1024,
			};
			manager.startChunkUpload(sessionId, message);
			manager.receiveChunk("upload-123", 0, "Y2h1bmsx");

			const progress = manager.getChunkUploadProgress("upload-123");

			expect(progress).toEqual({
				totalChunks: 3,
				receivedChunks: 1,
				percentage: 33,
			});
		});

		it("returns null for non-existent uploadId", () => {
			const progress = manager.getChunkUploadProgress("non-existent");

			expect(progress).toBeNull();
		});
	});

	describe("cleanupExpiredChunkUploads", () => {
		it("removes expired chunk uploads", () => {
			vi.useFakeTimers();

			const message: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 1024,
				totalChunks: 1,
				chunkSize: 1024,
			};
			manager.startChunkUpload(sessionId, message);

			// Advance time by 6 minutes (past 5 minute timeout)
			vi.advanceTimersByTime(6 * 60 * 1000);

			const cleaned = manager.cleanupExpiredChunkUploads();

			expect(cleaned).toBe(1);
			expect(manager.getChunkUploadProgress("upload-123")).toBeNull();

			vi.useRealTimers();
		});

		it("does not remove active chunk uploads", () => {
			vi.useFakeTimers();

			const message: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 1024,
				totalChunks: 1,
				chunkSize: 1024,
			};
			manager.startChunkUpload(sessionId, message);

			// Advance time by 1 minute (within 5 minute timeout)
			vi.advanceTimersByTime(1 * 60 * 1000);

			const cleaned = manager.cleanupExpiredChunkUploads();

			expect(cleaned).toBe(0);
			expect(manager.getChunkUploadProgress("upload-123")).not.toBeNull();

			vi.useRealTimers();
		});

		it("updates lastActivityAt when receiving chunks", () => {
			vi.useFakeTimers();

			const message: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 2048,
				totalChunks: 2,
				chunkSize: 1024,
			};
			manager.startChunkUpload(sessionId, message);

			// Advance time by 4 minutes
			vi.advanceTimersByTime(4 * 60 * 1000);

			// Receive a chunk to update lastActivityAt
			manager.receiveChunk("upload-123", 0, "Y2h1bmsx");

			// Advance time by another 4 minutes (total 8 minutes from start, but only 4 from last activity)
			vi.advanceTimersByTime(4 * 60 * 1000);

			const cleaned = manager.cleanupExpiredChunkUploads();

			expect(cleaned).toBe(0);
			expect(manager.getChunkUploadProgress("upload-123")).not.toBeNull();

			vi.useRealTimers();
		});
	});

	describe("getChunkUploadMetadata", () => {
		it("returns metadata for an active upload", () => {
			const message: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 10240,
				totalChunks: 10,
				chunkSize: 1024,
			};
			manager.startChunkUpload(sessionId, message);

			const metadata = manager.getChunkUploadMetadata("upload-123");

			expect(metadata).toEqual({
				widgetId: "uploader1",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 10240,
			});
		});

		it("returns null for non-existent uploadId", () => {
			const metadata = manager.getChunkUploadMetadata("non-existent");

			expect(metadata).toBeNull();
		});
	});

	describe("cancelChunkUpload", () => {
		it("cancels an active chunk upload", () => {
			const message: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 1024,
				totalChunks: 1,
				chunkSize: 1024,
			};
			manager.startChunkUpload(sessionId, message);

			const result = manager.cancelChunkUpload("upload-123");

			expect(result).toBe(true);
			expect(manager.getChunkUploadProgress("upload-123")).toBeNull();
		});

		it("returns false for non-existent uploadId", () => {
			const result = manager.cancelChunkUpload("non-existent");

			expect(result).toBe(false);
		});
	});
});
