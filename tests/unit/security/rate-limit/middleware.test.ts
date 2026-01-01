import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Hono } from "hono";
import { rateLimit, getClientIp } from "../../../../src/security/rate-limit/middleware";
import { RateLimitStore } from "../../../../src/security/rate-limit/store";

describe("getClientIp", () => {
	it("should extract IP from X-Forwarded-For header", async () => {
		const app = new Hono();
		let capturedIp = "";

		app.get("/test", (c) => {
			capturedIp = getClientIp(c);
			return c.text("OK");
		});

		await app.request("/test", {
			headers: { "X-Forwarded-For": "192.168.1.100, 10.0.0.1" },
		});

		expect(capturedIp).toBe("192.168.1.100");
	});

	it("should extract IP from CF-Connecting-IP header", async () => {
		const app = new Hono();
		let capturedIp = "";

		app.get("/test", (c) => {
			capturedIp = getClientIp(c);
			return c.text("OK");
		});

		await app.request("/test", {
			headers: { "CF-Connecting-IP": "1.2.3.4" },
		});

		expect(capturedIp).toBe("1.2.3.4");
	});

	it("should extract IP from X-Real-IP header", async () => {
		const app = new Hono();
		let capturedIp = "";

		app.get("/test", (c) => {
			capturedIp = getClientIp(c);
			return c.text("OK");
		});

		await app.request("/test", {
			headers: { "X-Real-IP": "5.6.7.8" },
		});

		expect(capturedIp).toBe("5.6.7.8");
	});

	it("should return unknown when no IP headers present", async () => {
		const app = new Hono();
		let capturedIp = "";

		app.get("/test", (c) => {
			capturedIp = getClientIp(c);
			return c.text("OK");
		});

		await app.request("/test");

		expect(capturedIp).toBe("unknown");
	});

	it("should prefer X-Forwarded-For over other headers", async () => {
		const app = new Hono();
		let capturedIp = "";

		app.get("/test", (c) => {
			capturedIp = getClientIp(c);
			return c.text("OK");
		});

		await app.request("/test", {
			headers: {
				"X-Forwarded-For": "1.1.1.1",
				"CF-Connecting-IP": "2.2.2.2",
				"X-Real-IP": "3.3.3.3",
			},
		});

		expect(capturedIp).toBe("1.1.1.1");
	});
});

