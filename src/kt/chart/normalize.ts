/**
 * チャートデータ正規化
 *
 * 様々な入力形式を統一された NormalizedBarChartData に変換する。
 */

import { resolveChartColors } from "./colors";
import type { ChartData, NormalizeConfig, NormalizedBarChartData } from "./types";

/**
 * チャートデータを正規化する
 *
 * Record<string, unknown>[], unknown[][], { columns, data } の3形式を
 * NormalizedBarChartData に変換する。
 */
export function normalizeChartData(
	data: ChartData,
	config?: NormalizeConfig,
): NormalizedBarChartData {
	if (Array.isArray(data) && data.length === 0) {
		return { xValues: [], series: [] };
	}

	// { columns, data } 形式
	if (!Array.isArray(data) && "columns" in data && "data" in data) {
		return normalizeExplicitFormat(data, config);
	}

	// unknown[][] 形式
	if (Array.isArray(data) && Array.isArray(data[0])) {
		return normalize2DArray(data as unknown[][], config);
	}

	// Record<string, unknown>[] 形式
	if (Array.isArray(data) && typeof data[0] === "object" && data[0] !== null) {
		return normalizeObjectArray(data as Record<string, unknown>[], config);
	}

	return { xValues: [], series: [] };
}

/**
 * オブジェクト配列を正規化
 */
function normalizeObjectArray(
	data: Record<string, unknown>[],
	config?: NormalizeConfig,
): NormalizedBarChartData {
	const firstRow = data[0];
	if (!firstRow) return { xValues: [], series: [] };

	const keys = Object.keys(firstRow);
	const xKey = config?.x ?? findXColumn(firstRow, keys);
	const yKeys = resolveYKeys(config, keys, xKey, data);

	const xValues: (string | number)[] = xKey
		? data.map((row) => {
				const v = row[xKey];
				return typeof v === "string" ? v : typeof v === "number" ? v : String(v);
			})
		: data.map((_, i) => i);

	const colors = resolveChartColors(yKeys.length, config?.color);

	const series = yKeys.map((yKey, idx) => ({
		name: yKey,
		values: data.map((row) => {
			const val = Number(row[yKey]);
			return Number.isNaN(val) ? null : val;
		}),
		color: colors[idx] ?? "#4e79a7",
	}));

	return { xValues, series };
}

/**
 * 2D配列を正規化
 */
function normalize2DArray(data: unknown[][], config?: NormalizeConfig): NormalizedBarChartData {
	if (data.length === 0) return { xValues: [], series: [] };

	const firstRow = data[0];
	if (!firstRow) return { xValues: [], series: [] };

	const numCols = firstRow.length;
	const colors = resolveChartColors(numCols, config?.color);

	const series = Array.from({ length: numCols }, (_, col) => ({
		name: `series_${col + 1}`,
		values: data.map((row) => {
			const val = Number(row[col]);
			return Number.isNaN(val) ? null : val;
		}),
		color: colors[col] ?? "#4e79a7",
	}));

	return {
		xValues: data.map((_, i) => i),
		series,
	};
}

/**
 * 明示的形式を正規化
 */
function normalizeExplicitFormat(
	data: { columns: string[]; data: unknown[][] },
	config?: NormalizeConfig,
): NormalizedBarChartData {
	const yColumns = config?.y ? (Array.isArray(config.y) ? config.y : [config.y]) : data.columns;

	const validColumns = yColumns.filter((col) => data.columns.includes(col));
	const colors = resolveChartColors(validColumns.length, config?.color);

	const series = validColumns.map((colName, idx) => {
		const colIndex = data.columns.indexOf(colName);
		return {
			name: colName,
			values: data.data.map((row) => {
				const val = Number(row[colIndex]);
				return Number.isNaN(val) ? null : val;
			}),
			color: colors[idx] ?? "#4e79a7",
		};
	});

	return {
		xValues: data.data.map((_, i) => i),
		series,
	};
}

/**
 * x軸に適したカラムを自動判定
 */
function findXColumn(firstRow: Record<string, unknown>, keys: string[]): string | undefined {
	for (const key of keys) {
		if (typeof firstRow[key] === "string") {
			return key;
		}
	}
	return undefined;
}

/**
 * y軸カラムを解決
 */
function resolveYKeys(
	config: { x?: string; y?: string | string[] } | undefined,
	keys: string[],
	xKey: string | undefined,
	data: Record<string, unknown>[],
): string[] {
	if (config?.y) {
		return Array.isArray(config.y) ? config.y : [config.y];
	}
	return keys.filter((k) => k !== xKey && isNumericColumn(data, k));
}

/**
 * カラムが数値かどうか判定
 */
function isNumericColumn(data: Record<string, unknown>[], key: string): boolean {
	return data.some((row) => typeof row[key] === "number");
}
