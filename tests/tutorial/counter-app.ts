/**
 * チュートリアル11章: カウンターアプリのコード検証
 */
import { createApp, createTypedSessionState, kt } from "../../src/index";

type CounterState = {
	count: number;
};

const state = createTypedSessionState<CounterState>({
	count: 0,
});

const script = () => {
	kt.title("カウンター");
	kt.divider();

	// 現在のカウントを表示
	kt.header(`カウント: ${state.count}`);

	// 増減ボタン
	if (kt.button("+ 増加", { key: "inc" })) {
		state.count++;
	}

	if (kt.button("- 減少", { key: "dec" })) {
		state.count--;
	}

	if (kt.button("リセット", { key: "reset" })) {
		state.count = 0;
	}

	kt.divider();

	// スライダーで直接値を設定
	const newValue = kt.slider("値を設定", -100, 100, state.count);
	if (newValue !== state.count) {
		state.count = newValue;
	}

	return undefined;
};

const app = await createApp(script, { port: 3101 });
console.log("Counter app test: App created successfully");

const server = Bun.serve({
	port: 3101,
	fetch: app.fetch,
	websocket: app.websocket,
});
console.log(`Server started at http://localhost:${server.port}`);

setTimeout(() => {
	server.stop();
	console.log("Server stopped");
	process.exit(0);
}, 1000);
