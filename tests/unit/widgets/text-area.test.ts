import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	SessionManager,
	resetSessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { resetWidgetCounter } from "../../../src/widgets/registry";
import { renderTextArea, text_area } from "../../../src/widgets/text-area";

describe("text_area", () => {
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

	describe("text_area function", () => {
		it("should return empty string by default", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = text_area("Bio");

			expect(value).toBe("");
		});

		it("should return defaultValue when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = text_area("Bio", "Hello World");

			expect(value).toBe("Hello World");
		});

		it("should return stored state value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			// First call sets default
			text_area("Bio", "default");
			resetWidgetCounter();

			// Update the value
			manager.setState(session.id, "widget_0", "new value");

			// Second call should return stored value
			const value = text_area("Bio", "default");

			expect(value).toBe("new value");
		});

		it("should use custom key when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			manager.setState(session.id, "my_textarea", "custom value");

			const value = text_area("Bio", "default", { key: "my_textarea" });

			expect(value).toBe("custom value");
		});
	});

	describe("renderTextArea", () => {
		it("should render textarea HTML with label", () => {
			const html = renderTextArea("Bio", "Hello");

			expect(html).toContain("<textarea");
			expect(html).toContain("Bio");
			expect(html).toContain("Hello");
			expect(html).toContain('data-kt-event="change"');
		});

		it("should include height style when configured", () => {
			const html = renderTextArea("Bio", "", { height: 200 });

			expect(html).toContain("height: 200px");
		});

		it("should use default height of 100px", () => {
			const html = renderTextArea("Bio", "");

			expect(html).toContain("height: 100px");
		});

		it("should include placeholder attribute", () => {
			const html = renderTextArea("Bio", "", { placeholder: "Enter your bio..." });

			expect(html).toContain('placeholder="Enter your bio..."');
		});

		it("should include maxlength attribute when maxChars configured", () => {
			const html = renderTextArea("Bio", "", { maxChars: 500 });

			expect(html).toContain('maxlength="500"');
		});

		it("should render disabled attribute when disabled", () => {
			const html = renderTextArea("Bio", "", { disabled: true });

			expect(html).toContain("disabled");
		});

		it("should use custom key for id", () => {
			const html = renderTextArea("Bio", "", { key: "my_textarea" });

			expect(html).toContain('id="my_textarea"');
		});

		it("should escape HTML in label", () => {
			const html = renderTextArea("<script>alert('xss')</script>", "");

			expect(html).not.toContain("<script>alert");
			expect(html).toContain("&lt;script&gt;");
		});

		it("should escape HTML in value", () => {
			const html = renderTextArea("Bio", "<script>alert('xss')</script>");

			// Value should be escaped inside textarea content
			expect(html).not.toContain("<script>alert");
		});
	});
});
