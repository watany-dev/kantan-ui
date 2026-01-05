import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { container } from "../../../src/kt/layout";
import { write } from "../../../src/kt/output";

describe("Layout APIs", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
	});

	afterEach(() => {
		setRenderContext(null);
	});

	describe("container", () => {
		it("should wrap content with kt-container class", () => {
			container(() => {
				write("Test content");
			});
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-container"');
			expect(html).toContain("Test content");
		});

		it("should include nested content in the container", () => {
			container(() => {
				write("First");
				write("Second");
			});
			const html = ctx.getHtml();
			expect(html).toContain("First");
			expect(html).toContain("Second");
			// コンテナ内にネストされていることを確認
			expect(html).toMatch(/kt-container[^>]*>.*First.*Second.*<\/div>/s);
		});

		it("should add border style when border option is true", () => {
			container(
				() => {
					write("Bordered content");
				},
				{ border: true },
			);
			const html = ctx.getHtml();
			expect(html).toContain("border:");
			expect(html).toContain("padding:");
			expect(html).toContain("border-radius:");
		});

		it("should add height and overflow style when height option is provided", () => {
			container(
				() => {
					write("Scrollable content");
				},
				{ height: "300px" },
			);
			const html = ctx.getHtml();
			expect(html).toContain("height: 300px");
			expect(html).toContain("overflow: auto");
		});

		it("should combine border and height options", () => {
			container(
				() => {
					write("Content");
				},
				{ border: true, height: "200px" },
			);
			const html = ctx.getHtml();
			expect(html).toContain("border:");
			expect(html).toContain("height: 200px");
		});

		it("should not add style attribute when no options provided", () => {
			container(() => {
				write("Plain content");
			});
			const html = ctx.getHtml();
			// スタイルなしの場合はstyle属性がないか空
			expect(html).toMatch(/<div class="kt-container">/);
		});
	});

	describe("without render context", () => {
		it("should throw error when no context", () => {
			setRenderContext(null);
			expect(() =>
				container(() => {
					write("test");
				}),
			).toThrow("RenderContext is not available");
		});
	});
});
