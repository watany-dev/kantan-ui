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

	// サイドバー（カウンター操作後に定義して最新の状態を反映）
	kt.sidebar(() => {
		kt.header("Settings");
		kt.write("This is sidebar content");
		kt.divider();
		kt.write(`Counter: ${state.counter}`);
	});

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

	// ===== Toast Section =====
	kt.header("Toast");
	kt.toast("Saved successfully!");
	kt.toast("New update available", { type: "info" });
	kt.toast("Please check your input", { type: "warning" });
	kt.toast("Failed to connect", { type: "error" });

	kt.divider();

	// ===== Image Section =====
	kt.header("Image");

	kt.subheader("URL Image");
	kt.image("https://via.placeholder.com/300x150?text=Demo+Image", {
		caption: "A placeholder image",
		width: 300,
		key: "demo_image",
	});

	kt.subheader("Data URI Image");
	// 1x1 red pixel PNG
	kt.image(
		"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
		{
			caption: "A 1x1 red pixel",
			key: "data_uri_image",
		},
	);

	kt.subheader("SVG Image");
	kt.image('<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="#3498db"/></svg>', {
		caption: "A simple SVG circle",
		key: "svg_image",
	});

	kt.subheader("Image Gallery");
	kt.image(
		[
			"https://via.placeholder.com/150x100?text=Image+1",
			"https://via.placeholder.com/150x100?text=Image+2",
			"https://via.placeholder.com/150x100?text=Image+3",
		],
		{
			caption: ["First image", "Second image", "Third image"],
			width: 150,
			key: "gallery_images",
		},
	);

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

	// ===== File Upload Section =====
	kt.header("File Upload");

	kt.subheader("Single File");
	const singleFileResult = kt.file_uploader("Upload a file", {
		key: "single_file",
		help: "Any file up to 200MB",
	});
	// multiple: false（デフォルト）なので単一ファイルまたはnull
	const singleFile = !Array.isArray(singleFileResult) ? singleFileResult : null;

	if (singleFile) {
		kt.success(`Uploaded: ${singleFile.name}`);
		kt.write(`Size: ${singleFile.size} bytes`);
		kt.write(`Type: ${singleFile.type}`);

		// テキストファイルの場合は内容をプレビュー
		if (singleFile.type.startsWith("text/") || singleFile.name.endsWith(".txt")) {
			const content = singleFile.text();
			kt.write("Content preview:");
			kt.html(
				`<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; max-height: 200px; overflow: auto;">${escapeHtml(content.slice(0, 1000))}${content.length > 1000 ? "..." : ""}</pre>`,
			);
		}
	}

	kt.subheader("Image Upload");
	const imageFileResult = kt.file_uploader("Upload an image", {
		key: "image_file",
		accept: "image/*",
		maxSize: 5 * 1024 * 1024, // 5MB
		help: "Images only (PNG, JPEG, GIF, WebP) - Max 5MB",
	});
	// multiple: false（デフォルト）なので単一ファイルまたはnull
	const imageFile = !Array.isArray(imageFileResult) ? imageFileResult : null;

	if (imageFile) {
		kt.success(`Image uploaded: ${imageFile.name}`);
		// アップロードした画像をBase64で表示
		const buffer = imageFile.arrayBuffer();
		const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
		kt.image(`data:${imageFile.type};base64,${base64}`, {
			caption: imageFile.name,
			width: 300,
			key: "uploaded_image_preview",
		});
	}

	kt.subheader("Multiple Files");
	const multiFilesResult = kt.file_uploader("Upload multiple files", {
		key: "multi_files",
		multiple: true,
		accept: [".txt", ".csv", ".json"],
		help: "Text, CSV, or JSON files",
	});
	// multiple: trueなのでファイル配列またはnull
	const multiFiles = Array.isArray(multiFilesResult) ? multiFilesResult : [];

	if (multiFiles.length > 0) {
		kt.write(`${multiFiles.length} file(s) uploaded:`);
		for (const file of multiFiles) {
			kt.write(`- ${file.name} (${file.size} bytes, ${file.type})`);
		}
	}

	kt.divider();

	// ===== Empty Placeholder Section =====
	kt.header("Empty Placeholder");

	kt.subheader("Dynamic Status");
	const statusPlaceholder = kt.empty({ key: "status_placeholder" });

	// ボタンでプレースホルダーの状態を変更
	if (kt.button("Show Spinner", { key: "btn_show_spinner" })) {
		statusPlaceholder.spinner("Processing...");
	}
	if (kt.button("Show Success", { key: "btn_show_success" })) {
		statusPlaceholder.success("Operation completed!");
	}
	if (kt.button("Show Error", { key: "btn_show_error" })) {
		statusPlaceholder.error("Something went wrong!");
	}
	if (kt.button("Clear Status", { key: "btn_clear_status" })) {
		statusPlaceholder.empty();
	}

	kt.subheader("Progress Demo");
	const progressPlaceholder = kt.empty({ key: "progress_placeholder" });

	if (kt.button("Show Progress", { key: "btn_show_progress" })) {
		progressPlaceholder.progress(0.5, { text: "50% complete" });
	}

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
			singleFile: singleFile
				? { name: singleFile.name, size: singleFile.size, type: singleFile.type }
				: null,
			imageFile: imageFile
				? { name: imageFile.name, size: imageFile.size, type: imageFile.type }
				: null,
			multiFiles: multiFiles.map((f) => ({ name: f.name, size: f.size, type: f.type })),
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

export default await createApp(script);
