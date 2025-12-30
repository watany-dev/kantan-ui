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
	if (msg.widgetId !== undefined && typeof msg.widgetId !== "string")
		return false;
	if (msg.sessionId !== undefined && typeof msg.sessionId !== "string")
		return false;
	return true;
}

// サーバ → クライアント
export interface ServerMessage {
	type: "patch" | "session" | "error";
	patches?: Patch[];
	sessionId?: string; // 新規セッションID通知
	error?: {
		code: "SESSION_NOT_FOUND" | "INVALID_MESSAGE" | "UNKNOWN";
		message: string;
	};
}

export type Patch = ReplaceRootPatch;

export interface ReplaceRootPatch {
	type: "replaceRoot";
	html: string;
}
