import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { line_chart } from "../../../src/kt/charts";
import { RenderContext, setRenderContext } from "../../../src/kt/context";

describe("kt.line_chart", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
	});

	afterEach(() => {
		setRenderContext(null);
	});

	it("should append chart HTML to render context", () => {
		line_chart([10, 20, 30]);

		const html = ctx.getHtml();
		expect(html).toContain("kt-line-chart");
		expect(html).toContain("<svg");
	});

	it("should render empty state for empty data", () => {
		line_chart([]);

		const html = ctx.getHtml();
		expect(html).toContain("kt-line-chart-empty");
	});

	it("should render object array data", () => {
		line_chart([
			{ month: "Jan", sales: 100 },
			{ month: "Feb", sales: 120 },
		]);

		const html = ctx.getHtml();
		expect(html).toContain("<svg");
		expect(html).toContain("kt-line-chart-line");
	});

	it("should accept config options", () => {
		line_chart(
			[
				{ month: "Jan", sales: 100, profit: 50 },
				{ month: "Feb", sales: 120, profit: 60 },
			],
			{
				x: "month",
				y: ["sales", "profit"],
				x_label: "Month",
				y_label: "Amount",
				color: ["#ff0000", "#0000ff"],
				height: 300,
			},
		);

		const html = ctx.getHtml();
		expect(html).toContain("Month");
		expect(html).toContain("Amount");
		expect(html).toContain("#ff0000");
		expect(html).toContain("#0000ff");
		expect(html).toContain('viewBox="0 0 800 300"');
	});

	it("should render 2D array data", () => {
		line_chart([
			[10, 100],
			[20, 200],
			[30, 300],
		]);

		const html = ctx.getHtml();
		expect(html).toContain("<svg");
		// Two series from two columns
		expect(html.match(/kt-line-chart-line/g)?.length).toBe(2);
	});

	it("should render explicit format data", () => {
		line_chart({
			columns: ["revenue", "cost"],
			data: [
				[100, 60],
				[120, 70],
				[150, 80],
			],
		});

		const html = ctx.getHtml();
		expect(html).toContain("<svg");
		expect(html).toContain("kt-line-chart-legend");
	});

	it("should throw error without render context", () => {
		setRenderContext(null);
		expect(() => line_chart([10, 20])).toThrow();
	});
});
