/**
 * ダウンロードボタンウィジェット
 */

import { requireRenderContext } from "../kt/context";
import { escapeHtml } from "../utils/html";
import { isButtonPressed } from "./core";
import { generateWidgetId } from "./registry";
import type { DownloadButtonConfig } from "./types";

/**
 * 文字列をBase64エンコード
 */
function encodeBase64(data: string | ArrayBuffer): string {
	if (typeof data === "string") {
		// TextEncoderを使用してUTF-8バイト列に変換してからBase64エンコード
		const encoder = new TextEncoder();
		const bytes = encoder.encode(data);
		return btoa(String.fromCharCode(...bytes));
	}
	// ArrayBufferの場合
	const bytes = new Uint8Array(data);
	return btoa(String.fromCharCode(...bytes));
}

/**
 * ダウンロードボタンのHTML文字列を生成（内部ヘルパー）
 */
function buildDownloadButtonHtml(
	widgetId: string,
	label: string,
	data: string | ArrayBuffer,
	filename: string,
	config: DownloadButtonConfig,
): string {
	const mime = config.mime ?? "application/octet-stream";
	const base64 = encodeBase64(data);
	const dataUrl = `data:${mime};base64,${base64}`;
	const disabled = config.disabled ? " disabled" : "";
	const disabledAttr = config.disabled ? ' aria-disabled="true"' : "";

	// ファイル名をエスケープ（XSS対策）
	const safeFilename = escapeHtml(filename).replace(/"/g, "&quot;");

	return `<div class="kt-download-button" id="${widgetId}">
<a href="${dataUrl}" download="${safeFilename}" class="kt-button"${disabledAttr}${disabled} data-kt-event="click">${escapeHtml(label)}</a>
</div>`;
}

/**
 * ダウンロードボタンをレンダリング
 *
 * @param label ボタンのラベル
 * @param data ダウンロードするデータ
 * @param filename ダウンロード時のファイル名
 * @param config 設定オプション
 * @returns HTML文字列
 */
export function renderDownloadButton(
	label: string,
	data: string | ArrayBuffer,
	filename: string,
	config: DownloadButtonConfig = {},
): string {
	const widgetId = generateWidgetId(config.key);
	return buildDownloadButtonHtml(widgetId, label, data, filename, config);
}

/**
 * ダウンロードボタンを表示
 *
 * @param label ボタンのラベル
 * @param data ダウンロードするデータ
 * @param filename ダウンロード時のファイル名
 * @param config 設定オプション
 * @returns ボタンがクリックされたかどうか
 *
 * @example
 * ```typescript
 * if (kt.download_button("Download CSV", csvData, "report.csv", { mime: "text/csv" })) {
 *   kt.write("Download started!");
 * }
 * ```
 */
export function download_button(
	label: string,
	data: string | ArrayBuffer,
	filename: string,
	config: DownloadButtonConfig = {},
): boolean {
	const ctx = requireRenderContext();
	const widgetId = generateWidgetId(config.key);
	const html = buildDownloadButtonHtml(widgetId, label, data, filename, config);

	ctx.append(html);

	return isButtonPressed(widgetId);
}
