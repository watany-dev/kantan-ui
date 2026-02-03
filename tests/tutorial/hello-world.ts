/**
 * チュートリアル3章: Hello World のコード検証
 */
import { createApp, kt } from "../../src/index";

// スクリプト関数: UIを定義
const script = () => {
	kt.title("Hello, kantan-ui!");
	kt.write("これは最初のkantan-uiアプリです。");

	return undefined;
};

// アプリを作成してエクスポート（ポート指定可能）
const app = await createApp(script, { port: 3100 });
console.log("Hello World test: App created successfully");
console.log("Port:", 3100);

// サーバー起動テスト
const server = Bun.serve({
	port: 3100,
	fetch: app.fetch,
	websocket: app.websocket,
});
console.log(`Server started at http://localhost:${server.port}`);

// 1秒後にシャットダウン
setTimeout(() => {
	server.stop();
	console.log("Server stopped");
	process.exit(0);
}, 1000);
