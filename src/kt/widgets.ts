import { escapeHtml } from "../utils/html";
import {
	initializeSelectboxState,
	initializeSliderState,
	initializeTextInputState,
	isButtonPressed,
	validateSelectbox,
	validateSlider,
} from "../widgets/core";
import { generateWidgetId } from "../widgets/registry";
import type {
	ButtonConfig,
	SelectboxConfig,
	SliderConfig,
	TextInputConfig,
} from "../widgets/types";
import { requireRenderContext } from "./context";

/**
 * ボタンウィジェット（宣言的API）
 * HTMLを自動出力し、押された rerun でのみ true を返す
 */
export function button(label: string, config?: Partial<ButtonConfig>): boolean {
	const ctx = requireRenderContext();
	const id = generateWidgetId(config?.key);
	const pressed = isButtonPressed(id);

	// HTMLをバッファに追加
	ctx.append(
		`<button id="${id}" data-kt-event="click" class="kt-button">${escapeHtml(label)}</button>`,
	);

	return pressed;
}

/**
 * スライダーウィジェット（宣言的API）
 * HTMLを自動出力し、現在の値を返す
 */
export function slider(
	label: string,
	min: number,
	max: number,
	defaultValue?: number,
	config?: Partial<SliderConfig>,
): number {
	validateSlider(min, max, defaultValue);

	const ctx = requireRenderContext();
	const id = generateWidgetId(config?.key);
	const step = config?.step ?? 1;
	const value = initializeSliderState(id, min, defaultValue);

	// HTMLをバッファに追加
	ctx.append(`<div class="kt-slider-container">
  <label for="${id}" class="kt-slider-label">${escapeHtml(label)}: ${value}</label>
  <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" data-kt-event="input" data-kt-type="number" class="kt-slider" />
</div>`);

	return value;
}

/**
 * テキスト入力ウィジェット（宣言的API）
 * HTMLを自動出力し、現在の値を返す
 */
export function text_input(
	label: string,
	defaultValue?: string,
	config?: Partial<TextInputConfig>,
): string {
	const ctx = requireRenderContext();
	const id = generateWidgetId(config?.key);
	const placeholder = config?.placeholder ?? "";
	const value = initializeTextInputState(id, defaultValue);

	// HTMLをバッファに追加
	ctx.append(`<div class="kt-text-input-container">
  <label for="${id}" class="kt-text-input-label">${escapeHtml(label)}</label>
  <input type="text" id="${id}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" data-kt-event="input" class="kt-text-input" />
</div>`);

	return value;
}

/**
 * セレクトボックスウィジェット（宣言的API）
 * HTMLを自動出力し、選択された値を返す
 */
export function selectbox(
	label: string,
	options: string[],
	defaultValue?: string,
	config?: Partial<SelectboxConfig>,
): string {
	validateSelectbox(options, defaultValue);

	const ctx = requireRenderContext();
	const id = generateWidgetId(config?.key);
	const value = initializeSelectboxState(id, options, defaultValue);

	// オプションHTML生成
	const optionsHtml = options
		.map(
			(opt) =>
				`<option value="${escapeHtml(opt)}" ${opt === value ? "selected" : ""}>${escapeHtml(opt)}</option>`,
		)
		.join("\n    ");

	// HTMLをバッファに追加
	ctx.append(`<div class="kt-selectbox-container">
  <label for="${id}" class="kt-selectbox-label">${escapeHtml(label)}</label>
  <select id="${id}" data-kt-event="change" class="kt-selectbox">
    ${optionsHtml}
  </select>
</div>`);

	return value;
}
