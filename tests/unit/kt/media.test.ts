import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { image } from "../../../src/kt/media";
import { detectSourceType, svgToDataUri } from "../../../src/widgets/image";

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

		describe("data URI", () => {
			const base64Pixel =
				"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

			it("should render data URI image", () => {
				image(base64Pixel);
				const html = ctx.getHtml();
				expect(html).toContain('src="data:image/png;base64,');
				expect(html).toContain('<figure class="kt-image">');
			});

			it("should detect data URI source type", () => {
				expect(detectSourceType(base64Pixel)).toBe("dataUri");
			});

			it("should detect URL source type", () => {
				expect(detectSourceType("https://example.com/photo.jpg")).toBe("url");
				expect(detectSourceType("http://example.com/photo.jpg")).toBe("url");
				expect(detectSourceType("/images/photo.jpg")).toBe("url");
			});

			it("should render data URI with caption", () => {
				image(base64Pixel, { caption: "1x1 pixel" });
				const html = ctx.getHtml();
				expect(html).toContain("1x1 pixel</figcaption>");
			});
		});

		describe("SVG string", () => {
			const svgCircle =
				'<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="red" /></svg>';

			it("should detect SVG source type", () => {
				expect(detectSourceType(svgCircle)).toBe("svg");
				expect(detectSourceType("  <svg></svg>")).toBe("svg");
			});

			it("should convert SVG to data URI", () => {
				const dataUri = svgToDataUri(svgCircle);
				expect(dataUri.startsWith("data:image/svg+xml,")).toBe(true);
				expect(dataUri).toContain(encodeURIComponent("<svg"));
			});

			it("should render SVG as data URI image", () => {
				image(svgCircle);
				const html = ctx.getHtml();
				expect(html).toContain('src="data:image/svg+xml,');
				expect(html).toContain('<figure class="kt-image">');
			});

			it("should render SVG with caption", () => {
				image(svgCircle, { caption: "Red circle" });
				const html = ctx.getHtml();
				expect(html).toContain("Red circle</figcaption>");
			});

			it("should not include raw SVG in output for XSS prevention", () => {
				image(svgCircle);
				const html = ctx.getHtml();
				// SVGタグが直接出力されていないことを確認
				expect(html).not.toContain("<svg");
				expect(html).not.toContain("<circle");
			});
		});
	});
});
