import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { write } from "../../../src/kt/output";
import { type StatusState, status } from "../../../src/kt/status";
import { resetSessionManager, setSessionManager } from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { getWidgetValue, resetWidgetCounter, setWidgetValue } from "../../../src/widgets/registry";

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
		it("renders running state with spinner icon", () => {
			status("Processing...", (s) => {
				s.update({ state: "running" });
			});
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
			status(
				"Processing...",
				(s) => {
					s.update({ state: "running" });
				},
				{ state: "running" },
			);
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

	describe("Iteration 3: StatusController.update()", () => {
		it("auto-completes when update() is not called", () => {
			status("Processing...", () => {}, { key: "status_auto" });
			const saved = getWidgetValue<{ state: string; expanded: boolean }>("status_auto", {
				state: "",
				expanded: true,
			});
			expect(saved.state).toBe("complete");
			expect(saved.expanded).toBe(false);
		});

		it("preserves state when update() is called", () => {
			status(
				"Processing...",
				(s) => {
					s.update({ state: "error", label: "Failed!" });
				},
				{ key: "status_manual" },
			);
			const saved = getWidgetValue<{ state: string; label: string }>("status_manual", {
				state: "",
				label: "",
			});
			expect(saved.state).toBe("error");
			expect(saved.label).toBe("Failed!");
		});

		it("allows partial updates", () => {
			status(
				"Processing...",
				(s) => {
					s.update({ label: "Almost done..." });
				},
				{ key: "status_partial" },
			);
			const saved = getWidgetValue<{ label: string; state: string }>("status_partial", {
				label: "",
				state: "",
			});
			expect(saved.label).toBe("Almost done...");
			// state remains running since update() was called but state wasn't changed
			expect(saved.state).toBe("running");
		});

		it("restores saved state on next rerun", () => {
			// 1回目: update でエラー状態を保存
			status(
				"Processing...",
				(s) => {
					s.update({ state: "error", label: "Failed!" });
				},
				{ key: "status_rerun" },
			);

			// 2回目: 保存された状態が復元される
			ctx = new RenderContext();
			setRenderContext(ctx);
			resetWidgetCounter();
			status("Processing...", () => {}, { key: "status_rerun" });
			const html = ctx.getHtml();
			expect(html).toContain("Failed!");
			expect(html).toContain("kt-status-error");
		});
	});

	describe("Iteration 3.5: edge cases and security", () => {
		it("closes details tag even when callback throws", () => {
			expect(() => {
				status("Crash", () => {
					write("Before error");
					throw new Error("Callback error");
				});
			}).toThrow("Callback error");
			const html = ctx.getHtml();
			expect(html).toContain("</details>");
		});

		it("auto-completes state after callback throws", () => {
			try {
				status(
					"Crash",
					() => {
						throw new Error("fail");
					},
					{ key: "status_throw" },
				);
			} catch {
				/* expected */
			}
			const saved = getWidgetValue<{ state: string }>("status_throw", {
				state: "",
			});
			expect(saved.state).toBe("complete");
		});

		it("falls back to running for invalid state in config", () => {
			status(
				"Test",
				(s) => {
					s.update({ state: "running" });
				},
				{ state: "invalid" as StatusState },
			);
			const html = ctx.getHtml();
			expect(html).toContain("kt-status-running");
		});

		it("falls back to running for invalid saved state", () => {
			setWidgetValue("status_invalid_saved", {
				label: "Bad",
				state: "hacked",
				expanded: true,
			});
			status(
				"Test",
				(s) => {
					s.update({ state: "running" });
				},
				{ key: "status_invalid_saved" },
			);
			const html = ctx.getHtml();
			expect(html).toContain("kt-status-running");
		});

		it("renders with empty label", () => {
			status("", () => {
				write("Content");
			});
			const html = ctx.getHtml();
			expect(html).toContain("kt-status-label");
			expect(html).toContain("Content");
		});

		it("includes aria-hidden on status icon", () => {
			status("Loading", () => {});
			const html = ctx.getHtml();
			expect(html).toContain('aria-hidden="true"');
		});

		it("includes sr-only text for screen readers", () => {
			status("Loading", () => {});
			const html = ctx.getHtml();
			expect(html).toContain("kt-sr-only");
		});

		it("validates state in update() call", () => {
			status(
				"Test",
				(s) => {
					s.update({ state: "hacked" as StatusState });
				},
				{ key: "status_update_invalid" },
			);
			const saved = getWidgetValue<{ state: string }>("status_update_invalid", { state: "" });
			expect(saved.state).toBe("running");
		});
	});
});
