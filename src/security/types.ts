import type { Context } from "hono";

/**
 * 認証結果
 */
export interface AuthResult {
	success: boolean;
	user?: AuthUser;
	error?: string;
}

/**
 * 認証済みユーザー情報
 */
export interface AuthUser {
	id: string;
	username: string;
	roles?: string[];
}

/**
 * 認証設定
 */
export interface AuthConfig {
	/** 認証方式 */
	type: "none" | "basic" | "bearer" | "custom";

	/** Basic認証設定 */
	basic?: BasicAuthConfig;

	/** Bearer Token設定 */
	bearer?: BearerAuthConfig;

	/** カスタム認証関数 */
	custom?: (c: Context) => Promise<AuthResult>;

	/** 認証除外パス */
	excludePaths?: string[];
}

/**
 * Basic認証設定
 */
export interface BasicAuthConfig {
	/** 認証ユーザーリスト */
	users: Array<{ username: string; password: string }>;
	/** WWW-Authenticate realm */
	realm?: string;
}

/**
 * Bearer Token設定
 */
export interface BearerAuthConfig {
	/** トークン検証関数 */
	verify: (token: string) => Promise<AuthUser | null>;
}

/**
 * レート制限設定
 */
export interface RateLimitConfig {
	/** HTTPリクエストのレート制限 */
	http?: HttpRateLimitConfig;

	/** WebSocketメッセージのレート制限 */
	websocket?: WebSocketRateLimitConfig;
}

/**
 * HTTPレート制限設定
 */
export interface HttpRateLimitConfig {
	/** ウィンドウサイズ（ミリ秒） */
	windowMs: number;
	/** ウィンドウ内の最大リクエスト数 */
	maxRequests: number;
}

/**
 * WebSocketレート制限設定
 */
export interface WebSocketRateLimitConfig {
	/** ウィンドウサイズ（ミリ秒） */
	windowMs: number;
	/** ウィンドウ内の最大メッセージ数 */
	maxMessages: number;
	/** IP単位の最大接続数 */
	maxConnectionsPerIp?: number;
}

/**
 * HTTPS設定
 */
export interface HttpsConfig {
	/** 開発環境でHTTPを許可 */
	allowHttp?: boolean;
	/** HSTSのmax-age（秒） */
	hstsMaxAge?: number;
	/** サブドメインも含める */
	hstsIncludeSubDomains?: boolean;
	/** preload対象に含める */
	hstsPreload?: boolean;
	/** 除外パス */
	excludePaths?: string[];
}

/**
 * セキュリティ設定全体
 */
export interface SecurityConfig {
	auth?: AuthConfig;
	rateLimit?: RateLimitConfig;
	https?: HttpsConfig;
}
