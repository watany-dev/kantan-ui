import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionManager } from "../../../src/session/manager";
import * as fileValidation from "../../../src/utils/file-validation";
import {
	handleChunkUploadComplete,
	handleChunkUploadData,
	handleChunkUploadStart,
} from "../../../src/websocket/chunk-upload-handler";
import type {
	ChunkUploadDataMessage,
	ChunkUploadEndMessage,
	ChunkUploadStartMessage,
} from "../../../src/websocket/types";

describe("chunk-upload-handler", () => {
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

	describe("handleChunkUploadStart", () => {
		it("initializes a chunk upload and returns success", () => {
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

			const result = handleChunkUploadStart(message, sessionId, manager);

			expect(result.status).toBe("started");
			expect(result.uploadId).toBe("upload-123");
			expect(result.error).toBeUndefined();
		});

		it("returns error for invalid session", () => {
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

			const result = handleChunkUploadStart(message, "invalid-session", manager);

			expect(result.status).toBe("error");
			expect(result.error?.code).toBe("SESSION_NOT_FOUND");
		});

		it("returns error for duplicate uploadId", () => {
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

			handleChunkUploadStart(message, sessionId, manager);
			const result = handleChunkUploadStart(message, sessionId, manager);

			expect(result.status).toBe("error");
			expect(result.error?.code).toBe("DUPLICATE_UPLOAD_ID");
		});

		it("checks rate limiting", () => {
			// Configure strict rate limits
			const strictManager = new SessionManager(
				{},
				{
					fileUploadRateLimit: {
						maxUploadsPerMinute: 1,
						maxBytesPerMinute: 1024,
						maxConcurrentUploads: 1,
					},
				},
			);
			const strictSession = strictManager.createSession();

			// First upload should succeed
			const message1: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-1",
				filename: "test1.txt",
				mimeType: "text/plain",
				totalSize: 500,
				totalChunks: 1,
				chunkSize: 500,
			};
			handleChunkUploadStart(message1, strictSession.id, strictManager);

			// Second upload should fail due to concurrent limit
			const message2: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-2",
				filename: "test2.txt",
				mimeType: "text/plain",
				totalSize: 500,
				totalChunks: 1,
				chunkSize: 500,
			};

			const result = handleChunkUploadStart(message2, strictSession.id, strictManager);

			expect(result.status).toBe("error");
			expect(result.error?.code).toBe("UPLOAD_RATE_LIMITED");

			strictManager.stopCleanupInterval();
		});

		it("includes retryAfter when rate limited with cooldown", () => {
			// Configure with cooldown
			const strictManager = new SessionManager(
				{},
				{
					fileUploadRateLimit: {
						maxUploadsPerMinute: 1,
						maxBytesPerMinute: 100,
						maxConcurrentUploads: 10,
						uploadRateLimitCooldown: 5000,
					},
				},
			);
			const strictSession = strictManager.createSession();

			// First upload completes (simulate bytes recorded)
			const message1: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-1",
				filename: "test1.txt",
				mimeType: "text/plain",
				totalSize: 100,
				totalChunks: 1,
				chunkSize: 100,
			};
			handleChunkUploadStart(message1, strictSession.id, strictManager);
			strictManager.recordFileUploadCompletion(strictSession.id, 100);
			strictManager.decrementConcurrentUploads(strictSession.id);

			// Second upload should fail due to bytes limit with retryAfter
			const message2: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-2",
				filename: "test2.txt",
				mimeType: "text/plain",
				totalSize: 100,
				totalChunks: 1,
				chunkSize: 100,
			};

			const result = handleChunkUploadStart(message2, strictSession.id, strictManager);

			expect(result.status).toBe("error");
			expect(result.error?.code).toBe("UPLOAD_RATE_LIMITED");
			expect(result.retryAfter).toBeDefined();

			strictManager.stopCleanupInterval();
		});
	});

	describe("handleChunkUploadData", () => {
		it("receives chunk and returns progress", () => {
			const startMessage: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 2048,
				totalChunks: 2,
				chunkSize: 1024,
			};
			handleChunkUploadStart(startMessage, sessionId, manager);

			const dataMessage: ChunkUploadDataMessage = {
				type: "chunk_upload_data",
				uploadId: "upload-123",
				chunkIndex: 0,
				data: "SGVsbG8sIFdvcmxkIQ==", // Base64 "Hello, World!"
			};

			const result = handleChunkUploadData(dataMessage, manager);

			expect(result.status).toBe("chunk_received");
			expect(result.uploadId).toBe("upload-123");
			expect(result.chunkIndex).toBe(0);
			expect(result.progress).toBe(50); // 1 of 2 chunks
		});

		it("returns error for non-existent uploadId", () => {
			const dataMessage: ChunkUploadDataMessage = {
				type: "chunk_upload_data",
				uploadId: "non-existent",
				chunkIndex: 0,
				data: "SGVsbG8=",
			};

			const result = handleChunkUploadData(dataMessage, manager);

			expect(result.status).toBe("error");
			expect(result.error?.code).toBe("UPLOAD_NOT_FOUND");
		});

		it("returns error for duplicate chunk index", () => {
			const startMessage: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 2048,
				totalChunks: 2,
				chunkSize: 1024,
			};
			handleChunkUploadStart(startMessage, sessionId, manager);

			const dataMessage: ChunkUploadDataMessage = {
				type: "chunk_upload_data",
				uploadId: "upload-123",
				chunkIndex: 0,
				data: "SGVsbG8=",
			};

			handleChunkUploadData(dataMessage, manager);
			const result = handleChunkUploadData(dataMessage, manager);

			expect(result.status).toBe("error");
			expect(result.error?.code).toBe("DUPLICATE_CHUNK");
		});

		it("returns error for chunk index out of range (too high)", () => {
			const startMessage: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 1024,
				totalChunks: 1,
				chunkSize: 1024,
			};
			handleChunkUploadStart(startMessage, sessionId, manager);

			const dataMessage: ChunkUploadDataMessage = {
				type: "chunk_upload_data",
				uploadId: "upload-123",
				chunkIndex: 5, // Out of range
				data: "SGVsbG8=",
			};

			const result = handleChunkUploadData(dataMessage, manager);

			expect(result.status).toBe("error");
			expect(result.error?.code).toBe("INVALID_CHUNK_INDEX");
		});

		it("returns error for negative chunk index", () => {
			const startMessage: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 1024,
				totalChunks: 1,
				chunkSize: 1024,
			};
			handleChunkUploadStart(startMessage, sessionId, manager);

			const dataMessage: ChunkUploadDataMessage = {
				type: "chunk_upload_data",
				uploadId: "upload-123",
				chunkIndex: -1, // Negative index
				data: "SGVsbG8=",
			};

			const result = handleChunkUploadData(dataMessage, manager);

			expect(result.status).toBe("error");
			expect(result.error?.code).toBe("INVALID_CHUNK_INDEX");
		});
	});

	describe("handleChunkUploadComplete", () => {
		it("completes upload and returns upload result", () => {
			const startMessage: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 12,
				totalChunks: 2,
				chunkSize: 6,
			};
			handleChunkUploadStart(startMessage, sessionId, manager);

			// Send both chunks - "Hello," and " World" in Base64
			handleChunkUploadData(
				{ type: "chunk_upload_data", uploadId: "upload-123", chunkIndex: 0, data: "SGVsbG8s" },
				manager,
			);
			handleChunkUploadData(
				{ type: "chunk_upload_data", uploadId: "upload-123", chunkIndex: 1, data: "IFdvcmxk" },
				manager,
			);

			const completeMessage: ChunkUploadEndMessage = {
				type: "chunk_upload_end",
				uploadId: "upload-123",
			};

			const result = handleChunkUploadComplete(completeMessage, sessionId, manager);

			expect(result.status).toBe("upload_complete");
			expect(result.uploadId).toBe("upload-123");
			expect(result.registeredUploadId).toBeDefined();
			expect(result.error).toBeUndefined();
		});

		it("returns error if not all chunks received", () => {
			const startMessage: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 2048,
				totalChunks: 2,
				chunkSize: 1024,
			};
			handleChunkUploadStart(startMessage, sessionId, manager);

			// Only send one chunk
			handleChunkUploadData(
				{ type: "chunk_upload_data", uploadId: "upload-123", chunkIndex: 0, data: "SGVsbG8=" },
				manager,
			);

			const completeMessage: ChunkUploadEndMessage = {
				type: "chunk_upload_end",
				uploadId: "upload-123",
			};

			const result = handleChunkUploadComplete(completeMessage, sessionId, manager);

			expect(result.status).toBe("error");
			expect(result.error?.code).toBe("INCOMPLETE_UPLOAD");
		});

		it("returns error for non-existent uploadId", () => {
			const completeMessage: ChunkUploadEndMessage = {
				type: "chunk_upload_end",
				uploadId: "non-existent",
			};

			const result = handleChunkUploadComplete(completeMessage, sessionId, manager);

			expect(result.status).toBe("error");
			expect(result.error?.code).toBe("UPLOAD_NOT_FOUND");
		});

		it("validates assembled file and rejects dangerous files", () => {
			const startMessage: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.exe",
				mimeType: "application/octet-stream",
				totalSize: 2,
				totalChunks: 1,
				chunkSize: 2,
			};
			handleChunkUploadStart(startMessage, sessionId, manager);

			// Send MZ header (executable magic bytes)
			handleChunkUploadData(
				{ type: "chunk_upload_data", uploadId: "upload-123", chunkIndex: 0, data: "TVo=" }, // MZ in Base64
				manager,
			);

			const completeMessage: ChunkUploadEndMessage = {
				type: "chunk_upload_end",
				uploadId: "upload-123",
			};

			const result = handleChunkUploadComplete(completeMessage, sessionId, manager);

			expect(result.status).toBe("error");
			expect(result.error?.code).toBe("DANGEROUS_FILE");
		});

		it("returns SIZE_EXCEEDED when validation fails with size error", () => {
			const validateSpy = vi.spyOn(fileValidation, "validateUploadedFile").mockReturnValueOnce({
				valid: false,
				errors: [{ code: "SIZE_EXCEEDED", message: "File too large" }],
				sanitizedFilename: "test.txt",
			});

			const startMessage: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-size-test",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 5,
				totalChunks: 1,
				chunkSize: 5,
			};
			handleChunkUploadStart(startMessage, sessionId, manager);

			handleChunkUploadData(
				{
					type: "chunk_upload_data",
					uploadId: "upload-size-test",
					chunkIndex: 0,
					data: "SGVsbG8=",
				},
				manager,
			);

			const completeMessage: ChunkUploadEndMessage = {
				type: "chunk_upload_end",
				uploadId: "upload-size-test",
			};

			const result = handleChunkUploadComplete(completeMessage, sessionId, manager);

			expect(result.status).toBe("error");
			expect(result.error?.code).toBe("SIZE_EXCEEDED");

			validateSpy.mockRestore();
		});

		it("returns TYPE_NOT_ALLOWED when validation fails with type error", () => {
			const validateSpy = vi.spyOn(fileValidation, "validateUploadedFile").mockReturnValueOnce({
				valid: false,
				errors: [{ code: "TYPE_NOT_ALLOWED", message: "File type not allowed" }],
				sanitizedFilename: "test.txt",
			});

			const startMessage: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-type-test",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 5,
				totalChunks: 1,
				chunkSize: 5,
			};
			handleChunkUploadStart(startMessage, sessionId, manager);

			handleChunkUploadData(
				{
					type: "chunk_upload_data",
					uploadId: "upload-type-test",
					chunkIndex: 0,
					data: "SGVsbG8=",
				},
				manager,
			);

			const completeMessage: ChunkUploadEndMessage = {
				type: "chunk_upload_end",
				uploadId: "upload-type-test",
			};

			const result = handleChunkUploadComplete(completeMessage, sessionId, manager);

			expect(result.status).toBe("error");
			expect(result.error?.code).toBe("TYPE_NOT_ALLOWED");

			validateSpy.mockRestore();
		});

		it("updates widget state with upload ID", () => {
			const startMessage: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 5,
				totalChunks: 1,
				chunkSize: 5,
			};
			handleChunkUploadStart(startMessage, sessionId, manager);

			// "Hello" in Base64
			handleChunkUploadData(
				{ type: "chunk_upload_data", uploadId: "upload-123", chunkIndex: 0, data: "SGVsbG8=" },
				manager,
			);

			const completeMessage: ChunkUploadEndMessage = {
				type: "chunk_upload_end",
				uploadId: "upload-123",
			};

			const result = handleChunkUploadComplete(completeMessage, sessionId, manager);

			// Check widget state was updated
			const state = manager.getState(sessionId);
			expect(state?.["uploader1"]).toContain(result.registeredUploadId);
		});

		it("decrements concurrent uploads on completion", () => {
			const startMessage: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 5,
				totalChunks: 1,
				chunkSize: 5,
			};
			handleChunkUploadStart(startMessage, sessionId, manager);

			expect(manager.getConcurrentUploads(sessionId)).toBe(1);

			handleChunkUploadData(
				{ type: "chunk_upload_data", uploadId: "upload-123", chunkIndex: 0, data: "SGVsbG8=" },
				manager,
			);

			const completeMessage: ChunkUploadEndMessage = {
				type: "chunk_upload_end",
				uploadId: "upload-123",
			};

			handleChunkUploadComplete(completeMessage, sessionId, manager);

			expect(manager.getConcurrentUploads(sessionId)).toBe(0);
		});

		it("returns SESSION_LIMIT error when max uploads per session exceeded", () => {
			// Fill up to the session limit (100 files) using direct registration
			for (let i = 0; i < 100; i++) {
				manager.registerUpload(sessionId, new ArrayBuffer(10), `test${i}.txt`, "text/plain");
			}

			// Start chunk upload
			const startMessage: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-overflow",
				filename: "overflow.txt",
				mimeType: "text/plain",
				totalSize: 5,
				totalChunks: 1,
				chunkSize: 5,
			};
			handleChunkUploadStart(startMessage, sessionId, manager);

			// Send chunk data
			handleChunkUploadData(
				{ type: "chunk_upload_data", uploadId: "upload-overflow", chunkIndex: 0, data: "SGVsbG8=" },
				manager,
			);

			// Complete should fail with SESSION_LIMIT
			const completeMessage: ChunkUploadEndMessage = {
				type: "chunk_upload_end",
				uploadId: "upload-overflow",
			};

			const result = handleChunkUploadComplete(completeMessage, sessionId, manager);
			expect(result.status).toBe("error");
			expect(result.error?.code).toBe("SESSION_LIMIT");
		});

		it("maps unknown validation error codes to VALIDATION_ERROR", () => {
			// Mock validateUploadedFile to return an unknown error code
			const validateSpy = vi.spyOn(fileValidation, "validateUploadedFile").mockReturnValue({
				valid: false,
				errors: [
					{
						code: "UNKNOWN_CODE" as fileValidation.FileValidationErrorCode,
						message: "Unknown error",
					},
				],
				warnings: [],
				sanitizedFilename: "test.txt",
			});

			const startMessage: ChunkUploadStartMessage = {
				type: "chunk_upload_start",
				widgetId: "uploader1",
				uploadId: "upload-123",
				filename: "test.txt",
				mimeType: "text/plain",
				totalSize: 5,
				totalChunks: 1,
				chunkSize: 5,
			};
			handleChunkUploadStart(startMessage, sessionId, manager);

			handleChunkUploadData(
				{ type: "chunk_upload_data", uploadId: "upload-123", chunkIndex: 0, data: "SGVsbG8=" },
				manager,
			);

			const completeMessage: ChunkUploadEndMessage = {
				type: "chunk_upload_end",
				uploadId: "upload-123",
			};

			const result = handleChunkUploadComplete(completeMessage, sessionId, manager);
			expect(result.status).toBe("error");
			expect(result.error?.code).toBe("VALIDATION_ERROR");

			validateSpy.mockRestore();
		});
	});
});
