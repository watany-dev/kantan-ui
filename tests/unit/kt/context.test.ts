import { describe, it, expect, beforeEach } from "vitest";
import {
	RenderContext,
	setRenderContext,
	getRenderContext,
	requireRenderContext,
} from "../../../src/kt/context";

describe("RenderContext", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
	});

	it("should start with empty buffer", () => {
		expect(ctx.isEmpty()).toBe(true);
		expect(ctx.getHtml()).toBe("");
	});

	it("should append html to buffer", () => {
		ctx.append("<div>Hello</div>");
		expect(ctx.isEmpty()).toBe(false);
		expect(ctx.getHtml()).toBe("<div>Hello</div>");
	});

	it("should join multiple appends with newline", () => {
		ctx.append("<h1>Title</h1>");
		ctx.append("<p>Content</p>");
		expect(ctx.getHtml()).toBe("<h1>Title</h1>\n<p>Content</p>");
	});

	it("should clear buffer", () => {
		ctx.append("<div>Test</div>");
		ctx.clear();
		expect(ctx.isEmpty()).toBe(true);
		expect(ctx.getHtml()).toBe("");
	});
});

describe("RenderContext global functions", () => {
	beforeEach(() => {
		setRenderContext(null);
	});

	it("should set and get render context", () => {
		const ctx = new RenderContext();
		setRenderContext(ctx);
		expect(getRenderContext()).toBe(ctx);
	});

	it("should return null when no context set", () => {
		expect(getRenderContext()).toBeNull();
	});

	it("should throw when requireRenderContext called without context", () => {
		expect(() => requireRenderContext()).toThrow(
			"RenderContext is not available",
		);
	});

	it("should return context when requireRenderContext called with context", () => {
		const ctx = new RenderContext();
		setRenderContext(ctx);
		expect(requireRenderContext()).toBe(ctx);
	});
});
