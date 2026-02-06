/**
 * Dataframe ウィジェット
 *
 * インタラクティブなデータ表示（ソート・検索・行選択）
 * kt.table() の拡張版として、クライアントサイドのソート・検索と
 * サーバーサイドの行選択状態管理を提供する。
 */

import { escapeHtml } from "../utils/html";
import { getWidgetValue, hasWidgetValue, setWidgetValue } from "./registry";
import type { DataframeConfig, DataframeSelection } from "./types";

const DEFAULT_HEIGHT = 400;

/**
 * 正規化されたテーブルデータ
 */
export interface NormalizedData {
	headers: string[];
	rows: unknown[][];
}

/**
 * レンダリングに必要な解決済み設定
 */
interface ResolvedConfig {
	id: string;
	height: number;
	hideIndex: boolean;
	isSelectable: boolean;
	selectionMode: string;
	selection: DataframeSelection;
}

/**
 * dataframeの選択状態を初期化
 */
export function initializeDataframeSelection(widgetId: string): DataframeSelection {
	const initial: DataframeSelection = { rows: [] };
	if (!hasWidgetValue(widgetId)) {
		setWidgetValue(widgetId, initial);
	}
	return getWidgetValue<DataframeSelection>(widgetId, initial);
}

/**
 * DataframeSelection の型検証
 */
export function isValidSelection(value: unknown): value is DataframeSelection {
	if (typeof value !== "object" || value === null) return false;
	const sel = value as Record<string, unknown>;
	const rows = sel["rows"];
	if (!Array.isArray(rows)) return false;
	return rows.every((r) => typeof r === "number" && Number.isInteger(r) && r >= 0);
}

/**
 * 選択値の正規化（不正値のフォールバック）
 */
export function normalizeSelection(value: unknown, rowCount: number): DataframeSelection {
	if (!isValidSelection(value)) {
		return { rows: [] };
	}
	return {
		rows: value.rows.filter((r) => r < rowCount),
	};
}

/**
 * columnOrder に基づいてヘッダーと行データを並べ替え
 */
export function reorderColumns(
	headers: string[],
	rows: unknown[][],
	columnOrder: string[],
): NormalizedData {
	const orderIndices: number[] = [];
	for (const col of columnOrder) {
		const idx = headers.indexOf(col);
		if (idx !== -1) {
			orderIndices.push(idx);
		}
	}
	const reorderedHeaders = orderIndices.map((i) => headers[i] as string);
	const reorderedRows = rows.map((row) => orderIndices.map((i) => row[i]));
	return { headers: reorderedHeaders, rows: reorderedRows };
}

/**
 * 設定を解決
 */
function resolveConfig(
	config: Partial<DataframeConfig> | undefined,
	rowCount: number,
): ResolvedConfig {
	const id = config?.key ?? "dataframe_0";
	const isSelectable = config?.onSelect === "rerun";
	return {
		id,
		height: config?.height ?? DEFAULT_HEIGHT,
		hideIndex: config?.hideIndex ?? false,
		isSelectable,
		selectionMode: config?.selectionMode ?? "multi-row",
		selection: isSelectable
			? normalizeSelection(getWidgetValue<DataframeSelection>(id, { rows: [] }), rowCount)
			: { rows: [] },
	};
}

/**
 * ツールバーHTML生成
 */
function renderToolbar(id: string, rowCount: number): string {
	return [
		'<div class="kt-dataframe-toolbar">',
		`<input type="text" class="kt-dataframe-search" placeholder="Search..." data-kt-dataframe-search="${id}" />`,
		`<span class="kt-dataframe-row-count">${rowCount} rows</span>`,
		"</div>",
	].join("");
}

/**
 * テーブルヘッダーHTML生成
 */
function renderHeader(headers: string[], resolved: ResolvedConfig): string {
	const parts: string[] = ["<thead><tr>"];

	if (resolved.isSelectable && resolved.selectionMode === "multi-row") {
		parts.push(
			`<th class="kt-dataframe-select-col"><input type="checkbox" data-kt-dataframe-select-all="${resolved.id}" /></th>`,
		);
	} else if (resolved.isSelectable) {
		parts.push('<th class="kt-dataframe-select-col"></th>');
	}

	if (!resolved.hideIndex) {
		parts.push('<th class="kt-dataframe-index-col">#</th>');
	}

	for (let i = 0; i < headers.length; i++) {
		parts.push(
			`<th data-kt-dataframe-sort="${resolved.id}" data-col="${i}" class="kt-dataframe-sortable">${escapeHtml(String(headers[i]))}<span class="kt-dataframe-sort-icon"></span></th>`,
		);
	}

	parts.push("</tr></thead>");
	return parts.join("");
}

/**
 * テーブル行HTML生成
 */
function renderRow(row: unknown[], rowIdx: number, resolved: ResolvedConfig): string {
	const isSelected = resolved.selection.rows.includes(rowIdx);
	const selectedClass = isSelected ? " kt-dataframe-selected" : "";
	const parts: string[] = [`<tr data-row="${rowIdx}" class="${selectedClass}">`];

	if (resolved.isSelectable) {
		const inputType = resolved.selectionMode === "single-row" ? "radio" : "checkbox";
		const checked = isSelected ? " checked" : "";
		parts.push(
			`<td class="kt-dataframe-select-col"><input type="${inputType}" name="${resolved.id}-select" data-kt-dataframe-row="${resolved.id}" value="${rowIdx}"${checked} /></td>`,
		);
	}

	if (!resolved.hideIndex) {
		parts.push(`<td class="kt-dataframe-index-col">${rowIdx}</td>`);
	}

	for (const cell of row) {
		const cellStr = cell === null || cell === undefined ? "" : String(cell);
		parts.push(`<td>${escapeHtml(cellStr)}</td>`);
	}

	parts.push("</tr>");
	return parts.join("");
}

/**
 * テーブルボディHTML生成
 */
function renderBody(rows: unknown[][], resolved: ResolvedConfig): string {
	const parts: string[] = ["<tbody>"];
	for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
		const row = rows[rowIdx];
		if (row) {
			parts.push(renderRow(row, rowIdx, resolved));
		}
	}
	parts.push("</tbody>");
	return parts.join("");
}

/**
 * dataframe の HTML をレンダリング
 */
export function renderDataframe(data: NormalizedData, config?: Partial<DataframeConfig>): string {
	let { headers, rows } = data;
	if (config?.columnOrder && headers.length > 0) {
		const reordered = reorderColumns(headers, rows, config.columnOrder);
		headers = reordered.headers;
		rows = reordered.rows;
	}

	const resolved = resolveConfig(config, rows.length);

	return [
		`<div id="${resolved.id}-container" class="kt-dataframe-container" style="height: ${resolved.height}px">`,
		renderToolbar(resolved.id, rows.length),
		'<div class="kt-dataframe-table-wrapper">',
		`<table class="kt-dataframe-table" data-kt-dataframe="${resolved.id}">`,
		renderHeader(headers, resolved),
		renderBody(rows, resolved),
		"</table>",
		"</div>",
		"</div>",
	].join("");
}
