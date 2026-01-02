import { getSessionManager } from "../session/manager";
import { getCurrentSessionId } from "../session/state";
import { isBoolean, isNumber, isString } from "../utils/type-guards";

// Widget ID 生成カウンター（rerun 毎にリセット）
let widgetCounter = 0;

export function resetWidgetCounter(): void {
	widgetCounter = 0;
}

export function generateWidgetId(key?: string): string {
	if (key) return key;
	return `widget_${widgetCounter++}`;
}

/**
 * 型ガードを選択する
 * defaultValueの型に基づいて適切な型ガードを返す
 */
function getTypeValidator<T>(defaultValue: T): ((v: unknown) => boolean) | null {
	switch (typeof defaultValue) {
		case "string":
			return isString;
		case "number":
			return isNumber;
		case "boolean":
			return isBoolean;
		default:
			return null;
	}
}

// Widget の値を取得
export function getWidgetValue<T>(widgetId: string, defaultValue: T): T {
	const sessionId = getCurrentSessionId();
	if (!sessionId) return defaultValue;

	const state = getSessionManager().getState(sessionId);
	if (!state || !(widgetId in state)) {
		return defaultValue;
	}

	const value = state[widgetId];
	const validator = getTypeValidator(defaultValue);

	// 型ガードで検証（プリミティブ型のみ）
	if (validator && !validator(value)) {
		console.warn(
			`Type mismatch for widget "${widgetId}": expected ${typeof defaultValue}, got ${typeof value}. Using default value.`,
		);
		return defaultValue;
	}

	// 非プリミティブ型の場合は開発時に警告
	if (!validator && typeof defaultValue === "object" && defaultValue !== null) {
		console.debug(`[dev] Widget "${widgetId}" uses non-primitive type. Type validation skipped.`);
	}

	return value as T;
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
