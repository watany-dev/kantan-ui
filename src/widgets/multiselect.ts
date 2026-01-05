import { escapeHtml } from "../utils/html";
import { initializeMultiselectState, validateMultiselect } from "./core";
import { generateWidgetId } from "./registry";
import type { MultiselectConfig } from "./types";

/**
 * マルチセレクトウィジェット
 * 選択された値の配列を返す（初回はデフォルト値または空配列）
 */
export function multiselect(
	_label: string,
	options: string[],
	defaultValue?: string[],
	config?: Partial<MultiselectConfig>,
): string[] {
	validateMultiselect(options, defaultValue);
	const id = generateWidgetId(config?.key);
	return initializeMultiselectState(id, defaultValue);
}

/**
 * マルチセレクトのHTMLをレンダリング
 */
export function renderMultiselect(
	label: string,
	options: string[],
	value: string[],
	config?: Partial<MultiselectConfig>,
): string {
	const id = generateWidgetId(config?.key);
	const disabled = config?.disabled ? " disabled" : "";
	const maxSelections = config?.maxSelections;

	const optionsHtml = options
		.map((opt) => {
			const checked = value.includes(opt) ? " checked" : "";
			const optionDisabled =
				maxSelections !== undefined && value.length >= maxSelections && !value.includes(opt)
					? " disabled"
					: "";
			return `<label class="kt-multiselect-option">
      <input type="checkbox" name="${id}" value="${escapeHtml(opt)}" data-kt-event="change"${checked}${disabled}${optionDisabled} />
      <span>${escapeHtml(opt)}</span>
    </label>`;
		})
		.join("\n    ");

	return `<div id="${id}-container" class="kt-multiselect-container">
  <label class="kt-multiselect-label">${escapeHtml(label)}</label>
  <div id="${id}" class="kt-multiselect-options">
    ${optionsHtml}
  </div>
</div>`;
}
