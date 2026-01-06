import { escapeHtml } from "../utils/html";
import { requireRenderContext } from "./context";

/**
 * テキストまたはHTMLを出力
 */
export function write(content: string | number | boolean): void {
	const ctx = requireRenderContext();
	const text = String(content);
	ctx.append(`<div class="kt-write">${escapeHtml(text)}</div>`);
}

/**
 * タイトルを出力
 */
export function title(text: string): void {
	const ctx = requireRenderContext();
	ctx.append(`<h1 class="kt-title">${escapeHtml(text)}</h1>`);
}

/**
 * ヘッダーを出力
 */
export function header(text: string): void {
	const ctx = requireRenderContext();
	ctx.append(`<h2 class="kt-header">${escapeHtml(text)}</h2>`);
}

/**
 * サブヘッダーを出力
 */
export function subheader(text: string): void {
	const ctx = requireRenderContext();
	ctx.append(`<h3 class="kt-subheader">${escapeHtml(text)}</h3>`);
}

/**
 * テキストを出力（writeのエイリアス）
 */
export function text(content: string): void {
	write(content);
}

/**
 * 区切り線を出力
 */
export function divider(): void {
	const ctx = requireRenderContext();
	ctx.append('<hr class="kt-divider" />');
}

/**
 * 生のHTMLを出力（エスケープなし）
 *
 * @security この関数はXSS脆弱性の原因となる可能性があります。
 * ユーザー入力を含むHTMLを渡さないでください。
 * 信頼できる静的HTMLのみに使用してください。
 *
 * @example
 * // OK: 静的HTML
 * kt.html('<div class="custom">Static content</div>');
 *
 * // NG: ユーザー入力を含む
 * kt.html(`<div>${userInput}</div>`); // 危険!
 */
export function html(rawHtml: string): void {
	const ctx = requireRenderContext();
	ctx.append(rawHtml);
}

// ============================================
// Alert APIs
// ============================================

type AlertType = "success" | "error" | "warning" | "info";

const defaultIcons: Record<AlertType, string> = {
	success: "✓",
	error: "✕",
	warning: "⚠",
	info: "ℹ",
};

const alertColors: Record<AlertType, { bg: string; border: string; text: string }> = {
	success: { bg: "#d4edda", border: "#c3e6cb", text: "#155724" },
	error: { bg: "#f8d7da", border: "#f5c6cb", text: "#721c24" },
	warning: { bg: "#fff3cd", border: "#ffeeba", text: "#856404" },
	info: { bg: "#d1ecf1", border: "#bee5eb", text: "#0c5460" },
};

export interface AlertConfig {
	icon?: string;
}

function alert(type: AlertType, message: string, config: AlertConfig = {}): void {
	const ctx = requireRenderContext();
	const colors = alertColors[type];
	const icon = escapeHtml(config.icon ?? defaultIcons[type]);

	ctx.append(
		`<div class="kt-alert kt-alert-${type}" style="background: ${colors.bg}; border: 1px solid ${colors.border}; color: ${colors.text}; padding: 0.75rem 1rem; border-radius: 4px; margin: 0.5rem 0; display: flex; align-items: center; gap: 0.5rem;"><span class="kt-alert-icon">${icon}</span><span class="kt-alert-message">${escapeHtml(message)}</span></div>`,
	);
}

/**
 * 成功メッセージを表示
 */
export function success(message: string, config?: AlertConfig): void {
	alert("success", message, config);
}

/**
 * エラーメッセージを表示
 */
export function error(message: string, config?: AlertConfig): void {
	alert("error", message, config);
}

/**
 * 警告メッセージを表示
 */
export function warning(message: string, config?: AlertConfig): void {
	alert("warning", message, config);
}

/**
 * 情報メッセージを表示
 */
export function info(message: string, config?: AlertConfig): void {
	alert("info", message, config);
}
