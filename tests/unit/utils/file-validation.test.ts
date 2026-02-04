import { describe, expect, it } from "vitest";
import { validateUploadedFile } from "../../../src/utils/file-validation";

/**
 * Create a valid PNG file data
 */
function createValidPng(): ArrayBuffer {
	return new Uint8Array([
		0x89,
		0x50,
		0x4e,
		0x47,
		0x0d,
		0x0a,
		0x1a,
		0x0a, // PNG header
		0x00,
		0x00,
		0x00,
		0x0d, // IHDR length
		0x49,
		0x48,
		0x44,
		0x52, // IHDR
		0x00,
		0x00,
		0x00,
		0x01, // width
		0x00,
		0x00,
		0x00,
		0x01, // height
		0x08,
		0x02,
		0x00,
		0x00,
		0x00, // bit depth, color type, etc.
	]).buffer;
}

/**
 * Create arbitrary data of specified size
 */
function createDataOfSize(sizeBytes: number): ArrayBuffer {
	return new ArrayBuffer(sizeBytes);
}

describe("validateUploadedFile", () => {
	describe("size validation", () => {
		it("accepts file within size limit", () => {
			const data = createDataOfSize(1024); // 1KB
			const result = validateUploadedFile(data, "small.bin", "application/octet-stream", {
				maxSize: 2048,
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("rejects file exceeding size limit", () => {
			const data = createDataOfSize(2048); // 2KB
			const result = validateUploadedFile(data, "large.bin", "application/octet-stream", {
				maxSize: 1024, // 1KB limit
			});
			expect(result.valid).toBe(false);
			expect(result.errors[0]?.code).toBe("SIZE_EXCEEDED");
		});

		it("accepts file exactly at size limit", () => {
			const data = createDataOfSize(1024);
			const result = validateUploadedFile(data, "exact.bin", "application/octet-stream", {
				maxSize: 1024,
			});
			expect(result.valid).toBe(true);
		});
	});

	describe("file type validation (accept)", () => {
		it("accepts file matching accept extension", () => {
			const png = createValidPng();
			const result = validateUploadedFile(png, "image.png", "image/png", {
				accept: ".png",
			});
			expect(result.valid).toBe(true);
		});

		it("rejects file not matching accept extension", () => {
			const png = createValidPng();
			const result = validateUploadedFile(png, "image.png", "image/png", {
				accept: ".pdf",
			});
			expect(result.valid).toBe(false);
			expect(result.errors[0].code).toBe("TYPE_NOT_ALLOWED");
		});

		it("accepts file matching accept MIME type", () => {
			const png = createValidPng();
			const result = validateUploadedFile(png, "image.png", "image/png", {
				accept: "image/png",
			});
			expect(result.valid).toBe(true);
		});

		it("accepts file matching wildcard MIME", () => {
			const png = createValidPng();
			const result = validateUploadedFile(png, "image.png", "image/png", {
				accept: "image/*",
			});
			expect(result.valid).toBe(true);
		});

		it("accepts file matching one of multiple accept values", () => {
			const png = createValidPng();
			const result = validateUploadedFile(png, "image.png", "image/png", {
				accept: [".pdf", ".png", ".jpg"],
			});
			expect(result.valid).toBe(true);
		});

		it("rejects file not matching any accept values", () => {
			const png = createValidPng();
			const result = validateUploadedFile(png, "image.png", "image/png", {
				accept: [".pdf", ".docx"],
			});
			expect(result.valid).toBe(false);
		});

		it("accepts any file when accept is not specified", () => {
			const data = createDataOfSize(100);
			const result = validateUploadedFile(data, "file.xyz", "application/octet-stream", {});
			expect(result.valid).toBe(true);
		});
	});

	describe("magic bytes validation", () => {
		it("returns verified MIME for PNG", () => {
			const png = createValidPng();
			const result = validateUploadedFile(png, "image.png", "image/png", {});
			expect(result.verifiedMime).toBe("image/png");
		});

		it("detects MIME mismatch", () => {
			const png = createValidPng();
			const result = validateUploadedFile(png, "image.jpg", "image/jpeg", {});
			expect(result.warnings.some((w) => w.code === "MIME_MISMATCH")).toBe(true);
		});

		it("rejects dangerous executable", () => {
			const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]).buffer;
			const result = validateUploadedFile(exe, "program.exe", "application/octet-stream", {});
			expect(result.valid).toBe(false);
			expect(result.errors[0].code).toBe("DANGEROUS_FILE");
		});

		it("rejects shell script", () => {
			const script = new TextEncoder().encode("#!/bin/bash\nrm -rf /").buffer;
			const result = validateUploadedFile(script, "script.sh", "text/plain", {});
			expect(result.valid).toBe(false);
			expect(result.errors[0].code).toBe("DANGEROUS_FILE");
		});
	});

	describe("polyglot detection", () => {
		it("warns about embedded script in image", () => {
			const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
			const scriptTag = new TextEncoder().encode("<script>alert(1)</script>");
			const padding = new Uint8Array(50);

			const imageWithScript = new Uint8Array(pngHeader.length + padding.length + scriptTag.length);
			imageWithScript.set(pngHeader, 0);
			imageWithScript.set(padding, pngHeader.length);
			imageWithScript.set(scriptTag, pngHeader.length + padding.length);

			const result = validateUploadedFile(imageWithScript.buffer, "image.png", "image/png", {});
			expect(result.warnings.some((w) => w.code === "POLYGLOT_DETECTED")).toBe(true);
		});

		it("can disable polyglot detection", () => {
			const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
			const scriptTag = new TextEncoder().encode("<script>alert(1)</script>");
			const padding = new Uint8Array(50);

			const imageWithScript = new Uint8Array(pngHeader.length + padding.length + scriptTag.length);
			imageWithScript.set(pngHeader, 0);
			imageWithScript.set(padding, pngHeader.length);
			imageWithScript.set(scriptTag, pngHeader.length + padding.length);

			const result = validateUploadedFile(imageWithScript.buffer, "image.png", "image/png", {
				detectPolyglot: false,
			});
			expect(result.warnings.filter((w) => w.code === "POLYGLOT_DETECTED")).toHaveLength(0);
		});
	});

	describe("strict mode", () => {
		it("treats warnings as errors in strict mode", () => {
			const png = createValidPng();
			// Claim it's JPEG but it's actually PNG - this creates a MIME mismatch warning
			const result = validateUploadedFile(png, "image.jpg", "image/jpeg", {
				strictMode: true,
			});
			expect(result.valid).toBe(false);
		});

		it("allows warnings in non-strict mode", () => {
			const png = createValidPng();
			const result = validateUploadedFile(png, "image.jpg", "image/jpeg", {
				strictMode: false,
			});
			// File is valid but has warnings
			expect(result.valid).toBe(true);
			expect(result.warnings.length).toBeGreaterThan(0);
		});
	});

	describe("filename sanitization", () => {
		it("sanitizes path traversal in filename", () => {
			const data = createDataOfSize(100);
			const result = validateUploadedFile(
				data,
				"../../../etc/passwd",
				"application/octet-stream",
				{},
			);
			expect(result.sanitizedFilename).toBe("etcpasswd");
		});

		it("sanitizes Windows reserved names", () => {
			const data = createDataOfSize(100);
			const result = validateUploadedFile(data, "CON.txt", "text/plain", {});
			expect(result.sanitizedFilename).toBe("_CON.txt");
		});
	});

	describe("combined validation", () => {
		it("reports multiple errors", () => {
			const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]).buffer;
			const result = validateUploadedFile(exe, "program.exe", "application/octet-stream", {
				maxSize: 1, // Too small
				accept: ".pdf", // Wrong type
			});
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThanOrEqual(2);
		});

		it("passes valid file with all checks", () => {
			const png = createValidPng();
			const result = validateUploadedFile(png, "photo.png", "image/png", {
				maxSize: 10 * 1024 * 1024,
				accept: "image/*",
				strictMode: false,
				detectPolyglot: true,
				verifyMagicBytes: true,
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.sanitizedFilename).toBe("photo.png");
			expect(result.verifiedMime).toBe("image/png");
		});
	});

	describe("edge cases", () => {
		it("handles empty file", () => {
			const empty = new ArrayBuffer(0);
			const result = validateUploadedFile(empty, "empty.txt", "text/plain", {});
			expect(result.valid).toBe(true);
		});

		it("handles file with empty name", () => {
			const data = createDataOfSize(100);
			const result = validateUploadedFile(data, "", "application/octet-stream", {});
			expect(result.valid).toBe(true);
			expect(result.sanitizedFilename).toMatch(/^file_[a-f0-9]+$/);
		});

		it("handles very long filename", () => {
			const data = createDataOfSize(100);
			const longName = `${"a".repeat(300)}.txt`;
			const result = validateUploadedFile(data, longName, "text/plain", {});
			expect(result.valid).toBe(true);
			expect(new TextEncoder().encode(result.sanitizedFilename).length).toBeLessThanOrEqual(255);
		});

		it("handles file without extension", () => {
			const data = createDataOfSize(100);
			const result = validateUploadedFile(data, "README", "text/plain", {});
			expect(result.valid).toBe(true);
			expect(result.sanitizedFilename).toBe("README");
		});

		it("handles file with trailing dot", () => {
			const data = createDataOfSize(100);
			const result = validateUploadedFile(data, "file.", "application/octet-stream", {});
			expect(result.valid).toBe(true);
		});

		it("rejects wildcard mime when type does not match base", () => {
			const data = createDataOfSize(100);
			// image/* should not accept text/plain
			const result = validateUploadedFile(data, "file.txt", "text/plain", {
				accept: "image/*",
			});
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === "TYPE_NOT_ALLOWED")).toBe(true);
		});

		it("accepts wildcard mime when type matches base", () => {
			const png = createValidPng();
			const result = validateUploadedFile(png, "image.png", "image/png", {
				accept: "image/*",
			});
			expect(result.valid).toBe(true);
		});
	});

	describe("formatSize display in error messages", () => {
		it("shows MB in size error message", () => {
			const data = createDataOfSize(2 * 1024 * 1024); // 2MB
			const result = validateUploadedFile(data, "large.bin", "application/octet-stream", {
				maxSize: 1024 * 1024, // 1MB limit
			});
			expect(result.valid).toBe(false);
			expect(result.errors[0]?.message).toContain("MB");
		});
	});

	describe("getExtension edge cases via accept filter", () => {
		it("rejects extensionless file when accept requires an extension", () => {
			const data = createDataOfSize(100);
			const result = validateUploadedFile(data, "README", "text/plain", {
				accept: ".txt",
			});
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === "TYPE_NOT_ALLOWED")).toBe(true);
		});
	});
});
