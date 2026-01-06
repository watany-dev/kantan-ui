/**
 * kt データ表示関数
 *
 * テーブルやデータフレームの表示機能
 */

import { escapeHtml } from "../utils/html";
import { requireRenderContext } from "./context";

/**
 * テーブルデータの型
 */
export type TableData =
	| Record<string, unknown>[] // オブジェクト配列
	| unknown[][] // 2D配列
	| { columns: string[]; data: unknown[][] }; // 明示的な形式

/**
 * テーブル設定
 */
export interface TableConfig {
	/** 明示的なヘッダー */
	headers?: string[];
}

/**
 * 正規化されたテーブルデータ
 */
interface NormalizedTableData {
	headers: string[];
	rows: unknown[][];
}

/**
 * 様々な形式のデータをテーブル形式に正規化
 */
export function normalizeTableData(
	data: TableData,
	explicitHeaders?: string[],
): NormalizedTableData {
	// 明示的な形式 { columns, data }
	if (!Array.isArray(data) && "columns" in data && "data" in data) {
		return {
			headers: explicitHeaders ?? data.columns,
			rows: data.data,
		};
	}

	// 配列形式
	if (Array.isArray(data) && data.length > 0) {
		// 2D配列
		if (Array.isArray(data[0])) {
			return {
				headers: explicitHeaders ?? [],
				rows: data as unknown[][],
			};
		}

		// オブジェクト配列
		const firstRow = data[0] as Record<string, unknown>;
		const headers = explicitHeaders ?? Object.keys(firstRow);
		const rows = data.map((obj) => headers.map((h) => (obj as Record<string, unknown>)[h]));
		return { headers, rows };
	}

	// 空配列
	return { headers: [], rows: [] };
}

/**
 * テーブルを描画
 *
 * @param data テーブルデータ
 * @param config テーブル設定
 *
 * @example
 * ```typescript
 * kt.table([
 *   { name: "Alice", age: 30 },
 *   { name: "Bob", age: 25 },
 * ]);
 * ```
 */
export function table(data: TableData, config: TableConfig = {}): void {
	const ctx = requireRenderContext();
	const { headers, rows } = normalizeTableData(data, config.headers);

	const parts: string[] = ['<table class="kt-table">'];

	// ヘッダー
	if (headers.length > 0) {
		parts.push("<thead><tr>");
		for (const h of headers) {
			parts.push(`<th>${escapeHtml(String(h))}</th>`);
		}
		parts.push("</tr></thead>");
	}

	// ボディ
	parts.push("<tbody>");
	for (const row of rows) {
		parts.push("<tr>");
		for (const cell of row) {
			parts.push(`<td>${escapeHtml(String(cell))}</td>`);
		}
		parts.push("</tr>");
	}
	parts.push("</tbody></table>");

	ctx.append(parts.join(""));
}
