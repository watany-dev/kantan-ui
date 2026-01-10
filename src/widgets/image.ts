import { escapeHtml } from "../utils/html";
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
		if (Array.isArray(config.alt)) {
			return config.alt[index ?? 0] ?? "";
		}
		return config.alt;
	}

	// caption をフォールバックとして使用
	if (config?.caption !== undefined) {
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
 * 単一画像のHTMLをレンダリング
 */
function renderSingleImage(source: string, config?: Partial<ImageConfig>, index?: number): string {
	const src = resolveStringSrc(source);
	const alt = escapeHtml(resolveAlt(config, index));
	const caption = resolveCaption(config, index);
	const figureClass = resolveFigureClass(config);
	const figureStyle = resolveFigureStyle(config);

	const captionHtml = caption
		? `<figcaption class="kt-image-caption">${escapeHtml(caption)}</figcaption>`
		: "";

	return `<figure class="${figureClass}"${figureStyle}><img src="${escapeHtml(src)}" alt="${alt}" class="kt-image-img" loading="lazy" />${captionHtml}</figure>`;
}

/**
 * 画像のHTMLをレンダリング
 */
export function renderImage(
	source: ImageSource | ImageSource[],
	config?: Partial<ImageConfig>,
): string {
	// 配列の場合は後のイテレーションで実装
	if (Array.isArray(source)) {
		return "";
	}

	// 文字列の場合
	if (typeof source === "string") {
		return renderSingleImage(source, config);
	}

	// バイナリデータは後のイテレーションで実装
	return "";
}
