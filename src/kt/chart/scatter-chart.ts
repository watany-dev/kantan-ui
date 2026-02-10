/**
 * ScatterChart 実装
 *
 * 散布図のSVG描画を提供する。
 * 専用の正規化パイプラインを使用（normalizeChartDataは不使用）。
 */

import { raw, renderHtml } from "../../utils/html";
import { isValidColor, resolveChartColors } from "./colors";
import {
	renderNumericXAxis,
	renderScatterLegend,
	renderVerticalGrid,
	renderYAxis,
} from "./render-utils";
import { calculateAxisScale, formatTickValue } from "./scale";
import type {
	NormalizedScatterData,
	ScatterChartConfig,
	ScatterChartData,
	ScatterGroup,
	ScatterPoint,
} from "./types";

/** SVG viewBox 幅 */
const SVG_WIDTH = 600;

/** デフォルトの高さ */
const DEFAULT_HEIGHT = 400;

/** デフォルトのポイント半径 */
const DEFAULT_SIZE = 5;

/** デフォルトの透明度 */
const DEFAULT_OPACITY = 0.7;

/** データポイントの最大数 */
const MAX_DATA_POINTS = 10_000;

/** グループの最大数 */
const MAX_GROUPS = 20;

/** サイズ範囲（ピクセル半径） */
const SIZE_RANGE = { min: 3, max: 20 };

/** マージン */
const MARGIN = { top: 20, right: 20, bottom: 40, left: 60 };

/** y軸ラベルの追加マージン */
const Y_LABEL_MARGIN = 20;

/** x軸ラベルの追加マージン */
const X_LABEL_MARGIN = 20;

/** 凡例の高さ */
const LEGEND_HEIGHT = 25;

// ============================================================
// 正規化パイプライン
// ============================================================

/**
 * カラムが数値かどうか判定
 */
function isNumericColumn(data: Record<string, unknown>[], key: string): boolean {
	return data.some((row) => typeof row[key] === "number");
}

/**
 * x, y に使用するカラムを自動判定する
 */
function resolveScatterColumns(
	data: Record<string, unknown>[],
	config?: { x?: string; y?: string | string[]; color?: string | string[]; size?: string | number },
): { xKey: string; yKeys: string[] } {
	const firstRow = data[0];
	if (!firstRow) return { xKey: "", yKeys: [] };

	const keys = Object.keys(firstRow);
	const numericKeys = keys.filter((k) => isNumericColumn(data, k));

	// colorカラム・sizeカラムを除外
	const excludeKeys = new Set<string>();
	if (typeof config?.color === "string" && keys.includes(config.color)) {
		excludeKeys.add(config.color);
	}
	if (typeof config?.size === "string" && keys.includes(config.size)) {
		excludeKeys.add(config.size);
	}

	const availableNumeric = numericKeys.filter((k) => !excludeKeys.has(k));

	const xKey = config?.x ?? availableNumeric[0] ?? "";

	const yKeys = config?.y
		? Array.isArray(config.y)
			? config.y
			: [config.y]
		: availableNumeric.filter((k) => k !== xKey);

	return { xKey, yKeys };
}

/**
 * color パラメータの用途を判定する
 */
function resolveColorUsage(
	color: string | string[] | undefined,
	columnNames: string[],
):
	| { usage: "column"; columnName: string }
	| { usage: "value"; colors: string[] }
	| { usage: "none" } {
	if (color === undefined) return { usage: "none" };

	if (Array.isArray(color)) {
		return { usage: "value", colors: color };
	}

	if (columnNames.includes(color)) {
		return { usage: "column", columnName: color };
	}

	return { usage: "value", colors: [color] };
}

/**
 * 1行からScatterPointを生成
 */
