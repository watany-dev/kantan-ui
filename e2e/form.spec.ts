import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Form API", () => {
	test("kt.form() creates form element with kt-form class", async ({ page }) => {
		await gotoAndWait(page);

		const forms = page.locator("form.kt-form");
		await expect(forms.first()).toBeVisible();
	});

	test("form has data-form-key attribute", async ({ page }) => {
		await gotoAndWait(page);

		const form = page.locator("form.kt-form").first();
		await expect(form).toHaveAttribute("data-form-key", "contact_form");
	});

	test("form contains text inputs", async ({ page }) => {
		await gotoAndWait(page);

		const form = page.locator("form.kt-form").first();
		const inputs = form.locator(".kt-text-input");
		await expect(inputs).toHaveCount(2);
	});

	test("form contains submit button", async ({ page }) => {
		await gotoAndWait(page);

		const form = page.locator("form.kt-form").first();
		const submitButton = form.locator("button.kt-form-submit");
		await expect(submitButton).toBeVisible();
		await expect(submitButton).toHaveText("Submit");
	});

	test("submit button has type=submit", async ({ page }) => {
		await gotoAndWait(page);

		const submitButton = page.locator("button.kt-form-submit").first();
		await expect(submitButton).toHaveAttribute("type", "submit");
	});

	test("submit button has data-kt-event=submit", async ({ page }) => {
		await gotoAndWait(page);

		const submitButton = page.locator("button.kt-form-submit").first();
		await expect(submitButton).toHaveAttribute("data-kt-event", "submit");
	});
});
