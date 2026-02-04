import { describe, expect, it } from "vitest";
import {
	buildAttributes,
	buildClassAttr,
	buildStyleAttr,
	containsUnsafeHtml,
	escapeHtml,
} from "../../../src/utils/html";

describe("buildAttributes", () => {
	it("should build simple attributes", () => {
		expect(buildAttributes({ id: "test", name: "myName" })).toBe(' id="test" name="myName"');
	});

	it("should handle boolean true as attribute without value", () => {
		expect(buildAttributes({ disabled: true, readonly: true })).toBe(" disabled readonly");
	});

	it("should exclude boolean false attributes", () => {
		expect(buildAttributes({ disabled: false, id: "test" })).toBe(' id="test"');
	});

	it("should exclude undefined/null attributes", () => {
		expect(buildAttributes({ id: "test", name: undefined, title: null })).toBe(' id="test"');
	});

	it("should handle numeric values", () => {
		expect(buildAttributes({ tabindex: 0, maxlength: 100 })).toBe(' tabindex="0" maxlength="100"');
	});

	it("should escape special characters in values", () => {
		expect(buildAttributes({ title: '<script>alert("xss")</script>' })).toBe(
			' title="&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"',
		);
	});

	it("should return empty string for empty object", () => {
		expect(buildAttributes({})).toBe("");
	});

	it("should return empty string when all values are excluded", () => {
		expect(buildAttributes({ a: undefined, b: false, c: null })).toBe("");
	});
});

describe("buildStyleAttr", () => {
	it("should build style attribute", () => {
		expect(buildStyleAttr({ color: "red", "font-size": "14px" })).toBe(
			'style="color: red; font-size: 14px"',
		);
	});

	it("should handle numeric values", () => {
		expect(buildStyleAttr({ "z-index": 100, opacity: 0.5 })).toBe(
			'style="z-index: 100; opacity: 0.5"',
		);
	});

	it("should exclude undefined/null/empty values", () => {
		expect(buildStyleAttr({ color: "red", background: undefined, border: null, margin: "" })).toBe(
			'style="color: red"',
		);
	});

	it("should return empty string for empty object", () => {
		expect(buildStyleAttr({})).toBe("");
	});

	it("should return empty string when all values are excluded", () => {
		expect(buildStyleAttr({ a: undefined, b: null, c: "" })).toBe("");
	});

	describe("security: CSS injection prevention", () => {
		it("should sanitize CSS values with injection attempts", () => {
			const result = buildStyleAttr({
				color: "red; background: url('http://evil.com')",
			});
			// セミコロン以降が除去される
			expect(result).not.toContain("url(");
			expect(result).not.toContain("evil.com");
			expect(result).toContain("color: red");
		});

		it("should reject url() in CSS values", () => {
			const result = buildStyleAttr({
				background: "url('http://evil.com')",
			});
			// url()は空文字列になる
			expect(result).not.toContain("url(");
		});

		it("should reject expression() in CSS values", () => {
			const result = buildStyleAttr({
				background: "expression(alert(1))",
			});
			expect(result).not.toContain("expression");
		});

		it("should pass through numeric values safely", () => {
			const result = buildStyleAttr({
				"z-index": 100,
				opacity: 0.5,
			});
			expect(result).toBe('style="z-index: 100; opacity: 0.5"');
		});

		it("should reject HTML tags in CSS values", () => {
			const result = buildStyleAttr({
				color: "<div>injected</div>",
			});
			expect(result).toBe("");
		});

		it("should reject javascript: protocol in CSS values", () => {
			const result = buildStyleAttr({
				background: "javascript:alert(1)",
			});
			expect(result).toBe("");
		});

		it("should reject vbscript: protocol in CSS values", () => {
			const result = buildStyleAttr({
				background: "vbscript:msgbox(1)",
			});
			expect(result).toBe("");
		});
	});
});

describe("buildClassAttr", () => {
	it("should build class attribute", () => {
		expect(buildClassAttr(["btn", "btn-primary"])).toBe('class="btn btn-primary"');
	});

	it("should exclude false/undefined/null values", () => {
		expect(buildClassAttr(["btn", false, "active", undefined, null])).toBe('class="btn active"');
	});

	it("should exclude empty strings", () => {
		expect(buildClassAttr(["btn", "", "active"])).toBe('class="btn active"');
	});

	it("should return empty string for empty array", () => {
		expect(buildClassAttr([])).toBe("");
	});

	it("should return empty string when all values are excluded", () => {
		expect(buildClassAttr([false, undefined, null, ""])).toBe("");
	});

	it("should handle conditional classes", () => {
		const isActive = true;
		const isDisabled = false;
		expect(buildClassAttr(["btn", isActive && "active", isDisabled && "disabled"])).toBe(
			'class="btn active"',
		);
	});
});

