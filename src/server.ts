import { createApp } from "./app";
import { kt } from "./kt";
import { createTypedSessionState } from "./session";
import { escapeHtml } from "./utils/html";

/**
 * 型安全なセッションステート定義
 *
 * createTypedSessionState<T>() を使うことで:
 * - 型アサーション不要で型安全にアクセス可能
 * - デフォルト値の自動初期化
 * - IDEの補完が効く
 */
type AppState = {
	counter: number;
};

const state = createTypedSessionState<AppState>({
	counter: 0,
});

/**
 * デモスクリプト - 宣言的API (kt.*) を使用
 *
 * kt.* APIを使うと、HTMLを手動で生成する必要がなく、
 * Streamlitのように直感的にUIを構築できます。
 */
const script = () => {
	// タイトル
	kt.title("kantan-ui Demo");
	kt.write("Streamlit風の宣言的APIで構築されたデモアプリです。");

	kt.divider();

	// ===== Counter Section =====
	kt.header("Counter");

	// インクリメントボタン（型アサーション不要！）
	if (kt.button("+ Increment", { key: "btn_inc" })) {
		state.counter++;
	}

	// デクリメントボタン
	if (kt.button("- Decrement", { key: "btn_dec" })) {
		state.counter = Math.max(0, state.counter - 1);
	}

	// リセットボタン
	if (kt.button("Reset", { key: "btn_reset" })) {
		state.counter = 0;
	}

	// IDを付与してdiffアルゴリズムが変更を検出できるようにする
	kt.html(`<div id="counter-display" class="kt-write">Current count: ${state.counter}</div>`);

	kt.divider();

	// ===== Input Widgets Section =====
	kt.header("Input Widgets");

	// テキスト入力
	kt.subheader("Text Input");
	const name = kt.text_input("Your Name", "World", { key: "name_input" });

	// スライダー
	kt.subheader("Slider");
	const volume = kt.slider("Volume", 0, 100, 50, { key: "volume_slider" });

	// ステップ付きスライダー
	const stepVolume = kt.slider("Volume (step=10)", 0, 100, 50, {
		key: "step_slider",
		step: 10,
	});

	// セレクトボックス
	kt.subheader("Selectbox");
	const color = kt.selectbox("Color Theme", ["blue", "green", "red", "purple"], "blue", {
		key: "color_select",
	});

	kt.divider();

	// ===== Results Section =====
	kt.header("Results");

	// カスタムHTMLで結果を表示（スタイル付き）
	// 注: IDを付与することで diff アルゴリズムが変更を検出できる
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

	// ===== Debug Section =====
	kt.subheader("Session State (Debug)");
	kt.html(`
		<pre id="debug-state" style="background: #f5f5f5; padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 12px;">
${escapeHtml(
	JSON.stringify(
		{
			counter: state.counter,
			name,
			volume,
			stepVolume,
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

const { app, websocket } = createApp(script);

export default {
	fetch: app.fetch,
	websocket,
};
