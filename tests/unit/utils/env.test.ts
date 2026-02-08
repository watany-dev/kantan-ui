import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEnvVar } from "../../../src/utils/env";

vi.mock("hono/adapter", async (importOriginal) => {
	const original = await importOriginal<typeof import("hono/adapter")>();
	return {
		...original,
		getRuntimeKey: vi.fn(original.getRuntimeKey),
	};
});

import { getRuntimeKey } from "hono/adapter";

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

	describe("Cloudflare Workers runtime", () => {
		beforeEach(() => {
			vi.mocked(getRuntimeKey).mockReturnValue("workerd");
		});

		afterEach(() => {
			vi.mocked(getRuntimeKey).mockRestore();
		});

		it("returns undefined for any key in workerd runtime", () => {
			expect(getEnvVar("PATH")).toBeUndefined();
			expect(getEnvVar("HOME")).toBeUndefined();
			expect(getEnvVar("CI")).toBeUndefined();
		});
	});
});
