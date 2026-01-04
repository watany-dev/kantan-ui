// クライアント → サーバ
export interface ClientMessage {
	type: "event" | "init";
	widgetId?: string;
	value?: unknown;
	sessionId?: string; // 既存セッションIDを送信
}

/** ClientMessageの型ガード */
export function isClientMessage(data: unknown): data is ClientMessage {
	if (typeof data !== "object" || data === null) return false;
	const msg = data as Record<string, unknown>;
	if (msg.type !== "event" && msg.type !== "init") return false;
	// null も許可（localStorage.getItem が null を返す場合）
	if (msg.widgetId != null && typeof msg.widgetId !== "string") return false;
	if (msg.sessionId != null && typeof msg.sessionId !== "string") return false;
	return true;
}

// サーバ → クライアント
export interface ServerMessage {
	type: "patch" | "session" | "error";
	patches?: Patch[];
	sessionId?: string; // 新規セッションID通知
	/** ストリーミング中の部分更新かどうか */
	partial?: boolean;
	error?: {
		code: "SESSION_NOT_FOUND" | "SESSION_ID_REQUIRED" | "INVALID_MESSAGE" | "UNKNOWN";
		message: string;
	};
}

export type Patch =
	| ReplaceRootPatch
	| ReplaceNodePatch
	| RemoveNodePatch
	| InsertNodePatch
	| StreamAppendPatch;

export interface ReplaceRootPatch {
	type: "replaceRoot";
	html: string;
}

export interface ReplaceNodePatch {
	type: "replaceNode";
	id: string;
	html: string;
}

export interface RemoveNodePatch {
	type: "removeNode";
	id: string;
}

export interface InsertNodePatch {
	type: "insertNode";
	parentId: string;
	index: number;
	html: string;
}

/**
 * ストリーミング用の追加パッチ
 * rerun実行中に部分的なHTMLを追加する
 */
export interface StreamAppendPatch {
	type: "streamAppend";
	html: string;
}
