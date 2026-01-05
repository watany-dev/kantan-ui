import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("New Widgets E2E", () => {
	test.describe("Checkbox", () => {
		test("checkbox shows default unchecked state", async ({ page }) => {
			await gotoAndWait(page);

			const checkbox = page.locator("#agree_checkbox");
			await expect(checkbox).not.toBeChecked();
		});

		test("checkbox shows default checked state when defaultValue is true", async ({ page }) => {
			await gotoAndWait(page);

			const checkbox = page.locator("#notifications_checkbox");
			await expect(checkbox).toBeChecked();
		});

		test("checkbox click toggles value and updates debug state", async ({ page }) => {
			await gotoAndWait(page);

			const checkbox = page.locator("#agree_checkbox");

			// Initially unchecked
			await expect(checkbox).not.toBeChecked();
			await expect(page.locator("#debug-state")).toContainText('"agreed": false');

			// Click to check
			await checkbox.click();
			await expect(checkbox).toBeChecked();
			await expect(page.locator("#debug-state")).toContainText('"agreed": true');

			// Click to uncheck
			await checkbox.click();
			await expect(checkbox).not.toBeChecked();
			await expect(page.locator("#debug-state")).toContainText('"agreed": false');
		});
	});

	test.describe("Radio", () => {
		test("radio shows default selected option", async ({ page }) => {
			await gotoAndWait(page);

			const radioM = page.locator('input[name="size_radio"][value="M"]');
			await expect(radioM).toBeChecked();
			await expect(page.locator("#debug-state")).toContainText('"size": "M"');
		});

		test("radio selection changes value and updates debug state", async ({ page }) => {
			await gotoAndWait(page);

			// Select L
			const radioL = page.locator('input[name="size_radio"][value="L"]');
			await radioL.click();
			await expect(radioL).toBeChecked();
			await expect(page.locator("#debug-state")).toContainText('"size": "L"');

			// Select S
			const radioS = page.locator('input[name="size_radio"][value="S"]');
			await radioS.click();
			await expect(radioS).toBeChecked();
			await expect(page.locator("#debug-state")).toContainText('"size": "S"');
		});
	});

	test.describe("Number Input", () => {
		test("number_input shows default value", async ({ page }) => {
			await gotoAndWait(page);

			const ageInput = page.locator("#age_input");
			await expect(ageInput).toHaveValue("25");
			await expect(page.locator("#debug-state")).toContainText('"age": 25');
		});

		test("number_input accepts new value and updates debug state", async ({ page }) => {
			await gotoAndWait(page);

			const ageInput = page.locator("#age_input");

			// Clear and enter new value
			await ageInput.fill("30");
			await ageInput.blur(); // Trigger change event

			await expect(page.locator("#debug-state")).toContainText('"age": 30');
		});

		test("number_input respects min/max constraints", async ({ page }) => {
			await gotoAndWait(page);

			const ageInput = page.locator("#age_input");

			// Has min and max attributes
			await expect(ageInput).toHaveAttribute("min", "0");
			await expect(ageInput).toHaveAttribute("max", "120");
		});
	});

	test.describe("Text Area", () => {
		test("text_area shows default value", async ({ page }) => {
			await gotoAndWait(page);

			const textarea = page.locator("#bio_textarea");
			await expect(textarea).toHaveValue("Tell us about yourself...");
		});

		test("text_area accepts new value and updates debug state", async ({ page }) => {
			await gotoAndWait(page);

			const textarea = page.locator("#bio_textarea");

			// Clear and enter new value
			await textarea.fill("Hello, I am a developer.");
			await textarea.blur(); // Trigger change event

			await expect(page.locator("#debug-state")).toContainText(
				'"bio": "Hello, I am a developer."',
			);
		});

		test("text_area has configured height", async ({ page }) => {
			await gotoAndWait(page);

			const textarea = page.locator("#bio_textarea");
			await expect(textarea).toHaveCSS("height", "100px");
		});
	});

	test.describe("Toggle", () => {
		test("toggle shows default unchecked state", async ({ page }) => {
			await gotoAndWait(page);

			const toggle = page.locator("#darkmode_toggle");
			await expect(toggle).not.toBeChecked();
			await expect(page.locator("#debug-state")).toContainText('"darkMode": false');
		});

		test("toggle shows default checked state when defaultValue is true", async ({ page }) => {
			await gotoAndWait(page);

			const toggle = page.locator("#autosave_toggle");
			await expect(toggle).toBeChecked();
			await expect(page.locator("#debug-state")).toContainText('"autoSave": true');
		});

		test("toggle click toggles value and updates debug state", async ({ page }) => {
			await gotoAndWait(page);

			const toggle = page.locator("#darkmode_toggle");

			// Initially unchecked
			await expect(toggle).not.toBeChecked();

			// Click to enable
			await toggle.click();
			await expect(toggle).toBeChecked();
			await expect(page.locator("#debug-state")).toContainText('"darkMode": true');

			// Click to disable
			await toggle.click();
			await expect(toggle).not.toBeChecked();
			await expect(page.locator("#debug-state")).toContainText('"darkMode": false');
		});
	});

	test.describe("Multiselect", () => {
		test("multiselect shows empty array by default", async ({ page }) => {
			await gotoAndWait(page);

			await expect(page.locator("#debug-state")).toContainText('"tags": []');
		});

		test("multiselect allows selecting multiple options", async ({ page }) => {
			await gotoAndWait(page);

			// Select JavaScript
			const jsCheckbox = page.locator(
				'#tags_multiselect input[type="checkbox"][value="JavaScript"]',
			);
			await jsCheckbox.click();
			await expect(jsCheckbox).toBeChecked();

			// Select TypeScript
			const tsCheckbox = page.locator(
				'#tags_multiselect input[type="checkbox"][value="TypeScript"]',
			);
			await tsCheckbox.click();
			await expect(tsCheckbox).toBeChecked();

			// Check debug state contains both values
			await expect(page.locator("#debug-state")).toContainText('"JavaScript"');
			await expect(page.locator("#debug-state")).toContainText('"TypeScript"');
		});

		test("multiselect allows deselecting options", async ({ page }) => {
			await gotoAndWait(page);

			// Select JavaScript
			const jsCheckbox = page.locator(
				'#tags_multiselect input[type="checkbox"][value="JavaScript"]',
			);
			await jsCheckbox.click();
			await expect(jsCheckbox).toBeChecked();

			// Deselect JavaScript
			await jsCheckbox.click();
			await expect(jsCheckbox).not.toBeChecked();

			// Check debug state is empty
			await expect(page.locator("#debug-state")).toContainText('"tags": []');
		});
	});
});
