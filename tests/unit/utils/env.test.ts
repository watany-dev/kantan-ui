import { describe, expect, it } from "vitest";
import { getEnvVar } from "../../../src/utils/env";

describe("getEnvVar", () => {
	it("returns the value of an existing environment variable", () => {
		// PATH is available in virtually all environments
		const result = getEnvVar("PATH");
		expect(result).toBeDefined();
		expect(typeof result).toBe("string");
	});

	it("returns undefined for a non-existent environment variable", () => {
		const result = getEnvVar("__KANTAN_UI_NONEXISTENT_VAR__");
		expect(result).toBeUndefined();
	});

	it("returns correct value for a known variable", () => {
		// Set a test variable via process.env (works in Node.js/Bun test runners)
		process.env["__KANTAN_UI_TEST_VAR__"] = "test_value";
		try {
			const result = getEnvVar("__KANTAN_UI_TEST_VAR__");
			expect(result).toBe("test_value");
		} finally {
			delete process.env["__KANTAN_UI_TEST_VAR__"];
		}
	});
});
