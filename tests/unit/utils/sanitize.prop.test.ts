import fc from "fast-check";
import { describe, expect, it } from "vitest";
import "../pbt-setup";
import { sanitizeFilename } from "../../../src/utils/sanitize";

/** Windows reserved device names */
const WINDOWS_RESERVED = [
	"CON",
	"PRN",
	"AUX",
	"NUL",
	"COM1",
	"COM2",
	"COM3",
	"COM4",
	"COM5",
	"COM6",
	"COM7",
	"COM8",
	"COM9",
	"LPT1",
	"LPT2",
	"LPT3",
	"LPT4",
	"LPT5",
	"LPT6",
	"LPT7",
	"LPT8",
	"LPT9",
];

/** OS-forbidden characters that should be replaced */
const OS_FORBIDDEN_CHARS = ["<", ">", ":", '"', "|", "?", "*"];

describe("sanitizeFilename property-based tests", () => {
	// ========================================================================
	// Invariant: output never contains dangerous characters
	// ========================================================================
	it("never contains path traversal sequences (..)", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				const result = sanitizeFilename(input);
				expect(result).not.toContain("..");
			}),
		);
	});

	it("never contains forward slashes", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				const result = sanitizeFilename(input);
				expect(result).not.toContain("/");
			}),
		);
	});

	it("never contains backslashes", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				const result = sanitizeFilename(input);
				expect(result).not.toContain("\\");
			}),
		);
	});

	it("never contains null bytes", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				const result = sanitizeFilename(input);
				expect(result).not.toContain("\0");
			}),
		);
	});

	it("never contains control characters", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				const result = sanitizeFilename(input);
				// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally matching control characters for security
				expect(result).not.toMatch(/[\x00-\x1f\x7f]/);
			}),
		);
	});

	it("never contains OS-forbidden characters", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				const result = sanitizeFilename(input);
				for (const ch of OS_FORBIDDEN_CHARS) {
					expect(result).not.toContain(ch);
				}
			}),
		);
	});

	// ========================================================================
	// Invariant: output satisfies size and shape constraints
	// ========================================================================
	it("result is always <= 255 bytes", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				const result = sanitizeFilename(input);
				const bytes = new TextEncoder().encode(result);
				expect(bytes.length).toBeLessThanOrEqual(255);
			}),
		);
	});

	it("result is never empty", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				const result = sanitizeFilename(input);
				expect(result.length).toBeGreaterThan(0);
			}),
		);
	});

	it("never has leading or trailing spaces or dots", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				const result = sanitizeFilename(input);
				expect(result).not.toMatch(/^[\s.]/);
				expect(result).not.toMatch(/[\s.]$/);
			}),
		);
	});

	it("never contains URL-encoded path separators", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				const result = sanitizeFilename(input);
				expect(result.toLowerCase()).not.toContain("%2f");
				expect(result.toLowerCase()).not.toContain("%5c");
			}),
		);
	});

	// ========================================================================
	// Algebraic property: idempotency
	// ========================================================================
	it("is idempotent — sanitizing twice gives the same result", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				const once = sanitizeFilename(input);
				const twice = sanitizeFilename(once);
				expect(twice).toBe(once);
			}),
		);
	});

	// ========================================================================
	// Windows reserved name handling
	// ========================================================================
	it("Windows reserved names are always prefixed with underscore", () => {
		const reservedArb = fc.constantFrom(...WINDOWS_RESERVED);
		const extArb = fc.constantFrom("", ".txt", ".pdf", ".exe", ".bat");

		fc.assert(
			fc.property(reservedArb, extArb, (reserved, ext) => {
				const result = sanitizeFilename(reserved + ext);
				// The base name must not match a reserved name
				const dotIdx = result.indexOf(".");
				const baseName = dotIdx === -1 ? result : result.substring(0, dotIdx);
				const isStillReserved = WINDOWS_RESERVED.some((r) => baseName.toUpperCase() === r);
				expect(isStillReserved).toBe(false);
			}),
		);
	});

	it("Windows reserved names are detected case-insensitively", () => {
		const reservedArb = fc.constantFrom(...WINDOWS_RESERVED);
		const caseTransform = fc.constantFrom(
			(s: string) => s.toLowerCase(),
			(s: string) => s.toUpperCase(),
			(s: string) =>
				s
					.split("")
					.map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
					.join(""),
		);

		fc.assert(
			fc.property(reservedArb, caseTransform, (reserved, transform) => {
				const result = sanitizeFilename(transform(reserved));
				expect(result.startsWith("_")).toBe(true);
			}),
		);
	});

	// ========================================================================
	// Extension preservation
	// ========================================================================
	it("preserves extension when the total is within 255 bytes", () => {
		const filenameWithExt = fc
			.tuple(
				fc.stringMatching(/^[a-zA-Z0-9_]{1,50}$/),
				fc.constantFrom(".txt", ".pdf", ".png", ".jpg"),
			)
			.map(([name, ext]) => name + ext);

		fc.assert(
			fc.property(filenameWithExt, (input) => {
				const result = sanitizeFilename(input);
				const ext = input.substring(input.lastIndexOf("."));
				if (!result.startsWith("file_") && new TextEncoder().encode(result).length <= 255) {
					expect(result.endsWith(ext) || result.includes(".")).toBe(true);
				}
			}),
		);
	});

	// ========================================================================
	// Unicode and multi-byte handling
	// ========================================================================
	it("255 byte limit respects multi-byte character boundaries", () => {
		// Generate long strings with multi-byte characters that exceed 255 bytes
		const unicodeArb = fc
			.array(
				fc.constantFrom(
					"\u{4E16}", // 世 3-byte
					"\u{00E9}", // é 2-byte
					"a", // 1-byte
				),
				{ minLength: 80, maxLength: 200 },
			)
			.map((chars) => chars.join(""));

		fc.assert(
			fc.property(unicodeArb, (input) => {
				const result = sanitizeFilename(input);
				const encoded = new TextEncoder().encode(result);
				expect(encoded.length).toBeLessThanOrEqual(255);
				// The encoded bytes should decode back without errors
				// (no partial multi-byte sequences)
				const decoded = new TextDecoder("utf-8", { fatal: true }).decode(encoded);
				expect(decoded).toBe(result);
			}),
		);
	});

	it("NFC normalization: equivalent Unicode forms produce same output", () => {
		// é can be represented as single codepoint (NFC) or e + combining accent (NFD)
		const nfcArb = fc
			.tuple(
				fc.stringMatching(/^[a-zA-Z]{1,10}$/),
				fc.constantFrom(
					"\u00E9", // NFC: é
					"\u00F1", // NFC: ñ
					"\u00FC", // NFC: ü
				),
				fc.stringMatching(/^[a-zA-Z]{0,10}$/),
			)
			.map(([a, ch, b]) => a + ch + b);

		fc.assert(
			fc.property(nfcArb, (input) => {
				const nfd = input.normalize("NFD");
				const resultFromOriginal = sanitizeFilename(input);
				const resultFromNFD = sanitizeFilename(nfd);
				expect(resultFromOriginal).toBe(resultFromNFD);
			}),
		);
	});

	// ========================================================================
	// Path traversal injection patterns
	// ========================================================================
	it("handles strings with injected path traversal patterns", () => {
		const traversalArb = fc
			.tuple(
				fc.string(),
				fc.constantFrom("../", "..\\", "%2F", "%5C", "..%2F", "..%5C"),
				fc.string(),
			)
			.map(([a, sep, b]) => a + sep + b);

		fc.assert(
			fc.property(traversalArb, (input) => {
				const result = sanitizeFilename(input);
				expect(result).not.toContain("..");
				expect(result).not.toContain("/");
				expect(result).not.toContain("\\");
			}),
		);
	});

	it("handles double-encoded path traversal patterns", () => {
		const doubleEncodedArb = fc
			.tuple(
				fc.stringMatching(/^[a-zA-Z0-9]{0,10}$/),
				fc.constantFrom(
					"%252F", // double-encoded /
					"%255C", // double-encoded \
					"..%252F", // double-encoded ../
					"%2E%2E%2F", // dot-dot-slash encoded
					"..%c0%af", // overlong UTF-8 encoding of /
				),
				fc.stringMatching(/^[a-zA-Z0-9]{0,10}$/),
			)
			.map(([a, sep, b]) => a + sep + b);

		fc.assert(
			fc.property(doubleEncodedArb, (input) => {
				const result = sanitizeFilename(input);
				expect(result).not.toContain("/");
				expect(result).not.toContain("\\");
				expect(result).not.toContain("..");
			}),
		);
	});

	// ========================================================================
	// OS-forbidden character replacement
	// ========================================================================
	it("replaces OS-forbidden characters with underscore in targeted inputs", () => {
		const forbiddenArb = fc.constantFrom(...OS_FORBIDDEN_CHARS);
		const nameArb = fc.stringMatching(/^[a-zA-Z]{1,10}$/);

		fc.assert(
			fc.property(nameArb, forbiddenArb, nameArb, (prefix, ch, suffix) => {
				const input = `${prefix}${ch}${suffix}`;
				const result = sanitizeFilename(input);
				expect(result).not.toContain(ch);
			}),
		);
	});

	// ========================================================================
	// Fallback for completely invalid filenames
	// ========================================================================
	it("produces a fallback for inputs that consist only of dots and spaces", () => {
		const invalidArb = fc
			.array(fc.constantFrom(".", " ", "\t", "\n"), { minLength: 1, maxLength: 20 })
			.map((chars) => chars.join(""));

		fc.assert(
			fc.property(invalidArb, (input) => {
				const result = sanitizeFilename(input);
				// Should produce a fallback name (file_XXXXXXXX)
				expect(result.startsWith("file_")).toBe(true);
			}),
		);
	});

	it("produces a fallback for inputs that are entirely control characters", () => {
		const controlOnlyArb = fc
			.array(fc.integer({ min: 0, max: 31 }), { minLength: 1, maxLength: 20 })
			.map((codes) => String.fromCharCode(...codes));

		fc.assert(
			fc.property(controlOnlyArb, (input) => {
				const result = sanitizeFilename(input);
				expect(result.startsWith("file_")).toBe(true);
			}),
		);
	});
});
