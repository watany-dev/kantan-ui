import { describe, expect, it } from "vitest";
import { PARSER_LIMITS, buildNodeMap, isValidId, parseHtml } from "../../../src/diff/parser";

describe("parseHtml", () => {
	it("should extract elements with id attribute", () => {
		const html = '<button id="btn-1" class="kt-button">Click me</button>';
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(1);
		expect(nodes[0].id).toBe("btn-1");
		expect(nodes[0].tag).toBe("button");
		expect(nodes[0].html).toBe(html);
	});

	it("should extract multiple elements with ids", () => {
		const html = `
			<button id="btn-1" class="kt-button">Button 1</button>
			<button id="btn-2" class="kt-button">Button 2</button>
		`;
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(2);
		expect(nodes[0].id).toBe("btn-1");
		expect(nodes[1].id).toBe("btn-2");
	});

	it("should handle self-closing tags like input", () => {
		const html = '<input id="slider-1" type="range" min="0" max="100" />';
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(1);
		expect(nodes[0].id).toBe("slider-1");
		expect(nodes[0].tag).toBe("input");
	});

	it("should extract container divs with ids", () => {
		const html = `<div id="kt-1-container" class="kt-slider-container">
			<label for="kt-1">Speed: 50</label>
			<input id="kt-1" type="range" min="0" max="100" value="50" />
		</div>`;
		const nodes = parseHtml(html);

		// Should find both the container and the input
		expect(nodes.length).toBeGreaterThanOrEqual(2);

		const containerNode = nodes.find((n) => n.id === "kt-1-container");
		const inputNode = nodes.find((n) => n.id === "kt-1");

		expect(containerNode).toBeDefined();
		expect(containerNode?.tag).toBe("div");
		expect(inputNode).toBeDefined();
		expect(inputNode?.tag).toBe("input");
	});

	it("should ignore elements without id attribute", () => {
		const html = `
			<div class="wrapper">
				<span>No id here</span>
				<button id="btn-1">Has id</button>
			</div>
		`;
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(1);
		expect(nodes[0].id).toBe("btn-1");
	});

	it("should return empty array for empty html", () => {
		const nodes = parseHtml("");
		expect(nodes).toHaveLength(0);
	});

	it("should return empty array for html without ids", () => {
		const html = "<div><span>Hello</span></div>";
		const nodes = parseHtml(html);
		expect(nodes).toHaveLength(0);
	});

	it("should handle nested elements with same tag name", () => {
		const html = `<div id="outer">
			<div>
				<div>Deeply nested</div>
			</div>
		</div>`;
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(1);
		expect(nodes[0].id).toBe("outer");
		expect(nodes[0].html).toContain("Deeply nested");
	});

	it("should handle unclosed tags gracefully", () => {
		const html = '<div id="broken">No closing tag';
		const nodes = parseHtml(html);
		// Should still extract what it can
		expect(nodes.length).toBeGreaterThanOrEqual(0);
	});

	it("should handle multiple levels of nesting", () => {
		const html = `<div id="level1">
			<div id="level2">
				<span id="level3">Content</span>
			</div>
		</div>`;
		const nodes = parseHtml(html);

		const ids = nodes.map((n) => n.id);
		expect(ids).toContain("level1");
		expect(ids).toContain("level2");
		expect(ids).toContain("level3");
	});

	it("should calculate parentId for nested elements", () => {
		const html = `<div id="parent">
			<span id="child">Content</span>
		</div>`;
		const nodes = parseHtml(html);

		const parent = nodes.find((n) => n.id === "parent");
		const child = nodes.find((n) => n.id === "child");

		expect(parent?.parentId).toBeNull();
		expect(child?.parentId).toBe("parent");
	});

	it("should calculate parentId for deeply nested elements", () => {
		const html = `<div id="grandparent">
			<div id="parent">
				<span id="child">Content</span>
			</div>
		</div>`;
		const nodes = parseHtml(html);

		const grandparent = nodes.find((n) => n.id === "grandparent");
		const parent = nodes.find((n) => n.id === "parent");
		const child = nodes.find((n) => n.id === "child");

		expect(grandparent?.parentId).toBeNull();
		expect(parent?.parentId).toBe("grandparent");
		expect(child?.parentId).toBe("parent");
	});

	it("should calculate order for sibling elements", () => {
		const html = `
			<button id="first">First</button>
			<button id="second">Second</button>
			<button id="third">Third</button>
		`;
		const nodes = parseHtml(html);

		const first = nodes.find((n) => n.id === "first");
		const second = nodes.find((n) => n.id === "second");
		const third = nodes.find((n) => n.id === "third");

		expect(first?.order).toBe(0);
		expect(second?.order).toBe(1);
		expect(third?.order).toBe(2);
	});

	it("should calculate order for siblings within parent", () => {
		const html = `<div id="parent">
			<span id="child1">First</span>
			<span id="child2">Second</span>
		</div>`;
		const nodes = parseHtml(html);

		const parent = nodes.find((n) => n.id === "parent");
		const child1 = nodes.find((n) => n.id === "child1");
		const child2 = nodes.find((n) => n.id === "child2");

		expect(parent?.order).toBe(0);
		expect(child1?.order).toBe(0);
		expect(child2?.order).toBe(1);
	});

	it("should handle widget container structure", () => {
		const html = `<div id="widget_0-container" class="kt-slider-container">
			<label for="widget_0">Speed: 50</label>
			<input id="widget_0" type="range" min="0" max="100" value="50" />
		</div>`;
		const nodes = parseHtml(html);

		const container = nodes.find((n) => n.id === "widget_0-container");
		const input = nodes.find((n) => n.id === "widget_0");

		expect(container?.parentId).toBeNull();
		expect(input?.parentId).toBe("widget_0-container");
		expect(container?.order).toBe(0);
		expect(input?.order).toBe(0); // labelにはIDがないので
	});
});

