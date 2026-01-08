import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Layout API - Sidebar", () => {
	test("kt.sidebar() creates sidebar layout structure", async ({ page }) => {
		await gotoAndWait(page);

		// サイドバーレイアウトコンテナが存在する
		const sidebarLayout = page.locator(".kt-layout-sidebar");
		await expect(sidebarLayout).toBeVisible();

		// サイドバー要素が存在する
		const sidebar = page.locator(".kt-sidebar");
		await expect(sidebar).toBeVisible();

		// メインエリアが存在する
		const main = page.locator(".kt-main");
		await expect(main).toBeVisible();
	});

	test("sidebar contains expected content", async ({ page }) => {
		await gotoAndWait(page);

		const sidebar = page.locator(".kt-sidebar");
		await expect(sidebar).toContainText("Settings");
		await expect(sidebar).toContainText("This is sidebar content");
	});

	test("sidebar is expanded by default", async ({ page }) => {
		await gotoAndWait(page);

		const sidebar = page.locator(".kt-sidebar");
		await expect(sidebar).toHaveAttribute("data-state", "expanded");
	});

	test("sidebar toggle button exists", async ({ page }) => {
		await gotoAndWait(page);

		const toggle = page.locator(".kt-sidebar-toggle");
		await expect(toggle).toBeVisible();
	});

	test("clicking toggle collapses sidebar", async ({ page }) => {
		await gotoAndWait(page);

		const sidebar = page.locator(".kt-sidebar");
		const toggle = page.locator(".kt-sidebar-toggle");

		// 最初は展開状態
		await expect(sidebar).toHaveAttribute("data-state", "expanded");

		// トグルをクリック
		await toggle.click();

		// 折りたたみ状態になる
		await expect(sidebar).toHaveAttribute("data-state", "collapsed");
	});

	test("clicking toggle again expands sidebar", async ({ page }) => {
		await gotoAndWait(page);

		const sidebar = page.locator(".kt-sidebar");
		const toggle = page.locator(".kt-sidebar-toggle");

		// トグルをクリックして折りたたむ
		await toggle.click();
		await expect(sidebar).toHaveAttribute("data-state", "collapsed");

		// もう一度クリックして展開
		await toggle.click();
		await expect(sidebar).toHaveAttribute("data-state", "expanded");
	});

	test("main content displays correctly with sidebar", async ({ page }) => {
		await gotoAndWait(page);

		const main = page.locator(".kt-main");
		await expect(main).toContainText("kantan-ui Demo");
	});

	test("sidebar counter updates with main content", async ({ page }) => {
		await gotoAndWait(page);

		const sidebar = page.locator(".kt-sidebar");
		const incrementBtn = page.locator('[data-kt-event="click"]', { hasText: "+ Increment" });

		// 初期カウント
		await expect(sidebar).toContainText("Counter: 0");

		// インクリメント
		await incrementBtn.click();

		// サイドバーのカウントも更新される（再レンダリング後）
		await expect(sidebar).toContainText("Counter: 1");
	});

	test("sidebar counter increments correctly through diff updates", async ({ page }) => {
		await gotoAndWait(page);

		const sidebar = page.locator(".kt-sidebar");
		const incrementBtn = page.locator('[data-kt-event="click"]', { hasText: "+ Increment" });

		// 複数回インクリメントして差分更新が正しく動作することを確認
		await incrementBtn.click();
		await expect(sidebar).toContainText("Counter: 1");

		await incrementBtn.click();
		await expect(sidebar).toContainText("Counter: 2");

		await incrementBtn.click();
		await expect(sidebar).toContainText("Counter: 3");
	});

	test("sidebar structure remains intact after updates", async ({ page }) => {
		await gotoAndWait(page);

		const sidebarContent = page.locator("#kt-sidebar-content");
		const incrementBtn = page.locator('[data-kt-event="click"]', { hasText: "+ Increment" });

		// サイドバーコンテンツ要素が存在することを確認
		await expect(sidebarContent).toBeVisible();

		// 更新後もサイドバーコンテンツ要素が維持されることを確認
		await incrementBtn.click();
		await expect(sidebarContent).toBeVisible();
		await expect(sidebarContent).toContainText("Settings");
	});
});

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

test.describe("Layout API - Sidebar (Mobile)", () => {
	test.use({ viewport: { width: 375, height: 667 } });

	test("sidebar uses fixed positioning on mobile", async ({ page }) => {
		await gotoAndWait(page);
		const sidebar = page.locator(".kt-sidebar");
		await expect(sidebar).toHaveCSS("position", "fixed");
	});

	test("sidebar toggle button is larger on mobile", async ({ page }) => {
		await gotoAndWait(page);
		const toggle = page.locator(".kt-sidebar-toggle");
		const box = await toggle.boundingBox();
		expect(box?.width).toBeGreaterThanOrEqual(40);
		expect(box?.height).toBeGreaterThanOrEqual(40);
	});

	test("sidebar overlay appears when expanded on mobile", async ({ page }) => {
		await gotoAndWait(page);
		const overlay = page.locator(".kt-sidebar-overlay");
		const sidebar = page.locator(".kt-sidebar");

		await expect(sidebar).toHaveAttribute("data-state", "expanded");
		await expect(overlay).toBeVisible();
	});

	test("clicking overlay closes sidebar on mobile", async ({ page }) => {
		await gotoAndWait(page);
		const overlay = page.locator(".kt-sidebar-overlay");
		const sidebar = page.locator(".kt-sidebar");

		await overlay.click();
		await expect(sidebar).toHaveAttribute("data-state", "collapsed");
	});
});

test.describe("Layout API - Sidebar (Tablet 768px)", () => {
	test.use({ viewport: { width: 768, height: 1024 } });

	test("sidebar uses fixed positioning at exactly 768px", async ({ page }) => {
		await gotoAndWait(page);
		const sidebar = page.locator(".kt-sidebar");
		await expect(sidebar).toHaveCSS("position", "fixed");
	});
});

test.describe("Layout API - Sidebar (Desktop)", () => {
	test.use({ viewport: { width: 1280, height: 800 } });

	test("sidebar uses relative positioning on desktop", async ({ page }) => {
		await gotoAndWait(page);
		const sidebar = page.locator(".kt-sidebar");
		await expect(sidebar).toHaveCSS("position", "relative");
	});

	test("sidebar overlay is hidden on desktop", async ({ page }) => {
		await gotoAndWait(page);
		const overlay = page.locator(".kt-sidebar-overlay");
		await expect(overlay).not.toBeVisible();
	});
});
