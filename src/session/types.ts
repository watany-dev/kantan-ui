// セッションID
export type SessionId = string;

// セッション状態
export interface SessionState {
	[key: string]: unknown;
}

// セッション情報
export interface Session {
	id: SessionId;
	state: SessionState;
	createdAt: Date;
	lastAccessedAt: Date;
}

// セッション設定
export interface SessionConfig {
	ttl?: number; // セッションTTL（ミリ秒）、デフォルト: 30分
}
