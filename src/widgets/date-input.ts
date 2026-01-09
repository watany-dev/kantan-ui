import { escapeHtml } from "../utils/html";
import { initializeDateInputState } from "./core";
import { generateWidgetId } from "./registry";
import type { DateInputConfig } from "./types";

/**
 * 日付入力ウィジェット
 * 現在の入力値を返す（初回はデフォルト値）
 * 値は "YYYY-MM-DD" 形式の文字列
 */
export function date_input(
	_label: string,
	defaultValue?: string,
	config?: Partial<DateInputConfig>,
): string {
	const id = generateWidgetId(config?.key);
	return initializeDateInputState(id, defaultValue);
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
	const minAttr = config?.min ? ` min="${escapeHtml(config.min)}"` : "";
	const maxAttr = config?.max ? ` max="${escapeHtml(config.max)}"` : "";

	return `<div id="${id}-container" class="kt-date-input-container">
  <label for="${id}" class="kt-date-input-label">${escapeHtml(label)}</label>
  <input type="date" id="${id}" value="${escapeHtml(value)}" data-kt-event="change" class="kt-date-input"${minAttr}${maxAttr}${disabled} />
</div>`;
}
