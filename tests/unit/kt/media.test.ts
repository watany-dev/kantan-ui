import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { image } from "../../../src/kt/media";

describe("Media APIs", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
	});

	afterEach(() => {
		setRenderContext(null);
	});

	describe("image", () => {
		it("should be defined", () => {
			expect(image).toBeDefined();
			expect(typeof image).toBe("function");
		});

		it("should render URL image with figure and img elements", () => {
			image("https://example.com/photo.jpg");
			const html = ctx.getHtml();
			expect(html).toContain('<figure class="kt-image">');
			expect(html).toContain('src="https://example.com/photo.jpg"');
			expect(html).toContain('class="kt-image-img"');
			expect(html).toContain('loading="lazy"');
			expect(html).toContain("</figure>");
		});

		it("should set empty alt when not specified", () => {
			image("https://example.com/photo.jpg");
			const html = ctx.getHtml();
			expect(html).toContain('alt=""');
		});

		it("should not output figcaption when caption not specified", () => {
			image("https://example.com/photo.jpg");
			const html = ctx.getHtml();
			expect(html).not.toContain("<figcaption");
		});

		it("should escape special characters in URL", () => {
			image("https://example.com/photo.jpg?name=<script>");
			const html = ctx.getHtml();
			expect(html).toContain("&lt;script&gt;");
			expect(html).not.toContain("<script>");
		});

		describe("caption and alt", () => {
			it("should output figcaption when caption is specified", () => {
				image("https://example.com/photo.jpg", { caption: "Sample image" });
				const html = ctx.getHtml();
				expect(html).toContain('<figcaption class="kt-image-caption">Sample image</figcaption>');
			});

			it("should use caption as alt when alt is not specified", () => {
				image("https://example.com/photo.jpg", { caption: "Sample image" });
				const html = ctx.getHtml();
				expect(html).toContain('alt="Sample image"');
			});

			it("should use alt when explicitly specified", () => {
				image("https://example.com/photo.jpg", {
					caption: "Caption text",
					alt: "Alt text",
				});
				const html = ctx.getHtml();
				expect(html).toContain('alt="Alt text"');
				expect(html).toContain("Caption text</figcaption>");
			});

			it("should escape HTML in caption", () => {
				image("https://example.com/photo.jpg", {
					caption: "<script>alert('xss')</script>",
				});
				const html = ctx.getHtml();
				expect(html).toContain("&lt;script&gt;");
				expect(html).not.toContain("<script>alert");
			});

			it("should escape HTML in alt", () => {
				image("https://example.com/photo.jpg", {
					alt: "<img onerror=alert(1)>",
				});
				const html = ctx.getHtml();
				expect(html).toContain("&lt;img onerror=alert(1)&gt;");
			});

			it("should set empty alt when both caption and alt are not specified", () => {
				image("https://example.com/photo.jpg", {});
				const html = ctx.getHtml();
				expect(html).toContain('alt=""');
			});
		});

		describe("size control", () => {
			it("should set width as CSS variable when width is specified", () => {
				image("https://example.com/photo.jpg", { width: 300 });
				const html = ctx.getHtml();
				expect(html).toContain('style="--kt-image-width: 300px"');
			});

			it("should add container-width class when useContainerWidth is true", () => {
				image("https://example.com/photo.jpg", { useContainerWidth: true });
				const html = ctx.getHtml();
				expect(html).toContain('class="kt-image kt-image-container-width"');
			});

			it("should ignore width when useContainerWidth is true", () => {
				image("https://example.com/photo.jpg", {
					width: 300,
					useContainerWidth: true,
				});
				const html = ctx.getHtml();
				expect(html).toContain("kt-image-container-width");
				expect(html).not.toContain("--kt-image-width");
			});

			it("should not include style attribute when no size is specified", () => {
				image("https://example.com/photo.jpg");
				const html = ctx.getHtml();
				expect(html).not.toContain("style=");
			});
		});
	});
});
