import { describe, expect, it } from "vitest";
import { requestRerun } from "../../../src/kt/control";
import { RerunException } from "../../../src/runtime/rerun-exception";

describe("kt.rerun", () => {
	describe("requestRerun", () => {
		it("should throw RerunException", () => {
			expect(() => requestRerun()).toThrow(RerunException);
		});

		it("should throw RerunException with default message", () => {
			try {
				requestRerun();
			} catch (e) {
				expect(e).toBeInstanceOf(RerunException);
				expect((e as RerunException).message).toBe("Rerun requested");
			}
		});

		it("should have never return type", () => {
			// This test verifies the function signature
			// If it returns, it would be a compile error
			const fn = requestRerun;
			// @ts-expect-error - requestRerun never returns
			expect(() => fn()).toThrow();
		});
	});
});
