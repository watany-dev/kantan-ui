import { describe, expect, it } from "vitest";
import type { SubtitleTrack, VideoConfig, VideoSource } from "../../../src/widgets/types";

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
