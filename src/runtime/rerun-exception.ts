/**
 * kt.rerun() が呼ばれた時にスローされる例外
 *
 * この例外はランタイムでキャッチされ、スクリプトの再実行をトリガーします。
 */
export class RerunException extends Error {
	constructor(message = "Rerun requested") {
		super(message);
		this.name = "RerunException";
	}
}

/**
 * エラーがRerunExceptionかどうかを判定
 */
export function isRerunException(error: unknown): error is RerunException {
	return error instanceof RerunException;
}
