import { raw, renderHtml } from "../utils/html";
import { initializeCheckboxState } from "./core";
import { generateWidgetId } from "./registry";
import type { CheckboxConfig } from "./types";

/**
 * チェックボックスウィジェット
 * チェック状態を返す（初回はデフォルト値またはfalse）
 */
export function checkbox(
	_label: string,
	defaultValue?: boolean,
	config?: Partial<CheckboxConfig>,
): boolean {
	const id = generateWidgetId(config?.key);
	return initializeCheckboxState(id, defaultValue);
}

/**
 * チェックボックスのHTMLをレンダリング
 */
export function renderCheckbox(
	label: string,
	value: boolean,
	config?: Partial<CheckboxConfig>,
): string {
	const id = generateWidgetId(config?.key);
	const checked = value ? " checked" : "";
	const disabled = config?.disabled ? " disabled" : "";

	return renderHtml`<div id="${raw(id)}-container" class="kt-checkbox-container">
  <label for="${raw(id)}" class="kt-checkbox-label">
    <input id="${raw(id)}" type="checkbox" data-kt-event="change" class="kt-checkbox"${raw(checked)}${raw(disabled)} />
    <span>${label}</span>
  </label>
</div>`;
}
