import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { sidebar, wrapForSidebar } from "../../../src/kt/sidebar";
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

describe("wrapForSidebar", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
	});

	afterEach(() => {
		setRenderContext(null);
	});

	it("should wrap function to execute in sidebar context", () => {
		const wrappedWrite = wrapForSidebar(write);

		wrappedWrite("Hello from sidebar");

		expect(ctx.getSidebarHtml()).toContain("Hello from sidebar");
		expect(ctx.getMainHtml()).toBe("");
	});

	it("should pass arguments correctly", () => {
		const add = (a: number, b: number) => a + b;
		const wrappedAdd = wrapForSidebar(add);

		const result = wrappedAdd(2, 3);

		expect(result).toBe(5);
	});

	it("should preserve return values", () => {
		const getValue = () => 42;
		const wrappedGetValue = wrapForSidebar(getValue);

		expect(wrappedGetValue()).toBe(42);
	});

	it("should preserve complex return types", () => {
		const getObject = () => ({ name: "test", values: [1, 2, 3] });
		const wrappedGetObject = wrapForSidebar(getObject);

		expect(wrappedGetObject()).toEqual({ name: "test", values: [1, 2, 3] });
	});

	it("should restore context after execution", () => {
		const wrappedWrite = wrapForSidebar(write);

		expect(ctx.getTarget()).toBe("main");
		wrappedWrite("Sidebar content");
		expect(ctx.getTarget()).toBe("main");
	});

	it("should handle errors and restore context", () => {
		const throwError = () => {
			throw new Error("Test error");
		};
		const wrappedThrowError = wrapForSidebar(throwError);

		expect(() => wrappedThrowError()).toThrow("Test error");
		expect(ctx.getTarget()).toBe("main");
	});

	it("should work with functions that have optional parameters", () => {
		const greet = (name: string, greeting = "Hello") => `${greeting}, ${name}!`;
		const wrappedGreet = wrapForSidebar(greet);

		expect(wrappedGreet("World")).toBe("Hello, World!");
		expect(wrappedGreet("World", "Hi")).toBe("Hi, World!");
	});
});

describe("sidebar object notation", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
	});

	afterEach(() => {
		setRenderContext(null);
	});

	describe("callback notation (backward compatibility)", () => {
		it("should support callback notation", () => {
			sidebar(() => {
				write("Callback content");
			});

			expect(ctx.getSidebarHtml()).toContain("Callback content");
			expect(ctx.getMainHtml()).toBe("");
		});
	});

	describe("output APIs", () => {
		it("should support sidebar.write()", () => {
			sidebar.write("Hello from sidebar");

			expect(ctx.getSidebarHtml()).toContain("Hello from sidebar");
			expect(ctx.getMainHtml()).toBe("");
		});

		it("should support sidebar.title()", () => {
			sidebar.title("Sidebar Title");

			expect(ctx.getSidebarHtml()).toContain("Sidebar Title");
			expect(ctx.getSidebarHtml()).toContain("kt-title");
		});

		it("should support sidebar.header()", () => {
			sidebar.header("Header Text");

			expect(ctx.getSidebarHtml()).toContain("Header Text");
			expect(ctx.getSidebarHtml()).toContain("kt-header");
		});

		it("should support sidebar.subheader()", () => {
			sidebar.subheader("Subheader Text");

			expect(ctx.getSidebarHtml()).toContain("Subheader Text");
			expect(ctx.getSidebarHtml()).toContain("kt-subheader");
		});

		it("should support sidebar.divider()", () => {
			sidebar.divider();

			expect(ctx.getSidebarHtml()).toContain("kt-divider");
		});

		it("should support sidebar.code()", () => {
			sidebar.code("const x = 1;", "typescript");

			const html = ctx.getSidebarHtml();
			expect(html).toContain("kt-code");
			expect(html).toContain("const");
			expect(html).toContain("x = ");
		});
	});

	describe("alert APIs", () => {
		it("should support sidebar.success()", () => {
			sidebar.success("Success message");

			expect(ctx.getSidebarHtml()).toContain("Success message");
			expect(ctx.getSidebarHtml()).toContain("kt-alert-success");
		});

		it("should support sidebar.error()", () => {
			sidebar.error("Error message");

			expect(ctx.getSidebarHtml()).toContain("Error message");
			expect(ctx.getSidebarHtml()).toContain("kt-alert-error");
		});

		it("should support sidebar.warning()", () => {
			sidebar.warning("Warning message");

			expect(ctx.getSidebarHtml()).toContain("Warning message");
			expect(ctx.getSidebarHtml()).toContain("kt-alert-warning");
		});

		it("should support sidebar.info()", () => {
			sidebar.info("Info message");

			expect(ctx.getSidebarHtml()).toContain("Info message");
			expect(ctx.getSidebarHtml()).toContain("kt-alert-info");
		});
	});

	describe("mixed usage", () => {
		it("should work with mixed callback and object notation", () => {
			sidebar.title("Settings");
			sidebar(() => {
				write("Callback content");
			});
			sidebar.write("More content");

			const html = ctx.getSidebarHtml();
			expect(html).toContain("Settings");
			expect(html).toContain("Callback content");
			expect(html).toContain("More content");
		});

		it("should not affect main content", () => {
			write("Main content");
			sidebar.write("Sidebar content");
			write("More main content");

			expect(ctx.getMainHtml()).toContain("Main content");
			expect(ctx.getMainHtml()).toContain("More main content");
			expect(ctx.getMainHtml()).not.toContain("Sidebar content");
			expect(ctx.getSidebarHtml()).toContain("Sidebar content");
		});
	});
});

