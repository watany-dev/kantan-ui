import { raw, renderHtml } from "../utils/html";
import { initializeSelectboxState, validateSelectbox } from "./core";
import { generateWidgetId } from "./registry";
import type { SelectboxConfig } from "./types";

/**
 * セレクトボックスウィジェット
 * 選択された値を返す（初回はデフォルト値または最初のオプション）
 */
export function selectbox(
	_label: string,
	options: string[],
	defaultValue?: string,
	config?: Partial<SelectboxConfig>,
): string {
	validateSelectbox(options, defaultValue);
	const id = generateWidgetId(config?.key);
	return initializeSelectboxState(id, options, defaultValue);
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
	const disabled = config?.disabled ? " disabled" : "";

	const optionsHtml = options
		.map(
			(opt) =>
				renderHtml`<option value="${opt}" ${raw(opt === value ? "selected" : "")}>${opt}</option>`,
		)
		.join("\n    ");

	return renderHtml`<div id="${raw(id)}-container" class="kt-selectbox-container">
  <label for="${raw(id)}" class="kt-selectbox-label">${label}</label>
  <select id="${raw(id)}" data-kt-event="change" class="kt-selectbox"${raw(disabled)}>
    ${raw(optionsHtml)}
  </select>
</div>`;
}
