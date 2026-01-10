/**
 * file-uploader ウィジェットのロジック層とレンダリング層
 * セッション状態からアップロードデータを取得し、UploadedFileインターフェースを提供
 */
import { getSessionManager } from "../session/manager";
import { getCurrentSessionId } from "../session/state";
import { escapeHtml } from "../utils/html";
import { generateWidgetId } from "./registry";
import type { FileUploaderConfig, UploadedFile } from "./types";
import { FILE_UPLOAD_LIMITS } from "./types";
import { createUploadedFileFromInternal } from "./uploaded-file";

/**
 * ファイルアップローダーの初期状態を取得
 * @param widgetId ウィジェットID
 * @param multiple 複数ファイルモードかどうか
 * @returns 単一モードはnull、複数モードは空配列
 */
export function initializeFileUploaderState(
	widgetId: string,
	multiple: boolean,
): UploadedFile | UploadedFile[] | null {
	// widgetIdを使用して状態を初期化（将来の拡張用）
	void widgetId;

	if (multiple) {
		return [];
	}
	return null;
}

/**
 * ファイルアップローダーの現在値を取得
 * セッション状態からアップロードIDを取得し、UploadedFileに変換
 * @param widgetId ウィジェットID
 * @param multiple 複数ファイルモードかどうか
 * @returns 単一モードはUploadedFile|null、複数モードはUploadedFile[]
 */
export function getFileUploaderValue(
	widgetId: string,
	multiple: boolean,
): UploadedFile | UploadedFile[] | null {
	const sessionId = getCurrentSessionId();
	if (!sessionId) {
		return multiple ? [] : null;
	}

	const manager = getSessionManager();

	// ウィジェット状態からアップロードIDリストを取得
	const sessionState = manager.getState(sessionId);
	if (!sessionState) {
		return multiple ? [] : null;
	}

	const widgetState = sessionState[widgetId];
	if (!widgetState || !Array.isArray(widgetState)) {
		return multiple ? [] : null;
	}

	const uploadIds = widgetState as string[];
	const uploadedFiles: UploadedFile[] = [];

	for (const uploadId of uploadIds) {
		const uploadData = manager.getUpload(sessionId, uploadId);
		if (uploadData) {
			uploadedFiles.push(createUploadedFileFromInternal(uploadData));
		}
	}

	if (multiple) {
		return uploadedFiles;
	}

	// 単一モード: 最初のファイルを返す
	return uploadedFiles.length > 0 ? uploadedFiles[0] : null;
}

/**
 * accept属性を生成
 * 文字列または配列を受け取り、カンマ区切りの文字列に変換
 */
function formatAccept(accept: string | readonly string[] | undefined): string {
	if (!accept) {
		return "";
	}
	if (typeof accept === "string") {
		return accept;
	}
	return accept.join(",");
}

/**
 * ファイルアップローダーのHTMLをレンダリング
 * @param label ラベルテキスト
 * @param config 設定オプション
 * @returns HTML文字列
 */
export function renderFileUploader(label: string, config: Partial<FileUploaderConfig>): string {
	const id = generateWidgetId(config.key);

	// 属性を構築
	const accept = formatAccept(config.accept);
	const acceptAttr = accept ? ` accept="${escapeHtml(accept)}"` : "";
	const multipleAttr = config.multiple ? " multiple" : "";
	const disabledAttr = config.disabled ? " disabled" : "";
	const maxSize = config.maxSize ?? FILE_UPLOAD_LIMITS.DEFAULT_MAX_SIZE;

	// 検証オプション（デフォルト値あり）
	const strictMode = config.strictMode ?? false;
	const detectPolyglot = config.detectPolyglot ?? true;
	const verifyMagicBytes = config.verifyMagicBytes ?? true;

	// ヘルプテキスト
	const helpHtml = config.help
		? `\n  <div class="kt-file-uploader-help">${escapeHtml(config.help)}</div>`
		: "";

	return `<div id="${id}-container" class="kt-file-uploader-container">
  <label for="${id}" class="kt-file-uploader-label">${escapeHtml(label)}</label>
  <input type="file" id="${id}" class="kt-file-uploader" data-kt-event="change"${acceptAttr}${multipleAttr}${disabledAttr} data-max-size="${maxSize}" data-strict-mode="${strictMode}" data-detect-polyglot="${detectPolyglot}" data-verify-magic-bytes="${verifyMagicBytes}" />${helpHtml}
</div>`;
}
