// セッションID
export type SessionId = string;

// セッション状態
export interface SessionState {
	[key: string]: unknown;
}

// イベントキューアイテム
export interface EventQueueItem {
	widgetId: string;
	value: unknown;
	timestamp: number;
	resolve: (result: EventProcessResult) => void;
	reject: (error: Error) => void;
}

// イベント処理結果
export interface EventProcessResult {
	html: string;
	patches: unknown[];
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
