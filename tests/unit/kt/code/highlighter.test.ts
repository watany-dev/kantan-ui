import { describe, expect, it } from "vitest";
import { applyHighlight } from "../../../../src/kt/code/highlighter";

describe("applyHighlight", () => {
	describe("typescript/javascript", () => {
		it("should highlight keywords", () => {
			const result = applyHighlight("const x = 1;", "typescript");
			expect(result).toContain('class="kt-hl-keyword"');
			expect(result).toContain("const");
		});

		it("should highlight multiple keywords", () => {
			const result = applyHighlight("if (true) { return false; }", "typescript");
			expect(result).toContain('class="kt-hl-keyword"');
		});

		it("should highlight strings with double quotes", () => {
			const result = applyHighlight('"hello"', "typescript");
			expect(result).toContain('class="kt-hl-string"');
		});

		it("should highlight strings with single quotes", () => {
			const result = applyHighlight("'hello'", "typescript");
			expect(result).toContain('class="kt-hl-string"');
		});

		it("should highlight template literals", () => {
			const result = applyHighlight("`template`", "typescript");
			expect(result).toContain('class="kt-hl-string"');
		});

		it("should highlight single-line comments", () => {
			const result = applyHighlight("// comment", "typescript");
			expect(result).toContain('class="kt-hl-comment"');
		});

		it("should highlight numbers", () => {
			const result = applyHighlight("42", "typescript");
			expect(result).toContain('class="kt-hl-number"');
		});

		it("should work with javascript alias", () => {
			const result = applyHighlight("const x = 1;", "javascript");
			expect(result).toContain('class="kt-hl-keyword"');
		});

		it("should work with js alias", () => {
			const result = applyHighlight("const x = 1;", "js");
			expect(result).toContain('class="kt-hl-keyword"');
		});

		it("should work with ts alias", () => {
			const result = applyHighlight("const x = 1;", "ts");
			expect(result).toContain('class="kt-hl-keyword"');
		});
	});

	describe("python", () => {
		it("should highlight python keywords", () => {
			const result = applyHighlight("def foo():", "python");
			expect(result).toContain('class="kt-hl-keyword"');
			expect(result).toContain("def");
		});

		it("should highlight python comments", () => {
			const result = applyHighlight("# comment", "python");
			expect(result).toContain('class="kt-hl-comment"');
		});

		it("should work with py alias", () => {
			const result = applyHighlight("def foo():", "py");
			expect(result).toContain('class="kt-hl-keyword"');
		});
	});

	describe("json", () => {
		it("should highlight json strings", () => {
			const result = applyHighlight('{"key": "value"}', "json");
			expect(result).toContain('class="kt-hl-string"');
		});

		it("should highlight json numbers", () => {
			const result = applyHighlight('{"num": 42}', "json");
			expect(result).toContain('class="kt-hl-number"');
		});

		it("should highlight json booleans", () => {
			const result = applyHighlight('{"bool": true}', "json");
			expect(result).toContain('class="kt-hl-keyword"');
		});

		it("should highlight json null", () => {
			const result = applyHighlight('{"nil": null}', "json");
			expect(result).toContain('class="kt-hl-keyword"');
		});
	});

	describe("bash/shell", () => {
		it("should highlight bash comments", () => {
			const result = applyHighlight("# comment", "bash");
			expect(result).toContain('class="kt-hl-comment"');
		});

		it("should highlight bash keywords", () => {
			const result = applyHighlight("if [ -f file ]; then echo ok; fi", "bash");
			expect(result).toContain('class="kt-hl-keyword"');
		});

		it("should work with shell alias", () => {
			const result = applyHighlight("echo hello", "shell");
			expect(result).toContain('class="kt-hl-keyword"');
		});

		it("should work with sh alias", () => {
			const result = applyHighlight("echo hello", "sh");
			expect(result).toContain('class="kt-hl-keyword"');
		});
	});

	describe("sql", () => {
		it("should highlight sql keywords", () => {
			const result = applyHighlight("SELECT * FROM users", "sql");
			expect(result).toContain('class="kt-hl-keyword"');
			expect(result).toContain("SELECT");
		});

		it("should highlight sql keywords case-insensitively", () => {
			const result = applyHighlight("select * from users", "sql");
			expect(result).toContain('class="kt-hl-keyword"');
		});

		it("should highlight sql comments", () => {
			const result = applyHighlight("-- comment", "sql");
			expect(result).toContain('class="kt-hl-comment"');
		});

		it("should highlight sql strings", () => {
			const result = applyHighlight("WHERE name = 'John'", "sql");
			expect(result).toContain('class="kt-hl-string"');
		});
	});

	describe("go", () => {
		it("should highlight go keywords", () => {
			const result = applyHighlight("func main() {}", "go");
			expect(result).toContain('class="kt-hl-keyword"');
			expect(result).toContain("func");
		});

		it("should highlight go built-in types", () => {
			const result = applyHighlight("var x int = 42", "go");
			expect(result).toContain('class="kt-hl-keyword"');
		});

		it("should highlight go comments", () => {
			const result = applyHighlight("// comment", "go");
			expect(result).toContain('class="kt-hl-comment"');
		});

		it("should highlight go strings", () => {
			const result = applyHighlight('"hello"', "go");
			expect(result).toContain('class="kt-hl-string"');
		});

		it("should highlight go raw strings", () => {
			const result = applyHighlight("`raw string`", "go");
			expect(result).toContain('class="kt-hl-string"');
		});

		it("should work with golang alias", () => {
			const result = applyHighlight("func main() {}", "golang");
			expect(result).toContain('class="kt-hl-keyword"');
		});
	});

	describe("rust", () => {
		it("should highlight rust keywords", () => {
			const result = applyHighlight("fn main() {}", "rust");
			expect(result).toContain('class="kt-hl-keyword"');
			expect(result).toContain("fn");
		});

		it("should highlight rust built-in types", () => {
			const result = applyHighlight("let x: i32 = 42;", "rust");
			expect(result).toContain('class="kt-hl-keyword"');
		});

		it("should highlight rust comments", () => {
			const result = applyHighlight("// comment", "rust");
			expect(result).toContain('class="kt-hl-comment"');
		});

		it("should highlight rust strings", () => {
			const result = applyHighlight('"hello"', "rust");
			expect(result).toContain('class="kt-hl-string"');
		});

		it("should highlight rust macros", () => {
			const result = applyHighlight("println!", "rust");
			expect(result).toContain('class="kt-hl-function"');
		});

		it("should work with rs alias", () => {
			const result = applyHighlight("fn main() {}", "rs");
			expect(result).toContain('class="kt-hl-keyword"');
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
