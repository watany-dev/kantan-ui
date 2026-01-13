/**
 * ダウンロードボタンサンプルアプリ
 *
 * kt.download_button() APIの使用例
 *
 * 使用方法:
 *   bun run examples/11-download.ts
 */
import { createApp } from "../src/app";
import { kt } from "../src/kt";
import { serve } from "../src/serve";
import { createTypedSessionState } from "../src/session";

type AppState = {
	downloadCount: number;
	selectedFormat: string;
};

const state = createTypedSessionState<AppState>({
	downloadCount: 0,
	selectedFormat: "txt",
});

const script = () => {
	kt.title("Download Button Demo");
	kt.write("kt.download_button() APIを使ってファイルダウンロード機能を実装します。");
	kt.divider();

	// 基本的な使用例
	kt.header("基本的なテキストファイルダウンロード");
	kt.code(
		`if (kt.download_button("Download", "Hello, World!", "hello.txt")) {
  kt.success("Download started!");
}`,
		"typescript",
	);

	if (
		kt.download_button("Download hello.txt", "Hello, World!", "hello.txt", {
			key: "basic_download",
		})
	) {
		state.downloadCount++;
		kt.success("ダウンロードを開始しました!");
	}

	kt.divider();

	// CSVファイルのダウンロード
	kt.header("CSVファイルのダウンロード");

	const csvData = `id,name,email,department
1,Alice,alice@example.com,Engineering
2,Bob,bob@example.com,Marketing
3,Charlie,charlie@example.com,Sales
4,Diana,diana@example.com,Engineering
5,Eve,eve@example.com,HR`;

	kt.code(
		`const csvData = "id,name,email...";
kt.download_button("Download CSV", csvData, "users.csv", {
  mime: "text/csv"
});`,
		"typescript",
	);

	kt.download_button("Download users.csv", csvData, "users.csv", {
		mime: "text/csv",
		key: "csv_download",
	});

	kt.divider();

	// JSONファイルのダウンロード
	kt.header("JSONファイルのダウンロード");

	const jsonData = JSON.stringify(
		{
			version: "1.0.0",
			settings: {
				theme: "dark",
				language: "ja",
				notifications: true,
			},
			users: [
				{ id: 1, name: "Alice", role: "admin" },
				{ id: 2, name: "Bob", role: "user" },
			],
		},
		null,
		2,
	);

	kt.code(
		`const jsonData = JSON.stringify(data, null, 2);
kt.download_button("Download JSON", jsonData, "config.json", {
  mime: "application/json"
});`,
		"typescript",
	);

	kt.download_button("Download config.json", jsonData, "config.json", {
		mime: "application/json",
		key: "json_download",
	});

	kt.divider();

	// 動的コンテンツのダウンロード
	kt.header("動的コンテンツの生成とダウンロード");

	const format = kt.selectbox("エクスポート形式", ["txt", "csv", "json"], {
		key: "format_select",
	});

	const generateContent = (fmt: string): string => {
		const data = [
			{ name: "Item A", price: 100, quantity: 5 },
			{ name: "Item B", price: 200, quantity: 3 },
			{ name: "Item C", price: 150, quantity: 8 },
		];

		switch (fmt) {
			case "csv":
				return [
					"name,price,quantity",
					...data.map((d) => `${d.name},${d.price},${d.quantity}`),
				].join("\n");
			case "json":
				return JSON.stringify(data, null, 2);
			default:
				return data.map((d) => `${d.name}: ¥${d.price} x ${d.quantity}`).join("\n");
		}
	};

	const getMime = (fmt: string): string => {
		switch (fmt) {
			case "csv":
				return "text/csv";
			case "json":
				return "application/json";
			default:
				return "text/plain";
		}
	};

	const content = generateContent(format);
	const mime = getMime(format);
	const filename = `export.${format}`;

	kt.subheader("プレビュー");
	kt.code(content, format === "json" ? "json" : undefined);

	kt.download_button(`Download ${filename}`, content, filename, {
		mime,
		key: "dynamic_download",
	});

	kt.divider();

	// ダウンロード統計
	kt.header("ダウンロード統計");
	kt.metric("Total Downloads", state.downloadCount.toString());
};

const kantanApp = await createApp(script);
const { shutdown } = serve(kantanApp, { port: 3011 });

console.log("Download Button Demo running at http://localhost:3011");

process.on("SIGINT", () => {
	console.log("\nShutting down...");
	shutdown();
	process.exit(0);
});
