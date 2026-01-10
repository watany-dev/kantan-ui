import { escapeHtml } from "../utils/html";
import { requireRenderContext } from "./context";

/**
 * kt.metric() の設定オプション
 */
export interface MetricConfig {
	/**
	 * 変化量（前回比など）
	 * 文字列: そのまま表示 (例: "+12%", "-$5")
	 * 数値: 自動で符号を付与 (例: 12 → "+12", -5 → "-5")
	 */
	delta?: string | number;

	/**
	 * 変化量の色設定
	 * - "normal": 正=緑、負=赤（デフォルト）
	 * - "inverse": 正=赤、負=緑（増加が悪い場合）
	 * - "off": 色なし（グレー）
	 * @default "normal"
	 */
	delta_color?: "normal" | "inverse" | "off";

	/**
	 * ヘルプテキスト（ツールチップ）
	 */
	help?: string;

	/**
	 * ラベルの表示位置
	 * @default "visible"
	 */
	label_visibility?: "visible" | "hidden" | "collapsed";
}

/**
 * メトリクス（KPI）を表示
 *
 * ダッシュボードやKPI表示で使用する、値と変化量を表示するコンポーネント。
 *
 * @param label - ラベル文字列
 * @param value - 表示する値（文字列または数値）
 * @param config - オプション設定
 *
 * @example
 * ```typescript
 * kt.metric("Revenue", "$1,234");
 * kt.metric("Revenue", "$1,234", { delta: "+12%" });
 * kt.metric("Response Time", "120ms", { delta: "+15ms", delta_color: "inverse" });
 * ```
 */
export function metric(label: string, value: string | number, _config?: MetricConfig): void {
	const ctx = requireRenderContext();

	const escapedLabel = escapeHtml(label);
	const escapedValue = escapeHtml(String(value));

	ctx.append(
		`<div class="kt-metric"><div class="kt-metric-label">${escapedLabel}</div><div class="kt-metric-value">${escapedValue}</div></div>`,
	);
}
