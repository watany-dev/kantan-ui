/**
 * AreaChart 実装
 *
 * エリアチャート（塗りつぶし付き折れ線グラフ）のSVG描画を提供する。
 * bar_chart系の正規化パイプラインを使用。
 */

import { raw, renderHtml } from "../../utils/html";
import { isValidColor, resolveChartColors } from "./colors";
import { normalizeChartData } from "./normalize";
import { renderGrid, renderLegend, renderXAxis, renderYAxis } from "./render-utils";
import { calculateAxisScale } from "./scale";
import type { AreaChartConfig, AreaChartData, ChartData, NormalizedBarChartData } from "./types";

/** SVG viewBox 幅 */
const SVG_WIDTH = 600;

/** デフォルトの高さ */
const DEFAULT_HEIGHT = 400;

/** データポイントの最大数 */
const MAX_DATA_POINTS = 10_000;

/** シリーズの最大数 */
const MAX_SERIES = 20;

/** マージン */
const MARGIN = { top: 20, right: 20, bottom: 40, left: 60 };

/** y軸ラベルの追加マージン */
const Y_LABEL_MARGIN = 20;

/** x軸ラベルの追加マージン */
const X_LABEL_MARGIN = 20;

/** 凡例の高さ */
const LEGEND_HEIGHT = 25;

/** デフォルトのfill透明度 */
const DEFAULT_FILL_OPACITY = 0.3;

/**
 * number[] ショートハンドを ChartData に変換
 */
function normalizeAreaChartInput(data: AreaChartData): ChartData {
	if (Array.isArray(data) && data.length > 0 && typeof data[0] === "number") {
		return (data as number[]).map((v, i) => ({ index: String(i), value: v }));
	}
	return data as ChartData;
}

/**
 * 色にアルファチャネルが含まれるかを判定
 */
