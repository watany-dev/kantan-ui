/**
 * 折れ線グラフレンダラー
 *
 * 純粋なSVGで折れ線グラフを描画する（外部ライブラリ不要）
 */

import { raw, renderHtml } from "../utils/html";
import type {
	LineChartConfig,
	LineChartData,
	NormalizedChartData,
	NormalizedSeries,
} from "./types";

/** デフォルトカラーパレット */
const DEFAULT_COLORS: readonly string[] = [
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
 * デフォルトパレットから色を取得
 */
function getDefaultColor(index: number): string {
	return DEFAULT_COLORS[index % DEFAULT_COLORS.length] ?? FALLBACK_COLOR;
}

/** チャートのマージン */
const MARGIN = { top: 20, right: 20, bottom: 40, left: 50 };

/** y軸ラベルがある場合の追加マージン */
const Y_LABEL_MARGIN = 20;

/** 凡例の高さ */
const LEGEND_HEIGHT = 30;

/**
 * データを正規化する
 *
 * 様々な入力形式を統一された NormalizedChartData に変換
 */
export function normalizeChartData(
	data: LineChartData,
	config?: Partial<LineChartConfig>,
): NormalizedChartData {
	// 空データ
	if (Array.isArray(data) && data.length === 0) {
		return { series: [], xLabels: [] };
	}

	// number[] → 単一シリーズ
	if (Array.isArray(data) && typeof data[0] === "number") {
		const numbers = data as number[];
		return {
			series: [
				{
					name: config?.y_label ?? "value",
					points: numbers.map((v, i) => [i, v] as [number, number]),
				},
			],
			xLabels: numbers.map((_, i) => String(i)),
		};
	}

	// number[][] → 各列がシリーズ
	if (Array.isArray(data) && Array.isArray(data[0])) {
		return normalize2DArray(data as number[][], config);
	}

	// { columns, data } → 明示的形式
	if (!Array.isArray(data) && "columns" in data && "data" in data) {
		return normalizeExplicitFormat(data, config);
	}

	// Record<string, unknown>[] → オブジェクト配列
	if (Array.isArray(data) && typeof data[0] === "object" && data[0] !== null) {
		return normalizeObjectArray(data as Record<string, unknown>[], config);
	}

	return { series: [], xLabels: [] };
}

/**
 * 2D配列の正規化
 */
function normalize2DArray(
	data: number[][],
	config?: Partial<LineChartConfig>,
): NormalizedChartData {
	if (data.length === 0) return { series: [], xLabels: [] };

	const firstRow = data[0];
	if (!firstRow) return { series: [], xLabels: [] };

	const numCols = firstRow.length;
	const series: NormalizedSeries[] = [];

	const yNames = config?.y ? (Array.isArray(config.y) ? config.y : [config.y]) : undefined;

	for (let col = 0; col < numCols; col++) {
		series.push({
			name: yNames?.[col] ?? `series_${col + 1}`,
			points: data.map((row, i) => [i, row[col] ?? 0] as [number, number]),
		});
	}

	return {
		series,
		xLabels: data.map((_, i) => String(i)),
	};
}

/**
 * 明示的形式の正規化
 */
function normalizeExplicitFormat(
	data: { columns: string[]; data: number[][] },
	config?: Partial<LineChartConfig>,
): NormalizedChartData {
	const yColumns = config?.y ? (Array.isArray(config.y) ? config.y : [config.y]) : data.columns;

	const series: NormalizedSeries[] = [];
	for (const colName of yColumns) {
		const colIndex = data.columns.indexOf(colName);
		if (colIndex === -1) continue;
		series.push({
			name: colName,
			points: data.data.map((row, i) => [i, row[colIndex] ?? 0] as [number, number]),
		});
	}

	return {
		series,
		xLabels: data.data.map((_, i) => String(i)),
	};
}

/**
 * y軸カラムの解決
 */
function resolveYKeys(
	config: Partial<LineChartConfig> | undefined,
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
 * シリーズデータの抽出
 */
function extractSeries(
	data: Record<string, unknown>[],
	yKeys: string[],
	xValues: unknown[],
	numericX: boolean,
): NormalizedSeries[] {
	return yKeys.map((yKey) => {
		const points: [number, number][] = [];
		for (let i = 0; i < data.length; i++) {
			const row = data[i];
			if (!row) continue;
			const xVal = numericX ? (xValues[i] as number) : i;
			const yVal = Number(row[yKey]);
			if (!Number.isNaN(yVal)) {
				points.push([xVal, yVal]);
			}
		}
		return { name: yKey, points };
	});
}

/**
 * オブジェクト配列の正規化
 */
function normalizeObjectArray(
	data: Record<string, unknown>[],
	config?: Partial<LineChartConfig>,
): NormalizedChartData {
	const firstRow = data[0];
	if (!firstRow) return { series: [], xLabels: [] };

	const keys = Object.keys(firstRow);
	const xKey = config?.x ?? findXColumn(firstRow, keys);
	const yKeys = resolveYKeys(config, keys, xKey, data);
	const xValues = xKey ? data.map((row) => row[xKey]) : data.map((_, i) => i);
	const numericX = xValues.every((v) => typeof v === "number");

	return {
		series: extractSeries(data, yKeys, xValues, numericX),
		xLabels: xValues.map((v) => String(v)),
	};
}

/**
 * x軸に適したカラムを自動判定
 */
function findXColumn(firstRow: Record<string, unknown>, keys: string[]): string | undefined {
	// 非数値カラムがあればそれをx軸に
	for (const key of keys) {
		if (typeof firstRow[key] === "string") {
			return key;
		}
	}
	return undefined;
}

/**
 * カラムが数値かどうか判定
 */
function isNumericColumn(data: Record<string, unknown>[], key: string): boolean {
	return data.some((row) => typeof row[key] === "number");
}

/**
 * 適切な目盛り値を計算する（Nice numbers アルゴリズム）
 */
export function niceScale(
	min: number,
	max: number,
	maxTicks = 5,
): { min: number; max: number; step: number } {
	if (min === max) {
		if (min === 0) return { min: -1, max: 1, step: 1 };
		const offset = Math.abs(min) * 0.1;
		return niceScale(min - offset, max + offset, maxTicks);
	}

	const range = max - min;
	const roughStep = range / maxTicks;
	const magnitude = 10 ** Math.floor(Math.log10(roughStep));
	const normalized = roughStep / magnitude;

	let niceStep: number;
	if (normalized <= 1) niceStep = 1;
	else if (normalized <= 2) niceStep = 2;
	else if (normalized <= 5) niceStep = 5;
	else niceStep = 10;

	niceStep *= magnitude;

	const niceMin = Math.floor(min / niceStep) * niceStep;
	const niceMax = Math.ceil(max / niceStep) * niceStep;

	return { min: niceMin, max: niceMax, step: niceStep };
}

/**
 * 数値を表示用にフォーマット
 */
function formatNumber(n: number): string {
	if (Number.isInteger(n) && Math.abs(n) < 1e6) return String(n);
	if (Math.abs(n) >= 1e6) return n.toExponential(1);
	// 小数点以下の不要な0を除去
	return Number.parseFloat(n.toPrecision(4)).toString();
}

/**
 * SVGで折れ線グラフをレンダリング
 */
export function renderLineChart(data: LineChartData, config?: Partial<LineChartConfig>): string {
	const normalized = normalizeChartData(data, config);

	if (normalized.series.length === 0) {
		return '<div class="kt-line-chart kt-line-chart-empty">No data</div>';
	}

	const height = config?.height ?? 400;
	const useContainerWidth = config?.use_container_width !== false;
	const showLegend = normalized.series.length > 1;

	const marginLeft = MARGIN.left + (config?.y_label ? Y_LABEL_MARGIN : 0);
	const marginBottom =
		MARGIN.bottom + (config?.x_label ? 20 : 0) + (showLegend ? LEGEND_HEIGHT : 0);

	// SVGの描画領域サイズ（viewBoxベースなので固定値で良い）
	const svgWidth = 800;
	const svgHeight = height;
	const plotWidth = svgWidth - marginLeft - MARGIN.right;
	const plotHeight = svgHeight - MARGIN.top - marginBottom;

	// データ範囲の計算
	const allPoints = normalized.series.flatMap((s) => s.points);
	const xValues = allPoints.map((p) => p[0]);
	const yValues = allPoints.map((p) => p[1]);

	const xMin = Math.min(...xValues);
	const xMax = Math.max(...xValues);
	const yRaw = { min: Math.min(...yValues), max: Math.max(...yValues) };
	const yScale = niceScale(yRaw.min, yRaw.max);

	// スケーリング関数
	const scaleX = (x: number): number => {
		if (xMax === xMin) return marginLeft + plotWidth / 2;
		return marginLeft + ((x - xMin) / (xMax - xMin)) * plotWidth;
	};
	const scaleY = (y: number): number => {
		return MARGIN.top + plotHeight - ((y - yScale.min) / (yScale.max - yScale.min)) * plotHeight;
	};

	// 色の解決
	const colors = resolveColors(normalized.series.length, config?.color);

	// SVG構築
	const parts: string[] = [];

	// コンテナ開始
	const containerClass = useContainerWidth
		? "kt-line-chart kt-line-chart-container-width"
		: "kt-line-chart";
	parts.push(`<div class="${containerClass}">`);

	// SVG開始
	parts.push(
		renderHtml`<svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="kt-line-chart-svg" role="img" aria-label="${config?.y_label ?? "Line chart"}">`,
	);

	// グリッド線
	parts.push(renderGrid(yScale, marginLeft, plotWidth, scaleY));

	// x軸目盛り
	parts.push(
		renderXAxis(
			normalized.xLabels,
			xMin,
			xMax,
			marginLeft,
			plotWidth,
			MARGIN.top + plotHeight,
			scaleX,
		),
	);

	// y軸目盛り
	parts.push(renderYAxis(yScale, marginLeft, scaleY));

	// データライン
	for (const [i, s] of normalized.series.entries()) {
		const color = colors[i] ?? FALLBACK_COLOR;
		parts.push(renderLine(s.points, color, scaleX, scaleY));
	}

	// 軸ラベル
	if (config?.x_label) {
		const labelY = MARGIN.top + plotHeight + 35;
		parts.push(
			renderHtml`<text x="${marginLeft + plotWidth / 2}" y="${labelY}" text-anchor="middle" class="kt-line-chart-axis-label">${config.x_label}</text>`,
		);
	}

	if (config?.y_label) {
		parts.push(
			renderHtml`<text x="${marginLeft - 40}" y="${MARGIN.top + plotHeight / 2}" text-anchor="middle" transform="rotate(-90, ${marginLeft - 40}, ${MARGIN.top + plotHeight / 2})" class="kt-line-chart-axis-label">${config.y_label}</text>`,
		);
	}

	// 凡例
	if (showLegend) {
		parts.push(
			renderLegend(
				normalized.series,
				colors,
				marginLeft,
				MARGIN.top + plotHeight + marginBottom - LEGEND_HEIGHT + 5,
				plotWidth,
			),
		);
	}

	parts.push("</svg>");
	parts.push("</div>");

	return parts.join("");
}

/**
 * グリッド線のレンダリング
 */
function renderGrid(
	yScale: { min: number; max: number; step: number },
	marginLeft: number,
	plotWidth: number,
	scaleY: (y: number) => number,
): string {
	const parts: string[] = ['<g class="kt-line-chart-grid">'];

	for (let y = yScale.min; y <= yScale.max; y += yScale.step) {
		// 浮動小数点誤差対策
		const rounded = Math.round(y * 1e10) / 1e10;
		const py = scaleY(rounded);
		parts.push(`<line x1="${marginLeft}" y1="${py}" x2="${marginLeft + plotWidth}" y2="${py}" />`);
	}

	parts.push("</g>");
	return parts.join("");
}

/**
 * x軸目盛りのレンダリング
 */
function renderXAxis(
	labels: string[],
	xMin: number,
	xMax: number,
	marginLeft: number,
	plotWidth: number,
	baseY: number,
	scaleX: (x: number) => number,
): string {
	const parts: string[] = ['<g class="kt-line-chart-x-axis">'];

	// 基準線
	parts.push(
		`<line x1="${marginLeft}" y1="${baseY}" x2="${marginLeft + plotWidth}" y2="${baseY}" class="kt-line-chart-axis-line" />`,
	);

	// ラベル数を制限（最大10個程度）
	const maxLabels = 10;
	const step = Math.max(1, Math.ceil(labels.length / maxLabels));

	for (let i = 0; i < labels.length; i += step) {
		const label = labels[i] ?? "";
		const px =
			xMax === xMin
				? marginLeft + plotWidth / 2
				: scaleX(xMin + (i / (labels.length - 1)) * (xMax - xMin));
		parts.push(
			renderHtml`<text x="${px}" y="${baseY + 16}" text-anchor="middle" class="kt-line-chart-tick-label">${label}</text>`,
		);
	}

	parts.push("</g>");
	return parts.join("");
}

/**
 * y軸目盛りのレンダリング
 */
function renderYAxis(
	yScale: { min: number; max: number; step: number },
	marginLeft: number,
	scaleY: (y: number) => number,
): string {
	const parts: string[] = ['<g class="kt-line-chart-y-axis">'];

	// 基準線
	parts.push(
		`<line x1="${marginLeft}" y1="${scaleY(yScale.max)}" x2="${marginLeft}" y2="${scaleY(yScale.min)}" class="kt-line-chart-axis-line" />`,
	);

	for (let y = yScale.min; y <= yScale.max; y += yScale.step) {
		const rounded = Math.round(y * 1e10) / 1e10;
		const py = scaleY(rounded);
		parts.push(
			`<text x="${marginLeft - 8}" y="${py + 4}" text-anchor="end" class="kt-line-chart-tick-label">${formatNumber(rounded)}</text>`,
		);
	}

	parts.push("</g>");
	return parts.join("");
}

/**
 * データラインのレンダリング
 */
function renderLine(
	points: [number, number][],
	color: string,
	scaleX: (x: number) => number,
	scaleY: (y: number) => number,
): string {
	if (points.length === 0) return "";

	// ポイントをx値でソート
	const sorted = [...points].sort((a, b) => a[0] - b[0]);

	const pathD = sorted
		.map((p, i) => {
			const x = scaleX(p[0]);
			const y = scaleY(p[1]);
			return `${i === 0 ? "M" : "L"}${x},${y}`;
		})
		.join(" ");

	const parts: string[] = [];

	// 線
	parts.push(
		renderHtml`<path d="${raw(pathD)}" fill="none" stroke="${color}" stroke-width="2" class="kt-line-chart-line" />`,
	);

	// ドットポイント
	for (const p of sorted) {
		parts.push(
			renderHtml`<circle cx="${scaleX(p[0])}" cy="${scaleY(p[1])}" r="3" fill="${color}" class="kt-line-chart-point" />`,
		);
	}

	return parts.join("");
}

/**
 * 凡例のレンダリング
 */
function renderLegend(
	series: NormalizedSeries[],
	colors: string[],
	startX: number,
	y: number,
	availableWidth: number,
): string {
	const parts: string[] = ['<g class="kt-line-chart-legend">'];

	const itemWidth = Math.min(120, availableWidth / series.length);
	const totalWidth = itemWidth * series.length;
	const offsetX = startX + (availableWidth - totalWidth) / 2;

	for (const [i, s] of series.entries()) {
		const c = colors[i] ?? FALLBACK_COLOR;
		const x = offsetX + i * itemWidth;
		parts.push(renderHtml`<rect x="${x}" y="${y}" width="12" height="12" rx="2" fill="${c}" />`);
		parts.push(
			renderHtml`<text x="${x + 16}" y="${y + 10}" class="kt-line-chart-legend-text">${s.name}</text>`,
		);
	}

	parts.push("</g>");
	return parts.join("");
}

/**
 * カラーの解決
 */
function resolveColors(count: number, color?: string | string[]): string[] {
	if (!color) {
		return Array.from({ length: count }, (_, i) => getDefaultColor(i));
	}

	if (typeof color === "string") {
		return Array.from({ length: count }, () => color);
	}

	return Array.from({ length: count }, (_, i) => color[i] ?? getDefaultColor(i));
}
