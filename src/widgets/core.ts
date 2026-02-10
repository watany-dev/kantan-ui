/**
 * ウィジェット共通コアロジック
 * Traditional API と kt.* API の両方で使用される共通ロジックを提供
 */

import { getContext } from "../runtime/context";
import {
	validateMinMax,
	validateOptionsNotEmpty,
	validateValueInOptions,
	validateValueInRange,
} from "../utils/validation";
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
	validateMinMax(min, max, "slider");
	if (defaultValue !== undefined) {
		validateValueInRange(defaultValue, min, max, "slider");
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
	validateOptionsNotEmpty(options, "selectbox");
	if (defaultValue !== undefined) {
		validateValueInOptions(defaultValue, options, "selectbox");
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

/**
 * ラジオボタンのバリデーション
 */
export function validateRadio(options: string[], defaultValue?: string): void {
	validateOptionsNotEmpty(options, "radio");
	if (defaultValue !== undefined) {
		validateValueInOptions(defaultValue, options, "radio");
	}
}

/**
 * ラジオボタンのstate管理
 * 初期値をstateに保存し、現在値を返す
 */
export function initializeRadioState(
	widgetId: string,
	options: string[],
	defaultValue?: string,
): string {
	return initializeWidgetState(widgetId, defaultValue ?? options[0] ?? "");
}

/**
 * 数値入力のバリデーション
 */
export function validateNumberInput(min?: number, max?: number, defaultValue?: number): void {
	if (min !== undefined && max !== undefined) {
		validateMinMax(min, max, "number_input");
	}
	if (defaultValue !== undefined) {
		validateValueInRange(defaultValue, min, max, "number_input");
	}
}

/**
 * 数値入力のstate管理
 * 初期値をstateに保存し、現在値を返す
 */
export function initializeNumberInputState(
	widgetId: string,
	min?: number,
	defaultValue?: number,
): number {
	return initializeWidgetState(widgetId, defaultValue ?? min ?? 0);
}

/**
 * マルチセレクトのバリデーション
 */
export function validateMultiselect(options: string[], defaultValue?: string[]): void {
	validateOptionsNotEmpty(options, "multiselect");
	if (defaultValue !== undefined) {
		for (const value of defaultValue) {
			validateValueInOptions(value, options, "multiselect");
		}
	}
}

/**
 * マルチセレクトのstate管理
 * 初期値をstateに保存し、現在値を返す
 */
export function initializeMultiselectState(widgetId: string, defaultValue?: string[]): string[] {
	return initializeWidgetState(widgetId, defaultValue ?? []);
}

/**
 * 日付入力のstate管理
 * 初期値をstateに保存し、現在値を返す
 * デフォルト値が指定されない場合は空文字列を使用
 */
export function initializeDateInputState(widgetId: string, defaultValue?: string): string {
	return initializeWidgetState(widgetId, defaultValue ?? "");
}

/**
 * 時刻入力のstate管理
 * 初期値をstateに保存し、現在値を返す
 * デフォルト値が指定されない場合は空文字列を使用
 */
export function initializeTimeInputState(widgetId: string, defaultValue?: string): string {
	return initializeWidgetState(widgetId, defaultValue ?? "");
}

/**
 * 日時入力のstate管理
 * 初期値をstateに保存し、現在値を返す
 * デフォルト値が指定されない場合は空文字列を使用
 */
export function initializeDatetimeInputState(widgetId: string, defaultValue?: string): string {
	return initializeWidgetState(widgetId, defaultValue ?? "");
}

/**
 * カラーピッカーのstate管理
 * 初期値をstateに保存し、現在値を返す
 * デフォルト値が指定されない場合は "#000000" を使用
 */
export function initializeColorPickerState(widgetId: string, defaultValue?: string): string {
	return initializeWidgetState(widgetId, defaultValue ?? "#000000");
}
