import type {
	ClientConfig,
	CookieConfig,
	FileUploadRateLimitConfig,
	KantanConfig,
	ResolvedKantanConfig,
	ResolvedSessionConfig,
	SecurityConfig,
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
	pingInterval: 30000, // 30秒
	pongTimeout: 10000, // 10秒
};

/**
 * ストリーミング設定のデフォルト値
 */
export const DEFAULT_STREAMING_CONFIG: Required<StreamingConfig> = {
	enabled: false, // Phase 1では無効
	flushThreshold: 3,
};

/**
 * ファイルアップロードレート制限のデフォルト値
 */
export const DEFAULT_FILE_UPLOAD_RATE_LIMIT_CONFIG: Required<FileUploadRateLimitConfig> = {
	maxUploadsPerMinute: 30,
	maxBytesPerMinute: 100 * 1024 * 1024, // 100MB
	maxConcurrentUploads: 3,
	uploadRateLimitCooldown: 5000, // 5秒
};

/**
 * セキュリティ設定のデフォルト値
 */
export const DEFAULT_SECURITY_CONFIG: Required<SecurityConfig> = {
	maxPatchSize: 1024 * 1024, // 1MB
	maxEventsPerSecond: 100,
	rateLimitCooldown: 1000, // 1秒
	validateWebSocketOrigin: true,
	allowedOrigins: [],
	fileUploadRateLimit: DEFAULT_FILE_UPLOAD_RATE_LIMIT_CONFIG,
};

/**
 * 全設定のデフォルト値
 */
export const DEFAULT_CONFIG: ResolvedKantanConfig = {
	session: DEFAULT_SESSION_CONFIG,
	client: DEFAULT_CLIENT_CONFIG,
	streaming: DEFAULT_STREAMING_CONFIG,
	security: DEFAULT_SECURITY_CONFIG,
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
		security: {
			...DEFAULT_SECURITY_CONFIG,
			...config?.security,
			// fileUploadRateLimitはネストしてマージ
			fileUploadRateLimit: {
				...DEFAULT_FILE_UPLOAD_RATE_LIMIT_CONFIG,
				...config?.security?.fileUploadRateLimit,
			},
		},
	};
}
