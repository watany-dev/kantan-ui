/**
 * チュートリアル10: APIダッシュボードモニター
 *
 * 使用API: metric, line_chart, bar_chart, sidebar, status, columns,
 *          table, toggle, selectbox, expander
 *
 * サーバーの稼働状況をモニタリングするダッシュボード（シミュレーション）
 *
 * 使用方法:
 *   bun run examples/tutorials/10-api-monitor.ts
 */
import { createApp } from "../../src/app";
import { kt } from "../../src/kt";
import { serve } from "../../src/serve";
import { createTypedSessionState } from "../../src/session";

type ServiceStatus = "healthy" | "degraded" | "down";

type Service = {
	name: string;
	status: ServiceStatus;
	uptime: number;
	latency: number;
	requests: number;
	errors: number;
};

type AppState = {
	autoRefresh: boolean;
	refreshCount: number;
};

const state = createTypedSessionState<AppState>({
	autoRefresh: false,
	refreshCount: 0,
});

// シミュレーションデータ生成
function generateServices(): Service[] {
	const base = state.refreshCount;
	return [
		{
			name: "API Gateway",
			status: "healthy",
			uptime: 99.99,
			latency: 12 + (base % 5),
			requests: 45200 + base * 100,
			errors: 3 + (base % 2),
		},
		{
			name: "Auth Service",
			status: "healthy",
			uptime: 99.95,
			latency: 25 + (base % 8),
			requests: 12800 + base * 30,
			errors: 1,
		},
		{
			name: "User Service",
			status: base % 7 === 0 ? "degraded" : "healthy",
			uptime: base % 7 === 0 ? 98.5 : 99.9,
			latency: base % 7 === 0 ? 450 : 35 + (base % 10),
			requests: 8900 + base * 20,
			errors: base % 7 === 0 ? 45 : 2,
		},
		{
			name: "Payment Service",
			status: "healthy",
			uptime: 99.99,
			latency: 80 + (base % 15),
			requests: 3200 + base * 10,
			errors: 0,
		},
		{
			name: "Notification Service",
			status: base % 11 === 0 ? "down" : "healthy",
			uptime: base % 11 === 0 ? 0 : 99.8,
			latency: base % 11 === 0 ? 0 : 15 + (base % 6),
			requests: 6700 + base * 15,
			errors: base % 11 === 0 ? 6700 : 5,
		},
	];
}

function generateLatencyHistory(): Array<{
	time: string;
	gateway: number;
	auth: number;
	user: number;
}> {
	const data = [];
	for (let i = 0; i < 12; i++) {
		data.push({
			time: `${String(i * 2).padStart(2, "0")}:00`,
			gateway: 10 + Math.round(Math.random() * 8),
			auth: 20 + Math.round(Math.random() * 15),
			user: 30 + Math.round(Math.random() * 20),
		});
	}
	return data;
}

function generateRequestHistory(): Array<{
	time: string;
	requests: number;
	errors: number;
}> {
	const data = [];
	for (let i = 0; i < 24; i++) {
		const hour = String(i).padStart(2, "0");
		data.push({
			time: `${hour}:00`,
			requests: 1000 + Math.round(Math.random() * 3000),
			errors: Math.round(Math.random() * 20),
		});
	}
	return data;
}

function getStatusIcon(status: ServiceStatus): string {
	switch (status) {
		case "healthy":
			return "正常";
		case "degraded":
			return "低下";
		case "down":
			return "停止";
	}
}

