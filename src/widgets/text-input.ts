import { raw, renderHtml } from "../utils/html";
import { initializeTextInputState } from "./core";
import { generateWidgetId } from "./registry";
import type { TextInputConfig } from "./types";

/**
 * 有効なinput type値のホワイトリスト
 */
const VALID_INPUT_TYPES = ["text", "password", "email", "tel", "url"] as const;

/**
 * input typeを検証し、無効な場合は"text"を返す
 */
function validateInputType(type: unknown): string {
	if (typeof type === "string" && (VALID_INPUT_TYPES as readonly string[]).includes(type)) {
		return type;
	}
	return "text";
}

/**
 * 数値属性を検証し、無効な場合はundefinedを返す
 */
function validateNumericAttr(value: unknown): number | undefined {
	if (value === undefined || value === null) return undefined;
	const num = Number(value);
	return Number.isFinite(num) ? num : undefined;
}

/**
 * テキスト入力ウィジェット
 * 現在の入力値を返す（初回はデフォルト値）
 */
export function text_input(
	_label: string,
	defaultValue?: string,
	config?: Partial<TextInputConfig>,
): string {
	const id = generateWidgetId(config?.key);
	return initializeTextInputState(id, defaultValue);
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
	const disabled = config?.disabled ? " disabled" : "";

	// 実行時型検証: maxLengthは数値のみ許可
	const validMaxLength = validateNumericAttr(config?.maxLength);
	const maxLength = validMaxLength !== undefined ? ` maxlength="${validMaxLength}"` : "";

	// 実行時型検証: typeはホワイトリストのみ許可
	const inputType = validateInputType(config?.type);

	return renderHtml`<div id="${raw(id)}-container" class="kt-text-input-container">
  <label for="${raw(id)}" class="kt-text-input-label">${label}</label>
  <input type="${raw(inputType)}" id="${raw(id)}" value="${value}" placeholder="${placeholder}" data-kt-event="input" class="kt-text-input"${raw(disabled)}${raw(maxLength)} />
</div>`;
}
