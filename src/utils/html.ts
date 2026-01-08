/**
 * HTML属性をビルドする
 * @param attrs 属性名と値のオブジェクト。値がundefined/null/falseの属性は除外される
 * @returns HTML属性文字列（先頭にスペース付き、空の場合は空文字列）
 */
export function buildAttributes(
	attrs: Record<string, string | number | boolean | undefined | null>,
): string {
	const parts: string[] = [];
	for (const [key, value] of Object.entries(attrs)) {
		if (value === undefined || value === null || value === false) {
			continue;
		}
		if (value === true) {
			parts.push(key);
		} else {
			parts.push(`${key}="${escapeHtml(String(value))}"`);
		}
	}
	return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

/**
 * CSSスタイル属性をビルドする
 * @param styles スタイルプロパティと値のオブジェクト。値がundefined/null/空文字列は除外される
 * @returns style属性文字列（style="..."形式、空の場合は空文字列）
 */
export function buildStyleAttr(styles: Record<string, string | number | undefined | null>): string {
	const parts: string[] = [];
	for (const [key, value] of Object.entries(styles)) {
		if (value === undefined || value === null || value === "") {
			continue;
		}
		parts.push(`${key}: ${value}`);
	}
	return parts.length > 0 ? `style="${parts.join("; ")}"` : "";
}

/**
 * クラス属性をビルドする
 * @param classes クラス名の配列。false/undefined/null/空文字列は除外される
 * @returns class属性文字列（class="..."形式、空の場合は空文字列）
 */
export function buildClassAttr(classes: (string | false | undefined | null)[]): string {
	const validClasses = classes.filter((c): c is string => typeof c === "string" && c !== "");
	return validClasses.length > 0 ? `class="${validClasses.join(" ")}"` : "";
}

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
 *
 * @note この関数はsrc/client/script.ts内のisUnsafeHtml()と同じロジックを持つ。
 *       変更時は両方を同期すること。クライアント側は文字列として送信されるため
 *       直接参照できない。テストは両者の整合性を検証する。
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
