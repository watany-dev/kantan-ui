import { describe, expect, it } from "vitest";
import { diff, toWebSocketPatches } from "../../../src/diff/differ";

describe("diff", () => {
	it("should detect no changes for identical HTML", () => {
		const html = '<button id="btn-1">Click</button>';
		const result = diff(html, html);

		expect(result.hasChanges).toBe(false);
		expect(result.patches).toHaveLength(0);
	});

	it("should detect replaced node when content changes", () => {
		const oldHtml = '<button id="btn-1">Click</button>';
		const newHtml = '<button id="btn-1">Clicked!</button>';
		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);
		expect(result.patches).toHaveLength(1);
		expect(result.patches[0]).toEqual({
			type: "replace",
			id: "btn-1",
			html: newHtml,
		});
	});

	it("should detect removed node", () => {
		const oldHtml = `
			<button id="btn-1">Button 1</button>
			<button id="btn-2">Button 2</button>
		`;
		const newHtml = '<button id="btn-1">Button 1</button>';
		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);
		const removePatches = result.patches.filter((p) => p.type === "remove");
		expect(removePatches).toHaveLength(1);
		expect(removePatches[0]).toEqual({
			type: "remove",
			id: "btn-2",
		});
	});

	it("should detect inserted node", () => {
		const oldHtml = '<button id="btn-1">Button 1</button>';
		const newHtml = `
			<button id="btn-1">Button 1</button>
			<button id="btn-2">Button 2</button>
		`;
		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);
		const insertPatches = result.patches.filter((p) => p.type === "insert");
		expect(insertPatches).toHaveLength(1);
		expect(insertPatches[0].type).toBe("insert");
	});

	it("should include correct parentId and order in insert patch", () => {
		const oldHtml = '<div id="parent"><span id="child1">First</span></div>';
		const newHtml = `<div id="parent">
			<span id="child1">First</span>
			<span id="child2">Second</span>
		</div>`;
		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);
		const insertPatches = result.patches.filter((p) => p.type === "insert");
		expect(insertPatches).toHaveLength(1);
		expect(insertPatches[0]).toMatchObject({
			type: "insert",
			parentId: "parent",
			index: 1, // child2 is the second child
		});
	});

	it("should include __root__ as parentId for top-level insert", () => {
		const oldHtml = '<button id="btn-1">Button 1</button>';
		const newHtml = `
			<button id="btn-1">Button 1</button>
			<button id="btn-2">Button 2</button>
		`;
		const result = diff(oldHtml, newHtml);

		const insertPatches = result.patches.filter((p) => p.type === "insert");
		expect(insertPatches[0]).toMatchObject({
			type: "insert",
			parentId: "__root__",
			index: 1,
		});
	});

	it("should handle insert at beginning", () => {
		const oldHtml = '<button id="btn-2">Button 2</button>';
		const newHtml = `
			<button id="btn-1">Button 1</button>
			<button id="btn-2">Button 2</button>
		`;
		const result = diff(oldHtml, newHtml);

		const insertPatches = result.patches.filter((p) => p.type === "insert");
		expect(insertPatches).toHaveLength(1);
		expect(insertPatches[0]).toMatchObject({
			type: "insert",
			parentId: "__root__",
			index: 0,
		});
	});

	it("should detect changes in slider container", () => {
		const oldHtml = `<div id="widget_0-container" class="kt-slider-container">
			<label for="widget_0">Speed: 50</label>
			<input id="widget_0" type="range" value="50" />
		</div>`;
		const newHtml = `<div id="widget_0-container" class="kt-slider-container">
			<label for="widget_0">Speed: 75</label>
			<input id="widget_0" type="range" value="75" />
		</div>`;
		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);
		// コンテナの変更を検出
		const containerChange = result.patches.find(
			(p) => p.type === "replace" && p.id === "widget_0-container",
		);
		expect(containerChange).toBeDefined();
	});

	it("should detect attribute-only changes", () => {
		const oldHtml = '<input id="input-1" type="text" value="old" />';
		const newHtml = '<input id="input-1" type="text" value="new" />';
		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);
		expect(result.patches).toHaveLength(1);
		expect(result.patches[0]).toMatchObject({
			type: "replace",
			id: "input-1",
		});
	});

	it("should detect class attribute changes", () => {
		const oldHtml = '<div id="box" class="active">Content</div>';
		const newHtml = '<div id="box" class="inactive">Content</div>';
		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);
		expect(result.patches).toHaveLength(1);
		expect(result.patches[0]).toMatchObject({
			type: "replace",
			id: "box",
		});
	});

	it("should detect changes in deeply nested structure (3 levels)", () => {
		const oldHtml = `
			<div id="level1">
				<div id="level2">
					<div id="level3">
						<span id="deep-content">Old Text</span>
					</div>
				</div>
			</div>
		`;
		const newHtml = `
			<div id="level1">
				<div id="level2">
					<div id="level3">
						<span id="deep-content">New Text</span>
					</div>
				</div>
			</div>
		`;
		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);
		// 変更が検出される（最も具体的な変更箇所）
		const deepChange = result.patches.find((p) => p.id === "deep-content" || p.id === "level3");
		expect(deepChange).toBeDefined();
	});

	it("should handle changes at multiple nesting levels", () => {
		const oldHtml = `
			<section id="section1">
				<article id="article1">
					<p id="para1">Paragraph 1</p>
				</article>
				<article id="article2">
					<p id="para2">Paragraph 2</p>
				</article>
			</section>
		`;
		const newHtml = `
			<section id="section1">
				<article id="article1">
					<p id="para1">Modified Paragraph 1</p>
				</article>
				<article id="article2">
					<p id="para2">Modified Paragraph 2</p>
				</article>
			</section>
		`;
		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);
		// 複数の変更が検出される
		expect(result.patches.length).toBeGreaterThanOrEqual(1);
	});

	it("should detect data attribute changes", () => {
		const oldHtml = '<button id="btn" data-count="5">Click</button>';
		const newHtml = '<button id="btn" data-count="10">Click</button>';
		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);
		expect(result.patches).toHaveLength(1);
		expect(result.patches[0]).toMatchObject({
			type: "replace",
			id: "btn",
		});
	});

	it("should handle self-closing tags correctly", () => {
		const oldHtml = '<div id="container"><img id="img1" src="old.jpg" /><br /></div>';
		const newHtml = '<div id="container"><img id="img1" src="new.jpg" /><br /></div>';
		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);
		// imgまたはcontainerの変更が検出される
		const imgChange = result.patches.find((p) => p.id === "img1" || p.id === "container");
		expect(imgChange).toBeDefined();
	});

	it("should detect element tag type changes as replace", () => {
		const oldHtml = '<span id="elem">Content</span>';
		const newHtml = '<div id="elem">Content</div>';
		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);
		expect(result.patches).toHaveLength(1);
		expect(result.patches[0]).toMatchObject({
			type: "replace",
			id: "elem",
		});
	});
});

