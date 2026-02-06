import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { sanitizeFilename } from "../../../src/utils/sanitize";

describe("sanitizeFilename property-based tests", () => {
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
				// fallback names like file_abc123 don't start/end with space or dot
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

	it("is idempotent — sanitizing twice gives the same result", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				const once = sanitizeFilename(input);
				const twice = sanitizeFilename(once);
				expect(twice).toBe(once);
			}),
		);
	});

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
				// If the result is not a fallback and short enough, extension is preserved
				if (!result.startsWith("file_") && new TextEncoder().encode(result).length <= 255) {
					expect(result.endsWith(ext) || result.includes(".")).toBe(true);
				}
			}),
		);
	});

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
});
