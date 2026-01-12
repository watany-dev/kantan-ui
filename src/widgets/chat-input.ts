import { escapeHtml } from "../utils/html";
import { clearWidgetValue, generateWidgetId, getWidgetValue } from "./registry";
import type { ChatInputConfig } from "./types";

/**
 * チャット入力ウィジェット（命令的API）
 * 送信時のみ値を返し、通常時はnullを返す
 */
export function chat_input(_placeholder: string, config?: Partial<ChatInputConfig>): string | null {
	const id = generateWidgetId(config?.key);
	// 送信されたテキストを取得
	const value = getWidgetValue<string | null>(id, null);
	// 値がある場合はクリア（一度きりのイベント）
	if (value && typeof value === "string") {
		clearWidgetValue(id);
		return value;
	}
	return null;
}

/**
 * maxLengthの検証
 */
function validateMaxLength(value: unknown): number | undefined {
	if (value === undefined || value === null) return undefined;
	const num = Number(value);
	if (!Number.isFinite(num) || num <= 0) return undefined;
	// 最大値を制限（DoS防止）
	return Math.min(num, 100000);
}

/**
 * チャット入力のHTMLをレンダリング
 */
export function renderChatInput(placeholder: string, config?: Partial<ChatInputConfig>): string {
	const id = generateWidgetId(config?.key);
	const escapedPlaceholder = escapeHtml(placeholder || "メッセージを入力...");
	const disabled = config?.disabled ? " disabled" : "";
	const maxLength = validateMaxLength(config?.maxLength);
	const maxLengthAttr = maxLength ? ` maxlength="${maxLength}"` : "";
	const pinClass = config?.pinToBottom !== false ? " kt-chat-input-pinned" : "";
	const submitLabel = escapeHtml(config?.submitLabel || "送信");
	const buttonStyle = config?.hideSubmitButton ? ' style="display:none"' : "";
	const ariaLabel = escapeHtml(placeholder || "チャットメッセージ入力");

	return `<div class="kt-chat-input-wrapper${pinClass}">
  <div class="kt-chat-input-container">
    <textarea
      id="${id}"
      class="kt-chat-input-field"
      placeholder="${escapedPlaceholder}"
      data-kt-event="chat-submit"
      rows="1"
      aria-label="${ariaLabel}"${disabled}${maxLengthAttr}></textarea>
    <button
      type="button"
      class="kt-chat-input-submit"
      data-kt-event="click"
      data-kt-trigger="${id}"
      aria-label="送信"${disabled}${buttonStyle}>${submitLabel}</button>
  </div>
</div>`;
}
