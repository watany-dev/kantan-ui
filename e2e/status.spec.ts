import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("kt.status", () => {
	test("shows running state with spinner and expanded", async ({ page }) => {
		await gotoAndWait(page);
		const status = page.locator(".kt-status-running").first();
		await expect(status).toBeVisible();
		await expect(status.locator(".kt-spinner-icon")).toBeVisible();
		await expect(status).toHaveAttribute("open");
	});

	test("shows complete state with checkmark and collapsed", async ({ page }) => {
		await gotoAndWait(page);
		const status = page.locator(".kt-status-complete").first();
		await expect(status).toBeVisible();
		await expect(status.locator(".kt-status-icon.kt-status-complete")).toBeVisible();
		await expect(status).not.toHaveAttribute("open");
	});

	test("shows error state with cross mark", async ({ page }) => {
		await gotoAndWait(page);
		const status = page.locator(".kt-status-error").first();
		await expect(status).toBeVisible();
		await expect(status.locator(".kt-status-icon.kt-status-error")).toBeVisible();
	});

	test("expands and collapses on summary click", async ({ page }) => {
		await gotoAndWait(page);
		const status = page.locator(".kt-status-complete").first();
		const summary = status.locator("summary");

		// Initially collapsed
		await expect(status).not.toHaveAttribute("open");

		// Scroll into view and click to expand
		await summary.scrollIntoViewIfNeeded();
		await summary.click();
		await expect(status).toHaveAttribute("open");

		// Click to collapse
		await summary.click();
		await expect(status).not.toHaveAttribute("open");
	});

	test("has accessible sr-only text", async ({ page }) => {
		await gotoAndWait(page);
		const srText = page.locator(".kt-status-running .kt-sr-only").first();
		await expect(srText).toHaveText(/実行中/);
	});

	test("has aria-hidden on icons", async ({ page }) => {
		await gotoAndWait(page);
		const icon = page.locator(".kt-status-icon").first();
		await expect(icon).toHaveAttribute("aria-hidden", "true");
	});

	test("displays content inside status container", async ({ page }) => {
		await gotoAndWait(page);
		const runningStatus = page.locator(".kt-status-running").first();
		await expect(runningStatus.locator(".kt-status-content")).toContainText(
			"Connecting to database...",
		);
	});

	test("status header displays label text", async ({ page }) => {
		await gotoAndWait(page);
		const label = page.locator(".kt-status-running .kt-status-label").first();
		await expect(label).toContainText("Processing data...");
	});
});
