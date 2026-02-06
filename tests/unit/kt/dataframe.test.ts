import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { dataframe, type TableData } from "../../../src/kt/data";
import {
	resetSessionManager,
	SessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { resetWidgetCounter } from "../../../src/widgets/registry";

describe("kt.dataframe", () => {
	let ctx: RenderContext;
	let manager: SessionManager;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
		resetWidgetCounter();
		manager = new SessionManager();
		setSessionManager(manager);
	});

	afterEach(() => {
		setRenderContext(null);
		setCurrentSessionId(null);
		resetSessionManager();
	});

	it("should render dataframe with object array", () => {
		dataframe([
			{ name: "Alice", age: 30 },
			{ name: "Bob", age: 25 },
		]);

		const html = ctx.getHtml();
		expect(html).toContain('class="kt-dataframe-container"');
		expect(html).toContain("name");
		expect(html).toContain("age");
		expect(html).toContain("Alice");
		expect(html).toContain("30");
	});

	it("should render dataframe with 2D array", () => {
		const data: TableData = [
			["Alice", 30],
			["Bob", 25],
		];
		dataframe(data);

		const html = ctx.getHtml();
		expect(html).toContain('class="kt-dataframe-container"');
		expect(html).toContain("Alice");
	});

	it("should render dataframe with explicit format", () => {
		const data: TableData = {
			columns: ["Name", "Age"],
			data: [
				["Alice", 30],
				["Bob", 25],
			],
		};
		dataframe(data);

		const html = ctx.getHtml();
		expect(html).toContain("Name");
		expect(html).toContain("Age");
	});

	it("should return void when onSelect is not set", () => {
		const result = dataframe([{ name: "Alice" }]);

		expect(result).toBeUndefined();
	});

	it("should return void when onSelect is ignore", () => {
		const result = dataframe([{ name: "Alice" }], { onSelect: "ignore" });

		expect(result).toBeUndefined();
	});

	it("should return DataframeSelection when onSelect is rerun", () => {
		const session = manager.createSession();
		setCurrentSessionId(session.id);

		const result = dataframe(
			[
				{ name: "Alice", age: 30 },
				{ name: "Bob", age: 25 },
			],
			{
				key: "my_df",
				onSelect: "rerun",
				selectionMode: "multi-row",
			},
		);

		expect(result).toBeDefined();
		expect(result).toHaveProperty("rows");
		expect(result?.rows).toEqual([]);
	});

	it("should return stored selection when onSelect is rerun", () => {
		const session = manager.createSession();
		setCurrentSessionId(session.id);
		manager.setState(session.id, "my_df", { rows: [0, 2] });

		const result = dataframe(
			[
				{ name: "Alice", age: 30 },
				{ name: "Bob", age: 25 },
				{ name: "Charlie", age: 35 },
			],
			{
				key: "my_df",
				onSelect: "rerun",
				selectionMode: "multi-row",
			},
		);

		expect(result?.rows).toEqual([0, 2]);
	});

	it("should render with custom height", () => {
		dataframe([{ name: "Alice" }], { height: 300 });

		const html = ctx.getHtml();
		expect(html).toContain("height: 300px");
	});

	it("should respect hideIndex config", () => {
		dataframe([{ name: "Alice" }], { hideIndex: true });

		const html = ctx.getHtml();
		expect(html).not.toContain('class="kt-dataframe-index-col"');
	});

	it("should generate widget ID when no key specified", () => {
		dataframe([{ name: "Alice" }]);

		const html = ctx.getHtml();
		expect(html).toContain("widget_0");
	});

	it("should use custom key when specified", () => {
		dataframe([{ name: "Alice" }], { key: "my_table" });

		const html = ctx.getHtml();
		expect(html).toContain("my_table");
	});

	it("should handle empty data", () => {
		dataframe([]);

		const html = ctx.getHtml();
		expect(html).toContain("0 rows");
	});
});
