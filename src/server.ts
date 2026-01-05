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

	// disabled状態のボタン（テスト用）
	kt.button("Disabled Button", { key: "btn_disabled", disabled: true });

	// IDを付与してdiffアルゴリズムが変更を検出できるようにする
	kt.html(`<div id="counter-display" class="kt-write">Current count: ${state.counter}</div>`);

	kt.divider();

	// ===== Input Widgets Section =====
	kt.header("Input Widgets");

	// テキスト入力
	kt.subheader("Text Input");
	const name = kt.text_input("Your Name", "World", { key: "name_input" });

	// maxLength付きテキスト入力（テスト用）
	const shortName = kt.text_input("Short Name (max 5)", "", {
		key: "short_input",
		maxLength: 5,
	});

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

	// ===== Additional Widgets Section =====
	kt.header("Additional Widgets");

	// Checkbox
	kt.subheader("Checkbox");
	const agreed = kt.checkbox("I agree to the terms", false, { key: "agree_checkbox" });
	const notifications = kt.checkbox("Enable notifications", true, {
		key: "notifications_checkbox",
	});

	// Radio
	kt.subheader("Radio");
	const size = kt.radio("Size", ["S", "M", "L", "XL"], "M", { key: "size_radio" });

	// Number Input
	kt.subheader("Number Input");
	const age = kt.number_input("Age", 0, 120, 25, { key: "age_input" });
	const quantity = kt.number_input("Quantity", 1, 100, 1, { key: "quantity_input", step: 1 });

	// Text Area
	kt.subheader("Text Area");
	const bio = kt.text_area("Bio", "Tell us about yourself...", {
		key: "bio_textarea",
		height: 100,
	});

	// Toggle
	kt.subheader("Toggle");
	const darkMode = kt.toggle("Dark Mode", false, { key: "darkmode_toggle" });
	const autoSave = kt.toggle("Auto Save", true, { key: "autosave_toggle" });

	// Multiselect
	kt.subheader("Multiselect");
	const tags = kt.multiselect("Tags", ["JavaScript", "TypeScript", "Python", "Rust", "Go"], [], {
		key: "tags_multiselect",
	});

	kt.divider();

	// ===== Alert Section =====
	kt.header("Alerts");
	kt.success("This is a success message");
	kt.error("This is an error message");
	kt.warning("This is a warning message");
	kt.info("This is an info message");

	kt.divider();

	// ===== Progress Section =====
	kt.header("Progress");
	kt.progress(0.25);
	kt.progress(0.5, { label: "Downloading... 50%" });
	kt.progress(75, { label: "Processing... 75%", color: "#27ae60" });

	kt.divider();

	// ===== Spinner Section =====
	kt.header("Spinner");
	kt.spinner();
	kt.spinner("Processing data...", { size: "small" });
	kt.spinner("Loading large content...", { size: "large" });

	kt.divider();

	// ===== Layout Section =====
	kt.header("Layout");

	kt.subheader("Columns");
	kt.columns([
		() => {
			kt.write("Left column");
		},
		() => {
			kt.write("Right column");
		},
	]);

	kt.subheader("Columns with ratio");
	kt.columns(
		[
			() => kt.write("Sidebar (25%)"),
			() => kt.write("Main content (50%)"),
			() => kt.write("Sidebar (25%)"),
		],
		{ ratios: [1, 2, 1] },
	);

	kt.subheader("Expander");
	kt.expander("Click to see details", () => {
		kt.write("This content is hidden by default");
	});

	kt.expander(
		"Expanded by default",
		() => {
			kt.write("This content is visible by default");
		},
		{ expanded: true },
	);

	kt.divider();

	// ===== Form Section =====
	kt.header("Form");
	kt.form("contact_form", () => {
		kt.text_input("Name", "", { key: "form_name" });
		kt.text_input("Email", "", { key: "form_email" });
		if (kt.form_submit_button("Submit", { key: "form_submit" })) {
			kt.success("Form submitted!");
		}
	});

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
			shortName,
			volume,
			stepVolume,
			color,
			agreed,
			notifications,
			size,
			age,
			quantity,
			bio,
			darkMode,
			autoSave,
			tags,
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

export default createApp(script);
