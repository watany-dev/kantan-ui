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

// SessionConfigはconfig/types.tsから再エクスポート
export type { SessionConfig } from "../config/types";
