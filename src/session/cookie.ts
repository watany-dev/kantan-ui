import type { CookieConfig } from "../config/types";

/**
 * リクエストヘッダーからCookie値を取得（ランタイム非依存）
 * @param cookieHeader Cookieヘッダー文字列
 * @param key 取得するCookie名
 * @returns Cookie値、存在しない場合はundefined
 */
export function parseSessionCookie(
	cookieHeader: string | null | undefined,
	key: string,
): string | undefined {
	if (!cookieHeader) return undefined;

	// key=value を正確にマッチ（セミコロンまたは文字列終端まで）
	const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`));
	return match?.[1];
}

/**
 * Secure属性を解決（ランタイム非依存）
 * @param url リクエストURL
 * @param secure 設定値（true/false/'auto'）
 * @returns 解決されたSecure属性
 */
export function resolveSecure(url: string, secure: boolean | "auto"): boolean {
	if (secure === "auto") {
		return new URL(url).protocol === "https:";
	}
	return secure;
}

/**
 * Set-Cookie ヘッダー文字列を生成
 * @param key Cookie名
 * @param value Cookie値
 * @param config Cookie設定
 * @param maxAge 有効期限（秒）
 * @param requestUrl リクエストURL（Secure属性解決用）
 * @returns Set-Cookieヘッダー文字列
 */
export function buildSetCookieHeader(
	key: string,
	value: string,
	config: Required<CookieConfig>,
	maxAge: number,
	requestUrl: string,
): string {
	const parts = [`${key}=${value}`];

	parts.push(`Max-Age=${maxAge}`);
	parts.push(`Path=${config.path}`);
	parts.push(`SameSite=${config.sameSite}`);

	if (config.httpOnly) {
		parts.push("HttpOnly");
	}

	if (resolveSecure(requestUrl, config.secure)) {
		parts.push("Secure");
	}

	return parts.join("; ");
}
