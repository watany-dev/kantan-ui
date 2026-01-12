/**
 * サーバー側チャンクアップロードハンドラー
 * WebSocketメッセージからチャンクを受信し、検証してセッションに保存
 */
import type { SessionManager } from "../session/manager";
import { validateUploadedFile } from "../utils/file-validation";
import { FILE_UPLOAD_LIMITS } from "../widgets/types";
import type {
	ChunkUploadDataMessage,
	ChunkUploadEndMessage,
	ChunkUploadStartMessage,
} from "./types";

/** チャンクアップロードエラーコード */
export type ChunkUploadErrorCode =
	| "SESSION_NOT_FOUND"
	| "UPLOAD_NOT_FOUND"
	| "DUPLICATE_UPLOAD_ID"
	| "DUPLICATE_CHUNK"
	| "INVALID_CHUNK_INDEX"
	| "INCOMPLETE_UPLOAD"
	| "DECODE_ERROR"
	| "SIZE_EXCEEDED"
	| "TYPE_NOT_ALLOWED"
	| "DANGEROUS_FILE"
	| "VALIDATION_ERROR"
	| "SESSION_LIMIT"
	| "UPLOAD_RATE_LIMITED"
	| "UNKNOWN";

/** チャンクアップロードレスポンス */
export interface ChunkUploadResponse {
	status: "started" | "chunk_received" | "upload_complete" | "error";
	uploadId: string;
	chunkIndex?: number;
	progress?: number;
	registeredUploadId?: string;
	error?: {
		code: ChunkUploadErrorCode;
		message: string;
	};
	retryAfter?: number;
}

/**
 * チャンクアップロード開始メッセージを処理
 */
export function handleChunkUploadStart(
	message: ChunkUploadStartMessage,
	sessionId: string,
	sessionManager: SessionManager,
): ChunkUploadResponse {
	// レート制限チェック（チャンクアップロード全体のサイズでチェック）
	const rateLimitResult = sessionManager.checkFileUploadRateLimit(sessionId, message.totalSize);
	if (!rateLimitResult.allowed) {
		const response: ChunkUploadResponse = {
			status: "error",
			uploadId: message.uploadId,
			error: {
				code: "UPLOAD_RATE_LIMITED",
				message: `Rate limit exceeded: ${rateLimitResult.reason}`,
			},
		};
		if (rateLimitResult.retryAfter !== undefined) {
			response.retryAfter = rateLimitResult.retryAfter;
		}
		return response;
	}

	// チャンクアップロードを開始
	const result = sessionManager.startChunkUpload(sessionId, message);

	if (result === null) {
		// セッションが存在しない場合と重複uploadIdの場合を区別
		const session = sessionManager.getSession(sessionId);
		if (!session) {
			return {
				status: "error",
				uploadId: message.uploadId,
				error: {
					code: "SESSION_NOT_FOUND",
					message: "Session not found",
				},
			};
		}
		return {
			status: "error",
			uploadId: message.uploadId,
			error: {
				code: "DUPLICATE_UPLOAD_ID",
				message: "Upload ID already exists",
			},
		};
	}

	// 同時アップロード数をインクリメント
	sessionManager.incrementConcurrentUploads(sessionId);

	return {
		status: "started",
		uploadId: message.uploadId,
	};
}

/**
 * チャンクデータメッセージを処理
 */
export function handleChunkUploadData(
	message: ChunkUploadDataMessage,
	sessionManager: SessionManager,
): ChunkUploadResponse {
	// 進捗情報を取得してチャンクインデックスの範囲チェック
	const progress = sessionManager.getChunkUploadProgress(message.uploadId);
	if (!progress) {
		return {
			status: "error",
			uploadId: message.uploadId,
			error: {
				code: "UPLOAD_NOT_FOUND",
				message: "Upload not found",
			},
		};
	}

	// チャンクインデックスの範囲チェック
	if (message.chunkIndex < 0 || message.chunkIndex >= progress.totalChunks) {
		return {
			status: "error",
			uploadId: message.uploadId,
			chunkIndex: message.chunkIndex,
			error: {
				code: "INVALID_CHUNK_INDEX",
				message: `Chunk index ${message.chunkIndex} is out of range (0-${progress.totalChunks - 1})`,
			},
		};
	}

	// チャンクを受信
	const received = sessionManager.receiveChunk(message.uploadId, message.chunkIndex, message.data);

	if (!received) {
		return {
			status: "error",
			uploadId: message.uploadId,
			chunkIndex: message.chunkIndex,
			error: {
				code: "DUPLICATE_CHUNK",
				message: `Chunk ${message.chunkIndex} already received`,
			},
		};
	}

	// 更新された進捗を取得
	const updatedProgress = sessionManager.getChunkUploadProgress(message.uploadId);

	return {
		status: "chunk_received",
		uploadId: message.uploadId,
		chunkIndex: message.chunkIndex,
		progress: updatedProgress?.percentage ?? 0,
	};
}

