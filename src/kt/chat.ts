import { sanitizeCssLength } from "../utils/css";
import { raw, renderHtml } from "../utils/html";
import { chat_input as imperativeChatInput, renderChatInput } from "../widgets/chat-input";
import { generateWidgetId } from "../widgets/registry";
import type { ChatInputConfig } from "../widgets/types";
import { requireRenderContext } from "./context";
import { parseMarkdown } from "./markdown/parser";
import { sanitizeMarkdownHtml } from "./markdown/sanitizer";

export type { ChatInputConfig };

/**
 * チャットメッセージの役割
 */
export type ChatRole = "user" | "assistant" | "system";

/**
 * チャットコンテナの設定
 */
export interface ChatContainerConfig {
	/** コンテナの高さ (例: "400px", "60vh") */
	height?: string;
}

/**
 * チャットメッセージの設定
 */
export interface ChatMessageConfig {
	/** カスタムアバター（絵文字など） */
	avatar?: string;
	/** 表示名 */
	name?: string;
}

/** デフォルトアバター */
const defaultAvatars: Record<ChatRole, string> = {
	user: "👤",
	assistant: "🤖",
	system: "⚙️",
};

/**
 * チャットメッセージを表示
 *
 * @param role - メッセージの役割（user / assistant / system）
 * @param content - メッセージ内容（Markdown対応）
 * @param config - オプション設定
 *
 * @example
 * kt.chat_message("user", "Hello!");
 * kt.chat_message("assistant", "Hi! How can I help you?");
 * kt.chat_message("user", "What is **TypeScript**?", { name: "Alice", avatar: "🧑‍💻" });
 */
export function chat_message(role: ChatRole, content: string, config?: ChatMessageConfig): void {
	const ctx = requireRenderContext();
	const avatar = config?.avatar ?? defaultAvatars[role];

	// Markdownをパースしてサニタイズ
	const parsedContent = sanitizeMarkdownHtml(parseMarkdown(content));

	// 名前の表示（オプション）
	const nameHtml = config?.name ? renderHtml`<div class="kt-chat-name">${config.name}</div>` : "";

	ctx.append(
		renderHtml`<div class="kt-chat-message kt-chat-message-${raw(role)}" data-role="${raw(role)}">` +
			renderHtml`<div class="kt-chat-avatar">${avatar}</div>` +
			`<div class="kt-chat-body">` +
			raw(nameHtml) +
			renderHtml`<div class="kt-chat-content">${raw(parsedContent)}</div>` +
			`</div>` +
			`</div>`,
	);
}

/**
 * チャット用スクロールコンテナ
 * 自動スクロール機能付きのメッセージ表示エリア
 *
 * @param content - コンテナ内に表示するコンテンツ（通常はchat_messageの列挙）
 * @param config - オプション設定
 *
 * @example
 * kt.chat_container(() => {
 *   for (const msg of messages) {
 *     kt.chat_message(msg.role, msg.content);
 *   }
 * }, { height: "400px" });
 */
export function chat_container(content: () => void, config: ChatContainerConfig = {}): void {
	const ctx = requireRenderContext();
	const rawHeight = config.height ?? "400px";
	const height = sanitizeCssLength(rawHeight) || "400px";

	ctx.append(
		renderHtml`<div class="kt-chat-container" data-kt-chat-container style="height: ${raw(height)}; overflow-y: auto;">`,
	);
	content();
	ctx.append("</div>");
}

/**
 * チャット入力ウィジェット
 *
 * 送信時のみ入力テキストを返し、通常時はnullを返す。
 * 画面下部に固定表示され、Enterキーで送信可能。
 *
 * @param placeholder - プレースホルダーテキスト
 * @param config - オプション設定
 * @returns 送信されたテキスト、または null
 *
 * @example
 * ```typescript
 * const userInput = kt.chat_input("メッセージを入力...");
 *
 * if (userInput) {
 *   // ユーザーが送信した時のみ実行
 *   state.messages.push({ role: "user", content: userInput });
 * }
 * ```
 */
export function chat_input(placeholder?: string, config?: Partial<ChatInputConfig>): string | null {
	const ctx = requireRenderContext();
	const id = generateWidgetId(config?.key);
	const configWithId = { ...config, key: id };

	// 値を取得
	const value = imperativeChatInput(placeholder ?? "", configWithId);

	// HTMLをレンダリング
	ctx.append(renderChatInput(placeholder ?? "", configWithId));

	return value;
}
