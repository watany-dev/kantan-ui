import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SessionManager, resetSessionManager, setSessionManager } from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { resetWidgetCounter } from "../../../src/widgets/registry";
import { renderTextInput, text_input } from "../../../src/widgets/text-input";

describe("text_input", () => {
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

	describe("text_input function", () => {
		it("should return default value on first call", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = text_input("Name", "World");

			expect(value).toBe("World");
		});

		it("should return empty string when no default provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = text_input("Name");

			expect(value).toBe("");
		});

		it("should return stored value on subsequent calls", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			// First call sets default
			text_input("Name", "World");
			resetWidgetCounter();

			// Update the value
			manager.setState(session.id, "widget_0", "Alice");

			// Second call should return stored value
			const value = text_input("Name", "World");

			expect(value).toBe("Alice");
		});

		it("should use custom key when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			manager.setState(session.id, "my_input", "Custom");

			const value = text_input("Name", "World", { key: "my_input" });

			expect(value).toBe("Custom");
		});
	});

	describe("renderTextInput", () => {
		it("should render text input HTML", () => {
			const html = renderTextInput("Name", "World");

			expect(html).toContain('<input type="text"');
			expect(html).toContain('value="World"');
			expect(html).toContain("Name");
			expect(html).toContain("sendEvent");
		});

		it("should include placeholder when provided", () => {
			const html = renderTextInput("Name", "", { placeholder: "Enter name" });

			expect(html).toContain('placeholder="Enter name"');
		});

		it("should escape HTML in label and value", () => {
			const html = renderTextInput("<script>", "<script>");

			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;script&gt;");
		});
	});
});
