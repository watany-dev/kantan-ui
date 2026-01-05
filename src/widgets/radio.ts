import { escapeHtml } from "../utils/html";
import { initializeRadioState, validateRadio } from "./core";
import { generateWidgetId } from "./registry";
import type { RadioConfig } from "./types";

/**
 * ラジオボタンウィジェット
 * 選択された値を返す（初回はデフォルト値または最初のオプション）
 */
export function radio(
	_label: string,
	options: string[],
	defaultValue?: string,
	config?: Partial<RadioConfig>,
): string {
	validateRadio(options, defaultValue);
	const id = generateWidgetId(config?.key);
	return initializeRadioState(id, options, defaultValue);
}

/**
 * ラジオボタンのHTMLをレンダリング
 */
export function renderRadio(
	label: string,
	options: string[],
	value: string,
	config?: Partial<RadioConfig>,
): string {
	const id = generateWidgetId(config?.key);
	const layoutClass = config?.horizontal ? "kt-radio-horizontal" : "kt-radio-vertical";
	const disabled = config?.disabled ? " disabled" : "";

	const optionsHtml = options
		.map((opt) => {
			const checked = opt === value ? " checked" : "";
			return `<label class="kt-radio-option">
      <input type="radio" name="${id}" value="${escapeHtml(opt)}" data-kt-event="change"${checked}${disabled} />
      <span>${escapeHtml(opt)}</span>
    </label>`;
		})
		.join("\n    ");

	return `<div id="${id}-container" class="kt-radio-container ${layoutClass}">
  <div class="kt-radio-label">${escapeHtml(label)}</div>
  <div class="kt-radio-options">
    ${optionsHtml}
  </div>
</div>`;
}
