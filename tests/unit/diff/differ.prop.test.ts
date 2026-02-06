import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { diff, toWebSocketPatches } from "../../../src/diff/differ";

/** Generate a valid HTML id */
const validIdArb = fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_-]{0,20}$/);

/** Build a simple element */
function makeElement(tag: string, id: string, content: string): string {
	return `<${tag} id="${id}">${content}</${tag}>`;
}

describe("diff property-based tests", () => {
	it("identical HTML always produces no patches and hasChanges=false", () => {
		const htmlArb = fc
			.array(validIdArb, { minLength: 1, maxLength: 5 })
			.filter((ids) => new Set(ids).size === ids.length)
			.map((ids) => ids.map((id) => makeElement("div", id, `text-${id}`)).join("\n"));

		fc.assert(
			fc.property(htmlArb, (html) => {
				const result = diff(html, html);
				expect(result.hasChanges).toBe(false);
				expect(result.patches).toHaveLength(0);
			}),
		);
	});

	it("removing an element always produces a remove patch", () => {
		const idsArb = fc
			.array(validIdArb, { minLength: 2, maxLength: 5 })
			.filter((ids) => new Set(ids).size === ids.length);

		fc.assert(
			fc.property(idsArb, (ids) => {
				const oldHtml = ids.map((id) => makeElement("div", id, "content")).join("\n");
				// Remove the last element
				const newHtml = ids
					.slice(0, -1)
					.map((id) => makeElement("div", id, "content"))
					.join("\n");

				const result = diff(oldHtml, newHtml);
				expect(result.hasChanges).toBe(true);

				const removedId = ids[ids.length - 1];
				const removePatches = result.patches.filter((p) => p.type === "remove");
				expect(removePatches.some((p) => p.type === "remove" && p.id === removedId)).toBe(true);
			}),
		);
	});

	it("adding an element always produces an insert patch", () => {
		const idsArb = fc
			.array(validIdArb, { minLength: 1, maxLength: 4 })
			.filter((ids) => new Set(ids).size === ids.length);
		const newIdArb = validIdArb;

		fc.assert(
			fc.property(idsArb, newIdArb, (ids, newId) => {
				fc.pre(!ids.includes(newId)); // new id must not already exist

				const oldHtml = ids.map((id) => makeElement("div", id, "content")).join("\n");
				const newHtml = `${oldHtml}\n${makeElement("div", newId, "new content")}`;

				const result = diff(oldHtml, newHtml);
				expect(result.hasChanges).toBe(true);

				const insertPatches = result.patches.filter((p) => p.type === "insert");
				expect(insertPatches.length).toBeGreaterThanOrEqual(1);
			}),
		);
	});

	it("changing element content always produces a replace patch", () => {
		const idsArb = fc
			.array(validIdArb, { minLength: 1, maxLength: 5 })
			.filter((ids) => new Set(ids).size === ids.length);

		fc.assert(
			fc.property(idsArb, (ids) => {
				const oldHtml = ids.map((id) => makeElement("div", id, "old")).join("\n");
				// Change content of the first element
				const newHtml = ids
					.map((id, i) => makeElement("div", id, i === 0 ? "new" : "old"))
					.join("\n");

				const result = diff(oldHtml, newHtml);
				expect(result.hasChanges).toBe(true);

				const replacePatches = result.patches.filter((p) => p.type === "replace");
				expect(replacePatches.some((p) => p.type === "replace" && p.id === ids[0])).toBe(true);
			}),
		);
	});

	it("patch types are always valid", () => {
		const idsArb = fc
			.array(validIdArb, { minLength: 1, maxLength: 5 })
			.filter((ids) => new Set(ids).size === ids.length);

		fc.assert(
			fc.property(idsArb, idsArb, (oldIds, newIds) => {
				const oldHtml = oldIds.map((id) => makeElement("div", id, "content")).join("\n");
				const newHtml = newIds.map((id) => makeElement("div", id, "content")).join("\n");

				const result = diff(oldHtml, newHtml);
				for (const patch of result.patches) {
					expect(["replace", "remove", "insert"]).toContain(patch.type);
				}
			}),
		);
	});

	it("replace patches always reference ids that exist in old HTML", () => {
		const idsArb = fc
			.array(validIdArb, { minLength: 1, maxLength: 5 })
			.filter((ids) => new Set(ids).size === ids.length);

		fc.assert(
			fc.property(idsArb, (ids) => {
				const oldHtml = ids.map((id) => makeElement("div", id, "old")).join("\n");
				const newHtml = ids.map((id) => makeElement("div", id, "new")).join("\n");

				const result = diff(oldHtml, newHtml);
				const replacePatches = result.patches.filter((p) => p.type === "replace");
				for (const patch of replacePatches) {
					if (patch.type === "replace") {
						expect(ids).toContain(patch.id);
					}
				}
			}),
		);
	});

	it("remove patches always reference ids that exist in old but not new HTML", () => {
		const oldIdsArb = fc
			.array(validIdArb, { minLength: 2, maxLength: 5 })
			.filter((ids) => new Set(ids).size === ids.length);

		fc.assert(
			fc.property(oldIdsArb, (oldIds) => {
				// Remove a random subset
				const newIds = oldIds.slice(0, Math.max(1, oldIds.length - 1));
				const removedIds = new Set(oldIds.filter((id) => !newIds.includes(id)));

				const oldHtml = oldIds.map((id) => makeElement("div", id, "c")).join("\n");
				const newHtml = newIds.map((id) => makeElement("div", id, "c")).join("\n");

				const result = diff(oldHtml, newHtml);
				const removePatches = result.patches.filter((p) => p.type === "remove");

				for (const patch of removePatches) {
					if (patch.type === "remove") {
						expect(removedIds.has(patch.id)).toBe(true);
					}
				}
			}),
		);
	});
});

