import { expect, test } from "@playwright/test";

test("homepage displays kantan-ui", async ({ page }) => {
	await page.goto("/");
	// タイトルにkantan-uiが含まれることを確認
	await expect(page).toHaveTitle("kantan-ui");
	// アプリのコンテンツが表示されることを確認
	await expect(page.locator("#app")).toBeVisible();
});
