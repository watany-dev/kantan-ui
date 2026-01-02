/**
 * AbortErrorを作成する（Web標準のDOMExceptionを使用）
 * @param message エラーメッセージ
 * @returns DOMException with name "AbortError"
 */
export function createAbortError(message = "Operation was aborted"): DOMException {
	return new DOMException(message, "AbortError");
}

/**
 * エラーがAbortErrorかどうかを判定
 * Web標準のDOMException（name="AbortError"）をチェック
 */
export function isAbortError(error: unknown): error is DOMException {
	return error instanceof DOMException && error.name === "AbortError";
}
