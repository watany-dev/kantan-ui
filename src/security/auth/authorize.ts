import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";

/**
 * 認可オプション
 */
export interface AuthorizeOptions {
	/** ロール一致モード（デフォルト: "any"） */
	mode?: "any" | "all";
	/** 認証されていない場合のメッセージ */
	unauthenticatedMessage?: string;
	/** 権限がない場合のメッセージ */
	forbiddenMessage?: string;
}

/**
 * ユーザーが指定されたロールを持っているかチェック
 * @param userRoles ユーザーのロール配列
 * @param requiredRoles 必要なロール配列
 * @param mode "any"=いずれか1つ, "all"=すべて
 */
export function hasRoles(
	userRoles: string[],
	requiredRoles: string[],
	mode: "any" | "all" = "any",
): boolean {
	if (requiredRoles.length === 0) {
		return true;
	}

	if (mode === "any") {
		return requiredRoles.some((role) => userRoles.includes(role));
	}

	// mode === "all"
	return requiredRoles.every((role) => userRoles.includes(role));
}

/**
 * ロールベース認可ミドルウェア
 *
 * @example
 * ```ts
 * // いずれかのロールを持っていれば許可
 * app.get("/admin", authorize(["admin", "superuser"]), (c) => { ... });
 *
 * // すべてのロールを持っている場合のみ許可
 * app.get("/super", authorize(["admin", "verified"], { mode: "all" }), (c) => { ... });
 * ```
 */
export function authorize(requiredRoles: string[], options: AuthorizeOptions = {}) {
	const mode = options.mode ?? "any";
	const unauthenticatedMessage = options.unauthenticatedMessage ?? "Authentication required";
	const forbiddenMessage = options.forbiddenMessage ?? "Forbidden";

	return createMiddleware(async (c: Context, next: Next) => {
		const user = c.get("user");

		// 認証されていない
		if (!user) {
			return c.json({ error: unauthenticatedMessage }, 401);
		}

		const userRoles: string[] = user.roles ?? [];

		// ロールチェック
		if (!hasRoles(userRoles, requiredRoles, mode)) {
			return c.json(
				{
					error: forbiddenMessage,
					required: requiredRoles,
					mode,
				},
				403,
			);
		}

		return next();
	});
}
