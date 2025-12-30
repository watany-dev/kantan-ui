import { defineConfig, devices } from "@playwright/test";

// ローカル開発環境でキャッシュ済みのChromiumを使用
const chromiumPath = process.env.CI
	? undefined
	: "/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "html",
	use: {
		baseURL: "http://localhost:3000",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				launchOptions: {
					executablePath: chromiumPath,
				},
			},
		},
	],
	webServer: {
		command: "bun run dev",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
	},
});
