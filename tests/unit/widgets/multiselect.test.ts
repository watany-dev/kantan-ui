import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	SessionManager,
	resetSessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { multiselect, renderMultiselect } from "../../../src/widgets/multiselect";
import { resetWidgetCounter } from "../../../src/widgets/registry";

describe("multiselect", () => {
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

	describe("multiselect function", () => {
		it("should return empty array by default", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = multiselect("Tags", ["A", "B", "C"]);

			expect(value).toEqual([]);
		});

		it("should return defaultValue when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = multiselect("Tags", ["A", "B", "C"], ["A", "C"]);

			expect(value).toEqual(["A", "C"]);
		});

		it("should return stored state value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			// First call sets default
			multiselect("Tags", ["A", "B", "C"], ["A"]);
			resetWidgetCounter();

			// Update the value
			manager.setState(session.id, "widget_0", ["B", "C"]);

			// Second call should return stored value
			const value = multiselect("Tags", ["A", "B", "C"], ["A"]);

			expect(value).toEqual(["B", "C"]);
		});

		it("should use custom key when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			manager.setState(session.id, "my_multiselect", ["A", "B"]);

			const value = multiselect("Tags", ["A", "B", "C"], [], { key: "my_multiselect" });

			expect(value).toEqual(["A", "B"]);
		});

		it("should throw error for empty options array", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			expect(() => multiselect("Tags", [])).toThrow("multiselect: options array must not be empty");
		});

		it("should throw error when defaultValue contains invalid option", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			expect(() => multiselect("Tags", ["A", "B", "C"], ["D"])).toThrow(
				'multiselect: defaultValue "D" must be one of the options',
			);
		});
	});

	describe("renderMultiselect", () => {
		it("should render multiselect HTML with label", () => {
			const html = renderMultiselect("Tags", ["A", "B", "C"], []);

			expect(html).toContain('class="kt-multiselect-container"');
			expect(html).toContain('type="checkbox"');
			expect(html).toContain("Tags");
			expect(html).toContain("A");
			expect(html).toContain("B");
			expect(html).toContain("C");
		});

		it("should mark selected options as checked", () => {
			const html = renderMultiselect("Tags", ["A", "B", "C"], ["A", "C"]);

			expect(html).toMatch(/value="A"[^>]*checked/);
			expect(html).not.toMatch(/value="B"[^>]*checked/);
			expect(html).toMatch(/value="C"[^>]*checked/);
		});

		it("should render disabled attribute when disabled", () => {
			const html = renderMultiselect("Tags", ["A", "B"], [], { disabled: true });

			expect(html).toContain("disabled");
		});

		it("should disable unselected options when maxSelections reached", () => {
			const html = renderMultiselect("Tags", ["A", "B", "C"], ["A", "B"], { maxSelections: 2 });

			// A and B should be checked but not disabled
			expect(html).toMatch(/value="A"[^>]*checked/);
			expect(html).toMatch(/value="B"[^>]*checked/);
			// C should be disabled (not checked, but disabled because max reached)
			expect(html).toMatch(/value="C"[^>]*disabled/);
		});

		it("should use custom key for id", () => {
			const html = renderMultiselect("Tags", ["A", "B"], [], { key: "my_multiselect" });

			expect(html).toContain('id="my_multiselect"');
		});

		it("should escape HTML in label", () => {
			const html = renderMultiselect("<script>alert('xss')</script>", ["A"], []);

			expect(html).not.toContain("<script>alert");
			expect(html).toContain("&lt;script&gt;");
		});

		it("should escape HTML in options", () => {
			const html = renderMultiselect("Tags", ["<script>xss</script>"], []);

			expect(html).not.toContain("<script>xss</script>");
			expect(html).toContain("&lt;script&gt;");
		});

		it("should include data-kt-event attribute", () => {
			const html = renderMultiselect("Tags", ["A"], []);

			expect(html).toContain('data-kt-event="change"');
		});
	});
});
