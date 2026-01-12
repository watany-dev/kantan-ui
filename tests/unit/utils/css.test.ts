import { describe, expect, it } from "vitest";
import { sanitizeCssColor, sanitizeCssLength, sanitizeCssValue } from "../../../src/utils/css";

describe("sanitizeCssValue", () => {
	it("returns empty string for empty input", () => {
		expect(sanitizeCssValue("")).toBe("");
	});

	it("returns empty string for non-string input", () => {
		// @ts-expect-error - testing invalid input
		expect(sanitizeCssValue(null)).toBe("");
		// @ts-expect-error - testing invalid input
		expect(sanitizeCssValue(undefined)).toBe("");
		// @ts-expect-error - testing invalid input
		expect(sanitizeCssValue(123)).toBe("");
	});

	it("removes semicolons", () => {
		expect(sanitizeCssValue("100px; background: red")).toBe("100px");
	});

	it("removes curly braces", () => {
		expect(sanitizeCssValue("red}")).toBe("red");
		expect(sanitizeCssValue("red{")).toBe("red");
	});

	it("removes url() patterns", () => {
		expect(sanitizeCssValue("url('http://evil.com')")).toBe("");
		expect(sanitizeCssValue("url(http://evil.com)")).toBe("");
	});

	it("removes expression() patterns", () => {
		expect(sanitizeCssValue("expression(alert(1))")).toBe("");
	});

	it("preserves safe values", () => {
		expect(sanitizeCssValue("100px")).toBe("100px");
		expect(sanitizeCssValue("1.5rem")).toBe("1.5rem");
		expect(sanitizeCssValue("#ff0000")).toBe("#ff0000");
		expect(sanitizeCssValue("rgb(255, 0, 0)")).toBe("rgb(255, 0, 0)");
	});

	it("trims whitespace", () => {
		expect(sanitizeCssValue("  100px  ")).toBe("100px");
	});
});

describe("sanitizeCssLength", () => {
	it("accepts valid pixel values", () => {
		expect(sanitizeCssLength("100px")).toBe("100px");
		expect(sanitizeCssLength("0px")).toBe("0px");
		expect(sanitizeCssLength("1.5px")).toBe("1.5px");
	});

	it("accepts valid rem/em values", () => {
		expect(sanitizeCssLength("1rem")).toBe("1rem");
		expect(sanitizeCssLength("1.5rem")).toBe("1.5rem");
		expect(sanitizeCssLength("2em")).toBe("2em");
	});

	it("accepts percentage values", () => {
		expect(sanitizeCssLength("50%")).toBe("50%");
		expect(sanitizeCssLength("100%")).toBe("100%");
	});

	it("accepts viewport units", () => {
		expect(sanitizeCssLength("100vh")).toBe("100vh");
		expect(sanitizeCssLength("50vw")).toBe("50vw");
	});

	it("accepts zero without unit", () => {
		expect(sanitizeCssLength("0")).toBe("0");
	});

	it("accepts auto and inherit", () => {
		expect(sanitizeCssLength("auto")).toBe("auto");
		expect(sanitizeCssLength("inherit")).toBe("inherit");
	});

	it("removes dangerous patterns and returns empty on invalid", () => {
		expect(sanitizeCssLength("100px; background: red")).toBe("100px");
		expect(sanitizeCssLength("url('evil.com')")).toBe("");
		expect(sanitizeCssLength("expression(alert(1))")).toBe("");
	});

	it("returns empty string for completely invalid values", () => {
		expect(sanitizeCssLength("javascript:alert(1)")).toBe("");
		expect(sanitizeCssLength("<script>")).toBe("");
	});

	it("returns empty string for values not matching length patterns", () => {
		expect(sanitizeCssLength("invalid")).toBe("");
		expect(sanitizeCssLength("abc123")).toBe("");
		expect(sanitizeCssLength("not-a-length")).toBe("");
	});
});

describe("sanitizeCssColor", () => {
	it("accepts hex colors", () => {
		expect(sanitizeCssColor("#fff")).toBe("#fff");
		expect(sanitizeCssColor("#ffffff")).toBe("#ffffff");
		expect(sanitizeCssColor("#FF0000")).toBe("#FF0000");
		expect(sanitizeCssColor("#f0f0f0")).toBe("#f0f0f0");
	});

	it("accepts rgb/rgba colors", () => {
		expect(sanitizeCssColor("rgb(255, 0, 0)")).toBe("rgb(255, 0, 0)");
		expect(sanitizeCssColor("rgba(255, 0, 0, 0.5)")).toBe("rgba(255, 0, 0, 0.5)");
		expect(sanitizeCssColor("rgb(0,0,0)")).toBe("rgb(0,0,0)");
	});

	it("accepts hsl/hsla colors", () => {
		expect(sanitizeCssColor("hsl(120, 100%, 50%)")).toBe("hsl(120, 100%, 50%)");
		expect(sanitizeCssColor("hsla(120, 100%, 50%, 0.5)")).toBe("hsla(120, 100%, 50%, 0.5)");
	});

	it("accepts named colors", () => {
		expect(sanitizeCssColor("red")).toBe("red");
		expect(sanitizeCssColor("blue")).toBe("blue");
		expect(sanitizeCssColor("transparent")).toBe("transparent");
	});

	it("removes dangerous patterns", () => {
		expect(sanitizeCssColor("red; } .x {")).toBe("red");
		expect(sanitizeCssColor("url('evil')")).toBe("");
		expect(sanitizeCssColor("expression(alert(1))")).toBe("");
	});

	it("returns empty string for invalid colors", () => {
		expect(sanitizeCssColor("javascript:alert(1)")).toBe("");
		expect(sanitizeCssColor("<script>")).toBe("");
	});

	it("accepts inherit and currentColor", () => {
		expect(sanitizeCssColor("inherit")).toBe("inherit");
		expect(sanitizeCssColor("currentColor")).toBe("currentColor");
	});

	it("returns empty string for values not matching color patterns", () => {
		expect(sanitizeCssColor("invalid-color")).toBe("");
		expect(sanitizeCssColor("123abc")).toBe("");
		expect(sanitizeCssColor("notacolor")).toBe("");
	});
});