describe("toWebSocketPatches", () => {
	it("should return empty array when no changes", () => {
		const result = { patches: [], hasChanges: false };
		const patches = toWebSocketPatches(result, "<div>html</div>");

		expect(patches).toHaveLength(0);
	});

	it("should convert replace patch to replaceNode", () => {
		const result = {
			patches: [{ type: "replace" as const, id: "btn-1", html: "<button>New</button>" }],
			hasChanges: true,
		};
		const patches = toWebSocketPatches(result, "<div>html</div>");

		expect(patches).toHaveLength(1);
		expect(patches[0]).toEqual({
			type: "replaceNode",
			id: "btn-1",
			html: "<button>New</button>",
		});
	});

	it("should convert remove patch to removeNode", () => {
		const result = {
			patches: [{ type: "remove" as const, id: "btn-1" }],
			hasChanges: true,
		};
		const patches = toWebSocketPatches(result, "<div>html</div>");

		expect(patches).toHaveLength(1);
		expect(patches[0]).toEqual({
			type: "removeNode",
			id: "btn-1",
		});
	});

	it("should convert insert patch to insertNode", () => {
		const result = {
			patches: [
				{
					type: "insert" as const,
					parentId: "__root__",
					index: 0,
					html: "<button>New</button>",
				},
			],
			hasChanges: true,
		};
		const patches = toWebSocketPatches(result, "<div>html</div>");

		expect(patches).toHaveLength(1);
		expect(patches[0]).toEqual({
			type: "insertNode",
			parentId: "__root__",
			index: 0,
			html: "<button>New</button>",
		});
	});

	it("should fallback to replaceRoot when too many patches", () => {
		// 11個以上のパッチでフォールバック
		const patches = Array.from({ length: 11 }, (_, i) => ({
			type: "replace" as const,
			id: `btn-${i}`,
			html: `<button>Button ${i}</button>`,
		}));
		const result = { patches, hasChanges: true };
		const fullHtml = "<div>full html</div>";
		const wsPatches = toWebSocketPatches(result, fullHtml);

		expect(wsPatches).toHaveLength(1);
		expect(wsPatches[0]).toEqual({
			type: "replaceRoot",
			html: fullHtml,
		});
	});
});
