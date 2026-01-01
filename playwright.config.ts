import { defineConfig, devices } from "@playwright/test";

// ローカル開発環境でキャッシュ済みのChromiumを使用
const chromiumPath = "/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: "html",
	/* タイムアウト設定の一元管理 */
	timeout: 30000, // テスト全体のタイムアウト
	expect: {
		timeout: 10000, // WebSocket経由のUI更新を待つため長めに設定
	},
	use: {
		baseURL: "http://localhost:3000",
		trace: "on-first-retry",
		actionTimeout: 5000, // クリック等のアクション
		navigationTimeout: 15000, // ページ遷移
	},
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				// CI環境ではlaunchOptionsを省略してPlaywrightのデフォルトブラウザを使用
				...(process.env.CI
					? {}
					: {
							launchOptions: {
								executablePath: chromiumPath,
							},
						}),
			},
		},
	],
	webServer: {
		command: "bun run src/server.ts",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
	},
});
