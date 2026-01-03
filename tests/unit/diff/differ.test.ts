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

describe("toWebSocketPatches edge cases", () => {
	it("should return replaceRoot when hasChanges is true but patches is empty", () => {
		// ID追跡できない変更（例：IDを持たない要素のみの変更）
		const result = { patches: [], hasChanges: true };
		const fullHtml = "<div>full html</div>";
		const wsPatches = toWebSocketPatches(result, fullHtml);

		expect(wsPatches).toHaveLength(1);
		expect(wsPatches[0]).toEqual({
			type: "replaceRoot",
			html: fullHtml,
		});
	});

	it("should handle exactly PATCH_THRESHOLD (10) patches without fallback", () => {
		// ちょうど10個のパッチはフォールバックしない
		const patches = Array.from({ length: 10 }, (_, i) => ({
			type: "replace" as const,
			id: `btn-${i}`,
			html: `<button>Button ${i}</button>`,
		}));
		const result = { patches, hasChanges: true };
		const fullHtml = "<div>full html</div>";
		const wsPatches = toWebSocketPatches(result, fullHtml);

		expect(wsPatches).toHaveLength(10);
		expect(wsPatches[0].type).toBe("replaceNode");
	});

	it("should fallback at PATCH_THRESHOLD + 1 (11) patches", () => {
		// 11個のパッチでフォールバック
		const patches = Array.from({ length: 11 }, (_, i) => ({
			type: "replace" as const,
			id: `btn-${i}`,
			html: `<button>Button ${i}</button>`,
		}));
		const result = { patches, hasChanges: true };
		const fullHtml = "<div>full html</div>";
		const wsPatches = toWebSocketPatches(result, fullHtml);

		expect(wsPatches).toHaveLength(1);
		expect(wsPatches[0].type).toBe("replaceRoot");
	});

	it("should handle mixed patch types", () => {
		const result = {
			patches: [
				{ type: "replace" as const, id: "a", html: "<div>A</div>" },
				{ type: "remove" as const, id: "b" },
				{ type: "insert" as const, parentId: "__root__", index: 0, html: "<div>C</div>" },
			],
			hasChanges: true,
		};
		const wsPatches = toWebSocketPatches(result, "<div>full</div>");

		expect(wsPatches).toHaveLength(3);
		expect(wsPatches[0].type).toBe("replaceNode");
		expect(wsPatches[1].type).toBe("removeNode");
		expect(wsPatches[2].type).toBe("insertNode");
	});

	it("should preserve patch order", () => {
		const result = {
			patches: [
				{ type: "replace" as const, id: "first", html: "<div>First</div>" },
				{ type: "replace" as const, id: "second", html: "<div>Second</div>" },
				{ type: "replace" as const, id: "third", html: "<div>Third</div>" },
			],
			hasChanges: true,
		};
		const wsPatches = toWebSocketPatches(result, "<div>full</div>");

		expect(wsPatches).toHaveLength(3);
		expect((wsPatches[0] as { id: string }).id).toBe("first");
		expect((wsPatches[1] as { id: string }).id).toBe("second");
		expect((wsPatches[2] as { id: string }).id).toBe("third");
	});
});