describe("toWebSocketPatches property-based tests", () => {
	it("no changes produces empty patches", () => {
		const htmlArb = fc
			.array(validIdArb, { minLength: 1, maxLength: 5 })
			.filter((ids) => new Set(ids).size === ids.length)
			.map((ids) => ids.map((id) => makeElement("div", id, "text")).join("\n"));

		fc.assert(
			fc.property(htmlArb, (html) => {
				const result = diff(html, html);
				const wsPatches = toWebSocketPatches(result, html);
				expect(wsPatches).toHaveLength(0);
			}),
		);
	});

	it("WebSocket patches always have a valid type", () => {
		const idsArb = fc
			.array(validIdArb, { minLength: 1, maxLength: 5 })
			.filter((ids) => new Set(ids).size === ids.length);

		fc.assert(
			fc.property(idsArb, idsArb, (oldIds, newIds) => {
				const oldHtml = oldIds.map((id) => makeElement("div", id, "c")).join("\n");
				const newHtml = newIds.map((id) => makeElement("div", id, "c")).join("\n");

				const result = diff(oldHtml, newHtml);
				const wsPatches = toWebSocketPatches(result, newHtml);

				for (const patch of wsPatches) {
					expect(["replaceNode", "removeNode", "insertNode", "replaceRoot"]).toContain(patch.type);
				}
			}),
		);
	});

	it("many changes fall back to replaceRoot", () => {
		// Generate enough distinct ids to exceed PATCH_THRESHOLD (10)
		const idsArb = fc
			.array(validIdArb, { minLength: 11, maxLength: 15 })
			.filter((ids) => new Set(ids).size === ids.length);

		fc.assert(
			fc.property(idsArb, (ids) => {
				const oldHtml = ids.map((id) => makeElement("div", id, "old")).join("\n");
				const newHtml = ids.map((id) => makeElement("div", id, "new")).join("\n");

				const result = diff(oldHtml, newHtml);
				const wsPatches = toWebSocketPatches(result, newHtml);

				// All changed → exceeds threshold → replaceRoot
				expect(wsPatches).toHaveLength(1);
				expect(wsPatches[0].type).toBe("replaceRoot");
			}),
		);
	});
});
