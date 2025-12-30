import type {
	ClientConfig,
	KantanConfig,
	ResolvedKantanConfig,
	SessionConfig,
} from "./types";

/**
 * セッション設定のデフォルト値
 */
export const DEFAULT_SESSION_CONFIG: Required<SessionConfig> = {
	sessionKey: "kt-session-id",
	ttl: 30 * 60 * 1000, // 30分
	cleanupInterval: 60 * 1000, // 1分
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
 * 全設定のデフォルト値
 */
export const DEFAULT_CONFIG: ResolvedKantanConfig = {
	session: DEFAULT_SESSION_CONFIG,
	client: DEFAULT_CLIENT_CONFIG,
};

/**
 * ユーザー設定とデフォルト値をマージして完全な設定を返す
 */
export function resolveConfig(config?: KantanConfig): ResolvedKantanConfig {
	return {
		session: {
			...DEFAULT_SESSION_CONFIG,
			...config?.session,
		},
		client: {
			...DEFAULT_CLIENT_CONFIG,
			...config?.client,
		},
	};
}
