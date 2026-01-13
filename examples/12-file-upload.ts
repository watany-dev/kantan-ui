/**
 * ファイルアップロードサンプルアプリ
 *
 * kt.file_uploader() APIの使用例
 *
 * 使用方法:
 *   bun run examples/12-file-upload.ts
 */
import { createApp } from "../src/app";
import { kt } from "../src/kt";
import { serve } from "../src/serve";
import { createTypedSessionState } from "../src/session";

type AppState = {
	uploadedFiles: string[];
};

const state = createTypedSessionState<AppState>({
	uploadedFiles: [],
});

const script = () => {
	kt.title("File Uploader Demo");
	kt.write("kt.file_uploader() APIを使ってファイルアップロード機能を実装します。");
	kt.divider();

	// 基本的な使用例
	kt.header("基本的なファイルアップロード");
	kt.code(
		`const file = kt.file_uploader("Upload a file");
if (file) {
  kt.write(\`Uploaded: \${file.name}\`);
}`,
		"typescript",
	);

	const basicFile = kt.file_uploader("ファイルを選択", { key: "basic_upload" });
	if (basicFile) {
		kt.success(`アップロード成功: ${basicFile.name}`);
		kt.json({
			name: basicFile.name,
			size: `${basicFile.size} bytes`,
			type: basicFile.type,
		});
	}

	kt.divider();

	// 画像ファイルのみ受け付ける
	kt.header("画像ファイルのアップロード");
	kt.code(
		`const image = kt.file_uploader("Upload image", {
  accept: ["image/png", "image/jpeg", "image/gif"],
  help: "PNG, JPEG, GIF形式のみ"
});`,
		"typescript",
	);

	const imageFile = kt.file_uploader("画像を選択", {
		accept: ["image/png", "image/jpeg", "image/gif", "image/webp"],
		help: "PNG, JPEG, GIF, WebP形式のみ (最大5MB)",
		maxSize: 5 * 1024 * 1024,
		key: "image_upload",
	});

	if (imageFile) {
		kt.success(`画像をアップロードしました: ${imageFile.name}`);
		kt.write(`サイズ: ${(imageFile.size / 1024).toFixed(2)} KB`);
		kt.write(`形式: ${imageFile.type}`);
	}

	kt.divider();

	// 複数ファイルのアップロード
	kt.header("複数ファイルのアップロード");
	kt.code(
		`const files = kt.file_uploader("Upload files", {
  multiple: true,
  accept: ".txt,.csv,.json"
});`,
		"typescript",
	);

	const multiFiles = kt.file_uploader("複数ファイルを選択", {
		multiple: true,
		accept: ".txt,.csv,.json,.md",
		help: "テキスト、CSV、JSON、Markdown形式",
		key: "multi_upload",
	});

	if (Array.isArray(multiFiles) && multiFiles.length > 0) {
		kt.success(`${multiFiles.length}個のファイルをアップロードしました`);
		kt.table(
			multiFiles.map((f) => ({
				名前: f.name,
				サイズ: `${(f.size / 1024).toFixed(2)} KB`,
				形式: f.type || "不明",
			})),
		);
	}

	kt.divider();

	// セキュリティオプション
	kt.header("セキュリティオプション");
	kt.info(
		"file_uploaderにはセキュリティ機能が組み込まれています: ファイルサイズ制限、MIME検証、マジックバイト検証など",
	);

	kt.code(
		`kt.file_uploader("Secure upload", {
  maxSize: 1024 * 1024,       // 1MB
  strictMode: true,            // 厳格モード
  verifyMagicBytes: true,      // マジックバイト検証
  detectPolyglot: true,        // ポリグロット検出
});`,
		"typescript",
	);

	const secureFile = kt.file_uploader("セキュアアップロード", {
		maxSize: 1024 * 1024,
		strictMode: true,
		verifyMagicBytes: true,
		detectPolyglot: true,
		help: "最大1MB、厳格なセキュリティチェック有効",
		key: "secure_upload",
	});

	if (secureFile) {
		kt.success("セキュリティチェックを通過しました!");
		kt.json({
			name: secureFile.name,
			size: secureFile.size,
			type: secureFile.type,
		});
	}

	kt.divider();

	// アップロード履歴
	kt.header("アップロード履歴");
	if (state.uploadedFiles.length > 0) {
		kt.write("これまでにアップロードされたファイル:");
		for (const fileName of state.uploadedFiles) {
			kt.write(`- ${fileName}`);
		}
	} else {
		kt.info("まだファイルがアップロードされていません");
	}
};

const kantanApp = await createApp(script);
const { shutdown } = serve(kantanApp, { port: 3012 });

console.log("File Uploader Demo running at http://localhost:3012");

process.on("SIGINT", () => {
	console.log("\nShutting down...");
	shutdown();
	process.exit(0);
});
