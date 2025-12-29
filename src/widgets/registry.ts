import { getSessionManager } from "../session/manager";
import { getCurrentSessionId } from "../session/state";

// Widget ID 生成カウンター（rerun 毎にリセット）
let widgetCounter = 0;

export function resetWidgetCounter(): void {
	widgetCounter = 0;
}

export function generateWidgetId(key?: string): string {
	if (key) return key;
	return `widget_${widgetCounter++}`;
}

// Widget の値を取得
export function getWidgetValue<T>(widgetId: string, defaultValue: T): T {
	const sessionId = getCurrentSessionId();
	if (!sessionId) return defaultValue;

	const state = getSessionManager().getState(sessionId);
	if (!state || !(widgetId in state)) {
		return defaultValue;
	}
	return state[widgetId] as T;
}

// Widget の値を設定
export function setWidgetValue<T>(widgetId: string, value: T): void {
	const sessionId = getCurrentSessionId();
	if (!sessionId) return;

	getSessionManager().setState(sessionId, widgetId, value);
}

// Widget の値が存在するかチェック
export function hasWidgetValue(widgetId: string): boolean {
	const sessionId = getCurrentSessionId();
	if (!sessionId) return false;

	const state = getSessionManager().getState(sessionId);
	return state ? widgetId in state : false;
}
