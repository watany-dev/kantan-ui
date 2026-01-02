/**
 * rerun処理が中断された時にスローされるエラー
 */
export class AbortError extends Error {
	constructor(message = "Operation was aborted") {
		super(message);
		this.name = "AbortError";
	}
}

/**
 * エラーがAbortErrorかどうかを判定
 */
export function isAbortError(error: unknown): error is AbortError {
	return error instanceof AbortError;
}
