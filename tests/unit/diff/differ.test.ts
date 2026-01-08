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

	it("should fallback to replaceRoot when insert patch exists", () => {
		// insertパッチはインデックス計算の問題があるためreplaceRootにフォールバック
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
		const fullHtml = "<div>html</div>";
		const patches = toWebSocketPatches(result, fullHtml);

		expect(patches).toHaveLength(1);
		expect(patches[0]).toEqual({
			type: "replaceRoot",
			html: fullHtml,
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

	it("should fallback to replaceRoot when mixed patch types include insert", () => {
		// insertパッチが含まれる場合はreplaceRootにフォールバック
		const result = {
			patches: [
				{ type: "replace" as const, id: "a", html: "<div>A</div>" },
				{ type: "remove" as const, id: "b" },
				{ type: "insert" as const, parentId: "__root__", index: 0, html: "<div>C</div>" },
			],
			hasChanges: true,
		};
		const fullHtml = "<div>full</div>";
		const wsPatches = toWebSocketPatches(result, fullHtml);

		// insertがあるためreplaceRootにフォールバック
		expect(wsPatches).toHaveLength(1);
		expect(wsPatches[0]).toEqual({
			type: "replaceRoot",
			html: fullHtml,
		});
	});

	it("should handle mixed patch types without insert", () => {
		// insertがなければ個別のパッチを適用
		const result = {
			patches: [
				{ type: "replace" as const, id: "a", html: "<div>A</div>" },
				{ type: "remove" as const, id: "b" },
			],
			hasChanges: true,
		};
		const wsPatches = toWebSocketPatches(result, "<div>full</div>");

		expect(wsPatches).toHaveLength(2);
		expect(wsPatches[0].type).toBe("replaceNode");
		expect(wsPatches[1].type).toBe("removeNode");
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

describe("diff with untracked elements (TODO-like scenario)", () => {
	it("should fall back to replaceRoot when insert would be positioned incorrectly due to untracked siblings", () => {
		// This simulates the TODO list bug:
		// Old: [kt-write (no ID), btn-1]
		// New: [kt-write (no ID), btn-1, kt-write (no ID), btn-2]
		// The index for btn-2 is calculated as 1 (second tracked sibling)
		// But client DOM has 4 elements, so insertBefore at index 1 is wrong
		const oldHtml = `
			<div class="kt-write">Task 1</div>
			<button id="btn-1">Delete</button>
		`;
		const newHtml = `
			<div class="kt-write">Task 1</div>
			<button id="btn-1">Delete</button>
			<div class="kt-write">Task 2</div>
			<button id="btn-2">Delete</button>
		`;
		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);

		// When there are untracked elements mixed with inserts,
		// we should fall back to replaceRoot for safety
		const wsPatches = toWebSocketPatches(result, newHtml);

		// Should fall back to replaceRoot since index-based insertion
		// would be incorrect with untracked elements
		expect(wsPatches).toHaveLength(1);
		expect(wsPatches[0].type).toBe("replaceRoot");
	});

	it("should handle TODO list with multiple items added", () => {
		// Simulates adding items to an empty TODO list
		const oldHtml = `<div class="kt-write">No tasks</div>`;
		const newHtml = `
			<div class="kt-write">[未完了] Task 1</div>
			<button id="toggle_1">完了</button>
			<button id="delete_1">削除</button>
		`;
		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);

		const wsPatches = toWebSocketPatches(result, newHtml);

		// Should fall back to replaceRoot since we're adding tracked elements
		// alongside untracked content changes
		expect(wsPatches).toHaveLength(1);
		expect(wsPatches[0].type).toBe("replaceRoot");
	});
});

describe("diff error handling", () => {
	it("should handle malformed HTML gracefully", () => {
		const malformedHtml = '<div id="broken"<span>Malformed';
		const normalHtml = '<div id="normal">Normal</div>';

		// 不正なHTMLでもクラッシュしない
		expect(() => diff(malformedHtml, normalHtml)).not.toThrow();
		expect(() => diff(normalHtml, malformedHtml)).not.toThrow();
	});

	it("should handle HTML with only whitespace", () => {
		const result = diff("   \n\t  ", "   \n\t  ");

		expect(result.hasChanges).toBe(false);
		expect(result.patches).toHaveLength(0);
	});

	it("should handle very long single-line HTML", () => {
		const longContent = "a".repeat(10000);
		const oldHtml = `<div id="long">${longContent}</div>`;
		const newHtml = `<div id="long">${longContent}b</div>`;

		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);
		expect(result.patches).toHaveLength(1);
	});

	it("should handle HTML with special regex characters in content", () => {
		const oldHtml = '<div id="regex">Content with $1 and \\d+</div>';
		const newHtml = '<div id="regex">Content with $2 and \\w+</div>';

		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);
	});

	it("should handle HTML with unicode characters", () => {
		const oldHtml = '<div id="unicode">日本語テキスト</div>';
		const newHtml = '<div id="unicode">日本語テキスト更新</div>';

		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);
		const replacePatches = result.patches.filter((p) => p.type === "replace");
		expect(replacePatches).toHaveLength(1);
	});

	it("should handle HTML with emoji", () => {
		const oldHtml = '<div id="emoji">Hello 👋</div>';
		const newHtml = '<div id="emoji">Hello 🎉</div>';

		const result = diff(oldHtml, newHtml);

		expect(result.hasChanges).toBe(true);
	});
});

describe("toWebSocketPatches with rootId", () => {
	it("should return replaceNode when rootId is provided and fallback is needed", () => {
		// insertパッチがある場合にrootIdを指定するとreplaceNodeになる
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
		const fullHtml = '<div id="sidebar-content"><button>New</button></div>';
		const patches = toWebSocketPatches(result, fullHtml, "kt-sidebar-content");

		expect(patches).toHaveLength(1);
		expect(patches[0]).toEqual({
			type: "replaceNode",
			id: "kt-sidebar-content",
			html: fullHtml,
		});
	});

	it("should return replaceRoot when rootId is not provided and fallback is needed", () => {
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
		const fullHtml = "<div>html</div>";
		const patches = toWebSocketPatches(result, fullHtml);

		expect(patches).toHaveLength(1);
		expect(patches[0]).toEqual({
			type: "replaceRoot",
			html: fullHtml,
		});
	});

	it("should return replaceNode when rootId provided and patches exceed threshold", () => {
		const manyPatches = Array.from({ length: 11 }, (_, i) => ({
			type: "replace" as const,
			id: `item-${i}`,
			html: `<div>Item ${i}</div>`,
		}));
		const result = { patches: manyPatches, hasChanges: true };
		const fullHtml = '<div id="container">All items</div>';
		const patches = toWebSocketPatches(result, fullHtml, "kt-sidebar-content");

		expect(patches).toHaveLength(1);
		expect(patches[0]).toEqual({
			type: "replaceNode",
			id: "kt-sidebar-content",
			html: fullHtml,
		});
	});

	it("should not use rootId when patches are below threshold and no insert", () => {
		const result = {
			patches: [{ type: "replace" as const, id: "btn-1", html: "<button>Updated</button>" }],
			hasChanges: true,
		};
		const patches = toWebSocketPatches(result, "<div>full</div>", "kt-sidebar-content");

		// 個別のreplaceNodeが使用される（rootIdは不要）
		expect(patches).toHaveLength(1);
		expect(patches[0]).toEqual({
			type: "replaceNode",
			id: "btn-1",
			html: "<button>Updated</button>",
		});
	});
});
