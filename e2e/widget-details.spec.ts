import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Widget Details - Button", () => {
	test("button has correct CSS class", async ({ page }) => {
		await gotoAndWait(page);

		const button = page.locator("#btn_inc");
		await expect(button).toHaveClass(/kt-button/);
	});

	test("button displays correct text", async ({ page }) => {
		await gotoAndWait(page);

		await expect(page.locator("#btn_inc")).toHaveText("+ Increment");
		await expect(page.locator("#btn_dec")).toHaveText("- Decrement");
		await expect(page.locator("#btn_reset")).toHaveText("Reset");
	});

	test("button is clickable and visible", async ({ page }) => {
		await gotoAndWait(page);

		const button = page.locator("#btn_inc");
		await expect(button).toBeVisible();
		await expect(button).toBeEnabled();
	});

	test("multiple buttons work independently", async ({ page }) => {
		await gotoAndWait(page);

		// 各ボタンが独立して動作することを確認
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 2",
		);

		await page.click("#btn_dec");
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
		);

		await page.click("#btn_reset");
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 0",
		);
	});
});

test.describe("Widget Details - Slider", () => {
	test("slider has correct CSS class", async ({ page }) => {
		await gotoAndWait(page);

		const slider = page.locator("#volume_slider");
		await expect(slider).toHaveClass(/kt-slider/);
	});

	test("slider has correct type attribute", async ({ page }) => {
		await gotoAndWait(page);

		const slider = page.locator("#volume_slider");
		await expect(slider).toHaveAttribute("type", "range");
	});

	test("slider has min and max attributes", async ({ page }) => {
		await gotoAndWait(page);

		const slider = page.locator("#volume_slider");
		await expect(slider).toHaveAttribute("min", "0");
		await expect(slider).toHaveAttribute("max", "100");
	});

	test("slider label updates with value", async ({ page }) => {
		await gotoAndWait(page);

		const slider = page.locator("#volume_slider");
		const label = page.locator(".kt-slider-label");

		// 初期値
		await expect(label).toContainText("Volume: 50");

		// 値を変更
		await slider.evaluate((el: HTMLInputElement) => {
			el.value = "25";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		await expect(label).toContainText("Volume: 25");
	});

	test("slider value is preserved in state", async ({ page }) => {
		await gotoAndWait(page);

		const slider = page.locator("#volume_slider");

		// 値を変更
		await slider.evaluate((el: HTMLInputElement) => {
			el.value = "80";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		await expect(page.locator(".kt-slider-label")).toContainText("Volume: 80");

		// ボタンクリックでリレンダリング
		await page.click("#btn_inc");

		// スライダーの値が保持されていることを確認
		await expect(page.locator(".kt-slider-label")).toContainText("Volume: 80");
	});
});

test.describe("Widget Details - Text Input", () => {
	test("text input has correct CSS class", async ({ page }) => {
		await gotoAndWait(page);

		const input = page.locator("#name_input");
		await expect(input).toHaveClass(/kt-text-input/);
	});

	test("text input has correct type attribute", async ({ page }) => {
		await gotoAndWait(page);

		const input = page.locator("#name_input");
		await expect(input).toHaveAttribute("type", "text");
	});

	test("text input has default value", async ({ page }) => {
		await gotoAndWait(page);

		const input = page.locator("#name_input");
		await expect(input).toHaveValue("World");
	});

	test("text input value is preserved in state", async ({ page }) => {
		await gotoAndWait(page);

		const input = page.locator("#name_input");

		// 値を変更
		await input.evaluate((el: HTMLInputElement) => {
			el.value = "Kantan";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		await expect(page.locator("#results-card")).toContainText("Hello, Kantan!");

		// ボタンクリックでリレンダリング
		await page.click("#btn_inc");

		// 入力値が保持されていることを確認
		await expect(page.locator("#results-card")).toContainText("Hello, Kantan!");
	});

	test("text input has label", async ({ page }) => {
		await gotoAndWait(page);

		// テキスト入力にはラベルがあることを確認
		const label = page.locator(".kt-text-input-label");
		expect(await label.count()).toBeGreaterThan(0);
	});
});

test.describe("Widget Details - Selectbox", () => {
	test("selectbox has correct CSS class", async ({ page }) => {
		await gotoAndWait(page);

		const select = page.locator("#color_select");
		await expect(select).toHaveClass(/kt-selectbox/);
	});

	test("selectbox has correct options", async ({ page }) => {
		await gotoAndWait(page);

		const select = page.locator("#color_select");
		const options = select.locator("option");

		expect(await options.count()).toBe(4);
		await expect(options.nth(0)).toHaveValue("blue");
		await expect(options.nth(1)).toHaveValue("green");
		await expect(options.nth(2)).toHaveValue("red");
		await expect(options.nth(3)).toHaveValue("purple");
	});

	test("selectbox has default value", async ({ page }) => {
		await gotoAndWait(page);

		const select = page.locator("#color_select");
		await expect(select).toHaveValue("blue");
	});

	test("selectbox value changes on selection", async ({ page }) => {
		await gotoAndWait(page);

		const select = page.locator("#color_select");

		// 値を変更
		await select.selectOption("green");

		// デバッグ状態に反映されていることを確認
		await expect(page.locator("#debug-state")).toContainText('"color": "green"');
	});

	test("selectbox value is preserved in state", async ({ page }) => {
		await gotoAndWait(page);

		const select = page.locator("#color_select");

		// 値を変更
		await select.selectOption("purple");
		await expect(page.locator("#debug-state")).toContainText('"color": "purple"');

		// ボタンクリックでリレンダリング
		await page.click("#btn_inc");

		// 選択値が保持されていることを確認
		await expect(page.locator("#debug-state")).toContainText('"color": "purple"');
	});

	test("selectbox has label", async ({ page }) => {
		await gotoAndWait(page);

		// セレクトボックスにはラベルがあることを確認
		const label = page.locator(".kt-selectbox-label");
		expect(await label.count()).toBeGreaterThan(0);
	});
});
