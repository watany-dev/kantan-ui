import { describe, expect, it } from "vitest";
import { parseHtml } from "../../../src/diff/parser";

describe("parseHtml security", () => {
	describe("XSS payload handling", () => {
		it("should parse elements with script tags in attributes safely", () => {
			const html = '<div id="safe" data-val="<script>alert(1)</script>">Content</div>';
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].id).toBe("safe");
			// スクリプトタグは属性値として含まれるが、パース自体は成功
			expect(nodes[0].html).toContain("data-val");
		});

		it("should parse elements with javascript: URLs", () => {
			const html = '<a id="link" href="javascript:alert(1)">Click</a>';
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].id).toBe("link");
			// パースは成功（XSSブロックはクライアント側で行う）
		});

		it("should parse elements with event handlers", () => {
			const html = '<div id="elem" onclick="alert(1)">Content</div>';
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].id).toBe("elem");
		});

		it("should handle nested script attempts", () => {
			const html = '<div id="outer"><script>alert(1)</script></div>';
			const nodes = parseHtml(html);

			// outerのみがパースされる（scriptはidを持たない）
			expect(nodes).toHaveLength(1);
			expect(nodes[0].id).toBe("outer");
		});

		it("should handle SVG-based XSS attempts", () => {
			const html = '<svg id="svg"><use href="javascript:alert(1)"/></svg>';
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].id).toBe("svg");
		});
	});

	describe("malformed input handling", () => {
		it("should handle deeply nested same tags", () => {
			// 100レベルのネスト
			const depth = 100;
			const openTags = '<div id="deep">'.repeat(depth);
			const closeTags = "</div>".repeat(depth);
			const html = `${openTags}Content${closeTags}`;

			// タイムアウトせずに処理できること
			expect(() => parseHtml(html)).not.toThrow();
		});

		it("should handle unclosed tags gracefully", () => {
			const html = '<div id="unclosed"><span id="inner">No closing';
			const nodes = parseHtml(html);

			// パースエラーにならない
			expect(nodes.length).toBeGreaterThanOrEqual(0);
		});

		it("should handle mismatched tags", () => {
			const html = '<div id="mismatch"><span></div></span>';
			const nodes = parseHtml(html);

			// パースエラーにならない
			expect(nodes.length).toBeGreaterThanOrEqual(0);
		});

		it("should handle empty attributes", () => {
			const html = '<div id="empty" class="" data-empty="">Content</div>';
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].id).toBe("empty");
		});

		it("should handle attributes with special characters", () => {
			const html = '<div id="special" title="Hello &quot;World&quot;">Content</div>';
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].id).toBe("special");
		});

		it("should handle null bytes in content", () => {
			const html = '<div id="nullbyte">Content\0here</div>';
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].id).toBe("nullbyte");
		});

		it("should skip elements with unicode IDs", () => {
			// Unicode IDは現在の実装ではスキップされる
			const html = '<div id="日本語">Japanese</div><div id="valid">Valid</div>';
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].id).toBe("valid");
		});

		it("should skip elements with emoji IDs", () => {
			const html = '<div id="🔥">Fire</div><div id="normal">Normal</div>';
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].id).toBe("normal");
		});

		it("should handle very long attribute values", () => {
			const longValue = "a".repeat(10000);
			const html = `<div id="longattr" data-long="${longValue}">Content</div>`;
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].id).toBe("longattr");
		});
	});

	describe("HTML entities handling", () => {
		it("should preserve entities in content", () => {
			const html = '<div id="entities">&lt;script&gt;alert(1)&lt;/script&gt;</div>';
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].html).toContain("&lt;script&gt;");
		});

		it("should preserve entities in attributes", () => {
			const html = '<div id="attrents" title="&amp;&lt;&gt;&quot;">Content</div>';
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].html).toContain("&amp;");
		});

		it("should handle numeric entities", () => {
			const html = '<div id="numeric">&#60;script&#62;</div>';
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].html).toContain("&#60;");
		});

		it("should handle hex entities", () => {
			const html = '<div id="hex">&#x3C;script&#x3E;</div>';
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].html).toContain("&#x3C;");
		});

		it("should handle nbsp entities", () => {
			const html = '<div id="nbsp">Hello&nbsp;World</div>';
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].html).toContain("&nbsp;");
		});
	});

	describe("edge cases", () => {
		it("should handle HTML comments", () => {
			const html = '<!-- comment --><div id="aftercomment">Content</div>';
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].id).toBe("aftercomment");
		});

		it("should handle CDATA sections", () => {
			const html = '<div id="cdata"><![CDATA[<script>alert(1)</script>]]></div>';
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].id).toBe("cdata");
		});

		it("should handle multiple spaces in tags", () => {
			const html = '<div    id="spaces"    class="test"   >Content</div>';
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].id).toBe("spaces");
		});

		it("should handle newlines in tags", () => {
			const html = `<div
				id="newlines"
				class="test"
			>Content</div>`;
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].id).toBe("newlines");
		});

		it("should handle tabs in tags", () => {
			const html = '<div\tid="tabs"\tclass="test">Content</div>';
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].id).toBe("tabs");
		});

		it("should handle single quotes in double-quoted attributes", () => {
			const html = `<div id="quotes" title="It's working">Content</div>`;
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].id).toBe("quotes");
		});

		it("should handle boolean attributes", () => {
			const html = '<input id="disabled" disabled type="text" />';
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].id).toBe("disabled");
		});

		it("should handle self-closing tags without space before slash", () => {
			const html = '<input id="nospace" type="text"/>';
			const nodes = parseHtml(html);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].id).toBe("nospace");
		});
	});
});
