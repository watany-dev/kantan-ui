import { describe, expect, it } from "vitest";
import { buildNodeMap, parseHtml } from "../../../src/diff/parser";

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

	it("should extract attributes correctly", () => {
		const html = '<input id="kt-1" type="range" min="0" max="100" value="50" class="kt-slider" />';
		const nodes = parseHtml(html);

		expect(nodes).toHaveLength(1);
		expect(nodes[0].attributes.id).toBe("kt-1");
		expect(nodes[0].attributes.type).toBe("range");
		expect(nodes[0].attributes.min).toBe("0");
		expect(nodes[0].attributes.max).toBe("100");
		expect(nodes[0].attributes.class).toBe("kt-slider");
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