describe("rateLimit middleware", () => {
	let app: Hono;
	let store: RateLimitStore;

	beforeEach(() => {
		vi.useFakeTimers();
		store = new RateLimitStore(0);
		app = new Hono();
	});

	afterEach(() => {
		store.stop();
		vi.useRealTimers();
	});

	describe("basic rate limiting", () => {
		beforeEach(() => {
			app.use(
				"*",
				rateLimit({
					windowMs: 60000,
					maxRequests: 5,
					store,
				}),
			);
			app.get("/test", (c) => c.text("OK"));
		});

		it("should allow requests within limit", async () => {
			for (let i = 0; i < 5; i++) {
				const res = await app.request("/test", {
					headers: { "X-Forwarded-For": "1.2.3.4" },
				});
				expect(res.status).toBe(200);
			}
		});

		it("should block requests exceeding limit", async () => {
			// 5回リクエスト
			for (let i = 0; i < 5; i++) {
				await app.request("/test", {
					headers: { "X-Forwarded-For": "1.2.3.4" },
				});
			}

			// 6回目は拒否
			const res = await app.request("/test", {
				headers: { "X-Forwarded-For": "1.2.3.4" },
			});

			expect(res.status).toBe(429);
			const body = await res.json();
			expect(body.error).toBe("Too many requests, please try again later");
		});

		it("should reset limit after window expires", async () => {
			// 5回リクエスト
			for (let i = 0; i < 5; i++) {
				await app.request("/test", {
					headers: { "X-Forwarded-For": "1.2.3.4" },
				});
			}

			// ウィンドウ期限切れ
			vi.advanceTimersByTime(60001);

			// 新しいウィンドウで許可
			const res = await app.request("/test", {
				headers: { "X-Forwarded-For": "1.2.3.4" },
			});

			expect(res.status).toBe(200);
		});

		it("should track different IPs independently", async () => {
			// IP1: 5回リクエスト
			for (let i = 0; i < 5; i++) {
				await app.request("/test", {
					headers: { "X-Forwarded-For": "1.1.1.1" },
				});
			}

			// IP1: 6回目は拒否
			const res1 = await app.request("/test", {
				headers: { "X-Forwarded-For": "1.1.1.1" },
			});
			expect(res1.status).toBe(429);

			// IP2: まだ許可
			const res2 = await app.request("/test", {
				headers: { "X-Forwarded-For": "2.2.2.2" },
			});
			expect(res2.status).toBe(200);
		});
	});

	describe("rate limit headers", () => {
		beforeEach(() => {
			app.use(
				"*",
				rateLimit({
					windowMs: 60000,
					maxRequests: 10,
					store,
				}),
			);
			app.get("/test", (c) => c.text("OK"));
		});

		it("should include rate limit headers", async () => {
			const res = await app.request("/test", {
				headers: { "X-Forwarded-For": "1.2.3.4" },
			});

			expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
			expect(res.headers.get("X-RateLimit-Remaining")).toBe("9");
			expect(res.headers.get("X-RateLimit-Reset")).toBeDefined();
		});

		it("should decrement remaining count", async () => {
			await app.request("/test", {
				headers: { "X-Forwarded-For": "1.2.3.4" },
			});

			const res = await app.request("/test", {
				headers: { "X-Forwarded-For": "1.2.3.4" },
			});

			expect(res.headers.get("X-RateLimit-Remaining")).toBe("8");
		});

		it("should include Retry-After header when rate limited", async () => {
			// 10回リクエスト
			for (let i = 0; i < 10; i++) {
				await app.request("/test", {
					headers: { "X-Forwarded-For": "1.2.3.4" },
				});
			}

			const res = await app.request("/test", {
				headers: { "X-Forwarded-For": "1.2.3.4" },
			});

			expect(res.status).toBe(429);
			expect(res.headers.get("Retry-After")).toBeDefined();
		});
	});

	describe("headers option", () => {
		it("should not include headers when disabled", async () => {
			app.use(
				"*",
				rateLimit({
					windowMs: 60000,
					maxRequests: 10,
					store,
					headers: false,
				}),
			);
			app.get("/test", (c) => c.text("OK"));

			const res = await app.request("/test");

			expect(res.headers.get("X-RateLimit-Limit")).toBeNull();
			expect(res.headers.get("X-RateLimit-Remaining")).toBeNull();
			expect(res.headers.get("X-RateLimit-Reset")).toBeNull();
		});
	});

	describe("excludePaths", () => {
		beforeEach(() => {
			app.use(
				"*",
				rateLimit({
					windowMs: 60000,
					maxRequests: 1,
					store,
					excludePaths: ["/health", "/public"],
				}),
			);
			app.get("/health", (c) => c.text("healthy"));
			app.get("/public", (c) => c.text("public"));
			app.get("/api", (c) => c.text("api"));
		});

		it("should skip rate limiting for excluded paths", async () => {
			// 何度でもアクセス可能
			for (let i = 0; i < 10; i++) {
				const res = await app.request("/health");
				expect(res.status).toBe(200);
			}
		});

		it("should apply rate limiting to non-excluded paths", async () => {
			await app.request("/api", {
				headers: { "X-Forwarded-For": "1.2.3.4" },
			});

			const res = await app.request("/api", {
				headers: { "X-Forwarded-For": "1.2.3.4" },
			});

			expect(res.status).toBe(429);
		});
	});

	describe("custom message", () => {
		it("should use custom error message", async () => {
			app.use(
				"*",
				rateLimit({
					windowMs: 60000,
					maxRequests: 1,
					store,
					message: "Slow down!",
				}),
			);
			app.get("/test", (c) => c.text("OK"));

			await app.request("/test", {
				headers: { "X-Forwarded-For": "1.2.3.4" },
			});

			const res = await app.request("/test", {
				headers: { "X-Forwarded-For": "1.2.3.4" },
			});

			const body = await res.json();
			expect(body.error).toBe("Slow down!");
		});
	});

	describe("custom keyGenerator", () => {
		it("should use custom key generator", async () => {
			app.use(
				"*",
				rateLimit({
					windowMs: 60000,
					maxRequests: 1,
					store,
					keyGenerator: (c) => c.req.header("X-API-Key") ?? "anonymous",
				}),
			);
			app.get("/test", (c) => c.text("OK"));

			// APIキーごとにカウント
			await app.request("/test", {
				headers: { "X-API-Key": "key1" },
			});

			const res1 = await app.request("/test", {
				headers: { "X-API-Key": "key1" },
			});
			expect(res1.status).toBe(429);

			// 別のAPIキーはまだ許可
			const res2 = await app.request("/test", {
				headers: { "X-API-Key": "key2" },
			});
			expect(res2.status).toBe(200);
		});
	});

	describe("default options", () => {
		it("should work with default options", async () => {
			app.use("*", rateLimit());
			app.get("/test", (c) => c.text("OK"));

			const res = await app.request("/test");

			expect(res.status).toBe(200);
			expect(res.headers.get("X-RateLimit-Limit")).toBe("100");
		});
	});
});
