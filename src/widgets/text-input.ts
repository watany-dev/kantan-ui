import { generateWidgetId, getWidgetValue, hasWidgetValue, setWidgetValue } from "./registry";
import type { TextInputConfig } from "./types";

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * テキスト入力ウィジェット
 * 現在の入力値を返す（初回はデフォルト値）
 */
export function text_input(
	label: string,
	defaultValue?: string,
	config?: Partial<TextInputConfig>,
): string {
	const id = generateWidgetId(config?.key);
	const initial = defaultValue ?? "";

	// 初回のみデフォルト値を state に保存
	if (!hasWidgetValue(id)) {
		setWidgetValue(id, initial);
	}

	// 現在の値を取得
	return getWidgetValue<string>(id, initial);
}

/**
 * テキスト入力のHTMLをレンダリング
 */
export function renderTextInput(
	label: string,
	value: string,
	config?: Partial<TextInputConfig>,
): string {
	const id = generateWidgetId(config?.key);
	const placeholder = config?.placeholder ?? "";

	return `<div class="kt-text-input-container">
  <label for="${id}" class="kt-text-input-label">${escapeHtml(label)}</label>
  <input type="text" id="${id}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" oninput="sendEvent('${id}', this.value)" class="kt-text-input" />
</div>`;
}
