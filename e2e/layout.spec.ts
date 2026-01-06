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

test.describe("Layout API - Expander", () => {
	test("kt.expander() creates details element with kt-expander class", async ({ page }) => {
		await gotoAndWait(page);

		const expanders = page.locator("details.kt-expander");
		await expect(expanders.first()).toBeVisible();
	});

	test("expander has summary with label", async ({ page }) => {
		await gotoAndWait(page);

		const summary = page.locator("details.kt-expander").first().locator("summary");
		await expect(summary).toBeVisible();
		await expect(summary).toContainText("Click to see details");
	});

	test("expander content is hidden when collapsed", async ({ page }) => {
		await gotoAndWait(page);

		const firstExpander = page.locator("details.kt-expander").first();
		const content = firstExpander.locator(".kt-expander-content");

		// details要素が閉じている場合、コンテンツは非表示
		await expect(firstExpander).not.toHaveAttribute("open");
		await expect(content).not.toBeVisible();
	});

	test("expander can be opened by clicking", async ({ page }) => {
		await gotoAndWait(page);

		const firstExpander = page.locator("details.kt-expander").first();
		const summary = firstExpander.locator("summary");
		const content = firstExpander.locator(".kt-expander-content");

		// クリックして展開
		await summary.click();

		// コンテンツが表示される
		await expect(content).toBeVisible();
		await expect(content).toContainText("This content is hidden by default");
	});

	test("expander with expanded=true is open by default", async ({ page }) => {
		await gotoAndWait(page);

		const expandedExpander = page.locator("details.kt-expander").nth(1);
		const content = expandedExpander.locator(".kt-expander-content");

		// デフォルトで展開されている
		await expect(expandedExpander).toHaveAttribute("open");
		await expect(content).toBeVisible();
		await expect(content).toContainText("This content is visible by default");
	});
});
