import { raw, renderHtml } from "../utils/html";
import { isButtonPressed } from "./core";
import { generateWidgetId } from "./registry";
import type { ButtonConfig } from "./types";

/**
 * ボタンウィジェット
 * 押された rerun でのみ true を返し、それ以外は false を返す
 */
export function button(_label: string, config?: Partial<ButtonConfig>): boolean {
	const id = generateWidgetId(config?.key);
	return isButtonPressed(id);
}

/**
 * ボタンのHTMLをレンダリング
 */
export function renderButton(label: string, config?: Partial<ButtonConfig>): string {
	const id = generateWidgetId(config?.key);
	const disabled = config?.disabled ? " disabled" : "";

	return renderHtml`<button id="${raw(id)}" data-kt-event="click" class="kt-button"${raw(disabled)}>${label}</button>`;
}
