import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bar_chart } from "../../../src/kt/charts";
import { RenderContext, setRenderContext } from "../../../src/kt/context";

describe("kt.bar_chart", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
	});

	afterEach(() => {
		setRenderContext(null);
	});

	it("renders chart HTML to context", () => {
		bar_chart([10, 20, 30]);
		const html = ctx.getHtml();
		expect(html).toContain("kt-bar-chart");
		expect(html).toContain("<svg");
	});

	it("renders Record<string, number> shorthand", () => {
		bar_chart({ React: 45, Vue: 30 });
		const html = ctx.getHtml();
		expect(html).toContain("<rect");
		expect(html).toContain("React");
		expect(html).toContain("Vue");
	});

	it("renders object array with config", () => {
		bar_chart(
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

	it("throws error without render context", () => {
		setRenderContext(null);
		expect(() => bar_chart([10, 20])).toThrow();
	});

	it("applies bar chart CSS class", () => {
		bar_chart([10, 20]);
		const html = ctx.getHtml();
		expect(html).toContain("kt-bar-chart");
	});
});
