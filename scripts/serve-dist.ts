/**
 * 本番ビルド検証用サーバー
 *
 * dist/ からライブラリをインポートして動作確認を行う。
 * E2E テストで本番ビルドが正常に動作することを検証するために使用。
 */

// dist/ からインポート（本番ビルドの動作確認）
import { createApp, createTypedSessionState, kt } from "../dist/index.js";

type AppState = {
	counter: number;
};

const state = createTypedSessionState<AppState>({
	counter: 0,
});

const script = () => {
	kt.title("kantan-ui (Production Build)");
	kt.write("This server runs from dist/ to verify the production build.");

	kt.divider();

	kt.header("Counter");

	if (kt.button("+ Increment", { key: "btn_inc" })) {
		state.counter++;
	}

	if (kt.button("- Decrement", { key: "btn_dec" })) {
		state.counter = Math.max(0, state.counter - 1);
	}

	kt.html(`<div id="counter-display" class="kt-write">Current count: ${state.counter}</div>`);

	kt.divider();

	kt.header("Input Widgets");

	const name = kt.text_input("Your Name", "World", { key: "name_input" });
	const volume = kt.slider("Volume", 0, 100, 50, { key: "volume_slider" });
	const color = kt.selectbox("Color", ["blue", "green", "red"], "blue", {
		key: "color_select",
	});

	kt.html(`
		<div id="results-card" style="background: ${color}; color: white; padding: 20px; border-radius: 8px;">
			<h2>Hello, ${name}!</h2>
			<p>Volume: ${volume}%</p>
		</div>
	`);

	return undefined;
};

const app = await createApp(script);

const PORT = Number(process.env.PORT) || 3005;

console.log(`Starting production build server on port ${PORT}...`);

Bun.serve({
	port: PORT,
	fetch: app.fetch,
	websocket: app.websocket,
});

console.log(`Production build server running at http://localhost:${PORT}`);
