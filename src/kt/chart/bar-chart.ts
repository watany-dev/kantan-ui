/**
 * BarChart 実装
 *
 * ショートハンド正規化、ソート、SVG描画を提供する。
 */

import { raw, renderHtml } from "../../utils/html";
import { renderGrid, renderLegend, renderXAxis, renderYAxis } from "./render-utils";
import { calculateAxisScale, formatTickValue } from "./scale";
import {
	DEFAULT_HEIGHT,
	getAllValues,
	getStackedMaxValues,
	LEGEND_HEIGHT,
	MARGIN,
	prepareChartData,
	SVG_WIDTH,
	sanitizeConfig,
	X_LABEL_MARGIN,
	Y_LABEL_MARGIN,
} from "./shared";
import type { BarChartConfig, BarChartData, ChartData, NormalizedBarChartData } from "./types";

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
	const safeConfig = sanitizeConfig(config);

	// 1. ショートハンド正規化
	const chartData = normalizeBarChartInput(data);

	// 2. 共通前処理パイプライン
	const normalized = prepareChartData(chartData, safeConfig);
	if (!normalized) {
		return '<div class="kt-bar-chart kt-bar-chart-empty">No data</div>';
	}

	// 3. ソート適用
	const sorted = applySortOrder(normalized, safeConfig?.sort);

	// 4. SVG描画
	return renderBarChartHtml(sorted, safeConfig);
}

/**
 * HTMLレンダリング
 */
function renderBarChartHtml(
	data: NormalizedBarChartData,
	config?: Partial<BarChartConfig>,
): string {
	const horizontal = config?.horizontal === true;

	if (horizontal) {
		return renderHorizontalBarChartHtml(data, config);
	}
	return renderVerticalBarChartHtml(data, config);
}

/**
 * 縦棒グラフHTMLレンダリング
 */
function renderVerticalBarChartHtml(
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

	const isStacked = config?.stack !== false && data.series.length > 1;
	const scaleValues = isStacked ? getStackedMaxValues(data) : getAllValues(data);
	const scale = calculateAxisScale(scaleValues);

	const scaleY = (v: number): number => {
		return MARGIN.top + plotHeight - ((v - scale.min) / (scale.max - scale.min)) * plotHeight;
	};

	const ariaLabel = title ? renderHtml`Bar chart: ${title}` : "Bar chart";
	const parts: string[] = [];

	parts.push(renderHtml`<figure class="kt-bar-chart" role="img" aria-label="${raw(ariaLabel)}">`);
	if (title) {
		parts.push(renderHtml`<figcaption class="kt-bar-chart-title">${title}</figcaption>`);
	}

	parts.push(
		renderHtml`<svg viewBox="0 0 ${SVG_WIDTH} ${height}" width="100%" preserveAspectRatio="xMidYMid meet" class="kt-bar-chart-svg" xmlns="http://www.w3.org/2000/svg">`,
	);
	parts.push(renderHtml`<title>${title ?? "Bar chart"}</title>`);
	parts.push(
		title ? renderHtml`<desc>Bar chart showing ${title}</desc>` : "<desc>Bar chart</desc>",
	);

	parts.push(renderGrid(scale, marginLeft, plotWidth, scaleY));
	parts.push(renderYAxis(scale, marginLeft, scaleY));
	parts.push(renderXAxis(data.xValues, marginLeft, plotWidth, MARGIN.top + plotHeight));

	if (isStacked) {
		parts.push(renderStackedBars(data, marginLeft, plotWidth, scaleY, scale));
	} else {
		parts.push(renderGroupedBars(data, marginLeft, plotWidth, scaleY, scale));
	}

	if (config?.x_label) {
		const labelY = MARGIN.top + plotHeight + 35 + (showLegend ? LEGEND_HEIGHT : 0);
		parts.push(
			renderHtml`<text class="kt-chart-x-label" x="${marginLeft + plotWidth / 2}" y="${labelY}" text-anchor="middle" font-size="12" fill="#495057">${config.x_label}</text>`,
		);
	}
	if (config?.y_label) {
		const labelX = 15;
		const labelY = MARGIN.top + plotHeight / 2;
		parts.push(
			renderHtml`<text class="kt-chart-y-label" x="${labelX}" y="${labelY}" text-anchor="middle" transform="rotate(-90, ${labelX}, ${labelY})" font-size="12" fill="#495057">${config.y_label}</text>`,
		);
	}

	if (showLegend) {
		parts.push(renderLegend(data.series, marginLeft, MARGIN.top + plotHeight + 30));
	}

	parts.push("</svg>");
	parts.push("</figure>");
	return parts.join("");
}

