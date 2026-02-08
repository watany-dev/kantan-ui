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

	describe("Iteration 2: status states", () => {
		it("defaults to running state with spinner icon", () => {
			status("Processing...", () => {});
			const html = ctx.getHtml();
			expect(html).toContain("kt-status-running");
			expect(html).toContain("kt-spinner-icon");
		});

		it("uses complete state when config.state is complete", () => {
			status("Done", () => {}, { state: "complete" });
			const html = ctx.getHtml();
			expect(html).toContain("kt-status-complete");
			expect(html).toContain("&#10003;");
		});

		it("uses error state when config.state is error", () => {
			status("Failed", () => {}, { state: "error" });
			const html = ctx.getHtml();
			expect(html).toContain("kt-status-error");
			expect(html).toContain("&#10007;");
		});

		it("defaults expanded=true when state is running", () => {
			status("Processing...", () => {}, { state: "running" });
			const html = ctx.getHtml();
			expect(html).toContain(" open");
		});

		it("defaults expanded=false when state is complete", () => {
			status("Done", () => {}, { state: "complete" });
			const html = ctx.getHtml();
			expect(html).not.toContain(" open");
		});

		it("defaults expanded=false when state is error", () => {
			status("Failed", () => {}, { state: "error" });
			const html = ctx.getHtml();
			expect(html).not.toContain(" open");
		});

		it("respects explicit expanded config", () => {
			status("Done", () => {}, { state: "complete", expanded: true });
			const html = ctx.getHtml();
			expect(html).toContain(" open");
		});

		it("renders status label in a span with kt-status-label class", () => {
			status("My Status", () => {});
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-status-label"');
			expect(html).toContain("My Status");
		});
	});
});