function toPoint(
	row: Record<string, unknown>,
	xKey: string,
	yKey: string,
	sizeConfig: string | number | undefined,
	defaultSize: number,
): ScatterPoint | null {
	const x = Number(row[xKey]);
	const y = Number(row[yKey]);
	if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

	let size = defaultSize;
	if (typeof sizeConfig === "number") {
		size = sizeConfig;
	} else if (typeof sizeConfig === "string") {
		const rawSize = Number(row[sizeConfig]);
		if (Number.isFinite(rawSize)) {
			size = rawSize; // mapPointSizes で後処理
		}
	}

	return { x, y, size };
}

/**
 * グループ分けを実行する
 */
function extractGroups(
	data: Record<string, unknown>[],
	xKey: string,
	yKeys: string[],
	colorUsage: ReturnType<typeof resolveColorUsage>,
	sizeConfig: string | number | undefined,
	defaultSize: number,
): ScatterGroup[] {
	// パターン1: 複数yカラム → 各カラムがグループ
	if (yKeys.length > 1) {
		return yKeys.map((yKey) => ({
			name: yKey,
			points: data
				.map((row) => toPoint(row, xKey, yKey, sizeConfig, defaultSize))
				.filter((p): p is ScatterPoint => p !== null),
			color: "",
		}));
	}

	const yKey = yKeys[0];
	if (!yKey) return [];

	// パターン2: colorカラム指定 → カラムの値でグループ分け
	if (colorUsage.usage === "column") {
		const groupMap = new Map<string, ScatterPoint[]>();
		for (const row of data) {
			const groupKey = String(row[colorUsage.columnName] ?? "unknown");
			const point = toPoint(row, xKey, yKey, sizeConfig, defaultSize);
			if (point) {
				const list = groupMap.get(groupKey) ?? [];
				list.push(point);
				groupMap.set(groupKey, list);
			}
		}
		return [...groupMap.entries()].map(([name, points]) => ({
			name,
			points,
			color: "",
		}));
	}

	// パターン3: 単一グループ
	return [
		{
			name: yKey,
			points: data
				.map((row) => toPoint(row, xKey, yKey, sizeConfig, defaultSize))
				.filter((p): p is ScatterPoint => p !== null),
			color: "",
		},
	];
}

/**
 * データ値をピクセル半径にマッピング（面積比例）
 */
function mapPointSizes(groups: ScatterGroup[], sizeColumn?: string): void {
	if (!sizeColumn) return;

	const allSizes = groups.flatMap((g) => g.points.map((p) => p.size));
	if (allSizes.length === 0) return;

	const minVal = Math.min(...allSizes);
	const maxVal = Math.max(...allSizes);

	if (minVal === maxVal) {
		const midSize = (SIZE_RANGE.min + SIZE_RANGE.max) / 2;
		for (const g of groups) {
			for (const p of g.points) {
				p.size = midSize;
			}
		}
		return;
	}

	const minArea = SIZE_RANGE.min ** 2;
	const maxArea = SIZE_RANGE.max ** 2;

	for (const g of groups) {
		for (const p of g.points) {
			const normalized = (p.size - minVal) / (maxVal - minVal);
			const area = minArea + normalized * (maxArea - minArea);
			p.size = Math.sqrt(area);
		}
	}
}

/**
 * 2D配列を散布図用に正規化
 */
function normalize2DArrayForScatter(
	data: unknown[][],
	config?: Partial<ScatterChartConfig>,
): NormalizedScatterData {
	if (data.length === 0 || !data[0]) return { groups: [] };

	const numCols = data[0].length;
	if (numCols < 2) return { groups: [] };

	const yCols = numCols === 2 ? [1] : Array.from({ length: numCols - 1 }, (_, i) => i + 1);
	const defaultSize = sanitizeFixedSize(config?.size);

	const groups: ScatterGroup[] = yCols.map((colIdx) => ({
		name: `series_${colIdx}`,
		points: data
			.map((row) => {
				const x = Number(row[0]);
				const y = Number(row[colIdx]);
				if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
				return { x, y, size: defaultSize };
			})
			.filter((p): p is ScatterPoint => p !== null),
		color: "",
	}));

	return { groups };
}

/**
 * 明示的形式 { columns, data } を散布図用に正規化
 */
