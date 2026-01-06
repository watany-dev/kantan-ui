import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getRenderContext } from "../../src/kt/context";
import { getContext } from "../../src/runtime/context";
import { rerun } from "../../src/runtime/rerun";
import {
	getCurrentSessionId,
	resetSessionManager,
	SessionManager,
	setSessionManager,
} from "../../src/session";
import { generateWidgetId, resetWidgetCounter } from "../../src/widgets";

describe("rerun", () => {
	beforeEach(() => {
		resetWidgetCounter();
		resetSessionManager();
	});

	afterEach(() => {
		resetSessionManager();
	});

	it("should execute script and return HTML", () => {
		const script = () => "<div>Hello</div>";
		const result = rerun(script);
		expect(result).toBe("<div>Hello</div>");
	});

	it("should clear context after execution", () => {
		const script = () => "<div>Test</div>";
		rerun(script);
		expect(getContext()).toBeNull();
	});

	it("should provide event context during execution", () => {
		let capturedContext: ReturnType<typeof getContext> = null;

		const script = () => {
			capturedContext = getContext();
			return "<div>Test</div>";
		};

		rerun(script, { widgetId: "btn1", value: "clicked" });

		expect(capturedContext).not.toBeNull();
		expect(capturedContext?.event?.widgetId).toBe("btn1");
		expect(capturedContext?.event?.value).toBe("clicked");
	});

	it("should clear context even if script throws", () => {
		const script = () => {
			throw new Error("Test error");
		};

		expect(() => rerun(script)).toThrow("Test error");
		expect(getContext()).toBeNull();
	});

	it("should set sessionId in context during execution", () => {
		const manager = new SessionManager();
		setSessionManager(manager);
		const session = manager.createSession();

		let capturedSessionId: string | null = null;
		const script = () => {
			capturedSessionId = getCurrentSessionId();
			return "<div>Test</div>";
		};

		rerun(script, undefined, session.id);

		expect(capturedSessionId).toBe(session.id);
	});

	it("should clear sessionId after execution", () => {
		const manager = new SessionManager();
		setSessionManager(manager);
		const session = manager.createSession();

		const script = () => "<div>Test</div>";
		rerun(script, undefined, session.id);

		expect(getCurrentSessionId()).toBeNull();
	});

	it("should reset widget counter on each rerun", () => {
		const manager = new SessionManager();
		setSessionManager(manager);
		const session = manager.createSession();

		const script = () => {
			const id = generateWidgetId();
			return `<div>${id}</div>`;
		};

		const result1 = rerun(script, undefined, session.id);
		const result2 = rerun(script, undefined, session.id);

		// Both should generate widget_0 because counter is reset
		expect(result1).toBe("<div>widget_0</div>");
		expect(result2).toBe("<div>widget_0</div>");
	});

	it("should return HTML from render context when script returns void", () => {
		const script = () => {
			// Script that uses kt API (appends to render context) and returns undefined
			const ctx = getRenderContext();
			if (ctx) {
				ctx.append("<h1>Title</h1>");
				ctx.append("<p>Content</p>");
			}
			// Return void (undefined)
		};

		const result = rerun(script);

		expect(result).toBe("<h1>Title</h1>\n<p>Content</p>");
	});

	it("should clear render context after execution", () => {
		const script = () => {
			const ctx = getRenderContext();
			if (ctx) {
				ctx.append("<div>Test</div>");
			}
		};

		rerun(script);

		// Render context should be cleared
		expect(getRenderContext()).toBeNull();
	});
});
