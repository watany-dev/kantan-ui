import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { verifyMagicBytes } from "../../../src/utils/magic-bytes";

/** Known safe file signatures for generating valid file data */
const SAFE_FILE_HEADERS: Record<string, number[]> = {
	"image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
	"image/jpeg": [0xff, 0xd8, 0xff],
	"image/gif": [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
	"application/pdf": [0x25, 0x50, 0x44, 0x46, 0x2d],
	"application/zip": [0x50, 0x4b, 0x03, 0x04],
};

/** Known dangerous file signatures */
const DANGEROUS_HEADERS: Array<{ bytes: number[]; description: string }> = [
	{ bytes: [0x4d, 0x5a], description: "Windows executable" },
	{ bytes: [0x7f, 0x45, 0x4c, 0x46], description: "ELF executable" },
	{ bytes: [0xfe, 0xed, 0xfa, 0xce], description: "Mach-O 32-bit" },
	{ bytes: [0xfe, 0xed, 0xfa, 0xcf], description: "Mach-O 64-bit" },
	{ bytes: [0xca, 0xfe, 0xba, 0xbe], description: "Java class" },
];

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

	it("files with correct magic bytes and matching claimed MIME have no mismatch", () => {
		const entries = Object.entries(SAFE_FILE_HEADERS);
		const entryArb = fc.constantFrom(...entries);
		const trailingArb = fc.array(fc.integer({ min: 0, max: 255 }), {
			minLength: 10,
			maxLength: 50,
		});

		fc.assert(
			fc.property(entryArb, trailingArb, ([mime, header], trailing) => {
				const file = buildFile(header, trailing.length, trailing);
				const result = verifyMagicBytes(file.buffer, mime);
				expect(result.mismatch).toBe(false);
				expect(result.detectedMime).toBe(mime);
			}),
		);
	});

	it("dangerous signatures are always detected regardless of claimed MIME", () => {
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
});
