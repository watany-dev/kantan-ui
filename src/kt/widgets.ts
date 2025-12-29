import { getContext } from "../runtime/context";
import {
	generateWidgetId,
	getWidgetValue,
	hasWidgetValue,
	setWidgetValue,
} from "../widgets/registry";
import type {
	ButtonConfig,
	SliderConfig,
	TextInputConfig,
	SelectboxConfig,
} from "../widgets/types";
import { requireRenderContext } from "./context";

/**
 * HTMLをエスケープ
 */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * ボタンウィジェット（宣言的API）
 * HTMLを自動出力し、押された rerun でのみ true を返す
 */
export function button(label: string, config?: Partial<ButtonConfig>): boolean {
	const ctx = requireRenderContext();
	const id = generateWidgetId(config?.key);
	const context = getContext();

	// 現在の rerun がこのボタンの押下によるものかチェック
	const pressed = context?.event?.widgetId === id;

	// HTMLをバッファに追加
	ctx.append(
		`<button id="${id}" onclick="sendEvent('${id}', 'clicked')" class="kt-button">${escapeHtml(label)}</button>`,
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
	const ctx = requireRenderContext();
	const id = generateWidgetId(config?.key);
	const step = config?.step ?? 1;
	const initial = defaultValue ?? min;

	// 初回のみデフォルト値を state に保存
	if (!hasWidgetValue(id)) {
		setWidgetValue(id, initial);
	}

	// 現在の値を取得
	const value = getWidgetValue<number>(id, initial);

	// HTMLをバッファに追加
	ctx.append(`<div class="kt-slider-container">
  <label for="${id}" class="kt-slider-label">${escapeHtml(label)}: ${value}</label>
  <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" oninput="sendEvent('${id}', Number(this.value))" class="kt-slider" />
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
	const initial = defaultValue ?? "";

	// 初回のみデフォルト値を state に保存
	if (!hasWidgetValue(id)) {
		setWidgetValue(id, initial);
	}

	// 現在の値を取得
	const value = getWidgetValue<string>(id, initial);

	// HTMLをバッファに追加
	ctx.append(`<div class="kt-text-input-container">
  <label for="${id}" class="kt-text-input-label">${escapeHtml(label)}</label>
  <input type="text" id="${id}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" oninput="sendEvent('${id}', this.value)" class="kt-text-input" />
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
	const ctx = requireRenderContext();
	const id = generateWidgetId(config?.key);
	const initial = defaultValue ?? options[0] ?? "";

	// 初回のみデフォルト値を state に保存
	if (!hasWidgetValue(id)) {
		setWidgetValue(id, initial);
	}

	// 現在の値を取得
	const value = getWidgetValue<string>(id, initial);

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
  <select id="${id}" onchange="sendEvent('${id}', this.value)" class="kt-selectbox">
    ${optionsHtml}
  </select>
</div>`);

	return value;
}
