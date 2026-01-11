import { describe, expect, it } from "vitest";
import { createErrorMessageJson } from "../../../src/utils/error";

describe("error utilities", () => {
	describe("createErrorMessageJson", () => {
		it("creates error message with code and message", () => {
			const result = createErrorMessageJson("SESSION_NOT_FOUND", "Session not found");
			const parsed = JSON.parse(result);

			expect(parsed.type).toBe("error");
			expect(parsed.error.code).toBe("SESSION_NOT_FOUND");
			expect(parsed.error.message).toBe("Session not found");
		});

		it("creates error message for invalid message", () => {
			const result = createErrorMessageJson("INVALID_MESSAGE", "Invalid message format");
			const parsed = JSON.parse(result);

			expect(parsed.type).toBe("error");
			expect(parsed.error.code).toBe("INVALID_MESSAGE");
			expect(parsed.error.message).toBe("Invalid message format");
		});

		it("includes retryAfter when provided", () => {
			const result = createErrorMessageJson("RATE_LIMITED", "Too many requests", {
				retryAfter: 5000,
			});
			const parsed = JSON.parse(result);

			expect(parsed.type).toBe("error");
			expect(parsed.error.code).toBe("RATE_LIMITED");
			expect(parsed.error.message).toBe("Too many requests");
			expect(parsed.error.retryAfter).toBe(5000);
		});

		it("handles file upload error codes", () => {
			const codes = [
				"SIZE_EXCEEDED",
				"TYPE_NOT_ALLOWED",
				"DANGEROUS_FILE",
				"DECODE_ERROR",
				"VALIDATION_ERROR",
				"SESSION_LIMIT",
			] as const;

			for (const code of codes) {
				const result = createErrorMessageJson(code, `Error: ${code}`);
				const parsed = JSON.parse(result);

				expect(parsed.type).toBe("error");
				expect(parsed.error.code).toBe(code);
			}
		});

		it("returns valid JSON string", () => {
			const result = createErrorMessageJson("UNKNOWN", "Unknown error");

			expect(typeof result).toBe("string");
			expect(() => JSON.parse(result)).not.toThrow();
		});
	});
});
