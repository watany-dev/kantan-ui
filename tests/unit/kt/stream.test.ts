import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context.js";
import { write_stream } from "../../../src/kt/stream.js";

describe("write_stream", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
	});

	afterEach(() => {
		setRenderContext(null as unknown as RenderContext);
	});

	describe("placeholder HTML generation", () => {
		it("appends placeholder HTML with stream structure", () => {
			write_stream(["test"]);

			const html = ctx.getMainHtml();
			expect(html).toContain('class="kt-stream"');
			expect(html).toContain('class="kt-stream-content"');
			expect(html).toContain('class="kt-stream-cursor"');
		});

		it("generates unique stream ID", () => {
			write_stream(["first"]);
			write_stream(["second"]);

			const html = ctx.getMainHtml();
			const matches = html.match(/id="kt-stream-[^"]+"/g);
			expect(matches).toHaveLength(2);
			expect(matches?.[0]).not.toBe(matches?.[1]);
		});

		it("applies className option", () => {
			write_stream(["test"], { className: "custom-class" });

			const html = ctx.getMainHtml();
			expect(html).toContain('class="kt-stream custom-class"');
		});

		it("sets data-markdown attribute when markdown: true", () => {
			write_stream(["# Title"], { markdown: true });

			const html = ctx.getMainHtml();
			expect(html).toContain('data-markdown="true"');
		});

		it("does not set data-markdown when markdown: false", () => {
			write_stream(["test"], { markdown: false });

			const html = ctx.getMainHtml();
			expect(html).not.toContain("data-markdown");
		});
	});

	describe("promise behavior", () => {
		it("returns a promise", () => {
			const result = write_stream(["test"]);
			expect(result).toBeInstanceOf(Promise);
		});
	});

	describe("stream registration", () => {
		it("registers stream and generates HTML", () => {
			write_stream(["test"]);

			// The stream should be registered (we verify by checking HTML was generated)
			const html = ctx.getMainHtml();
			expect(html).toContain("kt-stream");
		});
	});

	describe("stream source types", () => {
		it("accepts array (Iterable)", () => {
			expect(() => write_stream(["a", "b", "c"])).not.toThrow();
		});

		it("accepts async generator", () => {
			// biome-ignore lint/suspicious/useAwait: async generator requires async keyword
			async function* gen() {
				yield "hello";
			}
			expect(() => write_stream(gen())).not.toThrow();
		});

		it("accepts ReadableStream", () => {
			const stream = new ReadableStream<string>({
				start(controller) {
					controller.enqueue("test");
					controller.close();
				},
			});
			expect(() => write_stream(stream)).not.toThrow();
		});

		it("accepts factory function", () => {
			const factory = () => ["a", "b"];
			expect(() => write_stream(factory)).not.toThrow();
		});
	});
});
