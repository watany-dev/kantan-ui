import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isValidId, PARSER_LIMITS, parseHtml } from "../../../src/diff/parser";

/** Generate a valid HTML id */
const validIdArb = fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_-]{0,20}$/);

/** Generate a simple HTML element with an id */
function makeElement(tag: string, id: string, content: string): string {
	return `<${tag} id="${id}">${content}</${tag}>`;
}

/** Generate a self-closing element with an id */
function makeSelfClosing(id: string): string {
	return `<input id="${id}" type="text" />`;
}

describe("parseHtml property-based tests", () => {
	it("same HTML parsed twice gives the same result (deterministic)", () => {
		const htmlArb = fc
			.array(validIdArb, { minLength: 1, maxLength: 5 })
			.filter((ids) => new Set(ids).size === ids.length) // unique ids
			.map((ids) => ids.map((id) => makeElement("div", id, `content-${id}`)).join("\n"));

		fc.assert(
			fc.property(htmlArb, (html) => {
				const first = parseHtml(html);
				const second = parseHtml(html);
				expect(first).toEqual(second);
			}),
		);
	});

	it("all returned nodes have non-empty id and tag", () => {
		const htmlArb = fc
			.array(validIdArb, { minLength: 1, maxLength: 10 })
			.filter((ids) => new Set(ids).size === ids.length)
			.map((ids) => ids.map((id) => makeElement("div", id, "text")).join("\n"));

		fc.assert(
			fc.property(htmlArb, (html) => {
				const nodes = parseHtml(html);
				for (const node of nodes) {
					expect(node.id.length).toBeGreaterThan(0);
					expect(node.tag.length).toBeGreaterThan(0);
					expect(isValidId(node.id)).toBe(true);
				}
			}),
		);
	});

	it("returned node count never exceeds the number of id-bearing elements", () => {
		const htmlArb = fc
			.array(validIdArb, { minLength: 1, maxLength: 10 })
			.filter((ids) => new Set(ids).size === ids.length)
			.map((ids) => ids.map((id) => makeElement("span", id, "x")).join("\n"));

		fc.assert(
			fc.property(htmlArb, (html) => {
				const ids = html.match(/id="([^"]+)"/g) ?? [];
				const nodes = parseHtml(html);
				expect(nodes.length).toBeLessThanOrEqual(ids.length);
			}),
		);
	});

	it("order is always a non-negative integer", () => {
		const htmlArb = fc
			.array(validIdArb, { minLength: 1, maxLength: 10 })
			.filter((ids) => new Set(ids).size === ids.length)
			.map((ids) => ids.map((id) => makeElement("div", id, "c")).join(""));

		fc.assert(
			fc.property(htmlArb, (html) => {
				const nodes = parseHtml(html);
				for (const node of nodes) {
					expect(Number.isInteger(node.order)).toBe(true);
					expect(node.order).toBeGreaterThanOrEqual(0);
				}
			}),
		);
	});

	it("parentId is null or references another node's id", () => {
		const htmlArb = fc
			.array(validIdArb, { minLength: 2, maxLength: 5 })
			.filter((ids) => new Set(ids).size === ids.length)
			.map((ids) => {
				// Create nested structure: first wraps the rest
				const inner = ids
					.slice(1)
					.map((id) => makeElement("span", id, "inner"))
					.join("");
				return makeElement("div", ids[0], inner);
			});

		fc.assert(
			fc.property(htmlArb, (html) => {
				const nodes = parseHtml(html);
				const nodeIds = new Set(nodes.map((n) => n.id));
				for (const node of nodes) {
					if (node.parentId !== null) {
						expect(nodeIds.has(node.parentId)).toBe(true);
					}
				}
			}),
		);
	});

	it("self-closing tags produce nodes with correct tag", () => {
		const idsArb = fc
			.array(validIdArb, { minLength: 1, maxLength: 5 })
			.filter((ids) => new Set(ids).size === ids.length);

		fc.assert(
			fc.property(idsArb, (ids) => {
				const html = ids.map((id) => makeSelfClosing(id)).join("\n");
				const nodes = parseHtml(html);
				for (const node of nodes) {
					expect(node.tag).toBe("input");
				}
			}),
		);
	});

	it("empty HTML returns empty array", () => {
		expect(parseHtml("")).toEqual([]);
		expect(parseHtml("<div>no ids here</div>")).toEqual([]);
	});

	it("throws on HTML exceeding size limit", () => {
		const oversized = "a".repeat(PARSER_LIMITS.MAX_HTML_SIZE + 1);
		expect(() => parseHtml(oversized)).toThrow(/size exceeds limit/);
	});
});

describe("isValidId property-based tests", () => {
	it("accepts ids matching the pattern [a-zA-Z_][a-zA-Z0-9_-]*", () => {
		fc.assert(
			fc.property(validIdArb, (id) => {
				expect(isValidId(id)).toBe(true);
			}),
		);
	});

	it("rejects empty strings", () => {
		expect(isValidId("")).toBe(false);
	});

	it("rejects ids starting with a digit", () => {
		const digitStartArb = fc
			.tuple(fc.stringMatching(/^[0-9]$/), fc.stringMatching(/^[a-zA-Z0-9_-]{0,10}$/))
			.map(([d, rest]) => d + rest);

		fc.assert(
			fc.property(digitStartArb, (id) => {
				expect(isValidId(id)).toBe(false);
			}),
		);
	});

	it("rejects ids exceeding MAX_ID_LENGTH", () => {
		const longIdArb = fc
			.integer({ min: PARSER_LIMITS.MAX_ID_LENGTH + 1, max: 300 })
			.map((len) => `a${"b".repeat(len - 1)}`);

		fc.assert(
			fc.property(longIdArb, (id) => {
				expect(isValidId(id)).toBe(false);
			}),
		);
	});
});
