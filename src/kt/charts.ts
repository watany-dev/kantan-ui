/**
 * kt チャートAPI
 *
 * 折れ線グラフ、棒グラフ等のデータ可視化機能
 */

import { renderLineChart } from "../widgets/line-chart";
import type { LineChartConfig, LineChartData } from "../widgets/types";
import { renderAreaChart } from "./chart/area-chart";
import { renderBarChart } from "./chart/bar-chart";
import { renderScatterChart } from "./chart/scatter-chart";
import type {
	AreaChartConfig,
	AreaChartData,
	BarChartConfig,
	BarChartData,
	ScatterChartConfig,
	ScatterChartData,
} from "./chart/types";
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

/**
 * 棒グラフを表示
 *
 * @param data - チャートデータ（数値配列、key-valueマップ、オブジェクト配列、2D配列、明示的形式）
 * @param config - オプション設定
 *
 * @example
 * // 単純な数値配列
 * kt.bar_chart([10, 20, 30, 25, 15]);
 *
 * @example
 * // key-valueマップ
 * kt.bar_chart({ "React": 45, "Vue": 30, "Svelte": 15 });
 *
 * @example
 * // オブジェクト配列 + config
 * kt.bar_chart(
 *   [{ month: "Jan", revenue: 100 }, { month: "Feb", revenue: 120 }],
 *   { x: "month", y: "revenue", title: "Revenue" }
 * );
 */
export function bar_chart(data: BarChartData, config?: Partial<BarChartConfig>): void {
	const ctx = requireRenderContext();
	const html = renderBarChart(data, config);
	ctx.append(html);
}

/**
 * エリアチャートを表示
 *
 * @param data - チャートデータ（数値配列、オブジェクト配列、2D配列、明示的形式）
 * @param config - オプション設定
 *
 * @example
 * // 単純な数値配列
 * kt.area_chart([10, 20, 15, 30, 25]);
 *
 * @example
 * // 積み上げエリアチャート
 * kt.area_chart(
 *   [
 *     { month: "Jan", revenue: 100, cost: 60 },
 *     { month: "Feb", revenue: 120, cost: 70 },
 *   ],
 *   { stack: true }
 * );
 */
export function area_chart(data: AreaChartData, config?: Partial<AreaChartConfig>): void {
	const ctx = requireRenderContext();
	const html = renderAreaChart(data, config);
	ctx.append(html);
}

/**
 * 散布図を表示
 *
 * @param data - チャートデータ（オブジェクト配列、2D配列、明示的形式）
 * @param config - オプション設定
 *
 * @example
 * // オブジェクト配列
 * kt.scatter_chart([
 *   { height: 170, weight: 65 },
 *   { height: 160, weight: 55 },
 *   { height: 180, weight: 80 },
 * ]);
 *
 * @example
 * // 2D配列（各行が [x, y] ペア）
 * kt.scatter_chart([[1, 5], [2, 8], [3, 6]]);
 *
 * @example
 * // カラーカラムでグルーピング + バブルチャート
 * kt.scatter_chart(data, {
 *   x: "gdp",
 *   y: "lifeExp",
 *   color: "region",
 *   size: "population",
 * });
 */
export function scatter_chart(data: ScatterChartData, config?: Partial<ScatterChartConfig>): void {
	const ctx = requireRenderContext();
	const html = renderScatterChart(data, config);
	ctx.append(html);
}
