import { sanitizeCssLength } from "../utils/css";
import { escapeHtml } from "../utils/html";
import { requireRenderContext } from "./context";
import { parseMarkdown } from "./markdown/parser";
import { sanitizeMarkdownHtml } from "./markdown/sanitizer";

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
	const avatar = escapeHtml(config?.avatar ?? defaultAvatars[role]);

	// Markdownをパースしてサニタイズ
	const parsedContent = sanitizeMarkdownHtml(parseMarkdown(content));

	// 名前の表示（オプション）
	const nameHtml = config?.name ? `<div class="kt-chat-name">${escapeHtml(config.name)}</div>` : "";

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
		`<div class="kt-chat-container" data-kt-chat-container style="height: ${height}; overflow-y: auto;">`,
	);
	content();
	ctx.append("</div>");
}
