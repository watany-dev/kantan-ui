/**
 * session_state への書き込みが rerun コンテキスト外で行われた時にスローされるエラー
 */
export class SessionStateError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SessionStateError";
	}
}
