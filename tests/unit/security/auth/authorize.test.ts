import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { authorize, hasRoles } from "../../../../src/security/auth/authorize";

describe("hasRoles", () => {
	describe("mode: any", () => {
		it("should return true when user has one of required roles", () => {
			expect(hasRoles(["user", "admin"], ["admin"], "any")).toBe(true);
		});

		it("should return true when user has any of multiple required roles", () => {
			expect(hasRoles(["user"], ["admin", "user"], "any")).toBe(true);
		});

		it("should return false when user has none of required roles", () => {
			expect(hasRoles(["user"], ["admin", "moderator"], "any")).toBe(false);
		});

		it("should return true when no roles required", () => {
			expect(hasRoles(["user"], [], "any")).toBe(true);
		});

		it("should return false for empty user roles when roles required", () => {
			expect(hasRoles([], ["admin"], "any")).toBe(false);
		});

		it("should use any mode as default", () => {
			expect(hasRoles(["user"], ["admin", "user"])).toBe(true);
		});
	});

	describe("mode: all", () => {
		it("should return true when user has all required roles", () => {
			expect(hasRoles(["admin", "user", "verified"], ["admin", "user"], "all")).toBe(true);
		});

		it("should return false when user is missing one required role", () => {
			expect(hasRoles(["admin"], ["admin", "user"], "all")).toBe(false);
		});

		it("should return false when user has none of required roles", () => {
			expect(hasRoles(["guest"], ["admin", "user"], "all")).toBe(false);
		});

		it("should return true when no roles required", () => {
			expect(hasRoles(["user"], [], "all")).toBe(true);
		});

		it("should return false for empty user roles when roles required", () => {
			expect(hasRoles([], ["admin"], "all")).toBe(false);
		});
	});
});

describe("authorize middleware", () => {
	let app: Hono;

	// 認証情報をセットするヘルパーミドルウェア
	const setUser = (user: { id: string; username: string; roles: string[] } | null) => {
		return async (c: any, next: any) => {
			if (user) {
				c.set("user", user);
			}
			await next();
		};
	};

	beforeEach(() => {
		app = new Hono();
	});

	describe("authentication check", () => {
		it("should return 401 when user is not authenticated", async () => {
			app.use("*", setUser(null));
			app.use("*", authorize(["admin"]));
			app.get("/test", (c) => c.text("OK"));

			const res = await app.request("/test");

			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.error).toBe("Authentication required");
		});

		it("should use custom unauthenticated message", async () => {
			app.use("*", setUser(null));
			app.use(
				"*",
				authorize(["admin"], {
					unauthenticatedMessage: "Please log in",
				}),
			);
			app.get("/test", (c) => c.text("OK"));

			const res = await app.request("/test");

			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.error).toBe("Please log in");
		});
	});

	describe("authorization: any mode", () => {
		beforeEach(() => {
			app.use("*", setUser({ id: "1", username: "user", roles: ["user"] }));
			app.use("*", authorize(["admin", "moderator"]));
			app.get("/test", (c) => c.text("OK"));
		});

		it("should return 403 when user lacks required roles", async () => {
			const res = await app.request("/test");

			expect(res.status).toBe(403);
			const body = await res.json();
			expect(body.error).toBe("Forbidden");
			expect(body.required).toEqual(["admin", "moderator"]);
			expect(body.mode).toBe("any");
		});
	});

	describe("authorization: any mode - allowed", () => {
		beforeEach(() => {
			app.use("*", setUser({ id: "1", username: "admin", roles: ["admin"] }));
			app.use("*", authorize(["admin", "moderator"]));
			app.get("/test", (c) => c.text("OK"));
		});

		it("should allow access when user has one of required roles", async () => {
			const res = await app.request("/test");

			expect(res.status).toBe(200);
			expect(await res.text()).toBe("OK");
		});
	});

	describe("authorization: all mode", () => {
		beforeEach(() => {
			app.use("*", setUser({ id: "1", username: "admin", roles: ["admin"] }));
			app.use("*", authorize(["admin", "verified"], { mode: "all" }));
			app.get("/test", (c) => c.text("OK"));
		});

		it("should return 403 when user lacks some required roles", async () => {
			const res = await app.request("/test");

			expect(res.status).toBe(403);
			const body = await res.json();
			expect(body.mode).toBe("all");
		});
	});

	describe("authorization: all mode - allowed", () => {
		beforeEach(() => {
			app.use("*", setUser({ id: "1", username: "superuser", roles: ["admin", "verified", "user"] }));
			app.use("*", authorize(["admin", "verified"], { mode: "all" }));
			app.get("/test", (c) => c.text("OK"));
		});

		it("should allow access when user has all required roles", async () => {
			const res = await app.request("/test");

			expect(res.status).toBe(200);
			expect(await res.text()).toBe("OK");
		});
	});

	describe("empty required roles", () => {
		it("should allow access when no roles required", async () => {
			app.use("*", setUser({ id: "1", username: "user", roles: [] }));
			app.use("*", authorize([]));
			app.get("/test", (c) => c.text("OK"));

			const res = await app.request("/test");

			expect(res.status).toBe(200);
		});
	});

	describe("user without roles array", () => {
		it("should handle user with undefined roles", async () => {
			app.use("*", async (c, next) => {
				c.set("user", { id: "1", username: "user" }); // rolesなし
				await next();
			});
			app.use("*", authorize(["admin"]));
			app.get("/test", (c) => c.text("OK"));

			const res = await app.request("/test");

			expect(res.status).toBe(403);
		});
	});

	describe("custom messages", () => {
		it("should use custom forbidden message", async () => {
			app.use("*", setUser({ id: "1", username: "user", roles: ["user"] }));
			app.use(
				"*",
				authorize(["admin"], {
					forbiddenMessage: "Access denied",
				}),
			);
			app.get("/test", (c) => c.text("OK"));

			const res = await app.request("/test");

			expect(res.status).toBe(403);
			const body = await res.json();
			expect(body.error).toBe("Access denied");
		});
	});

	describe("route-specific authorization", () => {
		it("should apply different authorization to different routes", async () => {
			app.use("*", setUser({ id: "1", username: "user", roles: ["user"] }));

			app.get("/user", authorize(["user"]), (c) => c.text("User area"));
			app.get("/admin", authorize(["admin"]), (c) => c.text("Admin area"));

			const userRes = await app.request("/user");
			expect(userRes.status).toBe(200);

			const adminRes = await app.request("/admin");
			expect(adminRes.status).toBe(403);
		});
	});
});
