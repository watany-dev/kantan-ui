import { escapeHtml } from "../utils/html";
import { applyHighlight } from "./code/highlighter";
import { requireRenderContext } from "./context";
import { parseMarkdown } from "./markdown/parser";
import { sanitizeMarkdownHtml } from "./markdown/sanitizer";

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

export interface AlertConfig {
	icon?: string;
	/** カスタム背景色 (例: "#f0f0f0") */
	background?: string;
	/** カスタムテキスト色 (例: "#333") */
	color?: string;
	/** カスタムボーダー色 (例: "#ccc") */
	border?: string;
}

function alert(type: AlertType, message: string, config: AlertConfig = {}): void {
	const ctx = requireRenderContext();
	const icon = escapeHtml(config.icon ?? defaultIcons[type]);

	// カスタムカラーが指定されている場合はインラインスタイルを生成
	const styles: string[] = [];
	if (config.background) {
		styles.push(`background-color:${escapeHtml(config.background)}`);
	}
	if (config.color) {
		styles.push(`color:${escapeHtml(config.color)}`);
	}
	if (config.border) {
		styles.push(`border-color:${escapeHtml(config.border)}`);
	}
	const styleAttr = styles.length > 0 ? ` style="${styles.join(";")}"` : "";

	ctx.append(
		`<div class="kt-alert kt-alert-${type}"${styleAttr}><span class="kt-alert-icon">${icon}</span><span class="kt-alert-message">${escapeHtml(message)}</span></div>`,
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

// ============================================
// Code API
// ============================================

export interface CodeConfig {
	/** 行番号を表示（デフォルト: false） */
	line_numbers?: boolean;
	/** ラップ表示（デフォルト: false、横スクロール） */
	wrap_lines?: boolean;
	/** コピーボタンを表示（デフォルト: false） */
	copy_button?: boolean;
}

/**
 * コードブロックを表示
 *
 * @param body - コードの内容
 * @param language - プログラミング言語（構文ハイライト用）
 * @param config - オプション設定
 *
 * @example
 * kt.code("const x = 42;", "typescript");
 * kt.code("print('hello')", "python", { line_numbers: true });
 */
export function code(body: string, language?: string, config?: CodeConfig): void {
	const ctx = requireRenderContext();

	// コード内容をエスケープ
	const escapedCode = escapeHtml(body);

	// 構文ハイライト適用（言語指定がある場合）
	const highlightedCode = language ? applyHighlight(escapedCode, language) : escapedCode;

	// 行番号の生成（オプション）
	const lineNumbers = config?.line_numbers ? generateLineNumbers(body) : "";

	// コピーボタンの生成（オプション）
	const copyButton = config?.copy_button
		? `<button class="kt-code-copy" data-kt-copy title="Copy code">Copy</button>`
		: "";

	const wrapClass = config?.wrap_lines ? " kt-code-wrap" : "";
	const langAttr = `data-language="${escapeHtml(language ?? "")}"`;
	// コピー用に元のコード（エスケープ済み）をdata属性に保存
	const codeDataAttr = config?.copy_button ? ` data-code="${escapeHtml(body)}"` : "";

	ctx.append(
		`<div class="kt-code${wrapClass}" ${langAttr}${codeDataAttr}>${copyButton}${lineNumbers}<pre><code class="kt-code-content">${highlightedCode}</code></pre></div>`,
	);
}

function generateLineNumbers(code: string): string {
	const lineCount = code.split("\n").length;
	const numbers = Array.from({ length: lineCount }, (_, i) => `<span>${i + 1}</span>`).join("\n");
	return `<div class="kt-code-line-numbers">${numbers}</div>`;
}

// ============================================
// Markdown API
// ============================================

export interface MarkdownConfig {
	/**
	 * HTMLタグの直接埋め込みを許可（デフォルト: false）
	 * @security trueにするとXSSリスクあり
	 */
	unsafe_allow_html?: boolean;
}

/**
 * Markdownテキストをレンダリングして表示
 *
 * @param content - Markdownテキスト
 * @param config - オプション設定
 *
 * @example
 * kt.markdown("# Hello\n\nThis is **bold** text.");
 * kt.markdown("## Header", { unsafe_allow_html: true });
 */
export function markdown(content: string, config?: MarkdownConfig): void {
	const ctx = requireRenderContext();

	// MarkdownをHTMLにパース
	let html = parseMarkdown(content);

	// サニタイズ（unsafe_allow_htmlがfalseの場合）
	if (!config?.unsafe_allow_html) {
		html = sanitizeMarkdownHtml(html);
	}

	ctx.append(`<div class="kt-markdown">${html}</div>`);
}

// ============================================
// JSON API
// ============================================

export interface JsonConfig {
	/** 展開するデフォルト深さ（デフォルト: 1） */
	expanded?: number;
}

/**
 * JSONデータを折りたたみ可能なビューで表示
 *
 * @param data - JSONデータ（オブジェクト、配列、またはプリミティブ）
 * @param config - オプション設定
 *
 * @example
 * kt.json({ name: "Alice", age: 30 });
 * kt.json(apiResponse, { expanded: 2 });
 */
export function json(data: unknown, config?: JsonConfig): void {
	const ctx = requireRenderContext();
	const expandedDepth = config?.expanded ?? 1;
	const jsonHtml = renderJsonTree(data, 0, expandedDepth);
	ctx.append(`<div class="kt-json">${jsonHtml}</div>`);
}

function renderJsonTree(data: unknown, depth: number, expandedDepth: number): string {
	if (data === null) {
		return '<span class="kt-json-null">null</span>';
	}

	if (typeof data === "boolean") {
		return `<span class="kt-json-boolean">${data}</span>`;
	}

	if (typeof data === "number") {
		return `<span class="kt-json-number">${data}</span>`;
	}

	if (typeof data === "string") {
		return `<span class="kt-json-string">"${escapeHtml(data)}"</span>`;
	}

	if (Array.isArray(data)) {
		if (data.length === 0) {
			return '<span class="kt-json-array">[]</span>';
		}

		const isExpanded = depth < expandedDepth;
		const items = data
			.map(
				(item, i) =>
					`<div class="kt-json-item">${renderJsonTree(item, depth + 1, expandedDepth)}${i < data.length - 1 ? "," : ""}</div>`,
			)
			.join("");

		return `<details class="kt-json-array"${isExpanded ? " open" : ""}><summary>[${data.length}]</summary>${items}</details>`;
	}

	if (typeof data === "object") {
		const entries = Object.entries(data);
		if (entries.length === 0) {
			return '<span class="kt-json-object">{}</span>';
		}

		const isExpanded = depth < expandedDepth;
		const items = entries
			.map(
				([key, value], i) =>
					`<div class="kt-json-item"><span class="kt-json-key">"${escapeHtml(key)}"</span>: ${renderJsonTree(value, depth + 1, expandedDepth)}${i < entries.length - 1 ? "," : ""}</div>`,
			)
			.join("");

		return `<details class="kt-json-object"${isExpanded ? " open" : ""}><summary>{${entries.length}}</summary>${items}</details>`;
	}

	// その他の型（undefined等）
	return escapeHtml(String(data));
}
