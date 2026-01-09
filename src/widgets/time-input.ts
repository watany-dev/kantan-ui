import { escapeHtml } from "../utils/html";
import { initializeTimeInputState } from "./core";
import { generateWidgetId } from "./registry";
import type { TimeInputConfig } from "./types";

/**
 * 時刻入力ウィジェット
 * 現在の入力値を返す（初回はデフォルト値）
 * 値は "HH:MM" 形式の文字列
 */
export function time_input(
	_label: string,
	defaultValue?: string,
	config?: Partial<TimeInputConfig>,
): string {
	const id = generateWidgetId(config?.key);
	return initializeTimeInputState(id, defaultValue);
}

/**
 * 時刻入力のHTMLをレンダリング
 */
export function renderTimeInput(
	label: string,
	value: string,
	config?: Partial<TimeInputConfig>,
): string {
	const id = generateWidgetId(config?.key);
	const disabled = config?.disabled ? " disabled" : "";
	const stepAttr = config?.step ? ` step="${config.step}"` : "";

	return `<div id="${id}-container" class="kt-time-input-container">
  <label for="${id}" class="kt-time-input-label">${escapeHtml(label)}</label>
  <input type="time" id="${id}" value="${escapeHtml(value)}" data-kt-event="change" class="kt-time-input"${stepAttr}${disabled} />
</div>`;
}
