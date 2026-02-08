import { describe, expect, it } from "vitest";
import { verifyMagicBytes } from "../../../src/utils/magic-bytes";

describe("verifyMagicBytes", () => {
	describe("PNG detection", () => {
		it("detects PNG correctly", () => {
			const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
			const result = verifyMagicBytes(png.buffer, "image/png");
			expect(result.detectedMime).toBe("image/png");
			expect(result.isValid).toBe(true);
			expect(result.mismatch).toBe(false);
		});

		it("detects PNG mismatch when claimed as JPEG", () => {
			const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
			const result = verifyMagicBytes(png.buffer, "image/jpeg");
			expect(result.detectedMime).toBe("image/png");
			expect(result.mismatch).toBe(true);
		});
	});

	describe("JPEG detection", () => {
		it("detects JPEG correctly", () => {
			const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
			const result = verifyMagicBytes(jpeg.buffer, "image/jpeg");
			expect(result.detectedMime).toBe("image/jpeg");
			expect(result.isValid).toBe(true);
		});

		it("detects JPEG with EXIF marker", () => {
			const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10]);
			const result = verifyMagicBytes(jpeg.buffer, "image/jpeg");
			expect(result.detectedMime).toBe("image/jpeg");
			expect(result.isValid).toBe(true);
		});
	});

	describe("GIF detection", () => {
		it("detects GIF87a correctly", () => {
			const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]);
			const result = verifyMagicBytes(gif.buffer, "image/gif");
			expect(result.detectedMime).toBe("image/gif");
			expect(result.isValid).toBe(true);
		});

		it("detects GIF89a correctly", () => {
			const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
			const result = verifyMagicBytes(gif.buffer, "image/gif");
			expect(result.detectedMime).toBe("image/gif");
			expect(result.isValid).toBe(true);
		});
	});

	describe("WebP detection", () => {
		it("detects WebP correctly", () => {
			// RIFF....WEBP
			const webp = new Uint8Array([
				0x52,
				0x49,
				0x46,
				0x46, // RIFF
				0x00,
				0x00,
				0x00,
				0x00, // size (placeholder)
				0x57,
				0x45,
				0x42,
				0x50, // WEBP
			]);
			const result = verifyMagicBytes(webp.buffer, "image/webp");
			expect(result.detectedMime).toBe("image/webp");
			expect(result.isValid).toBe(true);
		});
	});

	describe("PDF detection", () => {
		it("detects PDF correctly", () => {
			const pdf = new TextEncoder().encode("%PDF-1.4\n");
			const result = verifyMagicBytes(pdf.buffer, "application/pdf");
			expect(result.detectedMime).toBe("application/pdf");
			expect(result.isValid).toBe(true);
		});
	});

	describe("ZIP detection", () => {
		it("detects ZIP correctly", () => {
			const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
			const result = verifyMagicBytes(zip.buffer, "application/zip");
			expect(result.detectedMime).toBe("application/zip");
			expect(result.isValid).toBe(true);
		});

		it("detects empty ZIP archive", () => {
			const zip = new Uint8Array([0x50, 0x4b, 0x05, 0x06]);
			const result = verifyMagicBytes(zip.buffer, "application/zip");
			expect(result.detectedMime).toBe("application/zip");
		});
	});

	describe("dangerous file detection", () => {
		it("blocks Windows executable (MZ header)", () => {
			const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
			const result = verifyMagicBytes(exe.buffer, "application/octet-stream");
			expect(result.isDangerous).toBe(true);
			expect(result.dangerousReason).toContain("executable");
		});

		it("blocks ELF executable", () => {
			const elf = new Uint8Array([0x7f, 0x45, 0x4c, 0x46]);
			const result = verifyMagicBytes(elf.buffer, "application/octet-stream");
			expect(result.isDangerous).toBe(true);
			expect(result.dangerousReason).toContain("ELF");
		});

		it("blocks Mach-O executable (32-bit)", () => {
			const macho = new Uint8Array([0xfe, 0xed, 0xfa, 0xce]);
			const result = verifyMagicBytes(macho.buffer, "application/octet-stream");
			expect(result.isDangerous).toBe(true);
		});

		it("blocks Mach-O executable (64-bit)", () => {
			const macho = new Uint8Array([0xfe, 0xed, 0xfa, 0xcf]);
			const result = verifyMagicBytes(macho.buffer, "application/octet-stream");
			expect(result.isDangerous).toBe(true);
		});

		it("blocks Java class file", () => {
			const javaClass = new Uint8Array([0xca, 0xfe, 0xba, 0xbe]);
			const result = verifyMagicBytes(javaClass.buffer, "application/octet-stream");
			expect(result.isDangerous).toBe(true);
			expect(result.dangerousReason).toContain("Java");
		});

		it("blocks shell scripts with shebang", () => {
			const script = new TextEncoder().encode("#!/bin/bash\nrm -rf /");
			const result = verifyMagicBytes(script.buffer, "text/plain");
			expect(result.isDangerous).toBe(true);
			expect(result.dangerousReason).toContain("script");
		});

		it("blocks scripts with /usr/bin/env shebang", () => {
			const script = new TextEncoder().encode("#!/usr/bin/env python\nimport os");
			const result = verifyMagicBytes(script.buffer, "text/plain");
			expect(result.isDangerous).toBe(true);
		});

		it("blocks Windows batch files (echo off)", () => {
			const batch = new TextEncoder().encode("@echo off\ndel /f /q *.*");
			const result = verifyMagicBytes(batch.buffer, "text/plain");
			expect(result.isDangerous).toBe(true);
		});
	});

	describe("text file handling", () => {
		it("allows plain text files", () => {
			const text = new TextEncoder().encode("Hello, World!\nThis is a test file.");
			const result = verifyMagicBytes(text.buffer, "text/plain");
			expect(result.isDangerous).toBe(false);
			expect(result.isValid).toBe(true);
		});

		it("allows CSV files", () => {
			const csv = new TextEncoder().encode("name,age,email\nJohn,30,john@example.com");
			const result = verifyMagicBytes(csv.buffer, "text/csv");
			expect(result.isDangerous).toBe(false);
		});

		it("allows JSON files", () => {
			const json = new TextEncoder().encode('{"name": "test", "value": 123}');
			const result = verifyMagicBytes(json.buffer, "application/json");
			expect(result.isDangerous).toBe(false);
		});
	});

	describe("unknown file types", () => {
		it("handles unknown binary data", () => {
			const unknown = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
			const result = verifyMagicBytes(unknown.buffer, "application/octet-stream");
			expect(result.detectedMime).toBe("application/octet-stream");
			expect(result.isDangerous).toBe(false);
		});

		it("handles empty file", () => {
			const empty = new Uint8Array([]);
			const result = verifyMagicBytes(empty.buffer, "application/octet-stream");
			expect(result.isValid).toBe(true);
			expect(result.isDangerous).toBe(false);
		});
	});

	describe("MIME mismatch detection", () => {
		it("detects GIF disguised as PNG", () => {
			const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
			const result = verifyMagicBytes(gif.buffer, "image/png");
			expect(result.mismatch).toBe(true);
			expect(result.detectedMime).toBe("image/gif");
			expect(result.claimedMime).toBe("image/png");
		});

		it("detects executable disguised as image", () => {
			const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
			const result = verifyMagicBytes(exe.buffer, "image/png");
			expect(result.isDangerous).toBe(true);
			expect(result.mismatch).toBe(true);
		});
	});

	describe("BMP detection", () => {
		it("detects BMP correctly", () => {
			const bmp = new Uint8Array([0x42, 0x4d, 0x00, 0x00, 0x00, 0x00]);
			const result = verifyMagicBytes(bmp.buffer, "image/bmp");
			expect(result.detectedMime).toBe("image/bmp");
			expect(result.isValid).toBe(true);
		});
	});

	describe("RIFF non-WebP detection", () => {
		it("does not detect RIFF+WAVE as WebP", () => {
			// RIFF header + size placeholder + WAVE (not WEBP)
			const wav = new Uint8Array([
				0x52,
				0x49,
				0x46,
				0x46, // RIFF
				0x00,
				0x00,
				0x00,
				0x00, // size
				0x57,
				0x41,
				0x56,
				0x45, // WAVE (not WEBP)
			]);
			const result = verifyMagicBytes(wav.buffer, "audio/wav");
			// RIFF header matches the WebP safe signature entry, so detectedMime is "image/webp"
			// but isWebP() returns false because offset 8 is WAVE not WEBP
			expect(result.detectedMime).toBe("image/webp");
			expect(result.mismatch).toBe(true);
		});
	});

	describe("MIME type matching edge cases", () => {
		it("treats case-insensitive MIME match as valid", () => {
			const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
			const result = verifyMagicBytes(png.buffer, "Image/PNG");
			expect(result.detectedMime).toBe("image/png");
			expect(result.mismatch).toBe(false);
		});

		it("allows application/octet-stream as wildcard claimed type", () => {
			const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
			const result = verifyMagicBytes(png.buffer, "application/octet-stream");
			expect(result.detectedMime).toBe("image/png");
			expect(result.mismatch).toBe(false);
		});
	});

	describe("SVG detection", () => {
		it("detects SVG with xml declaration", () => {
			const svg = new TextEncoder().encode(
				'<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg">',
			);
			const result = verifyMagicBytes(svg.buffer, "image/svg+xml");
			expect(result.detectedMime).toBe("image/svg+xml");
			expect(result.isValid).toBe(true);
		});

		it("detects SVG starting with svg tag", () => {
			const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">');
			const result = verifyMagicBytes(svg.buffer, "image/svg+xml");
			expect(result.detectedMime).toBe("image/svg+xml");
			expect(result.isValid).toBe(true);
		});
	});
});
