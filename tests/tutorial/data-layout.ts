/**
 * チュートリアル5-7章: データ表示・レイアウトの検証
 */
import { createApp, kt } from "../../src/index";

const script = () => {
	kt.title("データ表示・レイアウトテスト");
	kt.divider();

	// === テーブル ===
	kt.header("テーブル");

	// オブジェクト配列形式（推奨）
	kt.subheader("オブジェクト配列形式");
	kt.table([
		{ name: "Alice", age: 30, city: "Tokyo" },
		{ name: "Bob", age: 25, city: "Osaka" },
		{ name: "Carol", age: 35, city: "Kyoto" },
	]);

	// 2D配列形式
	kt.subheader("2D配列形式");
	kt.table([
		["Name", "Age", "City"],
		["Alice", 30, "Tokyo"],
		["Bob", 25, "Osaka"],
	]);

	// 明示的にカラムを指定
	kt.subheader("カラム指定形式");
	kt.table({
		columns: ["名前", "年齢", "都市"],
		data: [
			["Alice", 30, "Tokyo"],
			["Bob", 25, "Osaka"],
		],
	});

	kt.divider();

	// === メトリクス ===
	kt.header("メトリクス");

	kt.metric("Revenue", "$1,234");
	kt.metric("Revenue", "$1,234", { delta: "+12%" });
	kt.metric("Response Time", "120ms", { delta: "+15ms", delta_color: "inverse" });
	kt.metric("Users", "1,234", { delta: "+100", delta_color: "off" });
	kt.metric("Active Users", 1234, { delta: 156 });
	kt.metric("CPU Usage", "78%", {
		delta: "+5%",
		delta_color: "inverse",
		help: "高いCPU使用率はパフォーマンスに影響します",
	});

	kt.divider();

	// === タブ ===
	kt.header("タブ");

	const [overview, details, settings] = kt.tabs(["概要", "詳細", "設定"]);

	overview(() => {
		kt.header("概要");
		kt.write("アプリケーションの概要説明です。");
	});

	details(() => {
		kt.header("詳細データ");
		kt.table([{ item: "A", value: 100 }]);
	});

	settings(() => {
		kt.header("設定");
		const theme = kt.selectbox("テーマ", ["ライト", "ダーク"]);
		kt.write(`選択されたテーマ: ${theme}`);
	});

	// isActive プロパティ
	const [tab1, tab2] = kt.tabs(["Tab 1", "Tab 2"], { key: "test_tabs" });

	if (tab1.isActive) {
		kt.write("Tab 1 is currently active");
	}

	tab1(() => {
		kt.write("Content for Tab 1");
	});

	tab2(() => {
		kt.write("Content for Tab 2");
	});

	kt.divider();

	// === Empty プレースホルダー ===
	kt.header("Empty プレースホルダー");

	const status = kt.empty({ key: "status" });

	if (kt.button("スピナー表示", { key: "show_spinner" })) {
		status.spinner("処理中...");
	}

	if (kt.button("成功表示", { key: "show_success" })) {
		status.success("処理が完了しました！");
	}

	if (kt.button("クリア", { key: "clear_status" })) {
		status.empty();
	}

	kt.divider();
	kt.write("データ表示・レイアウトテスト完了");

	return undefined;
};

const app = await createApp(script, { port: 3105 });
console.log("Data/Layout test: App created successfully");

const server = Bun.serve({
	port: 3105,
	fetch: app.fetch,
	websocket: app.websocket,
});
console.log(`Server started at http://localhost:${server.port}`);

setTimeout(() => {
	server.stop();
	console.log("Server stopped");
	process.exit(0);
}, 1000);
