import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import {
	httpsRedirect,
	getProtocol,
	buildHstsHeader,
} from "../../../../src/security/https/middleware";

describe("getProtocol", () => {
	let app: Hono;

	beforeEach(() => {
		app = new Hono();
	});

	it("should detect HTTPS from X-Forwarded-Proto", async () => {
		let capturedProtocol = "";
		app.get("/test", (c) => {
			capturedProtocol = getProtocol(c);
			return c.text("OK");
		});

		await app.request("http://example.com/test", {
			headers: { "X-Forwarded-Proto": "https" },
		});

		expect(capturedProtocol).toBe("https");
	});

	it("should detect HTTP from X-Forwarded-Proto", async () => {
		let capturedProtocol = "";
		app.get("/test", (c) => {
			capturedProtocol = getProtocol(c);
			return c.text("OK");
		});

		await app.request("http://example.com/test", {
			headers: { "X-Forwarded-Proto": "HTTP" },
		});

		expect(capturedProtocol).toBe("http");
	});

	it("should detect HTTPS from X-Forwarded-Protocol", async () => {
		let capturedProtocol = "";
		app.get("/test", (c) => {
			capturedProtocol = getProtocol(c);
			return c.text("OK");
		});

		await app.request("http://example.com/test", {
			headers: { "X-Forwarded-Protocol": "https" },
		});

		expect(capturedProtocol).toBe("https");
	});

	it("should detect HTTPS from CF-Visitor header", async () => {
		let capturedProtocol = "";
		app.get("/test", (c) => {
			capturedProtocol = getProtocol(c);
			return c.text("OK");
		});

		await app.request("http://example.com/test", {
			headers: { "CF-Visitor": '{"scheme":"https"}' },
		});

		expect(capturedProtocol).toBe("https");
	});

	it("should handle invalid CF-Visitor JSON", async () => {
		let capturedProtocol = "";
		app.get("/test", (c) => {
			capturedProtocol = getProtocol(c);
			return c.text("OK");
		});

		await app.request("http://example.com/test", {
			headers: { "CF-Visitor": "invalid json" },
		});

		// URLからフォールバック
		expect(capturedProtocol).toBe("http");
	});

	it("should handle CF-Visitor without scheme", async () => {
		let capturedProtocol = "";
		app.get("/test", (c) => {
			capturedProtocol = getProtocol(c);
			return c.text("OK");
		});

		await app.request("http://example.com/test", {
			headers: { "CF-Visitor": '{"other":"value"}' },
		});

		expect(capturedProtocol).toBe("http");
	});

	it("should fallback to URL protocol", async () => {
		let capturedProtocol = "";
		app.get("/test", (c) => {
			capturedProtocol = getProtocol(c);
			return c.text("OK");
		});

		await app.request("http://example.com/test");

		expect(capturedProtocol).toBe("http");
	});
});

describe("buildHstsHeader", () => {
	it("should build basic HSTS header", () => {
		const header = buildHstsHeader({
			maxAge: 31536000,
			includeSubDomains: false,
			preload: false,
		});

		expect(header).toBe("max-age=31536000");
	});

	it("should include includeSubDomains directive", () => {
		const header = buildHstsHeader({
			maxAge: 31536000,
			includeSubDomains: true,
			preload: false,
		});

		expect(header).toBe("max-age=31536000; includeSubDomains");
	});

	it("should include preload directive", () => {
		const header = buildHstsHeader({
			maxAge: 31536000,
			includeSubDomains: true,
			preload: true,
		});

		expect(header).toBe("max-age=31536000; includeSubDomains; preload");
	});

	it("should handle preload without includeSubDomains", () => {
		const header = buildHstsHeader({
			maxAge: 31536000,
			includeSubDomains: false,
			preload: true,
		});

		expect(header).toBe("max-age=31536000; preload");
	});
});

