import { escapeHtml } from "../utils/html";
import { generateWidgetId, getWidgetValue, hasWidgetValue, setWidgetValue } from "./registry";
import type { SliderConfig } from "./types";

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
	// バリデーション
	if (min > max) {
		throw new Error(`slider: min (${min}) must be <= max (${max})`);
	}
	if (defaultValue !== undefined && (defaultValue < min || defaultValue > max)) {
		throw new Error(
			`slider: defaultValue (${defaultValue}) must be between min (${min}) and max (${max})`,
		);
	}

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
