import { toDateString } from "../utils/date";
import { escapeHtml } from "../utils/html";
import { initializeDateInputState } from "./core";
import { generateWidgetId } from "./registry";
import type { DateInputConfig } from "./types";

/**
 * 日付入力ウィジェット
 * 現在の入力値を返す（初回はデフォルト値）
 * 値は "YYYY-MM-DD" 形式の文字列
 *
 * @param _label - ラベル
 * @param defaultValue - デフォルト値（string または Date）
 * @param config - 設定
 * @returns "YYYY-MM-DD" 形式の文字列
 */
export function date_input(
	_label: string,
	defaultValue?: string | Date,
	config?: Partial<DateInputConfig>,
): string {
	const id = generateWidgetId(config?.key);
	const defaultStr = toDateString(defaultValue);
	return initializeDateInputState(id, defaultStr);
}

/**
 * 日付入力のHTMLをレンダリング
 */
export function renderDateInput(
	label: string,
	value: string,
	config?: Partial<DateInputConfig>,
): string {
	const id = generateWidgetId(config?.key);
	const disabled = config?.disabled ? " disabled" : "";
	const minStr = toDateString(config?.min);
	const maxStr = toDateString(config?.max);
	const minAttr = minStr ? ` min="${escapeHtml(minStr)}"` : "";
	const maxAttr = maxStr ? ` max="${escapeHtml(maxStr)}"` : "";

	return `<div id="${id}-container" class="kt-date-input-container">
  <label for="${id}" class="kt-date-input-label">${escapeHtml(label)}</label>
  <input type="date" id="${id}" value="${escapeHtml(value)}" data-kt-event="change" class="kt-date-input"${minAttr}${maxAttr}${disabled} />
</div>`;
}
