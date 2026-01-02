import type {
	ClientConfig,
	CookieConfig,
	KantanConfig,
	ResolvedKantanConfig,
	ResolvedSessionConfig,
	StreamingConfig,
} from "./types";

/**
 * Cookie設定のデフォルト値
 */
export const DEFAULT_COOKIE_CONFIG: Required<CookieConfig> = {
	httpOnly: true,
	secure: "auto",
	sameSite: "Lax",
	path: "/",
};

/**
 * セッション設定のデフォルト値
 */
export const DEFAULT_SESSION_CONFIG: ResolvedSessionConfig = {
	sessionKey: "kt-session-id",
	ttl: 30 * 60 * 1000, // 30分
	cleanupInterval: 60 * 1000, // 1分
	scope: "tab", // デフォルトは現状維持（localStorage使用）
	cookie: DEFAULT_COOKIE_CONFIG,
};

/**
 * クライアント設定のデフォルト値
 */
export const DEFAULT_CLIENT_CONFIG: Required<ClientConfig> = {
	maxReconnectAttempts: 10,
	baseReconnectDelay: 1000, // 1秒
	maxReconnectDelay: 30000, // 30秒
};

/**
 * ストリーミング設定のデフォルト値
 */
export const DEFAULT_STREAMING_CONFIG: Required<StreamingConfig> = {
	enabled: false, // Phase 1では無効
	flushThreshold: 3,
};

/**
 * 全設定のデフォルト値
 */
export const DEFAULT_CONFIG: ResolvedKantanConfig = {
	session: DEFAULT_SESSION_CONFIG,
	client: DEFAULT_CLIENT_CONFIG,
	streaming: DEFAULT_STREAMING_CONFIG,
};

/**
 * ユーザー設定とデフォルト値をマージして完全な設定を返す
 */
export function resolveConfig(config?: KantanConfig): ResolvedKantanConfig {
	return {
		session: {
			...DEFAULT_SESSION_CONFIG,
			...config?.session,
			// cookieはネストしてマージ
			cookie: {
				...DEFAULT_COOKIE_CONFIG,
				...config?.session?.cookie,
			},
		},
		client: {
			...DEFAULT_CLIENT_CONFIG,
			...config?.client,
		},
		streaming: {
			...DEFAULT_STREAMING_CONFIG,
			...config?.streaming,
		},
	};
}
