import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { image } from "../../../src/kt/media";
import { binaryToDataUri, detectSourceType, svgToDataUri } from "../../../src/widgets/image";

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

			it("should use first element when alt is an array", () => {
				image("https://example.com/photo.jpg", { alt: ["First alt", "Second alt"] });
				const html = ctx.getHtml();
				expect(html).toContain('alt="First alt"');
			});

			it("should use first element when caption is an array", () => {
				image("https://example.com/photo.jpg", { caption: ["First caption", "Second caption"] });
				const html = ctx.getHtml();
				expect(html).toContain('alt="First caption"');
				expect(html).toContain("First caption</figcaption>");
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

		describe("binary data", () => {
			// 1x1 transparent PNG as Uint8Array
			const pngBytes = new Uint8Array([
				0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
				0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f,
				0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00,
				0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
				0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
			]);

			it("should detect binary source type", () => {
				expect(detectSourceType(pngBytes)).toBe("binary");
				expect(detectSourceType(pngBytes.buffer)).toBe("binary");
			});

			it("should convert Uint8Array to data URI", () => {
				const dataUri = binaryToDataUri(pngBytes, "image/png");
				expect(dataUri.startsWith("data:image/png;base64,")).toBe(true);
			});

			it("should convert ArrayBuffer to data URI", () => {
				const dataUri = binaryToDataUri(pngBytes.buffer, "image/png");
				expect(dataUri.startsWith("data:image/png;base64,")).toBe(true);
			});

			it("should render Uint8Array image with mimeType", () => {
				image(pngBytes, { mimeType: "image/png" });
				const html = ctx.getHtml();
				expect(html).toContain('src="data:image/png;base64,');
				expect(html).toContain('<figure class="kt-image">');
			});

			it("should render ArrayBuffer image with mimeType", () => {
				image(pngBytes.buffer, { mimeType: "image/png" });
				const html = ctx.getHtml();
				expect(html).toContain('src="data:image/png;base64,');
			});

			it("should throw error when mimeType is not specified", () => {
				expect(() => image(pngBytes)).toThrow("mimeType is required for binary image data");
			});

			it("should render binary image with caption", () => {
				image(pngBytes, { mimeType: "image/png", caption: "Test image" });
				const html = ctx.getHtml();
				expect(html).toContain("Test image</figcaption>");
			});
		});

		describe("Blob detection", () => {
			it("should detect Blob source type", () => {
				const blob = new Blob(["test"], { type: "image/png" });
				expect(detectSourceType(blob)).toBe("blob");
			});
		});

		describe("error handling", () => {
			it("should throw error for unsupported source type", () => {
				// @ts-expect-error: testing invalid input
				expect(() => detectSourceType(123)).toThrow("Unsupported image source type");
			});

			it("should return empty string for array source (not yet implemented)", () => {
				// 配列はイテレーション9で実装予定
				image(["https://example.com/1.jpg", "https://example.com/2.jpg"]);
				const html = ctx.getHtml();
				expect(html).toBe("");
			});
		});
	});
});
