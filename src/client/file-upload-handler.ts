/**
 * クライアント側ファイルアップロードハンドラー
 * ファイルの読み込み、Base64エンコード、検証を担当
 */

/** デフォルトの最大ファイルサイズ (200MB) */
const DEFAULT_MAX_SIZE = 200 * 1024 * 1024;

/** デフォルトのチャンクサイズ (1MB) */
const DEFAULT_CHUNK_SIZE = 1 * 1024 * 1024;

/**
 * ArrayBufferをBase64文字列に変換
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
	if (buffer.byteLength === 0) {
		return "";
	}
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.length; i++) {
		const byte = bytes[i];
		if (byte !== undefined) {
			binary += String.fromCharCode(byte);
		}
	}
	return btoa(binary);
}

/**
 * ファイルデータをチャンクに分割してBase64エンコード
 * @param data ファイルデータ
 * @param chunkSize チャンクサイズ（バイト）
 * @returns Base64エンコードされたチャンクの配列
 */
export function createFileChunks(
	data: ArrayBuffer,
	chunkSize: number = DEFAULT_CHUNK_SIZE,
): string[] {
	if (data.byteLength === 0) {
		return [];
	}

	const chunks: string[] = [];
	const bytes = new Uint8Array(data);

	for (let offset = 0; offset < bytes.length; offset += chunkSize) {
		const end = Math.min(offset + chunkSize, bytes.length);
		const chunk = bytes.slice(offset, end);
		chunks.push(arrayBufferToBase64(chunk.buffer));
	}

	return chunks;
}

/**
 * 要素から最大ファイルサイズを取得
 */
export function getMaxFileSize(element: HTMLElement): number {
	const maxSizeStr = element.dataset?.["maxSize"];
	if (!maxSizeStr) {
		return DEFAULT_MAX_SIZE;
	}
	const maxSize = Number.parseInt(maxSizeStr, 10);
	if (Number.isNaN(maxSize) || maxSize <= 0) {
		return DEFAULT_MAX_SIZE;
	}
	return maxSize;
}

/**
 * ファイルサイズ検証結果
 */
export interface SizeValidationResult {
	valid: boolean;
	error?: string;
}

/**
 * ファイルサイズを検証
 */
export function validateFileSize(fileSize: number, maxSize: number): SizeValidationResult {
	if (fileSize > maxSize) {
		const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
		const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
		return {
			valid: false,
			error: `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
		};
	}
	return { valid: true };
}

/**
 * ファイルタイプ検証結果
 */
export interface TypeValidationResult {
	valid: boolean;
	error?: string;
}

/**
 * ファイルタイプを検証
 * @param filename ファイル名
 * @param mimeType MIMEタイプ
 * @param accept accept属性の値（カンマ区切り）
 */
export function validateFileType(
	filename: string,
	mimeType: string,
	accept: string | undefined,
): TypeValidationResult {
	if (!accept) {
		return { valid: true };
	}

	const acceptTypes = accept.split(",").map((t) => t.trim().toLowerCase());
	const lowerFilename = filename.toLowerCase();
	const lowerMime = mimeType.toLowerCase();

	for (const acceptType of acceptTypes) {
		// 拡張子チェック (.png, .jpg など)
		if (acceptType.startsWith(".")) {
			if (lowerFilename.endsWith(acceptType)) {
				return { valid: true };
			}
			continue;
		}

		// ワイルドカードMIME (image/*, audio/* など)
		if (acceptType.endsWith("/*")) {
			const category = acceptType.slice(0, -2);
			if (lowerMime.startsWith(`${category}/`)) {
				return { valid: true };
			}
			continue;
		}

		// 完全一致MIME
		if (lowerMime === acceptType) {
			return { valid: true };
		}
	}

	return {
		valid: false,
		error: `File type "${mimeType}" is not allowed. Accepted types: ${accept}`,
	};
}

/**
 * バイト数を人間が読みやすい形式にフォーマット
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * ウィジェットコンテナを取得
 */
function getWidgetContainer(widgetId: string): HTMLElement | null {
	return document.getElementById(`${widgetId}-container`);
}

/**
 * アップロードプログレスを更新
 * @param widgetId ウィジェットID
 * @param percent 進捗率 (0-100)
 * @param uploadedBytes アップロード済みバイト数
 * @param totalBytes 合計バイト数
 */
export function updateUploadProgress(
	widgetId: string,
	percent: number,
	uploadedBytes: number,
	totalBytes: number,
): void {
	const container = getWidgetContainer(widgetId);
	if (!container) return;

	const progressDiv = container.querySelector(".kt-file-uploader-progress") as HTMLElement | null;
	const fill = container.querySelector(".kt-progress-fill") as HTMLElement | null;
	const percentText = container.querySelector(".kt-progress-percent");
	const sizeText = container.querySelector(".kt-progress-size");

	if (progressDiv) {
		progressDiv.style.display = "block";
	}

	if (fill) {
		fill.style.width = `${percent}%`;
		fill.classList.remove("indeterminate");
	}

	if (percentText) {
		percentText.textContent = `${Math.round(percent)}%`;
	}

	if (sizeText) {
		sizeText.textContent = `${formatBytes(uploadedBytes)} / ${formatBytes(totalBytes)}`;
	}
}

/**
 * プログレス表示を非表示にする
 */
export function hideUploadProgress(widgetId: string): void {
	const container = getWidgetContainer(widgetId);
	if (!container) return;

	const progressDiv = container.querySelector(".kt-file-uploader-progress") as HTMLElement | null;
	if (progressDiv) {
		progressDiv.style.display = "none";
	}
}

/**
 * アップロード完了を表示
 * @param widgetId ウィジェットID
 * @param filename ファイル名
 * @param uploadId アップロードID
 */
export function showUploadComplete(widgetId: string, filename: string, uploadId: string): void {
	const container = getWidgetContainer(widgetId);
	if (!container) return;

	// プログレス非表示
	hideUploadProgress(widgetId);

	// 完了表示
	const completeDiv = container.querySelector(".kt-file-uploader-complete") as HTMLElement | null;
	if (completeDiv) {
		completeDiv.style.display = "flex";
		const filenameSpan = completeDiv.querySelector(".kt-file-name");
		if (filenameSpan) {
			filenameSpan.textContent = filename;
		}
		const removeBtn = completeDiv.querySelector(".kt-file-remove") as HTMLElement | null;
		if (removeBtn) {
			removeBtn.dataset["uploadId"] = uploadId;
		}
	}

	container.classList.add("kt-upload-complete");
}

/**
 * アップロードエラーを表示
 * @param widgetId ウィジェットID
 * @param message エラーメッセージ
 */
export function showUploadError(widgetId: string, message: string): void {
	const container = getWidgetContainer(widgetId);
	if (!container) return;

	// プログレス非表示
	hideUploadProgress(widgetId);

	// エラー表示
	const errorDiv = container.querySelector(".kt-file-uploader-error") as HTMLElement | null;
	if (errorDiv) {
		errorDiv.style.display = "block";
		errorDiv.textContent = message;
	}
}

/**
 * エラー表示を非表示にする
 */
export function hideUploadError(widgetId: string): void {
	const container = getWidgetContainer(widgetId);
	if (!container) return;

	const errorDiv = container.querySelector(".kt-file-uploader-error") as HTMLElement | null;
	if (errorDiv) {
		errorDiv.style.display = "none";
	}
}
