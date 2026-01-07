import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { chat_container, chat_message } from "../../../src/kt/chat";

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

		it("should escape HTML in content by default", () => {
			chat_message("user", "<script>alert('xss')</script>");
			expect(ctx.getHtml()).toContain("&lt;script&gt;");
			expect(ctx.getHtml()).not.toContain("<script>alert");
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
			chat_message("user", "Hello!", { avatar: '<script>xss</script>' });
			expect(ctx.getHtml()).toContain("&lt;script&gt;");
			expect(ctx.getHtml()).not.toContain("<script>xss");
		});

		it("should render name when provided", () => {
			chat_message("user", "Hello!", { name: "Alice" });
			expect(ctx.getHtml()).toContain("Alice");
			expect(ctx.getHtml()).toContain("kt-chat-name");
		});

		it("should escape HTML in name", () => {
			chat_message("user", "Hello!", { name: '<script>xss</script>' });
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
			expect(() => chat_message("user", "test")).toThrow(
				"RenderContext is not available",
			);
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
			expect(() => chat_container(() => {})).toThrow(
				"RenderContext is not available",
			);
		});
	});
});
