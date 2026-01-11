import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SessionManager, setSessionManager } from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import {
	getFileUploaderValue,
	initializeFileUploaderState,
} from "../../../src/widgets/file-uploader";
import { resetWidgetCounter } from "../../../src/widgets/registry";

describe("file-uploader core logic", () => {
	let manager: SessionManager;
	let sessionId: string;

	beforeEach(() => {
		manager = new SessionManager();
		setSessionManager(manager);
		const session = manager.createSession();
		sessionId = session.id;
		setCurrentSessionId(sessionId);
		resetWidgetCounter();
	});

	afterEach(() => {
		manager.stopCleanupInterval();
		setCurrentSessionId(null);
	});

	describe("initializeFileUploaderState", () => {
		it("returns null when no file uploaded (single mode)", () => {
			const result = initializeFileUploaderState("uploader1", false);
			expect(result).toBeNull();
		});

		it("returns empty array when no files uploaded (multiple mode)", () => {
			const result = initializeFileUploaderState("uploader1", true);
			expect(result).toEqual([]);
		});

		it("returns null for single mode consistently", () => {
			const result1 = initializeFileUploaderState("uploader1", false);
			const result2 = initializeFileUploaderState("uploader1", false);
			expect(result1).toBeNull();
			expect(result2).toBeNull();
		});
	});

	describe("getFileUploaderValue", () => {
		it("returns null when no upload data exists (single mode)", () => {
			const result = getFileUploaderValue("uploader1", false);
			expect(result).toBeNull();
		});

		it("returns empty array when no upload data exists (multiple mode)", () => {
			const result = getFileUploaderValue("uploader1", true);
			expect(result).toEqual([]);
		});

		it("returns UploadedFile when upload data exists", () => {
			// Register upload in session
			const data = new TextEncoder().encode("file content").buffer;
			const uploadId = manager.registerUpload(sessionId, data, "test.txt", "text/plain");
			expect(uploadId).not.toBeNull();

			// Set widget state to reference the upload
			manager.setState(sessionId, "uploader1", [uploadId]);

			const result = getFileUploaderValue("uploader1", false);
			expect(result).not.toBeNull();
			expect(result?.name).toBe("test.txt");
			expect(result?.type).toBe("text/plain");
			expect(result?.size).toBe(12);
		});

		it("returns array of UploadedFiles in multiple mode", () => {
			// Register multiple uploads
			const data1 = new TextEncoder().encode("file 1").buffer;
			const data2 = new TextEncoder().encode("file 2").buffer;
			const uploadId1 = manager.registerUpload(sessionId, data1, "file1.txt", "text/plain");
			const uploadId2 = manager.registerUpload(sessionId, data2, "file2.txt", "text/plain");

			// Set widget state
			manager.setState(sessionId, "uploader1", [uploadId1, uploadId2]);

			const result = getFileUploaderValue("uploader1", true);
			expect(Array.isArray(result)).toBe(true);
			expect(result).toHaveLength(2);
			expect(result[0]?.name).toBe("file1.txt");
			expect(result[1]?.name).toBe("file2.txt");
		});

		it("filters out invalid upload IDs", () => {
			// Register one valid upload
			const data = new TextEncoder().encode("content").buffer;
			const validId = manager.registerUpload(sessionId, data, "valid.txt", "text/plain");

			// Set state with valid and invalid IDs
			manager.setState(sessionId, "uploader1", [validId, "invalid-id", "another-invalid"]);

			const result = getFileUploaderValue("uploader1", true);
			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("valid.txt");
		});

		it("returns first file in single mode even with multiple uploads", () => {
			const data1 = new TextEncoder().encode("first").buffer;
			const data2 = new TextEncoder().encode("second").buffer;
			const uploadId1 = manager.registerUpload(sessionId, data1, "first.txt", "text/plain");
			const uploadId2 = manager.registerUpload(sessionId, data2, "second.txt", "text/plain");

			manager.setState(sessionId, "uploader1", [uploadId1, uploadId2]);

			const result = getFileUploaderValue("uploader1", false);
			expect(result).not.toBeNull();
			expect(result?.name).toBe("first.txt");
		});
	});

	describe("UploadedFile interface", () => {
		it("text() returns file content as string", () => {
			const content = "Hello, World!";
			const data = new TextEncoder().encode(content).buffer;
			const uploadId = manager.registerUpload(sessionId, data, "test.txt", "text/plain");
			manager.setState(sessionId, "uploader1", [uploadId]);

			const file = getFileUploaderValue("uploader1", false);
			expect(file?.text()).toBe(content);
		});

		it("arrayBuffer() returns file data", () => {
			const content = "Test data";
			const data = new TextEncoder().encode(content).buffer;
			const uploadId = manager.registerUpload(sessionId, data, "test.txt", "text/plain");
			manager.setState(sessionId, "uploader1", [uploadId]);

			const file = getFileUploaderValue("uploader1", false);
			const buffer = file?.arrayBuffer();
			expect(buffer).toBeInstanceOf(ArrayBuffer);
			expect(new TextDecoder().decode(buffer)).toBe(content);
		});

		it("stream() returns ReadableStream", () => {
			const content = "Stream test";
			const data = new TextEncoder().encode(content).buffer;
			const uploadId = manager.registerUpload(sessionId, data, "test.txt", "text/plain");
			manager.setState(sessionId, "uploader1", [uploadId]);

			const file = getFileUploaderValue("uploader1", false);
			const stream = file?.stream();
			expect(stream).toBeInstanceOf(ReadableStream);
		});
	});
});
