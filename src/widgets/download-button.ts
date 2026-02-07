/**
 * ダウンロードボタンウィジェット
 * Web標準のBlobストリーミングを活用
 */

import { requireRenderContext } from "../kt/context";
import { getSessionManager } from "../session/manager";
import { raw, renderHtml } from "../utils/html";
import { isButtonPressed } from "./core";
import { generateWidgetId } from "./registry";
import type { DownloadButtonConfig } from "./types";

/**
 * データをArrayBufferに変換
 */
function toArrayBuffer(data: string | ArrayBuffer): ArrayBuffer {
	if (data instanceof ArrayBuffer) {
		return data;
	}
	// Web標準 TextEncoder を使用
	const encoder = new TextEncoder();
	return encoder.encode(data).buffer as ArrayBuffer;
}

/**
 * ダウンロードボタンのHTML文字列を生成（内部ヘルパー）
 * サーバーサイドストリーミングを使用
 */
function buildDownloadButtonHtml(
	widgetId: string,
	label: string,
	data: string | ArrayBuffer,
	filename: string,
	config: DownloadButtonConfig,
): string {
	const mime = config.mime ?? "application/octet-stream";
	const disabled = config.disabled ? " disabled" : "";
	const disabledAttr = config.disabled ? ' aria-disabled="true"' : "";

	const sessionManager = getSessionManager();
	const arrayBuffer = toArrayBuffer(data);
	const downloadId = sessionManager.registerDownload(arrayBuffer, filename, mime);

	return renderHtml`<div class="kt-download-button" id="${raw(widgetId)}">
<button class="kt-button" data-kt-download-url="/download/${raw(downloadId)}" data-filename="${filename}"${raw(disabledAttr)}${raw(disabled)} data-kt-event="click">${label}</button>
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
