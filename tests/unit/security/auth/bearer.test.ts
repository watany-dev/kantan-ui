import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import {
	bearerAuth,
	extractBearerToken,
} from "../../../../src/security/auth/bearer";
import type { BearerPayload } from "../../../../src/security/auth/types";

describe("extractBearerToken", () => {
	it("should extract token from valid Bearer header", () => {
		const token = extractBearerToken("Bearer abc123");
		expect(token).toBe("abc123");
	});

	it("should extract token with special characters", () => {
		const token = extractBearerToken("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature");
		expect(token).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature");
	});

	it("should return null for undefined header", () => {
		const token = extractBearerToken(undefined);
		expect(token).toBeNull();
	});

	it("should return null for non-Bearer header", () => {
		const token = extractBearerToken("Basic abc123");
		expect(token).toBeNull();
	});

	it("should return null for empty header", () => {
		const token = extractBearerToken("");
		expect(token).toBeNull();
	});

	it("should handle Bearer with empty token", () => {
		const token = extractBearerToken("Bearer ");
		expect(token).toBe("");
	});
});

describe("bearerAuth middleware", () => {
	let app: Hono;

	// モック検証関数
	const mockVerify = async (token: string): Promise<BearerPayload | null> => {
		if (token === "valid-token") {
			return {
				sub: "user123",
				username: "testuser",
				roles: ["user"],
			};
		}
		if (token === "admin-token") {
			return {
				sub: "admin456",
				username: "admin",
				roles: ["admin", "user"],
			};
		}
		if (token === "expired-token") {
			return {
				sub: "user123",
				exp: Math.floor(Date.now() / 1000) - 3600, // 1時間前に期限切れ
			};
		}
		if (token === "no-exp-token") {
			return {
				sub: "user123",
				// exp undefined
			};
		}
		if (token === "no-username-token") {
			return {
				sub: "user789",
			};
		}
		return null;
	};

	// エラーをthrowする検証関数
	const throwingVerify = async (_token: string): Promise<BearerPayload | null> => {
		throw new Error("Verification service unavailable");
	};

	// 非Errorオブジェクトをthrowする検証関数
	const throwingNonErrorVerify = async (_token: string): Promise<BearerPayload | null> => {
		throw "string error";
	};

	beforeEach(() => {
		app = new Hono();
	});

	describe("configuration validation", () => {
		it("should throw error when verify function is not provided", () => {
			// @ts-expect-error Testing invalid input
			expect(() => bearerAuth({})).toThrow(
				"bearerAuth: verify function is required",
			);
		});
	});

	describe("authentication", () => {
		beforeEach(() => {
			app.use("*", bearerAuth({ verify: mockVerify }));
			app.get("/protected", (c) => c.text("OK"));
		});

		it("should return 401 when no Authorization header", async () => {
			const res = await app.request("/protected");

			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.error).toBe("Missing or invalid Authorization header");
		});

		it("should return 401 when Authorization header is not Bearer", async () => {
			const res = await app.request("/protected", {
				headers: { Authorization: "Basic abc123" },
			});

			expect(res.status).toBe(401);
		});

		it("should return 401 when token is invalid", async () => {
			const res = await app.request("/protected", {
				headers: { Authorization: "Bearer invalid-token" },
			});

			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.error).toBe("Invalid token");
		});

		it("should return 401 when token is expired", async () => {
			const res = await app.request("/protected", {
				headers: { Authorization: "Bearer expired-token" },
			});

			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.error).toBe("Token expired");
		});

		it("should allow access with valid token", async () => {
			const res = await app.request("/protected", {
				headers: { Authorization: "Bearer valid-token" },
			});

			expect(res.status).toBe(200);
			expect(await res.text()).toBe("OK");
		});

		it("should allow access with token without exp", async () => {
			const res = await app.request("/protected", {
				headers: { Authorization: "Bearer no-exp-token" },
			});

			expect(res.status).toBe(200);
		});
	});

	describe("user context", () => {
		beforeEach(() => {
			app.use("*", bearerAuth({ verify: mockVerify }));
			app.get("/whoami", (c) => {
				const user = c.get("user");
				return c.json(user);
			});
		});

		it("should set user in context after successful auth", async () => {
			const res = await app.request("/whoami", {
				headers: { Authorization: "Bearer valid-token" },
			});

			expect(res.status).toBe(200);
			const user = await res.json();
			expect(user).toEqual({
				id: "user123",
				username: "testuser",
				roles: ["user"],
			});
		});

		it("should set user with admin roles", async () => {
			const res = await app.request("/whoami", {
				headers: { Authorization: "Bearer admin-token" },
			});

			expect(res.status).toBe(200);
			const user = await res.json();
			expect(user.roles).toEqual(["admin", "user"]);
		});

		it("should use sub as username when username not provided", async () => {
			const res = await app.request("/whoami", {
				headers: { Authorization: "Bearer no-username-token" },
			});

			expect(res.status).toBe(200);
			const user = await res.json();
			expect(user.username).toBe("user789");
		});
	});

	describe("excludePaths", () => {
		beforeEach(() => {
			app.use(
				"*",
				bearerAuth({
					verify: mockVerify,
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

	describe("error handling", () => {
		it("should handle verify function throwing Error", async () => {
			app.use("*", bearerAuth({ verify: throwingVerify }));
			app.get("/test", (c) => c.text("OK"));

			const res = await app.request("/test", {
				headers: { Authorization: "Bearer any-token" },
			});

			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.error).toBe("Verification service unavailable");
		});

		it("should handle verify function throwing non-Error", async () => {
			app.use("*", bearerAuth({ verify: throwingNonErrorVerify }));
			app.get("/test", (c) => c.text("OK"));

			const res = await app.request("/test", {
				headers: { Authorization: "Bearer any-token" },
			});

			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.error).toBe("Token verification failed");
		});
	});
});
