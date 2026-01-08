import { escapeHtml } from "../utils/html";
import { generateWidgetId, getWidgetValue } from "../widgets/registry";
import { requireRenderContext } from "./context";

// ============================================
// Form API
// ============================================

export interface FormConfig {
	clear_on_submit?: boolean;
}

export interface FormSubmitButtonConfig {
	key?: string;
	disabled?: boolean;
}

/**
 * フォームを作成
 *
 * フォーム内のウィジェットは個別に送信せず、
 * form_submit_buttonクリック時に一括送信されます。
 *
 * @param key - フォームの一意識別子
 * @param content - フォーム内のコンテンツ
 * @param config - オプション設定
 *
 * @example
 * ```typescript
 * kt.form("login_form", () => {
 *   const username = kt.text_input("Username");
 *   const password = kt.text_input("Password", "", { type: "password" });
 *   if (kt.form_submit_button("Login")) {
 *     // フォーム送信時の処理
 *   }
 * });
 *
 * // 送信後にフォームをクリア
 * kt.form("message_form", () => {
 *   kt.text_input("Message");
 *   kt.form_submit_button("Send");
 * }, { clear_on_submit: true });
 * ```
 */
export function form(key: string, content: () => void, config: FormConfig = {}): void {
	const ctx = requireRenderContext();

	const clearAttr = config.clear_on_submit ? ' data-clear-on-submit="true"' : "";

	ctx.append(`<form class="kt-form" data-form-key="${escapeHtml(key)}"${clearAttr}>`);
	content();
	ctx.append("</form>");
}

/**
 * フォーム送信ボタン
 *
 * フォーム内で使用し、クリック時にフォームを送信します。
 * 送信時のrerunでのみtrueを返します。
 *
 * @param label - ボタンのラベル
 * @param config - オプション設定
 * @returns フォームが送信された場合true
 *
 * @example
 * ```typescript
 * kt.form("contact", () => {
 *   const name = kt.text_input("Name");
 *   if (kt.form_submit_button("Send")) {
 *     // フォーム送信時の処理
 *   }
 * });
 * ```
 */
export function form_submit_button(label: string, config: FormSubmitButtonConfig = {}): boolean {
	const ctx = requireRenderContext();
	const id = generateWidgetId(config.key);
	const disabled = config.disabled ? " disabled" : "";

	ctx.append(
		`<button id="${id}" type="submit" data-kt-event="submit" class="kt-form-submit"${disabled}>${escapeHtml(label)}</button>`,
	);

	// ボタンが押されたかどうかを確認
	const pressed = getWidgetValue<boolean>(id, false);
	return pressed === true;
}

/**
 * バリデーションエラーを表示
 *
 * フォーム送信時にバリデーションが失敗した場合に
 * エラーメッセージを表示します。
 *
 * @param message - エラーメッセージ
 *
 * @example
 * ```typescript
 * kt.form("contact", () => {
 *   const email = kt.text_input("Email");
 *   if (kt.form_submit_button("Send")) {
 *     if (!email.includes("@")) {
 *       kt.validation_error("Please enter a valid email address");
 *       return;
 *     }
 *     // Process valid form data
 *   }
 * });
 * ```
 */
export function validation_error(message: string): void {
	const ctx = requireRenderContext();
	ctx.append(`<div class="kt-validation-error" role="alert">${escapeHtml(message)}</div>`);
}

/**
 * 複数のバリデーションエラーを表示
 *
 * @param messages - エラーメッセージの配列
 *
 * @example
 * ```typescript
 * kt.form("signup", () => {
 *   const name = kt.text_input("Name");
 *   const email = kt.text_input("Email");
 *   if (kt.form_submit_button("Sign Up")) {
 *     const errors = [];
 *     if (!name) errors.push("Name is required");
 *     if (!email) errors.push("Email is required");
 *     if (errors.length > 0) {
 *       kt.validation_errors(errors);
 *       return;
 *     }
 *     // Process valid form data
 *   }
 * });
 * ```
 */
export function validation_errors(messages: string[]): void {
	if (messages.length === 0) return;

	const ctx = requireRenderContext();
	const items = messages.map((msg) => `<li>${escapeHtml(msg)}</li>`).join("");
	ctx.append(`<div class="kt-validation-errors" role="alert"><ul>${items}</ul></div>`);
}
