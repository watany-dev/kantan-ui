/**
 * アプリケーション全体の設定
 */
export interface KantanConfig {
	/** セッション関連の設定 */
	session?: SessionConfig;
	/** クライアント関連の設定 */
	client?: ClientConfig;
}

/**
 * セッション設定
 */
export interface SessionConfig {
	/** セッションIDのヘッダー/ストレージキー名 */
	sessionKey?: string;
	/** セッションの有効期限（ミリ秒） */
	ttl?: number;
	/** クリーンアップ間隔（ミリ秒） */
	cleanupInterval?: number;
}

/**
 * クライアント（WebSocket）設定
 */
export interface ClientConfig {
	/** 最大再接続試行回数 */
	maxReconnectAttempts?: number;
	/** 初回再接続遅延（ミリ秒） */
	baseReconnectDelay?: number;
	/** 最大再接続遅延（ミリ秒） */
	maxReconnectDelay?: number;
}

/**
 * 全ての設定が必須のバージョン（内部使用）
 */
export interface ResolvedKantanConfig {
	session: Required<SessionConfig>;
	client: Required<ClientConfig>;
}
