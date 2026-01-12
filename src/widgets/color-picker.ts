import { escapeHtml } from "../utils/html";
import { initializeColorPickerState } from "./core";
import { generateWidgetId } from "./registry";
import type { ColorPickerConfig } from "./types";

/**
 * カラーピッカーウィジェット
 * 現在の色を返す（初回はデフォルト値）
 */
export function color_picker(
	_label: string,
	defaultValue?: string,
	config?: Partial<ColorPickerConfig>,
): string {
	const id = generateWidgetId(config?.key);
	return initializeColorPickerState(id, defaultValue);
}

/**
 * カラーピッカーのHTMLをレンダリング
 */
export function renderColorPicker(
	label: string,
	value: string,
	config?: Partial<ColorPickerConfig>,
): string {
	const id = generateWidgetId(config?.key);
	const disabled = config?.disabled ? " disabled" : "";

	return `<div id="${id}-container" class="kt-color-picker-container">
  <label for="${id}" class="kt-color-picker-label">${escapeHtml(label)}</label>
  <input type="color" id="${id}" value="${escapeHtml(value)}" data-kt-event="change" class="kt-color-picker"${disabled} />
</div>`;
}
