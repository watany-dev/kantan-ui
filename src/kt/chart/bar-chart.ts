/**
 * BarChart 実装
 *
 * ショートハンド正規化、ソート、SVG描画を提供する。
 */

import type { BarChartData, ChartData, NormalizedBarChartData } from "./types";

/**
 * ショートハンド形式を ChartData に変換
 *
 * number[] → オブジェクト配列 { category, value }
 * Record<string, number> → オブジェクト配列 { category, value }
 * その他 → そのまま返す
 */
export function normalizeBarChartInput(data: BarChartData): ChartData {
	// number[] → オブジェクト配列
	if (Array.isArray(data) && data.length > 0 && typeof data[0] === "number") {
		return (data as number[]).map((v, i) => ({ category: String(i), value: v }));
	}

	// Record<string, number> → オブジェクト配列
	if (!Array.isArray(data) && typeof data === "object" && data !== null && !("columns" in data)) {
		return Object.entries(data as Record<string, number>).map(([k, v]) => ({
			category: k,
			value: v,
		}));
	}

	return data as ChartData;
}

/**
 * ソート適用
 *
 * 最初のシリーズの値でカテゴリを並び替える。
 * null は 0 として扱う。
 */
export function applySortOrder(
	data: NormalizedBarChartData,
	sort?: "ascending" | "descending",
): NormalizedBarChartData {
	if (!sort || data.series.length === 0) return data;

	const firstSeries = data.series[0];
	if (!firstSeries) return data;
	const primaryValues = firstSeries.values;
	const indices = data.xValues.map((_, i) => i);

	indices.sort((a, b) => {
		const va = primaryValues[a] ?? 0;
		const vb = primaryValues[b] ?? 0;
		return sort === "ascending" ? va - vb : vb - va;
	});

	return {
		xValues: indices.map((i) => data.xValues[i] ?? i),
		series: data.series.map((s) => ({
			...s,
			values: indices.map((i) => s.values[i] ?? null),
		})),
	};
}
