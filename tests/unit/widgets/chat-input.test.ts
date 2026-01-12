import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	resetSessionManager,
	SessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { chat_input, renderChatInput } from "../../../src/widgets/chat-input";
import { resetWidgetCounter } from "../../../src/widgets/registry";

describe("chat_input", () => {
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

	describe("chat_input function", () => {
		it("should return null when no submission", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = chat_input("入力");

			expect(value).toBeNull();
		});

		it("should return submitted value from state", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			// Simulate submitted value in state
			manager.setState(session.id, "widget_0", "こんにちは");

			const value = chat_input("入力");

			expect(value).toBe("こんにちは");
		});

		it("should use custom key when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			manager.setState(session.id, "my_chat", "テスト");

			const value = chat_input("入力", { key: "my_chat" });

			expect(value).toBe("テスト");
		});

		it("should return null for non-string values in state", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			// Set non-string value
			manager.setState(session.id, "widget_0", 123);

			const value = chat_input("入力");

			expect(value).toBeNull();
		});

		it("should clear value after retrieval (one-time event pattern)", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			// Simulate submitted value in state
			manager.setState(session.id, "my_chat", "一度だけ取得");

			// First call should return the value
			const firstValue = chat_input("入力", { key: "my_chat" });
			expect(firstValue).toBe("一度だけ取得");

			// Second call should return null (value was cleared)
			const secondValue = chat_input("入力", { key: "my_chat" });
			expect(secondValue).toBeNull();

			// State should be cleared
			const state = manager.getState(session.id);
			expect(state?.["my_chat"]).toBeUndefined();
		});
	});

	describe("renderChatInput", () => {
		it("renders basic chat input with pinned class by default", () => {
			resetWidgetCounter();
			const html = renderChatInput("メッセージを入力");

			expect(html).toContain('class="kt-chat-input-wrapper kt-chat-input-pinned"');
			expect(html).toContain('placeholder="メッセージを入力"');
			expect(html).toContain('data-kt-event="chat-submit"');
			expect(html).toContain(">送信</button>");
		});

		it("renders without pin when pinToBottom is false", () => {
			resetWidgetCounter();
			const html = renderChatInput("入力", { pinToBottom: false });

			expect(html).toContain('class="kt-chat-input-wrapper"');
			expect(html).not.toContain("kt-chat-input-pinned");
		});

		it("renders with custom submit label", () => {
			resetWidgetCounter();
			const html = renderChatInput("入力", { submitLabel: "送る" });

			expect(html).toContain(">送る</button>");
		});

		it("renders hidden submit button", () => {
			resetWidgetCounter();
			const html = renderChatInput("入力", { hideSubmitButton: true });

			expect(html).toContain('style="display:none"');
		});

		it("renders disabled state", () => {
			resetWidgetCounter();
			const html = renderChatInput("入力", { disabled: true });

			expect(html).toContain("disabled");
		});

		it("renders with maxLength", () => {
			resetWidgetCounter();
			const html = renderChatInput("入力", { maxLength: 500 });

			expect(html).toContain('maxlength="500"');
		});

		it("caps maxLength at 100000", () => {
			resetWidgetCounter();
			const html = renderChatInput("入力", { maxLength: 200000 });

			expect(html).toContain('maxlength="100000"');
		});

		it("ignores invalid maxLength values", () => {
			resetWidgetCounter();
			const html = renderChatInput("入力", { maxLength: -100 });

			expect(html).not.toContain("maxlength");
		});

		it("escapes XSS in placeholder", () => {
			resetWidgetCounter();
			const html = renderChatInput('<script>alert("xss")</script>');

			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;script&gt;");
		});

		it("escapes XSS in submitLabel", () => {
			resetWidgetCounter();
			const html = renderChatInput("入力", {
				submitLabel: '<img onerror="alert(1)">',
			});

			// HTMLタグがエスケープされていることを確認
			expect(html).not.toContain("<img ");
			expect(html).toContain("&lt;img onerror");
		});

		it("uses custom key for id", () => {
			resetWidgetCounter();
			const html = renderChatInput("入力", { key: "my_chat" });

			expect(html).toContain('id="my_chat"');
			expect(html).toContain('data-kt-trigger="my_chat"');
		});

		it("includes aria-label for accessibility", () => {
			resetWidgetCounter();
			const html = renderChatInput("質問を入力");

			expect(html).toContain('aria-label="質問を入力"');
			expect(html).toContain('aria-label="送信"');
		});

		it("uses default placeholder when empty", () => {
			resetWidgetCounter();
			const html = renderChatInput("");

			expect(html).toContain('placeholder="メッセージを入力..."');
			expect(html).toContain('aria-label="チャットメッセージ入力"');
		});
	});
});
