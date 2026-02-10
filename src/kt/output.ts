import { isSafeUrl, raw, renderHtml } from "../utils/html";
import { applyHighlight } from "./code/highlighter";
import { requireRenderContext } from "./context";
import { parseMarkdown } from "./markdown/parser";
import { sanitizeMarkdownHtml } from "./markdown/sanitizer";
import { type MessageType, messageIcons } from "./theme";

/**
 * 様々なデータ型を自動判定して表示（Streamlit st.write 互換）
 *
 * @param args - 表示するデータ（複数可）
 */
export function write(...args: unknown[]): void {
	const ctx = requireRenderContext();

	for (const arg of args) {
		const html = renderArg(arg);
		ctx.append(html);
	}
}

/**
 * 引数を適切なHTML文字列に変換
 */
function renderArg(arg: unknown): string {
	// null / undefined → "None" として表示
	if (arg === null || arg === undefined) {
		return '<span class="kt-write kt-none">None</span>';
	}

	// number / boolean → 文字列化
	if (typeof arg === "number" || typeof arg === "boolean") {
		return renderHtml`<span class="kt-write">${String(arg)}</span>`;
	}

	// string → Markdown としてパース・レンダリング（XSSサニタイズ付き）
	if (typeof arg === "string") {
		const parsed = parseMarkdown(arg);
		const sanitized = sanitizeMarkdownHtml(parsed);
		return `<div class="kt-write kt-markdown">${sanitized}</div>`;
	}

	// array → JSON折りたたみ表示
	if (Array.isArray(arg)) {
		const jsonHtml = renderJsonTree(arg, 0, 1);
		return `<div class="kt-write kt-json">${jsonHtml}</div>`;
	}

	// object → JSON折りたたみ表示（null は上で処理済み）
	if (typeof arg === "object") {
		const jsonHtml = renderJsonTree(arg, 0, 1);
		return `<div class="kt-write kt-json">${jsonHtml}</div>`;
	}

	// その他 → 文字列化
	return renderHtml`<div class="kt-write">${String(arg)}</div>`;
}

/**
 * タイトルを出力
 */
export function title(text: string): void {
	const ctx = requireRenderContext();
	ctx.append(renderHtml`<h1 class="kt-title">${text}</h1>`);
}

/**
 * ヘッダーを出力
 */
export function header(text: string): void {
	const ctx = requireRenderContext();
	ctx.append(renderHtml`<h2 class="kt-header">${text}</h2>`);
}

/**
 * サブヘッダーを出力
 */
export function subheader(text: string): void {
	const ctx = requireRenderContext();
	ctx.append(renderHtml`<h3 class="kt-subheader">${text}</h3>`);
}

/**
 * プレーンテキストを固定幅フォントで表示（Markdownなし）
 * Streamlit st.text 互換
 *
 * @param content - 表示するテキスト
 */
