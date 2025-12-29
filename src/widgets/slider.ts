import type { SliderConfig } from "./types";
import {
	generateWidgetId,
	getWidgetValue,
	hasWidgetValue,
	setWidgetValue,
} from "./registry";

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * スライダーウィジェット
 * 現在の値を返す（初回はデフォルト値）
 */
export function slider(
	label: string,
	min: number,
	max: number,
	defaultValue?: number,
	config?: Partial<SliderConfig>,
): number {
	const id = generateWidgetId(config?.key);
	const initial = defaultValue ?? min;

	// 初回のみデフォルト値を state に保存
	if (!hasWidgetValue(id)) {
		setWidgetValue(id, initial);
	}

	// 現在の値を取得
	return getWidgetValue<number>(id, initial);
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

	return `<div class="kt-slider-container">
  <label for="${id}" class="kt-slider-label">${escapeHtml(label)}: ${value}</label>
  <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" oninput="sendEvent('${id}', Number(this.value))" class="kt-slider" />
</div>`;
}
