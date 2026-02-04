import { describe, expect, it } from "vitest";
import { toReadableStream } from "../../../src/kt/stream-utils.js";

describe("toReadableStream", () => {
	it("returns ReadableStream as-is", () => {
		const stream = new ReadableStream<string>();
		expect(toReadableStream(stream)).toBe(stream);
	});

	it("converts AsyncIterable to ReadableStream", async () => {
		// biome-ignore lint/suspicious/useAwait: async generator requires async keyword for AsyncIterable
		async function* gen() {
			yield "a";
			yield "b";
		}
		const stream = toReadableStream(gen());
		const reader = stream.getReader();
		expect((await reader.read()).value).toBe("a");
		expect((await reader.read()).value).toBe("b");
		expect((await reader.read()).done).toBe(true);
	});

	it("converts Iterable to ReadableStream", async () => {
		const stream = toReadableStream(["a", "b"]);
		const reader = stream.getReader();
		expect((await reader.read()).value).toBe("a");
		expect((await reader.read()).value).toBe("b");
		expect((await reader.read()).done).toBe(true);
	});

	it("converts Response body to ReadableStream", async () => {
		const response = new Response("hello");
		const stream = toReadableStream(response);
		const reader = stream.getReader();
		const { value } = await reader.read();
		expect(value).toBe("hello");
	});

	it("handles factory function returning ReadableStream", async () => {
		const factory = () =>
			new ReadableStream<string>({
				start(controller) {
					controller.enqueue("factory");
					controller.close();
				},
			});
		const stream = toReadableStream(factory);
		const reader = stream.getReader();
		expect((await reader.read()).value).toBe("factory");
	});

	it("handles factory function returning Iterable", async () => {
		const factory = () => ["a", "b"];
		const stream = toReadableStream(factory);
		const reader = stream.getReader();
		expect((await reader.read()).value).toBe("a");
		expect((await reader.read()).value).toBe("b");
	});

	it("handles factory function returning AsyncIterable", async () => {
		const factory = () => {
			// biome-ignore lint/suspicious/useAwait: async generator requires async keyword for AsyncIterable
			async function* gen() {
				yield "async";
			}
			return gen();
		};
		const stream = toReadableStream(factory);
		const reader = stream.getReader();
		expect((await reader.read()).value).toBe("async");
	});

	it("throws for Response with null body", () => {
		// Create a response with null body (e.g., 204 No Content simulation)
		const response = new Response(null);
		expect(() => toReadableStream(response)).toThrow("Response body is null");
	});

	it("throws TypeError for invalid source (number)", () => {
		expect(() => toReadableStream(123 as unknown as string[])).toThrow(TypeError);
	});

	it("throws TypeError for invalid source (object)", () => {
		expect(() => toReadableStream({} as unknown as string[])).toThrow(TypeError);
	});

	it("throws TypeError for null", () => {
		expect(() => toReadableStream(null as unknown as string[])).toThrow(TypeError);
	});

	it("handles generator with delays", async () => {
		async function* slowGen() {
			yield "first";
			await new Promise((r) => setTimeout(r, 10));
			yield "second";
		}
		const stream = toReadableStream(slowGen());
		const reader = stream.getReader();
		expect((await reader.read()).value).toBe("first");
		expect((await reader.read()).value).toBe("second");
		expect((await reader.read()).done).toBe(true);
	});

	it("handles empty generator", async () => {
		async function* emptyGen() {
			// async keyword required for AsyncIterable
		}
		const stream = toReadableStream(emptyGen());
		const reader = stream.getReader();
		expect((await reader.read()).done).toBe(true);
	});

	it("handles empty array", async () => {
		const stream = toReadableStream([]);
		const reader = stream.getReader();
		expect((await reader.read()).done).toBe(true);
	});

	it("propagates error from AsyncIterable to stream", async () => {
		// biome-ignore lint/suspicious/useAwait: async generator requires async keyword for AsyncIterable
		async function* failingGen() {
			yield "ok";
			throw new Error("generator failed");
		}
		const stream = toReadableStream(failingGen());
		const reader = stream.getReader();
		expect((await reader.read()).value).toBe("ok");
		await expect(reader.read()).rejects.toThrow("generator failed");
	});
});