function normalizeExplicitForScatter(
	input: { columns: string[]; data: unknown[][] },
	config?: Partial<ScatterChartConfig>,
): NormalizedScatterData {
	// オブジェクト配列に変換してから正規化
	const objArray: Record<string, unknown>[] = input.data.map((row) => {
		const obj: Record<string, unknown> = {};
		for (let i = 0; i < input.columns.length; i++) {
			const colName = input.columns[i];
			if (colName !== undefined) {
				obj[colName] = row[i];
			}
		}
		return obj;
	});
	return normalizeObjectArrayForScatter(objArray, config);
}

/**
 * オブジェクト配列を散布図用に正規化
 */
function normalizeObjectArrayForScatter(
	data: Record<string, unknown>[],
	config?: Partial<ScatterChartConfig>,
): NormalizedScatterData {
	if (data.length === 0) return { groups: [] };

	const firstRow = data[0];
	if (!firstRow) return { groups: [] };

	const keys = Object.keys(firstRow);
	const { xKey, yKeys } = resolveScatterColumns(data, config);

	if (!xKey || yKeys.length === 0) return { groups: [] };

	const colorUsage = resolveColorUsage(config?.color, keys);
	const defaultSize = sanitizeFixedSize(config?.size);
	const sizeColumn = typeof config?.size === "string" ? config.size : undefined;

	// sizeが数値の場合はサニタイズ済みの値を渡す、カラム名の場合はそのまま渡す
	const sizeForExtract: string | number | undefined = sizeColumn ?? defaultSize;
	const groups = extractGroups(data, xKey, yKeys, colorUsage, sizeForExtract, defaultSize);

	// sizeカラム指定時は面積比例マッピング
	if (sizeColumn && keys.includes(sizeColumn)) {
		mapPointSizes(groups, sizeColumn);
	}

	return { groups };
}

/**
 * 散布図データを正規化する（エントリポイント）
 */
export function normalizeScatterData(
	data: ScatterChartData,
	config?: Partial<ScatterChartConfig>,
): NormalizedScatterData {
	if (Array.isArray(data) && data.length === 0) {
		return { groups: [] };
	}

	// { columns, data } 形式
	if (
		!Array.isArray(data) &&
		typeof data === "object" &&
		data !== null &&
		"columns" in data &&
		"data" in data
	) {
		return normalizeExplicitForScatter(data, config);
	}

	// unknown[][] 形式
	if (Array.isArray(data) && Array.isArray(data[0])) {
		return normalize2DArrayForScatter(data as unknown[][], config);
	}

	// Record<string, unknown>[] 形式
	if (Array.isArray(data) && typeof data[0] === "object" && data[0] !== null) {
		return normalizeObjectArrayForScatter(data as Record<string, unknown>[], config);
	}

	return { groups: [] };
}

// ============================================================
// SVG描画
// ============================================================

/**
 * 固定サイズをサニタイズ
 */
function sanitizeFixedSize(size: string | number | undefined): number {
	if (typeof size === "number") {
		if (size <= 0) return DEFAULT_SIZE;
		return Math.min(size, SIZE_RANGE.max);
	}
	return DEFAULT_SIZE;
}

/**
 * 透明度をサニタイズ
 */
function sanitizeOpacity(opacity: number | undefined): number {
	if (opacity === undefined) return DEFAULT_OPACITY;
	if (opacity <= 0 || opacity > 1) return DEFAULT_OPACITY;
	return opacity;
}

/**
 * 高さをサニタイズ
 */
function sanitizeHeight(height: number | undefined): number {
	if (height === undefined) return DEFAULT_HEIGHT;
	if (height <= 0) return DEFAULT_HEIGHT;
	return height;
}

/**
 * 色のバリデーション
 */
