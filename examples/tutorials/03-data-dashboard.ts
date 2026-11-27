/**
 * チュートリアル3: データダッシュボード
 *
 * 使用API: table, dataframe, line_chart, bar_chart, area_chart, scatter_chart, tabs, metric, columns
 *
 * 売上データをさまざまなグラフで可視化するダッシュボードアプリ
 *
 * 使用方法:
 *   bun run examples/tutorials/03-data-dashboard.ts
 */
import { createApp } from "../../src/app";
import { kt } from "../../src/kt";
import { serve } from "../../src/serve";

// サンプル売上データ
const monthlySales = [
	{ month: "1月", revenue: 120, cost: 80, profit: 40 },
	{ month: "2月", revenue: 150, cost: 90, profit: 60 },
	{ month: "3月", revenue: 180, cost: 100, profit: 80 },
	{ month: "4月", revenue: 160, cost: 95, profit: 65 },
	{ month: "5月", revenue: 200, cost: 110, profit: 90 },
	{ month: "6月", revenue: 220, cost: 120, profit: 100 },
	{ month: "7月", revenue: 250, cost: 130, profit: 120 },
	{ month: "8月", revenue: 230, cost: 125, profit: 105 },
	{ month: "9月", revenue: 210, cost: 115, profit: 95 },
	{ month: "10月", revenue: 240, cost: 128, profit: 112 },
	{ month: "11月", revenue: 280, cost: 140, profit: 140 },
	{ month: "12月", revenue: 300, cost: 150, profit: 150 },
];

const productData = [
	{ product: "Widget A", sales: 450, returns: 12 },
	{ product: "Widget B", sales: 380, returns: 8 },
	{ product: "Gadget C", sales: 520, returns: 15 },
	{ product: "Tool D", sales: 290, returns: 5 },
	{ product: "Device E", sales: 610, returns: 20 },
];

const scatterData = [
	{ adSpend: 10, revenue: 120, region: "East" },
	{ adSpend: 15, revenue: 150, region: "East" },
	{ adSpend: 20, revenue: 180, region: "West" },
	{ adSpend: 25, revenue: 200, region: "West" },
	{ adSpend: 12, revenue: 140, region: "North" },
	{ adSpend: 30, revenue: 250, region: "North" },
	{ adSpend: 18, revenue: 170, region: "South" },
	{ adSpend: 22, revenue: 210, region: "South" },
	{ adSpend: 35, revenue: 280, region: "East" },
	{ adSpend: 28, revenue: 230, region: "West" },
];

const script = () => {
	kt.set_page_config({ title: "データダッシュボード", layout: "wide" });
	kt.title("データダッシュボード");
	kt.write("売上データをさまざまなグラフで可視化します。");
	kt.divider();

	// KPIメトリクス
	const totalRevenue = monthlySales.reduce((sum, m) => sum + m.revenue, 0);
	const totalCost = monthlySales.reduce((sum, m) => sum + m.cost, 0);
	const totalProfit = monthlySales.reduce((sum, m) => sum + m.profit, 0);
	const avgMonthly = Math.round(totalRevenue / monthlySales.length);

	kt.columns(
		[
			() => {
				kt.metric("年間売上", `¥${totalRevenue}万`, {
					delta: "+15%",
					help: "前年比",
				});
			},
			() => {
				kt.metric("年間コスト", `¥${totalCost}万`, {
					delta: "+8%",
					delta_color: "inverse",
				});
			},
			() => {
				kt.metric("年間利益", `¥${totalProfit}万`, {
					delta: "+23%",
				});
			},
			() => {
				kt.metric("月平均売上", `¥${avgMonthly}万`);
			},
		],
		{ ratios: [1, 1, 1, 1] },
	);

	kt.divider();

	// タブでグラフを切り替え
	const [lineTab, barTab, areaTab, scatterTab, tableTab] = kt.tabs([
		"折れ線グラフ",
		"棒グラフ",
		"エリアチャート",
		"散布図",
		"データテーブル",
	]);

	lineTab(() => {
		kt.subheader("月別売上推移");
		kt.line_chart(monthlySales, {
			x: "month",
			y: ["revenue", "cost", "profit"],
			x_label: "月",
			y_label: "金額 (万円)",
			height: 350,
		});
	});

	barTab(() => {
		kt.subheader("製品別売上");
		kt.bar_chart(productData, {
			x: "product",
			y: "sales",
			x_label: "製品",
			y_label: "売上数",
			height: 350,
		});

		kt.divider();

		kt.subheader("月別収益内訳 (積み上げ)");
		kt.bar_chart(monthlySales, {
			x: "month",
			y: ["cost", "profit"],
			x_label: "月",
			y_label: "金額 (万円)",
			stack: true,
			height: 350,
		});
	});

	areaTab(() => {
		kt.subheader("売上・コスト推移 (エリア)");
		kt.area_chart(monthlySales, {
			x: "month",
			y: ["revenue", "cost"],
			x_label: "月",
			y_label: "金額 (万円)",
			stack: true,
			height: 350,
		});
	});

	scatterTab(() => {
		kt.subheader("広告費 vs 売上");
		kt.scatter_chart(scatterData, {
			x: "adSpend",
			y: "revenue",
			color: "region",
			x_label: "広告費 (万円)",
			y_label: "売上 (万円)",
			height: 350,
		});
	});

	tableTab(() => {
		kt.subheader("月別売上データ");
		kt.dataframe(monthlySales, {
			key: "sales_df",
		});

		kt.divider();

		kt.subheader("製品別データ");
		kt.dataframe(productData, {
			key: "product_df",
		});
	});

	kt.divider();
	kt.caption("このダッシュボードはサンプルデータを使用しています。");
	return undefined;
};

const kantanApp = await createApp(script);
const { shutdown } = serve(kantanApp, { port: 3203 });

console.log("Data Dashboard running at http://localhost:3203");

process.on("SIGINT", () => {
	console.log("\nShutting down...");
	shutdown();
	process.exit(0);
});
