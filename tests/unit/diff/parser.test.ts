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
