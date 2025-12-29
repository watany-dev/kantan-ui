// クライアント → サーバ
export interface ClientMessage {
	type: "event" | "init";
	widgetId?: string;
	value?: unknown;
	sessionId?: string; // 既存セッションIDを送信
}

// サーバ → クライアント
export interface ServerMessage {
	type: "patch" | "session";
	patches?: Patch[];
	sessionId?: string; // 新規セッションID通知
}

export type Patch = ReplaceRootPatch;

export interface ReplaceRootPatch {
	type: "replaceRoot";
	html: string;
}
