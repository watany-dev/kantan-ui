import { describe, expect, it } from "vitest";
import {
	buildSetCookieHeader,
	parseSessionCookie,
	resolveSecure,
} from "../../../src/session/cookie";

describe("parseSessionCookie", () => {
	it("should parse cookie from header", () => {
		const result = parseSessionCookie("kt-session-id=abc123; other=value", "kt-session-id");
		expect(result).toBe("abc123");
	});

	it("should parse cookie at the beginning of header", () => {
		const result = parseSessionCookie("kt-session-id=xyz789", "kt-session-id");
		expect(result).toBe("xyz789");
	});

	it("should parse cookie in the middle of header", () => {
		const result = parseSessionCookie("foo=bar; kt-session-id=middle123; baz=qux", "kt-session-id");
		expect(result).toBe("middle123");
	});

	it("should return undefined for missing cookie", () => {
		const result = parseSessionCookie("other=value", "kt-session-id");
		expect(result).toBeUndefined();
	});

	it("should return undefined for null header", () => {
		const result = parseSessionCookie(null, "kt-session-id");
		expect(result).toBeUndefined();
	});

	it("should return undefined for undefined header", () => {
		const result = parseSessionCookie(undefined, "kt-session-id");
		expect(result).toBeUndefined();
	});

	it("should return undefined for empty header", () => {
		const result = parseSessionCookie("", "kt-session-id");
		expect(result).toBeUndefined();
	});

	it("should handle special characters in key by escaping", () => {
		// キー名に特殊文字が含まれる場合のテスト
		const result = parseSessionCookie("key.with.dots=value123", "key.with.dots");
		expect(result).toBe("value123");
	});

	it("should not match partial key names", () => {
		// kt-session-id-extra というキーがあっても kt-session-id にはマッチしない
		const result = parseSessionCookie(
			"kt-session-id-extra=wrong; kt-session-id=correct",
			"kt-session-id",
		);
		expect(result).toBe("correct");
	});

	it("should handle UUID values", () => {
		const uuid = "550e8400-e29b-41d4-a716-446655440000";
		const result = parseSessionCookie(`kt-session-id=${uuid}`, "kt-session-id");
		expect(result).toBe(uuid);
	});
});

describe("resolveSecure", () => {
	it("should return true for https with auto", () => {
		expect(resolveSecure("https://example.com", "auto")).toBe(true);
	});

	it("should return false for http with auto", () => {
		expect(resolveSecure("http://localhost:3000", "auto")).toBe(false);
	});

	it("should return true for https with auto (with path)", () => {
		expect(resolveSecure("https://example.com/path/to/page", "auto")).toBe(true);
	});

	it("should return false for http with auto (with port)", () => {
		expect(resolveSecure("http://localhost:8080/ws", "auto")).toBe(false);
	});

	it("should return true when secure is explicitly true", () => {
		expect(resolveSecure("http://localhost:3000", true)).toBe(true);
	});

	it("should return false when secure is explicitly false", () => {
		expect(resolveSecure("https://example.com", false)).toBe(false);
	});
});

describe("buildSetCookieHeader", () => {
	const defaultConfig = {
		httpOnly: true,
		secure: "auto" as const,
		sameSite: "Lax" as const,
		path: "/",
	};

	it("should build correct header for https", () => {
		const header = buildSetCookieHeader(
			"kt-session-id",
			"abc123",
			defaultConfig,
			1800,
			"https://example.com",
		);

		expect(header).toContain("kt-session-id=abc123");
		expect(header).toContain("Max-Age=1800");
		expect(header).toContain("Path=/");
		expect(header).toContain("SameSite=Lax");
		expect(header).toContain("HttpOnly");
		expect(header).toContain("Secure");
	});

	it("should build correct header for http (no Secure)", () => {
		const header = buildSetCookieHeader(
			"kt-session-id",
			"abc123",
			defaultConfig,
			1800,
			"http://localhost:3000",
		);

		expect(header).toContain("kt-session-id=abc123");
		expect(header).toContain("Max-Age=1800");
		expect(header).toContain("Path=/");
		expect(header).toContain("SameSite=Lax");
		expect(header).toContain("HttpOnly");
		expect(header).not.toContain("Secure");
	});

	it("should respect httpOnly=false", () => {
		const config = { ...defaultConfig, httpOnly: false };
		const header = buildSetCookieHeader(
			"kt-session-id",
			"abc123",
			config,
			1800,
			"https://example.com",
		);

		expect(header).not.toContain("HttpOnly");
	});

	it("should handle SameSite=Strict", () => {
		const config = { ...defaultConfig, sameSite: "Strict" as const };
		const header = buildSetCookieHeader(
			"kt-session-id",
			"abc123",
			config,
			1800,
			"https://example.com",
		);

		expect(header).toContain("SameSite=Strict");
	});

	it("should handle SameSite=None with Secure", () => {
		const config = {
			...defaultConfig,
			sameSite: "None" as const,
			secure: true as const,
		};
		const header = buildSetCookieHeader(
			"kt-session-id",
			"abc123",
			config,
			1800,
			"http://localhost:3000",
		);

		expect(header).toContain("SameSite=None");
		expect(header).toContain("Secure");
	});

	it("should handle custom path", () => {
		const config = { ...defaultConfig, path: "/app" };
		const header = buildSetCookieHeader(
			"kt-session-id",
			"abc123",
			config,
			1800,
			"https://example.com",
		);

		expect(header).toContain("Path=/app");
	});

	it("should handle UUID session ID", () => {
		const uuid = "550e8400-e29b-41d4-a716-446655440000";
		const header = buildSetCookieHeader(
			"kt-session-id",
			uuid,
			defaultConfig,
			1800,
			"https://example.com",
		);

		expect(header).toContain(`kt-session-id=${uuid}`);
	});

	it("should handle different max-age values", () => {
		const header30min = buildSetCookieHeader(
			"kt-session-id",
			"abc123",
			defaultConfig,
			1800,
			"https://example.com",
		);
		expect(header30min).toContain("Max-Age=1800");

		const header1hour = buildSetCookieHeader(
			"kt-session-id",
			"abc123",
			defaultConfig,
			3600,
			"https://example.com",
		);
		expect(header1hour).toContain("Max-Age=3600");
	});
});