describe("sidebar widget APIs", () => {
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

	it("should support sidebar.button()", () => {
		const clicked = sidebar.button("Click me");

		expect(clicked).toBe(false);
		expect(ctx.getSidebarHtml()).toContain("Click me");
		expect(ctx.getSidebarHtml()).toContain("kt-button");
		expect(ctx.getMainHtml()).toBe("");
	});

	it("should support sidebar.slider()", () => {
		const value = sidebar.slider("Volume", 0, 100, 50);

		expect(value).toBe(50);
		expect(ctx.getSidebarHtml()).toContain("Volume");
		expect(ctx.getSidebarHtml()).toContain("kt-slider");
	});

	it("should support sidebar.text_input()", () => {
		const value = sidebar.text_input("Name", "default");

		expect(value).toBe("default");
		expect(ctx.getSidebarHtml()).toContain("Name");
		expect(ctx.getSidebarHtml()).toContain("kt-text-input");
	});

	it("should support sidebar.selectbox()", () => {
		const value = sidebar.selectbox("Theme", ["Light", "Dark"], "Light");

		expect(value).toBe("Light");
		expect(ctx.getSidebarHtml()).toContain("Theme");
		expect(ctx.getSidebarHtml()).toContain("kt-selectbox");
	});

	it("should support sidebar.checkbox()", () => {
		const checked = sidebar.checkbox("Enable feature", false);

		expect(checked).toBe(false);
		expect(ctx.getSidebarHtml()).toContain("Enable feature");
		expect(ctx.getSidebarHtml()).toContain('type="checkbox"');
	});

	it("should support sidebar.toggle()", () => {
		const toggled = sidebar.toggle("Dark mode", false);

		expect(toggled).toBe(false);
		expect(ctx.getSidebarHtml()).toContain("Dark mode");
		expect(ctx.getSidebarHtml()).toContain("kt-toggle");
	});

	it("should support sidebar.number_input()", () => {
		const value = sidebar.number_input("Count", 0, 100, 10);

		expect(value).toBe(10);
		expect(ctx.getSidebarHtml()).toContain("Count");
		expect(ctx.getSidebarHtml()).toContain('type="number"');
	});

	it("should support sidebar.radio()", () => {
		const value = sidebar.radio("Size", ["S", "M", "L"], "M");

		expect(value).toBe("M");
		expect(ctx.getSidebarHtml()).toContain("Size");
		expect(ctx.getSidebarHtml()).toContain('type="radio"');
	});
});
