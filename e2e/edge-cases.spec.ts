import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Edge Cases - Boundary Values", () => {
	test("slider accepts minimum value (0)", async ({ page }) => {
		await gotoAndWait(page);

		const slider = page.locator("#volume_slider");

		// スライダーを最小値に設定
		await slider.evaluate((el: HTMLInputElement) => {
			el.value = "0";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// 値が反映されることを確認
		await expect(page.locator(".kt-slider-label")).toContainText("Volume: 0");
	});

	test("slider accepts maximum value (100)", async ({ page }) => {
		await gotoAndWait(page);

		const slider = page.locator("#volume_slider");

		// スライダーを最大値に設定
		await slider.evaluate((el: HTMLInputElement) => {
			el.value = "100";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// 値が反映されることを確認
		await expect(page.locator(".kt-slider-label")).toContainText("Volume: 100");
	});

	test("text input handles empty string", async ({ page }) => {
		await gotoAndWait(page);

		const textInput = page.locator("#name_input");

		// 初期値を確認
		await expect(page.locator("#results-card")).toContainText("Hello, World!");

		// 空文字列を設定
		await textInput.evaluate((el: HTMLInputElement) => {
			el.value = "";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// 空の状態が処理されることを確認
		await expect(page.locator("#results-card")).toContainText("Hello, !");
	});

	test("counter handles zero boundary", async ({ page }) => {
		await gotoAndWait(page);

		// デクリメントを押しても0より下がらない
		await page.click("#btn_dec");
		await page.click("#btn_dec");
		await page.click("#btn_dec");

		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 0",
		);
	});
});

test.describe("Edge Cases - Stress Tests", () => {
	test("handles rapid button clicks (20x)", async ({ page }) => {
		await gotoAndWait(page);

		const incButton = page.locator("#btn_inc");

		// 20回高速クリック
		for (let i = 0; i < 20; i++) {
			await incButton.click();
		}

		// 最終的な値が正しいことを確認
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 20",
		);
	});

	test("handles alternating increment and decrement", async ({ page }) => {
		await gotoAndWait(page);

		const incButton = page.locator("#btn_inc");
		const decButton = page.locator("#btn_dec");

		// インクリメントとデクリメントを交互に実行
		for (let i = 0; i < 10; i++) {
			await incButton.click();
			await decButton.click();
		}

		// 最終的に0であることを確認
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 0",
		);
	});

	test("handles long text input", async ({ page }) => {
		await gotoAndWait(page);

		const textInput = page.locator("#name_input");
		const longText = "A".repeat(500);

		await textInput.evaluate(
			(el: HTMLInputElement, text: string) => {
				el.value = text;
				el.dispatchEvent(new Event("input", { bubbles: true }));
			},
			longText,
		);

		// 長いテキストが処理されることを確認
		await expect(page.locator("#results-card")).toContainText("AAAA");
	});

	test("handles rapid slider changes", async ({ page }) => {
		await gotoAndWait(page);

		const slider = page.locator("#volume_slider");

		// スライダーを高速に変更
		for (let i = 0; i <= 100; i += 10) {
			await slider.evaluate(
				(el: HTMLInputElement, value: number) => {
					el.value = String(value);
					el.dispatchEvent(new Event("input", { bubbles: true }));
				},
				i,
			);
		}

		// 最終的な値が正しいことを確認
		await expect(page.locator(".kt-slider-label")).toContainText("Volume: 100");
	});

	test("handles concurrent widget interactions", async ({ page }) => {
		await gotoAndWait(page);

		// 複数のウィジェットを連続操作
		await page.click("#btn_inc");
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

		await page.click("#btn_inc");

		// 全ての変更が正しく反映されていることを確認
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 3",
		);
		await expect(page.locator(".kt-slider-label")).toContainText("Volume: 75");
		await expect(page.locator("#results-card")).toContainText("Hello, Test!");
	});
});