/**
 * チャンクアップロード完了メッセージを処理
 */
export function handleChunkUploadComplete(
	message: ChunkUploadEndMessage,
	sessionId: string,
	sessionManager: SessionManager,
): ChunkUploadResponse {
	// メタデータを取得
	const metadata = sessionManager.getChunkUploadMetadata(message.uploadId);
	if (!metadata) {
		return {
			status: "error",
			uploadId: message.uploadId,
			error: {
				code: "UPLOAD_NOT_FOUND",
				message: "Upload not found",
			},
		};
	}

	// チャンクを結合
	const assembledData = sessionManager.completeChunkUpload(message.uploadId);

	if (!assembledData) {
		// 同時アップロード数をデクリメント（失敗時も）
		sessionManager.decrementConcurrentUploads(sessionId);

		return {
			status: "error",
			uploadId: message.uploadId,
			error: {
				code: "INCOMPLETE_UPLOAD",
				message: "Not all chunks have been received",
			},
		};
	}

	// ファイル検証
	const validation = validateUploadedFile(assembledData, metadata.filename, metadata.mimeType, {
		maxSize: FILE_UPLOAD_LIMITS.DEFAULT_MAX_SIZE,
		verifyMagicBytes: true,
		detectPolyglot: true,
		strictMode: false,
	});

	if (!validation.valid) {
		// 同時アップロード数をデクリメント
		sessionManager.decrementConcurrentUploads(sessionId);

		const firstError = validation.errors[0];
		return {
			status: "error",
			uploadId: message.uploadId,
			error: {
				code: mapValidationErrorCode(firstError?.code),
				message: firstError?.message ?? "Validation failed",
			},
		};
	}

	// セッションにアップロードを登録
	const registeredUploadId = sessionManager.registerUpload(
		sessionId,
		assembledData,
		validation.sanitizedFilename,
		validation.verifiedMime ?? metadata.mimeType,
	);

	if (!registeredUploadId) {
		// 同時アップロード数をデクリメント
		sessionManager.decrementConcurrentUploads(sessionId);

		return {
			status: "error",
			uploadId: message.uploadId,
			error: {
				code: "SESSION_LIMIT",
				message: "Maximum number of uploads per session exceeded",
			},
		};
	}

	// ウィジェット状態を更新
	const currentState = sessionManager.getState(sessionId);
	const widgetState = currentState?.[metadata.widgetId];
	const currentUploadIds = Array.isArray(widgetState) ? widgetState : [];

	sessionManager.setState(sessionId, metadata.widgetId, [...currentUploadIds, registeredUploadId]);

	// アップロード完了を記録
	sessionManager.decrementConcurrentUploads(sessionId);
	sessionManager.recordFileUploadCompletion(sessionId, assembledData.byteLength);

	return {
		status: "upload_complete",
		uploadId: message.uploadId,
		registeredUploadId,
	};
}

/**
 * 検証エラーコードをチャンクアップロードエラーコードにマップ
 */
function mapValidationErrorCode(code: string | undefined): ChunkUploadErrorCode {
	switch (code) {
		case "SIZE_EXCEEDED":
			return "SIZE_EXCEEDED";
		case "TYPE_NOT_ALLOWED":
			return "TYPE_NOT_ALLOWED";
		case "DANGEROUS_FILE":
			return "DANGEROUS_FILE";
		default:
			return "VALIDATION_ERROR";
	}
}
