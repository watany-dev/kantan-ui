import { escapeHtml } from "../utils/html";
import type { ImageConfig, ImageSource } from "./types";

/**
 * 単一画像のHTMLをレンダリング
 */
function renderSingleImage(source: string, config?: Partial<ImageConfig>): string {
	const alt = escapeHtml(String(config?.alt ?? ""));

	return `<figure class="kt-image"><img src="${escapeHtml(source)}" alt="${alt}" class="kt-image-img" loading="lazy" /></figure>`;
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

	// 文字列の場合はURLとして扱う
	if (typeof source === "string") {
		return renderSingleImage(source, config);
	}

	// バイナリデータは後のイテレーションで実装
	return "";
}