export function text(content: string): void {
	const ctx = requireRenderContext();
	ctx.append(renderHtml`<pre class="kt-text">${content}</pre>`);
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
// Caption API
// ============================================

export interface CaptionConfig {
	/**
	 * HTMLタグの直接埋め込みを許可（デフォルト: false）
	 * @security trueにするとXSSリスクあり
	 */
	unsafe_allow_html?: boolean;
}

/**
 * 小さいフォントでキャプション・注釈テキストを表示
 * Markdownとして解釈される
 *
 * @param body - 表示するテキスト（Markdown対応）
 * @param config - オプション設定
 *
 * @example
 * kt.caption("This is a caption");
 * kt.caption("Data source: *Wikipedia*");
 */
export function caption(body: string, config?: CaptionConfig): void {
	const ctx = requireRenderContext();
	let html = parseMarkdown(body);
	if (!config?.unsafe_allow_html) {
		html = sanitizeMarkdownHtml(html);
	}
	ctx.append(`<div class="kt-caption">${html}</div>`);
}

// ============================================
// Link Button API
// ============================================

export interface LinkButtonConfig {
	/** ボタンを無効化 */
	disabled?: boolean;

	/** コンテナ幅に合わせる（デフォルト: false） */
	use_container_width?: boolean;
}

/**
 * 指定URLに遷移するリンクボタンを表示
 *
 * @param label - ボタンに表示するラベル（プレーンテキスト）
 * @param url - 遷移先のURL
 * @param config - オプション設定
 *
 * @example
 * kt.link_button("Visit Google", "https://google.com");
 * kt.link_button("Docs", "https://docs.example.com", { disabled: true });
 */
export function link_button(label: string, url: string, config?: LinkButtonConfig): void {
	const ctx = requireRenderContext();
	const isDisabled = config?.disabled || !isSafeUrl(url);
	const fullClass = config?.use_container_width ? " kt-link-button-full" : "";

	if (isDisabled) {
		ctx.append(
			renderHtml`<a class="kt-link-button kt-link-button-disabled${raw(fullClass)}" aria-disabled="true" tabindex="-1">${label}</a>`,
		);
	} else {
		ctx.append(
			renderHtml`<a href="${url}" class="kt-link-button${raw(fullClass)}" target="_blank" rel="noopener noreferrer">${label}</a>`,
		);
	}
}

// ============================================
// Alert APIs
// ============================================

export interface AlertConfig {
	icon?: string;
	/** カスタム背景色 (例: "#f0f0f0") */
	background?: string;
	/** カスタムテキスト色 (例: "#333") */
	color?: string;
	/** カスタムボーダー色 (例: "#ccc") */
	border?: string;
}

function alert(type: MessageType, message: string, config: AlertConfig = {}): void {
	const ctx = requireRenderContext();
	const iconValue = config.icon ?? messageIcons[type];

	// カスタムカラーが指定されている場合はインラインスタイルを生成
	const styles: string[] = [];
	if (config.background) {
		styles.push(renderHtml`background-color:${config.background}`);
	}
	if (config.color) {
		styles.push(renderHtml`color:${config.color}`);
	}
	if (config.border) {
		styles.push(renderHtml`border-color:${config.border}`);
	}
	const styleAttr = styles.length > 0 ? ` style="${styles.join(";")}"` : "";

	ctx.append(
		renderHtml`<div class="kt-alert kt-alert-${raw(type)}"${raw(styleAttr)}><span class="kt-alert-icon">${iconValue}</span><span class="kt-alert-message">${message}</span></div>`,
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
	const escapedCode = renderHtml`${body}`;

	// 構文ハイライト適用（言語指定がある場合）
	const highlightedCode = language ? applyHighlight(escapedCode, language) : escapedCode;

	// 行番号の生成（オプション）
	const lineNumbers = config?.line_numbers ? generateLineNumbers(body) : "";

	// コピーボタンの生成（オプション）
	const copyButton = config?.copy_button
		? '<button class="kt-code-copy" data-kt-copy title="Copy code">Copy</button>'
		: "";

	const wrapClass = config?.wrap_lines ? " kt-code-wrap" : "";
	// コピー用に元のコード（エスケープ済み）をdata属性に保存
	const codeDataAttr = config?.copy_button ? renderHtml` data-code="${body}"` : "";

	ctx.append(
		renderHtml`<div class="kt-code${raw(wrapClass)}" data-language="${language ?? ""}"${raw(codeDataAttr)}>${raw(copyButton)}${raw(lineNumbers)}<pre><code class="kt-code-content">${raw(highlightedCode)}</code></pre></div>`,
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
		return renderHtml`<span class="kt-json-string">"${data}"</span>`;
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
					renderHtml`<div class="kt-json-item"><span class="kt-json-key">"${key}"</span>: ${raw(renderJsonTree(value, depth + 1, expandedDepth))}${raw(i < entries.length - 1 ? "," : "")}</div>`,
			)
			.join("");

		return `<details class="kt-json-object"${isExpanded ? " open" : ""}><summary>{${entries.length}}</summary>${items}</details>`;
	}

	// その他の型（undefined等）
	return renderHtml`${String(data)}`;
}