/**
 * 横向きバーチャートHTMLレンダリング
 */
function renderHorizontalBarChartHtml(
	data: NormalizedBarChartData,
	config?: Partial<BarChartConfig>,
): string {
	const height = config?.height ?? DEFAULT_HEIGHT;
	const title = config?.title;
	const showLegend = data.series.length > 1;

	// 横向きの場合、左マージンを広めにしてカテゴリラベルを配置
	const marginLeft = MARGIN.left + 20 + (config?.y_label ? Y_LABEL_MARGIN : 0);
	const marginBottom =
		MARGIN.bottom + (config?.x_label ? X_LABEL_MARGIN : 0) + (showLegend ? LEGEND_HEIGHT : 0);

	const plotWidth = SVG_WIDTH - marginLeft - MARGIN.right;
	const plotHeight = height - MARGIN.top - marginBottom;

	const isStacked = config?.stack !== false && data.series.length > 1;
	const scaleValues = isStacked ? getStackedMaxValues(data) : getAllValues(data);
	const scale = calculateAxisScale(scaleValues);

	// 横向き: x軸（値軸）スケール
	const scaleX = (v: number): number => {
		return marginLeft + ((v - scale.min) / (scale.max - scale.min)) * plotWidth;
	};

	const ariaLabel = title ? renderHtml`Bar chart: ${title}` : "Bar chart";
	const parts: string[] = [];

	parts.push(renderHtml`<figure class="kt-bar-chart" role="img" aria-label="${raw(ariaLabel)}">`);
	if (title) {
		parts.push(renderHtml`<figcaption class="kt-bar-chart-title">${title}</figcaption>`);
	}

	parts.push(
		renderHtml`<svg viewBox="0 0 ${SVG_WIDTH} ${height}" width="100%" preserveAspectRatio="xMidYMid meet" class="kt-bar-chart-svg" xmlns="http://www.w3.org/2000/svg">`,
	);
	parts.push(renderHtml`<title>${title ?? "Bar chart"}</title>`);
	parts.push(
		title ? renderHtml`<desc>Bar chart showing ${title}</desc>` : "<desc>Bar chart</desc>",
	);

	// 横向きグリッド（値軸の縦線）
	parts.push(renderHorizontalGrid(scale, marginLeft, MARGIN.top, plotHeight, scaleX));

	// 横向きx軸（値軸 → 下）
	parts.push(
		renderHorizontalValueAxis(scale, marginLeft, plotWidth, MARGIN.top + plotHeight, scaleX),
	);

	// 横向きy軸（カテゴリ軸 → 左）
	parts.push(renderHorizontalCategoryAxis(data.xValues, marginLeft, MARGIN.top, plotHeight));

	// 横向きバー
	if (isStacked) {
		parts.push(renderHorizontalStackedBars(data, plotHeight, scaleX));
	} else {
		parts.push(renderHorizontalGroupedBars(data, plotHeight, scaleX, scale));
	}

	if (config?.x_label) {
		const labelY = MARGIN.top + plotHeight + 35 + (showLegend ? LEGEND_HEIGHT : 0);
		parts.push(
			renderHtml`<text class="kt-chart-x-label" x="${marginLeft + plotWidth / 2}" y="${labelY}" text-anchor="middle" font-size="12" fill="#495057">${config.x_label}</text>`,
		);
	}
	if (config?.y_label) {
		const labelX = 15;
		const labelY = MARGIN.top + plotHeight / 2;
		parts.push(
			renderHtml`<text class="kt-chart-y-label" x="${labelX}" y="${labelY}" text-anchor="middle" transform="rotate(-90, ${labelX}, ${labelY})" font-size="12" fill="#495057">${config.y_label}</text>`,
		);
	}

	if (showLegend) {
		parts.push(renderLegend(data.series, marginLeft, MARGIN.top + plotHeight + 30));
	}

	parts.push("</svg>");
	parts.push("</figure>");
	return parts.join("");
}

