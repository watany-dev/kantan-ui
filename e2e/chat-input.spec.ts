import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("chat_input E2E", () => {
	test.describe("Basic Rendering", () => {
		test("chat_input renders with correct structure", async ({ page }) => {
			await gotoAndWait(page);

			const chatInput = page.locator("#demo_chat_input");
			await expect(chatInput).toBeVisible();
			await expect(chatInput).toHaveAttribute("data-kt-event", "chat-submit");
			await expect(chatInput).toHaveAttribute("placeholder", "メッセージを入力...");
		});

		test("chat_input wrapper has pinned class by default", async ({ page }) => {
			await gotoAndWait(page);

			const wrapper = page.locator("#demo_chat_input").locator("..").locator("..");
			await expect(wrapper).toHaveClass(/kt-chat-input-pinned/);
		});

		test("inline chat_input does not have pinned class", async ({ page }) => {
			await gotoAndWait(page);

			const wrapper = page.locator("#inline_chat_input").locator("..").locator("..");
			await expect(wrapper).not.toHaveClass(/kt-chat-input-pinned/);
		});

		test("disabled chat_input has disabled attribute", async ({ page }) => {
			await gotoAndWait(page);

			const disabledInput = page.locator("#disabled_chat_input");
			await expect(disabledInput).toBeDisabled();
		});

		test("chat_input with maxLength has maxlength attribute", async ({ page }) => {
			await gotoAndWait(page);

			const maxLenInput = page.locator("#maxlen_chat_input");
			await expect(maxLenInput).toHaveAttribute("maxlength", "50");
		});
	});

	test.describe("Submit Behavior", () => {
		test("submit on Enter key sends message and clears input", async ({ page }) => {
			await gotoAndWait(page);

			const chatInput = page.locator("#demo_chat_input");

			// Type a message
			await chatInput.fill("Hello World");
			await expect(chatInput).toHaveValue("Hello World");

			// Press Enter to submit
			await chatInput.press("Enter");

			// Input should be cleared
			await expect(chatInput).toHaveValue("");

			// Wait for server state to reflect the message first (via debug-state)
			// Then wait for the chat message to appear (with increased timeout for DOM stability)
			await expect(page.locator("#debug-state")).toContainText("Hello World", { timeout: 10000 });
			await expect(page.locator(".kt-chat-message-user")).toContainText("Hello World", {
				timeout: 10000,
			});
			await expect(page.locator(".kt-chat-message-assistant")).toContainText(
				"You said: Hello World",
				{ timeout: 10000 },
			);
		});

		test("Shift+Enter does not submit and allows newline", async ({ page }) => {
			await gotoAndWait(page);

			const chatInput = page.locator("#demo_chat_input");

			// Type a message and press Shift+Enter
			await chatInput.fill("Line1");
			await chatInput.press("Shift+Enter");
			await chatInput.type("Line2");

			// Input should contain newline
			await expect(chatInput).toHaveValue("Line1\nLine2");

			// No messages should be added yet
			await expect(page.locator(".kt-chat-message-user")).toHaveCount(0);
		});

		test("submit button click sends message", async ({ page }) => {
			await gotoAndWait(page);

			const chatInput = page.locator("#demo_chat_input");
			const submitButton = page.locator('.kt-chat-input-submit[data-kt-trigger="demo_chat_input"]');

			// Type a message
			await chatInput.fill("Button Submit Test");

			// Click submit button
			await submitButton.click();

			// Input should be cleared
			await expect(chatInput).toHaveValue("");

			// Wait for server state to reflect the message first (via debug-state)
			// Then wait for the chat message to appear (with increased timeout for DOM stability)
			await expect(page.locator("#debug-state")).toContainText("Button Submit Test", {
				timeout: 10000,
			});
			await expect(page.locator(".kt-chat-message-user")).toContainText("Button Submit Test", {
				timeout: 10000,
			});
		});

		test("empty input does not submit", async ({ page }) => {
			await gotoAndWait(page);

			const chatInput = page.locator("#demo_chat_input");

			// Press Enter with empty input
			await chatInput.focus();
			await chatInput.press("Enter");

			// No messages should be added
			await expect(page.locator(".kt-chat-message")).toHaveCount(0);
		});

		test("whitespace-only input does not submit", async ({ page }) => {
			await gotoAndWait(page);

			const chatInput = page.locator("#demo_chat_input");

			// Type only whitespace and press Enter
			await chatInput.fill("   ");
			await chatInput.press("Enter");

			// No messages should be added
			await expect(page.locator(".kt-chat-message")).toHaveCount(0);
		});
	});

	test.describe("Auto-resize", () => {
		test("textarea auto-resizes on multiline input", async ({ page }) => {
			await gotoAndWait(page);

			const chatInput = page.locator("#demo_chat_input");

			// Get initial height
			const initialHeight = await chatInput.evaluate((el) => el.offsetHeight);

			// Type multiple lines
			await chatInput.fill("Line1\nLine2\nLine3\nLine4");

			// Height should increase
			const newHeight = await chatInput.evaluate((el) => el.offsetHeight);
			expect(newHeight).toBeGreaterThan(initialHeight);
		});
	});

	test.describe("State Management", () => {
		test("chat messages persist in session state", async ({ page }) => {
			await gotoAndWait(page);

			const chatInput = page.locator("#demo_chat_input");

			// Send first message
			await chatInput.fill("Message 1");
			await chatInput.press("Enter");

			// Wait for server state to reflect the first message
			await expect(page.locator("#debug-state")).toContainText("Message 1", { timeout: 10000 });

			// Send second message
			await chatInput.fill("Message 2");
			await chatInput.press("Enter");

			// Wait for server state to reflect the second message
			await expect(page.locator("#debug-state")).toContainText("Message 2", { timeout: 10000 });

			// Verify both messages are visible in chat container
			await expect(page.locator(".kt-chat-message-user")).toHaveCount(2, { timeout: 10000 });
			await expect(page.locator(".kt-chat-message-assistant")).toHaveCount(2, { timeout: 10000 });

			// Debug state should reflect messages
			await expect(page.locator("#debug-state")).toContainText('"chatMessages"');
			await expect(page.locator("#debug-state")).toContainText("Message 1");
			await expect(page.locator("#debug-state")).toContainText("Message 2");
		});
	});
});
