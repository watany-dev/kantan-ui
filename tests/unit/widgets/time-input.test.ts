import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	resetSessionManager,
	SessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { resetWidgetCounter } from "../../../src/widgets/registry";
import { renderTimeInput, time_input } from "../../../src/widgets/time-input";

describe("time_input", () => {
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

	describe("time_input function", () => {
		it("should return default value on first call", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = time_input("Alarm", "08:30");

			expect(value).toBe("08:30");
		});

		it("should return empty string when no default provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = time_input("Alarm");

			expect(value).toBe("");
		});

		it("should return stored value on subsequent calls", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			// First call sets default
			time_input("Alarm", "08:30");
			resetWidgetCounter();

			// Update the value
			manager.setState(session.id, "widget_0", "14:00");

			// Second call should return stored value
			const value = time_input("Alarm", "08:30");

			expect(value).toBe("14:00");
		});

		it("should use custom key when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			manager.setState(session.id, "my_time", "23:59");

			const value = time_input("Alarm", "08:30", { key: "my_time" });

			expect(value).toBe("23:59");
		});

		it("should accept Date object as default value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const dateObj = new Date(2024, 0, 1, 14, 30); // 14:30
			const value = time_input("Alarm", dateObj);

			expect(value).toBe("14:30");
		});

		it("should accept Date object with seconds when step < 60", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const dateObj = new Date(2024, 0, 1, 14, 30, 45); // 14:30:45
			const value = time_input("Alarm", dateObj, { step: 1 });

			expect(value).toBe("14:30:45");
		});
	});

	describe("renderTimeInput", () => {
		it("should render time input HTML", () => {
			const html = renderTimeInput("Alarm", "08:30");

			expect(html).toContain('<input type="time"');
			expect(html).toContain('value="08:30"');
			expect(html).toContain("Alarm");
			expect(html).toContain('data-kt-event="change"');
		});

		it("should include step attribute when provided", () => {
			const html = renderTimeInput("Alarm", "", { step: 60 });

			expect(html).toContain('step="60"');
		});

		it("should not include step attribute when not provided", () => {
			const html = renderTimeInput("Alarm", "08:30");

			expect(html).not.toContain("step=");
		});

		it("should escape HTML in label", () => {
			const html = renderTimeInput("<script>", "08:30");

			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;script&gt;");
		});

		it("should render disabled attribute when disabled", () => {
			const html = renderTimeInput("Alarm", "08:30", { disabled: true });

			expect(html).toContain("disabled");
		});

		it("should not render disabled attribute when not disabled", () => {
			const html = renderTimeInput("Alarm", "08:30", { disabled: false });

			expect(html).not.toContain("disabled");
		});

		it("should use custom key for id", () => {
			const html = renderTimeInput("Alarm", "08:30", { key: "custom_time" });

			expect(html).toContain('id="custom_time"');
			expect(html).toContain('for="custom_time"');
		});

		it("should support seconds with step=1", () => {
			const html = renderTimeInput("Precise Time", "12:30:45", { step: 1 });

			expect(html).toContain('value="12:30:45"');
			expect(html).toContain('step="1"');
		});

		describe("security: runtime type validation", () => {
			it("should validate numeric step attribute", () => {
				// 不正な値が渡されても問題ない
				const html = renderTimeInput("Alarm", "", {
					step: "60; onclick=alert(1)" as unknown as number,
				});

				// 不正な値は無視されるか、数値として解釈される
				expect(html).not.toContain("onclick");
				expect(html).not.toContain("alert");
			});

			it("should not render step for NaN values", () => {
				const html = renderTimeInput("Alarm", "", {
					step: Number.NaN,
				});

				expect(html).not.toContain("step=");
			});

			it("should handle Infinity in step", () => {
				const html = renderTimeInput("Alarm", "", {
					step: Number.POSITIVE_INFINITY,
				});

				// Infinityは不正なので無視される
				expect(html).not.toContain("Infinity");
			});
		});
	});
});
