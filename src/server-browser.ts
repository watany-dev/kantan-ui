/**
 * Browser Scope デモサーバー
 *
 * scope='browser' 設定でセッションをCookieで管理するデモ。
 * E2Eテスト用に別ポート(3001)で起動。
 */
import { createApp } from "./app";
import { kt } from "./kt";
import { createTypedSessionState } from "./session";
import { escapeHtml } from "./utils/html";

type AppState = {
	counter: number;
};

const state = createTypedSessionState<AppState>({
	counter: 0,
});

const script = () => {
	kt.title("kantan-ui Demo (Browser Scope)");
	kt.write("scope='browser' でセッションをCookie管理しています。");

	kt.divider();

	kt.header("Counter");

	if (kt.button("+ Increment", { key: "btn_inc" })) {
		state.counter++;
	}

	if (kt.button("- Decrement", { key: "btn_dec" })) {
		state.counter = Math.max(0, state.counter - 1);
	}

	if (kt.button("Reset", { key: "btn_reset" })) {
		state.counter = 0;
	}

	kt.html(`<div id="counter-display" class="kt-write">Current count: ${state.counter}</div>`);

	kt.divider();

	kt.header("Input Widgets");

	kt.subheader("Text Input");
	const name = kt.text_input("Your Name", "World", { key: "name_input" });

	kt.subheader("Slider");
	const volume = kt.slider("Volume", 0, 100, 50, { key: "volume_slider" });

	kt.subheader("Selectbox");
	const color = kt.selectbox("Color Theme", ["blue", "green", "red", "purple"], "blue", {
		key: "color_select",
	});

	kt.divider();

	kt.header("Results");

	kt.html(`
		<div id="results-card" style="background: linear-gradient(135deg, ${color} 0%, ${color}88 100%);
		            color: white; padding: 20px; border-radius: 8px; margin: 10px 0;">
			<h2 style="margin: 0 0 10px 0;">Hello, ${escapeHtml(name)}!</h2>
			<p style="margin: 0;">Volume: ${volume}%</p>
			<div style="background: rgba(255,255,255,0.3); height: 10px; border-radius: 5px; margin-top: 10px;">
				<div style="background: white; height: 100%; width: ${volume}%; border-radius: 5px;"></div>
			</div>
		</div>
	`);

	kt.divider();

	kt.subheader("Session State (Debug)");
	kt.html(`
		<pre id="debug-state" style="background: #f5f5f5; padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 12px;">
${escapeHtml(
	JSON.stringify(
		{
			counter: state.counter,
			name,
			volume,
			color,
		},
		null,
		2,
	),
)}
		</pre>
	`);

	return undefined;
};

// scope='browser' でアプリを作成
const { fetch, websocket } = createApp(script, {
	session: {
		scope: "browser",
	},
});

// ポート3001で起動
const server = Bun.serve({
	port: 3001,
	fetch,
	websocket: websocket as NonNullable<Parameters<typeof Bun.serve>[0]["websocket"]>,
});

console.log(`Browser-scope server running at http://localhost:${server.port}`);
