import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SessionManager, setSessionManager } from "../../../src/session/manager";
import { base64ToArrayBuffer, handleFileUpload } from "../../../src/websocket/file-upload-handler";
import type { FileUploadMessage } from "../../../src/websocket/types";

describe("file-upload-handler", () => {
	describe("base64ToArrayBuffer", () => {
		it("converts empty string to empty buffer", () => {
			const buffer = base64ToArrayBuffer("");
			expect(buffer.byteLength).toBe(0);
		});

		it("converts simple base64 to buffer", () => {
			const base64 = btoa("Hello");
			const buffer = base64ToArrayBuffer(base64);
			const text = new TextDecoder().decode(buffer);
			expect(text).toBe("Hello");
		});

		it("converts binary data correctly", () => {
			// Base64 for [0x00, 0x01, 0xff, 0xfe]
			const base64 = "AAH//g==";
			const buffer = base64ToArrayBuffer(base64);
			const bytes = new Uint8Array(buffer);
			expect(bytes).toEqual(new Uint8Array([0x00, 0x01, 0xff, 0xfe]));
		});
	});

	describe("handleFileUpload", () => {
		let manager: SessionManager;
		let sessionId: string;

		beforeEach(() => {
			manager = new SessionManager();
			setSessionManager(manager);
			const session = manager.createSession();
			sessionId = session.id;
		});

		afterEach(() => {
			manager.stopCleanupInterval();
		});

		it("successfully uploads valid text file", () => {
			const content = "Hello, World!";
			const data = new TextEncoder().encode(content);
			const base64 = btoa(String.fromCharCode(...data));

			const message: FileUploadMessage = {
				type: "file_upload",
				widgetId: "uploader1",
				filename: "test.txt",
				mimeType: "text/plain",
				size: data.length,
				data: base64,
				isChunked: false,
			};

			const result = handleFileUpload(message, sessionId, manager);
			expect(result.success).toBe(true);
			expect(result.uploadId).toBeDefined();
		});

		it("stores upload in session state", () => {
			const content = "test content";
			const data = new TextEncoder().encode(content);
			const base64 = btoa(String.fromCharCode(...data));

			const message: FileUploadMessage = {
				type: "file_upload",
				widgetId: "uploader1",
				filename: "test.txt",
				mimeType: "text/plain",
				size: data.length,
				data: base64,
				isChunked: false,
			};

			const result = handleFileUpload(message, sessionId, manager);
			expect(result.success).toBe(true);

			// Check widget state
			const state = manager.getState(sessionId);
			expect(state?.uploader1).toEqual([result.uploadId]);
		});

		it("appends to existing upload IDs", () => {
			const data1 = new TextEncoder().encode("file1");
			const data2 = new TextEncoder().encode("file2");
			const base64_1 = btoa(String.fromCharCode(...data1));
			const base64_2 = btoa(String.fromCharCode(...data2));

			const msg1: FileUploadMessage = {
				type: "file_upload",
				widgetId: "uploader1",
				filename: "file1.txt",
				mimeType: "text/plain",
				size: data1.length,
				data: base64_1,
				isChunked: false,
			};

			const msg2: FileUploadMessage = {
				type: "file_upload",
				widgetId: "uploader1",
				filename: "file2.txt",
				mimeType: "text/plain",
				size: data2.length,
				data: base64_2,
				isChunked: false,
			};

			const result1 = handleFileUpload(msg1, sessionId, manager);
			const result2 = handleFileUpload(msg2, sessionId, manager);

			expect(result1.success).toBe(true);
			expect(result2.success).toBe(true);

			const state = manager.getState(sessionId);
			expect(state?.uploader1).toEqual([result1.uploadId, result2.uploadId]);
		});

		it("rejects file with size mismatch", () => {
			const content = "Hello";
			const data = new TextEncoder().encode(content);
			const base64 = btoa(String.fromCharCode(...data));

			const message: FileUploadMessage = {
				type: "file_upload",
				widgetId: "uploader1",
				filename: "test.txt",
				mimeType: "text/plain",
				size: data.length + 100, // Wrong size
				data: base64,
				isChunked: false,
			};

			const result = handleFileUpload(message, sessionId, manager);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe("VALIDATION_ERROR");
		});

		it("rejects dangerous executable file", () => {
			// MZ header for Windows executable
			const exeData = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
			const base64 = btoa(String.fromCharCode(...exeData));

			const message: FileUploadMessage = {
				type: "file_upload",
				widgetId: "uploader1",
				filename: "program.exe",
				mimeType: "application/octet-stream",
				size: exeData.length,
				data: base64,
				isChunked: false,
			};

			const result = handleFileUpload(message, sessionId, manager);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe("DANGEROUS_FILE");
		});

		it("retrieves uploaded file data", () => {
			const content = "File content for retrieval test";
			const data = new TextEncoder().encode(content);
			const base64 = btoa(String.fromCharCode(...data));

			const message: FileUploadMessage = {
				type: "file_upload",
				widgetId: "uploader1",
				filename: "test.txt",
				mimeType: "text/plain",
				size: data.length,
				data: base64,
				isChunked: false,
			};

			const result = handleFileUpload(message, sessionId, manager);
			expect(result.success).toBe(true);

			// Retrieve the upload
			const upload = manager.getUpload(sessionId, result.uploadId!);
			expect(upload).not.toBeNull();
			expect(upload?.originalName).toBe("test.txt");
			// Note: Magic bytes verification returns application/octet-stream for text files
			// since they don't have a recognizable binary signature
			expect(upload?.verifiedMime).toBeDefined();

			// Verify content
			const retrievedContent = new TextDecoder().decode(upload?.data);
			expect(retrievedContent).toBe(content);
		});
	});
});
