import { describe, expect, it, vi } from "vitest";
import {
	createStreamRegistry,
	type PendingStream,
	type WriteStreamOptions,
} from "../../../src/kt/stream-registry.js";

function createMockPendingStream(overrides: Partial<PendingStream> = {}): PendingStream {
	return {
		id: `stream-${Math.random().toString(36).slice(2)}`,
		stream: new ReadableStream<string>(),
		options: {},
		resolve: vi.fn(),
		reject: vi.fn(),
		...overrides,
	};
}

describe("StreamRegistry", () => {
	describe("register and consume", () => {
		it("registers and retrieves streams", () => {
			const registry = createStreamRegistry();
			const sessionKey = {};
			const pending = createMockPendingStream();

			registry.register(sessionKey, pending);
			const streams = registry.consume(sessionKey);

			expect(streams).toHaveLength(1);
			expect(streams[0]).toBe(pending);
		});

		it("clears streams after consume", () => {
			const registry = createStreamRegistry();
			const sessionKey = {};
			registry.register(sessionKey, createMockPendingStream());

			registry.consume(sessionKey);
			const streams = registry.consume(sessionKey);

			expect(streams).toHaveLength(0);
		});

		it("handles multiple streams per session", () => {
			const registry = createStreamRegistry();
			const sessionKey = {};

			registry.register(sessionKey, createMockPendingStream());
			registry.register(sessionKey, createMockPendingStream());

			const streams = registry.consume(sessionKey);
			expect(streams).toHaveLength(2);
		});

		it("isolates streams by session", () => {
			const registry = createStreamRegistry();
			const session1 = {};
			const session2 = {};

			const pending1 = createMockPendingStream({ id: "stream-1" });
			const pending2 = createMockPendingStream({ id: "stream-2" });

			registry.register(session1, pending1);
			registry.register(session2, pending2);

			const streams1 = registry.consume(session1);
			const streams2 = registry.consume(session2);

			expect(streams1).toHaveLength(1);
			expect(streams1[0]?.id).toBe("stream-1");
			expect(streams2).toHaveLength(1);
			expect(streams2[0]?.id).toBe("stream-2");
		});

		it("returns empty array for unknown session", () => {
			const registry = createStreamRegistry();
			const sessionKey = {};

			const streams = registry.consume(sessionKey);

			expect(streams).toHaveLength(0);
		});

		it("preserves stream order", () => {
			const registry = createStreamRegistry();
			const sessionKey = {};

			const first = createMockPendingStream({ id: "first" });
			const second = createMockPendingStream({ id: "second" });
			const third = createMockPendingStream({ id: "third" });

			registry.register(sessionKey, first);
			registry.register(sessionKey, second);
			registry.register(sessionKey, third);

			const streams = registry.consume(sessionKey);

			expect(streams[0]?.id).toBe("first");
			expect(streams[1]?.id).toBe("second");
			expect(streams[2]?.id).toBe("third");
		});
	});

	describe("hasPending", () => {
		it("returns true when session has pending streams", () => {
			const registry = createStreamRegistry();
			const sessionKey = {};

			registry.register(sessionKey, createMockPendingStream());

			expect(registry.hasPending(sessionKey)).toBe(true);
		});

		it("returns false when session has no pending streams", () => {
			const registry = createStreamRegistry();
			const sessionKey = {};

			expect(registry.hasPending(sessionKey)).toBe(false);
		});

		it("returns false after consume", () => {
			const registry = createStreamRegistry();
			const sessionKey = {};

			registry.register(sessionKey, createMockPendingStream());
			registry.consume(sessionKey);

			expect(registry.hasPending(sessionKey)).toBe(false);
		});
	});

	describe("clear", () => {
		it("removes all streams for a session", () => {
			const registry = createStreamRegistry();
			const sessionKey = {};

			registry.register(sessionKey, createMockPendingStream());
			registry.register(sessionKey, createMockPendingStream());
			registry.clear(sessionKey);

			expect(registry.hasPending(sessionKey)).toBe(false);
			expect(registry.consume(sessionKey)).toHaveLength(0);
		});

		it("does not affect other sessions", () => {
			const registry = createStreamRegistry();
			const session1 = {};
			const session2 = {};

			registry.register(session1, createMockPendingStream());
			registry.register(session2, createMockPendingStream());
			registry.clear(session1);

			expect(registry.hasPending(session1)).toBe(false);
			expect(registry.hasPending(session2)).toBe(true);
		});
	});

	describe("PendingStream structure", () => {
		it("contains required fields", () => {
			const options: WriteStreamOptions = {
				markdown: true,
				className: "custom-class",
			};
			const pending = createMockPendingStream({
				id: "test-stream",
				options,
			});

			expect(pending.id).toBe("test-stream");
			expect(pending.stream).toBeInstanceOf(ReadableStream);
			expect(pending.options.markdown).toBe(true);
			expect(pending.options.className).toBe("custom-class");
			expect(typeof pending.resolve).toBe("function");
			expect(typeof pending.reject).toBe("function");
		});
	});
});
