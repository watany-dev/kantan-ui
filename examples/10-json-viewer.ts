/**
 * JSON表示サンプルアプリ
 *
 * kt.json() APIの使用例
 *
 * 使用方法:
 *   bun run examples/10-json-viewer.ts
 */
import { createApp } from "../src/app";
import { kt } from "../src/kt";
import { serve } from "../src/serve";

const script = () => {
	kt.title("JSON Viewer Demo");
	kt.write("kt.json() APIを使ってJSONデータを折りたたみ可能な形式で表示します。");
	kt.divider();

	// サンプルデータ
	const sampleData = {
		name: "kantan-ui",
		version: "0.1.0",
		features: ["Hono-based", "Web standards", "TypeScript"],
		config: {
			server: {
				port: 3000,
				host: "localhost",
			},
			debug: false,
		},
		stats: {
			downloads: 12345,
			stars: 100,
			contributors: [
				{ name: "Alice", commits: 42 },
				{ name: "Bob", commits: 28 },
			],
		},
	};

	// 基本的な使用例
	kt.header("基本的なJSON表示");
	kt.code('kt.json({ name: "Alice", age: 30 });', "typescript");
	kt.json({ name: "Alice", age: 30 });

	kt.divider();

	// 展開レベルの制御
	kt.header("展開レベルの制御");

	kt.subheader("expanded: 1 (デフォルト)");
	kt.code("kt.json(data, { expanded: 1 });", "typescript");
	kt.json(sampleData, { expanded: 1 });

	kt.subheader("expanded: 2");
	kt.code("kt.json(data, { expanded: 2 });", "typescript");
	kt.json(sampleData, { expanded: 2 });

	kt.subheader("expanded: 0 (全て折りたたみ)");
	kt.code("kt.json(data, { expanded: 0 });", "typescript");
	kt.json(sampleData, { expanded: 0 });

	kt.divider();

	// 様々なデータ型
	kt.header("様々なデータ型");

	kt.subheader("配列");
	kt.json(["apple", "banana", "cherry"]);

	kt.subheader("プリミティブ値");
	kt.json(42);
	kt.json("Hello, World!");
	kt.json(true);
	kt.json(null);

	kt.divider();

	// APIレスポンス風データ
	kt.header("APIレスポンス風データ");
	const apiResponse = {
		status: "success",
		data: {
			users: [
				{ id: 1, name: "Alice", email: "alice@example.com", active: true },
				{ id: 2, name: "Bob", email: "bob@example.com", active: false },
			],
			pagination: {
				page: 1,
				perPage: 10,
				total: 42,
			},
		},
		meta: {
			requestId: "abc123",
			timestamp: new Date().toISOString(),
		},
	};
	kt.json(apiResponse, { expanded: 2 });
};

const kantanApp = await createApp(script);
const { shutdown } = serve(kantanApp, { port: 3010 });

console.log("JSON Viewer Demo running at http://localhost:3010");

process.on("SIGINT", () => {
	console.log("\nShutting down...");
	shutdown();
	process.exit(0);
});
