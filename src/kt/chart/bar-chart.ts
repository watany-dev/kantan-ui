/**
 * BarChart 実装
 *
 * ショートハンド正規化、ソート、SVG描画を提供する。
 */

import { raw, renderHtml } from "../../utils/html";
import { isValidColor, resolveChartColors } from "./colors";
import { normalizeChartData } from "./normalize";
import { calculateAxisScale, formatTickValue } from "./scale";
import type { BarChartConfig, BarChartData, ChartData, NormalizedBarChartData } from "./types";

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
	// 0. カラーバリデーション（無効な色はデフォルトにフォールバック）
	const safeConfig = sanitizeConfig(config);

	// 1. ショートハンド正規化
	const chartData = normalizeBarChartInput(data);

	// 2. データ正規化
	const normalizeConfig: { x?: string; y?: string | string[]; color?: string | string[] } = {};
	if (safeConfig?.x) normalizeConfig.x = safeConfig.x;
	if (safeConfig?.y) normalizeConfig.y = safeConfig.y;
	if (safeConfig?.color) normalizeConfig.color = safeConfig.color;
	let normalized = normalizeChartData(chartData, normalizeConfig);

	// Infinity値をnullに変換
	normalized = sanitizeValues(normalized);

	// 空データチェック（全シリーズの値がすべてnullの場合も含む）
	const hasAnyValue = normalized.series.some((s) => s.values.some((v) => v !== null));
	if (normalized.series.length === 0 || normalized.xValues.length === 0 || !hasAnyValue) {
		return '<div class="kt-bar-chart kt-bar-chart-empty">No data</div>';
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

	// 3. カラー再解決（configのカラーを優先）
	if (safeConfig?.color) {
		const colors = resolveChartColors(normalized.series.length, safeConfig.color);
		for (let i = 0; i < normalized.series.length; i++) {
			const s = normalized.series[i];
			if (s) s.color = colors[i] ?? s.color;
		}
	}

	// 4. ソート適用
	const sorted = applySortOrder(normalized, safeConfig?.sort);

	// 5. SVG描画
	return renderBarChartHtml(sorted, safeConfig);
}

/**
 * 設定をサニタイズ
 */
function sanitizeConfig(config?: Partial<BarChartConfig>): Partial<BarChartConfig> | undefined {
	if (!config) return config;

	const sanitized = { ...config };

	// 高さの検証
	if (sanitized.height !== undefined && sanitized.height <= 0) {
		sanitized.height = DEFAULT_HEIGHT;
	}

	// カラーの検証
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
		parts.push(renderLegend(data, marginLeft, MARGIN.top + plotHeight + 30));
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
	parts.push(renderHorizontalGrid(scale, marginLeft, plotWidth, MARGIN.top, plotHeight, scaleX));

	// 横向きx軸（値軸 → 下）
	parts.push(
		renderHorizontalValueAxis(scale, marginLeft, plotWidth, MARGIN.top + plotHeight, scaleX),
	);

	// 横向きy軸（カテゴリ軸 → 左）
	parts.push(renderHorizontalCategoryAxis(data.xValues, marginLeft, MARGIN.top, plotHeight));

	// 横向きバー
	if (isStacked) {
		parts.push(renderHorizontalStackedBars(data, marginLeft, plotHeight, scaleX));
	} else {
		parts.push(renderHorizontalGroupedBars(data, marginLeft, plotHeight, scaleX, scale));
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
			renderHtml`<text x="${x}" y="${baseY + 16}" text-anchor="middle" font-size="11" fill="#6c757d">${label}</text>`,
		);
	}

	parts.push("</g>");
	return parts.join("");
}

/**
 * 全データ値を取得（グループ化モード用）
 */
function getAllValues(data: NormalizedBarChartData): number[] {
	return data.series.flatMap((s) => s.values.filter((v): v is number => v !== null));
}

/**
 * 積み上げモード用の最大値を取得
 * 各カテゴリのシリーズ合計値を返す
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

/**
 * 凡例
 */
function renderLegend(data: NormalizedBarChartData, startX: number, y: number): string {
	const parts: string[] = ['<g class="kt-chart-legend">'];
	let x = startX;

	for (const series of data.series) {
		parts.push(
			renderHtml`<rect x="${x}" y="${y}" width="10" height="10" fill="${series.color}" />`,
		);
		parts.push(
			renderHtml`<text x="${x + 14}" y="${y + 9}" font-size="11" fill="#495057">${series.name}</text>`,
		);
		x += 80;
	}

	parts.push("</g>");
	return parts.join("");
}

// ===== 横向きバーチャート用レンダリング関数 =====

/**
 * 横向きグリッド（値軸の縦線）
 */
function renderHorizontalGrid(
	scale: { ticks: number[] },
	_marginLeft: number,
	_plotWidth: number,
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
	_marginLeft: number,
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
	_marginLeft: number,
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
