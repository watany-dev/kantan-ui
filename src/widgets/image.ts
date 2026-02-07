import { raw, renderHtml } from "../utils/html";
import type { ImageConfig, ImageSource } from "./types";

/**
 * ソースタイプ
 */
type SourceType = "url" | "dataUri" | "svg" | "binary" | "blob";

/**
 * 画像ソースのタイプを判別
 */
export function detectSourceType(source: ImageSource): SourceType {
	if (source instanceof Uint8Array || source instanceof ArrayBuffer) {
		return "binary";
	}
	if (source instanceof Blob) {
		return "blob";
	}
	if (typeof source === "string") {
		if (source.startsWith("data:")) {
			return "dataUri";
		}
		if (source.trimStart().startsWith("<svg")) {
			return "svg";
		}
		// URL または相対パス
		return "url";
	}
	throw new Error("Unsupported image source type");
}

/**
 * alt属性の値を決定
 * - alt指定時はaltを使用
 * - alt未指定・caption指定時はcaptionを使用
 * - 両方未指定時は空文字列
 */
function resolveAlt(config?: Partial<ImageConfig>, index?: number): string {
	// alt が明示的に指定されている場合
	if (config?.alt !== undefined) {
		// 配列の場合はイテレーション9で実装
		if (Array.isArray(config.alt)) {
			return config.alt[index ?? 0] ?? "";
		}
		return config.alt;
	}

	// caption をフォールバックとして使用
	if (config?.caption !== undefined) {
		// 配列の場合はイテレーション9で実装
		if (Array.isArray(config.caption)) {
			return config.caption[index ?? 0] ?? "";
		}
		return config.caption;
	}

	return "";
}

/**
 * caption値を取得
 */
function resolveCaption(config?: Partial<ImageConfig>, index?: number): string | undefined {
	if (config?.caption === undefined) {
		return undefined;
	}

	if (Array.isArray(config.caption)) {
		return config.caption[index ?? 0];
	}

	return config.caption;
}

/**
 * figureのクラスを決定
 */
function resolveFigureClass(config?: Partial<ImageConfig>): string {
	const classes = ["kt-image"];

	// useContainerWidth が優先
	if (config?.useContainerWidth) {
		classes.push("kt-image-container-width");
	}

	return classes.join(" ");
}

/**
 * figureのstyle属性を決定
 */
function resolveFigureStyle(config?: Partial<ImageConfig>): string {
	// useContainerWidth が指定されている場合は width を無視
	if (config?.useContainerWidth) {
		return "";
	}

	if (config?.width !== undefined) {
		return ` style="--kt-image-width: ${config.width}px"`;
	}

	return "";
}

/**
 * SVG文字列をdata URIに変換
 * インラインSVGを<img>タグで安全に表示するため
 */
export function svgToDataUri(svg: string): string {
	const encoded = encodeURIComponent(svg);
	return `data:image/svg+xml,${encoded}`;
}

/**
 * バイナリデータをdata URIに変換
 *
 * @param data - Uint8Array または ArrayBuffer
 * @param mimeType - MIMEタイプ（例: "image/png", "image/jpeg"）
 * @returns data URI文字列
 */
export function binaryToDataUri(data: Uint8Array | ArrayBuffer, mimeType: string): string {
	const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
	let binary = "";
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i] as number);
	}
	const base64 = btoa(binary);
	return `data:${mimeType};base64,${base64}`;
}

/**
 * 文字列ソースをsrc属性用に解決
 */
function resolveStringSrc(source: string): string {
	const type = detectSourceType(source);

	switch (type) {
		case "dataUri":
			// data URIはそのまま使用
			return source;
		case "svg":
			// SVGをdata URIに変換（XSSを防止）
			return svgToDataUri(source);
		default:
			// URL または相対パス
			return source;
	}
}

/**
 * ImageSourceを文字列ソースに変換
 * バイナリデータはdata URIに変換
 */
function convertToStringSrc(source: ImageSource, config?: Partial<ImageConfig>): string {
	if (typeof source === "string") {
		return resolveStringSrc(source);
	}

	if (source instanceof Uint8Array || source instanceof ArrayBuffer) {
		if (!config?.mimeType) {
			throw new Error("mimeType is required for binary image data");
		}
		return binaryToDataUri(source, config.mimeType);
	}

	// Blob は非同期処理が必要なため未対応
	throw new Error("Blob source is not yet supported");
}

/**
 * 単一画像のHTMLをレンダリング
 */
function renderSingleImage(source: string, config?: Partial<ImageConfig>, index?: number): string {
	const src = resolveStringSrc(source);
	const alt = resolveAlt(config, index);
	const caption = resolveCaption(config, index);
	const figureClass = resolveFigureClass(config);
	const figureStyle = resolveFigureStyle(config);

	const captionHtml = caption
		? renderHtml`<figcaption class="kt-image-caption">${caption}</figcaption>`
		: "";

	return renderHtml`<figure class="${raw(figureClass)}"${raw(figureStyle)}><img src="${src}" alt="${alt}" class="kt-image-img" loading="lazy" />${raw(captionHtml)}</figure>`;
}

/**
 * 複数画像のギャラリーHTMLをレンダリング
 */
function renderGallery(sources: ImageSource[], config?: Partial<ImageConfig>): string {
	// 空配列の場合は空文字列を返す
	if (sources.length === 0) {
		return "";
	}

	// 各画像をレンダリング（空文字列はスキップ）
	const images: string[] = [];
	for (let index = 0; index < sources.length; index++) {
		const source = sources[index];
		// 空文字列または空白のみの場合はスキップ
		if (typeof source === "string" && !source.trim()) {
			continue;
		}
		const stringSrc = convertToStringSrc(source as ImageSource, config);
		images.push(renderSingleImage(stringSrc, config, index));
	}

	// 全てスキップされた場合は空文字列を返す
	if (images.length === 0) {
		return "";
	}

	// ギャラリーラッパーで囲む
	return renderHtml`<div class="kt-image-gallery">${raw(images.join(""))}</div>`;
}

/**
 * 画像のHTMLをレンダリング
 */
export function renderImage(
	source: ImageSource | ImageSource[],
	config?: Partial<ImageConfig>,
): string {
	// 配列の場合はギャラリーとしてレンダリング
	if (Array.isArray(source)) {
		return renderGallery(source, config);
	}

	// 文字列の場合
	if (typeof source === "string") {
		// 空文字列または空白のみの場合は空文字列を返す
		if (!source.trim()) {
			return "";
		}
		return renderSingleImage(source, config);
	}

	// Uint8Array または ArrayBuffer の場合
	if (source instanceof Uint8Array || source instanceof ArrayBuffer) {
		if (!config?.mimeType) {
			throw new Error("mimeType is required for binary image data");
		}
		const dataUri = binaryToDataUri(source, config.mimeType);
		return renderSingleImage(dataUri, config);
	}

	// Blob は後のイテレーションで対応（非同期処理が必要）
	return "";
}
