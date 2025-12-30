import { describe, expect, it } from "vitest";
import { escapeHtml } from "../../../src/utils/html";

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
			const malicious = '<svg onload="alert(\'xss\')">';
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
			expect(escapeHtml("<div class=\"test\">&</div>")).toBe(
				"&lt;div class=&quot;test&quot;&gt;&amp;&lt;/div&gt;",
			);
		});
	});
});
