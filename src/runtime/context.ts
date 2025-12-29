import type { SessionId } from "../session/types";

export interface RerunContext {
	// セッション情報
	sessionId?: SessionId;
	// 現在のイベント情報
	event?: {
		widgetId: string;
		value: unknown;
	};
}

// スクリプト実行中のコンテキスト
let currentContext: RerunContext | null = null;

export function setContext(ctx: RerunContext): void {
	currentContext = ctx;
}

export function getContext(): RerunContext | null {
	return currentContext;
}

export function clearContext(): void {
	currentContext = null;
}
