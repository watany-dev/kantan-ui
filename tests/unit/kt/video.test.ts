import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { video } from "../../../src/kt/media";
import { renderVideo } from "../../../src/widgets/video";

describe("Video API", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
	});

	afterEach(() => {
		setRenderContext(null);
	});

	describe("video", () => {
		it("should be defined", () => {
			expect(video).toBeDefined();
			expect(typeof video).toBe("function");
		});

		it("should render URL video with video element and controls", () => {
			video("https://example.com/movie.mp4");
			const html = ctx.getHtml();
			expect(html).toContain('<figure class="kt-video"');
			expect(html).toContain("<video");
			expect(html).toContain("controls");
			expect(html).toContain('src="https://example.com/movie.mp4"');
			expect(html).toContain('preload="metadata"');
			expect(html).toContain("playsinline");
			expect(html).toContain("</video>");
			expect(html).toContain("</figure>");
		});

		it("should render with accessibility attributes", () => {
			video("https://example.com/movie.mp4");
			const html = ctx.getHtml();
			expect(html).toContain('role="group"');
			expect(html).toContain('aria-label="動画プレイヤー"');
		});

		it("should render with poster", () => {
			video("https://example.com/movie.mp4", {
				poster: "https://example.com/thumbnail.jpg",
			});
			const html = ctx.getHtml();
			expect(html).toContain('poster="https://example.com/thumbnail.jpg"');
		});

		it("should render with subtitles", () => {
			video("https://example.com/movie.mp4", {
				subtitles: { src: "/subs/ja.vtt", srclang: "ja", label: "日本語" },
			});
			const html = ctx.getHtml();
			expect(html).toContain("<track");
			expect(html).toContain('srclang="ja"');
		});

		it("should return empty string for empty source", () => {
			video("");
			const html = ctx.getHtml();
			expect(html).toBe("");
		});
	});

	describe("renderVideo", () => {
		it("should return HTML string directly", () => {
			const html = renderVideo("https://example.com/movie.mp4");
			expect(html).toContain("<video");
			expect(html).toContain("controls");
			expect(html).toContain('src="https://example.com/movie.mp4"');
		});

		it("should return empty string for empty source", () => {
			expect(renderVideo("")).toBe("");
			expect(renderVideo("   ")).toBe("");
		});
	});
});
