import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setContext } from "../../../src/runtime/context";
import {
	getSessionManager,
	resetSessionManager,
	setCurrentSessionId,
} from "../../../src/session";
import {
	initializeSelectboxState,
	initializeSliderState,
	initializeTextInputState,
	isButtonPressed,
	validateSelectbox,
	validateSlider,
} from "../../../src/widgets/core";

describe("widgets/core", () => {
	let sessionId: string;

	beforeEach(() => {
		resetSessionManager();
		const session = getSessionManager().createSession();
		sessionId = session.id;
		setCurrentSessionId(sessionId);
		setContext(null);
	});

	afterEach(() => {
		getSessionManager().stopCleanupInterval();
		setCurrentSessionId(undefined);
		setContext(null);
	});

	describe("isButtonPressed", () => {
		it("should return true when widgetId matches event", () => {
			setContext({ event: { widgetId: "btn-1", value: "clicked" } });
			expect(isButtonPressed("btn-1")).toBe(true);
		});

		it("should return false when widgetId does not match event", () => {
			setContext({ event: { widgetId: "btn-1", value: "clicked" } });
			expect(isButtonPressed("btn-2")).toBe(false);
		});

		it("should return false when no context", () => {
			setContext(null);
			expect(isButtonPressed("btn-1")).toBe(false);
		});

		it("should return false when context has no event", () => {
			setContext({});
			expect(isButtonPressed("btn-1")).toBe(false);
		});
	});

	describe("validateSlider", () => {
		it("should not throw for valid min/max", () => {
			expect(() => validateSlider(0, 100)).not.toThrow();
		});

		it("should not throw when min equals max", () => {
			expect(() => validateSlider(50, 50)).not.toThrow();
		});

		it("should throw when min > max", () => {
			expect(() => validateSlider(100, 0)).toThrow(
				"slider: min (100) must be <= max (0)",
			);
		});

		it("should not throw for valid defaultValue within range", () => {
			expect(() => validateSlider(0, 100, 50)).not.toThrow();
		});

		it("should not throw for defaultValue at min", () => {
			expect(() => validateSlider(0, 100, 0)).not.toThrow();
		});

		it("should not throw for defaultValue at max", () => {
			expect(() => validateSlider(0, 100, 100)).not.toThrow();
		});

		it("should throw for defaultValue below min", () => {
			expect(() => validateSlider(10, 100, 5)).toThrow(
				"slider: defaultValue (5) must be between min (10) and max (100)",
			);
		});

		it("should throw for defaultValue above max", () => {
			expect(() => validateSlider(0, 100, 150)).toThrow(
				"slider: defaultValue (150) must be between min (0) and max (100)",
			);
		});
	});

	describe("initializeSliderState", () => {
		it("should initialize with defaultValue", () => {
			const value = initializeSliderState("slider-1", 0, 50);
			expect(value).toBe(50);
		});

		it("should initialize with min when no defaultValue", () => {
			const value = initializeSliderState("slider-2", 10);
			expect(value).toBe(10);
		});

		it("should return existing value on subsequent calls", () => {
			initializeSliderState("slider-3", 0, 50);
			getSessionManager().setState(sessionId, "slider-3", 75);
			const value = initializeSliderState("slider-3", 0, 50);
			expect(value).toBe(75);
		});
	});

	describe("initializeTextInputState", () => {
		it("should initialize with defaultValue", () => {
			const value = initializeTextInputState("text-1", "hello");
			expect(value).toBe("hello");
		});

		it("should initialize with empty string when no defaultValue", () => {
			const value = initializeTextInputState("text-2");
			expect(value).toBe("");
		});

		it("should return existing value on subsequent calls", () => {
			initializeTextInputState("text-3", "initial");
			getSessionManager().setState(sessionId, "text-3", "updated");
			const value = initializeTextInputState("text-3", "initial");
			expect(value).toBe("updated");
		});
	});

	describe("validateSelectbox", () => {
		it("should not throw for valid options", () => {
			expect(() => validateSelectbox(["a", "b", "c"])).not.toThrow();
		});

		it("should throw for empty options", () => {
			expect(() => validateSelectbox([])).toThrow(
				"selectbox: options array must not be empty",
			);
		});

		it("should throw for null/undefined options", () => {
			expect(() => validateSelectbox(null as unknown as string[])).toThrow(
				"selectbox: options array must not be empty",
			);
		});

		it("should not throw for valid defaultValue", () => {
			expect(() => validateSelectbox(["a", "b", "c"], "b")).not.toThrow();
		});

		it("should throw for defaultValue not in options", () => {
			expect(() => validateSelectbox(["a", "b", "c"], "d")).toThrow(
				'selectbox: defaultValue "d" must be one of the options',
			);
		});
	});

	describe("initializeSelectboxState", () => {
		it("should initialize with defaultValue", () => {
			const value = initializeSelectboxState("select-1", ["a", "b", "c"], "b");
			expect(value).toBe("b");
		});

		it("should initialize with first option when no defaultValue", () => {
			const value = initializeSelectboxState("select-2", ["x", "y", "z"]);
			expect(value).toBe("x");
		});

		it("should return existing value on subsequent calls", () => {
			initializeSelectboxState("select-3", ["a", "b", "c"], "a");
			getSessionManager().setState(sessionId, "select-3", "c");
			const value = initializeSelectboxState("select-3", ["a", "b", "c"], "a");
			expect(value).toBe("c");
		});
	});
});
