/**
 * アプリケーション全体の設定
 */
export interface KantanConfig {
	/** セッション関連の設定 */
	session?: SessionConfig;
	/** クライアント関連の設定 */
	client?: ClientConfig;
	/** ストリーミング関連の設定 */
	streaming?: StreamingConfig;
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
	/**
	 * セッションスコープ
	 * - 'tab': タブごとに独立したセッション（デフォルト、localStorage使用）
	 * - 'browser': ブラウザ全体で共有（Cookie使用、HttpOnly）
	 */
	scope?: "tab" | "browser";
	/** scope='browser'時のCookie設定 */
	cookie?: CookieConfig;
}

/**
 * Cookie設定（scope='browser'時に使用）
 */
export interface CookieConfig {
	/** HttpOnly属性（デフォルト: true） */
	httpOnly?: boolean;
	/**
	 * Secure属性
	 * - true: 常にSecure
	 * - false: 常に非Secure
	 * - 'auto': リクエストプロトコルに応じて自動判定（デフォルト）
	 */
	secure?: boolean | "auto";
	/** SameSite属性（デフォルト: 'Lax'） */
	sameSite?: "Strict" | "Lax" | "None";
	/** Path属性（デフォルト: '/'） */
	path?: string;
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
	/** ping送信間隔（ミリ秒）。0で無効。 */
	pingInterval?: number;
	/** pong応答タイムアウト（ミリ秒）。この時間内にpongがなければ切断とみなす。 */
	pongTimeout?: number;
}

/**
 * ストリーミング設定
 */
export interface StreamingConfig {
	/** ストリーミングを有効にするかどうか（デフォルト: false） */
	enabled?: boolean;
	/** フラッシュしきい値（何要素ごとにフラッシュするか、デフォルト: 3） */
	flushThreshold?: number;
}

/**
 * 解決済みセッション設定（内部使用）
 */
export interface ResolvedSessionConfig {
	sessionKey: string;
	ttl: number;
	cleanupInterval: number;
	scope: "tab" | "browser";
	cookie: Required<CookieConfig>;
}

/**
 * 全ての設定が必須のバージョン（内部使用）
 */
export interface ResolvedKantanConfig {
	session: ResolvedSessionConfig;
	client: Required<ClientConfig>;
	streaming: Required<StreamingConfig>;
}
