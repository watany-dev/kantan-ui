import { escapeHtml } from "../utils/html";
import { binaryToDataUri } from "./image";
import type { VideoConfig, VideoSource } from "./types";

const VIDEO_MAX_BINARY_SIZE = 50 * 1024 * 1024; // 50 MB

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
function resolveVideoSrc(source: VideoSource, config?: Partial<VideoConfig>): string {
	if (typeof source === "string") {
		validateUrl(source);

		// data URI の MIME タイプ検証
		if (source.startsWith("data:") && !source.startsWith("data:video/")) {
			throw new Error("data URI must have a video/* MIME type");
		}

		return source;
	}

	if (source instanceof Uint8Array || source instanceof ArrayBuffer) {
		const mimeType = config?.mimeType;
		if (!mimeType) {
			throw new Error("mimeType is required for binary video data");
		}
		if (!mimeType.startsWith("video/")) {
			throw new Error("mimeType must start with 'video/'");
		}

		const byteLength = source instanceof ArrayBuffer ? source.byteLength : source.byteLength;
		if (byteLength > VIDEO_MAX_BINARY_SIZE) {
			throw new Error(
				`Video binary data size (${byteLength} bytes) exceeds maximum allowed size (${VIDEO_MAX_BINARY_SIZE} bytes). Use a URL source instead.`,
			);
		}

		return binaryToDataUri(source, mimeType);
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

	const src = resolveVideoSrc(source, config);

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