function hasAlphaChannel(color: string): boolean {
	return /^rgba\(/.test(color) || /^#[0-9a-fA-F]{8}$/.test(color);
}

/**
 * 設定をサニタイズ
 */
function sanitizeConfig(config?: Partial<AreaChartConfig>): Partial<AreaChartConfig> | undefined {
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
 * 全データ値を取得
 */
function getAllValues(data: NormalizedBarChartData): number[] {
	return data.series.flatMap((s) => s.values.filter((v): v is number => v !== null));
}

/**
 * 積み上げモード用の最大値を取得
 */
function getStackedMaxValues(data: NormalizedBarChartData): number[] {
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
 * 積み上げ値を計算
 */
function computeStackedValues(data: NormalizedBarChartData): NormalizedBarChartData {
	const stackedSeries = [...data.series];
	const cumulative = new Array<number>(data.xValues.length).fill(0);

	for (let s = 0; s < stackedSeries.length; s++) {
		const series = stackedSeries[s];
		if (!series) continue;
		const newValues: (number | null)[] = [];

		for (let i = 0; i < data.xValues.length; i++) {
			const value = series.values[i];
			if (value === null) {
				newValues.push(null);
			} else {
				const stacked = (cumulative[i] ?? 0) + value;
				cumulative[i] = stacked;
				newValues.push(stacked);
			}
		}

		stackedSeries[s] = { ...series, values: newValues };
	}

	return { xValues: data.xValues, series: stackedSeries };
}

/**
 * 連続した非null値の区間に分割する
 */
interface Segment {
	startIndex: number;
	values: number[];
}

function splitByNull(values: (number | null)[]): Segment[] {
	const segments: Segment[] = [];
	let current: Segment | null = null;

	for (let i = 0; i < values.length; i++) {
		const v = values[i];
		if (v !== null) {
			if (!current) {
				current = { startIndex: i, values: [] };
			}
			current.values.push(v);
		} else {
			if (current) {
				segments.push(current);
				current = null;
			}
		}
	}

	if (current) {
		segments.push(current);
	}

	return segments;
}

/**
 * エリアチャートをレンダリング
 */
export function renderAreaChart(data: AreaChartData, config?: Partial<AreaChartConfig>): string {
	const safeConfig = sanitizeConfig(config);

	// 1. ショートハンド正規化
	const chartData = normalizeAreaChartInput(data);

	// 2. データ正規化
	const normalizeConfig: {
		x?: string;
		y?: string | string[];
		color?: string | string[];
	} = {};
	if (safeConfig?.x) normalizeConfig.x = safeConfig.x;
	if (safeConfig?.y) normalizeConfig.y = safeConfig.y;
	if (safeConfig?.color) normalizeConfig.color = safeConfig.color;
	let normalized = normalizeChartData(chartData, normalizeConfig);

	// Infinity値をnullに変換
	normalized = sanitizeValues(normalized);

	// 空データチェック
	const hasAnyValue = normalized.series.some((s) => s.values.some((v) => v !== null));
	if (normalized.series.length === 0 || normalized.xValues.length === 0 || !hasAnyValue) {
		return '<div class="kt-area-chart kt-area-chart-empty">No data</div>';
	}

	// データポイント数の制限
	if (normalized.xValues.length > MAX_DATA_POINTS) {
		normalized = {
			xValues: normalized.xValues.slice(0, MAX_DATA_POINTS),
			series: normalized.series.map((s) => ({
				...s,
				values: s.values.slice(0, MAX_DATA_POINTS),
			})),
		};
	}

	// シリーズ数の制限
	if (normalized.series.length > MAX_SERIES) {
		normalized = {
			xValues: normalized.xValues,
			series: normalized.series.slice(0, MAX_SERIES),
		};
	}

	// 3. カラー再解決
	if (safeConfig?.color) {
		const colors = resolveChartColors(normalized.series.length, safeConfig.color);
		for (let i = 0; i < normalized.series.length; i++) {
			const s = normalized.series[i];
			if (s) s.color = colors[i] ?? s.color;
		}
	}

	// 4. SVG描画
	return renderAreaChartHtml(normalized, safeConfig);
}

/**
 * チャートレイアウト情報
 */
interface ChartLayout {
	height: number;
	marginLeft: number;
	plotWidth: number;
	plotHeight: number;
	showLegend: boolean;
}

/**
 * チャートレイアウトを計算
 */
function computeLayout(config?: Partial<AreaChartConfig>, seriesCount?: number): ChartLayout {
	const height = config?.height ?? DEFAULT_HEIGHT;
	const showLegend = (seriesCount ?? 0) > 1;
	const marginLeft = MARGIN.left + (config?.y_label ? Y_LABEL_MARGIN : 0);
	const marginBottom =
		MARGIN.bottom + (config?.x_label ? X_LABEL_MARGIN : 0) + (showLegend ? LEGEND_HEIGHT : 0);

	return {
		height,
		marginLeft,
		plotWidth: SVG_WIDTH - marginLeft - MARGIN.right,
		plotHeight: height - MARGIN.top - marginBottom,
		showLegend,
	};
}

/**
 * 軸ラベルを描画
 */
function renderAxisLabels(
	config: Partial<AreaChartConfig> | undefined,
	layout: ChartLayout,
): string {
	const parts: string[] = [];
	if (config?.x_label) {
		const labelY = MARGIN.top + layout.plotHeight + 35 + (layout.showLegend ? LEGEND_HEIGHT : 0);
		parts.push(
			renderHtml`<text class="kt-chart-x-label" x="${layout.marginLeft + layout.plotWidth / 2}" y="${labelY}" text-anchor="middle" font-size="12" fill="#495057">${config.x_label}</text>`,
		);
	}
	if (config?.y_label) {
		const labelX = 15;
		const labelY = MARGIN.top + layout.plotHeight / 2;
		parts.push(
			renderHtml`<text class="kt-chart-y-label" x="${labelX}" y="${labelY}" text-anchor="middle" transform="rotate(-90, ${labelX}, ${labelY})" font-size="12" fill="#495057">${config.y_label}</text>`,
		);
	}
	return parts.join("");
}

/**
 * エリア系列群を描画
 */
function renderAllSeries(
	data: NormalizedBarChartData,
	config: Partial<AreaChartConfig> | undefined,
	layout: ChartLayout,
	scaleY: (v: number) => number,
	baselineY: number,
): string {
	const isStacked = config?.stack === true && data.series.length > 1;
	const parts: string[] = [];

	if (isStacked) {
		const stacked = computeStackedValues(data);
		const categoryWidth = layout.plotWidth / data.xValues.length;
		for (let s = 0; s < stacked.series.length; s++) {
			const series = stacked.series[s];
			if (!series) continue;
			const prevSeries = s > 0 ? (stacked.series[s - 1] ?? null) : null;
			parts.push(
				renderStackedAreaSeries(
					series,
					prevSeries,
					data.xValues,
					layout.marginLeft,
					categoryWidth,
					scaleY,
					baselineY,
				),
			);
		}
	} else {
		const seriesOrder = [...data.series].reverse();
		for (const series of seriesOrder) {
			parts.push(
				renderAreaSeries(
					series,
					data.xValues,
					layout.marginLeft,
					layout.plotWidth,
					scaleY,
					baselineY,
				),
			);
		}
	}

	return parts.join("");
}

/**
 * エリアチャートHTMLレンダリング
 */
function renderAreaChartHtml(
	data: NormalizedBarChartData,
	config?: Partial<AreaChartConfig>,
): string {
	const layout = computeLayout(config, data.series.length);
	const title = config?.title;

	const isStacked = config?.stack === true && data.series.length > 1;
	const scaleValues = isStacked ? getStackedMaxValues(data) : getAllValues(data);
	const scale = calculateAxisScale(scaleValues);

	const scaleY = (v: number): number => {
		return (
			MARGIN.top +
			layout.plotHeight -
			((v - scale.min) / (scale.max - scale.min)) * layout.plotHeight
		);
	};

	const ariaLabel = title ? renderHtml`Area chart: ${title}` : "Area chart";
	const parts: string[] = [];

	parts.push(renderHtml`<figure class="kt-area-chart" role="img" aria-label="${raw(ariaLabel)}">`);
	if (title) {
		parts.push(renderHtml`<figcaption class="kt-area-chart-title">${title}</figcaption>`);
	}

	parts.push(
		renderHtml`<svg viewBox="0 0 ${SVG_WIDTH} ${layout.height}" width="100%" preserveAspectRatio="xMidYMid meet" class="kt-area-chart-svg" xmlns="http://www.w3.org/2000/svg">`,
	);
	parts.push(renderHtml`<title>${title ?? "Area chart"}</title>`);
	parts.push(
		title ? renderHtml`<desc>Area chart showing ${title}</desc>` : "<desc>Area chart</desc>",
	);

	parts.push(renderGrid(scale, layout.marginLeft, layout.plotWidth, scaleY));
	parts.push(renderYAxis(scale, layout.marginLeft, scaleY));
	parts.push(
		renderXAxis(data.xValues, layout.marginLeft, layout.plotWidth, MARGIN.top + layout.plotHeight),
	);

	const baselineY = scaleY(Math.max(0, scale.min));
	parts.push(renderAllSeries(data, config, layout, scaleY, baselineY));
	parts.push(renderAxisLabels(config, layout));

	if (layout.showLegend) {
		parts.push(renderLegend(data.series, layout.marginLeft, MARGIN.top + layout.plotHeight + 30));
	}

	parts.push("</svg>");
	parts.push("</figure>");
	return parts.join("");
}

/**
 * 単一系列のエリアを描画
 */
function renderAreaSeries(
	series: { name: string; values: (number | null)[]; color: string },
	xValues: (string | number)[],
	marginLeft: number,
	plotWidth: number,
	scaleY: (v: number) => number,
	baselineY: number,
): string {
	const parts: string[] = [];
	const categoryWidth = plotWidth / xValues.length;
	const useDefaultOpacity = !hasAlphaChannel(series.color);

	parts.push(renderHtml`<g class="kt-chart-area" data-series="${series.name}">`);

	// null値でセグメント分割
	const segments = splitByNull(series.values);

	for (const segment of segments) {
		const points = segment.values.map((v, i) => ({
			x: marginLeft + categoryWidth * (segment.startIndex + i) + categoryWidth / 2,
			y: scaleY(v),
		}));

		if (points.length === 0) continue;

		// 塗りつぶしパス
		const fillPath = buildAreaPath(points, baselineY);
		if (fillPath) {
			const opacityAttr = useDefaultOpacity ? ` fill-opacity="${DEFAULT_FILL_OPACITY}"` : "";
			parts.push(`<path d="${fillPath}" fill="${series.color}"${opacityAttr} stroke="none" />`);
		}

		// 境界線パス
		const strokePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
		parts.push(
			`<path d="${strokePath}" fill="none" stroke="${series.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`,
		);
	}

	parts.push(renderDataPoints(series, xValues, marginLeft, categoryWidth, scaleY));
	parts.push("</g>");
	return parts.join("");
}

/**
 * データポイントを描画
 */
function renderDataPoints(
	series: { values: (number | null)[]; color: string },
	xValues: (string | number)[],
	marginLeft: number,
	categoryWidth: number,
	scaleY: (v: number) => number,
): string {
	const parts: string[] = ['<g class="kt-chart-points">'];
	for (let i = 0; i < series.values.length; i++) {
		const value = series.values[i];
		if (value === null) continue;

		const cx = marginLeft + categoryWidth * i + categoryWidth / 2;
		const cy = scaleY(value);
		const label = String(xValues[i] ?? i);

		parts.push(
			renderHtml`<circle cx="${cx}" cy="${cy}" r="3" fill="${series.color}"><title>${label}: ${String(value)}</title></circle>`,
		);
	}
	parts.push("</g>");
	return parts.join("");
}

/**
 * 積み上げポイント座標を計算
 */
function computeStackedPoints(
	series: { values: (number | null)[] },
	prevSeries: { values: (number | null)[] } | null,
	xValues: (string | number)[],
	marginLeft: number,
	categoryWidth: number,
	scaleY: (v: number) => number,
	baselineY: number,
): {
	currentPoints: { x: number; y: number; value: number | null }[];
	prevPoints: { x: number; y: number }[];
} {
	const currentPoints: { x: number; y: number; value: number | null }[] = [];
	const prevPoints: { x: number; y: number }[] = [];

	for (let i = 0; i < xValues.length; i++) {
		const x = marginLeft + categoryWidth * i + categoryWidth / 2;
		const value = series.values[i];

		currentPoints.push({
			x,
			y: value !== null ? scaleY(value) : 0,
			value,
		});

		if (prevSeries) {
			const prevVal = prevSeries.values[i];
			prevPoints.push({
				x,
				y: prevVal !== null ? scaleY(prevVal) : baselineY,
			});
		}
	}

	return { currentPoints, prevPoints };
}

/**
 * 積み上げモードで単一系列のエリアを描画
 */
function renderStackedAreaSeries(
	series: { name: string; values: (number | null)[]; color: string },
	prevSeries: { name: string; values: (number | null)[]; color: string } | null,
	xValues: (string | number)[],
	marginLeft: number,
	categoryWidth: number,
	scaleY: (v: number) => number,
	baselineY: number,
): string {
	const parts: string[] = [];
	const useDefaultOpacity = !hasAlphaChannel(series.color);

	parts.push(renderHtml`<g class="kt-chart-area" data-series="${series.name}">`);

	const { currentPoints, prevPoints } = computeStackedPoints(
		series,
		prevSeries,
		xValues,
		marginLeft,
		categoryWidth,
		scaleY,
		baselineY,
	);

	const validPoints = currentPoints.filter((p) => p.value !== null);
	if (validPoints.length > 0) {
		const fillPath = buildStackedAreaPath(
			validPoints.map((p) => ({ x: p.x, y: p.y })),
			prevSeries ? prevPoints.filter((_, i) => currentPoints[i]?.value !== null) : [],
			baselineY,
		);
		if (fillPath) {
			const opacityAttr = useDefaultOpacity ? ` fill-opacity="${DEFAULT_FILL_OPACITY}"` : "";
			parts.push(`<path d="${fillPath}" fill="${series.color}"${opacityAttr} stroke="none" />`);
		}

		const strokePath = validPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
		parts.push(
			`<path d="${strokePath}" fill="none" stroke="${series.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`,
		);
	}

	parts.push(renderDataPoints(series, xValues, marginLeft, categoryWidth, scaleY));
	parts.push("</g>");
	return parts.join("");
}

/**
 * エリアの閉じたパスを構築（非積み上げ）
 */
function buildAreaPath(points: { x: number; y: number }[], baselineY: number): string {
	if (points.length === 0) return "";

	const upperPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

	const lastPoint = points[points.length - 1];
	const firstPoint = points[0];
	if (!lastPoint || !firstPoint) return "";

	const lowerPath = `L${lastPoint.x},${baselineY} L${firstPoint.x},${baselineY} Z`;

	return `${upperPath} ${lowerPath}`;
}

/**
 * 積み上げエリアの閉じたパスを構築
 */
function buildStackedAreaPath(
	currentPoints: { x: number; y: number }[],
	prevPoints: { x: number; y: number }[],
	baselineY: number,
): string {
	if (currentPoints.length === 0) return "";

	// 上辺: 左→右（現在の系列）
	const upperPath = currentPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

	// 下辺: 右→左（前の系列 or ベースライン）
	let lowerPath: string;
	if (prevPoints.length > 0) {
		lowerPath = `${[...prevPoints]
			.reverse()
			.map((p) => `L${p.x},${p.y}`)
			.join(" ")} Z`;
	} else {
		const lastPoint = currentPoints[currentPoints.length - 1];
		const firstPoint = currentPoints[0];
		if (!lastPoint || !firstPoint) return "";
		lowerPath = `L${lastPoint.x},${baselineY} L${firstPoint.x},${baselineY} Z`;
	}

	return `${upperPath} ${lowerPath}`;
}