describe("escapeHtml", () => {
	describe("XSS prevention", () => {
		it("should escape script tags", () => {
			const malicious = "<script>alert('xss')</script>";
			const escaped = escapeHtml(malicious);

			expect(escaped).not.toContain("<script>");
			expect(escaped).not.toContain("</script>");
			expect(escaped).toBe("&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;");
		});

		it("should escape javascript: protocol", () => {
			const malicious = 'javascript:alert("xss")';
			const escaped = escapeHtml(malicious);

			expect(escaped).toBe("javascript:alert(&quot;xss&quot;)");
		});

		it("should escape event handlers in attributes", () => {
			const malicious = '" onclick="alert(\'xss\')"';
			const escaped = escapeHtml(malicious);

			expect(escaped).not.toContain('"');
			expect(escaped).toBe("&quot; onclick=&quot;alert(&#039;xss&#039;)&quot;");
		});

		it("should escape img onerror attack", () => {
			const malicious = '<img src="x" onerror="alert(\'xss\')">';
			const escaped = escapeHtml(malicious);

			expect(escaped).not.toContain("<img");
			expect(escaped).toBe(
				"&lt;img src=&quot;x&quot; onerror=&quot;alert(&#039;xss&#039;)&quot;&gt;",
			);
		});

		it("should escape SVG-based XSS", () => {
			const malicious = "<svg onload=\"alert('xss')\">";
			const escaped = escapeHtml(malicious);

			expect(escaped).not.toContain("<svg");
			expect(escaped).toBe("&lt;svg onload=&quot;alert(&#039;xss&#039;)&quot;&gt;");
		});

		it("should escape nested script attempts", () => {
			const malicious = "<<script>script>alert('xss')<</script>/script>";
			const escaped = escapeHtml(malicious);

			expect(escaped).not.toContain("<script>");
		});
	});

	describe("basic escaping", () => {
		it("should escape ampersand", () => {
			expect(escapeHtml("foo & bar")).toBe("foo &amp; bar");
		});

		it("should escape less than", () => {
			expect(escapeHtml("a < b")).toBe("a &lt; b");
		});

		it("should escape greater than", () => {
			expect(escapeHtml("a > b")).toBe("a &gt; b");
		});

		it("should escape double quotes", () => {
			expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;");
		});

		it("should escape single quotes", () => {
			expect(escapeHtml("it's")).toBe("it&#039;s");
		});

		it("should handle empty string", () => {
			expect(escapeHtml("")).toBe("");
		});

		it("should not modify safe strings", () => {
			expect(escapeHtml("Hello World")).toBe("Hello World");
			expect(escapeHtml("12345")).toBe("12345");
		});

		it("should escape multiple special characters", () => {
			expect(escapeHtml('<div class="test">&</div>')).toBe(
				"&lt;div class=&quot;test&quot;&gt;&amp;&lt;/div&gt;",
			);
		});
	});
});

