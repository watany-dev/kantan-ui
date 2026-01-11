import { describe, expect, it } from "vitest";
import {
	isChunkUploadDataMessage,
	isChunkUploadEndMessage,
	isChunkUploadStartMessage,
	isClientMessage,
} from "../../../src/websocket/types";

describe("isClientMessage", () => {
	it("returns true for valid init message", () => {
		expect(isClientMessage({ type: "init" })).toBe(true);
		expect(isClientMessage({ type: "init", sessionId: "abc" })).toBe(true);
		// null is allowed (localStorage.getItem returns null)
		expect(isClientMessage({ type: "init", sessionId: null })).toBe(true);
	});

	it("returns true for valid event message", () => {
		expect(isClientMessage({ type: "event", widgetId: "btn1" })).toBe(true);
		expect(
			isClientMessage({
				type: "event",
				widgetId: "slider1",
				value: 42,
				sessionId: "xyz",
			}),
		).toBe(true);
	});

	it("returns false for invalid type", () => {
		expect(isClientMessage({ type: "unknown" })).toBe(false);
		expect(isClientMessage({ type: 123 })).toBe(false);
		expect(isClientMessage({})).toBe(false);
	});

	it("returns false for non-object values", () => {
		expect(isClientMessage(null)).toBe(false);
		expect(isClientMessage(undefined)).toBe(false);
		expect(isClientMessage("string")).toBe(false);
		expect(isClientMessage(123)).toBe(false);
	});

	it("returns false for invalid field types", () => {
		expect(isClientMessage({ type: "init", widgetId: 123 })).toBe(false);
		expect(isClientMessage({ type: "event", sessionId: 456 })).toBe(false);
	});

	it("returns true for chunk upload messages", () => {
		expect(isClientMessage({ type: "chunk_upload_start" })).toBe(true);
		expect(isClientMessage({ type: "chunk_upload_data" })).toBe(true);
		expect(isClientMessage({ type: "chunk_upload_end" })).toBe(true);
	});
});

describe("isChunkUploadStartMessage", () => {
	it("returns true for valid chunk upload start message", () => {
		const valid = {
			type: "chunk_upload_start",
			widgetId: "uploader1",
			uploadId: "upload-123",
			filename: "test.txt",
			mimeType: "text/plain",
			totalSize: 1024,
			totalChunks: 2,
			chunkSize: 512,
		};
		expect(isChunkUploadStartMessage(valid)).toBe(true);
	});

	it("returns false for wrong type", () => {
		expect(isChunkUploadStartMessage({ type: "file_upload" })).toBe(false);
	});

	it("returns false for missing required fields", () => {
		expect(
			isChunkUploadStartMessage({
				type: "chunk_upload_start",
				widgetId: "uploader1",
				// missing other fields
			}),
		).toBe(false);
	});

	it("returns false for non-object", () => {
		expect(isChunkUploadStartMessage(null)).toBe(false);
		expect(isChunkUploadStartMessage("string")).toBe(false);
	});
});

describe("isChunkUploadDataMessage", () => {
	it("returns true for valid chunk upload data message", () => {
		const valid = {
			type: "chunk_upload_data",
			uploadId: "upload-123",
			chunkIndex: 0,
			data: "SGVsbG8=",
		};
		expect(isChunkUploadDataMessage(valid)).toBe(true);
	});

	it("returns false for wrong type", () => {
		expect(isChunkUploadDataMessage({ type: "file_upload" })).toBe(false);
	});

	it("returns false for missing required fields", () => {
		expect(
			isChunkUploadDataMessage({
				type: "chunk_upload_data",
				uploadId: "upload-123",
				// missing chunkIndex and data
			}),
		).toBe(false);
	});
});

describe("isChunkUploadEndMessage", () => {
	it("returns true for valid chunk upload end message", () => {
		const valid = {
			type: "chunk_upload_end",
			uploadId: "upload-123",
		};
		expect(isChunkUploadEndMessage(valid)).toBe(true);
	});

	it("returns true with optional checksum", () => {
		const valid = {
			type: "chunk_upload_end",
			uploadId: "upload-123",
			checksum: "abc123",
		};
		expect(isChunkUploadEndMessage(valid)).toBe(true);
	});

	it("returns false for wrong type", () => {
		expect(isChunkUploadEndMessage({ type: "file_upload" })).toBe(false);
	});

	it("returns false for missing uploadId", () => {
		expect(
			isChunkUploadEndMessage({
				type: "chunk_upload_end",
			}),
		).toBe(false);
	});
});
