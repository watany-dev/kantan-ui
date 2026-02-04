import { renderAudio } from "../widgets/audio";
import { renderImage } from "../widgets/image";
import type { AudioConfig, AudioSource, ImageConfig, ImageSource } from "../widgets/types";
import { requireRenderContext } from "./context";

/**
 * 画像を表示
 *
 * @param source - 画像ソース（URL, data URI, SVG文字列, バイナリデータ）
 * @param config - オプション設定
 *
 * @example
 * // URL から画像を表示
 * kt.image("https://example.com/photo.jpg");
 *
 * // キャプション付き
 * kt.image("https://example.com/photo.jpg", {
 *   caption: "サンプル画像",
 * });
 *
 * // サイズ指定
 * kt.image("https://example.com/photo.jpg", {
 *   width: 300,
 * });
 */
export function image(source: ImageSource | ImageSource[], config?: Partial<ImageConfig>): void {
	const ctx = requireRenderContext();
	const html = renderImage(source, config);
	ctx.append(html);
}

/**
 * オーディオプレーヤーを表示
 *
 * @param source - オーディオソース（URL, data URI, バイナリデータ）
 * @param config - オプション設定
 *
 * @example
 * // URL からオーディオを再生
 * kt.audio("https://example.com/sound.mp3");
 *
 * // ループ再生
 * kt.audio("https://example.com/bgm.mp3", { loop: true });
 *
 * // バイナリデータから再生
 * kt.audio(wavBytes, { mimeType: "audio/wav" });
 */
export function audio(source: AudioSource, config?: Partial<AudioConfig>): void {
	const ctx = requireRenderContext();
	const html = renderAudio(source, config);
	ctx.append(html);
}
