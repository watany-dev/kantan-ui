/**
 * BarChart 実装
 *
 * ショートハンド正規化、ソート、SVG描画を提供する。
 */

import { escapeHtml } from "../../utils/html";
import { resolveChartColors } from "./colors";
import { normalizeChartData } from "./normalize";
import { calculateAxisScale, formatTickValue } from "./scale";
import type { BarChartConfig, BarChartData, ChartData, NormalizedBarChartData } from "./types";

/** SVG viewBox 幅 */
const SVG_WIDTH = 600;

/** デフォルトの高さ */
const DEFAULT_HEIGHT = 400;

/** マージン */
const MARGIN = { top: 20, right: 20, bottom: 40, left: 60 };

/** y軸ラベルの追加マージン */
const Y_LABEL_MARGIN = 20;

/** x軸ラベルの追加マージン */
const X_LABEL_MARGIN = 20;

/** 凡例の高さ */
const LEGEND_HEIGHT = 25;

/**
 * ショートハンド形式を ChartData に変換
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

/**
 * バーチャートをレンダリング
 *
 * BarChartData → HTML文字列（figure > svg）
 */
export function renderBarChart(data: BarChartData, config?: Partial<BarChartConfig>): string {
	// 1. ショートハンド正規化
	const chartData = normalizeBarChartInput(data);

	// 2. データ正規化
	const normalizeConfig: { x?: string; y?: string | string[]; color?: string | string[] } = {};
	if (config?.x) normalizeConfig.x = config.x;
	if (config?.y) normalizeConfig.y = config.y;
	if (config?.color) normalizeConfig.color = config.color;
	const normalized = normalizeChartData(chartData, normalizeConfig);

	// 空データ
	if (normalized.series.length === 0 || normalized.xValues.length === 0) {
		return '<div class="kt-bar-chart kt-bar-chart-empty">No data</div>';
	}

	// 3. カラー再解決（configのカラーを優先）
	if (config?.color) {
		const colors = resolveChartColors(normalized.series.length, config.color);
		for (let i = 0; i < normalized.series.length; i++) {
			const s = normalized.series[i];
			if (s) s.color = colors[i] ?? s.color;
		}
	}

	// 4. ソート適用
	const sorted = applySortOrder(normalized, config?.sort);

	// 5. SVG描画
	return renderBarChartHtml(sorted, config);
}

/**
 * HTMLレンダリング
 */
function renderBarChartHtml(
	data: NormalizedBarChartData,
	config?: Partial<BarChartConfig>,
): string {
	const height = config?.height ?? DEFAULT_HEIGHT;
	const title = config?.title;
	const showLegend = data.series.length > 1;

	const marginLeft = MARGIN.left + (config?.y_label ? Y_LABEL_MARGIN : 0);
	const marginBottom =
		MARGIN.bottom + (config?.x_label ? X_LABEL_MARGIN : 0) + (showLegend ? LEGEND_HEIGHT : 0);

	const plotWidth = SVG_WIDTH - marginLeft - MARGIN.right;
	const plotHeight = height - MARGIN.top - marginBottom;

	// y軸スケール計算
	const allValues = data.series.flatMap((s) => s.values.filter((v): v is number => v !== null));
	const scale = calculateAxisScale(allValues);

	const scaleY = (v: number): number => {
		return MARGIN.top + plotHeight - ((v - scale.min) / (scale.max - scale.min)) * plotHeight;
	};

	const ariaLabel = title ? `Bar chart: ${escapeHtml(title)}` : "Bar chart";

	const parts: string[] = [];

	// figure
	parts.push(`<figure class="kt-bar-chart" role="img" aria-label="${ariaLabel}">`);

	// title
	if (title) {
		parts.push(`<figcaption class="kt-bar-chart-title">${escapeHtml(title)}</figcaption>`);
	}

	// svg
	parts.push(
		`<svg viewBox="0 0 ${SVG_WIDTH} ${height}" width="100%" preserveAspectRatio="xMidYMid meet" class="kt-bar-chart-svg" xmlns="http://www.w3.org/2000/svg">`,
	);
	parts.push(`<title>${escapeHtml(title ?? "Bar chart")}</title>`);
	parts.push(`<desc>Bar chart${title ? ` showing ${escapeHtml(title)}` : ""}</desc>`);

	// グリッド
	parts.push(renderGrid(scale, marginLeft, plotWidth, scaleY));

	// y軸
	parts.push(renderYAxis(scale, marginLeft, scaleY));

	// x軸
	parts.push(renderXAxis(data.xValues, marginLeft, plotWidth, MARGIN.top + plotHeight));

	// バー（単一シリーズ）
	parts.push(renderBars(data, marginLeft, plotWidth, scaleY, scale));

	// 軸ラベル
	if (config?.x_label) {
		const labelY = MARGIN.top + plotHeight + 35 + (showLegend ? LEGEND_HEIGHT : 0);
		parts.push(
			`<text class="kt-chart-x-label" x="${marginLeft + plotWidth / 2}" y="${labelY}" text-anchor="middle" font-size="12" fill="#495057">${escapeHtml(config.x_label)}</text>`,
		);
	}

	if (config?.y_label) {
		const labelX = 15;
		const labelY = MARGIN.top + plotHeight / 2;
		parts.push(
			`<text class="kt-chart-y-label" x="${labelX}" y="${labelY}" text-anchor="middle" transform="rotate(-90, ${labelX}, ${labelY})" font-size="12" fill="#495057">${escapeHtml(config.y_label)}</text>`,
		);
	}

	// 凡例（複数シリーズ時のみ）
	if (showLegend) {
		parts.push(renderLegend(data, marginLeft, MARGIN.top + plotHeight + 30));
	}

	parts.push("</svg>");
	parts.push("</figure>");

	return parts.join("");
}

