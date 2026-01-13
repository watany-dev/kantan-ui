/**
 * 動的コンテンツ更新サンプルアプリ
 *
 * kt.empty() APIの使用例
 *
 * 使用方法:
 *   bun run examples/14-dynamic-content.ts
 */
import { createApp } from "../src/app";
import { kt } from "../src/kt";
import { serve } from "../src/serve";
import { createTypedSessionState } from "../src/session";

type AppState = {
	status: "idle" | "loading" | "success" | "error";
	progress: number;
};

const state = createTypedSessionState<AppState>({
	status: "idle",
	progress: 0,
});

const script = () => {
	kt.title("Dynamic Content Demo");
	kt.write("kt.empty() APIを使って動的に更新可能なプレースホルダーを作成します。");
	kt.divider();

	// 基本的な使用例
	kt.header("基本的な使い方");
	kt.code(
		`const placeholder = kt.empty();
placeholder.write("Initial content");

// 後で更新
placeholder.success("Updated!");

// クリア
placeholder.empty();`,
		"typescript",
	);

	const basic = kt.empty({ key: "basic_placeholder" });

	kt.columns([0.33, 0.33, 0.34], (col) => {
		col[0](() => {
			if (kt.button("Write", { key: "btn_write" })) {
				basic.write("Hello, World!");
			}
		});
		col[1](() => {
			if (kt.button("Success", { key: "btn_success" })) {
				basic.success("Operation completed!");
			}
		});
		col[2](() => {
			if (kt.button("Clear", { key: "btn_clear" })) {
				basic.empty();
			}
		});
	});

	kt.divider();

	// 各種表示メソッド
	kt.header("表示メソッド一覧");

	const demo = kt.empty({ key: "demo_placeholder" });

	kt.columns([0.25, 0.25, 0.25, 0.25], (col) => {
		col[0](() => {
			if (kt.button("info()", { key: "btn_info" })) {
				demo.info("Information message");
			}
		});
		col[1](() => {
			if (kt.button("warning()", { key: "btn_warning" })) {
				demo.warning("Warning message");
			}
		});
		col[2](() => {
			if (kt.button("error()", { key: "btn_error" })) {
				demo.error("Error message");
			}
		});
		col[3](() => {
			if (kt.button("success()", { key: "btn_success2" })) {
				demo.success("Success message");
			}
		});
	});

	kt.divider();

	// プログレス表示
	kt.header("プログレス表示");
	kt.code(
		`const status = kt.empty();
status.spinner("Loading...");

// 完了後
status.success("Done!");`,
		"typescript",
	);

	const progressPlaceholder = kt.empty({ key: "progress_placeholder" });

	if (kt.button("Start Loading", { key: "btn_loading" })) {
		progressPlaceholder.spinner("Processing...");
		state.status = "loading";
	}

	if (state.status === "loading") {
		if (kt.button("Complete", { key: "btn_complete" })) {
			progressPlaceholder.success("Process completed successfully!");
			state.status = "success";
		}
		if (kt.button("Fail", { key: "btn_fail" })) {
			progressPlaceholder.error("Process failed!");
			state.status = "error";
		}
	}

	kt.divider();

	// 条件付き表示
	kt.header("条件付き表示");

	const messageType = kt.selectbox(
		"メッセージタイプ",
		["none", "info", "warning", "error", "success"],
		{
			key: "message_type",
		},
	);

	const conditional = kt.empty({ key: "conditional_placeholder" });

	switch (messageType) {
		case "info":
			conditional.info("これは情報メッセージです");
			break;
		case "warning":
			conditional.warning("これは警告メッセージです");
			break;
		case "error":
			conditional.error("これはエラーメッセージです");
			break;
		case "success":
			conditional.success("これは成功メッセージです");
			break;
		default:
			conditional.empty();
	}

	kt.divider();

	// 複数のプレースホルダー
	kt.header("複数のプレースホルダー");
	kt.write("異なるキーを使って複数のプレースホルダーを管理できます。");

	kt.columns([0.5, 0.5], (col) => {
		col[0](() => {
			kt.subheader("Left Panel");
			const left = kt.empty({ key: "left_panel" });
			if (kt.button("Update Left", { key: "btn_left" })) {
				left.write(`Updated at ${new Date().toLocaleTimeString()}`);
			}
		});
		col[1](() => {
			kt.subheader("Right Panel");
			const right = kt.empty({ key: "right_panel" });
			if (kt.button("Update Right", { key: "btn_right" })) {
				right.write(`Updated at ${new Date().toLocaleTimeString()}`);
			}
		});
	});

	kt.divider();

	// 使用上の注意
	kt.header("使用上の注意");
	kt.info(
		"empty()はプレースホルダーオブジェクトを返します。このオブジェクトのメソッドで内容を更新します。",
	);
	kt.code(
		`// 利用可能なメソッド
placeholder.write(content)     // テキスト表示
placeholder.info(message)      // 情報アラート
placeholder.warning(message)   // 警告アラート
placeholder.error(message)     // エラーアラート
placeholder.success(message)   // 成功アラート
placeholder.spinner(message)   // スピナー表示
placeholder.empty()            // コンテンツをクリア`,
		"typescript",
	);
};

const kantanApp = await createApp(script);
const { shutdown } = serve(kantanApp, { port: 3014 });

console.log("Dynamic Content Demo running at http://localhost:3014");

process.on("SIGINT", () => {
	console.log("\nShutting down...");
	shutdown();
	process.exit(0);
});
