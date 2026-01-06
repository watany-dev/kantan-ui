import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { columns, container, expander, renderTabsHeader, tabs } from "../../../src/kt/layout";
import { write } from "../../../src/kt/output";
import { resetSessionManager, setSessionManager } from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { resetWidgetCounter } from "../../../src/widgets/registry";

// Mock SessionManager
class MockSessionManager {
	private states = new Map<string, Record<string, unknown>>();
	getSession(id: string) {
		return { id, state: this.states.get(id) ?? {} };
	}
	getState(sessionId: string): Record<string, unknown> | undefined {
		return this.states.get(sessionId);
	}
	setState(sessionId: string, key: string, value: unknown): void {
		if (!this.states.has(sessionId)) {
			this.states.set(sessionId, {});
		}
		const state = this.states.get(sessionId);
		if (state) {
			state[key] = value;
		}
	}
	hasState(sessionId: string, key: string): boolean {
		const state = this.states.get(sessionId);
		return state ? key in state : false;
	}
}

describe("tabs", () => {
	let ctx: RenderContext;
	let mockManager: MockSessionManager;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
		resetWidgetCounter();
		mockManager = new MockSessionManager();
		setSessionManager(mockManager as never);
		setCurrentSessionId("test-session");
	});

	afterEach(() => {
		setRenderContext(null);
		resetWidgetCounter();
		resetSessionManager();
		setCurrentSessionId(null);
	});

	describe("renderTabsHeader", () => {
		it("should render tab headers", () => {
			const html = renderTabsHeader(["Tab 1", "Tab 2", "Tab 3"], 0, "tabs_0");

			expect(html).toContain('class="kt-tabs-header"');
			expect(html).toContain("Tab 1");
			expect(html).toContain("Tab 2");
			expect(html).toContain("Tab 3");
		});

		it("should mark the active tab", () => {
			const html = renderTabsHeader(["Tab 1", "Tab 2"], 1, "tabs_0");

			expect(html).toContain('data-kt-tab="1" class="kt-tab kt-tab-active"');
		});

		it("should include tab indices", () => {
			const html = renderTabsHeader(["A", "B"], 0, "tabs_0");

			expect(html).toContain('data-kt-tab="0"');
			expect(html).toContain('data-kt-tab="1"');
		});

		it("should escape HTML in tab labels", () => {
			const html = renderTabsHeader(['<script>alert("xss")</script>'], 0, "tabs_0");

			expect(html).toContain("&lt;script&gt;");
			expect(html).not.toContain("<script>");
		});
	});

	describe("tabs function", () => {
		it("should return an array of tab functions", () => {
			const result = tabs(["Tab 1", "Tab 2"]);

			expect(result).toHaveLength(2);
			expect(typeof result[0]).toBe("function");
			expect(typeof result[1]).toBe("function");
		});

		it("should return the active tab index", () => {
			const result = tabs(["Tab 1", "Tab 2"]);

			// First tab (index 0) should be active by default
			expect(result[0].isActive).toBe(true);
			expect(result[1].isActive).toBe(false);
		});

		it("should render tab headers to context", () => {
			tabs(["Tab 1", "Tab 2"]);

			const html = ctx.getHtml();
			expect(html).toContain('class="kt-tabs-header"');
			expect(html).toContain("Tab 1");
			expect(html).toContain("Tab 2");
		});

		it("should execute callback for active tab only", () => {
			let tab1Called = false;
			let tab2Called = false;

			const [tab1, tab2] = tabs(["Tab 1", "Tab 2"]);

			tab1(() => {
				tab1Called = true;
			});
			tab2(() => {
				tab2Called = true;
			});

			expect(tab1Called).toBe(true);
			expect(tab2Called).toBe(false);
		});

		it("should render content to correct tab container", () => {
			const [tab1, tab2] = tabs(["Tab 1", "Tab 2"]);

			tab1(() => {
				ctx.append("<p>Content 1</p>");
			});
			tab2(() => {
				ctx.append("<p>Content 2</p>");
			});

			const html = ctx.getHtml();
			expect(html).toContain("Content 1");
			// Content 2 should not be rendered since tab2 is not active
			expect(html).not.toContain("Content 2");
		});

		it("should use custom key", () => {
			tabs(["Tab 1", "Tab 2"], { key: "custom-tabs" });

			const html = ctx.getHtml();
			expect(html).toContain('id="custom-tabs"');
		});

		it("should persist active tab across reruns", () => {
			// Simulate selecting tab 1 (second tab)
			mockManager.setState("test-session", "my-tabs", 1);

			const result = tabs(["Tab 1", "Tab 2"], { key: "my-tabs" });

			expect(result[0].isActive).toBe(false);
			expect(result[1].isActive).toBe(true);
		});
	});
});

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
