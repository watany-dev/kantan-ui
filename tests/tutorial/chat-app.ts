/**
 * チュートリアル13章: チャットアプリのコード検証
 */
import { createApp, createTypedSessionState, kt } from "../../src/index";

type Message = {
	role: "user" | "assistant";
	content: string;
};

type ChatState = {
	messages: Message[];
	inputText: string;
};

const state = createTypedSessionState<ChatState>({
	messages: [],
	inputText: "",
});

// シンプルな応答生成（実際にはLLM APIを呼び出す）
function generateResponse(userMessage: string): string {
	if (userMessage.includes("こんにちは")) {
		return "こんにちは！何かお手伝いできることはありますか？";
	}
	if (userMessage.includes("時間")) {
		return `現在の時刻は ${new Date().toLocaleTimeString()} です。`;
	}
	return "すみません、よく分かりませんでした。もう一度お願いします。";
}

const script = () => {
	kt.title("チャットアプリ");
	kt.divider();

	// チャットメッセージ表示エリア
	kt.chat_container(
		() => {
			if (state.messages.length === 0) {
				kt.chat_message("system", "チャットを開始してください");
			}

			for (const msg of state.messages) {
				kt.chat_message(msg.role, msg.content);
			}
		},
		{ height: "400px" },
	);

	kt.divider();

	// メッセージ入力
	const input = kt.text_area("メッセージ", state.inputText, {
		key: "chat_input",
		placeholder: "メッセージを入力...",
		rows: 2,
	});
	state.inputText = input;

	// 送信ボタン
	if (kt.button("送信", { key: "send_btn" })) {
		if (state.inputText.trim() !== "") {
			// ユーザーメッセージを追加
			state.messages.push({
				role: "user",
				content: state.inputText,
			});

			// アシスタントの応答を生成
			const response = generateResponse(state.inputText);
			state.messages.push({
				role: "assistant",
				content: response,
			});

			// 入力をクリア
			state.inputText = "";
		}
	}

	// チャット履歴のクリア
	if (state.messages.length > 0) {
		if (kt.button("履歴をクリア", { key: "clear_btn" })) {
			state.messages = [];
		}
	}

	return undefined;
};

const app = await createApp(script, { port: 3103 });
console.log("Chat app test: App created successfully");

const server = Bun.serve({
	port: 3103,
	fetch: app.fetch,
	websocket: app.websocket,
});
console.log(`Server started at http://localhost:${server.port}`);

setTimeout(() => {
	server.stop();
	console.log("Server stopped");
	process.exit(0);
}, 1000);
