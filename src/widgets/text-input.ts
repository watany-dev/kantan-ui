import { escapeHtml } from "../utils/html";
import { initializeTextInputState } from "./core";
import { generateWidgetId } from "./registry";
import type { TextInputConfig } from "./types";

/**
 * テキスト入力ウィジェット
 * 現在の入力値を返す（初回はデフォルト値）
 */
export function text_input(
	_label: string,
	defaultValue?: string,
	config?: Partial<TextInputConfig>,
): string {
	const id = generateWidgetId(config?.key);
	return initializeTextInputState(id, defaultValue);
}

/**
 * テキスト入力のHTMLをレンダリング
 */
export function renderTextInput(
	label: string,
	value: string,
	config?: Partial<TextInputConfig>,
): string {
	const id = generateWidgetId(config?.key);
	const placeholder = config?.placeholder ?? "";

	return `<div id="${id}-container" class="kt-text-input-container">
  <label for="${id}" class="kt-text-input-label">${escapeHtml(label)}</label>
  <input type="text" id="${id}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" data-kt-event="input" class="kt-text-input" />
</div>`;
}
