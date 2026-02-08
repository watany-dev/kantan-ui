import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { write } from "../../../src/kt/output";
import { status } from "../../../src/kt/status";
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

describe("kt.status", () => {
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

	describe("Iteration 1: basic rendering", () => {
		it("renders a details element with kt-status class", () => {
			status("Loading...", () => {});
			const html = ctx.getHtml();
			expect(html).toContain('<details class="kt-status');
			expect(html).toContain("</details>");
		});

		it("renders label in summary", () => {
			status("Downloading data...", () => {});
			const html = ctx.getHtml();
			expect(html).toContain("Downloading data...");
		});

		it("renders callback content inside status container", () => {
			status("Loading...", () => {
				write("Step 1 done");
			});
			const html = ctx.getHtml();
			expect(html).toContain("Step 1 done");
		});

		it("escapes HTML in label", () => {
			status("<script>alert(1)</script>", () => {});
			const html = ctx.getHtml();
			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;script&gt;");
		});
	});
});
