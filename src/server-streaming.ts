import { createApp } from "./app";
import { kt } from "./kt";
import { createTypedSessionState } from "./session";

/**
 * ストリーミング有効サーバー
 * E2Eテスト用にストリーミングを有効化して実行
 */
type AppState = {
	counter: number;
};

const state = createTypedSessionState<AppState>({
	counter: 0,
});

const script = () => {
	kt.title("Streaming Test");
	kt.write("This server has streaming enabled for testing.");

	kt.divider();

	kt.header("Counter");

	if (kt.button("Increment", { key: "btn_inc" })) {
		state.counter++;
	}

	kt.html(`<div id="counter-display">Count: ${state.counter}</div>`);

	kt.divider();

	// Add multiple elements to trigger flush threshold
	kt.write("Item 1");
	kt.write("Item 2");
	kt.write("Item 3");
	kt.write("Item 4");
	kt.write("Item 5");

	return undefined;
};

const kantanApp = createApp(script, {
	streaming: {
		enabled: true,
		flushThreshold: 2,
	},
});

console.log("Streaming-enabled server running at http://localhost:3002");

export default {
	port: 3002,
	...kantanApp,
};
