import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { renderTabsHeader, tabs } from "../../../src/kt/layout";
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
