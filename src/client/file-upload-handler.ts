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
