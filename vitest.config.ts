import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		exclude: ["node_modules", "dist", "e2e"],
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
				"src/app.ts",
				"src/websocket/handler.ts",
				"src/**/index.ts",
				"src/**/types.ts",
			],
			thresholds: {
				lines: 95,
				functions: 95,
				branches: 94,
				statements: 95,
				// parser.tsには到達困難な防御的コード（タイムアウト、型ガード）が含まれる
				"src/diff/parser.ts": {
					branches: 80,
				},
			},
		},
	},
});
