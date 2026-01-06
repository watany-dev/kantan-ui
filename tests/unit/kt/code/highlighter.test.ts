import { describe, expect, it } from "vitest";
import { applyHighlight } from "../../../../src/kt/code/highlighter";

describe("applyHighlight", () => {
	describe("typescript/javascript", () => {
		it("should highlight keywords", () => {
			const result = applyHighlight("const x = 1;", "typescript");
			expect(result).toContain('class="kt-code-keyword"');
			expect(result).toContain("const");
		});

		it("should highlight multiple keywords", () => {
			const result = applyHighlight("if (true) { return false; }", "typescript");
			expect(result).toContain('class="kt-code-keyword"');
		});

		it("should highlight strings with double quotes", () => {
			const result = applyHighlight('"hello"', "typescript");
			expect(result).toContain('class="kt-code-string"');
		});

		it("should highlight strings with single quotes", () => {
			const result = applyHighlight("'hello'", "typescript");
			expect(result).toContain('class="kt-code-string"');
		});

		it("should highlight template literals", () => {
			const result = applyHighlight("`template`", "typescript");
			expect(result).toContain('class="kt-code-string"');
		});

		it("should highlight single-line comments", () => {
			const result = applyHighlight("// comment", "typescript");
			expect(result).toContain('class="kt-code-comment"');
		});

		it("should highlight numbers", () => {
			const result = applyHighlight("42", "typescript");
			expect(result).toContain('class="kt-code-number"');
		});

		it("should work with javascript alias", () => {
			const result = applyHighlight("const x = 1;", "javascript");
			expect(result).toContain('class="kt-code-keyword"');
		});

		it("should work with js alias", () => {
			const result = applyHighlight("const x = 1;", "js");
			expect(result).toContain('class="kt-code-keyword"');
		});

		it("should work with ts alias", () => {
			const result = applyHighlight("const x = 1;", "ts");
			expect(result).toContain('class="kt-code-keyword"');
		});
	});

	describe("python", () => {
		it("should highlight python keywords", () => {
			const result = applyHighlight("def foo():", "python");
			expect(result).toContain('class="kt-code-keyword"');
			expect(result).toContain("def");
		});

		it("should highlight python comments", () => {
			const result = applyHighlight("# comment", "python");
			expect(result).toContain('class="kt-code-comment"');
		});

		it("should work with py alias", () => {
			const result = applyHighlight("def foo():", "py");
			expect(result).toContain('class="kt-code-keyword"');
		});
	});

	describe("json", () => {
		it("should highlight json strings", () => {
			const result = applyHighlight('{"key": "value"}', "json");
			expect(result).toContain('class="kt-code-string"');
		});

		it("should highlight json numbers", () => {
			const result = applyHighlight('{"num": 42}', "json");
			expect(result).toContain('class="kt-code-number"');
		});

		it("should highlight json booleans", () => {
			const result = applyHighlight('{"bool": true}', "json");
			expect(result).toContain('class="kt-code-keyword"');
		});

		it("should highlight json null", () => {
			const result = applyHighlight('{"nil": null}', "json");
			expect(result).toContain('class="kt-code-keyword"');
		});
	});

	describe("bash/shell", () => {
		it("should highlight bash comments", () => {
			const result = applyHighlight("# comment", "bash");
			expect(result).toContain('class="kt-code-comment"');
		});

		it("should highlight bash keywords", () => {
			const result = applyHighlight("if [ -f file ]; then echo ok; fi", "bash");
			expect(result).toContain('class="kt-code-keyword"');
		});

		it("should work with shell alias", () => {
			const result = applyHighlight("echo hello", "shell");
			expect(result).toContain('class="kt-code-keyword"');
		});

		it("should work with sh alias", () => {
			const result = applyHighlight("echo hello", "sh");
			expect(result).toContain('class="kt-code-keyword"');
		});
	});

	describe("unknown language", () => {
		it("should return unmodified code for unknown language", () => {
			const result = applyHighlight("code here", "unknown");
			expect(result).toBe("code here");
		});

		it("should return unmodified code for empty language", () => {
			const result = applyHighlight("code here", "");
			expect(result).toBe("code here");
		});
	});

	describe("edge cases", () => {
		it("should handle empty string", () => {
			const result = applyHighlight("", "typescript");
			expect(result).toBe("");
		});

		it("should handle multiline code", () => {
			const result = applyHighlight("const x = 1;\nconst y = 2;", "typescript");
			expect(result).toContain("const");
			expect(result).toContain("\n");
		});

		it("should not double-escape HTML entities", () => {
			// Input is already escaped
			const result = applyHighlight("&lt;div&gt;", "typescript");
			expect(result).toContain("&lt;div&gt;");
			expect(result).not.toContain("&amp;lt;");
		});
	});
});