describe("httpsRedirect middleware", () => {
	let app: Hono;

	beforeEach(() => {
		app = new Hono();
	});

	describe("redirect behavior", () => {
		beforeEach(() => {
			app.use("*", httpsRedirect());
			app.get("/test", (c) => c.text("OK"));
		});

		it("should redirect HTTP to HTTPS", async () => {
			const res = await app.request("http://example.com/test");

			expect(res.status).toBe(301);
			expect(res.headers.get("Location")).toBe("https://example.com/test");
		});

		it("should preserve query parameters in redirect", async () => {
			const res = await app.request("http://example.com/test?foo=bar&baz=qux");

			expect(res.status).toBe(301);
			expect(res.headers.get("Location")).toBe(
				"https://example.com/test?foo=bar&baz=qux",
			);
		});

		it("should not redirect when already HTTPS", async () => {
			const res = await app.request("http://example.com/test", {
				headers: { "X-Forwarded-Proto": "https" },
			});

			expect(res.status).toBe(200);
			expect(await res.text()).toBe("OK");
		});
	});

	describe("HSTS headers", () => {
		it("should add HSTS header for HTTPS requests", async () => {
			app.use("*", httpsRedirect());
			app.get("/test", (c) => c.text("OK"));

			const res = await app.request("http://example.com/test", {
				headers: { "X-Forwarded-Proto": "https" },
			});

			expect(res.headers.get("Strict-Transport-Security")).toBe(
				"max-age=31536000; includeSubDomains",
			);
		});

		it("should use custom HSTS settings", async () => {
			app.use(
				"*",
				httpsRedirect({
					hstsMaxAge: 3600,
					hstsIncludeSubDomains: false,
					hstsPreload: true,
				}),
			);
			app.get("/test", (c) => c.text("OK"));

			const res = await app.request("http://example.com/test", {
				headers: { "X-Forwarded-Proto": "https" },
			});

			expect(res.headers.get("Strict-Transport-Security")).toBe(
				"max-age=3600; preload",
			);
		});

		it("should not add HSTS header for HTTP requests", async () => {
			app.use("*", httpsRedirect({ allowHttp: true }));
			app.get("/test", (c) => c.text("OK"));

			const res = await app.request("http://example.com/test");

			expect(res.headers.get("Strict-Transport-Security")).toBeNull();
		});
	});

	describe("allowHttp option", () => {
		it("should allow HTTP when allowHttp is true", async () => {
			app.use("*", httpsRedirect({ allowHttp: true }));
			app.get("/test", (c) => c.text("OK"));

			const res = await app.request("http://example.com/test");

			expect(res.status).toBe(200);
			expect(await res.text()).toBe("OK");
		});

		it("should redirect HTTP when allowHttp is false", async () => {
			app.use("*", httpsRedirect({ allowHttp: false }));
			app.get("/test", (c) => c.text("OK"));

			const res = await app.request("http://example.com/test");

			expect(res.status).toBe(301);
		});
	});

	describe("excludePaths option", () => {
		beforeEach(() => {
			app.use(
				"*",
				httpsRedirect({
					excludePaths: ["/health", "/ready"],
				}),
			);
			app.get("/health", (c) => c.text("healthy"));
			app.get("/ready", (c) => c.text("ready"));
			app.get("/api", (c) => c.text("api"));
		});

		it("should skip redirect for excluded paths", async () => {
			const res = await app.request("http://example.com/health");

			expect(res.status).toBe(200);
			expect(await res.text()).toBe("healthy");
		});

		it("should skip redirect for multiple excluded paths", async () => {
			const res = await app.request("http://example.com/ready");

			expect(res.status).toBe(200);
		});

		it("should redirect for non-excluded paths", async () => {
			const res = await app.request("http://example.com/api");

			expect(res.status).toBe(301);
		});
	});

	describe("default options", () => {
		it("should use default values", async () => {
			app.use("*", httpsRedirect());
			app.get("/test", (c) => c.text("OK"));

			// HTTP -> リダイレクト（allowHttp: false by default）
			const httpRes = await app.request("http://example.com/test");
			expect(httpRes.status).toBe(301);

			// HTTPS -> HSTS付与
			const httpsRes = await app.request("http://example.com/test", {
				headers: { "X-Forwarded-Proto": "https" },
			});
			expect(httpsRes.headers.get("Strict-Transport-Security")).toBe(
				"max-age=31536000; includeSubDomains",
			);
		});
	});
});
