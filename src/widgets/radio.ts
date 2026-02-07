import { raw, renderHtml } from "../utils/html";
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
			return renderHtml`<label class="kt-radio-option">
      <input type="radio" name="${raw(id)}" value="${opt}" data-kt-event="change"${raw(checked)}${raw(disabled)} />
      <span>${opt}</span>
    </label>`;
		})
		.join("\n    ");

	return renderHtml`<div id="${raw(id)}-container" class="kt-radio-container ${raw(layoutClass)}">
  <div class="kt-radio-label">${label}</div>
  <div class="kt-radio-options">
    ${raw(optionsHtml)}
  </div>
</div>`;
}
