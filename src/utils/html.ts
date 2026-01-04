/**
 * Escape HTML special characters to prevent XSS attacks.
 * This function should be used for all user-provided text that will be rendered as HTML.
 */
export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * XSS攻撃の可能性があるHTMLパターンを検出する
 * クライアント側でのDOM操作前にチェックするために使用
 *
 * 検出パターン:
 * - <script> タグ
 * - javascript: URL
 * - vbscript: URL
 * - data: URL（base64エンコード）
 * - イベントハンドラ属性（onclick, onerror等）
 * - 危険なタグ（iframe, embed, object, base, form）
 */
export function containsUnsafeHtml(html: string): boolean {
	// パフォーマンスのため、まず簡易チェック
	const lowerHtml = html.toLowerCase();
	if (
		!lowerHtml.includes("<") &&
		!lowerHtml.includes("javascript") &&
		!lowerHtml.includes("vbscript") &&
		!lowerHtml.includes("data:")
	) {
		return false;
	}

	// 危険なパターンを検出（単語境界\bを使用）
	const unsafePatterns: RegExp[] = [
		// スクリプトタグ
		/<script[\s\S]*?>/i,
		// javascript/vbscript URL（空白や改行を考慮）
		/\bjavascript\s*:/i,
		/\bvbscript\s*:/i,
		// data: URL with base64（XSS攻撃に使用される可能性）
		/\bdata\s*:[^,]*?base64/i,
		// イベントハンドラ属性（タグ内で使用される場合）
		/\bon[a-z]+\s*=/i,
		// 危険なタグ
		/<iframe[\s>]/i,
		/<embed[\s>]/i,
		/<object[\s>]/i,
		/<base[\s>]/i,
		/<form[\s>]/i,
		/<meta[\s>]/i,
		/<link[\s>]/i,
		// SVG/MathML経由のスクリプト実行
		/<svg[\s\S]*?on[a-z]+\s*=/i,
		/<math[\s\S]*?on[a-z]+\s*=/i,
	];

	return unsafePatterns.some((pattern) => pattern.test(html));
}
