import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import type { BearerAuthOptions, BearerPayload } from "./types";

/**
 * トークンをAuthorizationヘッダーから抽出
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return null;
	}
	return authHeader.slice(7);
}

/**
 * Bearer Token認証ミドルウェア
 *
 * @example
 * ```ts
 * import { verify } from "hono/jwt";
 *
 * app.use("*", bearerAuth({
 *   verify: async (token) => {
 *     try {
 *       const payload = await verify(token, SECRET);
 *       return {
 *         sub: payload.sub as string,
 *         username: payload.username as string,
 *         roles: payload.roles as string[],
 *       };
 *     } catch {
 *       return null;
 *     }
 *   }
 * }));
 * ```
 */
export function bearerAuth(options: BearerAuthOptions) {
	if (!options.verify) {
		throw new Error("bearerAuth: verify function is required");
	}

	const excludePaths = new Set(options.excludePaths ?? []);

	return createMiddleware(async (c: Context, next: Next) => {
		// 除外パスはスキップ
		if (excludePaths.has(c.req.path)) {
			return next();
		}

		const authHeader = c.req.header("Authorization");
		const token = extractBearerToken(authHeader);

		if (!token) {
			return c.json({ error: "Missing or invalid Authorization header" }, 401);
		}

		try {
			const payload = await options.verify(token);

			if (!payload) {
				return c.json({ error: "Invalid token" }, 401);
			}

			// 有効期限チェック
			if (payload.exp !== undefined) {
				const now = Math.floor(Date.now() / 1000);
				if (now > payload.exp) {
					return c.json({ error: "Token expired" }, 401);
				}
			}

			// 認証情報をコンテキストに保存
			c.set("user", {
				id: payload.sub,
				username: payload.username ?? payload.sub,
				roles: payload.roles ?? [],
			});

			return next();
		} catch (error) {
			// 検証関数がエラーをthrowした場合
			const message = error instanceof Error ? error.message : "Token verification failed";
			return c.json({ error: message }, 401);
		}
	});
}