/**
 * グループ化バー描画（stack: false）
 */
function renderGroupedBars(
	data: NormalizedBarChartData,
	marginLeft: number,
	plotWidth: number,
	scaleY: (v: number) => number,
	scale: { min: number; max: number },
): string {
	const parts: string[] = [];
	const categoryWidth = plotWidth / data.xValues.length;
	const groupWidth = categoryWidth * 0.8;
	const barWidth = groupWidth / data.series.length;
	const zeroY = scaleY(Math.max(0, scale.min));

	for (const [seriesIdx, series] of data.series.entries()) {
		parts.push(renderHtml`<g class="kt-chart-bars" data-series="${series.name}">`);

		for (let i = 0; i < data.xValues.length; i++) {
			const value = series.values[i];
			if (value === null || value === undefined) continue;

			const barX = marginLeft + categoryWidth * i + categoryWidth * 0.1 + seriesIdx * barWidth;
			const barY = value >= 0 ? scaleY(value) : zeroY;
			const barHeight = Math.abs(scaleY(value) - zeroY);

			parts.push(
				renderHtml`<rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" fill="${series.color}" rx="2" />`,
			);
		}

		parts.push("</g>");
	}

	return parts.join("");
}

/**
 * 積み上げバー描画（stack: true）
 */
function renderStackedBars(
	data: NormalizedBarChartData,
	marginLeft: number,
	plotWidth: number,
	scaleY: (v: number) => number,
	_scale: { min: number; max: number },
): string {
	const parts: string[] = [];
	const categoryWidth = plotWidth / data.xValues.length;
	const barWidth = categoryWidth * 0.6;

	// 各カテゴリごとの累積値を追跡
	const cumulative = new Array<number>(data.xValues.length).fill(0);

	for (const series of data.series) {
		parts.push(renderHtml`<g class="kt-chart-bars" data-series="${series.name}">`);

		for (let i = 0; i < data.xValues.length; i++) {
			const value = series.values[i];
			if (value === null || value === undefined) continue;

			const base = cumulative[i] ?? 0;
			const top = base + value;

			const barX = marginLeft + categoryWidth * i + (categoryWidth - barWidth) / 2;
			const barY = scaleY(top);
			const barHeight = Math.abs(scaleY(base) - scaleY(top));

			parts.push(
				renderHtml`<rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" fill="${series.color}" rx="2" />`,
			);

			cumulative[i] = top;
		}

		parts.push("</g>");
	}

	return parts.join("");
}

// ===== 横向きバーチャート用レンダリング関数 =====

/**
 * 横向きグリッド（値軸の縦線）
 */
function renderHorizontalGrid(
	scale: { ticks: number[] },
	_marginLeft: number,
	marginTop: number,
	plotHeight: number,
	scaleX: (v: number) => number,
): string {
	const parts: string[] = ['<g class="kt-chart-grid">'];
	for (const tick of scale.ticks) {
		const x = scaleX(tick);
		parts.push(
			`<line x1="${x}" y1="${marginTop}" x2="${x}" y2="${marginTop + plotHeight}" stroke="#e9ecef" stroke-width="1" />`,
		);
	}
	parts.push("</g>");
	return parts.join("");
}

/**
 * 横向き値軸（x軸 → 下）
 */
