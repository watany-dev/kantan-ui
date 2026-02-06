import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	resetSessionManager,
	SessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import {
	initializeDataframeSelection,
	isValidSelection,
	normalizeSelection,
	renderDataframe,
	reorderColumns,
} from "../../../src/widgets/dataframe";
import { resetWidgetCounter } from "../../../src/widgets/registry";

describe("dataframe", () => {
	let manager: SessionManager;

	beforeEach(() => {
		resetWidgetCounter();
		manager = new SessionManager();
		setSessionManager(manager);
	});

	afterEach(() => {
		setCurrentSessionId(null);
		resetSessionManager();
	});

	describe("isValidSelection", () => {
		it("should return true for valid selection", () => {
			expect(isValidSelection({ rows: [0, 1, 2] })).toBe(true);
		});

		it("should return true for empty selection", () => {
			expect(isValidSelection({ rows: [] })).toBe(true);
		});

		it("should return false for null", () => {
			expect(isValidSelection(null)).toBe(false);
		});

		it("should return false for undefined", () => {
			expect(isValidSelection(undefined)).toBe(false);
		});

		it("should return false for non-object", () => {
			expect(isValidSelection("not an object")).toBe(false);
		});

		it("should return false when rows is not an array", () => {
			expect(isValidSelection({ rows: "not an array" })).toBe(false);
		});

		it("should return false when rows contains non-integer", () => {
			expect(isValidSelection({ rows: [0, 1.5] })).toBe(false);
		});

		it("should return false when rows contains negative number", () => {
			expect(isValidSelection({ rows: [0, -1] })).toBe(false);
		});

		it("should return false when rows contains non-number", () => {
			expect(isValidSelection({ rows: [0, "1"] })).toBe(false);
		});
	});

	describe("normalizeSelection", () => {
		it("should return valid selection as-is when within bounds", () => {
			const result = normalizeSelection({ rows: [0, 2] }, 5);
			expect(result).toEqual({ rows: [0, 2] });
		});

		it("should filter out-of-bounds rows", () => {
			const result = normalizeSelection({ rows: [0, 5, 10] }, 5);
			expect(result).toEqual({ rows: [0] });
		});

		it("should return empty selection for invalid input", () => {
			const result = normalizeSelection("invalid", 5);
			expect(result).toEqual({ rows: [] });
		});

		it("should return empty selection for null", () => {
			const result = normalizeSelection(null, 5);
			expect(result).toEqual({ rows: [] });
		});
	});

	describe("reorderColumns", () => {
		it("should reorder columns based on columnOrder", () => {
			const result = reorderColumns(
				["name", "age", "city"],
				[
					["Alice", 30, "Tokyo"],
					["Bob", 25, "Osaka"],
				],
				["city", "name"],
			);

			expect(result.headers).toEqual(["city", "name"]);
			expect(result.rows).toEqual([
				["Tokyo", "Alice"],
				["Osaka", "Bob"],
			]);
		});

		it("should skip columns not in headers", () => {
			const result = reorderColumns(
				["name", "age"],
				[["Alice", 30]],
				["name", "nonexistent", "age"],
			);

			expect(result.headers).toEqual(["name", "age"]);
			expect(result.rows).toEqual([["Alice", 30]]);
		});

		it("should handle empty columnOrder", () => {
			const result = reorderColumns(["name", "age"], [["Alice", 30]], []);

			expect(result.headers).toEqual([]);
			expect(result.rows).toEqual([[]]);
		});
	});

	describe("initializeDataframeSelection", () => {
		it("should initialize empty selection on first call", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const selection = initializeDataframeSelection("df_0");

			expect(selection).toEqual({ rows: [] });
		});

		it("should return stored selection on subsequent calls", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			initializeDataframeSelection("df_0");
			manager.setState(session.id, "df_0", { rows: [1, 3] });

			const selection = initializeDataframeSelection("df_0");

			expect(selection).toEqual({ rows: [1, 3] });
		});
	});

	describe("renderDataframe", () => {
		const sampleData = {
			headers: ["name", "age", "city"],
			rows: [
				["Alice", 30, "Tokyo"],
				["Bob", 25, "Osaka"],
				["Charlie", 35, "Nagoya"],
			],
		};

		it("should render dataframe container with default height", () => {
			const html = renderDataframe(sampleData, { key: "df_0" });

			expect(html).toContain('class="kt-dataframe-container"');
			expect(html).toContain("height: 400px");
		});

		it("should render dataframe container with custom height", () => {
			const html = renderDataframe(sampleData, { key: "df_0", height: 300 });

			expect(html).toContain("height: 300px");
		});

		it("should render search toolbar", () => {
			const html = renderDataframe(sampleData, { key: "df_0" });

			expect(html).toContain('class="kt-dataframe-search"');
			expect(html).toContain('placeholder="Search..."');
			expect(html).toContain('data-kt-dataframe-search="df_0"');
		});

		it("should render row count", () => {
			const html = renderDataframe(sampleData, { key: "df_0" });

			expect(html).toContain("3 rows");
		});

		it("should render sortable column headers", () => {
			const html = renderDataframe(sampleData, { key: "df_0" });

			expect(html).toContain('data-kt-dataframe-sort="df_0"');
			expect(html).toContain('class="kt-dataframe-sortable"');
			expect(html).toContain("name");
			expect(html).toContain("age");
			expect(html).toContain("city");
		});

		it("should render sort icons", () => {
			const html = renderDataframe(sampleData, { key: "df_0" });

			expect(html).toContain('class="kt-dataframe-sort-icon"');
		});

		it("should render index column by default", () => {
			const html = renderDataframe(sampleData, { key: "df_0" });

			expect(html).toContain('class="kt-dataframe-index-col"');
			expect(html).toContain("#");
		});

		it("should hide index column when hideIndex is true", () => {
			const html = renderDataframe(sampleData, {
				key: "df_0",
				hideIndex: true,
			});

			expect(html).not.toContain('class="kt-dataframe-index-col"');
		});

		it("should render data rows with data-row attribute", () => {
			const html = renderDataframe(sampleData, { key: "df_0" });

			expect(html).toContain('data-row="0"');
			expect(html).toContain('data-row="1"');
			expect(html).toContain('data-row="2"');
		});

		it("should render cell content", () => {
			const html = renderDataframe(sampleData, { key: "df_0" });

			expect(html).toContain("<td>Alice</td>");
			expect(html).toContain("<td>30</td>");
			expect(html).toContain("<td>Tokyo</td>");
		});

		it("should escape HTML in cell content", () => {
			const data = {
				headers: ["name"],
				rows: [['<script>alert("xss")</script>']],
			};
			const html = renderDataframe(data, { key: "df_0" });

			expect(html).toContain("&lt;script&gt;");
			expect(html).not.toContain("<script>alert");
		});

		it("should escape HTML in headers", () => {
			const data = {
				headers: ['<img onerror="alert(1)">'],
				rows: [["value"]],
			};
			const html = renderDataframe(data, { key: "df_0" });

			expect(html).toContain("&lt;img");
			expect(html).not.toContain('onerror="alert(1)"');
		});

		it("should handle null and undefined cell values", () => {
			const data = {
				headers: ["a", "b"],
				rows: [[null, undefined]],
			};
			const html = renderDataframe(data, { key: "df_0" });

			expect(html).toContain("<td></td>");
		});

		it("should render empty table when no rows", () => {
			const data = { headers: ["name"], rows: [] as unknown[][] };
			const html = renderDataframe(data, { key: "df_0" });

			expect(html).toContain("0 rows");
			expect(html).toContain("<tbody></tbody>");
		});

		describe("columnOrder", () => {
			it("should reorder columns when columnOrder is specified", () => {
				const html = renderDataframe(sampleData, {
					key: "df_0",
					columnOrder: ["city", "name"],
				});

				// city should appear before name in the headers
				const cityIndex = html.indexOf(">city<");
				const nameIndex = html.indexOf(">name<");
				expect(cityIndex).toBeLessThan(nameIndex);
			});
		});

		describe("selection mode", () => {
			it("should not render checkboxes when onSelect is ignore", () => {
				const html = renderDataframe(sampleData, {
					key: "df_0",
					onSelect: "ignore",
				});

				expect(html).not.toContain("data-kt-dataframe-row");
				expect(html).not.toContain('type="checkbox"');
			});

			it("should not render checkboxes when onSelect is not set", () => {
				const html = renderDataframe(sampleData, { key: "df_0" });

				expect(html).not.toContain("data-kt-dataframe-row");
			});

			it("should render checkboxes when onSelect is rerun with multi-row", () => {
				const session = manager.createSession();
				setCurrentSessionId(session.id);

				const html = renderDataframe(sampleData, {
					key: "df_0",
					onSelect: "rerun",
					selectionMode: "multi-row",
				});

				expect(html).toContain('type="checkbox"');
				expect(html).toContain('data-kt-dataframe-row="df_0"');
				expect(html).toContain('data-kt-dataframe-select-all="df_0"');
			});

			it("should render radio buttons when onSelect is rerun with single-row", () => {
				const session = manager.createSession();
				setCurrentSessionId(session.id);

				const html = renderDataframe(sampleData, {
					key: "df_0",
					onSelect: "rerun",
					selectionMode: "single-row",
				});

				expect(html).toContain('type="radio"');
				expect(html).toContain('name="df_0-select"');
			});

			it("should render selected rows with checked attribute", () => {
				const session = manager.createSession();
				setCurrentSessionId(session.id);
				manager.setState(session.id, "df_0", { rows: [1] });

				const html = renderDataframe(sampleData, {
					key: "df_0",
					onSelect: "rerun",
					selectionMode: "multi-row",
				});

				expect(html).toContain('value="1" checked');
				expect(html).not.toContain('value="0" checked');
			});

			it("should add selected class to selected rows", () => {
				const session = manager.createSession();
				setCurrentSessionId(session.id);
				manager.setState(session.id, "df_0", { rows: [0, 2] });

				const html = renderDataframe(sampleData, {
					key: "df_0",
					onSelect: "rerun",
					selectionMode: "multi-row",
				});

				expect(html).toContain('data-row="0" class=" kt-dataframe-selected"');
				expect(html).toContain('data-row="2" class=" kt-dataframe-selected"');
				expect(html).not.toContain('data-row="1" class=" kt-dataframe-selected"');
			});
		});
	});
});
