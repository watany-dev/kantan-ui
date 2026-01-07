/**
 * ウィジェット共通コアロジック
 * Traditional API と kt.* API の両方で使用される共通ロジックを提供
 */

import { getContext } from "../runtime/context";
import { getWidgetValue, hasWidgetValue, setWidgetValue } from "./registry";

// ============================================================================
// 汎用バリデーション関数
// ============================================================================

/**
 * 範囲バリデーション（min <= value <= max）
 */
export function validateRange(
	value: number | undefined,
	min: number,
	max: number,
	fieldName: string,
): void {
	if (min > max) {
		throw new Error(`${fieldName}: min (${min}) must be <= max (${max})`);
	}
	if (value !== undefined && (value < min || value > max)) {
		throw new Error(
			`${fieldName}: defaultValue (${value}) must be between min (${min}) and max (${max})`,
		);
	}
}

/**
 * オプション配列バリデーション（値が配列に含まれるか）
 */
export function validateInOptions(
	value: string | string[] | undefined,
	options: string[],
	fieldName: string,
): void {
	if (!options || options.length === 0) {
		throw new Error(`${fieldName}: options array must not be empty`);
	}
	if (value === undefined) return;

	const values = Array.isArray(value) ? value : [value];
	for (const v of values) {
		if (!options.includes(v)) {
			throw new Error(`${fieldName}: defaultValue "${v}" must be one of the options`);
		}
	}
}

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
	validateRange(defaultValue, min, max, "slider");
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
	validateInOptions(defaultValue, options, "selectbox");
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
	validateInOptions(defaultValue, options, "radio");
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
		validateRange(defaultValue, min, max, "number_input");
	} else if (defaultValue !== undefined) {
		if (min !== undefined && defaultValue < min) {
			throw new Error(
				`number_input: defaultValue (${defaultValue}) must be >= min (${min})`,
			);
		}
		if (max !== undefined && defaultValue > max) {
			throw new Error(
				`number_input: defaultValue (${defaultValue}) must be <= max (${max})`,
			);
		}
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
	validateInOptions(defaultValue, options, "multiselect");
}

/**
 * マルチセレクトのstate管理
 * 初期値をstateに保存し、現在値を返す
 */
export function initializeMultiselectState(widgetId: string, defaultValue?: string[]): string[] {
	return initializeWidgetState(widgetId, defaultValue ?? []);
}