/**
 * グリッド線
 */
function renderGrid(
	scale: { min: number; max: number; step: number; ticks: number[] },
	marginLeft: number,
	plotWidth: number,
	scaleY: (v: number) => number,
): string {
	const parts: string[] = ['<g class="kt-chart-grid">'];
	for (const tick of scale.ticks) {
		const y = scaleY(tick);
		parts.push(
			`<line x1="${marginLeft}" y1="${y}" x2="${marginLeft + plotWidth}" y2="${y}" stroke="#e9ecef" stroke-width="1" />`,
		);
	}
	parts.push("</g>");
	return parts.join("");
}

/**
 * y軸
 */
function renderYAxis(
	scale: { min: number; max: number; step: number; ticks: number[] },
	marginLeft: number,
	scaleY: (v: number) => number,
): string {
	const parts: string[] = ['<g class="kt-chart-axis-y">'];
	// 軸線
	parts.push(
		`<line x1="${marginLeft}" y1="${scaleY(scale.max)}" x2="${marginLeft}" y2="${scaleY(scale.min)}" stroke="#dee2e6" stroke-width="1" />`,
	);
	for (const tick of scale.ticks) {
		const y = scaleY(tick);
		parts.push(
			`<text x="${marginLeft - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#6c757d">${formatTickValue(tick)}</text>`,
		);
	}
	parts.push("</g>");
	return parts.join("");
}

/**
 * x軸
 */
function renderXAxis(
	xValues: (string | number)[],
	marginLeft: number,
	plotWidth: number,
	baseY: number,
): string {
	const parts: string[] = ['<g class="kt-chart-axis-x">'];
	// 軸線
	parts.push(
		`<line x1="${marginLeft}" y1="${baseY}" x2="${marginLeft + plotWidth}" y2="${baseY}" stroke="#dee2e6" stroke-width="1" />`,
	);

	const categoryWidth = plotWidth / xValues.length;
	for (let i = 0; i < xValues.length; i++) {
		const label = String(xValues[i] ?? "");
		const x = marginLeft + categoryWidth * i + categoryWidth / 2;
		parts.push(
			`<text x="${x}" y="${baseY + 16}" text-anchor="middle" font-size="11" fill="#6c757d">${escapeHtml(label)}</text>`,
		);
	}

	parts.push("</g>");
	return parts.join("");
}

/**
 * バー描画（単一シリーズ）
 */
function renderBars(
	data: NormalizedBarChartData,
	marginLeft: number,
	plotWidth: number,
	scaleY: (v: number) => number,
	scale: { min: number; max: number },
): string {
	const parts: string[] = [];
	const categoryWidth = plotWidth / data.xValues.length;
	const zeroY = scaleY(Math.max(0, scale.min));

	for (const series of data.series) {
		parts.push(`<g class="kt-chart-bars" data-series="${escapeHtml(series.name)}">`);

		const barWidth = categoryWidth * 0.6;

		for (let i = 0; i < data.xValues.length; i++) {
			const value = series.values[i];
			if (value === null || value === undefined) continue;

			const barX = marginLeft + categoryWidth * i + (categoryWidth - barWidth) / 2;
			const barY = value >= 0 ? scaleY(value) : zeroY;
			const barHeight = Math.abs(scaleY(value) - zeroY);

			parts.push(
				`<rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" fill="${escapeHtml(series.color)}" rx="2" />`,
			);
		}

		parts.push("</g>");
	}

	return parts.join("");
}

/**
 * 凡例
 */
function renderLegend(data: NormalizedBarChartData, startX: number, y: number): string {
	const parts: string[] = ['<g class="kt-chart-legend">'];
	let x = startX;

	for (const series of data.series) {
		parts.push(
			`<rect x="${x}" y="${y}" width="10" height="10" fill="${escapeHtml(series.color)}" />`,
		);
		parts.push(
			`<text x="${x + 14}" y="${y + 9}" font-size="11" fill="#495057">${escapeHtml(series.name)}</text>`,
		);
		x += 80;
	}

	parts.push("</g>");
	return parts.join("");
}
