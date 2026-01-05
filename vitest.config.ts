import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		exclude: ["node_modules", "dist", "e2e", "tests/unit/app.test.ts"],
		environment: "node",
		coverage: {
			provider: "istanbul",
			reporter: ["text", "json", "html"],
			reportsDirectory: "./coverage",
			include: ["src/**/*.ts"],
			exclude: [
				"node_modules",
				"dist",
				"e2e",
				"tests",
				"*.config.ts",
				"src/server.ts",
				"src/server-browser.ts",
				"src/server-streaming.ts",
				"src/server-patch-test.ts",
				"src/server-error-test.ts",
				"src/app.ts",
				"src/websocket/handler.ts",
				"src/client/script.ts", // クライアント生成スクリプト（E2Eでテスト）
				"src/**/index.ts",
				"src/**/types.ts",
			],
			thresholds: {
				lines: 95,
				functions: 95,
				branches: 94,
				statements: 95,
			},
		},
	},
});
