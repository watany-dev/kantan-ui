/**
 * ウィジェット共通コアロジック
 * Traditional API と kt.* API の両方で使用される共通ロジックを提供
 */

import { getContext } from "../runtime/context";
import { getWidgetValue, hasWidgetValue, setWidgetValue } from "./registry";

/**
 * ウィジェット状態を初期化する共通ヘルパー
 * 状態が存在しない場合のみ初期値を設定し、現在値を返す
 */
function initializeWidgetState<T>(widgetId: string, initialValue: T): T {
	if (!hasWidgetValue(widgetId)) {
		setWidgetValue(widgetId, initialValue);
	}
	return getWidgetValue<T>(widgetId, initialValue);
}

/**
 * ボタンが押されたかどうかを判定
 */
export function isButtonPressed(widgetId: string): boolean {
	const context = getContext();
	return context?.event?.widgetId === widgetId;
}

/**
 * スライダーのバリデーション
 */
export function validateSlider(min: number, max: number, defaultValue?: number): void {
	if (min > max) {
		throw new Error(`slider: min (${min}) must be <= max (${max})`);
	}
	if (defaultValue !== undefined && (defaultValue < min || defaultValue > max)) {
		throw new Error(
			`slider: defaultValue (${defaultValue}) must be between min (${min}) and max (${max})`,
		);
	}
}

/**
 * スライダーのstate管理
 * 初期値をstateに保存し、現在値を返す
 */
export function initializeSliderState(
	widgetId: string,
	min: number,
	defaultValue?: number,
): number {
	return initializeWidgetState(widgetId, defaultValue ?? min);
}

/**
 * テキスト入力のstate管理
 * 初期値をstateに保存し、現在値を返す
 */
export function initializeTextInputState(widgetId: string, defaultValue?: string): string {
	return initializeWidgetState(widgetId, defaultValue ?? "");
}

/**
 * セレクトボックスのバリデーション
 */
export function validateSelectbox(options: string[], defaultValue?: string): void {
	if (!options || options.length === 0) {
		throw new Error("selectbox: options array must not be empty");
	}
	if (defaultValue !== undefined && !options.includes(defaultValue)) {
		throw new Error(`selectbox: defaultValue "${defaultValue}" must be one of the options`);
	}
}

/**
 * セレクトボックスのstate管理
 * 初期値をstateに保存し、現在値を返す
 */
export function initializeSelectboxState(
	widgetId: string,
	options: string[],
	defaultValue?: string,
): string {
	return initializeWidgetState(widgetId, defaultValue ?? options[0] ?? "");
}

/**
 * チェックボックスのstate管理
 * 初期値をstateに保存し、現在値を返す
 */
export function initializeCheckboxState(widgetId: string, defaultValue?: boolean): boolean {
	return initializeWidgetState(widgetId, defaultValue ?? false);
}
