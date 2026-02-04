import { escapeHtml } from "../utils/html";
import type { VideoConfig, VideoSource } from "./types";

/**
 * ソースURLのセキュリティ検証
 */
function validateUrl(url: string): void {
	if (url.trim().toLowerCase().startsWith("javascript:")) {
		throw new Error("javascript: URLs are not allowed");
	}
}

/**
 * 動画ソースをsrc属性用の文字列に解決
 */
function resolveVideoSrc(source: VideoSource): string {
	if (typeof source === "string") {
		validateUrl(source);

		// data URI の MIME タイプ検証
		if (source.startsWith("data:") && !source.startsWith("data:video/")) {
			throw new Error("data URI must have a video/* MIME type");
		}

		return source;
	}

	throw new Error("Unsupported video source type");
}

/**
 * 動画のHTMLをレンダリング
 */
export function renderVideo(source: VideoSource, config?: Partial<VideoConfig>): string {
	// 空文字列・空白のみの場合は空文字列を返す
	if (typeof source === "string" && !source.trim()) {
		return "";
	}

	const src = resolveVideoSrc(source);

	// poster の検証
	if (config?.poster) {
		validateUrl(config.poster);
	}

	// video 属性の構築
	const videoAttrs: string[] = [
		`src="${escapeHtml(src)}"`,
		"controls",
		'class="kt-video-player"',
		'preload="metadata"',
	];

	// playsinline（デフォルト true）
	if (config?.playsinline !== false) {
		videoAttrs.push("playsinline");
	}

	if (config?.poster) {
		videoAttrs.push(`poster="${escapeHtml(config.poster)}"`);
	}

	// video 内部コンテンツ（フォールバック）
	const innerContent =
		'<p class="kt-video-fallback">お使いのブラウザは動画再生に対応していません。</p>';

	return `<figure class="kt-video" role="group" aria-label="動画プレイヤー"><video ${videoAttrs.join(" ")}>${innerContent}</video></figure>`;
}
