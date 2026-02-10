/**
 * kt データ表示関数
 *
 * テーブルやデータフレームの表示機能
 */

import { raw, renderHtml } from "../utils/html";
import { initializeDataframeSelection, renderDataframe } from "../widgets/dataframe";
import { generateWidgetId } from "../widgets/registry";
import type { DataframeConfig, DataframeSelection } from "../widgets/types";
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
	/** 2D配列の最初の行をヘッダーとして使用 */
	useFirstRowAsHeader?: boolean;
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
	useFirstRowAsHeader?: boolean,
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
			const data2D = data as unknown[][];
			const firstRow = data2D[0];
			// 最初の行をヘッダーとして使用
			if (useFirstRowAsHeader && firstRow) {
				return {
					headers: explicitHeaders ?? firstRow.map((h) => String(h)),
					rows: data2D.slice(1),
				};
			}
			return {
				headers: explicitHeaders ?? [],
				rows: data2D,
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
	const { headers, rows } = normalizeTableData(data, config.headers, config.useFirstRowAsHeader);

	const parts: string[] = ['<table class="kt-table">'];

	// ヘッダー
	if (headers.length > 0) {
		parts.push("<thead><tr>");
		for (const h of headers) {
			parts.push(renderHtml`<th>${String(h)}</th>`);
		}
		parts.push("</tr></thead>");
	}

	// ボディ
	parts.push("<tbody>");
	for (const row of rows) {
		parts.push("<tr>");
		for (const cell of row) {
			parts.push(renderHtml`<td>${String(cell)}</td>`);
		}
		parts.push("</tr>");
	}
	parts.push("</tbody></table>");

	ctx.append(raw(parts.join("")));
}

/**
 * インタラクティブなデータフレームを表示
 *
 * kt.table() の拡張版。ソート・検索・行選択機能を備える。
 * ソートと検索はクライアントサイドで処理され、サーバーラウンドトリップ不要。
 * 行選択はサーバーに送信され、選択結果を戻り値として取得できる。
 *
 * @param data テーブルデータ
 * @param config データフレーム設定
 * @returns onSelect="rerun" の場合は DataframeSelection、それ以外は void
 *
 * @example
 * ```typescript
 * // 基本表示
 * kt.dataframe([
 *   { name: "Alice", age: 30 },
 *   { name: "Bob", age: 25 },
 * ]);
 *
 * // 行選択
 * const selection = kt.dataframe(data, {
 *   key: "my_df",
 *   onSelect: "rerun",
 *   selectionMode: "multi-row",
 * });
 * ```
 */
export function dataframe(
	data: TableData,
	config?: Partial<DataframeConfig>,
): DataframeSelection | undefined {
	const ctx = requireRenderContext();
	const id = generateWidgetId(config?.key);
	const configWithId = { ...config, key: id };
	const normalized = normalizeTableData(data);
	const selection = config?.onSelect === "rerun" ? initializeDataframeSelection(id) : undefined;

	const html = renderDataframe(
		{ headers: normalized.headers, rows: normalized.rows },
		configWithId,
	);
	ctx.append(html);

	return selection;
}
