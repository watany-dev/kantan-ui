import fc from "fast-check";
import { describe, expect, it } from "vitest";
import "../pbt-setup";
import type {
	FileValidationConfig,
	FileValidationErrorCode,
} from "../../../src/utils/file-validation";
import { validateUploadedFile } from "../../../src/utils/file-validation";

/** All valid error codes */
const VALID_ERROR_CODES: FileValidationErrorCode[] = [
	"SIZE_EXCEEDED",
	"TYPE_NOT_ALLOWED",
	"DANGEROUS_FILE",
	"MIME_MISMATCH",
	"POLYGLOT_DETECTED",
	"VALIDATION_ERROR",
];

/** Known safe file headers */
const SAFE_FILE_HEADERS: Record<string, number[]> = {
	"image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
	"image/jpeg": [0xff, 0xd8, 0xff],
	"image/gif": [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
	"application/pdf": [0x25, 0x50, 0x44, 0x46, 0x2d],
};

/** Dangerous binary signatures */
const DANGEROUS_HEADERS = [
	[0x4d, 0x5a], // MZ (Windows executable)
	[0x7f, 0x45, 0x4c, 0x46], // ELF
];

/** Build a file with header + padding */
function buildFile(header: number[], extraLength: number): ArrayBuffer {
	const arr = new Uint8Array(header.length + extraLength);
	arr.set(header, 0);
	return arr.buffer;
}

describe("validateUploadedFile property-based tests", () => {
	// ========================================================================
	// Invariant: result shape
	// ========================================================================
	it("result always has the required shape", () => {
		const dataArb = fc.uint8Array({ minLength: 0, maxLength: 256 });
		const filenameArb = fc.stringMatching(/^[a-zA-Z0-9_]{1,20}\.[a-z]{1,4}$/);
		const mimeArb = fc.constantFrom(
			"image/png",
			"image/jpeg",
			"text/plain",
			"application/pdf",
			"application/octet-stream",
		);

		fc.assert(
			fc.property(dataArb, filenameArb, mimeArb, (data, filename, mime) => {
				const result = validateUploadedFile(data.buffer, filename, mime, {});
				expect(typeof result.valid).toBe("boolean");
				expect(Array.isArray(result.errors)).toBe(true);
				expect(Array.isArray(result.warnings)).toBe(true);
				expect(typeof result.sanitizedFilename).toBe("string");
				expect(typeof result.verifiedMime).toBe("string");
			}),
		);
	});

	it("all error/warning codes are valid enum values", () => {
		const dataArb = fc.uint8Array({ minLength: 0, maxLength: 256 });
		const filenameArb = fc.string();
		const mimeArb = fc.string();

		fc.assert(
			fc.property(dataArb, filenameArb, mimeArb, (data, filename, mime) => {
				const result = validateUploadedFile(data.buffer, filename, mime, {});
				for (const err of result.errors) {
					expect(VALID_ERROR_CODES).toContain(err.code);
					expect(typeof err.message).toBe("string");
					expect(err.message.length).toBeGreaterThan(0);
				}
				for (const warn of result.warnings) {
					expect(VALID_ERROR_CODES).toContain(warn.code);
					expect(typeof warn.message).toBe("string");
					expect(warn.message.length).toBeGreaterThan(0);
				}
			}),
		);
	});

	// ========================================================================
	// Invariant: sanitizedFilename is always non-empty
	// ========================================================================
	it("sanitizedFilename is always a non-empty string", () => {
		const dataArb = fc.uint8Array({ minLength: 0, maxLength: 100 });
		const filenameArb = fc.string();
		const mimeArb = fc.string();

		fc.assert(
			fc.property(dataArb, filenameArb, mimeArb, (data, filename, mime) => {
				const result = validateUploadedFile(data.buffer, filename, mime, {});
				expect(result.sanitizedFilename.length).toBeGreaterThan(0);
			}),
		);
	});

	// ========================================================================
	// Size validation
	// ========================================================================
	it("files within maxSize have no SIZE_EXCEEDED error", () => {
		const maxSizeArb = fc.integer({ min: 100, max: 10000 });
		const dataArb = fc.uint8Array({ minLength: 0, maxLength: 99 });

		fc.assert(
			fc.property(maxSizeArb, dataArb, (maxSize, data) => {
				fc.pre(data.byteLength <= maxSize);
				const result = validateUploadedFile(data.buffer, "test.txt", "text/plain", {
					maxSize,
					verifyMagicBytes: false,
					detectPolyglot: false,
				});
				const sizeErrors = result.errors.filter((e) => e.code === "SIZE_EXCEEDED");
				expect(sizeErrors).toHaveLength(0);
			}),
		);
	});

	it("files exceeding maxSize always have SIZE_EXCEEDED error", () => {
		const maxSizeArb = fc.integer({ min: 1, max: 100 });

		fc.assert(
			fc.property(maxSizeArb, (maxSize) => {
				// Create data that exceeds maxSize
				const data = new Uint8Array(maxSize + 1);
				const result = validateUploadedFile(data.buffer, "test.txt", "text/plain", {
					maxSize,
					verifyMagicBytes: false,
					detectPolyglot: false,
				});
				const sizeErrors = result.errors.filter((e) => e.code === "SIZE_EXCEEDED");
				expect(sizeErrors).toHaveLength(1);
				expect(result.valid).toBe(false);
			}),
		);
	});

	// ========================================================================
	// Accept filter validation
	// ========================================================================
	it("files matching accept filter by extension pass", () => {
		const extArb = fc.constantFrom(".txt", ".pdf", ".png", ".jpg");
		const nameArb = fc.stringMatching(/^[a-zA-Z0-9]{1,10}$/);

		fc.assert(
			fc.property(nameArb, extArb, (name, ext) => {
				const filename = name + ext;
				const result = validateUploadedFile(
					new ArrayBuffer(10),
					filename,
					"application/octet-stream",
					{
						accept: [ext],
						verifyMagicBytes: false,
						detectPolyglot: false,
					},
				);
				const typeErrors = result.errors.filter((e) => e.code === "TYPE_NOT_ALLOWED");
				expect(typeErrors).toHaveLength(0);
			}),
		);
	});

	it("files not matching accept filter have TYPE_NOT_ALLOWED error", () => {
		fc.assert(
			fc.property(fc.stringMatching(/^[a-zA-Z0-9]{1,10}$/), (name) => {
				const result = validateUploadedFile(
					new ArrayBuffer(10),
					`${name}.exe`,
					"application/x-msdownload",
					{
						accept: [".pdf", ".txt"],
						verifyMagicBytes: false,
						detectPolyglot: false,
					},
				);
				const typeErrors = result.errors.filter((e) => e.code === "TYPE_NOT_ALLOWED");
				expect(typeErrors).toHaveLength(1);
			}),
		);
	});

	it("wildcard MIME accept (image/*) matches any image type", () => {
		const imageMimeArb = fc.constantFrom(
			"image/png",
			"image/jpeg",
			"image/gif",
			"image/webp",
			"image/bmp",
		);
		const nameArb = fc.stringMatching(/^[a-zA-Z0-9]{1,10}$/);
		const extArb = fc.constantFrom(".png", ".jpg", ".gif");

		fc.assert(
			fc.property(nameArb, extArb, imageMimeArb, (name, ext, mime) => {
				const result = validateUploadedFile(new ArrayBuffer(10), name + ext, mime, {
					accept: ["image/*"],
					verifyMagicBytes: false,
					detectPolyglot: false,
				});
				const typeErrors = result.errors.filter((e) => e.code === "TYPE_NOT_ALLOWED");
				expect(typeErrors).toHaveLength(0);
			}),
		);
	});

	it("empty accept list allows any file type", () => {
		const mimeArb = fc.constantFrom("image/png", "text/plain", "application/pdf", "video/mp4");

		fc.assert(
			fc.property(mimeArb, (mime) => {
				const result = validateUploadedFile(new ArrayBuffer(10), "test.bin", mime, {
					accept: [],
					verifyMagicBytes: false,
					detectPolyglot: false,
				});
				const typeErrors = result.errors.filter((e) => e.code === "TYPE_NOT_ALLOWED");
				expect(typeErrors).toHaveLength(0);
			}),
		);
	});

	// ========================================================================
	// Dangerous file detection
	// ========================================================================
	it("dangerous files always produce DANGEROUS_FILE error", () => {
		const dangerArb = fc.constantFrom(...DANGEROUS_HEADERS);
		const mimeArb = fc.constantFrom("image/png", "text/plain", "application/octet-stream");

		fc.assert(
			fc.property(dangerArb, mimeArb, (header, mime) => {
				const data = buildFile(header, 20);
				const result = validateUploadedFile(data, "test.bin", mime, {
					verifyMagicBytes: true,
					detectPolyglot: false,
				});
				const dangerErrors = result.errors.filter((e) => e.code === "DANGEROUS_FILE");
				expect(dangerErrors.length).toBeGreaterThan(0);
				expect(result.valid).toBe(false);
			}),
		);
	});

	// ========================================================================
	// Strict mode
	// ========================================================================
	it("strict mode: warnings make the file invalid", () => {
		// Create a PNG with mismatched MIME to generate a MIME_MISMATCH warning
		const pngHeader = SAFE_FILE_HEADERS["image/png"];
		const data = buildFile(pngHeader, 20);

		const nonStrict = validateUploadedFile(data, "test.png", "text/plain", {
			strictMode: false,
			detectPolyglot: false,
		});
		const strict = validateUploadedFile(data, "test.png", "text/plain", {
			strictMode: true,
			detectPolyglot: false,
		});

		// Non-strict: warnings don't affect validity (if no errors)
		if (nonStrict.errors.length === 0 && nonStrict.warnings.length > 0) {
			expect(nonStrict.valid).toBe(true);
		}
		// Strict: warnings make it invalid
		if (strict.warnings.length > 0) {
			expect(strict.valid).toBe(false);
		}
	});

	// ========================================================================
	// Invariant: valid = (errors.length === 0) unless strictMode
	// ========================================================================
	it("valid reflects error count (non-strict mode)", () => {
		const dataArb = fc.uint8Array({ minLength: 0, maxLength: 256 });
		const filenameArb = fc.stringMatching(/^[a-zA-Z0-9_]{1,10}\.[a-z]{1,4}$/);
		const mimeArb = fc.constantFrom(
			"image/png",
			"image/jpeg",
			"text/plain",
			"application/octet-stream",
		);

		fc.assert(
			fc.property(dataArb, filenameArb, mimeArb, (data, filename, mime) => {
				const result = validateUploadedFile(data.buffer, filename, mime, {
					strictMode: false,
				});
				if (result.errors.length === 0) {
					expect(result.valid).toBe(true);
				} else {
					expect(result.valid).toBe(false);
				}
			}),
		);
	});

	// ========================================================================
	// Feature toggle: verifyMagicBytes / detectPolyglot
	// ========================================================================
	it("disabling verifyMagicBytes skips DANGEROUS_FILE and MIME_MISMATCH checks", () => {
		const dangerArb = fc.constantFrom(...DANGEROUS_HEADERS);

		fc.assert(
			fc.property(dangerArb, (header) => {
				const data = buildFile(header, 20);
				const result = validateUploadedFile(data, "test.bin", "text/plain", {
					verifyMagicBytes: false,
					detectPolyglot: false,
				});
				const dangerErrors = result.errors.filter((e) => e.code === "DANGEROUS_FILE");
				const mimeWarnings = result.warnings.filter((e) => e.code === "MIME_MISMATCH");
				expect(dangerErrors).toHaveLength(0);
				expect(mimeWarnings).toHaveLength(0);
			}),
		);
	});

	it("disabling detectPolyglot skips POLYGLOT_DETECTED warnings", () => {
		const dataArb = fc.uint8Array({ minLength: 0, maxLength: 256 });
		const filenameArb = fc.stringMatching(/^[a-zA-Z0-9_]{1,10}\.[a-z]{1,4}$/);
		const mimeArb = fc.constantFrom("image/png", "image/jpeg", "text/plain");

		fc.assert(
			fc.property(dataArb, filenameArb, mimeArb, (data, filename, mime) => {
				const result = validateUploadedFile(data.buffer, filename, mime, {
					detectPolyglot: false,
				});
				const polyglotWarnings = result.warnings.filter((e) => e.code === "POLYGLOT_DETECTED");
				expect(polyglotWarnings).toHaveLength(0);
			}),
		);
	});

	// ========================================================================
	// Safe files with correct headers pass validation
	// ========================================================================
	it("safe files with matching MIME and correct headers pass all checks", () => {
		const entryArb = fc.constantFrom(...Object.entries(SAFE_FILE_HEADERS));
		const extMap: Record<string, string> = {
			"image/png": ".png",
			"image/jpeg": ".jpg",
			"image/gif": ".gif",
			"application/pdf": ".pdf",
		};

		fc.assert(
			fc.property(entryArb, ([mime, header]) => {
				const ext = extMap[mime] || ".bin";
				const data = buildFile(header, 50);
				const result = validateUploadedFile(data, `file${ext}`, mime, {
					maxSize: 1000,
					detectPolyglot: false,
				});
				expect(result.errors).toHaveLength(0);
				expect(result.valid).toBe(true);
			}),
		);
	});

	// ========================================================================
	// Determinism
	// ========================================================================
	it("same inputs always produce the same result", () => {
		const dataArb = fc.uint8Array({ minLength: 0, maxLength: 256 });
		const filenameArb = fc.stringMatching(/^[a-zA-Z0-9_]{1,10}\.[a-z]{1,4}$/);
		const mimeArb = fc.constantFrom("image/png", "image/jpeg", "text/plain");

		fc.assert(
			fc.property(dataArb, filenameArb, mimeArb, (data, filename, mime) => {
				const config: FileValidationConfig = {};
				const r1 = validateUploadedFile(data.buffer, filename, mime, config);
				const r2 = validateUploadedFile(data.buffer, filename, mime, config);
				expect(r1.valid).toBe(r2.valid);
				expect(r1.errors.length).toBe(r2.errors.length);
				expect(r1.warnings.length).toBe(r2.warnings.length);
				expect(r1.verifiedMime).toBe(r2.verifiedMime);
			}),
		);
	});
});
