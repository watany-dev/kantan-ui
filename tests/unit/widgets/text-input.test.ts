import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	resetSessionManager,
	SessionManager,
	setSessionManager,
} from "../../../src/session/manager";
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
			expect(html).toContain('data-kt-event="input"');
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

		it("should render disabled attribute when disabled", () => {
			const html = renderTextInput("Name", "World", { disabled: true });

			expect(html).toContain("disabled");
		});

		it("should not render disabled attribute when not disabled", () => {
			const html = renderTextInput("Name", "World", { disabled: false });

			expect(html).not.toContain("disabled");
		});

		it("should render maxlength attribute when maxLength is provided", () => {
			const html = renderTextInput("Name", "World", { maxLength: 10 });

			expect(html).toContain('maxlength="10"');
		});

		it("should not render maxlength attribute when maxLength is not provided", () => {
			const html = renderTextInput("Name", "World");

			expect(html).not.toContain("maxlength");
		});

		it("should render password type when type is password", () => {
			const html = renderTextInput("Password", "", { type: "password" });

			expect(html).toContain('type="password"');
			expect(html).not.toContain('type="text"');
		});

		it("should render email type when type is email", () => {
			const html = renderTextInput("Email", "", { type: "email" });

			expect(html).toContain('type="email"');
		});

		it("should render text type by default", () => {
			const html = renderTextInput("Name", "World");

			expect(html).toContain('type="text"');
		});

		describe("security: runtime type validation", () => {
			it("should fallback to text type for invalid type values", () => {
				// TypeScriptの型システムをバイパスしても安全
				const html = renderTextInput("Name", "", {
					type: "invalid-type" as "text",
				});

				expect(html).toContain('type="text"');
				expect(html).not.toContain("invalid-type");
			});

			it("should fallback to text type for XSS attempt in type", () => {
				const html = renderTextInput("Name", "", {
					type: '"><script>alert(1)</script><input type="' as "text",
				});

				expect(html).toContain('type="text"');
				expect(html).not.toContain("<script>");
			});

			it("should validate numeric maxLength", () => {
				// 不正な値が渡されても問題ない
				const html = renderTextInput("Name", "", {
					maxLength: "10; onclick=alert(1)" as unknown as number,
				});

				// 不正な値は無視されるか、数値として解釈される
				expect(html).not.toContain("onclick");
			});
		});
	});
});
