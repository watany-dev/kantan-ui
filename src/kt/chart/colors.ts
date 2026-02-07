/**
 * チャートカラーパレット・バリデーション
 *
 * Tableau 10 カラーパレットとカラーバリデーション機能を提供する。
 */

/** Tableau 10 カラーパレット */
export const DEFAULT_CHART_COLORS: readonly string[] = [
	"#4e79a7",
	"#f28e2b",
	"#e15759",
	"#76b7b2",
	"#59a14f",
	"#edc948",
	"#b07aa1",
	"#ff9da7",
	"#9c755f",
	"#bab0ac",
];

const FALLBACK_COLOR = "#4e79a7";

/**
 * カラーを解決する
 *
 * @param count - 必要な色の数
 * @param color - ユーザー指定のカラー（省略時はデフォルトパレット）
 * @returns 色の配列
 */
export function resolveChartColors(count: number, color?: string | string[]): string[] {
	if (!color) {
		return Array.from(
			{ length: count },
			(_, i) => DEFAULT_CHART_COLORS[i % DEFAULT_CHART_COLORS.length] ?? FALLBACK_COLOR,
		);
	}

	if (typeof color === "string") {
		return Array.from({ length: count }, () => color);
	}

	return Array.from(
		{ length: count },
		(_, i) => color[i] ?? DEFAULT_CHART_COLORS[i % DEFAULT_CHART_COLORS.length] ?? FALLBACK_COLOR,
	);
}

/** 有効なカラー値の正規表現パターン */
const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const CSS_COLOR_NAME = /^[a-zA-Z]+$/;
const RGB_COLOR = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*[\d.]+\s*)?\)$/;

/** 危険なパターン */
const DANGEROUS_PATTERNS = [
	/javascript\s*:/i,
	/vbscript\s*:/i,
	/url\s*\(/i,
	/expression\s*\(/i,
	/<[^>]*>/,
];

/**
 * カラー値がセキュアかどうか判定する
 *
 * @param color - 検証するカラー値
 * @returns 有効なカラー値であれば true
 */
export function isValidColor(color: string): boolean {
	if (!color || color.length === 0) return false;

	// 危険なパターンを拒否
	for (const pattern of DANGEROUS_PATTERNS) {
		if (pattern.test(color)) return false;
	}

	// 許可されたパターンに一致するか
	return HEX_COLOR.test(color) || CSS_COLOR_NAME.test(color) || RGB_COLOR.test(color);
}

/**
 * カラー値をバリデーションする
 *
 * @param colors - 検証するカラー値（単一または配列）
 * @throws 無効なカラー値が含まれる場合
 */
export function validateColors(colors: string | string[]): void {
	const colorArray = typeof colors === "string" ? [colors] : colors;
	for (const color of colorArray) {
		if (!isValidColor(color)) {
			throw new Error(`Invalid color value: ${color}`);
		}
	}
}
