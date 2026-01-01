import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";

/**
 * HTTPSリダイレクトオプション
 */
export interface HttpsRedirectOptions {
	/** 開発環境でHTTPを許可（デフォルト: false） */
	allowHttp?: boolean;
	/** HSTSのmax-age（秒）デフォルト: 1年 */
	hstsMaxAge?: number;
	/** サブドメインも含める（デフォルト: true） */
	hstsIncludeSubDomains?: boolean;
	/** preload対象に含める（デフォルト: false） */
	hstsPreload?: boolean;
	/** 除外パス（ヘルスチェック等） */
	excludePaths?: string[];
}

/**
 * プロトコルを判定
 * プロキシ環境のX-Forwarded-Proto等を考慮
 */
export function getProtocol(c: Context): string {
	// プロキシからのプロトコル情報
	const forwardedProto = c.req.header("X-Forwarded-Proto");
	if (forwardedProto) {
		return forwardedProto.toLowerCase();
	}

	const forwardedProtocol = c.req.header("X-Forwarded-Protocol");
	if (forwardedProtocol) {
		return forwardedProtocol.toLowerCase();
	}

	// Cloudflare
	const cfVisitor = c.req.header("CF-Visitor");
	if (cfVisitor) {
		try {
			const parsed = JSON.parse(cfVisitor);
			if (parsed.scheme) {
				return parsed.scheme.toLowerCase();
			}
		} catch {
			// パース失敗は無視
		}
	}

	// URLからの判定
	const url = new URL(c.req.url);
	return url.protocol.replace(":", "");
}

/**
 * HSTSヘッダー値を構築
 */
export function buildHstsHeader(options: {
	maxAge: number;
	includeSubDomains: boolean;
	preload: boolean;
}): string {
	let value = `max-age=${options.maxAge}`;

	if (options.includeSubDomains) {
		value += "; includeSubDomains";
	}

	if (options.preload) {
		value += "; preload";
	}

	return value;
}

/**
 * HTTPSリダイレクトミドルウェア
 *
 * @example
 * ```ts
 * app.use("*", httpsRedirect({
 *   allowHttp: process.env.NODE_ENV === "development",
 * }));
 * ```
 */
export function httpsRedirect(options: HttpsRedirectOptions = {}) {
	const allowHttp = options.allowHttp ?? false;
	const hstsMaxAge = options.hstsMaxAge ?? 31536000; // 1年
	const hstsIncludeSubDomains = options.hstsIncludeSubDomains ?? true;
	const hstsPreload = options.hstsPreload ?? false;
	const excludePaths = new Set(options.excludePaths ?? []);

	const hstsHeader = buildHstsHeader({
		maxAge: hstsMaxAge,
		includeSubDomains: hstsIncludeSubDomains,
		preload: hstsPreload,
	});

	return createMiddleware(async (c: Context, next: Next) => {
		// 除外パスはスキップ
		if (excludePaths.has(c.req.path)) {
			return next();
		}

		const protocol = getProtocol(c);
		const isHttps = protocol === "https";

		// HTTPSの場合はHSTSヘッダーを付与
		if (isHttps) {
			c.header("Strict-Transport-Security", hstsHeader);
			return next();
		}

		// HTTPの場合
		if (allowHttp) {
			return next();
		}

		// HTTPSにリダイレクト
		const url = new URL(c.req.url);
		url.protocol = "https:";
		return c.redirect(url.toString(), 301);
	});
}
