import { describe, expect, it } from "vitest";
import { isClientMessage } from "../../../src/websocket/types";

describe("isClientMessage", () => {
	it("returns true for valid init message", () => {
		expect(isClientMessage({ type: "init" })).toBe(true);
		expect(isClientMessage({ type: "init", sessionId: "abc" })).toBe(true);
		// null is allowed (localStorage.getItem returns null)
		expect(isClientMessage({ type: "init", sessionId: null })).toBe(true);
	});

	it("returns true for valid event message", () => {
		expect(isClientMessage({ type: "event", widgetId: "btn1" })).toBe(true);
		expect(
			isClientMessage({
				type: "event",
				widgetId: "slider1",
				value: 42,
				sessionId: "xyz",
			}),
		).toBe(true);
	});

	it("returns false for invalid type", () => {
		expect(isClientMessage({ type: "unknown" })).toBe(false);
		expect(isClientMessage({ type: 123 })).toBe(false);
		expect(isClientMessage({})).toBe(false);
	});

	it("returns false for non-object values", () => {
		expect(isClientMessage(null)).toBe(false);
		expect(isClientMessage(undefined)).toBe(false);
		expect(isClientMessage("string")).toBe(false);
		expect(isClientMessage(123)).toBe(false);
	});

	it("returns false for invalid field types", () => {
		expect(isClientMessage({ type: "init", widgetId: 123 })).toBe(false);
		expect(isClientMessage({ type: "event", sessionId: 456 })).toBe(false);
	});
});
