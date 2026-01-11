import { describe, expect, it } from "vitest";
import { validateOrigin } from "../../../src/websocket/origin-validation";

describe("validateOrigin", () => {
	describe("same-origin requests", () => {
		it("should return true when origin matches host", () => {
			expect(validateOrigin("https://example.com", "example.com", [])).toBe(true);
		});

		it("should return true when origin with port matches host with port", () => {
			expect(validateOrigin("https://example.com:3000", "example.com:3000", [])).toBe(true);
		});

		it("should return false when origin does not match host", () => {
			expect(validateOrigin("https://evil.com", "example.com", [])).toBe(false);
		});

		it("should return false when origin has different port", () => {
			expect(validateOrigin("https://example.com:3001", "example.com:3000", [])).toBe(false);
		});
	});

	describe("undefined origin", () => {
		it("should return true when origin is undefined (same-origin browser request)", () => {
			expect(validateOrigin(undefined, "example.com", [])).toBe(true);
		});

		it("should return true when origin is undefined with allowedOrigins", () => {
			expect(validateOrigin(undefined, "example.com", ["https://other.com"])).toBe(true);
		});
	});

	describe("allowedOrigins list", () => {
		it("should return true when origin is in allowedOrigins", () => {
			expect(
				validateOrigin("https://app.example.com", "api.example.com", ["https://app.example.com"]),
			).toBe(true);
		});

		it("should return true when origin matches any in allowedOrigins", () => {
			expect(
				validateOrigin("https://staging.example.com", "api.example.com", [
					"https://app.example.com",
					"https://staging.example.com",
				]),
			).toBe(true);
		});

		it("should return false when origin is not in allowedOrigins", () => {
			expect(
				validateOrigin("https://evil.com", "api.example.com", ["https://app.example.com"]),
			).toBe(false);
		});

		it("should handle subdomain wildcard-like matching", () => {
			// Subdomain of allowed origin should not automatically match
			expect(
				validateOrigin("https://sub.app.example.com", "api.example.com", [
					"https://app.example.com",
				]),
			).toBe(false);
		});
	});

	describe("edge cases", () => {
		it("should return false for invalid origin URL", () => {
			expect(validateOrigin("not-a-url", "example.com", [])).toBe(false);
		});

		it("should handle origin with trailing slash", () => {
			// URL parsing should handle this
			expect(validateOrigin("https://example.com/", "example.com", [])).toBe(true);
		});

		it("should be case-insensitive for host comparison", () => {
			expect(validateOrigin("https://EXAMPLE.COM", "example.com", [])).toBe(true);
		});

		it("should return true when both origin and host are undefined", () => {
			expect(validateOrigin(undefined, undefined, [])).toBe(true);
		});

		it("should return false when host is undefined but origin is defined", () => {
			expect(validateOrigin("https://example.com", undefined, [])).toBe(false);
		});
	});
});
