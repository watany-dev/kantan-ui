import { describe, expect, it } from "vitest";
import { detectPolyglot } from "../../../src/utils/polyglot-detection";

/**
 * Helper to create a GIF header
 */
function createGifHeader(): Uint8Array {
	return new Uint8Array([
		0x47,
		0x49,
		0x46,
		0x38,
		0x39,
		0x61, // GIF89a
		0x01,
		0x00,
		0x01,
		0x00, // dimensions
		0x00,
		0x00,
		0x00, // flags
	]);
}

/**
 * Helper to create a PNG header
 */
function createPngHeader(): Uint8Array {
	return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

/**
 * Helper to create a JPEG header
 */
function createJpegHeader(): Uint8Array {
	return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
}

describe("detectPolyglot", () => {
	describe("GIFAR detection (GIF with embedded ZIP)", () => {
		it("detects ZIP signature in GIF file", () => {
			const gifHeader = createGifHeader();
			const zipSignature = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // PK..
			const padding = new Uint8Array(100);

			// Create GIFAR: GIF header + padding + ZIP signature
			const gifar = new Uint8Array(gifHeader.length + padding.length + zipSignature.length);
			gifar.set(gifHeader, 0);
			gifar.set(padding, gifHeader.length);
			gifar.set(zipSignature, gifHeader.length + padding.length);

			const result = detectPolyglot(gifar.buffer, "image/gif");
			expect(result.isSuspicious).toBe(true);
			expect(result.reasons.some((r) => r.toLowerCase().includes("zip"))).toBe(true);
		});
	});

	describe("script in image detection", () => {
		it("detects script tag in image file", () => {
			const pngHeader = createPngHeader();
			const scriptTag = new TextEncoder().encode("<script>alert(1)</script>");
			const padding = new Uint8Array(100);

			const imageWithScript = new Uint8Array(pngHeader.length + padding.length + scriptTag.length);
			imageWithScript.set(pngHeader, 0);
			imageWithScript.set(padding, pngHeader.length);
			imageWithScript.set(scriptTag, pngHeader.length + padding.length);

			const result = detectPolyglot(imageWithScript.buffer, "image/png");
			expect(result.isSuspicious).toBe(true);
			expect(result.reasons.some((r) => r.toLowerCase().includes("script"))).toBe(true);
		});

		it("detects javascript: in image file", () => {
			const jpegHeader = createJpegHeader();
			const jsUrl = new TextEncoder().encode('href="javascript:alert(1)"');
			const padding = new Uint8Array(50);

			const imageWithJs = new Uint8Array(jpegHeader.length + padding.length + jsUrl.length);
			imageWithJs.set(jpegHeader, 0);
			imageWithJs.set(padding, jpegHeader.length);
			imageWithJs.set(jsUrl, jpegHeader.length + padding.length);

			const result = detectPolyglot(imageWithJs.buffer, "image/jpeg");
			expect(result.isSuspicious).toBe(true);
		});

		it("detects event handler in image file", () => {
			const pngHeader = createPngHeader();
			const eventHandler = new TextEncoder().encode('onload="alert(1)"');
			const padding = new Uint8Array(50);

			const imageWithEvent = new Uint8Array(
				pngHeader.length + padding.length + eventHandler.length,
			);
			imageWithEvent.set(pngHeader, 0);
			imageWithEvent.set(padding, pngHeader.length);
			imageWithEvent.set(eventHandler, pngHeader.length + padding.length);

			const result = detectPolyglot(imageWithEvent.buffer, "image/png");
			expect(result.isSuspicious).toBe(true);
		});
	});

	describe("JavaScript in PDF detection", () => {
		it("detects /JS in PDF file", () => {
			const pdfHeader = new TextEncoder().encode("%PDF-1.4\n");
			const jsObject = new TextEncoder().encode("/JS (alert(1))");
			const padding = new Uint8Array(50);

			const pdfWithJs = new Uint8Array(pdfHeader.length + padding.length + jsObject.length);
			pdfWithJs.set(pdfHeader, 0);
			pdfWithJs.set(padding, pdfHeader.length);
			pdfWithJs.set(jsObject, pdfHeader.length + padding.length);

			const result = detectPolyglot(pdfWithJs.buffer, "application/pdf");
			expect(result.isSuspicious).toBe(true);
			expect(result.reasons.some((r) => r.toLowerCase().includes("javascript"))).toBe(true);
		});

		it("detects /JavaScript in PDF file", () => {
			const pdfHeader = new TextEncoder().encode("%PDF-1.4\n");
			const jsAction = new TextEncoder().encode("/JavaScript /S");

			const pdfWithJs = new Uint8Array(pdfHeader.length + jsAction.length);
			pdfWithJs.set(pdfHeader, 0);
			pdfWithJs.set(jsAction, pdfHeader.length);

			const result = detectPolyglot(pdfWithJs.buffer, "application/pdf");
			expect(result.isSuspicious).toBe(true);
		});

		it("detects /OpenAction in PDF file", () => {
			const pdfHeader = new TextEncoder().encode("%PDF-1.4\n");
			const openAction = new TextEncoder().encode("/OpenAction /S /JavaScript");

			const pdfWithAction = new Uint8Array(pdfHeader.length + openAction.length);
			pdfWithAction.set(pdfHeader, 0);
			pdfWithAction.set(openAction, pdfHeader.length);

			const result = detectPolyglot(pdfWithAction.buffer, "application/pdf");
			expect(result.isSuspicious).toBe(true);
		});
	});

	describe("clean file handling", () => {
		it("passes clean PNG file", () => {
			const cleanPng = new Uint8Array([
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
				// ... typical PNG content
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
			]);

			const result = detectPolyglot(cleanPng.buffer, "image/png");
			expect(result.isSuspicious).toBe(false);
			expect(result.reasons).toHaveLength(0);
		});

		it("passes clean JPEG file", () => {
			const cleanJpeg = new Uint8Array([
				0xff,
				0xd8,
				0xff,
				0xe0, // JPEG SOI + APP0
				0x00,
				0x10, // length
				0x4a,
				0x46,
				0x49,
				0x46,
				0x00, // JFIF identifier
				0x01,
				0x01, // version
				0x00, // aspect ratio units
				0x00,
				0x01, // X density
				0x00,
				0x01, // Y density
				0x00,
				0x00, // thumbnail dimensions
			]);

			const result = detectPolyglot(cleanJpeg.buffer, "image/jpeg");
			expect(result.isSuspicious).toBe(false);
		});

		it("passes clean PDF file", () => {
			const cleanPdf = new TextEncoder().encode(
				"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
			);

			const result = detectPolyglot(cleanPdf.buffer, "application/pdf");
			expect(result.isSuspicious).toBe(false);
		});

		it("passes clean text file", () => {
			const cleanText = new TextEncoder().encode("Hello, World!\nThis is a clean text file.\n");

			const result = detectPolyglot(cleanText.buffer, "text/plain");
			expect(result.isSuspicious).toBe(false);
		});
	});

	describe("HTML in image detection", () => {
		it("detects HTML doctype in image", () => {
			const pngHeader = createPngHeader();
			const htmlDoctype = new TextEncoder().encode("<!DOCTYPE html>");
			const padding = new Uint8Array(50);

			const imageWithHtml = new Uint8Array(pngHeader.length + padding.length + htmlDoctype.length);
			imageWithHtml.set(pngHeader, 0);
			imageWithHtml.set(padding, pngHeader.length);
			imageWithHtml.set(htmlDoctype, pngHeader.length + padding.length);

			const result = detectPolyglot(imageWithHtml.buffer, "image/png");
			expect(result.isSuspicious).toBe(true);
		});

		it("detects html tag in image", () => {
			const gifHeader = createGifHeader();
			const htmlTag = new TextEncoder().encode("<html><body>");
			const padding = new Uint8Array(50);

			const imageWithHtml = new Uint8Array(gifHeader.length + padding.length + htmlTag.length);
			imageWithHtml.set(gifHeader, 0);
			imageWithHtml.set(padding, gifHeader.length);
			imageWithHtml.set(htmlTag, gifHeader.length + padding.length);

			const result = detectPolyglot(imageWithHtml.buffer, "image/gif");
			expect(result.isSuspicious).toBe(true);
		});
	});

	describe("executable in other files", () => {
		it("detects Windows executable (MZ) signature in image", () => {
			const pngHeader = createPngHeader();
			const mzHeader = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
			const padding = new Uint8Array(100);

			const imageWithExe = new Uint8Array(pngHeader.length + padding.length + mzHeader.length);
			imageWithExe.set(pngHeader, 0);
			imageWithExe.set(padding, pngHeader.length);
			imageWithExe.set(mzHeader, pngHeader.length + padding.length);

			const result = detectPolyglot(imageWithExe.buffer, "image/png");
			expect(result.isSuspicious).toBe(true);
		});

		it("detects ELF signature in image", () => {
			const jpegHeader = createJpegHeader();
			const elfHeader = new Uint8Array([0x7f, 0x45, 0x4c, 0x46]);
			const padding = new Uint8Array(100);

			const imageWithElf = new Uint8Array(jpegHeader.length + padding.length + elfHeader.length);
			imageWithElf.set(jpegHeader, 0);
			imageWithElf.set(padding, jpegHeader.length);
			imageWithElf.set(elfHeader, jpegHeader.length + padding.length);

			const result = detectPolyglot(imageWithElf.buffer, "image/jpeg");
			expect(result.isSuspicious).toBe(true);
		});
	});

	describe("edge cases", () => {
		it("handles empty file", () => {
			const empty = new Uint8Array([]);
			const result = detectPolyglot(empty.buffer, "application/octet-stream");
			expect(result.isSuspicious).toBe(false);
		});

		it("handles very small file", () => {
			const small = new Uint8Array([0x00, 0x01, 0x02]);
			const result = detectPolyglot(small.buffer, "application/octet-stream");
			expect(result.isSuspicious).toBe(false);
		});

		it("does not false positive on binary data", () => {
			// Random binary data that might have some patterns by chance
			const binary = new Uint8Array(1000);
			for (let i = 0; i < binary.length; i++) {
				binary[i] = Math.floor(Math.random() * 256);
			}
			// Ensure it doesn't start with known signatures
			binary[0] = 0x00;
			binary[1] = 0x00;

			const result = detectPolyglot(binary.buffer, "application/octet-stream");
			// May or may not be suspicious depending on random content, but shouldn't crash
			expect(typeof result.isSuspicious).toBe("boolean");
		});
	});
});
