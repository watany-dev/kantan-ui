import { raw, renderHtml } from "../utils/html";
import { binaryToDataUri } from "./image";
import type { AudioConfig, AudioSource } from "./types";

/**
 * オーディオソースをsrc属性用の文字列に変換
 */
function resolveAudioSrc(source: AudioSource, config?: Partial<AudioConfig>): string {
	if (typeof source === "string") {
		return source;
	}

	if (source instanceof Uint8Array || source instanceof ArrayBuffer) {
		const mimeType = config?.mimeType;
		if (!mimeType) {
			throw new Error("mimeType is required for binary audio data");
		}
		return binaryToDataUri(source, mimeType);
	}

	throw new Error("Unsupported audio source type");
}

/**
 * オーディオのHTMLをレンダリング
 */
export function renderAudio(source: AudioSource, config?: Partial<AudioConfig>): string {
	// 空文字列・空白のみの場合は空文字列を返す
	if (typeof source === "string" && !source.trim()) {
		return "";
	}

	const src = resolveAudioSrc(source, config);

	const additionalAttrs: string[] = [];

	if (config?.loop) {
		additionalAttrs.push(" loop");
	}

	if (config?.autoplay) {
		additionalAttrs.push(" autoplay");
	}

	return renderHtml`<div class="kt-audio"><audio controls src="${src}" preload="metadata"${raw(additionalAttrs.join(""))}></audio></div>`;
}
