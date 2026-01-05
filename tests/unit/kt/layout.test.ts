import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { columns, container, expander } from "../../../src/kt/layout";
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

	describe("columns", () => {
		it("should create columns with kt-columns class", () => {
			columns([() => write("Left"), () => write("Right")]);
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-columns"');
			expect(html).toContain('class="kt-column"');
		});

		it("should create correct number of columns", () => {
			columns([() => write("A"), () => write("B"), () => write("C")]);
			const html = ctx.getHtml();
			// 3つのカラムがあることを確認
			const columnMatches = html.match(/class="kt-column"/g);
			expect(columnMatches).toHaveLength(3);
		});

		it("should include content in each column", () => {
			columns([() => write("Left content"), () => write("Right content")]);
			const html = ctx.getHtml();
			expect(html).toContain("Left content");
			expect(html).toContain("Right content");
		});

		it("should use equal widths by default", () => {
			columns([() => write("A"), () => write("B")]);
			const html = ctx.getHtml();
			// 50%ずつ
			expect(html).toContain("flex: 0 0 50%");
		});

		it("should use custom ratios when provided", () => {
			columns([() => write("Sidebar"), () => write("Main"), () => write("Sidebar")], {
				ratios: [1, 2, 1],
			});
			const html = ctx.getHtml();
			// 1:2:1 = 25%:50%:25%
			expect(html).toContain("flex: 0 0 25%");
			expect(html).toContain("flex: 0 0 50%");
		});

		it("should use custom gap when provided", () => {
			columns([() => write("A"), () => write("B")], { gap: "2rem" });
			const html = ctx.getHtml();
			expect(html).toContain("gap: 2rem");
		});

		it("should use default gap when not provided", () => {
			columns([() => write("A"), () => write("B")]);
			const html = ctx.getHtml();
			expect(html).toContain("gap: 1rem");
		});

		it("should handle single column", () => {
			columns([() => write("Only one")]);
			const html = ctx.getHtml();
			expect(html).toContain("flex: 0 0 100%");
			expect(html).toContain("Only one");
		});

		it("should throw error without render context", () => {
			setRenderContext(null);
			expect(() => columns([() => write("test")])).toThrow("RenderContext is not available");
		});
	});

	describe("expander", () => {
		it("should create details element with kt-expander class", () => {
			expander("See details", () => {
				write("Hidden content");
			});
			const html = ctx.getHtml();
			expect(html).toContain("<details");
			expect(html).toContain('class="kt-expander"');
		});

		it("should include label in summary element", () => {
			expander("Click to expand", () => {
				write("Content");
			});
			const html = ctx.getHtml();
			expect(html).toContain("<summary");
			expect(html).toContain("Click to expand");
		});

		it("should include content in expander body", () => {
			expander("Details", () => {
				write("Expanded content here");
			});
			const html = ctx.getHtml();
			expect(html).toContain("Expanded content here");
			expect(html).toContain('class="kt-expander-content"');
		});

		it("should escape HTML in label", () => {
			expander('<script>alert("xss")</script>', () => {
				write("Content");
			});
			const html = ctx.getHtml();
			expect(html).toContain("&lt;script&gt;");
		});

		it("should add open attribute when expanded=true", () => {
			expander(
				"Expanded by default",
				() => {
					write("Content");
				},
				{ expanded: true },
			);
			const html = ctx.getHtml();
			expect(html).toContain("<details");
			expect(html).toContain(" open");
		});

		it("should not add open attribute by default", () => {
			expander("Collapsed by default", () => {
				write("Content");
			});
			const html = ctx.getHtml();
			expect(html).not.toMatch(/<details[^>]*\sopen/);
		});

		it("should throw error without render context", () => {
			setRenderContext(null);
			expect(() =>
				expander("Test", () => {
					write("test");
				}),
			).toThrow("RenderContext is not available");
		});
	});
});
