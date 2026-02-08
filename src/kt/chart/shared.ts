/**
 * チャート共通ユーティリティ
 *
 * bar_chart, area_chart で共有するサニタイズ・データ操作関数を提供する。
 */

import { isValidColor, resolveChartColors } from "./colors";
import { normalizeChartData } from "./normalize";
import type { BaseChartConfig, ChartData, NormalizeConfig, NormalizedBarChartData } from "./types";

/** SVG viewBox 幅 */
export const SVG_WIDTH = 600;

/** デフォルトの高さ */
export const DEFAULT_HEIGHT = 400;

/** データポイントの最大数 */
const MAX_DATA_POINTS = 10_000;

/** シリーズの最大数 */
const MAX_SERIES = 20;

/** マージン */
export const MARGIN = { top: 20, right: 20, bottom: 40, left: 60 };

/** y軸ラベルの追加マージン */
export const Y_LABEL_MARGIN = 20;

/** x軸ラベルの追加マージン */
export const X_LABEL_MARGIN = 20;

/** 凡例の高さ */
export const LEGEND_HEIGHT = 25;

/**
 * 設定をサニタイズ（高さ・カラーのバリデーション）
 */
export function sanitizeConfig<T extends BaseChartConfig>(
	config: Partial<T> | undefined,
): Partial<T> | undefined {
	if (!config) return config;

	const sanitized = { ...config };

	if (sanitized.height !== undefined && sanitized.height <= 0) {
		sanitized.height = DEFAULT_HEIGHT;
	}

	if (sanitized.color) {
		if (typeof sanitized.color === "string") {
			if (!isValidColor(sanitized.color)) {
				delete sanitized.color;
			}
		} else if (Array.isArray(sanitized.color)) {
			const validColors = sanitized.color.filter(isValidColor);
			if (validColors.length === 0) {
				delete sanitized.color;
			} else {
				sanitized.color = validColors;
			}
		}
	}

	return sanitized;
}

/**
 * NaN/Infinity値をnullに変換
 */
function sanitizeValues(data: NormalizedBarChartData): NormalizedBarChartData {
	let changed = false;
	const series = data.series.map((s) => {
		const values = s.values.map((v) => {
			if (v !== null && !Number.isFinite(v)) {
				changed = true;
				return null;
			}
			return v;
		});
		return { ...s, values };
	});
	return changed ? { xValues: data.xValues, series } : data;
}

/**
 * 全データ値を取得（グループ化モード用）
 */
export function getAllValues(data: NormalizedBarChartData): number[] {
	return data.series.flatMap((s) => s.values.filter((v): v is number => v !== null));
}

/**
 * 積み上げモード用の最大値を取得
 * 各カテゴリのシリーズ合計値を返す
 */
export function getStackedMaxValues(data: NormalizedBarChartData): number[] {
	const values: number[] = [];
	for (let i = 0; i < data.xValues.length; i++) {
		let total = 0;
		for (const s of data.series) {
			total += s.values[i] ?? 0;
		}
		values.push(total);
	}
	return values;
}

/**
 * チャートデータの共通前処理パイプライン
 *
 * 1. ショートハンドの正規化
 * 2. normalizeChartData による統一化
 * 3. Infinity/NaN のサニタイズ
 * 4. データポイント・シリーズ数の制限
 * 5. カラーオーバーライド
 */
export function prepareChartData(
	chartData: ChartData,
	config?: Partial<BaseChartConfig>,
): NormalizedBarChartData | null {
	const normalizeConfig: NormalizeConfig = {};
	if (config?.x) normalizeConfig.x = config.x;
	if (config?.y) normalizeConfig.y = config.y;
	if (config?.color) normalizeConfig.color = config.color;
	let normalized = normalizeChartData(chartData, normalizeConfig);

	normalized = sanitizeValues(normalized);

	const hasAnyValue = normalized.series.some((s) => s.values.some((v) => v !== null));
	if (normalized.series.length === 0 || normalized.xValues.length === 0 || !hasAnyValue) {
		return null;
	}

	if (normalized.xValues.length > MAX_DATA_POINTS) {
		normalized = {
			xValues: normalized.xValues.slice(0, MAX_DATA_POINTS),
			series: normalized.series.map((s) => ({
				...s,
				values: s.values.slice(0, MAX_DATA_POINTS),
			})),
		};
	}

	if (normalized.series.length > MAX_SERIES) {
		normalized = {
			xValues: normalized.xValues,
			series: normalized.series.slice(0, MAX_SERIES),
		};
	}

	if (config?.color) {
		const colors = resolveChartColors(normalized.series.length, config.color);
		for (let i = 0; i < normalized.series.length; i++) {
			const s = normalized.series[i];
			if (s) s.color = colors[i] ?? s.color;
		}
	}

	return normalized;
}
