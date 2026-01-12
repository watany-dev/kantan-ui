import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createStreamRegistry,
	type PendingStream,
	type StreamRegistry,
} from "../../../src/kt/stream-registry.js";
import { processStreams } from "../../../src/runtime/stream-processor.js";
import type { Patch, StreamChunkPatch, StreamEndPatch } from "../../../src/websocket/types.js";

function createMockPendingStream(
	chunks: string[],
	options: { markdown?: boolean; id?: string } = {},
): PendingStream {
	const id = options.id ?? `stream-${Math.random().toString(36).slice(2)}`;
	let index = 0;

	const stream = new ReadableStream<string>({
		pull(controller) {
			if (index < chunks.length) {
				controller.enqueue(chunks[index]);
				index++;
			} else {
				controller.close();
			}
		},
	});

	return {
		id,
		stream,
		options: { markdown: options.markdown },
		resolve: vi.fn(),
		reject: vi.fn(),
	};
}

function createErrorStream(error: Error): PendingStream {
	const id = `stream-error-${Math.random().toString(36).slice(2)}`;

	const stream = new ReadableStream<string>({
		start(controller) {
			controller.error(error);
		},
	});

	return {
		id,
		stream,
		options: {},
		resolve: vi.fn(),
		reject: vi.fn(),
	};
}

function createNonErrorThrowingStream(errorValue: unknown): PendingStream {
	const id = `stream-non-error-${Math.random().toString(36).slice(2)}`;

	const stream = new ReadableStream<string>({
		start(controller) {
			controller.error(errorValue);
		},
	});

	return {
		id,
		stream,
		options: {},
		resolve: vi.fn(),
		reject: vi.fn(),
	};
}

