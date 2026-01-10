/**
 * CSSセキュリティユーティリティ
 * CSSインジェクション攻撃を防ぐためのサニタイズ関数
 */

/**
 * CSS長さ値の有効パターン
 * 数値 + 単位 (px, rem, em, %, vh, vw, etc.)
 */
const LENGTH_PATTERN = /^(-?[\d.]+)(px|rem|em|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc)?$/i;

/**
 * 特殊なCSS長さキーワード
 */
const LENGTH_KEYWORDS = ["auto", "inherit", "initial", "unset", "0"];

/**
 * CSS色の有効パターン
 */
const COLOR_PATTERNS = {
	hex: /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
	rgb: /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/i,
	hsl: /^hsla?\(\s*\d+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*(,\s*[\d.]+\s*)?\)$/i,
};

/**
 * 有効なCSS色キーワード（一般的なもの）
 * 小文字で格納し、比較時も小文字化する
 */
const COLOR_KEYWORDS = [
	"inherit",
	"initial",
	"unset",
	"currentcolor", // 小文字で格納
	"transparent",
	// 基本色
	"black",
	"white",
	"red",
	"green",
	"blue",
	"yellow",
	"orange",
	"purple",
	"pink",
	"gray",
	"grey",
	// 拡張色
	"aqua",
	"cyan",
	"magenta",
	"lime",
	"maroon",
	"navy",
	"olive",
	"teal",
	"silver",
	"fuchsia",
];

/**
 * 汎用CSS値サニタイズ
 * セミコロン、波括弧、url()、expression() 等の危険なパターンを除去
 *
 * @param value - サニタイズするCSS値
 * @returns サニタイズ済みの値（危険なパターンが含まれていた場合は空文字列）
 */
export function sanitizeCssValue(value: string): string {
	if (!value || typeof value !== "string") {
		return "";
	}

	let sanitized = value.trim();

	// Step 1: セミコロン以降を除去（追加のCSSプロパティ注入を防止）
	const semicolonIndex = sanitized.indexOf(";");
	if (semicolonIndex !== -1) {
		sanitized = sanitized.substring(0, semicolonIndex).trim();
	}

	// Step 2: 波括弧を除去
	sanitized = sanitized.replace(/[{}]/g, "").trim();

	// Step 3: 残りの値に対して危険なパターンをチェック（完全拒否するパターン）
	// url()やexpression()が含まれている場合は空文字列を返す
	if (/url\s*\(/i.test(sanitized)) {
		return "";
	}
	if (/expression\s*\(/i.test(sanitized)) {
		return "";
	}
	// HTMLタグが含まれている場合は空文字列を返す
	if (/<[^>]*>/.test(sanitized)) {
		return "";
	}
	// javascript: などのプロトコルを含む場合は空文字列
	if (/(javascript|vbscript)\s*:/i.test(sanitized)) {
		return "";
	}

	return sanitized;
}

/**
 * CSS長さ値をサニタイズ
 * height, width, gap, padding, margin 等の長さ値用
 *
 * @param value - サニタイズする長さ値
 * @returns サニタイズ済みの値（無効な場合は空文字列）
 *
 * @example
 * sanitizeCssLength("100px")     // "100px"
 * sanitizeCssLength("1.5rem")    // "1.5rem"
 * sanitizeCssLength("50%")       // "50%"
 * sanitizeCssLength("100px; background: red") // "100px"
 * sanitizeCssLength("url('evil')") // ""
 */
export function sanitizeCssLength(value: string): string {
	// まず汎用サニタイズを適用
	const sanitized = sanitizeCssValue(value);
	if (!sanitized) {
		return "";
	}

	// 特殊キーワードをチェック
	if (LENGTH_KEYWORDS.includes(sanitized.toLowerCase())) {
		return sanitized;
	}

	// 長さパターンにマッチするかチェック
	if (LENGTH_PATTERN.test(sanitized)) {
		return sanitized;
	}

	// 無効な値
	return "";
}

/**
 * CSS色値をサニタイズ
 * color, background-color 等の色値用
 *
 * @param value - サニタイズする色値
 * @returns サニタイズ済みの値（無効な場合は空文字列）
 *
 * @example
 * sanitizeCssColor("#ff0000")        // "#ff0000"
 * sanitizeCssColor("rgb(255, 0, 0)") // "rgb(255, 0, 0)"
 * sanitizeCssColor("red")            // "red"
 * sanitizeCssColor("red; } .x {")    // "red"
 */
export function sanitizeCssColor(value: string): string {
	// まず汎用サニタイズを適用
	const sanitized = sanitizeCssValue(value);
	if (!sanitized) {
		return "";
	}

	const lowerSanitized = sanitized.toLowerCase();

	// 色キーワードをチェック
	if (COLOR_KEYWORDS.includes(lowerSanitized)) {
		return sanitized;
	}

	// hex色をチェック
	if (COLOR_PATTERNS.hex.test(sanitized)) {
		return sanitized;
	}

	// rgb/rgba色をチェック
	if (COLOR_PATTERNS.rgb.test(sanitized)) {
		return sanitized;
	}

	// hsl/hsla色をチェック
	if (COLOR_PATTERNS.hsl.test(sanitized)) {
		return sanitized;
	}

	// 無効な値
	return "";
}
