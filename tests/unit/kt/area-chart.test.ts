import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { area_chart } from "../../../src/kt/charts";
import { RenderContext, setRenderContext } from "../../../src/kt/context";

describe("kt.area_chart", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
	});

	afterEach(() => {
		setRenderContext(null);
	});

	it("renders chart HTML to context", () => {
		area_chart([10, 20, 30]);
		const html = ctx.getHtml();
		expect(html).toContain("kt-area-chart");
		expect(html).toContain("<svg");
	});

	it("renders object array with config", () => {
		area_chart(
			[
				{ month: "Jan", revenue: 100 },
				{ month: "Feb", revenue: 120 },
			],
			{ x: "month", y: "revenue", title: "Revenue" },
		);
		const html = ctx.getHtml();
		expect(html).toContain("Revenue");
		expect(html).toContain("Jan");
		expect(html).toContain("Feb");
	});

	it("renders stacked area chart", () => {
		area_chart(
			[
				{ month: "Jan", a: 10, b: 20 },
				{ month: "Feb", a: 15, b: 25 },
			],
			{ stack: true },
		);
		const html = ctx.getHtml();
		expect(html).toContain("kt-area-chart");
	});

	it("throws error without render context", () => {
		setRenderContext(null);
		expect(() => area_chart([10, 20])).toThrow();
	});

	it("applies area chart CSS class", () => {
		area_chart([10, 20]);
		const html = ctx.getHtml();
		expect(html).toContain("kt-area-chart");
	});
});