describe("containsUnsafeHtml", () => {
	describe("safe HTML detection", () => {
		it("should return false for safe HTML", () => {
			expect(containsUnsafeHtml("<div>Hello</div>")).toBe(false);
			expect(containsUnsafeHtml("<span class='test'>World</span>")).toBe(false);
			expect(containsUnsafeHtml("<button id='btn'>Click</button>")).toBe(false);
		});

		it("should return false for text without HTML", () => {
			expect(containsUnsafeHtml("Hello World")).toBe(false);
			expect(containsUnsafeHtml("Test 123")).toBe(false);
		});

		it("should return false for escaped HTML", () => {
			expect(containsUnsafeHtml("&lt;script&gt;alert(1)&lt;/script&gt;")).toBe(false);
		});
	});

	describe("script tag detection", () => {
		it("should detect basic script tag", () => {
			expect(containsUnsafeHtml("<script>alert(1)</script>")).toBe(true);
		});

		it("should detect script tag with attributes", () => {
			expect(containsUnsafeHtml('<script src="evil.js"></script>')).toBe(true);
		});

		it("should detect script tag with whitespace", () => {
			expect(containsUnsafeHtml("<script \n>alert(1)</script>")).toBe(true);
		});

		it("should detect script tag case-insensitively", () => {
			expect(containsUnsafeHtml("<SCRIPT>alert(1)</SCRIPT>")).toBe(true);
			expect(containsUnsafeHtml("<ScRiPt>alert(1)</ScRiPt>")).toBe(true);
		});
	});

	describe("javascript: URL detection", () => {
		it("should detect javascript: URL", () => {
			expect(containsUnsafeHtml('<a href="javascript:alert(1)">click</a>')).toBe(true);
		});

		it("should detect javascript: URL with space", () => {
			expect(containsUnsafeHtml('<a href="javascript :alert(1)">click</a>')).toBe(true);
		});

		it("should detect javascript: URL case-insensitively", () => {
			expect(containsUnsafeHtml('<a href="JAVASCRIPT:alert(1)">click</a>')).toBe(true);
		});
	});

	describe("vbscript: URL detection", () => {
		it("should detect vbscript: URL", () => {
			expect(containsUnsafeHtml('<a href="vbscript:msgbox(1)">click</a>')).toBe(true);
		});
	});

	describe("data: URL detection", () => {
		it("should detect data: URL with base64", () => {
			expect(containsUnsafeHtml('<a href="data:text/html;base64,PHNjcmlwdD4=">click</a>')).toBe(
				true,
			);
		});

		it("should not flag regular data URLs without base64", () => {
			expect(containsUnsafeHtml('<img src="data:image/png,abc">')).toBe(false);
		});
	});

	describe("event handler detection", () => {
		it("should detect onclick handler", () => {
			expect(containsUnsafeHtml('<div onclick="alert(1)">click</div>')).toBe(true);
		});

		it("should detect onerror handler", () => {
			expect(containsUnsafeHtml('<img src="x" onerror="alert(1)">')).toBe(true);
		});

		it("should detect onload handler", () => {
			expect(containsUnsafeHtml('<body onload="alert(1)">')).toBe(true);
		});

		it("should detect onmouseover handler", () => {
			expect(containsUnsafeHtml('<div onmouseover="alert(1)">hover</div>')).toBe(true);
		});

		it("should detect handler with space before equals", () => {
			expect(containsUnsafeHtml('<div onclick ="alert(1)">click</div>')).toBe(true);
		});

		it("should detect handler case-insensitively", () => {
			expect(containsUnsafeHtml('<div ONCLICK="alert(1)">click</div>')).toBe(true);
		});
	});

	describe("dangerous tag detection", () => {
		it("should detect iframe tag", () => {
			expect(containsUnsafeHtml('<iframe src="evil.html"></iframe>')).toBe(true);
		});

		it("should detect embed tag", () => {
			expect(containsUnsafeHtml('<embed src="evil.swf">')).toBe(true);
		});

		it("should detect object tag", () => {
			expect(containsUnsafeHtml('<object data="evil.swf"></object>')).toBe(true);
		});

		it("should detect base tag", () => {
			expect(containsUnsafeHtml('<base href="http://evil.com/">')).toBe(true);
		});

		it("should detect form tag", () => {
			expect(containsUnsafeHtml('<form action="http://evil.com/steal">')).toBe(true);
		});

		it("should detect meta tag", () => {
			expect(
				containsUnsafeHtml('<meta http-equiv="refresh" content="0;url=http://evil.com">'),
			).toBe(true);
		});

		it("should detect link tag", () => {
			expect(containsUnsafeHtml('<link rel="stylesheet" href="http://evil.com/style.css">')).toBe(
				true,
			);
		});
	});

	describe("SVG/MathML XSS detection", () => {
		it("should detect SVG with event handler", () => {
			expect(containsUnsafeHtml('<svg onload="alert(1)">')).toBe(true);
		});

		it("should detect SVG with nested event handler", () => {
			expect(containsUnsafeHtml('<svg><animate onbegin="alert(1)">')).toBe(true);
		});

		it("should detect MathML with event handler", () => {
			expect(containsUnsafeHtml('<math onclick="alert(1)">')).toBe(true);
		});

		it("should allow safe SVG without event handlers", () => {
			expect(
				containsUnsafeHtml('<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>'),
			).toBe(false);
		});
	});

	describe("bypass attempt detection", () => {
		it("should detect img onerror without quotes", () => {
			expect(containsUnsafeHtml("<img src=x onerror=alert(1)>")).toBe(true);
		});

		it("should detect handler in any position", () => {
			expect(containsUnsafeHtml('<div class="test" onclick="alert(1)" id="x">click</div>')).toBe(
				true,
			);
		});
	});
});