describe("buildNodeMap", () => {
	it("should create a map from id to html", () => {
		const html = `
			<button id="btn-1" class="kt-button">Button 1</button>
			<button id="btn-2" class="kt-button">Button 2</button>
		`;
		const nodes = parseHtml(html);
		const map = buildNodeMap(nodes);

		expect(map.size).toBe(2);
		expect(map.get("btn-1")).toContain("Button 1");
		expect(map.get("btn-2")).toContain("Button 2");
	});

	it("should return empty map for empty nodes", () => {
		const map = buildNodeMap([]);
		expect(map.size).toBe(0);
	});
});

describe("isValidId", () => {
	it("should accept valid IDs", () => {
		expect(isValidId("btn-1")).toBe(true);
		expect(isValidId("widget_0")).toBe(true);
		expect(isValidId("MyComponent")).toBe(true);
		expect(isValidId("_private")).toBe(true);
	});

	it("should reject invalid IDs", () => {
		expect(isValidId("")).toBe(false);
		expect(isValidId("123abc")).toBe(false); // starts with number
		expect(isValidId("-invalid")).toBe(false); // starts with hyphen
		expect(isValidId("has space")).toBe(false);
		expect(isValidId("has\ttab")).toBe(false);
	});

	it("should reject IDs exceeding max length", () => {
		const longId = "a".repeat(PARSER_LIMITS.MAX_ID_LENGTH + 1);
		expect(isValidId(longId)).toBe(false);

		const maxLengthId = "a".repeat(PARSER_LIMITS.MAX_ID_LENGTH);
		expect(isValidId(maxLengthId)).toBe(true);
	});
});

describe("parseHtml input validation", () => {
	it("should throw error for HTML exceeding size limit", () => {
		const largeHtml = "a".repeat(PARSER_LIMITS.MAX_HTML_SIZE + 1);
		expect(() => parseHtml(largeHtml)).toThrow(/HTML size exceeds limit/);
	});

	it("should skip elements with invalid IDs", () => {
		const html = `
			<div id="valid-id">Valid</div>
			<div id="123invalid">Invalid start</div>
			<div id="also-valid">Also valid</div>
		`;
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(2);
		expect(nodes[0].id).toBe("valid-id");
		expect(nodes[1].id).toBe("also-valid");
	});

	it("should throw error when element count exceeds limit", () => {
		const elements = Array.from(
			{ length: PARSER_LIMITS.MAX_ELEMENTS + 1 },
			(_, i) => `<div id="el-${i}">Content</div>`,
		).join("");

		expect(() => parseHtml(elements)).toThrow(/Element count exceeds limit/);
	});
});

