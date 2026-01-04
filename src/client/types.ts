/**
 * クライアントに注入する設定値
 */
export interface ClientRuntimeConfig {
	/** セッションスコープ ('tab' | 'browser') */
	scope: "tab" | "browser";
	/** セッションキー名 */
	sessionKey: string;
	/** 最大再接続試行回数 */
	maxReconnectAttempts: number;
	/** 初回再接続遅延（ミリ秒） */
	baseReconnectDelay: number;
	/** 最大再接続遅延（ミリ秒） */
	maxReconnectDelay: number;
}
