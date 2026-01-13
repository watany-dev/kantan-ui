/**
 * チュートリアル4章: ファイルアップローダーの検証
 */
import { createApp, kt } from "../../src/index";

const script = () => {
	kt.title("ファイルアップローダーテスト");
	kt.divider();

	// === 単一ファイル ===
	kt.header("単一ファイル");
	const file = kt.file_uploader("ファイルをアップロード");
	if (file && !Array.isArray(file)) {
		kt.write(`ファイル名: ${file.name}`);
		kt.write(`サイズ: ${file.size} bytes`);
		kt.write(`タイプ: ${file.type}`);
	}

	kt.divider();

	// === 画像のみ、サイズ制限付き ===
	kt.header("画像アップロード (制限付き)");
	const _image = kt.file_uploader("画像をアップロード", {
		accept: "image/*",
		maxSize: 5 * 1024 * 1024, // 5MB
	});

	kt.divider();

	// === 複数ファイル ===
	kt.header("複数ファイル");
	const files = kt.file_uploader("複数ファイルをアップロード", {
		multiple: true,
	});
	if (Array.isArray(files)) {
		for (const f of files) {
			kt.write(`${f.name}: ${f.size} bytes`);
		}
	}

	kt.divider();

	// === 特定の拡張子のみ ===
	kt.header("特定の拡張子");
	const _doc = kt.file_uploader("ドキュメントをアップロード", {
		accept: [".pdf", ".docx", ".txt"],
	});

	kt.divider();

	// === CSVファイルの処理例 ===
	kt.header("CSVファイル");
	const csv = kt.file_uploader("CSVファイル", { accept: ".csv" });
	if (csv && !Array.isArray(csv)) {
		const text = csv.text();
		const lines = text.split("\n");
		kt.write(`行数: ${lines.length}`);
	}

	kt.divider();

	// === 厳格モード ===
	kt.header("厳格モード");
	const _secure = kt.file_uploader("セキュアアップロード", {
		strictMode: true,
	});

	kt.divider();
	kt.write("ファイルアップローダーテスト完了");

	return undefined;
};

const app = await createApp(script, { port: 3109 });
console.log("File uploader test: App created successfully");

const server = Bun.serve({
	port: 3109,
	fetch: app.fetch,
	websocket: app.websocket,
});
console.log(`Server started at http://localhost:${server.port}`);

setTimeout(() => {
	server.stop();
	console.log("Server stopped");
	process.exit(0);
}, 1000);
