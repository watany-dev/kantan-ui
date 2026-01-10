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
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

/**
 * ファイルデータをチャンクに分割してBase64エンコード
 * @param data ファイルデータ
 * @param chunkSize チャンクサイズ（バイト）
 * @returns Base64エンコードされたチャンクの配列
 */
export function createFileChunks(data: ArrayBuffer, chunkSize: number = DEFAULT_CHUNK_SIZE): string[] {
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
	const maxSizeStr = element.dataset?.maxSize;
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
 * ファイルアップロードメッセージ
 */
export interface FileUploadMessage {
	type: "file_upload";
	widgetId: string;
	filename: string;
	mimeType: string;
	size: number;
	data: string; // Base64エンコードされたデータ（または最初のチャンク）
	isChunked: boolean;
	totalChunks?: number;
	chunkIndex?: number;
}

/**
 * ファイルチャンクメッセージ
 */
export interface FileChunkMessage {
	type: "file_chunk";
	widgetId: string;
	uploadId: string;
	chunkIndex: number;
	data: string;
}

/**
 * ファイル読み込みオプション
 */
export interface FileReadOptions {
	maxSize: number;
	accept?: string;
	strictMode?: boolean;
	detectPolyglot?: boolean;
	verifyMagicBytes?: boolean;
}

/**
 * HTMLInputElementからファイル読み込みオプションを抽出
 */
export function getFileReadOptions(element: HTMLInputElement): FileReadOptions {
	return {
		maxSize: getMaxFileSize(element),
		accept: element.accept || undefined,
		strictMode: element.dataset.strictMode === "true",
		detectPolyglot: element.dataset.detectPolyglot !== "false",
		verifyMagicBytes: element.dataset.verifyMagicBytes !== "false",
	};
}

/**
 * ファイル読み込み結果
 */
export interface FileReadResult {
	success: boolean;
	data?: ArrayBuffer;
	filename?: string;
	mimeType?: string;
	size?: number;
	error?: string;
}

/**
 * FileをArrayBufferとして読み込む
 */
export function readFileAsArrayBuffer(file: File): Promise<FileReadResult> {
	return new Promise((resolve) => {
		const reader = new FileReader();

		reader.onload = () => {
			const result = reader.result;
			if (result instanceof ArrayBuffer) {
				resolve({
					success: true,
					data: result,
					filename: file.name,
					mimeType: file.type || "application/octet-stream",
					size: file.size,
				});
			} else {
				resolve({
					success: false,
					error: "Failed to read file as ArrayBuffer",
				});
			}
		};

		reader.onerror = () => {
			resolve({
				success: false,
				error: `Failed to read file: ${reader.error?.message || "Unknown error"}`,
			});
		};

		reader.readAsArrayBuffer(file);
	});
}

/**
 * ファイルを検証して読み込む
 */
export async function validateAndReadFile(
	file: File,
	options: FileReadOptions,
): Promise<FileReadResult> {
	// サイズ検証
	const sizeResult = validateFileSize(file.size, options.maxSize);
	if (!sizeResult.valid) {
		return { success: false, error: sizeResult.error };
	}

	// タイプ検証
	const typeResult = validateFileType(file.name, file.type, options.accept);
	if (!typeResult.valid) {
		return { success: false, error: typeResult.error };
	}

	// ファイル読み込み
	return readFileAsArrayBuffer(file);
}

/**
 * ファイルアップロードメッセージを作成
 */
export function createFileUploadMessage(
	widgetId: string,
	filename: string,
	mimeType: string,
	size: number,
	data: ArrayBuffer,
	chunkSize: number = DEFAULT_CHUNK_SIZE,
): FileUploadMessage | { message: FileUploadMessage; chunks: string[] } {
	const base64Data = arrayBufferToBase64(data);

	// チャンク不要の場合
	if (data.byteLength <= chunkSize) {
		return {
			type: "file_upload",
			widgetId,
			filename,
			mimeType,
			size,
			data: base64Data,
			isChunked: false,
		};
	}

	// チャンク分割が必要な場合
	const chunks = createFileChunks(data, chunkSize);
	return {
		message: {
			type: "file_upload",
			widgetId,
			filename,
			mimeType,
			size,
			data: chunks[0],
			isChunked: true,
			totalChunks: chunks.length,
			chunkIndex: 0,
		},
		chunks: chunks.slice(1),
	};
}
