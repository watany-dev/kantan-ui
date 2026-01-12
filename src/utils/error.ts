/**
 * エラーメッセージ生成ユーティリティ
 */

import type { ServerMessage } from "../websocket/types";

/** エラーコードの型定義 */
export type ErrorCode =
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

/**
 * WebSocket用エラーメッセージを生成する
 * @param code エラーコード
 * @param message エラーメッセージ
 * @param extra 追加プロパティ（retryAfterなど）
 * @returns ServerMessage形式のエラーオブジェクト
 */
function createErrorMessage(
	code: ErrorCode,
	message: string,
	extra?: { retryAfter?: number },
): ServerMessage {
	return {
		type: "error",
		error: {
			code,
			message,
			...extra,
		},
	};
}

/**
 * エラーメッセージをJSON文字列として生成する
 * @param code エラーコード
 * @param message エラーメッセージ
 * @param extra 追加プロパティ
 * @returns JSON文字列
 */
export function createErrorMessageJson(
	code: ErrorCode,
	message: string,
	extra?: { retryAfter?: number },
): string {
	return JSON.stringify(createErrorMessage(code, message, extra));
}
