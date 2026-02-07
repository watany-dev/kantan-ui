import { raw, renderHtml } from "../utils/html";
import { initializeNumberInputState, validateNumberInput } from "./core";
import { generateWidgetId } from "./registry";
import type { NumberInputConfig } from "./types";

/**
 * 数値入力ウィジェット
 * 入力された数値を返す（初回はデフォルト値、min値、または0）
 */
export function number_input(
	_label: string,
	min?: number,
	max?: number,
	defaultValue?: number,
	config?: Partial<NumberInputConfig>,
): number {
	validateNumberInput(min, max, defaultValue);
	const id = generateWidgetId(config?.key);
	return initializeNumberInputState(id, min, defaultValue);
}

/**
 * 数値入力のHTMLをレンダリング
 */
export function renderNumberInput(
	label: string,
	min: number | undefined,
	max: number | undefined,
	value: number,
	config?: Partial<NumberInputConfig>,
): string {
	const id = generateWidgetId(config?.key);
	const step = config?.step ?? 1;
	const disabled = config?.disabled ? " disabled" : "";
	const minAttr = min !== undefined ? ` min="${min}"` : "";
	const maxAttr = max !== undefined ? ` max="${max}"` : "";

	return renderHtml`<div id="${raw(id)}-container" class="kt-number-input-container">
  <label for="${raw(id)}" class="kt-number-input-label">${label}</label>
  <input id="${raw(id)}" type="number" value="${value}" step="${step}" data-kt-event="change" class="kt-number-input"${raw(minAttr)}${raw(maxAttr)}${raw(disabled)} />
</div>`;
}
