import { beforeEach, describe, expect, it } from "vitest";
import {
	clearContext,
	getContext,
	setContext,
} from "../../src/runtime/context";

describe("context", () => {
	beforeEach(() => {
		clearContext();
	});

	it("should return null when no context is set", () => {
		expect(getContext()).toBeNull();
	});

	it("should set and get context", () => {
		setContext({ event: { widgetId: "test", value: 123 } });
		const ctx = getContext();

		expect(ctx).not.toBeNull();
		expect(ctx?.event?.widgetId).toBe("test");
		expect(ctx?.event?.value).toBe(123);
	});

	it("should clear context", () => {
		setContext({ event: { widgetId: "test", value: "value" } });
		clearContext();

		expect(getContext()).toBeNull();
	});

	it("should handle context without event", () => {
		setContext({});
		const ctx = getContext();

		expect(ctx).not.toBeNull();
		expect(ctx?.event).toBeUndefined();
	});

	it("should handle context with sessionId", () => {
		setContext({ sessionId: "session-123" });
		const ctx = getContext();

		expect(ctx).not.toBeNull();
		expect(ctx?.sessionId).toBe("session-123");
	});

	it("should handle context with both sessionId and event", () => {
		setContext({
			sessionId: "session-456",
			event: { widgetId: "btn1", value: "clicked" },
		});
		const ctx = getContext();

		expect(ctx).not.toBeNull();
		expect(ctx?.sessionId).toBe("session-456");
		expect(ctx?.event?.widgetId).toBe("btn1");
	});
});
