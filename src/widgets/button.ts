import { getContext } from "../runtime/context";
import { generateWidgetId } from "./registry";
import type { ButtonConfig } from "./types";

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * ボタンウィジェット
 * 押された rerun でのみ true を返し、それ以外は false を返す
 */
export function button(label: string, config?: Partial<ButtonConfig>): boolean {
	const id = generateWidgetId(config?.key);
	const context = getContext();

	// 現在の rerun がこのボタンの押下によるものかチェック
	const pressed = context?.event?.widgetId === id;

	return pressed;
}

/**
 * ボタンのHTMLをレンダリング
 */
export function renderButton(label: string, config?: Partial<ButtonConfig>): string {
	const id = generateWidgetId(config?.key);

	return `<button id="${id}" data-kt-event="click" class="kt-button">${escapeHtml(label)}</button>`;
}
