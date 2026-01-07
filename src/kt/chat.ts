import { escapeHtml } from "../utils/html";
import { requireRenderContext } from "./context";
import { parseMarkdown } from "./markdown/parser";
import { sanitizeMarkdownHtml } from "./markdown/sanitizer";

/**
 * チャットメッセージの役割
 */
export type ChatRole = "user" | "assistant" | "system";

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
export function chat_message(
	role: ChatRole,
	content: string,
	config?: ChatMessageConfig,
): void {
	const ctx = requireRenderContext();
	const avatar = escapeHtml(config?.avatar ?? defaultAvatars[role]);

	// Markdownをパースしてサニタイズ
	const parsedContent = sanitizeMarkdownHtml(parseMarkdown(content));

	// 名前の表示（オプション）
	const nameHtml = config?.name
		? `<div class="kt-chat-name">${escapeHtml(config.name)}</div>`
		: "";

	ctx.append(
		`<div class="kt-chat-message kt-chat-message-${role}" data-role="${role}">` +
			`<div class="kt-chat-avatar">${avatar}</div>` +
			`<div class="kt-chat-body">` +
			`${nameHtml}` +
			`<div class="kt-chat-content">${parsedContent}</div>` +
			`</div>` +
			`</div>`,
	);
}
