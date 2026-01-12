import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { chat_container, chat_input, chat_message } from "../../../src/kt/chat";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import {
	resetSessionManager,
	SessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { resetWidgetCounter } from "../../../src/widgets/registry";

describe("Chat APIs", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
	});

	afterEach(() => {
		setRenderContext(null);
	});

	describe("chat_message", () => {
		it("should render with kt-chat-message class", () => {
			chat_message("user", "Hello!");
			expect(ctx.getHtml()).toContain('class="kt-chat-message');
		});

		it("should include role as data attribute", () => {
			chat_message("user", "Hello!");
			expect(ctx.getHtml()).toContain('data-role="user"');
		});

		it("should render user role with kt-chat-message-user class", () => {
			chat_message("user", "Hello!");
			expect(ctx.getHtml()).toContain("kt-chat-message-user");
		});

		it("should render assistant role with kt-chat-message-assistant class", () => {
			chat_message("assistant", "Hi there!");
			expect(ctx.getHtml()).toContain("kt-chat-message-assistant");
		});

		it("should render system role with kt-chat-message-system class", () => {
			chat_message("system", "System message");
			expect(ctx.getHtml()).toContain("kt-chat-message-system");
		});

		it("should render message content", () => {
			chat_message("user", "Hello World!");
			expect(ctx.getHtml()).toContain("Hello World!");
		});

		it("should sanitize HTML in content (remove dangerous tags)", () => {
			chat_message("user", "<script>alert('xss')</script>");
			expect(ctx.getHtml()).not.toContain("<script>");
			expect(ctx.getHtml()).not.toContain("alert");
		});

		it("should render content as markdown", () => {
			chat_message("assistant", "**bold** and *italic*");
			expect(ctx.getHtml()).toContain("<strong>bold</strong>");
			expect(ctx.getHtml()).toContain("<em>italic</em>");
		});

		it("should render code blocks in markdown", () => {
			chat_message("assistant", "```typescript\nconst x = 1;\n```");
			expect(ctx.getHtml()).toContain("<code");
		});

		it("should render default avatar for user", () => {
			chat_message("user", "Hello!");
			const html = ctx.getHtml();
			expect(html).toContain("kt-chat-avatar");
		});

		it("should render default avatar for assistant", () => {
			chat_message("assistant", "Hello!");
			const html = ctx.getHtml();
			expect(html).toContain("kt-chat-avatar");
		});

		it("should use custom avatar when provided", () => {
			chat_message("user", "Hello!", { avatar: "🧑‍💻" });
			expect(ctx.getHtml()).toContain("🧑‍💻");
		});

		it("should escape HTML in custom avatar", () => {
			chat_message("user", "Hello!", { avatar: "<script>xss</script>" });
			expect(ctx.getHtml()).toContain("&lt;script&gt;");
			expect(ctx.getHtml()).not.toContain("<script>xss");
		});

		it("should render name when provided", () => {
			chat_message("user", "Hello!", { name: "Alice" });
			expect(ctx.getHtml()).toContain("Alice");
			expect(ctx.getHtml()).toContain("kt-chat-name");
		});

		it("should escape HTML in name", () => {
			chat_message("user", "Hello!", { name: "<script>xss</script>" });
			expect(ctx.getHtml()).toContain("&lt;script&gt;");
			expect(ctx.getHtml()).not.toContain("<script>xss");
		});

		it("should not render name element when name not provided", () => {
			chat_message("user", "Hello!");
			expect(ctx.getHtml()).not.toContain("kt-chat-name");
		});

		it("should render multiple messages", () => {
			chat_message("user", "Hello!");
			chat_message("assistant", "Hi!");
			const html = ctx.getHtml();
			expect(html).toContain("kt-chat-message-user");
			expect(html).toContain("kt-chat-message-assistant");
		});

		it("should throw error when no render context", () => {
			setRenderContext(null);
			expect(() => chat_message("user", "test")).toThrow("RenderContext is not available");
		});
	});

	describe("chat_container", () => {
		it("should render with kt-chat-container class", () => {
			chat_container(() => {});
			expect(ctx.getHtml()).toContain('class="kt-chat-container"');
		});

		it("should include data-kt-chat-container attribute for auto-scroll", () => {
			chat_container(() => {});
			expect(ctx.getHtml()).toContain("data-kt-chat-container");
		});

		it("should have default height of 400px", () => {
			chat_container(() => {});
			expect(ctx.getHtml()).toContain("height: 400px");
		});

		it("should use custom height when provided", () => {
			chat_container(() => {}, { height: "600px" });
			expect(ctx.getHtml()).toContain("height: 600px");
		});

		it("should have overflow-y auto for scrolling", () => {
			chat_container(() => {});
			expect(ctx.getHtml()).toContain("overflow-y: auto");
		});

		it("should render content inside container", () => {
			chat_container(() => {
				chat_message("user", "Hello!");
			});
			const html = ctx.getHtml();
			expect(html).toContain("kt-chat-container");
			expect(html).toContain("kt-chat-message-user");
			expect(html).toContain("Hello!");
		});

		it("should render multiple messages inside container", () => {
			chat_container(() => {
				chat_message("user", "Hi!");
				chat_message("assistant", "Hello!");
			});
			const html = ctx.getHtml();
			expect(html).toContain("kt-chat-message-user");
			expect(html).toContain("kt-chat-message-assistant");
		});

		it("should throw error when no render context", () => {
			setRenderContext(null);
			expect(() => chat_container(() => {})).toThrow("RenderContext is not available");
		});

		describe("security: CSS injection prevention", () => {
			it("should sanitize height value to prevent CSS injection", () => {
				chat_container(() => {}, { height: "400px; background: url('http://evil.com')" });
				const html = ctx.getHtml();
				// 悪意のあるCSSが除去されている
				expect(html).not.toContain("url(");
				expect(html).not.toContain("evil.com");
				// 有効な値は残っている
				expect(html).toContain("height: 400px");
			});

			it("should use default height for invalid values", () => {
				chat_container(() => {}, { height: "javascript:alert(1)" });
				const html = ctx.getHtml();
				// 無効な値の場合はデフォルト値が使用される
				expect(html).not.toContain("javascript");
				expect(html).toContain("height: 400px");
			});
		});
	});

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

		it("should render chat input with correct structure", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			chat_input("メッセージを入力");
			const html = ctx.getHtml();

			expect(html).toContain("kt-chat-input-wrapper");
			expect(html).toContain('placeholder="メッセージを入力"');
			expect(html).toContain('data-kt-event="chat-submit"');
		});

		it("should return null when no submission", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = chat_input("入力");

			expect(value).toBeNull();
		});

		it("should return submitted value and render HTML", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			// Simulate submitted value
			manager.setState(session.id, "widget_0", "テストメッセージ");

			const value = chat_input("入力");

			expect(value).toBe("テストメッセージ");
			expect(ctx.getHtml()).toContain("kt-chat-input-wrapper");
		});

		it("should use custom key when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			manager.setState(session.id, "my_chat", "カスタムキー");

			const value = chat_input("入力", { key: "my_chat" });

			expect(value).toBe("カスタムキー");
			expect(ctx.getHtml()).toContain('id="my_chat"');
		});

		it("should use default placeholder when empty", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			chat_input();

			expect(ctx.getHtml()).toContain('placeholder="メッセージを入力..."');
		});

		it("should throw error when no render context", () => {
			setRenderContext(null);
			expect(() => chat_input("test")).toThrow("RenderContext is not available");
		});
	});
});