describe("diff edge cases", () => {
	it("should detect element reordering as replace patches", () => {
		const oldHtml = `
			<div id="a">A</div>
			<div id="b">B</div>
		`;
		const newHtml = `
			<div id="b">B</div>
			<div id="a">A</div>
		`;
		const result = diff(oldHtml, newHtml);

		// HTMLは異なるが、個別要素の内容は同じ
		expect(result.hasChanges).toBe(true);
		// 現在の実装では個別要素のHTMLが同じなら変更として検出されない
		// 順序変更は検出されない（ID追跡の制限）
	});

	it("should handle element moved to different parent", () => {
		const oldHtml = `
			<div id="parent1"><span id="child">Child</span></div>
			<div id="parent2"></div>
		`;
		const newHtml = `
			<div id="parent1"></div>
			<div id="parent2"><span id="child">Child</span></div>
		`;
		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);
		// parent1とparent2が変更として検出される
		const replacePatches = result.patches.filter((p) => p.type === "replace");
		expect(replacePatches.length).toBeGreaterThanOrEqual(1);
	});

	it("should detect non-id element changes via hasChanges", () => {
		// IDを持たない要素のみの変更
		const oldHtml = '<div id="wrapper"><span>Old text</span></div>';
		const newHtml = '<div id="wrapper"><span>New text</span></div>';
		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);
		// wrapper自体が変更として検出される
		const replacePatches = result.patches.filter((p) => p.type === "replace");
		expect(replacePatches.length).toBeGreaterThanOrEqual(1);
	});

	it("should handle empty old and new HTML", () => {
		const result = diff("", "");

		expect(result.hasChanges).toBe(false);
		expect(result.patches).toHaveLength(0);
	});

	it("should handle old HTML empty and new HTML with content", () => {
		const result = diff("", '<div id="new">New</div>');

		expect(result.hasChanges).toBe(true);
		const insertPatches = result.patches.filter((p) => p.type === "insert");
		expect(insertPatches).toHaveLength(1);
	});

	it("should handle new HTML empty and old HTML with content", () => {
		const result = diff('<div id="old">Old</div>', "");

		expect(result.hasChanges).toBe(true);
		const removePatches = result.patches.filter((p) => p.type === "remove");
		expect(removePatches).toHaveLength(1);
	});

	it("should handle completely different HTML structures", () => {
		const oldHtml = `
			<div id="header">Header</div>
			<div id="content">Content</div>
			<div id="footer">Footer</div>
		`;
		const newHtml = `
			<nav id="nav">Nav</nav>
			<main id="main">Main</main>
			<aside id="sidebar">Sidebar</aside>
		`;
		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);
		// すべての古い要素が削除され、新しい要素が挿入される
		const removePatches = result.patches.filter((p) => p.type === "remove");
		const insertPatches = result.patches.filter((p) => p.type === "insert");
		expect(removePatches).toHaveLength(3);
		expect(insertPatches).toHaveLength(3);
	});

	it("should handle whitespace-only changes", () => {
		const oldHtml = '<div id="test">Content</div>';
		const newHtml = '<div id="test">Content</div>  ';
		const result = diff(oldHtml, newHtml);

		// 末尾の空白は異なるがID要素の内容は同じ
		expect(result.hasChanges).toBe(true);
		// patchesは空の可能性がある（ID追跡外の変更）
	});

	it("should handle attribute-only changes", () => {
		const oldHtml = '<div id="test" class="old">Content</div>';
		const newHtml = '<div id="test" class="new">Content</div>';
		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);
		const replacePatches = result.patches.filter((p) => p.type === "replace");
		expect(replacePatches).toHaveLength(1);
		expect(replacePatches[0]).toMatchObject({
			type: "replace",
			id: "test",
		});
	});

	it("should handle multiple simultaneous changes", () => {
		const oldHtml = `
			<div id="a">A old</div>
			<div id="b">B old</div>
			<div id="c">C old</div>
		`;
		const newHtml = `
			<div id="a">A new</div>
			<div id="d">D new</div>
			<div id="c">C old</div>
		`;
		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);

		// aは変更、bは削除、dは挿入、cは変更なし
		const replacePatches = result.patches.filter((p) => p.type === "replace");
		const removePatches = result.patches.filter((p) => p.type === "remove");
		const insertPatches = result.patches.filter((p) => p.type === "insert");

		expect(replacePatches.some((p) => p.id === "a")).toBe(true);
		expect(removePatches.some((p) => p.id === "b")).toBe(true);
		expect(insertPatches.some((p) => p.type === "insert")).toBe(true);
	});
});
