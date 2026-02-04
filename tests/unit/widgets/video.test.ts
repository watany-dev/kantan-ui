import { describe, expect, it } from "vitest";
import type { SubtitleTrack, VideoConfig, VideoSource } from "../../../src/widgets/types";
import { renderVideo } from "../../../src/widgets/video";

describe("Video Types", () => {
	describe("VideoSource", () => {
		it("should accept string URL", () => {
			const source: VideoSource = "https://example.com/movie.mp4";
			expect(typeof source).toBe("string");
		});

		it("should accept data URI string", () => {
			const source: VideoSource = "data:video/mp4;base64,AAAA";
			expect(typeof source).toBe("string");
		});

		it("should accept Uint8Array", () => {
			const source: VideoSource = new Uint8Array([0x00, 0x01]);
			expect(source).toBeInstanceOf(Uint8Array);
		});

		it("should accept ArrayBuffer", () => {
			const source: VideoSource = new ArrayBuffer(8);
			expect(source).toBeInstanceOf(ArrayBuffer);
		});
	});

	describe("SubtitleTrack", () => {
		it("should have required properties", () => {
			const track: SubtitleTrack = {
				src: "/subs/ja.vtt",
				srclang: "ja",
				label: "日本語",
			};
			expect(track.src).toBe("/subs/ja.vtt");
			expect(track.srclang).toBe("ja");
			expect(track.label).toBe("日本語");
		});
	});

	describe("VideoConfig", () => {
		it("should allow empty config", () => {
			const config: Partial<VideoConfig> = {};
			expect(config).toEqual({});
		});

		it("should accept all optional properties", () => {
			const config: Partial<VideoConfig> = {
				mimeType: "video/mp4",
				startTime: 30,
				endTime: 120,
				subtitles: { src: "/subs/ja.vtt", srclang: "ja", label: "日本語" },
				loop: true,
				autoplay: true,
				muted: true,
				poster: "https://example.com/thumbnail.jpg",
				playsinline: true,
				key: "my-video",
			};
			expect(config.mimeType).toBe("video/mp4");
			expect(config.startTime).toBe(30);
			expect(config.endTime).toBe(120);
			expect(config.loop).toBe(true);
			expect(config.autoplay).toBe(true);
			expect(config.muted).toBe(true);
			expect(config.poster).toBe("https://example.com/thumbnail.jpg");
			expect(config.playsinline).toBe(true);
			expect(config.key).toBe("my-video");
		});

		it("should accept subtitles as array", () => {
			const config: Partial<VideoConfig> = {
				subtitles: [
					{ src: "/subs/ja.vtt", srclang: "ja", label: "日本語" },
					{ src: "/subs/en.vtt", srclang: "en", label: "English" },
				],
			};
			expect(Array.isArray(config.subtitles)).toBe(true);
		});
	});
});

