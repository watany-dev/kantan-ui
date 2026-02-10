/**
 * サーバー側ファイルアップロードハンドラー
 * WebSocketメッセージからファイルを受信し、検証してセッションに保存
 */
import type { SessionManager } from "../session/manager";
import { validateUploadedFile } from "../utils/file-validation";
import { FILE_UPLOAD_LIMITS } from "../widgets/types";
import type { FileUploadMessage } from "./types";

/** アップロードエラーコード */
export type UploadErrorCode =
	| "SIZE_EXCEEDED"
	| "TYPE_NOT_ALLOWED"
	| "DANGEROUS_FILE"
	| "DECODE_ERROR"
	| "VALIDATION_ERROR"
	| "SESSION_LIMIT"
	| "UPLOAD_RATE_LIMITED"
	| "UNKNOWN";

/** アップロード結果 */
export interface UploadResult {
	success: boolean;
	uploadId?: string;
	error?: {
		code: UploadErrorCode;
		message: string;
	};
	/** レート制限時の再試行可能時間（ミリ秒） */
	retryAfter?: number;
}

/**
 * Base64文字列をArrayBufferに変換
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
	if (base64.length === 0) {
		return new ArrayBuffer(0);
	}
	const binaryString = atob(base64);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes.buffer;
}

/**
 * ファイルアップロードメッセージを処理
 */
export function handleFileUpload(
	message: FileUploadMessage,
	sessionId: string,
	sessionManager: SessionManager,
): UploadResult {
	// レート制限チェック
	const rateLimitResult = sessionManager.checkFileUploadRateLimit(sessionId, message.size);
	if (!rateLimitResult.allowed) {
		const result: UploadResult = {
			success: false,
			error: {
				code: "UPLOAD_RATE_LIMITED",
				message: `Rate limit exceeded: ${rateLimitResult.reason}`,
			},
		};
		if (rateLimitResult.retryAfter !== undefined) {
			result.retryAfter = rateLimitResult.retryAfter;
		}
		return result;
	}

	// 同時アップロード数をインクリメント
	sessionManager.incrementConcurrentUploads(sessionId);

	// Base64デコード
	let data: ArrayBuffer;
	try {
		data = base64ToArrayBuffer(message.data);
	} catch {
		sessionManager.decrementConcurrentUploads(sessionId);
		return {
			success: false,
			error: {
				code: "DECODE_ERROR",
				message: "Failed to decode file data",
			},
		};
	}

	// サイズ検証（クライアントからのサイズ情報と実際のデータサイズを比較）
	if (data.byteLength !== message.size) {
		sessionManager.decrementConcurrentUploads(sessionId);
		return {
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: `Size mismatch: claimed ${message.size} bytes, received ${data.byteLength} bytes`,
			},
		};
	}

	// ファイル検証
	const validation = validateUploadedFile(data, message.filename, message.mimeType, {
		maxSize: FILE_UPLOAD_LIMITS.DEFAULT_MAX_SIZE,
		verifyMagicBytes: true,
		detectPolyglot: true,
		strictMode: false,
	});

	if (!validation.valid) {
		sessionManager.decrementConcurrentUploads(sessionId);
		const firstError = validation.errors[0];
		return {
			success: false,
			error: {
				code: mapValidationErrorCode(firstError?.code),
				message: firstError?.message ?? "Validation failed",
			},
		};
	}

	// セッションにアップロードを登録
	const uploadId = sessionManager.registerUpload(
		sessionId,
		data,
		validation.sanitizedFilename,
		validation.verifiedMime ?? message.mimeType,
	);

	if (!uploadId) {
		sessionManager.decrementConcurrentUploads(sessionId);
		return {
			success: false,
			error: {
				code: "SESSION_LIMIT",
				message: "Maximum number of uploads per session exceeded",
			},
		};
	}

	// ウィジェット状態を更新（既存のアップロードIDリストに追加）
	appendUploadIdToWidget(sessionManager, sessionId, message.widgetId, uploadId);

	// アップロード完了を記録
	sessionManager.decrementConcurrentUploads(sessionId);
	sessionManager.recordFileUploadCompletion(sessionId, data.byteLength);

	return {
		success: true,
		uploadId,
	};
}

/**
 * ウィジェット状態にアップロードIDを追加
 */
export function appendUploadIdToWidget(
	sessionManager: SessionManager,
	sessionId: string,
	widgetId: string,
	uploadId: string,
): void {
	const currentState = sessionManager.getState(sessionId);
	const widgetState = currentState?.[widgetId];
	const currentUploadIds = Array.isArray(widgetState) ? widgetState : [];
	sessionManager.setState(sessionId, widgetId, [...currentUploadIds, uploadId]);
}

/**
 * 検証エラーコードをアップロードエラーコードにマップ
 */
export function mapValidationErrorCode(code: string | undefined): UploadErrorCode {
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
