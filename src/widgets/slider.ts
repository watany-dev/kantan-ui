import { escapeHtml } from "../utils/html";
import { initializeSliderState, validateSlider } from "./core";
import { generateWidgetId } from "./registry";
import type { SliderConfig } from "./types";

/**
 * スライダーウィジェット
 * 現在の値を返す（初回はデフォルト値）
 */
export function slider(
	_label: string,
	min: number,
	max: number,
	defaultValue?: number,
	config?: Partial<SliderConfig>,
): number {
	validateSlider(min, max, defaultValue);
	const id = generateWidgetId(config?.key);
	return initializeSliderState(id, min, defaultValue);
}

/**
 * スライダーのHTMLをレンダリング
 */
export function renderSlider(
	label: string,
	min: number,
	max: number,
	value: number,
	config?: Partial<SliderConfig>,
): string {
	const id = generateWidgetId(config?.key);
	const step = config?.step ?? 1;
	const disabled = config?.disabled ? " disabled" : "";

	return `<div id="${id}-container" class="kt-slider-container">
  <label for="${id}" class="kt-slider-label">${escapeHtml(label)}: ${value}</label>
  <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" data-kt-event="input" data-kt-type="number" class="kt-slider"${disabled} />
</div>`;
}
