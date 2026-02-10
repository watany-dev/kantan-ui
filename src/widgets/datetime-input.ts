import { toDatetimeString } from "../utils/date";
import { raw, renderHtml } from "../utils/html";
import { initializeDatetimeInputState } from "./core";
import { generateWidgetId } from "./registry";
import type { DatetimeInputConfig } from "./types";

/**
 * 数値属性を検証し、無効な場合はundefinedを返す
 */
function validateNumericAttr(value: unknown): number | undefined {
	if (value === undefined || value === null) return undefined;
	const num = Number(value);
	return Number.isFinite(num) ? num : undefined;
}

/**
 * 日時入力ウィジェット
 * 現在の入力値を返す（初回はデフォルト値）
 * 値は "YYYY-MM-DDTHH:MM" または "YYYY-MM-DDTHH:MM:SS" 形式の文字列
 */
export function datetime_input(
	_label: string,
	defaultValue?: string | Date,
	config?: Partial<DatetimeInputConfig>,
): string {
	const id = generateWidgetId(config?.key);
	const includeSeconds = config?.step !== undefined && config.step < 60;
	const defaultStr = toDatetimeString(defaultValue, includeSeconds);
	return initializeDatetimeInputState(id, defaultStr);
}

/**
 * 日時入力のHTMLをレンダリング
 */
export function renderDatetimeInput(
	label: string,
	value: string,
	config?: Partial<DatetimeInputConfig>,
): string {
	const id = generateWidgetId(config?.key);
	const disabled = config?.disabled ? " disabled" : "";

	const includeSeconds = config?.step !== undefined && config.step < 60;
	const minStr = toDatetimeString(config?.min, includeSeconds);
	const maxStr = toDatetimeString(config?.max, includeSeconds);
	const minAttr = minStr ? ` min="${minStr}"` : "";
	const maxAttr = maxStr ? ` max="${maxStr}"` : "";

	const validStep = validateNumericAttr(config?.step);
	const stepAttr = validStep !== undefined ? ` step="${validStep}"` : "";

	return renderHtml`<div id="${raw(id)}-container" class="kt-datetime-input-container">
  <label for="${raw(id)}" class="kt-datetime-input-label">${label}</label>
  <input type="datetime-local" id="${raw(id)}" value="${value}" data-kt-event="change" class="kt-datetime-input"${raw(minAttr)}${raw(maxAttr)}${raw(stepAttr)}${raw(disabled)} />
</div>`;
}
