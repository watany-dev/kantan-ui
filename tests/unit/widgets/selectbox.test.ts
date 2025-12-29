import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SessionManager, resetSessionManager, setSessionManager } from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { resetWidgetCounter } from "../../../src/widgets/registry";
import { renderSelectbox, selectbox } from "../../../src/widgets/selectbox";

describe("selectbox", () => {
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

	describe("selectbox function", () => {
		it("should return default value on first call", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = selectbox("Color", ["red", "green", "blue"], "green");

			expect(value).toBe("green");
		});

		it("should return first option when no default provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = selectbox("Color", ["red", "green", "blue"]);

			expect(value).toBe("red");
		});

		it("should return empty string when options empty", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = selectbox("Color", []);

			expect(value).toBe("");
		});

		it("should return stored value on subsequent calls", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			// First call sets default
			selectbox("Color", ["red", "green", "blue"], "red");
			resetWidgetCounter();

			// Update the value
			manager.setState(session.id, "widget_0", "blue");

			// Second call should return stored value
			const value = selectbox("Color", ["red", "green", "blue"], "red");

			expect(value).toBe("blue");
		});

		it("should use custom key when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			manager.setState(session.id, "my_select", "green");

			const value = selectbox("Color", ["red", "green", "blue"], "red", {
				key: "my_select",
			});

			expect(value).toBe("green");
		});
	});

	describe("renderSelectbox", () => {
		it("should render selectbox HTML", () => {
			const html = renderSelectbox("Color", ["red", "green", "blue"], "green");

			expect(html).toContain("<select");
			expect(html).toContain("<option");
			expect(html).toContain("Color");
			expect(html).toContain("sendEvent");
		});

		it("should mark selected option", () => {
			const html = renderSelectbox("Color", ["red", "green", "blue"], "green");

			expect(html).toContain('value="green" selected');
			expect(html).not.toContain('value="red" selected');
		});

		it("should render all options", () => {
			const html = renderSelectbox("Color", ["red", "green", "blue"], "red");

			expect(html).toContain('value="red"');
			expect(html).toContain('value="green"');
			expect(html).toContain('value="blue"');
		});

		it("should escape HTML in options", () => {
			const html = renderSelectbox(
				"Color",
				["<script>", "normal"],
				"<script>",
			);

			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;script&gt;");
		});
	});
});