describe("renderVideo", () => {
	describe("basic URL rendering", () => {
		it("should render video element with controls", () => {
			const html = renderVideo("https://example.com/movie.mp4");
			expect(html).toContain("<figure");
			expect(html).toContain("<video");
			expect(html).toContain("controls");
			expect(html).toContain('src="https://example.com/movie.mp4"');
			expect(html).toContain('preload="metadata"');
			expect(html).toContain("</video>");
			expect(html).toContain("</figure>");
		});

		it("should include figure with role and aria-label", () => {
			const html = renderVideo("https://example.com/movie.mp4");
			expect(html).toContain('class="kt-video"');
			expect(html).toContain('role="group"');
			expect(html).toContain('aria-label="動画プレイヤー"');
		});

		it("should include video-player class", () => {
			const html = renderVideo("https://example.com/movie.mp4");
			expect(html).toContain('class="kt-video-player"');
		});

		it("should include playsinline by default", () => {
			const html = renderVideo("https://example.com/movie.mp4");
			expect(html).toContain("playsinline");
		});

		it("should not include playsinline when set to false", () => {
			const html = renderVideo("https://example.com/movie.mp4", {
				playsinline: false,
			});
			expect(html).not.toContain("playsinline");
		});

		it("should include fallback content", () => {
			const html = renderVideo("https://example.com/movie.mp4");
			expect(html).toContain('class="kt-video-fallback"');
			expect(html).toContain("お使いのブラウザは動画再生に対応していません。");
		});
	});

	describe("poster", () => {
		it("should include poster attribute when specified", () => {
			const html = renderVideo("https://example.com/movie.mp4", {
				poster: "https://example.com/thumbnail.jpg",
			});
			expect(html).toContain('poster="https://example.com/thumbnail.jpg"');
		});

		it("should not include poster attribute when not specified", () => {
			const html = renderVideo("https://example.com/movie.mp4");
			expect(html).not.toContain("poster");
		});

		it("should escape poster URL", () => {
			const html = renderVideo("https://example.com/movie.mp4", {
				poster: 'https://example.com/thumb.jpg?a=1&b="2"',
			});
			expect(html).toContain("&amp;");
			expect(html).toContain("&quot;");
		});
	});

	describe("security", () => {
		it("should escape special characters in URL", () => {
			const html = renderVideo("https://example.com/movie.mp4?name=<script>");
			expect(html).toContain("&lt;script&gt;");
			expect(html).not.toContain("<script>");
		});

		it("should reject javascript: URI in source", () => {
			expect(() => renderVideo("javascript:alert(1)")).toThrow("javascript: URLs are not allowed");
		});

		it("should reject javascript: URI case-insensitively", () => {
			expect(() => renderVideo("JavaScript:alert(1)")).toThrow("javascript: URLs are not allowed");
		});

		it("should reject javascript: URI in poster", () => {
			expect(() =>
				renderVideo("https://example.com/movie.mp4", {
					poster: "javascript:alert(1)",
				}),
			).toThrow("javascript: URLs are not allowed");
		});

		it("should reject data URI with non-video MIME type", () => {
			expect(() => renderVideo("data:text/html;base64,AAAA")).toThrow(
				"data URI must have a video/* MIME type",
			);
		});

		it("should accept data URI with video MIME type", () => {
			const html = renderVideo("data:video/mp4;base64,AAAA");
			expect(html).toContain('src="data:video/mp4;base64,AAAA"');
		});
	});

	describe("empty source", () => {
		it("should return empty string for empty source", () => {
			expect(renderVideo("")).toBe("");
		});

		it("should return empty string for whitespace-only source", () => {
			expect(renderVideo("   ")).toBe("");
		});
	});

	describe("binary data", () => {
		const mp4Bytes = new Uint8Array([0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70]);

		it("should render Uint8Array video with mimeType", () => {
			const html = renderVideo(mp4Bytes, { mimeType: "video/mp4" });
			expect(html).toContain('src="data:video/mp4;base64,');
			expect(html).toContain('<figure class="kt-video"');
		});

		it("should render ArrayBuffer video with mimeType", () => {
			const html = renderVideo(mp4Bytes.buffer, { mimeType: "video/mp4" });
			expect(html).toContain('src="data:video/mp4;base64,');
		});

		it("should throw error when mimeType is not specified for binary data", () => {
			expect(() => renderVideo(mp4Bytes)).toThrow("mimeType is required for binary video data");
		});

		it("should throw error when mimeType does not start with video/", () => {
			expect(() => renderVideo(mp4Bytes, { mimeType: "audio/mp3" })).toThrow(
				"mimeType must start with 'video/'",
			);
		});

		it("should throw error when binary data exceeds 50MB", () => {
			const largeData = new Uint8Array(51 * 1024 * 1024);
			expect(() => renderVideo(largeData, { mimeType: "video/mp4" })).toThrow(
				/exceeds maximum allowed size/,
			);
		});
	});
});
