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
	/** 前回レンダリングしたHTML（差分検出用） */
	lastHtml?: string;
}
