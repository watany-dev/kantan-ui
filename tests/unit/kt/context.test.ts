import { beforeEach, describe, expect, it } from "vitest";
import {
	RenderContext,
	getRenderContext,
	requireRenderContext,
	setRenderContext,
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

describe("RenderContext flush", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
	});

	it("should not flush by default (threshold is 0)", () => {
		let flushed = false;
		ctx.setFlushCallback(() => {
			flushed = true;
		}, 0);

		ctx.append("<div>1</div>");
		ctx.append("<div>2</div>");
		ctx.append("<div>3</div>");

		expect(flushed).toBe(false);
		expect(ctx.getFlushThreshold()).toBe(0);
	});

	it("should flush when threshold is reached", () => {
		const flushes: { html: string; count: number }[] = [];
		ctx.setFlushCallback((html, count) => {
			flushes.push({ html, count });
		}, 2);

		ctx.append("<div>1</div>");
		expect(flushes.length).toBe(0);

		ctx.append("<div>2</div>");
		expect(flushes.length).toBe(1);
		expect(flushes[0].html).toBe("<div>1</div>\n<div>2</div>");
		expect(flushes[0].count).toBe(2);
	});

	it("should flush multiple times as buffer grows", () => {
		const flushes: string[] = [];
		ctx.setFlushCallback((html) => {
			flushes.push(html);
		}, 2);

		ctx.append("<div>1</div>");
		ctx.append("<div>2</div>"); // flush 1
		ctx.append("<div>3</div>");
		ctx.append("<div>4</div>"); // flush 2

		expect(flushes.length).toBe(2);
		expect(flushes[0]).toBe("<div>1</div>\n<div>2</div>");
		expect(flushes[1]).toBe("<div>3</div>\n<div>4</div>");
	});

	it("should keep full buffer for getHtml after flush", () => {
		ctx.setFlushCallback(() => {}, 2);

		ctx.append("<div>1</div>");
		ctx.append("<div>2</div>");
		ctx.append("<div>3</div>");

		expect(ctx.getHtml()).toBe("<div>1</div>\n<div>2</div>\n<div>3</div>");
	});

	it("should manually flush unflushed items", () => {
		let lastFlush = "";
		ctx.setFlushCallback((html) => {
			lastFlush = html;
		}, 10); // high threshold

		ctx.append("<div>1</div>");
		ctx.append("<div>2</div>");

		expect(lastFlush).toBe("");

		ctx.flush();
		expect(lastFlush).toBe("<div>1</div>\n<div>2</div>");
	});

	it("should not flush if nothing new since last flush", () => {
		let flushCount = 0;
		ctx.setFlushCallback(() => {
			flushCount++;
		}, 1);

		ctx.append("<div>1</div>"); // auto flush
		expect(flushCount).toBe(1);

		ctx.flush(); // should not flush again
		expect(flushCount).toBe(1);
	});

	it("should reset flushed count on clear", () => {
		const flushes: string[] = [];
		ctx.setFlushCallback((html) => {
			flushes.push(html);
		}, 2);

		ctx.append("<div>1</div>");
		ctx.append("<div>2</div>");
		expect(flushes.length).toBe(1);

		ctx.clear();
		expect(ctx.getFlushedCount()).toBe(0);

		ctx.append("<div>A</div>");
		ctx.append("<div>B</div>");
		expect(flushes.length).toBe(2);
		expect(flushes[1]).toBe("<div>A</div>\n<div>B</div>");
	});

	it("should not flush without callback", () => {
		ctx.setFlushCallback(null, 2);
		ctx.append("<div>1</div>");
		ctx.append("<div>2</div>");
		// No error should occur
		expect(ctx.getHtml()).toBe("<div>1</div>\n<div>2</div>");
	});

	it("should track flushed count correctly", () => {
		ctx.setFlushCallback(() => {}, 3);

		expect(ctx.getFlushedCount()).toBe(0);

		ctx.append("<div>1</div>");
		ctx.append("<div>2</div>");
		ctx.append("<div>3</div>");

		expect(ctx.getFlushedCount()).toBe(3);

		ctx.append("<div>4</div>");
		expect(ctx.getFlushedCount()).toBe(3);
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
		expect(() => requireRenderContext()).toThrow("RenderContext is not available");
	});

	it("should return context when requireRenderContext called with context", () => {
		const ctx = new RenderContext();
		setRenderContext(ctx);
		expect(requireRenderContext()).toBe(ctx);
	});
});
