import fc from "fast-check";
import { describe, expect, it } from "vitest";
import "../pbt-setup";
import { detectPolyglot } from "../../../src/utils/polyglot-detection";

/** Image headers for constructing test files */
const IMAGE_HEADERS: Record<string, number[]> = {
	"image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
	"image/jpeg": [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10],
	"image/gif": [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00],
};

/** Dangerous binary signatures that should trigger polyglot detection */
const EMBEDDED_DANGER_SIGS = [
	{ bytes: [0x50, 0x4b, 0x03, 0x04], name: "ZIP archive" },
	{ bytes: [0x50, 0x4b, 0x05, 0x06], name: "ZIP archive (empty)" },
	{ bytes: [0x4d, 0x5a], name: "MZ (Windows executable)" },
	{ bytes: [0x7f, 0x45, 0x4c, 0x46], name: "ELF" },
	{ bytes: [0xfe, 0xed, 0xfa, 0xce], name: "Mach-O 32-bit" },
	{ bytes: [0xfe, 0xed, 0xfa, 0xcf], name: "Mach-O 64-bit" },
	{ bytes: [0xca, 0xfe, 0xba, 0xbe], name: "Java class" },
];

describe("detectPolyglot property-based tests", () => {
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
			"text/plain",
			"application/octet-stream",
		);
		fc.assert(
			fc.property(bytesArb, mimeArb, (bytes, mime) => {
				const result = detectPolyglot(bytes.buffer, mime);
				expect(typeof result.isSuspicious).toBe("boolean");
				expect(Array.isArray(result.reasons)).toBe(true);
			}),
		);
	});

	it("reasons array elements are always non-empty strings", () => {
		const bytesArb = fc.uint8Array({ minLength: 0, maxLength: 512 });
		const mimeArb = fc.constantFrom(
			"image/png",
			"image/jpeg",
			"image/gif",
			"application/pdf",
			"application/octet-stream",
		);
		fc.assert(
			fc.property(bytesArb, mimeArb, (bytes, mime) => {
				const result = detectPolyglot(bytes.buffer, mime);
				for (const reason of result.reasons) {
					expect(typeof reason).toBe("string");
					expect(reason.length).toBeGreaterThan(0);
				}
			}),
		);
	});

	// ========================================================================
	// Invariant: isSuspicious ↔ reasons.length > 0
	// ========================================================================
	it("isSuspicious is true iff reasons is non-empty", () => {
		const bytesArb = fc.uint8Array({ minLength: 0, maxLength: 512 });
		const mimeArb = fc.constantFrom(
			"image/png",
			"image/jpeg",
			"image/gif",
			"application/pdf",
			"application/octet-stream",
		);
		fc.assert(
			fc.property(bytesArb, mimeArb, (bytes, mime) => {
				const result = detectPolyglot(bytes.buffer, mime);
				expect(result.isSuspicious).toBe(result.reasons.length > 0);
			}),
		);
	});

	// ========================================================================
	// Empty / small files
	// ========================================================================
	it("empty and very small files (< 4 bytes) are never suspicious", () => {
		const smallArb = fc.uint8Array({ minLength: 0, maxLength: 3 });
		const mimeArb = fc.string();
		fc.assert(
			fc.property(smallArb, mimeArb, (bytes, mime) => {
				const result = detectPolyglot(bytes.buffer, mime);
				expect(result.isSuspicious).toBe(false);
				expect(result.reasons).toHaveLength(0);
			}),
		);
	});

	// ========================================================================
	// Images with embedded binary signatures
	// ========================================================================
	it("images with embedded executable signatures are always flagged", () => {
		const imageEntryArb = fc.constantFrom(...Object.entries(IMAGE_HEADERS));
		const dangerSigArb = fc.constantFrom(...EMBEDDED_DANGER_SIGS);
		const paddingSizeArb = fc.integer({ min: 20, max: 100 });

		fc.assert(
			fc.property(imageEntryArb, dangerSigArb, paddingSizeArb, ([mime, header], sig, padSize) => {
				const file = new Uint8Array(header.length + padSize + sig.bytes.length);
				file.set(header, 0);
				file.set(sig.bytes, header.length + padSize);

				const result = detectPolyglot(file.buffer, mime);
				expect(result.isSuspicious).toBe(true);
				expect(result.reasons.length).toBeGreaterThan(0);
			}),
		);
	});

	it("all binary danger signature types are individually detected", () => {
		const dangerSigArb = fc.constantFrom(...EMBEDDED_DANGER_SIGS);
		// Use PNG as the base image
		const pngHeader = IMAGE_HEADERS["image/png"];

		fc.assert(
			fc.property(dangerSigArb, (sig) => {
				const padSize = 50;
				const file = new Uint8Array(pngHeader.length + padSize + sig.bytes.length);
				file.set(pngHeader, 0);
				file.set(sig.bytes, pngHeader.length + padSize);

				const result = detectPolyglot(file.buffer, "image/png");
				expect(result.isSuspicious).toBe(true);
			}),
		);
	});

	// ========================================================================
	// Images with embedded text patterns (XSS)
	// ========================================================================
	it("images with embedded script tags are always flagged", () => {
		const imageEntryArb = fc.constantFrom(...Object.entries(IMAGE_HEADERS));
		const scriptPatternArb = fc.constantFrom(
			"<script>alert(1)</script>",
			'<script src="evil.js">',
			'<iframe src="x">',
			"<html><body>",
			'<embed type="x">',
			'<object data="x">',
			'onload="alert(1)"',
		);

		fc.assert(
			fc.property(imageEntryArb, scriptPatternArb, ([mime, header], pattern) => {
				const patternBytes = new TextEncoder().encode(pattern);
				const padding = new Uint8Array(50);
				const file = new Uint8Array(header.length + padding.length + patternBytes.length);
				file.set(header, 0);
				file.set(padding, header.length);
				file.set(patternBytes, header.length + padding.length);

				const result = detectPolyglot(file.buffer, mime);
				expect(result.isSuspicious).toBe(true);
			}),
		);
	});

	it("images with javascript: URLs embedded are flagged", () => {
		const imageEntryArb = fc.constantFrom(...Object.entries(IMAGE_HEADERS));
		const jsUrlArb = fc.constantFrom(
			"javascript:alert(1)",
			"javascript: void(0)",
			"vbscript:msgbox",
		);

		fc.assert(
			fc.property(imageEntryArb, jsUrlArb, ([mime, header], jsUrl) => {
				const patternBytes = new TextEncoder().encode(jsUrl);
				const padding = new Uint8Array(50);
				const file = new Uint8Array(header.length + padding.length + patternBytes.length);
				file.set(header, 0);
				file.set(padding, header.length);
				file.set(patternBytes, header.length + padding.length);

				const result = detectPolyglot(file.buffer, mime);
				expect(result.isSuspicious).toBe(true);
			}),
		);
	});

	// ========================================================================
	// application/octet-stream also gets text pattern checks
	// ========================================================================
	it("application/octet-stream with script tags is flagged", () => {
		const scriptArb = fc.constantFrom(
			"<script>alert(1)</script>",
			'<iframe src="x">',
			"<html><body>",
		);

		fc.assert(
			fc.property(scriptArb, (script) => {
				// Ensure file is >= 4 bytes
				const bytes = new TextEncoder().encode(`XXXX${script}`);
				const result = detectPolyglot(bytes.buffer, "application/octet-stream");
				expect(result.isSuspicious).toBe(true);
			}),
		);
	});

	// ========================================================================
	// PDF-specific patterns
	// ========================================================================
	it("PDFs with JavaScript patterns are always flagged", () => {
		const pdfHeader = new TextEncoder().encode("%PDF-1.4\n");
		const jsPatternArb = fc.constantFrom(
			"/JS (alert(1))",
			"/JavaScript /S",
			"/OpenAction /S /JavaScript",
			"/AA /S /JavaScript",
			"/Launch /F (cmd.exe)",
		);

		fc.assert(
			fc.property(jsPatternArb, (pattern) => {
				const patternBytes = new TextEncoder().encode(pattern);
				const file = new Uint8Array(pdfHeader.length + patternBytes.length);
				file.set(pdfHeader, 0);
				file.set(patternBytes, pdfHeader.length);

				const result = detectPolyglot(file.buffer, "application/pdf");
				expect(result.isSuspicious).toBe(true);
			}),
		);
	});

	it("PDFs without JavaScript patterns are not flagged", () => {
		const pdfHeader = new TextEncoder().encode("%PDF-1.4\n");
		const safeContentArb = fc.stringMatching(/^[a-z0-9 ,.\n]{10,100}$/);

		fc.assert(
			fc.property(safeContentArb, (content) => {
				const contentBytes = new TextEncoder().encode(content);
				const file = new Uint8Array(pdfHeader.length + contentBytes.length);
				file.set(pdfHeader, 0);
				file.set(contentBytes, pdfHeader.length);

				const result = detectPolyglot(file.buffer, "application/pdf");
				expect(result.isSuspicious).toBe(false);
			}),
		);
	});

	// ========================================================================
	// Non-image MIME types skip text pattern checks
	// ========================================================================
	it("text/plain does not get text pattern checks for embedded HTML", () => {
		const safeTextArb = fc.stringMatching(/^[a-z0-9 ,.\n]{10,200}$/);

		fc.assert(
			fc.property(safeTextArb, (text) => {
				const bytes = new TextEncoder().encode(text);
				const result = detectPolyglot(bytes.buffer, "text/plain");
				expect(result.isSuspicious).toBe(false);
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
			"application/pdf",
			"application/octet-stream",
		);

		fc.assert(
			fc.property(bytesArb, mimeArb, (bytes, mime) => {
				const buf = bytes.buffer;
				const r1 = detectPolyglot(buf, mime);
				const r2 = detectPolyglot(buf, mime);
				expect(r1).toEqual(r2);
			}),
		);
	});
});
