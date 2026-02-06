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
	[0x50, 0x4b, 0x03, 0x04], // ZIP
	[0x4d, 0x5a], // MZ (Windows executable)
	[0x7f, 0x45, 0x4c, 0x46], // ELF
];

describe("detectPolyglot property-based tests", () => {
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

	it("empty and very small files are never suspicious", () => {
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

	it("images with embedded executable signatures are always flagged", () => {
		const imageEntryArb = fc.constantFrom(...Object.entries(IMAGE_HEADERS));
		const dangerSigArb = fc.constantFrom(...EMBEDDED_DANGER_SIGS);
		const paddingSizeArb = fc.integer({ min: 20, max: 100 });

		fc.assert(
			fc.property(imageEntryArb, dangerSigArb, paddingSizeArb, ([mime, header], sig, padSize) => {
				// Build: image header + zero padding + dangerous signature
				const file = new Uint8Array(header.length + padSize + sig.length);
				file.set(header, 0);
				// padding remains zeros
				file.set(sig, header.length + padSize);

				const result = detectPolyglot(file.buffer, mime);
				expect(result.isSuspicious).toBe(true);
				expect(result.reasons.length).toBeGreaterThan(0);
			}),
		);
	});

	it("images with embedded script tags are always flagged", () => {
		const imageEntryArb = fc.constantFrom(...Object.entries(IMAGE_HEADERS));
		const scriptPatternArb = fc.constantFrom(
			"<script>alert(1)</script>",
			'<iframe src="x">',
			"<html><body>",
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

	it("PDFs with JavaScript patterns are always flagged", () => {
		const pdfHeader = new TextEncoder().encode("%PDF-1.4\n");
		const jsPatternArb = fc.constantFrom(
			"/JS (alert(1))",
			"/JavaScript /S",
			"/OpenAction /S /JavaScript",
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

	it("text/plain files with safe ASCII content are never suspicious", () => {
		// Use safe alphanumeric content that can't contain binary signatures
		const safeTextArb = fc.stringMatching(/^[a-z0-9 ,.\n]{10,200}$/);

		fc.assert(
			fc.property(safeTextArb, (text) => {
				const bytes = new TextEncoder().encode(text);
				const result = detectPolyglot(bytes.buffer, "text/plain");
				expect(result.isSuspicious).toBe(false);
			}),
		);
	});
});
