import fc from "fast-check";
import { describe, expect, it } from "vitest";
import "../pbt-setup";
import { verifyMagicBytes } from "../../../src/utils/magic-bytes";

/** Known safe file signatures for generating valid file data */
const SAFE_FILE_HEADERS: Record<string, number[]> = {
	"image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
	"image/jpeg": [0xff, 0xd8, 0xff],
	"image/gif87a": [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
	"image/gif89a": [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
	"image/bmp": [0x42, 0x4d],
	"application/pdf": [0x25, 0x50, 0x44, 0x46, 0x2d],
	"application/zip": [0x50, 0x4b, 0x03, 0x04],
	"application/zip-empty": [0x50, 0x4b, 0x05, 0x06],
	"application/zip-spanned": [0x50, 0x4b, 0x07, 0x08],
};

/** Mapping from header key to expected detected MIME */
const HEADER_TO_MIME: Record<string, string> = {
	"image/png": "image/png",
	"image/jpeg": "image/jpeg",
	"image/gif87a": "image/gif",
	"image/gif89a": "image/gif",
	"image/bmp": "image/bmp",
	"application/pdf": "application/pdf",
	"application/zip": "application/zip",
	"application/zip-empty": "application/zip",
	"application/zip-spanned": "application/zip",
};

/** Known dangerous file signatures (binary) */
const DANGEROUS_HEADERS: Array<{ bytes: number[]; description: string }> = [
	{ bytes: [0x4d, 0x5a], description: "Windows executable" },
	{ bytes: [0x7f, 0x45, 0x4c, 0x46], description: "ELF executable" },
	{ bytes: [0xfe, 0xed, 0xfa, 0xce], description: "Mach-O 32-bit" },
	{ bytes: [0xfe, 0xed, 0xfa, 0xcf], description: "Mach-O 64-bit" },
	{ bytes: [0xca, 0xfe, 0xba, 0xbe], description: "Java class" },
];

/** Known dangerous text-based patterns */
const DANGEROUS_TEXT_PATTERNS = ["#!/bin/bash", "#!/usr/bin/env python", "@echo off", "@ECHO OFF"];

/** Valid WebP header: RIFF + 4 bytes size + WEBP */
const WEBP_HEADER = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];

/** Create Uint8Array from header + random trailing bytes */
function buildFile(header: number[], trailingLength: number, trailing: number[]): Uint8Array {
	const result = new Uint8Array(header.length + trailingLength);
	result.set(header, 0);
	for (let i = 0; i < trailingLength && i < trailing.length; i++) {
		result[header.length + i] = trailing[i];
	}
	return result;
}

describe("verifyMagicBytes property-based tests", () => {
	// ========================================================================
	// Invariant: result shape
	// ========================================================================
	it("result always has the required shape", () => {
		const bytesArb = fc.uint8Array({ minLength: 0, maxLength: 256 });
		const mimeArb = fc.constantFrom(
			"image/png",
			"image/jpeg",
			"image/gif",
			"application/pdf",
			"application/zip",
			"text/plain",
			"application/octet-stream",
		);
		fc.assert(
			fc.property(bytesArb, mimeArb, (bytes, mime) => {
				const result = verifyMagicBytes(bytes.buffer, mime);
				expect(typeof result.detectedMime).toBe("string");
				expect(typeof result.claimedMime).toBe("string");
				expect(typeof result.isValid).toBe("boolean");
				expect(typeof result.mismatch).toBe("boolean");
				expect(typeof result.isDangerous).toBe("boolean");
				expect(result.claimedMime).toBe(mime);
			}),
		);
	});

	it("detectedMime is always a non-empty string", () => {
		const bytesArb = fc.uint8Array({ minLength: 0, maxLength: 256 });
		const mimeArb = fc.string();
		fc.assert(
			fc.property(bytesArb, mimeArb, (bytes, mime) => {
				const result = verifyMagicBytes(bytes.buffer, mime);
				expect(result.detectedMime.length).toBeGreaterThan(0);
			}),
		);
	});

	// ========================================================================
	// Invariant: empty files
	// ========================================================================
	it("empty files are never dangerous", () => {
		const mimeArb = fc.string();
		fc.assert(
			fc.property(mimeArb, (mime) => {
				const empty = new Uint8Array([]);
				const result = verifyMagicBytes(empty.buffer, mime);
				expect(result.isDangerous).toBe(false);
			}),
		);
	});

	it("empty files detect as application/octet-stream", () => {
		const mimeArb = fc.string();
		fc.assert(
			fc.property(mimeArb, (mime) => {
				const empty = new Uint8Array([]);
				const result = verifyMagicBytes(empty.buffer, mime);
				expect(result.detectedMime).toBe("application/octet-stream");
			}),
		);
	});

	// ========================================================================
	// Invariant: isDangerous implies mismatch
	// ========================================================================
	it("dangerous files always have mismatch set to true", () => {
		const bytesArb = fc.uint8Array({ minLength: 0, maxLength: 256 });
		const mimeArb = fc.string();
		fc.assert(
			fc.property(bytesArb, mimeArb, (bytes, mime) => {
				const result = verifyMagicBytes(bytes.buffer, mime);
				if (result.isDangerous) {
					expect(result.mismatch).toBe(true);
				}
			}),
		);
	});

	// ========================================================================
	// Safe signature detection
	// ========================================================================
	it("files with correct magic bytes and matching claimed MIME have no mismatch", () => {
		const entries = Object.entries(SAFE_FILE_HEADERS);
		const entryArb = fc.constantFrom(...entries);
		const trailingArb = fc.array(fc.integer({ min: 0, max: 255 }), {
			minLength: 10,
			maxLength: 50,
		});

		fc.assert(
			fc.property(entryArb, trailingArb, ([key, header], trailing) => {
				const expectedMime = HEADER_TO_MIME[key];
				const file = buildFile(header, trailing.length, trailing);
				const result = verifyMagicBytes(file.buffer, expectedMime);
				expect(result.mismatch).toBe(false);
				expect(result.detectedMime).toBe(expectedMime);
			}),
		);
	});

	it("MIME mismatch is detected when claimed MIME differs from detected", () => {
		const trailingArb = fc.array(fc.integer({ min: 0, max: 255 }), {
			minLength: 10,
			maxLength: 50,
		});

		fc.assert(
			fc.property(trailingArb, (trailing) => {
				// Build a PNG file but claim it's JPEG
				const pngHeader = SAFE_FILE_HEADERS["image/png"];
				const file = buildFile(pngHeader, trailing.length, trailing);
				const result = verifyMagicBytes(file.buffer, "image/jpeg");
				expect(result.mismatch).toBe(true);
				expect(result.detectedMime).toBe("image/png");
			}),
		);
	});

	// ========================================================================
	// Dangerous binary signatures
	// ========================================================================
	it("dangerous binary signatures are always detected regardless of claimed MIME", () => {
		const dangerArb = fc.constantFrom(...DANGEROUS_HEADERS);
		const mimeArb = fc.constantFrom(
			"image/png",
			"image/jpeg",
			"text/plain",
			"application/octet-stream",
		);
		const trailingArb = fc.array(fc.integer({ min: 0, max: 255 }), {
			minLength: 4,
			maxLength: 20,
		});

		fc.assert(
			fc.property(dangerArb, mimeArb, trailingArb, (danger, mime, trailing) => {
				const file = buildFile(danger.bytes, trailing.length, trailing);
				const result = verifyMagicBytes(file.buffer, mime);
				expect(result.isDangerous).toBe(true);
				expect(result.mismatch).toBe(true);
			}),
		);
	});

	it("dangerous files always have a dangerousReason when isDangerous", () => {
		const dangerArb = fc.constantFrom(...DANGEROUS_HEADERS);
		const trailingArb = fc.array(fc.integer({ min: 0, max: 255 }), {
			minLength: 4,
			maxLength: 20,
		});

		fc.assert(
			fc.property(dangerArb, trailingArb, (danger, trailing) => {
				const file = buildFile(danger.bytes, trailing.length, trailing);
				const result = verifyMagicBytes(file.buffer, "image/png");
				expect(result.isDangerous).toBe(true);
				expect(typeof result.dangerousReason).toBe("string");
				expect(result.dangerousReason?.length).toBeGreaterThan(0);
			}),
		);
	});

	// ========================================================================
	// Dangerous text-based signatures (shebang, batch)
	// ========================================================================
	it("text-based dangerous patterns (shebang, batch) are detected", () => {
		const patternArb = fc.constantFrom(...DANGEROUS_TEXT_PATTERNS);
		const suffixArb = fc.stringMatching(/^[a-zA-Z0-9\n ]{0,50}$/);

		fc.assert(
			fc.property(patternArb, suffixArb, (pattern, suffix) => {
				const bytes = new TextEncoder().encode(pattern + suffix);
				const result = verifyMagicBytes(bytes.buffer, "text/plain");
				expect(result.isDangerous).toBe(true);
			}),
		);
	});

	it("text-based dangerous patterns with leading whitespace are detected", () => {
		const patternArb = fc.constantFrom(...DANGEROUS_TEXT_PATTERNS);
		const whitespaceArb = fc
			.array(fc.constantFrom(" ", "\t", "\n", "\r"), { minLength: 1, maxLength: 5 })
			.map((a) => a.join(""));

		fc.assert(
			fc.property(whitespaceArb, patternArb, (ws, pattern) => {
				const bytes = new TextEncoder().encode(ws + pattern);
				const result = verifyMagicBytes(bytes.buffer, "text/plain");
				expect(result.isDangerous).toBe(true);
			}),
		);
	});

	// ========================================================================
	// WebP detection (two-part signature: RIFF + WEBP at offset 8)
	// ========================================================================
	it("WebP files are correctly detected", () => {
		const trailingArb = fc.array(fc.integer({ min: 0, max: 255 }), {
			minLength: 4,
			maxLength: 50,
		});

		fc.assert(
			fc.property(trailingArb, (trailing) => {
				const file = buildFile(WEBP_HEADER, trailing.length, trailing);
				const result = verifyMagicBytes(file.buffer, "image/webp");
				expect(result.detectedMime).toBe("image/webp");
				expect(result.mismatch).toBe(false);
			}),
		);
	});

	it("files without RIFF header are not detected as WebP", () => {
		// Non-RIFF headers should never be detected as WebP
		const nonRiffArb = fc.constantFrom(
			[0x00, 0x00, 0x00, 0x00],
			[0x89, 0x50, 0x4e, 0x47], // PNG
			[0xff, 0xd8, 0xff, 0xe0], // JPEG
			[0x47, 0x49, 0x46, 0x38], // GIF
			[0x25, 0x50, 0x44, 0x46], // PDF
		);
		const trailingArb = fc.array(fc.integer({ min: 0, max: 255 }), {
			minLength: 8,
			maxLength: 20,
		});

		fc.assert(
			fc.property(nonRiffArb, trailingArb, (header, trailing) => {
				const file = new Uint8Array([...header, ...trailing]);
				const result = verifyMagicBytes(file.buffer, "image/webp");
				expect(result.detectedMime).not.toBe("image/webp");
			}),
		);
	});

	// ========================================================================
	// SVG detection (text-based)
	// ========================================================================
	it("SVG files starting with <svg are detected", () => {
		const svgContentArb = fc.stringMatching(/^[a-zA-Z0-9 ="'-]{0,50}$/);

		fc.assert(
			fc.property(svgContentArb, (content) => {
				const svgText = `<svg ${content}>`;
				const bytes = new TextEncoder().encode(svgText);
				const result = verifyMagicBytes(bytes.buffer, "image/svg+xml");
				expect(result.detectedMime).toBe("image/svg+xml");
				expect(result.mismatch).toBe(false);
			}),
		);
	});

	it("SVG files with XML declaration are detected", () => {
		const svgArb = fc.constantFrom(
			'<?xml version="1.0"?><svg>',
			'<?xml version="1.0" encoding="UTF-8"?><svg>',
		);

		fc.assert(
			fc.property(svgArb, (svg) => {
				const bytes = new TextEncoder().encode(svg);
				const result = verifyMagicBytes(bytes.buffer, "image/svg+xml");
				expect(result.detectedMime).toBe("image/svg+xml");
			}),
		);
	});

	// ========================================================================
	// MIME wildcard: application/octet-stream
	// ========================================================================
	it("application/octet-stream as claimed MIME never causes mismatch for non-dangerous files", () => {
		const bytesArb = fc.uint8Array({ minLength: 0, maxLength: 256 });
		fc.assert(
			fc.property(bytesArb, (bytes) => {
				const result = verifyMagicBytes(bytes.buffer, "application/octet-stream");
				if (!result.isDangerous) {
					expect(result.mismatch).toBe(false);
				}
			}),
		);
	});

	// ========================================================================
	// JPEG variant equivalence
	// ========================================================================
	it("image/jpeg and image/jpg are treated as equivalent", () => {
		const trailingArb = fc.array(fc.integer({ min: 0, max: 255 }), {
			minLength: 10,
			maxLength: 50,
		});

		fc.assert(
			fc.property(trailingArb, (trailing) => {
				const jpegHeader = SAFE_FILE_HEADERS["image/jpeg"];
				const file = buildFile(jpegHeader, trailing.length, trailing);
				const resultJpeg = verifyMagicBytes(file.buffer, "image/jpeg");
				const resultJpg = verifyMagicBytes(file.buffer, "image/jpg");
				expect(resultJpeg.mismatch).toBe(false);
				expect(resultJpg.mismatch).toBe(false);
			}),
		);
	});

	// ========================================================================
	// GIF variant detection (GIF87a and GIF89a)
	// ========================================================================
	it("both GIF87a and GIF89a signatures are detected as image/gif", () => {
		const gifArb = fc.constantFrom(
			SAFE_FILE_HEADERS["image/gif87a"],
			SAFE_FILE_HEADERS["image/gif89a"],
		);
		const trailingArb = fc.array(fc.integer({ min: 0, max: 255 }), {
			minLength: 10,
			maxLength: 50,
		});

		fc.assert(
			fc.property(gifArb, trailingArb, (header, trailing) => {
				const file = buildFile(header, trailing.length, trailing);
				const result = verifyMagicBytes(file.buffer, "image/gif");
				expect(result.detectedMime).toBe("image/gif");
				expect(result.mismatch).toBe(false);
			}),
		);
	});

	// ========================================================================
	// Determinism
	// ========================================================================
	it("same input always produces the same result", () => {
		const bytesArb = fc.uint8Array({ minLength: 0, maxLength: 256 });
		const mimeArb = fc.constantFrom(
			"image/png",
			"image/jpeg",
			"text/plain",
			"application/octet-stream",
		);

		fc.assert(
			fc.property(bytesArb, mimeArb, (bytes, mime) => {
				const buf = bytes.buffer;
				const r1 = verifyMagicBytes(buf, mime);
				const r2 = verifyMagicBytes(buf, mime);
				expect(r1).toEqual(r2);
			}),
		);
	});
});
