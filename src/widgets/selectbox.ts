import { escapeHtml } from "../utils/html";
import { generateWidgetId, getWidgetValue, hasWidgetValue, setWidgetValue } from "./registry";
import type { SelectboxConfig } from "./types";

/**
 * セレクトボックスウィジェット
 * 選択された値を返す（初回はデフォルト値または最初のオプション）
 */
export function selectbox(
	label: string,
	options: string[],
	defaultValue?: string,
	config?: Partial<SelectboxConfig>,
): string {
	const id = generateWidgetId(config?.key);
	const initial = defaultValue ?? options[0] ?? "";

	// 初回のみデフォルト値を state に保存
	if (!hasWidgetValue(id)) {
		setWidgetValue(id, initial);
	}

	// 現在の値を取得
	return getWidgetValue<string>(id, initial);
}

/**
 * セレクトボックスのHTMLをレンダリング
 */
export function renderSelectbox(
	label: string,
	options: string[],
	value: string,
	config?: Partial<SelectboxConfig>,
): string {
	const id = generateWidgetId(config?.key);

	const optionsHtml = options
		.map(
			(opt) =>
				`<option value="${escapeHtml(opt)}" ${opt === value ? "selected" : ""}>${escapeHtml(opt)}</option>`,
		)
		.join("\n    ");

	return `<div class="kt-selectbox-container">
  <label for="${id}" class="kt-selectbox-label">${escapeHtml(label)}</label>
  <select id="${id}" onchange="sendEvent('${id}', this.value)" class="kt-selectbox">
    ${optionsHtml}
  </select>
</div>`;
}
