/**
 * Node.js HTTP/HTTPS Server型（@hono/node-serverからの依存を避けるためローカル定義）
 * Deno互換性のため、@hono/node-serverを直接インポートしない
 */
export type NodeServerType = {
	close: () => void;
	listen: (port: number, hostname?: string, callback?: () => void) => void;
};

function asRecord(data: unknown): Record<string, unknown> | null {
	if (typeof data !== "object" || data === null) return null;
	return data as Record<string, unknown>;
}

// クライアント → サーバ
export interface ClientMessage {
	type:
		| "event"
		| "init"
		| "pong"
		| "file_upload"
		| "chunk_upload_start"
		| "chunk_upload_data"
		| "chunk_upload_end";
	widgetId?: string;
	value?: unknown;
	sessionId?: string; // 既存セッションIDを送信
	/** 再接続時に送信する最後に受信したシーケンス番号 */
	lastSeq?: number;
}

/** ファイルアップロードメッセージ */
export interface FileUploadMessage {
	type: "file_upload";
	widgetId: string;
	filename: string;
	mimeType: string;
	size: number;
	data: string; // Base64エンコードされたデータ
	isChunked: boolean;
	totalChunks?: number;
	chunkIndex?: number;
}

/** FileUploadMessageの型ガード */
export function isFileUploadMessage(data: unknown): data is FileUploadMessage {
	const msg = asRecord(data);
	if (!msg) return false;
	if (msg["type"] !== "file_upload") return false;
	if (typeof msg["widgetId"] !== "string") return false;
	if (typeof msg["filename"] !== "string") return false;
	if (typeof msg["mimeType"] !== "string") return false;
	if (typeof msg["size"] !== "number") return false;
	if (typeof msg["data"] !== "string") return false;
	if (typeof msg["isChunked"] !== "boolean") return false;
	return true;
}

/** ClientMessageの型ガード */
export function isClientMessage(data: unknown): data is ClientMessage {
	const msg = asRecord(data);
	if (!msg) return false;
	const validTypes = [
		"event",
		"init",
		"pong",
		"file_upload",
		"chunk_upload_start",
		"chunk_upload_data",
		"chunk_upload_end",
	];
	if (!validTypes.includes(msg["type"] as string)) {
		return false;
	}
	// null も許可（localStorage.getItem が null を返す場合）
	if (msg["widgetId"] != null && typeof msg["widgetId"] !== "string") return false;
	if (msg["sessionId"] != null && typeof msg["sessionId"] !== "string") return false;
	if (msg["lastSeq"] != null && typeof msg["lastSeq"] !== "number") return false;
	return true;
}

/** チャンクアップロード開始メッセージ */
export interface ChunkUploadStartMessage {
	type: "chunk_upload_start";
	widgetId: string;
	uploadId: string;
	filename: string;
	mimeType: string;
	totalSize: number;
	totalChunks: number;
	chunkSize: number;
}

/** チャンクアップロードデータメッセージ */
export interface ChunkUploadDataMessage {
	type: "chunk_upload_data";
	uploadId: string;
	chunkIndex: number;
	data: string; // Base64エンコードされたチャンクデータ
}

/** チャンクアップロード終了メッセージ */
export interface ChunkUploadEndMessage {
	type: "chunk_upload_end";
	uploadId: string;
	checksum?: string; // オプショナルなチェックサム（SHA-256等）
}

/** ChunkUploadStartMessageの型ガード */
export function isChunkUploadStartMessage(data: unknown): data is ChunkUploadStartMessage {
	const msg = asRecord(data);
	if (!msg) return false;
	if (msg["type"] !== "chunk_upload_start") return false;
	if (typeof msg["widgetId"] !== "string") return false;
	if (typeof msg["uploadId"] !== "string") return false;
	if (typeof msg["filename"] !== "string") return false;
	if (typeof msg["mimeType"] !== "string") return false;
	if (typeof msg["totalSize"] !== "number") return false;
	if (typeof msg["totalChunks"] !== "number") return false;
	if (typeof msg["chunkSize"] !== "number") return false;
	return true;
}

/** ChunkUploadDataMessageの型ガード */
export function isChunkUploadDataMessage(data: unknown): data is ChunkUploadDataMessage {
	const msg = asRecord(data);
	if (!msg) return false;
	if (msg["type"] !== "chunk_upload_data") return false;
	if (typeof msg["uploadId"] !== "string") return false;
	if (typeof msg["chunkIndex"] !== "number") return false;
	if (typeof msg["data"] !== "string") return false;
	return true;
}

/** ChunkUploadEndMessageの型ガード */
export function isChunkUploadEndMessage(data: unknown): data is ChunkUploadEndMessage {
	const msg = asRecord(data);
	if (!msg) return false;
	if (msg["type"] !== "chunk_upload_end") return false;
	if (typeof msg["uploadId"] !== "string") return false;
	// checksum is optional
	if (msg["checksum"] != null && typeof msg["checksum"] !== "string") return false;
	return true;
}

// サーバ → クライアント
export interface ServerMessage {
	type: "patch" | "session" | "error" | "ping";
	patches?: Patch[];
	sessionId?: string | undefined; // 新規セッションID通知
	/** ストリーミング中の部分更新かどうか */
	partial?: boolean;
	/** パッチのシーケンス番号（再接続時の再同期用） */
	seq?: number;
	error?: {
		code:
			| "SESSION_NOT_FOUND"
			| "SESSION_ID_REQUIRED"
			| "INVALID_MESSAGE"
			| "RATE_LIMITED"
			| "UNKNOWN"
			// File upload error codes
			| "SIZE_EXCEEDED"
			| "TYPE_NOT_ALLOWED"
			| "DANGEROUS_FILE"
			| "DECODE_ERROR"
			| "VALIDATION_ERROR"
			| "SESSION_LIMIT"
			| "UPLOAD_RATE_LIMITED";
		message: string;
		/** レート制限時: 再試行までのミリ秒 */
		retryAfter?: number;
	};
}

export type Patch =
	| ReplaceRootPatch
	| ReplaceNodePatch
	| RemoveNodePatch
	| InsertNodePatch
	| StreamAppendPatch
	| StreamChunkPatch
	| StreamEndPatch;

export interface ReplaceRootPatch {
	type: "replaceRoot";
	html: string;
	/** ターゲット要素ID（デフォルト: "app"） */
	rootId?: string;
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
interface StreamAppendPatch {
	type: "streamAppend";
	html: string;
}

/**
 * write_stream用: テキストチャンクを追加
 * 対象のストリーム要素にテキストを追加する
 */
export interface StreamChunkPatch {
	type: "streamChunk";
	/** ストリーム要素のID */
	streamId: string;
	/** 追加するテキストコンテンツ */
	content: string;
}

/**
 * write_stream用: ストリーム完了
 * カーソルを削除し、オプションで最終HTMLを設定
 */
export interface StreamEndPatch {
	type: "streamEnd";
	/** ストリーム要素のID */
	streamId: string;
	/** Markdownレンダリング後の最終HTML（markdown: true の場合） */
	finalHtml?: string;
}