const script = () => {
	kt.set_page_config({ title: "APIモニター", layout: "wide" });

	// サイドバー
	kt.sidebar(() => {
		kt.header("設定");

		const autoRefresh = kt.toggle("自動更新", state.autoRefresh, {
			key: "auto_refresh",
		});
		state.autoRefresh = autoRefresh;

		if (kt.button("手動更新", { key: "refresh" })) {
			state.refreshCount++;
		}

		kt.divider();

		kt.write(`更新回数: ${state.refreshCount}`);

		kt.divider();

		kt.header("フィルター");
		kt.selectbox("期間", ["1時間", "6時間", "24時間", "7日間"], "24時間", {
			key: "period",
		});

		kt.divider();
		kt.caption("データはシミュレーションです");
	});

	kt.title("API ダッシュボードモニター");
	kt.divider();

	const services = generateServices();

	// 全体サマリー
	const totalRequests = services.reduce((sum, s) => sum + s.requests, 0);
	const totalErrors = services.reduce((sum, s) => sum + s.errors, 0);
	const errorRate = totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : "0";
	const avgLatency = Math.round(
		services.filter((s) => s.status !== "down").reduce((sum, s) => sum + s.latency, 0) /
			services.filter((s) => s.status !== "down").length,
	);
	const healthyCount = services.filter((s) => s.status === "healthy").length;

	kt.columns(
		[
			() => {
				kt.metric("総リクエスト", totalRequests.toLocaleString(), {
					delta: "+12%",
				});
			},
			() => {
				kt.metric("エラー率", `${errorRate}%`, {
					delta: Number.parseFloat(errorRate) > 1 ? "+0.5%" : "-0.1%",
					delta_color: "inverse",
				});
			},
			() => {
				kt.metric("平均レイテンシ", `${avgLatency}ms`, {
					delta: avgLatency > 100 ? "+20ms" : "-5ms",
					delta_color: "inverse",
				});
			},
			() => {
				kt.metric("稼働サービス", `${healthyCount}/${services.length}`, {
					delta:
						healthyCount === services.length
							? "全サービス正常"
							: `${services.length - healthyCount}件に問題`,
					delta_color: healthyCount === services.length ? "normal" : "inverse",
				});
			},
		],
		{ ratios: [1, 1, 1, 1] },
	);

	kt.divider();

	// サービスステータス
	kt.header("サービスステータス");

	for (const service of services) {
		const state =
			service.status === "healthy"
				? ("complete" as const)
				: service.status === "degraded"
					? ("running" as const)
					: ("error" as const);

		kt.status(
			service.name,
			() => {
				kt.columns(
					[
						() => kt.metric("稼働率", `${service.uptime}%`),
						() =>
							kt.metric("レイテンシ", service.status === "down" ? "N/A" : `${service.latency}ms`),
						() => kt.metric("リクエスト", service.requests.toLocaleString()),
						() =>
							kt.metric("エラー", service.errors.toString(), {
								delta_color: service.errors > 10 ? "normal" : "off",
							}),
					],
					{ ratios: [1, 1, 1, 1] },
				);
			},
			{ state },
		);
	}

	kt.divider();

	// グラフ
	const [latencyTab, requestTab, tableTab] = kt.tabs([
		"レイテンシ推移",
		"リクエスト推移",
		"詳細データ",
	]);

	latencyTab(() => {
		kt.subheader("サービス別レイテンシ推移");
		const latencyData = generateLatencyHistory();
		kt.line_chart(latencyData, {
			x: "time",
			y: ["gateway", "auth", "user"],
			x_label: "時刻",
			y_label: "レイテンシ (ms)",
			height: 300,
		});
	});

	requestTab(() => {
		kt.subheader("リクエスト数とエラー数の推移");
		const requestData = generateRequestHistory();
		kt.bar_chart(requestData, {
			x: "time",
			y: ["requests", "errors"],
			x_label: "時刻",
			y_label: "件数",
			height: 300,
		});
	});

	tableTab(() => {
		kt.subheader("サービス詳細");
		kt.dataframe(
			services.map((s) => ({
				サービス: s.name,
				ステータス: getStatusIcon(s.status),
				稼働率: `${s.uptime}%`,
				レイテンシ: s.status === "down" ? "N/A" : `${s.latency}ms`,
				リクエスト数: s.requests.toLocaleString(),
				エラー数: s.errors,
			})),
			{ key: "services_df" },
		);
	});
	return undefined;
};

const kantanApp = await createApp(script);
const { shutdown } = serve(kantanApp, { port: 3210 });

console.log("API Monitor Dashboard running at http://localhost:3210");

process.on("SIGINT", () => {
	console.log("\nShutting down...");
	shutdown();
	process.exit(0);
});
