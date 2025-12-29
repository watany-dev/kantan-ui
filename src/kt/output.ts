import { requireRenderContext } from "./context";

/**
 * HTMLをエスケープ
 */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

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
 * 注意: XSSに注意して使用すること
 */
export function html(rawHtml: string): void {
	const ctx = requireRenderContext();
	ctx.append(rawHtml);
}
