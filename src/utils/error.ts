/**
 * エラーメッセージ生成ユーティリティ
 */

import type { ServerMessage } from "../websocket/types";

/** エラーコードの型 */
export type ErrorCode = NonNullable<ServerMessage["error"]>["code"];

/**
 * エラーメッセージオブジェクトを生成
 */
export function createErrorMessage(
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
 * エラーメッセージをJSON文字列として生成
 */
export function createErrorMessageJson(
	code: ErrorCode,
	message: string,
	extra?: { retryAfter?: number },
): string {
	return JSON.stringify(createErrorMessage(code, message, extra));
}
