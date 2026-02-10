import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	resetSessionManager,
	SessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { datetime_input, renderDatetimeInput } from "../../../src/widgets/datetime-input";
import { resetWidgetCounter, setWidgetValue } from "../../../src/widgets/registry";

describe("datetime_input", () => {
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

	// --- 状態管理 ---
	it("should return default value on first call", () => {
		const session = manager.createSession();
		setCurrentSessionId(session.id);
		const result = datetime_input("Start", "2026-01-15T09:00");
		expect(result).toBe("2026-01-15T09:00");
	});

	it("should return empty string when no default provided", () => {
		const session = manager.createSession();
		setCurrentSessionId(session.id);
		const result = datetime_input("Start");
		expect(result).toBe("");
	});

	it("should return stored value on subsequent calls", () => {
		const session = manager.createSession();
		setCurrentSessionId(session.id);
		datetime_input("Start", "2026-01-15T09:00", { key: "dt_test" });
		setWidgetValue("dt_test", "2026-06-01T14:30");
		const result = datetime_input("Start", "2026-01-15T09:00", { key: "dt_test" });
		expect(result).toBe("2026-06-01T14:30");
	});

	it("should use custom key when provided", () => {
		const session = manager.createSession();
		setCurrentSessionId(session.id);
		const result = datetime_input("Start", "2026-01-15T09:00", {
			key: "my_datetime",
		});
		expect(result).toBe("2026-01-15T09:00");
	});

	it("should accept Date object as default value", () => {
		const session = manager.createSession();
		setCurrentSessionId(session.id);
		const date = new Date(2026, 0, 15, 9, 0);
		const result = datetime_input("Start", date);
		expect(result).toBe("2026-01-15T09:00");
	});

	it("should include seconds when step < 60", () => {
		const session = manager.createSession();
		setCurrentSessionId(session.id);
		const date = new Date(2026, 0, 15, 9, 30, 45);
		const result = datetime_input("Start", date, { step: 1 });
		expect(result).toBe("2026-01-15T09:30:45");
	});
});

describe("renderDatetimeInput", () => {
	// --- HTML出力 ---
	it("should render datetime-local input", () => {
		const html = renderDatetimeInput("Start", "2026-01-15T09:00");
		expect(html).toContain('type="datetime-local"');
		expect(html).toContain('value="2026-01-15T09:00"');
	});

	it("should render min and max attributes", () => {
		const html = renderDatetimeInput("Start", "", {
			min: "2026-01-01T00:00",
			max: "2026-12-31T23:59",
		});
		expect(html).toContain('min="2026-01-01T00:00"');
		expect(html).toContain('max="2026-12-31T23:59"');
	});

	it("should render step attribute", () => {
		const html = renderDatetimeInput("Start", "", { step: 1 });
		expect(html).toContain('step="1"');
	});

	it("should escape HTML in labels", () => {
		const html = renderDatetimeInput("<script>alert(1)</script>", "");
		expect(html).not.toContain("<script>");
		expect(html).toContain("&lt;script&gt;");
	});

	it("should support disabled attribute", () => {
		const html = renderDatetimeInput("Start", "", { disabled: true });
		expect(html).toContain("disabled");
	});

	it("should convert Date objects in min/max", () => {
		const html = renderDatetimeInput("Start", "", {
			min: new Date(2026, 0, 1, 0, 0),
			max: new Date(2026, 11, 31, 23, 59),
		});
		expect(html).toContain('min="2026-01-01T00:00"');
		expect(html).toContain('max="2026-12-31T23:59"');
	});

	it("should reject non-numeric step values (security)", () => {
		const html = renderDatetimeInput("Start", "", {
			step: Number.NaN,
		});
		expect(html).not.toContain("step=");
	});

	it("should use data-kt-event change", () => {
		const html = renderDatetimeInput("Start", "");
		expect(html).toContain('data-kt-event="change"');
	});
});
