import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { audio } from "../../../src/kt/media";
import { renderAudio } from "../../../src/widgets/audio";

describe("Audio API", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
	});

	afterEach(() => {
		setRenderContext(null);
	});

	describe("audio", () => {
		it("should be defined", () => {
			expect(audio).toBeDefined();
			expect(typeof audio).toBe("function");
		});

		it("should render URL audio with audio element and controls", () => {
			audio("https://example.com/sound.mp3");
			const html = ctx.getHtml();
			expect(html).toContain('<div class="kt-audio">');
			expect(html).toContain("<audio");
			expect(html).toContain("controls");
			expect(html).toContain('src="https://example.com/sound.mp3"');
			expect(html).toContain('preload="metadata"');
			expect(html).toContain("</audio>");
			expect(html).toContain("</div>");
		});

		it("should escape special characters in URL", () => {
			audio("https://example.com/sound.mp3?name=<script>");
			const html = ctx.getHtml();
			expect(html).toContain("&lt;script&gt;");
			expect(html).not.toContain("<script>");
		});

		it("should return empty string for empty string source", () => {
			audio("");
			const html = ctx.getHtml();
			expect(html).toBe("");
		});

		it("should return empty string for whitespace-only source", () => {
			audio("   ");
			const html = ctx.getHtml();
			expect(html).toBe("");
		});

		describe("data URI", () => {
			const base64Audio = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEA";

			it("should render data URI audio", () => {
				audio(base64Audio);
				const html = ctx.getHtml();
				expect(html).toContain('src="data:audio/wav;base64,');
				expect(html).toContain('<div class="kt-audio">');
			});
		});

		describe("binary data", () => {
			const wavBytes = new Uint8Array([
				0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
			]);

			it("should render Uint8Array audio with mimeType", () => {
				audio(wavBytes, { mimeType: "audio/wav" });
				const html = ctx.getHtml();
				expect(html).toContain('src="data:audio/wav;base64,');
				expect(html).toContain('<div class="kt-audio">');
			});

			it("should render ArrayBuffer audio with mimeType", () => {
				audio(wavBytes.buffer, { mimeType: "audio/wav" });
				const html = ctx.getHtml();
				expect(html).toContain('src="data:audio/wav;base64,');
			});

			it("should throw error when mimeType is not specified for binary data", () => {
				expect(() => audio(wavBytes)).toThrow("mimeType is required for binary audio data");
			});
		});

		describe("loop", () => {
			it("should not include loop attribute by default", () => {
				audio("https://example.com/sound.mp3");
				const html = ctx.getHtml();
				expect(html).not.toContain("loop");
			});

			it("should include loop attribute when loop is true", () => {
				audio("https://example.com/sound.mp3", { loop: true });
				const html = ctx.getHtml();
				expect(html).toContain("loop");
			});
		});

		describe("autoplay", () => {
			it("should not include autoplay attribute by default", () => {
				audio("https://example.com/sound.mp3");
				const html = ctx.getHtml();
				expect(html).not.toContain("autoplay");
			});

			it("should include autoplay attribute when autoplay is true", () => {
				audio("https://example.com/sound.mp3", { autoplay: true });
				const html = ctx.getHtml();
				expect(html).toContain("autoplay");
			});
		});

		describe("combined options", () => {
			it("should render with loop and autoplay", () => {
				audio("https://example.com/sound.mp3", {
					loop: true,
					autoplay: true,
				});
				const html = ctx.getHtml();
				expect(html).toContain("loop");
				expect(html).toContain("autoplay");
				expect(html).toContain("controls");
			});
		});
	});

	describe("renderAudio", () => {
		it("should return HTML string directly", () => {
			const html = renderAudio("https://example.com/sound.mp3");
			expect(html).toContain("<audio");
			expect(html).toContain("controls");
			expect(html).toContain('src="https://example.com/sound.mp3"');
		});

		it("should return empty string for empty source", () => {
			expect(renderAudio("")).toBe("");
			expect(renderAudio("   ")).toBe("");
		});
	});
});
