import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import type { BasicAuthOptions } from "./types";

/**
 * タイミング攻撃対策の文字列比較
 * 文字列長が異なる場合も固定時間で比較を行う
 */
export function timingSafeEqual(a: string, b: string): boolean {
	const maxLen = Math.max(a.length, b.length);
	let result = a.length === b.length ? 0 : 1;

	for (let i = 0; i < maxLen; i++) {
		const charA = a.charCodeAt(i % a.length) || 0;
		const charB = b.charCodeAt(i % b.length) || 0;
		result |= charA ^ charB;
	}

	return result === 0;
}

/**
 * 401 Unauthorized レスポンスを返す
 */
function unauthorizedResponse(c: Context, realm: string) {
	c.header("WWW-Authenticate", `Basic realm="${realm}"`);
	return c.text("Unauthorized", 401);
}

/**
 * Base64デコード（安全版）
 */
function safeBase64Decode(encoded: string): string | null {
	try {
		return atob(encoded);
	} catch {
		return null;
	}
}

/**
 * Basic認証ミドルウェア
 *
 * @example
 * ```ts
 * const app = new Hono();
 * app.use("*", basicAuth({
 *   users: [
 *     { username: "admin", password: "secret" }
 *   ],
 *   realm: "Protected Area"
 * }));
 * ```
 */
export function basicAuth(options: BasicAuthOptions) {
	if (!options.users || options.users.length === 0) {
		throw new Error("basicAuth: users array must not be empty");
	}

	const realm = options.realm ?? "kantan-ui";
	const excludePaths = new Set(options.excludePaths ?? []);

	// ユーザー検索用Map（O(1)ルックアップ）
	const userMap = new Map<string, string>();
	for (const user of options.users) {
		if (!user.username || !user.password) {
			throw new Error("basicAuth: username and password are required");
		}
		userMap.set(user.username, user.password);
	}

	return createMiddleware(async (c: Context, next: Next) => {
		// 除外パスはスキップ
		if (excludePaths.has(c.req.path)) {
			return next();
		}

		const authHeader = c.req.header("Authorization");

		if (!authHeader || !authHeader.startsWith("Basic ")) {
			return unauthorizedResponse(c, realm);
		}

		const base64Credentials = authHeader.slice(6);
		const credentials = safeBase64Decode(base64Credentials);

		if (!credentials) {
			return unauthorizedResponse(c, realm);
		}

		const colonIndex = credentials.indexOf(":");
		if (colonIndex === -1) {
			return unauthorizedResponse(c, realm);
		}

		const username = credentials.slice(0, colonIndex);
		const password = credentials.slice(colonIndex + 1);

		const storedPassword = userMap.get(username);

		// ユーザーが存在しない場合もタイミング攻撃対策のため比較を実行
		const passwordToCompare = storedPassword ?? "";
		const isValidPassword = timingSafeEqual(password, passwordToCompare);

		if (!storedPassword || !isValidPassword) {
			return unauthorizedResponse(c, realm);
		}

		// 認証情報をコンテキストに保存
		c.set("user", { id: username, username, roles: [] });

		return next();
	});
}
