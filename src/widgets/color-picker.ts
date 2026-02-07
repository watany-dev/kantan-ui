import { raw, renderHtml } from "../utils/html";
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

	return renderHtml`<div id="${raw(id)}-container" class="kt-color-picker-container">
  <label for="${raw(id)}" class="kt-color-picker-label">${label}</label>
  <input type="color" id="${raw(id)}" value="${value}" data-kt-event="change" class="kt-color-picker"${raw(disabled)} />
</div>`;
}
