import { expect, test } from "@playwright/test";

test("homepage displays kantan-ui", async ({ page }) => {
	await page.goto("/");
	await expect(page.locator("body")).toContainText("kantan-ui");
});
