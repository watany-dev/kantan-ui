import { describe, expect, it } from "vitest";
import { write_stream } from "../../../src/kt/stream";
import { streamRegistry } from "../../../src/kt/stream-registry";
import { AbortError } from "../../../src/runtime/abort";
import { rerun } from "../../../src/runtime/rerun";

describe("rerun with AbortSignal", () => {
	it("should execute script normally when signal is not aborted", () => {
		const controller = new AbortController();
		const script = () => "<div>Hello</div>";

		const result = rerun(script, undefined, undefined, controller.signal);

		expect(result.mainHtml).toBe("<div>Hello</div>");
		expect(result.sidebarHtml).toBe("");
		expect(result.hasSidebar).toBe(false);
	});

	it("should throw AbortError when signal is already aborted", () => {
		const controller = new AbortController();
		controller.abort();
		const script = () => "<div>Hello</div>";

		expect(() => rerun(script, undefined, undefined, controller.signal)).toThrow(AbortError);
	});

	it("should throw AbortError with default message", () => {
		const controller = new AbortController();
		controller.abort();
		const script = () => "<div>Hello</div>";

		expect(() => rerun(script, undefined, undefined, controller.signal)).toThrow(
			"Rerun was aborted",
		);
	});

	it("should work without signal (backwards compatible)", () => {
		const script = () => "<div>No signal</div>";

		const result = rerun(script);

		expect(result.mainHtml).toBe("<div>No signal</div>");
		expect(result.sidebarHtml).toBe("");
		expect(result.hasSidebar).toBe(false);
	});

	it("should preserve event and sessionId with signal", () => {
		const controller = new AbortController();
		const script = () => "<div>With context</div>";

		const result = rerun(
			script,
			{ widgetId: "btn1", value: "clicked" },
			"session-123",
			controller.signal,
		);

		expect(result.mainHtml).toBe("<div>With context</div>");
	});
});

describe("rerun with stream integration", () => {
	it("should return hasPendingStreams: false when no streams are used", () => {
		const script = () => "<div>No streams</div>";

		const result = rerun(script);

		expect(result.hasPendingStreams).toBe(false);
		expect(result.streamSessionKey).toBeDefined();
	});

	it("should return hasPendingStreams: true when write_stream is called", () => {
		const script = () => {
			write_stream(["hello"]);
		};

		const result = rerun(script);

		expect(result.hasPendingStreams).toBe(true);
		expect(result.streamSessionKey).toBeDefined();
	});

	it("should provide unique streamSessionKey per rerun", () => {
		const script = () => "<div>Test</div>";

		const result1 = rerun(script);
		const result2 = rerun(script);

		expect(result1.streamSessionKey).not.toBe(result2.streamSessionKey);
	});

	it("should allow consuming streams using the returned streamSessionKey", () => {
		const script = () => {
			write_stream(["chunk1"]);
			write_stream(["chunk2"]);
		};

		const result = rerun(script);
		const pending = streamRegistry.consume(result.streamSessionKey);

		expect(pending).toHaveLength(2);
		expect(streamRegistry.hasPending(result.streamSessionKey)).toBe(false);
	});

	it("should generate placeholder HTML when write_stream is called", () => {
		const script = () => {
			write_stream(["hello"]);
		};

		const result = rerun(script);

		expect(result.mainHtml).toContain("kt-stream");
		expect(result.mainHtml).toContain("kt-stream-content");
		expect(result.mainHtml).toContain("kt-stream-cursor");
	});
});
