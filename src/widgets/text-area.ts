import { raw, renderHtml } from "../utils/html";
import { initializeTextInputState } from "./core";
import { generateWidgetId } from "./registry";
import type { TextAreaConfig } from "./types";

/**
 * テキストエリアウィジェット
 * 入力されたテキストを返す（初回はデフォルト値または空文字列）
 */
export function text_area(
	_label: string,
	defaultValue?: string,
	config?: Partial<TextAreaConfig>,
): string {
	const id = generateWidgetId(config?.key);
	return initializeTextInputState(id, defaultValue);
}

/**
 * テキストエリアのHTMLをレンダリング
 */
export function renderTextArea(
	label: string,
	value: string,
	config?: Partial<TextAreaConfig>,
): string {
	const id = generateWidgetId(config?.key);
	const height = config?.height ?? 100;
	const placeholder = config?.placeholder ?? "";
	const disabled = config?.disabled ? " disabled" : "";
	const maxLength = config?.maxChars ? ` maxlength="${config.maxChars}"` : "";

	return renderHtml`<div id="${raw(id)}-container" class="kt-text-area-container">
  <label for="${raw(id)}" class="kt-text-area-label">${label}</label>
  <textarea id="${raw(id)}" style="height: ${height}px" placeholder="${placeholder}" data-kt-event="change" class="kt-text-area"${raw(maxLength)}${raw(disabled)}>${value}</textarea>
</div>`;
}
