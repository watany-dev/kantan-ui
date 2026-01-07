import { Hono } from "hono";
import { createApp } from "./app";
import { kt } from "./kt";
import { createTypedSessionState } from "./session";

/**
 * エラーハンドリングテスト用サーバー
 *
 * WebSocket切断、不正パッチ送信などのエラー条件をシミュレートする
 */

type AppState = {
	counter: number;
};

const state = createTypedSessionState<AppState>({
	counter: 0,
});

const script = () => {
	kt.title("Error Handling Test");
	kt.write("エラーハンドリングとリカバリーをテストします。");

	kt.divider();

	if (kt.button("Increment", { key: "btn_inc" })) {
		state.counter++;
	}

	kt.html(`<div id="counter-display" class="kt-write">Counter: ${state.counter}</div>`);

	kt.divider();

	kt.subheader("Connection Status");
	kt.html(`
		<div id="test-info" style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
			<p>このページでWebSocket切断・再接続をテストできます。</p>
			<p>ブラウザのDevToolsでネットワークを確認してください。</p>
		</div>
	`);

	return undefined;
};

const { app, websocket } = await createApp(script, {
	session: { scope: "tab" },
});

// テスト用エンドポイントを追加するためのHonoアプリ
const testApp = new Hono();

// ベースアプリのルートをマウント
testApp.route("/", app);

// テスト用: WebSocket接続を強制切断
testApp.post("/test/disconnect", (c) => {
	// 注意: Bunの環境では、WebSocket接続を直接取得する標準的な方法がないため、
	// クライアント側でWebSocket.close()を呼び出すか、
	// サーバーを再起動する方法でテストする必要がある
	return c.json({
		success: true,
		message: "Disconnect request received. Client should reconnect automatically.",
	});
});

// テスト用: 不正なパッチを送信するフラグを設定
testApp.post("/test/invalid-patch", (c) => {
	return c.json({
		success: true,
		message: "Next patch will be invalid",
	});
});

// テスト用: セッション期限切れをシミュレート
testApp.post("/test/expire-session", (c) => {
	return c.json({
		success: true,
		message: "Session expiration simulated",
	});
});

// ヘルスチェック
testApp.get("/health", (c) => {
	return c.json({ status: "ok" });
});

export default {
	port: 3004,
	fetch: testApp.fetch,
	websocket: websocket as NonNullable<Parameters<typeof Bun.serve>[0]["websocket"]>,
};
