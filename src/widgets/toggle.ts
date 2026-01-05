import { escapeHtml } from "../utils/html";
import { initializeCheckboxState } from "./core";
import { generateWidgetId } from "./registry";
import type { ToggleConfig } from "./types";

/**
 * トグルウィジェット
 * トグル状態を返す（初回はデフォルト値またはfalse）
 */
export function toggle(
	_label: string,
	defaultValue?: boolean,
	config?: Partial<ToggleConfig>,
): boolean {
	const id = generateWidgetId(config?.key);
	return initializeCheckboxState(id, defaultValue);
}

/**
 * トグルのHTMLをレンダリング
 */
export function renderToggle(
	label: string,
	value: boolean,
	config?: Partial<ToggleConfig>,
): string {
	const id = generateWidgetId(config?.key);
	const checked = value ? " checked" : "";
	const disabled = config?.disabled ? " disabled" : "";

	return `<div id="${id}-container" class="kt-toggle-container">
  <label for="${id}" class="kt-toggle-label">
    <span>${escapeHtml(label)}</span>
    <div class="kt-toggle-switch">
      <input id="${id}" type="checkbox" data-kt-event="change" class="kt-toggle-input"${checked}${disabled} />
      <span class="kt-toggle-slider"></span>
    </div>
  </label>
</div>`;
}