function renderHorizontalValueAxis(
	scale: { ticks: number[] },
	marginLeft: number,
	plotWidth: number,
	baseY: number,
	scaleX: (v: number) => number,
): string {
	const parts: string[] = ['<g class="kt-chart-axis-x">'];
	parts.push(
		`<line x1="${marginLeft}" y1="${baseY}" x2="${marginLeft + plotWidth}" y2="${baseY}" stroke="#dee2e6" stroke-width="1" />`,
	);
	for (const tick of scale.ticks) {
		const x = scaleX(tick);
		parts.push(
			`<text x="${x}" y="${baseY + 16}" text-anchor="middle" font-size="11" fill="#6c757d">${formatTickValue(tick)}</text>`,
		);
	}
	parts.push("</g>");
	return parts.join("");
}

/**
 * 横向きカテゴリ軸（y軸 → 左）
 */
function renderHorizontalCategoryAxis(
	xValues: (string | number)[],
	marginLeft: number,
	marginTop: number,
	plotHeight: number,
): string {
	const parts: string[] = ['<g class="kt-chart-axis-y">'];
	parts.push(
		`<line x1="${marginLeft}" y1="${marginTop}" x2="${marginLeft}" y2="${marginTop + plotHeight}" stroke="#dee2e6" stroke-width="1" />`,
	);

	const categoryHeight = plotHeight / xValues.length;
	for (let i = 0; i < xValues.length; i++) {
		const label = String(xValues[i] ?? "");
		const y = marginTop + categoryHeight * i + categoryHeight / 2;
		parts.push(
			renderHtml`<text x="${marginLeft - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#6c757d">${label}</text>`,
		);
	}

	parts.push("</g>");
	return parts.join("");
}

/**
 * 横向きグループ化バー
 */
function renderHorizontalGroupedBars(
	data: NormalizedBarChartData,
	plotHeight: number,
	scaleX: (v: number) => number,
	scale: { min: number; max: number },
): string {
	const parts: string[] = [];
	const categoryHeight = plotHeight / data.xValues.length;
	const groupHeight = categoryHeight * 0.8;
	const barHeight = groupHeight / data.series.length;
	const zeroX = scaleX(Math.max(0, scale.min));

	for (const [seriesIdx, series] of data.series.entries()) {
		parts.push(renderHtml`<g class="kt-chart-bars" data-series="${series.name}">`);

		for (let i = 0; i < data.xValues.length; i++) {
			const value = series.values[i];
			if (value === null || value === undefined) continue;

			const barY = MARGIN.top + categoryHeight * i + categoryHeight * 0.1 + seriesIdx * barHeight;
			const barX = value >= 0 ? zeroX : scaleX(value);
			const barW = Math.abs(scaleX(value) - zeroX);

			parts.push(
				renderHtml`<rect x="${barX}" y="${barY}" width="${barW}" height="${barHeight}" fill="${series.color}" rx="2" />`,
			);
		}

		parts.push("</g>");
	}

	return parts.join("");
}

/**
 * 横向き積み上げバー
 */
function renderHorizontalStackedBars(
	data: NormalizedBarChartData,
	plotHeight: number,
	scaleX: (v: number) => number,
): string {
	const parts: string[] = [];
	const categoryHeight = plotHeight / data.xValues.length;
	const barHeight = categoryHeight * 0.6;
	const cumulative = new Array<number>(data.xValues.length).fill(0);

	for (const series of data.series) {
		parts.push(renderHtml`<g class="kt-chart-bars" data-series="${series.name}">`);

		for (let i = 0; i < data.xValues.length; i++) {
			const value = series.values[i];
			if (value === null || value === undefined) continue;

			const base = cumulative[i] ?? 0;
			const top = base + value;

			const barY = MARGIN.top + categoryHeight * i + (categoryHeight - barHeight) / 2;
			const barX = scaleX(base);
			const barW = Math.abs(scaleX(top) - scaleX(base));

			parts.push(
				renderHtml`<rect x="${barX}" y="${barY}" width="${barW}" height="${barHeight}" fill="${series.color}" rx="2" />`,
			);

			cumulative[i] = top;
		}

		parts.push("</g>");
	}

	return parts.join("");
}
