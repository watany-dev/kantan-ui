/**
 * ダウンロードボタンウィジェット
 * Web標準のBlobストリーミングを活用
 */

import { requireRenderContext } from "../kt/context";
import { getSessionManager } from "../session/manager";
import { escapeHtml } from "../utils/html";
import { isButtonPressed } from "./core";
import { generateWidgetId } from "./registry";
import type { DownloadButtonConfig } from "./types";

// ストリーミング使用の閾値（これ以上のサイズはサーバーサイドストリーミングを使用）
const STREAMING_THRESHOLD = 64 * 1024; // 64KB

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
 * 文字列をBase64エンコード（小さいデータ用）
 */
function encodeBase64(data: string | ArrayBuffer): string {
	if (typeof data === "string") {
		const encoder = new TextEncoder();
		const bytes = encoder.encode(data);
		return btoa(String.fromCharCode(...bytes));
	}
	const bytes = new Uint8Array(data);
	return btoa(String.fromCharCode(...bytes));
}

/**
 * データサイズを取得
 */
function getDataSize(data: string | ArrayBuffer): number {
	if (data instanceof ArrayBuffer) {
		return data.byteLength;
	}
	// Web標準 TextEncoder でバイトサイズを計算
	return new TextEncoder().encode(data).length;
}

/**
 * ダウンロードボタンのHTML文字列を生成（内部ヘルパー）
 * 大きなデータはサーバーサイドストリーミング、小さいデータはBase64埋め込み
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
	const safeFilename = escapeHtml(filename).replace(/"/g, "&quot;");

	const dataSize = getDataSize(data);

	// 大きなデータはサーバーサイドストリーミングを使用
	if (dataSize > STREAMING_THRESHOLD) {
		const sessionManager = getSessionManager();
		const arrayBuffer = toArrayBuffer(data);
		const downloadId = sessionManager.registerDownload(arrayBuffer, filename, mime);

		// data-kt-download-url属性でサーバーサイドダウンロードを使用
		return `<div class="kt-download-button" id="${widgetId}">
<button class="kt-button" data-kt-download-url="/download/${downloadId}" data-filename="${safeFilename}"${disabledAttr}${disabled} data-kt-event="click">${escapeHtml(label)}</button>
</div>`;
	}

	// 小さいデータはBase64埋め込み（既存の動作）
	const base64 = encodeBase64(data);
	return `<div class="kt-download-button" id="${widgetId}">
<button class="kt-button" data-kt-download data-filename="${safeFilename}" data-mime="${mime}" data-content="${base64}"${disabledAttr}${disabled} data-kt-event="click">${escapeHtml(label)}</button>
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
