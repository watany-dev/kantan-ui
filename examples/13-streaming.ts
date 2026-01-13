/**
 * ストリーミング出力サンプルアプリ
 *
 * kt.write_stream() APIの使用例
 *
 * 使用方法:
 *   bun run examples/13-streaming.ts
 */
import { createApp } from "../src/app";
import { kt } from "../src/kt";
import { serve } from "../src/serve";

// シミュレートされたLLMレスポンス生成器
async function* simulateLLMResponse(): AsyncGenerator<string> {
	const chunks = [
		"こんにちは！",
		"私はkantan-uiの",
		"ストリーミング機能の",
		"デモです。\n\n",
		"このように、",
		"テキストを",
		"少しずつ",
		"表示することができます。",
	];

	for (const chunk of chunks) {
		await new Promise((resolve) => setTimeout(resolve, 200));
		yield chunk;
	}
}

// 配列ベースのストリーミング
async function* countdownStream(): AsyncGenerator<string> {
	for (let i = 5; i >= 1; i--) {
		yield `${i}... `;
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	yield "Launch!";
}

// Markdownストリーミング
async function* markdownStream(): AsyncGenerator<string> {
	const parts = [
		"# ストリーミングMarkdown\n\n",
		"これは**太字**で、",
		"これは*イタリック*です。\n\n",
		"## リスト\n",
		"- 項目1\n",
		"- 項目2\n",
		"- 項目3\n\n",
		"```typescript\n",
		"const hello = 'world';\n",
		"```\n",
	];

	for (const part of parts) {
		await new Promise((resolve) => setTimeout(resolve, 300));
		yield part;
	}
}

const script = () => {
	kt.title("Streaming Output Demo");
	kt.write("kt.write_stream() APIを使ってストリーミング出力を実装します。");
	kt.info("LLMのレスポンス表示などに最適です。");
	kt.divider();

	// 基本的な使用例
	kt.header("基本的なストリーミング");
	kt.code(
		`async function* generateText() {
  yield "Hello, ";
  yield "World!";
}
await kt.write_stream(generateText());`,
		"typescript",
	);

	if (kt.button("Start Basic Stream", { key: "basic_stream" })) {
		kt.write_stream(simulateLLMResponse());
	}

	kt.divider();

	// カウントダウン
	kt.header("カウントダウン");
	kt.code(
		`async function* countdown() {
  for (let i = 5; i >= 1; i--) {
    yield \`\${i}... \`;
    await delay(500);
  }
  yield "Launch!";
}`,
		"typescript",
	);

	if (kt.button("Start Countdown", { key: "countdown" })) {
		kt.write_stream(countdownStream());
	}

	kt.divider();

	// 配列からのストリーミング
	kt.header("配列からのストリーミング");
	kt.code('await kt.write_stream(["Loading", ".", ".", "."]);', "typescript");

	if (kt.button("Stream from Array", { key: "array_stream" })) {
		kt.write_stream(["Loading", ".", ".", ".", " Done!"]);
	}

	kt.divider();

	// Markdownストリーミング
	kt.header("Markdownストリーミング");
	kt.code(
		`await kt.write_stream(markdownGenerator(), {
  markdown: true
});`,
		"typescript",
	);

	if (kt.button("Stream Markdown", { key: "markdown_stream" })) {
		kt.write_stream(markdownStream(), { markdown: true });
	}

	kt.divider();

	// カスタムクラス
	kt.header("カスタムスタイル");
	kt.code(
		`await kt.write_stream(generator(), {
  className: "custom-stream-class"
});`,
		"typescript",
	);

	if (kt.button("Stream with Custom Style", { key: "custom_stream" })) {
		kt.write_stream(simulateLLMResponse(), {
			className: "kt-alert kt-alert-info",
		});
	}

	kt.divider();

	// 使用上の注意
	kt.header("使用上の注意");
	kt.warning("write_stream()はPromiseを返します。必要に応じてawaitしてください。");
	kt.code(
		`// 結果を取得する場合
const fullText = await kt.write_stream(generator());
console.log("Full text:", fullText);

// 結果が不要な場合
kt.write_stream(generator()); // await不要`,
		"typescript",
	);
};

const kantanApp = await createApp(script);
const { shutdown } = serve(kantanApp, { port: 3013 });

console.log("Streaming Demo running at http://localhost:3013");

process.on("SIGINT", () => {
	console.log("\nShutting down...");
	shutdown();
	process.exit(0);
});
