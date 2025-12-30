import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	SessionManager,
	resetSessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { resetWidgetCounter } from "../../../src/widgets/registry";
import { renderSlider, slider } from "../../../src/widgets/slider";

describe("slider", () => {
	let manager: SessionManager;

	beforeEach(() => {
		resetWidgetCounter();
		manager = new SessionManager();
		setSessionManager(manager);
	});

	afterEach(() => {
		setCurrentSessionId(null);
		resetSessionManager();
	});

	describe("slider function", () => {
		it("should return default value on first call", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = slider("Volume", 0, 100, 50);

			expect(value).toBe(50);
		});

		it("should throw error when min > max", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			expect(() => slider("Volume", 100, 0, 50)).toThrow("slider: min (100) must be <= max (0)");
		});

		it("should throw error when defaultValue < min", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			expect(() => slider("Volume", 0, 100, -10)).toThrow(
				"slider: defaultValue (-10) must be between min (0) and max (100)",
			);
		});

		it("should throw error when defaultValue > max", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			expect(() => slider("Volume", 0, 100, 150)).toThrow(
				"slider: defaultValue (150) must be between min (0) and max (100)",
			);
		});

		it("should return min as default when no default provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = slider("Volume", 0, 100);

			expect(value).toBe(0);
		});

		it("should return stored value on subsequent calls", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			// First call sets default
			slider("Volume", 0, 100, 50);
			resetWidgetCounter();

			// Update the value
			manager.setState(session.id, "widget_0", 75);

			// Second call should return stored value
			const value = slider("Volume", 0, 100, 50);

			expect(value).toBe(75);
		});

		it("should use custom key when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			manager.setState(session.id, "my_slider", 80);

			const value = slider("Volume", 0, 100, 50, { key: "my_slider" });

			expect(value).toBe(80);
		});
	});

	describe("renderSlider", () => {
		it("should render slider HTML", () => {
			const html = renderSlider("Volume", 0, 100, 50);

			expect(html).toContain('<input type="range"');
			expect(html).toContain('min="0"');
			expect(html).toContain('max="100"');
			expect(html).toContain('value="50"');
			expect(html).toContain("Volume: 50");
			expect(html).toContain('data-kt-event="input"');
			expect(html).toContain('data-kt-type="number"');
		});

		it("should include step attribute", () => {
			const html = renderSlider("Volume", 0, 100, 50, { step: 5 });

			expect(html).toContain('step="5"');
		});

		it("should default step to 1", () => {
			const html = renderSlider("Volume", 0, 100, 50);

			expect(html).toContain('step="1"');
		});

		it("should escape HTML in label", () => {
			const html = renderSlider("<script>", 0, 100, 50);

			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;script&gt;");
		});
	});
});
