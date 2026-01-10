// セッションID
export type SessionId = string;

// ダウンロードID
export type DownloadId = string;

// アップロードID
export type UploadId = string;

// ダウンロードデータ
export interface DownloadData {
	data: ArrayBuffer;
	filename: string;
	mime: string;
	createdAt: number;
}

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

// パッチ履歴エントリ
export interface PatchHistoryEntry {
	seq: number;
	patches: unknown[];
	timestamp: number;
}

// セッション情報
export interface Session {
	id: SessionId;
	state: SessionState;
	createdAt: Date;
	lastAccessedAt: Date;
	/** 前回レンダリングしたHTML（差分検出用） */
	lastHtml?: string;
	/** 前回レンダリングしたサイドバーHTML（差分検出用） */
	lastSidebarHtml?: string;
	/** 最後のサーバーシーケンス番号 */
	lastSeq: number;
	/** パッチ履歴（再接続時の再同期用） */
	patchHistory: PatchHistoryEntry[];
}
