import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Layout API - Columns", () => {
	test("kt.columns() creates flex container with kt-columns class", async ({ page }) => {
		await gotoAndWait(page);

		const columnsContainers = page.locator(".kt-columns");
		await expect(columnsContainers.first()).toBeVisible();

		// flexbox レイアウトであることを確認
		await expect(columnsContainers.first()).toHaveCSS("display", "flex");
	});

	test("columns contain kt-column children", async ({ page }) => {
		await gotoAndWait(page);

		const columns = page.locator(".kt-columns").first().locator(".kt-column");
		const count = await columns.count();
		expect(count).toBe(2);
	});

	test("columns display content correctly", async ({ page }) => {
		await gotoAndWait(page);

		const firstColumns = page.locator(".kt-columns").first();
		await expect(firstColumns).toContainText("Left column");
		await expect(firstColumns).toContainText("Right column");
	});

	test("columns with ratio have correct widths", async ({ page }) => {
		await gotoAndWait(page);

		// 2番目のcolumns（1:2:1 ratio）
		const columnsWithRatio = page.locator(".kt-columns").nth(1);
		const columns = columnsWithRatio.locator(".kt-column");

		// 3つのカラムがあることを確認
		await expect(columns).toHaveCount(3);

		// 幅が正しく設定されていることを確認
		// 1:2:1 = 25%:50%:25%
		await expect(columns.nth(0)).toHaveAttribute("style", /flex: 0 0 25%/);
		await expect(columns.nth(1)).toHaveAttribute("style", /flex: 0 0 50%/);
		await expect(columns.nth(2)).toHaveAttribute("style", /flex: 0 0 25%/);
	});

	test("columns have gap between them", async ({ page }) => {
		await gotoAndWait(page);

		const columnsContainer = page.locator(".kt-columns").first();
		await expect(columnsContainer).toHaveAttribute("style", /gap:/);
	});
});