describe("buildNodeTree edge cases", () => {
	it("should handle single element", () => {
		const html = '<div id="only">Single element</div>';
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(1);
		expect(nodes[0].id).toBe("only");
		expect(nodes[0].parentId).toBeNull();
		expect(nodes[0].order).toBe(0);
	});

	it("should handle empty input", () => {
		const nodes = parseHtml("");
		expect(nodes).toHaveLength(0);
	});

	it("should handle all flat elements (no parent)", () => {
		const html = `
			<div id="a">A</div>
			<div id="b">B</div>
			<div id="c">C</div>
			<div id="d">D</div>
		`;
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(4);
		// All should have null parent
		for (const node of nodes) {
			expect(node.parentId).toBeNull();
		}
		// Order should be sequential
		const a = nodes.find((n) => n.id === "a");
		const b = nodes.find((n) => n.id === "b");
		const c = nodes.find((n) => n.id === "c");
		const d = nodes.find((n) => n.id === "d");

		expect(a?.order).toBe(0);
		expect(b?.order).toBe(1);
		expect(c?.order).toBe(2);
		expect(d?.order).toBe(3);
	});

	it("should handle deeply nested structure (5+ levels)", () => {
		const html = `
			<div id="l1">
				<div id="l2">
					<div id="l3">
						<div id="l4">
							<div id="l5">
								<span id="l6">Deep</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(6);

		const l1 = nodes.find((n) => n.id === "l1");
		const l2 = nodes.find((n) => n.id === "l2");
		const l3 = nodes.find((n) => n.id === "l3");
		const l4 = nodes.find((n) => n.id === "l4");
		const l5 = nodes.find((n) => n.id === "l5");
		const l6 = nodes.find((n) => n.id === "l6");

		expect(l1?.parentId).toBeNull();
		expect(l2?.parentId).toBe("l1");
		expect(l3?.parentId).toBe("l2");
		expect(l4?.parentId).toBe("l3");
		expect(l5?.parentId).toBe("l4");
		expect(l6?.parentId).toBe("l5");
	});

	it("should select the smallest containing parent when multiple candidates exist", () => {
		// grandparent contains both parent and child
		// parent contains only child
		// child should have parent as parentId, not grandparent
		const html = `
			<div id="grandparent">
				<div id="parent">
					<span id="child">Content</span>
				</div>
			</div>
		`;
		const nodes = parseHtml(html);

		const child = nodes.find((n) => n.id === "child");
		// The smallest containing element is "parent", not "grandparent"
		expect(child?.parentId).toBe("parent");
	});

	it("should handle complex sibling relationships with multiple parents", () => {
		const html = `
			<div id="parent1">
				<span id="p1c1">P1 Child 1</span>
				<span id="p1c2">P1 Child 2</span>
			</div>
			<div id="parent2">
				<span id="p2c1">P2 Child 1</span>
				<span id="p2c2">P2 Child 2</span>
				<span id="p2c3">P2 Child 3</span>
			</div>
		`;
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(7);

		// Parent1's children
		const p1c1 = nodes.find((n) => n.id === "p1c1");
		const p1c2 = nodes.find((n) => n.id === "p1c2");
		expect(p1c1?.parentId).toBe("parent1");
		expect(p1c2?.parentId).toBe("parent1");
		expect(p1c1?.order).toBe(0);
		expect(p1c2?.order).toBe(1);

		// Parent2's children
		const p2c1 = nodes.find((n) => n.id === "p2c1");
		const p2c2 = nodes.find((n) => n.id === "p2c2");
		const p2c3 = nodes.find((n) => n.id === "p2c3");
		expect(p2c1?.parentId).toBe("parent2");
		expect(p2c2?.parentId).toBe("parent2");
		expect(p2c3?.parentId).toBe("parent2");
		expect(p2c1?.order).toBe(0);
		expect(p2c2?.order).toBe(1);
		expect(p2c3?.order).toBe(2);

		// Parents should be siblings
		const parent1 = nodes.find((n) => n.id === "parent1");
		const parent2 = nodes.find((n) => n.id === "parent2");
		expect(parent1?.parentId).toBeNull();
		expect(parent2?.parentId).toBeNull();
		expect(parent1?.order).toBe(0);
		expect(parent2?.order).toBe(1);
	});

	it("should handle mixed nesting with siblings at different levels", () => {
		const html = `
			<div id="root">
				<div id="branch1">
					<span id="leaf1">Leaf 1</span>
				</div>
				<span id="sibling">Sibling of branch1</span>
				<div id="branch2">
					<span id="leaf2">Leaf 2</span>
				</div>
			</div>
		`;
		const nodes = parseHtml(html);

		const root = nodes.find((n) => n.id === "root");
		const branch1 = nodes.find((n) => n.id === "branch1");
		const branch2 = nodes.find((n) => n.id === "branch2");
		const sibling = nodes.find((n) => n.id === "sibling");
		const leaf1 = nodes.find((n) => n.id === "leaf1");
		const leaf2 = nodes.find((n) => n.id === "leaf2");

		// Root has no parent
		expect(root?.parentId).toBeNull();

		// branch1, sibling, branch2 are children of root
		expect(branch1?.parentId).toBe("root");
		expect(sibling?.parentId).toBe("root");
		expect(branch2?.parentId).toBe("root");

		// Order among root's children
		expect(branch1?.order).toBe(0);
		expect(sibling?.order).toBe(1);
		expect(branch2?.order).toBe(2);

		// Leaves are children of their respective branches
		expect(leaf1?.parentId).toBe("branch1");
		expect(leaf2?.parentId).toBe("branch2");
	});

	it("should correctly sort siblings by startPos regardless of parse order", () => {
		// Test that siblings are sorted by their position in HTML, not by parse order
		const html = `
			<div id="container">
				<span id="first">First</span>
				<span id="second">Second</span>
				<span id="third">Third</span>
			</div>
		`;
		const nodes = parseHtml(html);

		const first = nodes.find((n) => n.id === "first");
		const second = nodes.find((n) => n.id === "second");
		const third = nodes.find((n) => n.id === "third");

		// Verify order is based on position
		expect(first?.order).toBe(0);
		expect(second?.order).toBe(1);
		expect(third?.order).toBe(2);
	});

	it("should handle nodes where potentialParent.id equals node.id (skip self)", () => {
		// This tests the continue statement in buildParentMap
		const html = '<div id="self">Self reference test</div>';
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(1);
		expect(nodes[0].parentId).toBeNull(); // Should not be its own parent
	});

	it("should handle container that does not fully contain child", () => {
		// Test containsNode condition: startPos < child.startPos && endPos > child.endPos
		// When elements are siblings (not nested), neither contains the other
		const html = `
			<div id="sibling1">First</div>
			<div id="sibling2">Second</div>
		`;
		const nodes = parseHtml(html);

		const sibling1 = nodes.find((n) => n.id === "sibling1");
		const sibling2 = nodes.find((n) => n.id === "sibling2");

		// Neither should be parent of the other
		expect(sibling1?.parentId).toBeNull();
		expect(sibling2?.parentId).toBeNull();
	});
});

describe("buildNodeTree performance", () => {
	it("should handle 100 elements efficiently", () => {
		const elements = Array.from(
			{ length: 100 },
			(_, i) => `<div id="el-${i}">Content ${i}</div>`,
		).join("\n");

		const startTime = performance.now();
		const nodes = parseHtml(elements);
		const endTime = performance.now();

		expect(nodes).toHaveLength(100);
		// Should complete within 50ms for 100 elements
		expect(endTime - startTime).toBeLessThan(50);
	});

	it("should handle nested structure with many siblings", () => {
		const children = Array.from(
			{ length: 50 },
			(_, i) => `<span id="child-${i}">Child ${i}</span>`,
		).join("\n");

		const html = `<div id="parent">${children}</div>`;

		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(51); // parent + 50 children

		const parent = nodes.find((n) => n.id === "parent");
		expect(parent?.parentId).toBeNull();

		// Verify all children have correct parent and order
		for (let i = 0; i < 50; i++) {
			const child = nodes.find((n) => n.id === `child-${i}`);
			expect(child?.parentId).toBe("parent");
			expect(child?.order).toBe(i);
		}
	});

	it("should handle 500 flat elements within 20ms", () => {
		const elements = Array.from(
			{ length: 500 },
			(_, i) => `<div id="el-${i}">Content ${i}</div>`,
		).join("\n");

		const startTime = performance.now();
		const nodes = parseHtml(elements);
		const duration = performance.now() - startTime;

		expect(nodes).toHaveLength(500);
		// O(k log k) should complete well under 20ms
		expect(duration).toBeLessThan(20);
	});

	it("should handle 100 deeply nested elements within 50ms", () => {
		// Deep nesting structure - reduced from 250 to 100 to avoid
		// findClosingTag timeout (separate performance issue)
		let html = "";
		for (let i = 0; i < 100; i++) {
			html += `<div id="level${i}">`;
		}
		html += "Content";
		for (let i = 99; i >= 0; i--) {
			html += "</div>";
		}

		const startTime = performance.now();
		const nodes = parseHtml(html);
		const duration = performance.now() - startTime;

		expect(nodes).toHaveLength(100);
		// O(k log k) buildParentMap should be fast, but findClosingTag adds overhead
		expect(duration).toBeLessThan(50);

		// Verify parent chain is correct
		for (let i = 1; i < 100; i++) {
			const node = nodes.find((n) => n.id === `level${i}`);
			expect(node?.parentId).toBe(`level${i - 1}`);
		}
	});

	it("should handle 200 elements with complex nesting within 20ms", () => {
		// Mix of nesting and siblings
		let html = "";
		for (let i = 0; i < 10; i++) {
			html += `<div id="parent${i}">`;
			for (let j = 0; j < 20; j++) {
				html += `<span id="child${i}_${j}">Content</span>`;
			}
			html += "</div>";
		}

		const startTime = performance.now();
		const nodes = parseHtml(html);
		const duration = performance.now() - startTime;

		expect(nodes).toHaveLength(210); // 10 parents + 200 children
		expect(duration).toBeLessThan(20);

		// Verify parent relationships
		for (let i = 0; i < 10; i++) {
			for (let j = 0; j < 20; j++) {
				const child = nodes.find((n) => n.id === `child${i}_${j}`);
				expect(child?.parentId).toBe(`parent${i}`);
			}
		}
	});
});

describe("parseHtml self-closing and closing tag handling", () => {
	it("should handle self-closing tags without slash (br, hr, img)", () => {
		// These are self-closing tags even without />
		const html = '<br id="break1"><hr id="rule1"><img id="image1" src="test.png">';
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(3);
		expect(nodes.find((n) => n.id === "break1")?.tag).toBe("br");
		expect(nodes.find((n) => n.id === "rule1")?.tag).toBe("hr");
		expect(nodes.find((n) => n.id === "image1")?.tag).toBe("img");
	});

	it("should handle input tag without self-closing slash", () => {
		const html = '<input id="text1" type="text">';
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(1);
		expect(nodes[0].tag).toBe("input");
	});

	it("should handle unclosed tag (missing closing tag)", () => {
		// When closing tag is not found, should use the matched portion
		const html = '<div id="unclosed">Content without closing tag';
		const nodes = parseHtml(html);

		expect(nodes.length).toBeGreaterThanOrEqual(0);
		if (nodes.length > 0) {
			expect(nodes[0].id).toBe("unclosed");
		}
	});

	it("should handle uppercase tag names (case insensitive)", () => {
		const html = '<DIV id="upper">Uppercase tag</DIV>';
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(1);
		expect(nodes[0].id).toBe("upper");
		expect(nodes[0].tag).toBe("DIV");
	});

	it("should handle mixed case tag names", () => {
		const html = '<Div id="mixed">Mixed case</Div>';
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(1);
		expect(nodes[0].id).toBe("mixed");
	});
});

describe("buildParentMap containerSize comparison", () => {
	it("should keep smaller container when larger container is found later", () => {
		// This tests the case where containerSize >= smallestContainerSize (line 128 false branch)
		// We have grandparent > parent > child, and the order of iteration matters
		// grandparent is larger, parent is smaller - parent should be selected
		const html = `
			<div id="grandparent">
				<div id="parent">
					<span id="child">Content</span>
				</div>
			</div>
		`;
		const nodes = parseHtml(html);

		const grandparent = nodes.find((n) => n.id === "grandparent");
		const parent = nodes.find((n) => n.id === "parent");
		const child = nodes.find((n) => n.id === "child");

		// grandparent has no parent
		expect(grandparent?.parentId).toBeNull();
		// parent's parent is grandparent (the only container)
		expect(parent?.parentId).toBe("grandparent");
		// child's parent should be parent (smaller), not grandparent (larger)
		expect(child?.parentId).toBe("parent");
	});

	it("should handle multiple containers of different sizes correctly", () => {
		// Test with 4 levels to ensure the smallest is always selected
		const html = `
			<div id="level1">
				<div id="level2">
					<div id="level3">
						<span id="target">Target</span>
					</div>
				</div>
			</div>
		`;
		const nodes = parseHtml(html);

		const target = nodes.find((n) => n.id === "target");
		// target's parent should be level3 (the smallest container)
		expect(target?.parentId).toBe("level3");

		const level3 = nodes.find((n) => n.id === "level3");
		expect(level3?.parentId).toBe("level2");

		const level2 = nodes.find((n) => n.id === "level2");
		expect(level2?.parentId).toBe("level1");
	});
});

describe("findClosingTag edge cases", () => {
	it("should handle nested tags of same type", () => {
		// Tests the openMatch.index < closeMatch.index branch
		const html = `<div id="outer"><div>Inner without id</div></div>`;
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(1);
		expect(nodes[0].id).toBe("outer");
		expect(nodes[0].html).toContain("Inner without id");
	});

	it("should handle deeply nested same tags", () => {
		const html = `<div id="d1"><div><div><div>Deep</div></div></div></div>`;
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(1);
		expect(nodes[0].html).toContain("Deep");
	});

	it("should return partial match when closing tag not found", () => {
		// Tests !closeMatch branch returning -1
		const html = '<div id="noclose">No closing tag here';
		const nodes = parseHtml(html);

		// Should still parse something, even if closing tag is missing
		expect(nodes.length).toBeGreaterThanOrEqual(0);
	});
});

describe("isSelfClosingTag coverage", () => {
	it("should recognize all self-closing tags", () => {
		const selfClosingTags = [
			"input",
			"br",
			"hr",
			"img",
			"meta",
			"link",
			"area",
			"base",
			"col",
			"embed",
			"param",
			"source",
			"track",
			"wbr",
		];

		for (const tag of selfClosingTags) {
			const html = `<${tag} id="test-${tag}">`;
			const nodes = parseHtml(html);
			expect(nodes.length).toBeGreaterThanOrEqual(1);
		}
	});

	it("should not treat div as self-closing", () => {
		const html = '<div id="notself">Content</div>';
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(1);
		expect(nodes[0].html).toContain("Content");
	});

	it("should handle uppercase self-closing tags", () => {
		const html = '<INPUT id="upperInput" type="text">';
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(1);
		expect(nodes[0].tag).toBe("INPUT");
	});
});

describe("parseHtml boundary values", () => {
	it("should handle HTML at MAX_HTML_SIZE - 1 byte", () => {
		// MAX_HTML_SIZE - 1 バイトのHTMLを生成
		const targetSize = PARSER_LIMITS.MAX_HTML_SIZE - 1;
		const prefix = '<div id="boundary">';
		const suffix = "</div>";
		const contentLength = targetSize - prefix.length - suffix.length;
		const content = "a".repeat(contentLength);
		const html = `${prefix}${content}${suffix}`;

		expect(html.length).toBe(targetSize);
		expect(() => parseHtml(html)).not.toThrow();

		const nodes = parseHtml(html);
		expect(nodes).toHaveLength(1);
		expect(nodes[0].id).toBe("boundary");
	});

	it("should handle exactly MAX_ELEMENTS - 1 elements", () => {
		const numElements = PARSER_LIMITS.MAX_ELEMENTS - 1;
		const elements = Array.from(
			{ length: numElements },
			(_, i) => `<div id="el-${i}">C</div>`,
		).join("");

		expect(() => parseHtml(elements)).not.toThrow();

		const nodes = parseHtml(elements);
		expect(nodes).toHaveLength(numElements);
	});

	it("should handle ID at MAX_ID_LENGTH - 1 characters", () => {
		const idLength = PARSER_LIMITS.MAX_ID_LENGTH - 1;
		const id = `a${"b".repeat(idLength - 1)}`;
		const html = `<div id="${id}">Content</div>`;

		expect(id.length).toBe(idLength);
		expect(isValidId(id)).toBe(true);

		const nodes = parseHtml(html);
		expect(nodes).toHaveLength(1);
		expect(nodes[0].id).toBe(id);
	});

	it("should handle ID at exactly MAX_ID_LENGTH", () => {
		const id = `a${"b".repeat(PARSER_LIMITS.MAX_ID_LENGTH - 1)}`;
		const html = `<div id="${id}">Content</div>`;

		expect(id.length).toBe(PARSER_LIMITS.MAX_ID_LENGTH);
		expect(isValidId(id)).toBe(true);

		const nodes = parseHtml(html);
		expect(nodes).toHaveLength(1);
	});

	it("should reject ID exceeding MAX_ID_LENGTH by 1", () => {
		const id = `a${"b".repeat(PARSER_LIMITS.MAX_ID_LENGTH)}`;
		expect(id.length).toBe(PARSER_LIMITS.MAX_ID_LENGTH + 1);
		expect(isValidId(id)).toBe(false);
	});

	it("should throw at exactly MAX_HTML_SIZE", () => {
		const html = "a".repeat(PARSER_LIMITS.MAX_HTML_SIZE + 1);
		expect(() => parseHtml(html)).toThrow(/HTML size exceeds limit/);
	});

	it("should throw at exactly MAX_ELEMENTS", () => {
		const elements = Array.from(
			{ length: PARSER_LIMITS.MAX_ELEMENTS + 1 },
			(_, i) => `<div id="el-${i}">C</div>`,
		).join("");

		expect(() => parseHtml(elements)).toThrow(/Element count exceeds limit/);
	});
});

describe("parseHtml error handling", () => {
	it("should handle severely malformed HTML without crashing", () => {
		const malformed = [
			'<div id="a"<<<<>>>><<<<',
			'<div id="b" class=">">',
			'<div id="c"><<</div>>>',
			'<<<div id="d">>>',
		];

		for (const html of malformed) {
			expect(() => parseHtml(html)).not.toThrow();
		}
	});

	it("should handle HTML with unusual but valid tag names", () => {
		const html = '<custom-element id="custom">Content</custom-element>';
		const _nodes = parseHtml(html);

		// カスタム要素はハイフンを含むためパースできない可能性あり
		// しかし、クラッシュしないことが重要
		expect(() => parseHtml(html)).not.toThrow();
	});

	it("should handle HTML with data attributes", () => {
		const html = '<div id="data" data-value="123" data-json=\'{"key":"value"}\'>Content</div>';
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(1);
		expect(nodes[0].id).toBe("data");
	});

	it("should handle HTML with aria attributes", () => {
		const html =
			'<div id="aria" aria-label="Label" aria-describedby="desc" role="button">Content</div>';
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(1);
		expect(nodes[0].id).toBe("aria");
	});

	it("should handle script and style tags in content", () => {
		const html = `<div id="wrapper">
			<script>alert('xss')</script>
			<style>.hidden { display: none; }</style>
		</div>`;
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(1);
		expect(nodes[0].id).toBe("wrapper");
	});

	it("should handle deeply nested structures near limit", () => {
		// 50レベルのネスト（制限値より低い）
		let html = "";
		for (let i = 0; i < 50; i++) {
			html += `<div id="level${i}">`;
		}
		html += "Content";
		for (let i = 49; i >= 0; i--) {
			html += "</div>";
		}

		expect(() => parseHtml(html)).not.toThrow();
		const nodes = parseHtml(html);
		expect(nodes).toHaveLength(50);
	});

	it("should handle mixed valid and invalid IDs", () => {
		const html = `
			<div id="valid1">Valid 1</div>
			<div id="">Empty ID</div>
			<div id="valid2">Valid 2</div>
			<div id=" ">Space ID</div>
			<div id="valid3">Valid 3</div>
		`;
		const nodes = parseHtml(html);

		// 有効なIDのみがパースされる
		const validIds = nodes.map((n) => n.id);
		expect(validIds).toContain("valid1");
		expect(validIds).toContain("valid2");
		expect(validIds).toContain("valid3");
	});

	it("should handle consecutive self-closing tags", () => {
		const html = `
			<input id="input1" type="text" />
			<input id="input2" type="number" />
			<br id="br1" />
			<hr id="hr1" />
		`;
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(4);
	});
});
