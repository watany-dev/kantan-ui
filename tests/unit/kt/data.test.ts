import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { normalizeTableData, type TableData, table } from "../../../src/kt/data";

describe("Table Data", () => {
	describe("normalizeTableData", () => {
		it("should normalize object array to headers and rows", () => {
			const data: TableData = [
				{ name: "Alice", age: 30 },
				{ name: "Bob", age: 25 },
			];

			const result = normalizeTableData(data);

			expect(result.headers).toEqual(["name", "age"]);
			expect(result.rows).toEqual([
				["Alice", 30],
				["Bob", 25],
			]);
		});

		it("should use explicit headers when provided", () => {
			const data: TableData = [
				{ name: "Alice", age: 30 },
				{ name: "Bob", age: 25 },
			];

			const result = normalizeTableData(data, ["age", "name"]);

			expect(result.headers).toEqual(["age", "name"]);
			expect(result.rows).toEqual([
				[30, "Alice"],
				[25, "Bob"],
			]);
		});

		it("should handle 2D array", () => {
			const data: TableData = [
				["Alice", 30],
				["Bob", 25],
			];

			const result = normalizeTableData(data);

			expect(result.headers).toEqual([]);
			expect(result.rows).toEqual([
				["Alice", 30],
				["Bob", 25],
			]);
		});

		it("should handle 2D array with explicit headers", () => {
			const data: TableData = [
				["Alice", 30],
				["Bob", 25],
			];

			const result = normalizeTableData(data, ["Name", "Age"]);

			expect(result.headers).toEqual(["Name", "Age"]);
			expect(result.rows).toEqual([
				["Alice", 30],
				["Bob", 25],
			]);
		});

		it("should use first row as header when useFirstRowAsHeader is true", () => {
			const data: TableData = [
				["製品", "2024年Q1", "2024年Q2", "2024年Q3"],
				["製品A", 100000, 120000, 150000],
				["製品B", 80000, 95000, 110000],
				["製品C", 60000, 70000, 85000],
			];

			const result = normalizeTableData(data, undefined, true);

			expect(result.headers).toEqual(["製品", "2024年Q1", "2024年Q2", "2024年Q3"]);
			expect(result.rows).toEqual([
				["製品A", 100000, 120000, 150000],
				["製品B", 80000, 95000, 110000],
				["製品C", 60000, 70000, 85000],
			]);
		});

		it("should ignore useFirstRowAsHeader for non-2D arrays", () => {
			const data: TableData = [
				{ name: "Alice", age: 30 },
				{ name: "Bob", age: 25 },
			];

			const result = normalizeTableData(data, undefined, true);

			expect(result.headers).toEqual(["name", "age"]);
			expect(result.rows).toEqual([
				["Alice", 30],
				["Bob", 25],
			]);
		});

		it("should handle explicit format with columns and data", () => {
			const data: TableData = {
				columns: ["Name", "Age"],
				data: [
					["Alice", 30],
					["Bob", 25],
				],
			};

			const result = normalizeTableData(data);

			expect(result.headers).toEqual(["Name", "Age"]);
			expect(result.rows).toEqual([
				["Alice", 30],
				["Bob", 25],
			]);
		});

		it("should handle empty array", () => {
			const data: TableData = [];

			const result = normalizeTableData(data);

			expect(result.headers).toEqual([]);
			expect(result.rows).toEqual([]);
		});

		it("should handle undefined values in object", () => {
			const data: TableData = [{ name: "Alice", age: undefined }];

			const result = normalizeTableData(data);

			expect(result.rows).toEqual([["Alice", undefined]]);
		});
	});
});

describe("table function", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
	});

	afterEach(() => {
		setRenderContext(null);
	});

	it("should render basic table with object array", () => {
		table([
			{ name: "Alice", age: 30 },
			{ name: "Bob", age: 25 },
		]);

		const html = ctx.getHtml();
		expect(html).toContain('<table class="kt-table">');
		expect(html).toContain("<thead>");
		expect(html).toContain("<th>name</th>");
		expect(html).toContain("<th>age</th>");
		expect(html).toContain("<tbody>");
		expect(html).toContain("<td>Alice</td>");
		expect(html).toContain("<td>30</td>");
	});

	it("should render table with 2D array (no headers)", () => {
		table([
			["Alice", 30],
			["Bob", 25],
		]);

		const html = ctx.getHtml();
		expect(html).toContain('<table class="kt-table">');
		expect(html).not.toContain("<thead>");
		expect(html).toContain("<td>Alice</td>");
	});

	it("should render table with explicit headers for 2D array", () => {
		table(
			[
				["Alice", 30],
				["Bob", 25],
			],
			{ headers: ["Name", "Age"] },
		);

		const html = ctx.getHtml();
		expect(html).toContain("<th>Name</th>");
		expect(html).toContain("<th>Age</th>");
	});

	it("should escape HTML in cell content", () => {
		table([{ name: '<script>alert("xss")</script>' }]);

		const html = ctx.getHtml();
		expect(html).toContain("&lt;script&gt;");
		expect(html).not.toContain("<script>");
	});

	it("should escape HTML in headers", () => {
		table([{ '<img src="x" onerror="alert(1)">': "value" }]);

		const html = ctx.getHtml();
		expect(html).toContain("&lt;img");
		expect(html).not.toContain('onerror="alert(1)"');
	});

	it("should handle empty data", () => {
		table([]);

		const html = ctx.getHtml();
		expect(html).toContain('<table class="kt-table">');
		expect(html).toContain("<tbody></tbody>");
	});

	it("should render table with 2D array using first row as header", () => {
		const sales2D = [
			["製品", "2024年Q1", "2024年Q2", "2024年Q3"],
			["製品A", 100000, 120000, 150000],
			["製品B", 80000, 95000, 110000],
			["製品C", 60000, 70000, 85000],
		];

		table(sales2D, { useFirstRowAsHeader: true });

		const html = ctx.getHtml();
		expect(html).toContain("<thead>");
		expect(html).toContain("<th>製品</th>");
		expect(html).toContain("<th>2024年Q1</th>");
		expect(html).toContain("<th>2024年Q2</th>");
		expect(html).toContain("<th>2024年Q3</th>");
		expect(html).toContain("<td>製品A</td>");
		expect(html).toContain("<td>100000</td>");
		// First row should NOT be in tbody
		expect(html).not.toContain("<td>製品</td>");
	});
});
