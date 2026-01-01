import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import { RateLimitStore } from "./store";

/**
 * HTTPレート制限オプション
 */
export interface RateLimitOptions {
	/** ウィンドウサイズ（ミリ秒）デフォルト: 60秒 */
	windowMs?: number;
	/** ウィンドウ内の最大リクエスト数 デフォルト: 100 */
	maxRequests?: number;
	/** キー生成関数（デフォルト: IP） */
	keyGenerator?: (c: Context) => string;
	/** 制限時のメッセージ */
	message?: string;
	/** カスタムストア */
	store?: RateLimitStore;
	/** 除外パス */
	excludePaths?: string[];
	/** レート制限ヘッダーを付与するか（デフォルト: true） */
	headers?: boolean;
}

/**
 * クライアントIPを取得
 */
export function getClientIp(c: Context): string {
	// プロキシ環境対応（X-Forwarded-For）
	const forwarded = c.req.header("X-Forwarded-For");
	if (forwarded) {
		return forwarded.split(",")[0].trim();
	}

	// Cloudflare
	const cfIp = c.req.header("CF-Connecting-IP");
	if (cfIp) {
		return cfIp;
	}

	// nginx等
	const realIp = c.req.header("X-Real-IP");
	if (realIp) {
		return realIp;
	}

	return "unknown";
}

/**
 * HTTPレート制限ミドルウェア
 *
 * @example
 * ```ts
 * app.use("*", rateLimit({
 *   windowMs: 60 * 1000,  // 1分
 *   maxRequests: 100,     // 100リクエスト/分
 * }));
 * ```
 */
export function rateLimit(options: RateLimitOptions = {}) {
	const windowMs = options.windowMs ?? 60 * 1000;
	const maxRequests = options.maxRequests ?? 100;
	const message = options.message ?? "Too many requests, please try again later";
	const store = options.store ?? new RateLimitStore(0); // ミドルウェア用は自動クリーンアップなし
	const excludePaths = new Set(options.excludePaths ?? []);
	const headers = options.headers ?? true;
	const keyGenerator = options.keyGenerator ?? getClientIp;

	return createMiddleware(async (c: Context, next: Next) => {
		// 除外パスはスキップ
		if (excludePaths.has(c.req.path)) {
			return next();
		}

		const key = `http:${keyGenerator(c)}`;
		const result = store.check(key, windowMs, maxRequests);

		// レート制限ヘッダーを設定
		if (headers) {
			c.header("X-RateLimit-Limit", maxRequests.toString());
			c.header("X-RateLimit-Remaining", result.remaining.toString());
			c.header("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000).toString());
		}

		if (!result.allowed) {
			const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
			c.header("Retry-After", retryAfter.toString());
			return c.json({ error: message }, 429);
		}

		return next();
	});
}
