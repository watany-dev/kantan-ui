import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Edge Cases", () => {
	test("slider respects min/max boundaries", async ({ page }) => {
		await gotoAndWait(page);

		const slider = page.locator("#volume_slider");

		// 最小値に設定
		await slider.evaluate((el: HTMLInputElement) => {
			el.value = "0";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});
		await expect(page.locator("#volume_slider-container .kt-slider-label")).toContainText(
			"Volume: 0",
		);

		// 最大値に設定
		await slider.evaluate((el: HTMLInputElement) => {
			el.value = "100";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});
		await expect(page.locator("#volume_slider-container .kt-slider-label")).toContainText(
			"Volume: 100",
		);
	});

	test("text input handles empty string", async ({ page }) => {
		await gotoAndWait(page);

		const textInput = page.locator("#name_input");

		// 空文字を設定
		await textInput.evaluate((el: HTMLInputElement) => {
			el.value = "";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// エラーなく処理される
		await expect(page.locator("#results-card")).toContainText("Hello, !");
	});

	test("handles very long string input without crash", async ({ page }) => {
		await gotoAndWait(page);

		const textInput = page.locator("#name_input");
		const longString = "A".repeat(5000);

		// 長い文字列を設定
		await textInput.evaluate((el: HTMLInputElement, value: string) => {
			el.value = value;
			el.dispatchEvent(new Event("input", { bubbles: true }));
		}, longString);

		// アプリがクラッシュしない
		await expect(page.locator("#app h1.kt-title")).toBeVisible();

		// ボタンがまだ動作する
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");
	});

	test("rapid clicks are handled correctly", async ({ page }) => {
		await gotoAndWait(page);

		const incButton = page.locator("#btn_inc");

		// 高速連打（10回）
		const clicks = 10;
		for (let i = 0; i < clicks; i++) {
			await incButton.click({ delay: 10 });
		}

		// 最終値が正確
		await expect(page.locator("#counter-display")).toContainText(`Current count: ${clicks}`);
	});

	test("concurrent widget updates maintain consistency", async ({ page }) => {
		await gotoAndWait(page);

		// 複数ウィジェットを素早く操作
		await page.click("#btn_inc");

		const slider = page.locator("#volume_slider");
		await slider.evaluate((el: HTMLInputElement) => {
			el.value = "75";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		const textInput = page.locator("#name_input");
		await textInput.evaluate((el: HTMLInputElement) => {
			el.value = "Test";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// すべての変更が反映されている
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");
		await expect(page.locator("#volume_slider-container .kt-slider-label")).toContainText(
			"Volume: 75",
		);
		await expect(page.locator("#results-card")).toContainText("Hello, Test!");
	});
});