describe("processStreams", () => {
	let registry: StreamRegistry;
	let sessionKey: object;

	beforeEach(() => {
		registry = createStreamRegistry();
		sessionKey = {};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("chunk emission", () => {
		it("emits streamChunk for each chunk", async () => {
			const patches: Patch[] = [];
			const emit = (patch: Patch) => patches.push(patch);
			const pending = createMockPendingStream(["a", "b", "c"]);
			registry.register(sessionKey, pending);

			await processStreams(sessionKey, emit, registry);

			const chunks = patches.filter((p) => p.type === "streamChunk") as StreamChunkPatch[];
			expect(chunks).toHaveLength(3);
			expect(chunks[0]?.content).toBe("a");
			expect(chunks[1]?.content).toBe("b");
			expect(chunks[2]?.content).toBe("c");
		});

		it("includes streamId in each chunk", async () => {
			const patches: Patch[] = [];
			const emit = (patch: Patch) => patches.push(patch);
			const pending = createMockPendingStream(["hello"], { id: "test-stream-id" });
			registry.register(sessionKey, pending);

			await processStreams(sessionKey, emit, registry);

			const chunk = patches.find((p) => p.type === "streamChunk") as StreamChunkPatch;
			expect(chunk?.streamId).toBe("test-stream-id");
		});
	});

	describe("stream completion", () => {
		it("emits streamEnd when done", async () => {
			const patches: Patch[] = [];
			const emit = (patch: Patch) => patches.push(patch);
			const pending = createMockPendingStream(["hello"]);
			registry.register(sessionKey, pending);

			await processStreams(sessionKey, emit, registry);

			const end = patches.find((p) => p.type === "streamEnd") as StreamEndPatch;
			expect(end).toBeDefined();
			expect(end?.streamId).toBe(pending.id);
		});

		it("resolves promise with full text", async () => {
			const pending = createMockPendingStream(["hello", " ", "world"]);
			registry.register(sessionKey, pending);

			await processStreams(sessionKey, () => {}, registry);

			expect(pending.resolve).toHaveBeenCalledWith("hello world");
		});

		it("does not include finalHtml for non-markdown streams", async () => {
			const patches: Patch[] = [];
			const emit = (patch: Patch) => patches.push(patch);
			const pending = createMockPendingStream(["# Title"], { markdown: false });
			registry.register(sessionKey, pending);

			await processStreams(sessionKey, emit, registry);

			const end = patches.find((p) => p.type === "streamEnd") as StreamEndPatch;
			expect(end?.finalHtml).toBeUndefined();
		});
	});

	describe("markdown rendering", () => {
		it("includes finalHtml for markdown streams", async () => {
			const patches: Patch[] = [];
			const emit = (patch: Patch) => patches.push(patch);
			const pending = createMockPendingStream(["# Title"], { markdown: true });
			registry.register(sessionKey, pending);

			await processStreams(sessionKey, emit, registry);

			const end = patches.find((p) => p.type === "streamEnd") as StreamEndPatch;
			expect(end?.finalHtml).toBeDefined();
			expect(end?.finalHtml).toContain("<h1>");
		});

		it("renders multi-chunk markdown correctly", async () => {
			const patches: Patch[] = [];
			const emit = (patch: Patch) => patches.push(patch);
			const pending = createMockPendingStream(["# ", "Title", "\n\nParagraph"], { markdown: true });
			registry.register(sessionKey, pending);

			await processStreams(sessionKey, emit, registry);

			const end = patches.find((p) => p.type === "streamEnd") as StreamEndPatch;
			expect(end?.finalHtml).toContain("<h1>");
			expect(end?.finalHtml).toContain("Title");
			expect(end?.finalHtml).toContain("<p>");
		});
	});

	describe("parallel processing", () => {
		it("processes multiple streams", async () => {
			const patches: Patch[] = [];
			const emit = (patch: Patch) => patches.push(patch);

			const pending1 = createMockPendingStream(["a", "b"], { id: "stream-1" });
			const pending2 = createMockPendingStream(["x", "y"], { id: "stream-2" });
			registry.register(sessionKey, pending1);
			registry.register(sessionKey, pending2);

			await processStreams(sessionKey, emit, registry);

			// Both streams should have emitted chunks
			const chunks1 = patches.filter(
				(p) => p.type === "streamChunk" && (p as StreamChunkPatch).streamId === "stream-1",
			);
			const chunks2 = patches.filter(
				(p) => p.type === "streamChunk" && (p as StreamChunkPatch).streamId === "stream-2",
			);
			expect(chunks1).toHaveLength(2);
			expect(chunks2).toHaveLength(2);

			// Both streams should have ended
			const ends = patches.filter((p) => p.type === "streamEnd");
			expect(ends).toHaveLength(2);

			// Both resolves should have been called
			expect(pending1.resolve).toHaveBeenCalledWith("ab");
			expect(pending2.resolve).toHaveBeenCalledWith("xy");
		});

		it("isolates errors between streams", async () => {
			const patches: Patch[] = [];
			const emit = (patch: Patch) => patches.push(patch);

			const errorStream = createErrorStream(new Error("Stream failed"));
			const successStream = createMockPendingStream(["success"], { id: "success-stream" });
			registry.register(sessionKey, errorStream);
			registry.register(sessionKey, successStream);

			await processStreams(sessionKey, emit, registry);

			// Success stream should still complete
			expect(successStream.resolve).toHaveBeenCalledWith("success");

			// Error stream should reject
			expect(errorStream.reject).toHaveBeenCalled();
		});
	});

	describe("error handling", () => {
		it("rejects promise on stream error", async () => {
			const testError = new Error("Test stream error");
			const errorStream = createErrorStream(testError);
			registry.register(sessionKey, errorStream);

			await processStreams(sessionKey, () => {}, registry);

			expect(errorStream.reject).toHaveBeenCalledWith(testError);
		});

		it("wraps non-Error values in Error", async () => {
			const stringError = "string error message";
			const errorStream = createNonErrorThrowingStream(stringError);
			registry.register(sessionKey, errorStream);

			await processStreams(sessionKey, () => {}, registry);

			expect(errorStream.reject).toHaveBeenCalled();
			const rejectedValue = (errorStream.reject as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(rejectedValue).toBeInstanceOf(Error);
			expect(rejectedValue.message).toBe("string error message");
		});

		it("wraps number error values in Error", async () => {
			const errorStream = createNonErrorThrowingStream(42);
			registry.register(sessionKey, errorStream);

			await processStreams(sessionKey, () => {}, registry);

			const rejectedValue = (errorStream.reject as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(rejectedValue).toBeInstanceOf(Error);
			expect(rejectedValue.message).toBe("42");
		});

		it("wraps null error values in Error", async () => {
			const errorStream = createNonErrorThrowingStream(null);
			registry.register(sessionKey, errorStream);

			await processStreams(sessionKey, () => {}, registry);

			const rejectedValue = (errorStream.reject as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(rejectedValue).toBeInstanceOf(Error);
			expect(rejectedValue.message).toBe("null");
		});

		it("wraps undefined error values in Error", async () => {
			const errorStream = createNonErrorThrowingStream(undefined);
			registry.register(sessionKey, errorStream);

			await processStreams(sessionKey, () => {}, registry);

			const rejectedValue = (errorStream.reject as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(rejectedValue).toBeInstanceOf(Error);
			expect(rejectedValue.message).toBe("undefined");
		});

		it("does not emit streamEnd on error", async () => {
			const patches: Patch[] = [];
			const emit = (patch: Patch) => patches.push(patch);
			const errorStream = createErrorStream(new Error("Error"));
			registry.register(sessionKey, errorStream);

			await processStreams(sessionKey, emit, registry);

			const end = patches.find(
				(p) => p.type === "streamEnd" && (p as StreamEndPatch).streamId === errorStream.id,
			);
			expect(end).toBeUndefined();
		});
	});

	describe("edge cases", () => {
		it("handles empty registry", async () => {
			const patches: Patch[] = [];
			const emit = (patch: Patch) => patches.push(patch);

			await processStreams(sessionKey, emit, registry);

			expect(patches).toHaveLength(0);
		});

		it("uses default registry when not provided", async () => {
			// This test verifies the default parameter works
			// Using a unique session key that won't have any streams registered
			const uniqueSessionKey = { unique: true };
			const patches: Patch[] = [];

			// Call without explicit registry parameter to use default
			await processStreams(uniqueSessionKey, (patch) => patches.push(patch));

			// Should complete without error (no streams registered)
			expect(patches).toHaveLength(0);
		});

		it("handles empty stream", async () => {
			const patches: Patch[] = [];
			const emit = (patch: Patch) => patches.push(patch);
			const pending = createMockPendingStream([]);
			registry.register(sessionKey, pending);

			await processStreams(sessionKey, emit, registry);

			// Should emit streamEnd even for empty stream
			const end = patches.find((p) => p.type === "streamEnd");
			expect(end).toBeDefined();

			// Should resolve with empty string
			expect(pending.resolve).toHaveBeenCalledWith("");
		});

		it("handles single character chunks", async () => {
			const patches: Patch[] = [];
			const emit = (patch: Patch) => patches.push(patch);
			const pending = createMockPendingStream(["H", "i"]);
			registry.register(sessionKey, pending);

			await processStreams(sessionKey, emit, registry);

			const chunks = patches.filter((p) => p.type === "streamChunk") as StreamChunkPatch[];
			expect(chunks).toHaveLength(2);
			expect(pending.resolve).toHaveBeenCalledWith("Hi");
		});
	});
});