function sanitizeColorConfig(color: string | string[] | undefined): string | string[] | undefined {
	if (!color) return color;
	if (typeof color === "string") {
		return isValidColor(color) ? color : undefined;
	}
	if (Array.isArray(color)) {
		const valid = color.filter(isValidColor);
		return valid.length > 0 ? valid : undefined;
	}
	return undefined;
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
function computeLayout(config?: Partial<ScatterChartConfig>, groupCount?: number): ChartLayout {
	const height = sanitizeHeight(config?.height);
	const showLegend = (groupCount ?? 0) > 1;
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
 * データ空間 → SVG空間の変換関数を生成
 */
function createScaleX(
	xScale: { min: number; max: number },
	marginLeft: number,
	plotWidth: number,
): (v: number) => number {
	const range = xScale.max - xScale.min;
	if (range === 0) return () => marginLeft + plotWidth / 2;
	return (v: number) => marginLeft + ((v - xScale.min) / range) * plotWidth;
}

function createScaleY(
	yScale: { min: number; max: number },
	marginTop: number,
	plotHeight: number,
): (v: number) => number {
	const range = yScale.max - yScale.min;
	if (range === 0) return () => marginTop + plotHeight / 2;
	return (v: number) => marginTop + plotHeight - ((v - yScale.min) / range) * plotHeight;
}

/**
 * 軸ラベルを描画
 */
function renderAxisLabels(
	config: Partial<ScatterChartConfig> | undefined,
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
 * ツールチップテキストを生成
 */
function buildTooltip(
	groupName: string,
	point: ScatterPoint,
	sizeColumn: string | undefined,
	multiGroup: boolean,
): string {
	const prefix = multiGroup ? `${groupName}: ` : "";
	const coords = `(${formatTickValue(point.x)}, ${formatTickValue(point.y)})`;
	if (sizeColumn) {
		return `${prefix}${coords} [${formatTickValue(point.size)}]`;
	}
	return `${prefix}${coords}`;
}

/**
 * 散布図をレンダリング
 */
export function renderScatterChart(
	data: ScatterChartData,
	config?: Partial<ScatterChartConfig>,
): string {
	// 色のサニタイズ（colorカラム判定の前に配列/文字列でのバリデーションは後で行う）
	const safeConfig: Partial<ScatterChartConfig> = config ? { ...config } : {};

	// 1. データ正規化
	let normalized = normalizeScatterData(data, safeConfig);

	// 空データチェック
	const totalPoints = normalized.groups.reduce((sum, g) => sum + g.points.length, 0);
	if (normalized.groups.length === 0 || totalPoints === 0) {
		return '<div class="kt-scatter-chart kt-chart-empty">No data</div>';
	}

	// グループ数の制限
	if (normalized.groups.length > MAX_GROUPS) {
		normalized = { groups: normalized.groups.slice(0, MAX_GROUPS) };
	}

	// データポイント数の制限
	let pointCount = normalized.groups.reduce((sum, g) => sum + g.points.length, 0);
	if (pointCount > MAX_DATA_POINTS) {
		const groups: ScatterGroup[] = [];
		let remaining = MAX_DATA_POINTS;
		for (const g of normalized.groups) {
			if (remaining <= 0) break;
			const sliced = g.points.slice(0, remaining);
			groups.push({ ...g, points: sliced });
			remaining -= sliced.length;
		}
		normalized = { groups };
		pointCount = MAX_DATA_POINTS;
	}

	// 2. 色の解決
	const safeColor = sanitizeColorConfig(safeConfig.color);
	// colorカラム使用時は色パラメータを渡さずデフォルトパレットを使用
	const colorForResolve = (() => {
		if (typeof safeConfig.color === "string") {
			// カラム名として使われている場合はカラーとしては渡さない
			const firstRow =
				Array.isArray(data) &&
				data.length > 0 &&
				typeof data[0] === "object" &&
				!Array.isArray(data[0])
					? (data[0] as Record<string, unknown>)
					: null;
			if (firstRow && Object.keys(firstRow).includes(safeConfig.color)) {
				return undefined; // カラム名→デフォルトパレット
			}
		}
		return safeColor;
	})();

	const colors = resolveChartColors(normalized.groups.length, colorForResolve);
	for (let i = 0; i < normalized.groups.length; i++) {
		const g = normalized.groups[i];
		if (g) g.color = colors[i] ?? g.color;
	}

	// 3. SVG描画
	return renderScatterChartHtml(normalized, safeConfig);
}

/**
 * 散布図SVGを生成
 */
function renderScatterChartHtml(
	normalized: NormalizedScatterData,
	config: Partial<ScatterChartConfig>,
): string {
	const layout = computeLayout(config, normalized.groups.length);
	const title = config.title;
	const opacity = sanitizeOpacity(config.opacity);
	const sizeColumn = typeof config.size === "string" ? config.size : undefined;

	// 全ポイントからスケールを計算
	const allPoints = normalized.groups.flatMap((g) => g.points);
	const xValues = allPoints.map((p) => p.x);
	const yValues = allPoints.map((p) => p.y);

	const xScale = calculateAxisScale(xValues, 5, { includeZero: false });
	const yScale = calculateAxisScale(yValues, 5, { includeZero: false });

	const scaleX = createScaleX(xScale, layout.marginLeft, layout.plotWidth);
	const scaleY = createScaleY(yScale, MARGIN.top, layout.plotHeight);

	const ariaLabel = title ? renderHtml`Scatter chart: ${title}` : "Scatter chart";

	const parts: string[] = [];

	// figure
	parts.push(
		renderHtml`<figure class="kt-scatter-chart" role="img" aria-label="${raw(ariaLabel)}">`,
	);
	if (title) {
		parts.push(renderHtml`<figcaption class="kt-scatter-chart-title">${title}</figcaption>`);
	}

	// SVG
	parts.push(
		renderHtml`<svg viewBox="0 0 ${SVG_WIDTH} ${layout.height}" width="100%" preserveAspectRatio="xMidYMid meet" class="kt-scatter-chart-svg" xmlns="http://www.w3.org/2000/svg">`,
	);
	parts.push(renderHtml`<title>${title ?? "Scatter chart"}</title>`);
	parts.push(
		title ? renderHtml`<desc>Scatter chart showing ${title}</desc>` : "<desc>Scatter chart</desc>",
	);

	// グリッド線（水平 + 垂直）
	parts.push('<g class="kt-chart-grid">');
	// 水平グリッド
	for (const tick of yScale.ticks) {
		const y = scaleY(tick);
		parts.push(
			`<line x1="${layout.marginLeft}" y1="${y}" x2="${layout.marginLeft + layout.plotWidth}" y2="${y}" stroke="#e9ecef" stroke-width="1" />`,
		);
	}
	// 垂直グリッド
	parts.push(renderVerticalGrid(xScale, scaleX, MARGIN.top, layout.plotHeight));
	parts.push("</g>");

	// 軸
	parts.push(renderYAxis(yScale, layout.marginLeft, scaleY));
	parts.push(
		renderNumericXAxis(
			xScale,
			scaleX,
			MARGIN.top + layout.plotHeight,
			layout.marginLeft,
			layout.plotWidth,
		),
	);

	// データポイント
	const multiGroup = normalized.groups.length > 1;
	for (const group of normalized.groups) {
		parts.push(renderHtml`<g class="kt-chart-scatter-group" data-group="${group.name}">`);
		for (const point of group.points) {
			const cx = scaleX(point.x);
			const cy = scaleY(point.y);
			const tooltipText = buildTooltip(group.name, point, sizeColumn, multiGroup);
			parts.push(
				renderHtml`<circle cx="${cx}" cy="${cy}" r="${point.size}" fill="${group.color}" fill-opacity="${opacity}"><title>${tooltipText}</title></circle>`,
			);
		}
		parts.push("</g>");
	}

	// 軸ラベル
	parts.push(renderAxisLabels(config, layout));

	// 凡例
	if (layout.showLegend) {
		parts.push(
			renderScatterLegend(
				normalized.groups,
				layout.marginLeft,
				MARGIN.top + layout.plotHeight + 30,
			),
		);
	}

	parts.push("</svg>");
	parts.push("</figure>");
	return parts.join("");
}
