import { createApp } from "./app";
import { kt } from "./kt";
import { session_state } from "./session";

/**
 * デモスクリプト - 宣言的API (kt.*) を使用
 *
 * kt.* APIを使うと、HTMLを手動で生成する必要がなく、
 * Streamlitのように直感的にUIを構築できます。
 */
const script = () => {
	// カウンターの初期化
	if (session_state.counter === undefined) {
		session_state.counter = 0;
	}

	// タイトル
	kt.title("kantan-ui Demo");
	kt.write("Streamlit風の宣言的APIで構築されたデモアプリです。");

	kt.divider();

	// ===== Counter Section =====
	kt.header("Counter");

	// インクリメントボタン
	if (kt.button("+ Increment", { key: "btn_inc" })) {
		session_state.counter = (session_state.counter as number) + 1;
	}

	// デクリメントボタン
	if (kt.button("- Decrement", { key: "btn_dec" })) {
		session_state.counter = Math.max(0, (session_state.counter as number) - 1);
	}

	// リセットボタン
	if (kt.button("Reset", { key: "btn_reset" })) {
		session_state.counter = 0;
	}

	kt.write(`Current count: ${session_state.counter}`);

	kt.divider();

	// ===== Input Widgets Section =====
	kt.header("Input Widgets");

	// テキスト入力
	kt.subheader("Text Input");
	const name = kt.text_input("Your Name", "World", { key: "name_input" });

	// スライダー
	kt.subheader("Slider");
	const volume = kt.slider("Volume", 0, 100, 50, { key: "volume_slider" });

	// セレクトボックス
	kt.subheader("Selectbox");
	const color = kt.selectbox("Color Theme", ["blue", "green", "red", "purple"], "blue", {
		key: "color_select",
	});

	kt.divider();

	// ===== Results Section =====
	kt.header("Results");

	// カスタムHTMLで結果を表示（スタイル付き）
	kt.html(`
		<div style="background: linear-gradient(135deg, ${color} 0%, ${color}88 100%);
		            color: white; padding: 20px; border-radius: 8px; margin: 10px 0;">
			<h2 style="margin: 0 0 10px 0;">Hello, ${escapeHtml(name)}!</h2>
			<p style="margin: 0;">Volume: ${volume}%</p>
			<div style="background: rgba(255,255,255,0.3); height: 10px; border-radius: 5px; margin-top: 10px;">
				<div style="background: white; height: 100%; width: ${volume}%; border-radius: 5px;"></div>
			</div>
		</div>
	`);

	kt.divider();

	// ===== Debug Section =====
	kt.subheader("Session State (Debug)");
	kt.html(`
		<pre style="background: #f5f5f5; padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 12px;">
${escapeHtml(
	JSON.stringify(
		{
			counter: session_state.counter,
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

	// 宣言的APIを使用する場合はundefinedを返す（HTMLはバッファから自動取得）
	return undefined;
};

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

const { app, websocket } = createApp(script);

export default {
	fetch: app.fetch,
	websocket,
};
