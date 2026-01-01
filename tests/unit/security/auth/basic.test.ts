import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { basicAuth, timingSafeEqual } from "../../../../src/security/auth/basic";

describe("basicAuth middleware", () => {
	let app: Hono;

	beforeEach(() => {
		app = new Hono();
	});

	describe("configuration validation", () => {
		it("should throw error when users array is empty", () => {
			expect(() => basicAuth({ users: [] })).toThrow(
				"basicAuth: users array must not be empty",
			);
		});

		it("should throw error when users is undefined", () => {
			// @ts-expect-error Testing invalid input
			expect(() => basicAuth({})).toThrow(
				"basicAuth: users array must not be empty",
			);
		});

		it("should throw error when username is empty", () => {
			expect(() =>
				basicAuth({ users: [{ username: "", password: "pass" }] }),
			).toThrow("basicAuth: username and password are required");
		});

		it("should throw error when password is empty", () => {
			expect(() =>
				basicAuth({ users: [{ username: "user", password: "" }] }),
			).toThrow("basicAuth: username and password are required");
		});
	});

	describe("authentication", () => {
		beforeEach(() => {
			app.use(
				"*",
				basicAuth({
					users: [
						{ username: "admin", password: "secret123" },
						{ username: "user", password: "password456" },
					],
				}),
			);
			app.get("/protected", (c) => c.text("OK"));
		});

		it("should return 401 when no Authorization header", async () => {
			const res = await app.request("/protected");
			expect(res.status).toBe(401);
			expect(res.headers.get("WWW-Authenticate")).toBe(
				'Basic realm="kantan-ui"',
			);
			expect(await res.text()).toBe("Unauthorized");
		});

		it("should return 401 when Authorization header is not Basic", async () => {
			const res = await app.request("/protected", {
				headers: { Authorization: "Bearer token123" },
			});
			expect(res.status).toBe(401);
		});

		it("should return 401 when credentials are invalid base64", async () => {
			const res = await app.request("/protected", {
				headers: { Authorization: "Basic !!!invalid!!!" },
			});
			expect(res.status).toBe(401);
		});

		it("should return 401 when credentials format is invalid (no colon)", async () => {
			const invalidCredentials = btoa("usernameonly");
			const res = await app.request("/protected", {
				headers: { Authorization: `Basic ${invalidCredentials}` },
			});
			expect(res.status).toBe(401);
		});

		it("should return 401 when username does not exist", async () => {
			const credentials = btoa("nonexistent:password");
			const res = await app.request("/protected", {
				headers: { Authorization: `Basic ${credentials}` },
			});
			expect(res.status).toBe(401);
		});

		it("should return 401 when password is incorrect", async () => {
			const credentials = btoa("admin:wrongpassword");
			const res = await app.request("/protected", {
				headers: { Authorization: `Basic ${credentials}` },
			});
			expect(res.status).toBe(401);
		});

		it("should allow access with valid credentials", async () => {
			const credentials = btoa("admin:secret123");
			const res = await app.request("/protected", {
				headers: { Authorization: `Basic ${credentials}` },
			});
			expect(res.status).toBe(200);
			expect(await res.text()).toBe("OK");
		});

		it("should allow access for second user with valid credentials", async () => {
			const credentials = btoa("user:password456");
			const res = await app.request("/protected", {
				headers: { Authorization: `Basic ${credentials}` },
			});
			expect(res.status).toBe(200);
		});

		it("should handle password with colon character", async () => {
			const appWithColon = new Hono();
			appWithColon.use(
				"*",
				basicAuth({
					users: [{ username: "user", password: "pass:word:123" }],
				}),
			);
			appWithColon.get("/test", (c) => c.text("OK"));

			const credentials = btoa("user:pass:word:123");
			const res = await appWithColon.request("/test", {
				headers: { Authorization: `Basic ${credentials}` },
			});
			expect(res.status).toBe(200);
		});
	});

	describe("realm configuration", () => {
		it("should use default realm when not specified", async () => {
			app.use("*", basicAuth({ users: [{ username: "u", password: "p" }] }));
			app.get("/test", (c) => c.text("OK"));

			const res = await app.request("/test");
			expect(res.headers.get("WWW-Authenticate")).toBe(
				'Basic realm="kantan-ui"',
			);
		});

		it("should use custom realm when specified", async () => {
			app.use(
				"*",
				basicAuth({
					users: [{ username: "u", password: "p" }],
					realm: "Custom Realm",
				}),
			);
			app.get("/test", (c) => c.text("OK"));

			const res = await app.request("/test");
			expect(res.headers.get("WWW-Authenticate")).toBe(
				'Basic realm="Custom Realm"',
			);
		});
	});

	describe("excludePaths", () => {
		beforeEach(() => {
			app.use(
				"*",
				basicAuth({
					users: [{ username: "admin", password: "secret" }],
					excludePaths: ["/health", "/public"],
				}),
			);
			app.get("/health", (c) => c.text("healthy"));
			app.get("/public", (c) => c.text("public content"));
			app.get("/protected", (c) => c.text("protected content"));
		});

		it("should skip authentication for excluded paths", async () => {
			const res = await app.request("/health");
			expect(res.status).toBe(200);
			expect(await res.text()).toBe("healthy");
		});

		it("should skip authentication for multiple excluded paths", async () => {
			const res = await app.request("/public");
			expect(res.status).toBe(200);
			expect(await res.text()).toBe("public content");
		});

		it("should require authentication for non-excluded paths", async () => {
			const res = await app.request("/protected");
			expect(res.status).toBe(401);
		});
	});

	describe("user context", () => {
		it("should set user in context after successful auth", async () => {
			app.use("*", basicAuth({ users: [{ username: "testuser", password: "testpass" }] }));
			app.get("/whoami", (c) => {
				const user = c.get("user");
				return c.json(user);
			});

			const credentials = btoa("testuser:testpass");
			const res = await app.request("/whoami", {
				headers: { Authorization: `Basic ${credentials}` },
			});
			expect(res.status).toBe(200);

			const user = await res.json();
			expect(user).toEqual({
				id: "testuser",
				username: "testuser",
				roles: [],
			});
		});
	});
});

describe("timingSafeEqual", () => {
	it("should return true for equal strings", () => {
		expect(timingSafeEqual("password123", "password123")).toBe(true);
	});

	it("should return false for different strings", () => {
		expect(timingSafeEqual("password123", "password456")).toBe(false);
	});

	it("should return false for strings of different length", () => {
		expect(timingSafeEqual("short", "longerstring")).toBe(false);
	});

	it("should return true for empty strings", () => {
		expect(timingSafeEqual("", "")).toBe(true);
	});

	it("should return false when comparing empty with non-empty", () => {
		expect(timingSafeEqual("", "something")).toBe(false);
		expect(timingSafeEqual("something", "")).toBe(false);
	});

	it("should handle special characters", () => {
		expect(timingSafeEqual("p@$$w0rd!", "p@$$w0rd!")).toBe(true);
		expect(timingSafeEqual("p@$$w0rd!", "p@$$w0rd?")).toBe(false);
	});

	it("should handle unicode characters", () => {
		expect(timingSafeEqual("パスワード", "パスワード")).toBe(true);
		expect(timingSafeEqual("パスワード", "パスワード!")).toBe(false);
	});
});
