/**
 * チュートリアル10章: ページ設定の検証
 */
import { createApp, kt } from "../../src/index";

const script = () => {
	// set_page_config はスクリプトの最初に呼び出す
	kt.set_page_config({
		title: "My Dashboard",
		icon: "📊",
		layout: "wide",
		initialSidebarState: "expanded",
		menuItems: [
			{ label: "GitHub", url: "https://github.com" },
			{ label: "Docs", url: "/docs" },
		],
	});

	kt.title("ページ設定テスト");
	kt.divider();

	kt.write("set_page_config を設定しました");
	kt.write("- title: My Dashboard");
	kt.write("- icon: 📊");
	kt.write("- layout: wide");
	kt.write("- initialSidebarState: expanded");

	kt.divider();

	// rerun のテスト（無限ループを避けるため条件付き）
	const autoRefresh = kt.selectbox("自動更新", ["オフ", "オン"], "オフ");

	if (autoRefresh === "オン") {
		kt.warning("rerun() は無限ループになるため、このテストでは実行しません");
		// kt.rerun(); // 無限ループを避けるためコメントアウト
	}

	kt.divider();
	kt.write("ページ設定テスト完了");

	return undefined;
};

const app = await createApp(script, { port: 3107 });
console.log("Page config test: App created successfully");

const server = Bun.serve({
	port: 3107,
	fetch: app.fetch,
	websocket: app.websocket,
});
console.log(`Server started at http://localhost:${server.port}`);

setTimeout(() => {
	server.stop();
	console.log("Server stopped");
	process.exit(0);
}, 1000);
