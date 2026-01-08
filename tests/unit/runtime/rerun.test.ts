import { describe, expect, it } from "vitest";
import { sidebar } from "../../../src/kt/layout";
import { write } from "../../../src/kt/output";
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

describe("rerun sidebarWidth", () => {
	it("should return default sidebarWidth", () => {
		const result = rerun(() => {
			write("test");
		});
		expect(result.sidebarWidth).toBe("280px");
	});

	it("should return default sidebarWidth for string return type", () => {
		const result = rerun(() => "<div>test</div>");
		expect(result.sidebarWidth).toBe("280px");
	});

	it("should return custom sidebarWidth when set", () => {
		const result = rerun(() => {
			sidebar(
				() => {
					write("sidebar");
				},
				{ width: "400px" },
			);
		});
		expect(result.sidebarWidth).toBe("400px");
	});
});
