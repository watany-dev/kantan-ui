import { describe, expect, it } from "vitest";
import {
	arrayBufferToBase64,
	createFileChunks,
	getMaxFileSize,
	validateFileSize,
	validateFileType,
} from "../../../src/client/file-upload-handler";

describe("file-upload-handler", () => {
	describe("arrayBufferToBase64", () => {
		it("converts empty buffer to empty string", () => {
			const buffer = new ArrayBuffer(0);
			expect(arrayBufferToBase64(buffer)).toBe("");
		});

		it("converts simple data to base64", () => {
			const data = new TextEncoder().encode("Hello");
			const base64 = arrayBufferToBase64(data.buffer);
			expect(base64).toBe("SGVsbG8=");
		});

		it("converts binary data correctly", () => {
			const data = new Uint8Array([0x00, 0x01, 0xff, 0xfe]);
			const base64 = arrayBufferToBase64(data.buffer);
			expect(base64).toBe("AAH//g==");
		});
	});

	describe("createFileChunks", () => {
		it("returns single chunk for small data", () => {
			const data = new TextEncoder().encode("Hello");
			const chunks = createFileChunks(data.buffer, 1024);
			expect(chunks).toHaveLength(1);
			expect(chunks[0]).toBe("SGVsbG8=");
		});

		it("splits large data into multiple chunks", () => {
			// Create 3KB of data
			const data = new Uint8Array(3 * 1024);
			for (let i = 0; i < data.length; i++) {
				data[i] = i % 256;
			}
			// Chunk size 1KB
			const chunks = createFileChunks(data.buffer, 1024);
			expect(chunks.length).toBeGreaterThan(1);
		});

		it("returns empty array for empty data", () => {
			const data = new ArrayBuffer(0);
			const chunks = createFileChunks(data, 1024);
			expect(chunks).toHaveLength(0);
		});
	});

	describe("getMaxFileSize", () => {
		it("returns data-max-size value", () => {
			const element = {
				dataset: { maxSize: "1024" },
			} as unknown as HTMLElement;
			expect(getMaxFileSize(element)).toBe(1024);
		});

		it("returns default value when no data-max-size", () => {
			const element = {
				dataset: {},
			} as unknown as HTMLElement;
			const defaultSize = 200 * 1024 * 1024;
			expect(getMaxFileSize(element)).toBe(defaultSize);
		});

		it("returns default for invalid value", () => {
			const element = {
				dataset: { maxSize: "invalid" },
			} as unknown as HTMLElement;
			const defaultSize = 200 * 1024 * 1024;
			expect(getMaxFileSize(element)).toBe(defaultSize);
		});
	});

	describe("validateFileSize", () => {
		it("returns valid for file within limit", () => {
			const result = validateFileSize(1000, 2000);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("returns invalid for file exceeding limit", () => {
			const result = validateFileSize(3000, 2000);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("exceeds");
		});

		it("returns valid for file at exact limit", () => {
			const result = validateFileSize(2000, 2000);
			expect(result.valid).toBe(true);
		});
	});

	describe("validateFileType", () => {
		it("returns valid when no accept restriction", () => {
			const result = validateFileType("test.pdf", "application/pdf", undefined);
			expect(result.valid).toBe(true);
		});

		it("validates file extension match", () => {
			const result = validateFileType("image.png", "image/png", ".png,.jpg");
			expect(result.valid).toBe(true);
		});

		it("validates MIME type match", () => {
			const result = validateFileType("image.png", "image/png", "image/png");
			expect(result.valid).toBe(true);
		});

		it("validates wildcard MIME type", () => {
			const result = validateFileType("photo.jpg", "image/jpeg", "image/*");
			expect(result.valid).toBe(true);
		});

		it("rejects non-matching file", () => {
			const result = validateFileType("document.pdf", "application/pdf", ".png,.jpg");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("not allowed");
		});

		it("handles multiple accept values", () => {
			const result = validateFileType("doc.pdf", "application/pdf", ".pdf,.doc,.docx");
			expect(result.valid).toBe(true);
		});
	});
});
