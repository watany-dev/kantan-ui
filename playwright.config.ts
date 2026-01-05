import { defineConfig, devices } from "@playwright/test";

// ローカル開発環境でキャッシュ済みのChromiumを使用
const chromiumPath = "/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true, // 全テストを並列実行（各テストは独立したブラウザコンテキスト）
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 3, // 3プロジェクトを並列実行（各プロジェクトは別サーバー/ポート）
	reporter: "html",
	/* タイムアウト設定の一元管理 */
	timeout: 30000, // テスト全体のタイムアウト
	expect: {
		timeout: 5000, // 条件ベース待機により短縮可能
	},
	use: {
		trace: "on-first-retry",
		actionTimeout: 5000, // クリック等のアクション
		navigationTimeout: 15000, // ページ遷移
		/* 失敗時のデバッグ情報 */
		video: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				baseURL: "http://localhost:3000",
				launchOptions: process.env.CI
					? {
							// CI環境でのブラウザ安定化オプション
							args: ["--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage"],
						}
					: {
							// ローカル環境ではキャッシュ済みのChromiumを使用
							executablePath: chromiumPath,
						},
			},
			testIgnore: [
				"**/session-scope-browser.spec.ts",
				"**/streaming.spec.ts",
				"**/patch-operations.spec.ts",
				"**/error-handling.spec.ts",
			],
		},
		{
			name: "chromium-browser-scope",
			use: {
				...devices["Desktop Chrome"],
				baseURL: "http://localhost:3001",
				launchOptions: process.env.CI
					? {
							args: ["--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage"],
						}
					: {
							executablePath: chromiumPath,
						},
			},
			testMatch: "**/session-scope-browser.spec.ts",
		},
		{
			name: "chromium-streaming",
			use: {
				...devices["Desktop Chrome"],
				baseURL: "http://localhost:3002",
				launchOptions: process.env.CI
					? {
							args: ["--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage"],
						}
					: {
							executablePath: chromiumPath,
						},
			},
			testMatch: "**/streaming.spec.ts",
		},
		{
			name: "chromium-patch-test",
			use: {
				...devices["Desktop Chrome"],
				baseURL: "http://localhost:3003",
				launchOptions: process.env.CI
					? {
							args: ["--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage"],
						}
					: {
							executablePath: chromiumPath,
						},
			},
			testMatch: "**/patch-operations.spec.ts",
		},
		{
			name: "chromium-error-test",
			use: {
				...devices["Desktop Chrome"],
				baseURL: "http://localhost:3004",
				launchOptions: process.env.CI
					? {
							args: ["--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage"],
						}
					: {
							executablePath: chromiumPath,
						},
			},
			testMatch: "**/error-handling.spec.ts",
		},
	],
	webServer: [
		{
			command: "bun run src/server.ts",
			url: "http://localhost:3000",
			reuseExistingServer: !process.env.CI,
			timeout: 30000, // Bunは高速起動のため30秒で十分
			stdout: "pipe",
			stderr: "pipe",
		},
		{
			command: "bun run src/server-browser.ts",
			url: "http://localhost:3001",
			reuseExistingServer: !process.env.CI,
			timeout: 30000,
			stdout: "pipe",
			stderr: "pipe",
		},
		{
			command: "bun run src/server-streaming.ts",
			url: "http://localhost:3002",
			reuseExistingServer: !process.env.CI,
			timeout: 30000,
			stdout: "pipe",
			stderr: "pipe",
		},
		{
			command: "bun run src/server-patch-test.ts",
			url: "http://localhost:3003",
			reuseExistingServer: !process.env.CI,
			timeout: 60000,
			stdout: "pipe",
			stderr: "pipe",
		},
		{
			command: "bun run src/server-error-test.ts",
			url: "http://localhost:3004",
			reuseExistingServer: !process.env.CI,
			timeout: 60000,
			stdout: "pipe",
			stderr: "pipe",
		},
	],
});
