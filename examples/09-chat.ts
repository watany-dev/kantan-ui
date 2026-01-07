/**
 * Deno用チャットアプリサンプル
 *
 * 使用方法:
 *   deno task example:chat
 *   または
 *   deno run --allow-net --allow-read examples/09-chat.ts
 */
import { createApp, createTypedSessionState, kt } from "kantan-ui";

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

	kt.chat_message("system", "ようこそ！チャットを始めましょう。");

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
	const input = kt.text_input("メッセージ", state.inputText, {
		key: "chat_input",
		placeholder: "メッセージを入力...",
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

// createApp は Promise を返すため await が必要
const kantanApp = await createApp(script);

// Deno.serve を使用してサーバーを起動
const port = 3000;
console.log(`Server running at http://localhost:${port}`);
Deno.serve({ port }, kantanApp.fetch);
