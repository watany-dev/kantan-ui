import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		exclude: ["node_modules", "dist", "e2e"],
		environment: "node",
		coverage: {
			provider: "istanbul",
			reporter: ["text", "json", "html"],
			exclude: ["node_modules", "dist", "e2e", "tests", "*.config.ts"],
			thresholds: {
				lines: 95,
				functions: 95,
				branches: 95,
				statements: 95,
			},
		},
	},
});
