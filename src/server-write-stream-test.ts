/**
 * write_stream E2Eテスト用サーバー
 *
 * ストリーミングテキスト表示機能をテストするための専用サーバー
 */

import { createApp, kt } from "./index.js";

// 遅延を生成する非同期ジェネレータ
async function* delayedChunks(chunks: string[], delayMs: number = 50) {
	for (const chunk of chunks) {
		await new Promise((resolve) => setTimeout(resolve, delayMs));
		yield chunk;
	}
}

// テスト用ストリーム: 単純な文字列
function* simpleStream() {
	yield "Hello, ";
	yield "World!";
}

const script = (): string | undefined => {
	kt.title("write_stream Test");

	kt.write("Testing kt.write_stream() functionality");

	// ボタンクリックでストリームを開始
	if (kt.button("Start Stream", { key: "start_stream" })) {
		kt.write_stream(simpleStream(), { className: "test-stream" });
	}

	// 遅延ストリーム（非同期）
	if (kt.button("Start Delayed Stream", { key: "start_delayed" })) {
		kt.write_stream(delayedChunks(["Loading", ".", ".", "."], 100), {
			className: "delayed-stream",
		});
	}

	// Markdownストリーム
	if (kt.button("Start Markdown Stream", { key: "start_markdown" })) {
		kt.write_stream(["# Title\n", "\nThis is **bold** text."], {
			markdown: true,
			className: "markdown-stream",
		});
	}

	// 配列ストリーム（即座に完了）
	if (kt.button("Array Stream", { key: "array_stream" })) {
		kt.write_stream(["Item 1, ", "Item 2, ", "Item 3"], {
			className: "array-stream",
		});
	}

	return undefined;
};

const kantanApp = await createApp(script, {
	session: { scope: "tab" },
});

console.log("Started development server: http://localhost:3006");

export default {
	port: 3006,
	fetch: kantanApp.fetch,
	websocket: kantanApp.websocket as NonNullable<Parameters<typeof Bun.serve>[0]["websocket"]>,
};
