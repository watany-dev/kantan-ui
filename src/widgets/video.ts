import { escapeHtml } from "../utils/html";
import { binaryToDataUri } from "./image";
import type { SubtitleTrack, VideoConfig, VideoSource } from "./types";

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
 * startTime/endTime のバリデーション
 */
function validateTimeRange(config?: Partial<VideoConfig>): void {
	if (config?.startTime !== undefined) {
		if (!Number.isFinite(config.startTime) || config.startTime < 0) {
			throw new Error("startTime must be a non-negative finite number");
		}
	}
	if (config?.endTime !== undefined) {
		if (!Number.isFinite(config.endTime) || config.endTime <= 0) {
			throw new Error("endTime must be a positive finite number");
		}
	}
	if (
		config?.startTime !== undefined &&
		config?.endTime !== undefined &&
		config.endTime <= config.startTime
	) {
		throw new Error("endTime must be greater than startTime");
	}
}

/**
 * Media Fragment URI を生成
 */
function buildMediaFragment(config?: Partial<VideoConfig>): string {
	const hasStart = config?.startTime !== undefined && config.startTime > 0;
	const hasEnd = config?.endTime !== undefined;

	if (!hasStart && !hasEnd) {
		return "";
	}

	if (hasStart && hasEnd) {
		return `#t=${config.startTime},${config.endTime}`;
	}
	if (hasStart) {
		return `#t=${config.startTime}`;
	}
	return `#t=,${config?.endTime}`;
}

/**
 * 動画のHTMLをレンダリング
 */
export function renderVideo(source: VideoSource, config?: Partial<VideoConfig>): string {
	// 空文字列・空白のみの場合は空文字列を返す
	if (typeof source === "string" && !source.trim()) {
		return "";
	}

	// 時間バリデーション
	validateTimeRange(config);

	const src = resolveVideoSrc(source, config);

	// poster の検証
	if (config?.poster) {
		validateUrl(config.poster);
	}

	// autoplay + !muted 警告
	if (config?.autoplay && !config?.muted) {
		console.warn("autoplay without muted may be blocked by browser policy");
	}

	// Media Fragment URI の付与
	const fragment = buildMediaFragment(config);

	// video 属性の構築
	const videoAttrs: string[] = [
		`src="${escapeHtml(src + fragment)}"`,
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

	if (config?.loop) {
		videoAttrs.push("loop");
	}

	if (config?.autoplay) {
		videoAttrs.push("autoplay");
	}

	if (config?.muted) {
		videoAttrs.push("muted");
	}

	// 字幕トラック
	const trackHtml = buildSubtitleTracks(config?.subtitles);

	// フォールバック
	const fallback =
		'<p class="kt-video-fallback">お使いのブラウザは動画再生に対応していません。</p>';

	return `<figure class="kt-video" role="group" aria-label="動画プレイヤー"><video ${videoAttrs.join(" ")}>${trackHtml}${fallback}</video></figure>`;
}

/**
 * 字幕トラックのHTML生成
 */
function buildSubtitleTracks(subtitles?: SubtitleTrack | SubtitleTrack[]): string {
	if (!subtitles) {
		return "";
	}

	const tracks = Array.isArray(subtitles) ? subtitles : [subtitles];

	return tracks
		.map((track, index) => {
			validateUrl(track.src);
			const attrs = [
				'kind="subtitles"',
				`src="${escapeHtml(track.src)}"`,
				`srclang="${escapeHtml(track.srclang)}"`,
				`label="${escapeHtml(track.label)}"`,
			];
			if (index === 0) {
				attrs.push("default");
			}
			return `<track ${attrs.join(" ")} />`;
		})
		.join("");
}
