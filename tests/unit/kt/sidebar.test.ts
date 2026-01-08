import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { wrapForSidebar } from "../../../src/kt/sidebar";
import { write } from "../../../src/kt/output";

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
