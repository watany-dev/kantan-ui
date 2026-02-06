/**
 * kt チャートAPI
 *
 * 折れ線グラフ等のデータ可視化機能
 */

import { renderLineChart } from "../widgets/line-chart";
import type { LineChartConfig, LineChartData } from "../widgets/types";
import { requireRenderContext } from "./context";

/**
 * 折れ線グラフを表示
 *
 * @param data - チャートデータ（数値配列、オブジェクト配列、2D配列、明示的形式）
 * @param config - オプション設定
 *
 * @example
 * // 単純な数値配列
 * kt.line_chart([10, 20, 15, 30, 25]);
 *
 * @example
 * // オブジェクト配列（複数シリーズ）
 * kt.line_chart([
 *   { month: "Jan", sales: 100, profit: 50 },
 *   { month: "Feb", sales: 120, profit: 60 },
 *   { month: "Mar", sales: 150, profit: 80 },
 * ]);
 *
 * @example
 * // x/y指定 + カスタムカラー
 * kt.line_chart(data, {
 *   x: "month",
 *   y: ["sales", "profit"],
 *   x_label: "Month",
 *   y_label: "Amount ($)",
 *   color: ["#ff6384", "#36a2eb"],
 *   height: 300,
 * });
 */
export function line_chart(data: LineChartData, config?: Partial<LineChartConfig>): void {
	const ctx = requireRenderContext();
	const html = renderLineChart(data, config);
	ctx.append(html);
}
