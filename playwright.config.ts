import { defineConfig, devices } from "@playwright/test";

// ローカル開発環境でキャッシュ済みのChromiumを使用
const chromiumPath = process.env.CI
	? undefined
	: "/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
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
		command: "bun run src/server.ts",
		url: "http://localhost:3000",
		reuseExistingServer: false,
	},
});
