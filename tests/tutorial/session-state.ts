/**
 * チュートリアル8章: セッションステートの検証
 *
 * A: kt.session_state (Streamlit互換、動的)
 * C: createTypedSessionState (TypeScript推奨、型安全)
 */
import { createApp, createTypedSessionState, kt } from "../../src/index";

// === C: 型安全なセッションステート（推奨） ===
type AppState = {
	counter: number;
	name: string;
	items: string[];
};

const state = createTypedSessionState<AppState>({
	counter: 0,
	name: "",
	items: [],
});

const script = () => {
	kt.title("セッションステートテスト");
	kt.divider();

	// === C: 型安全なセッションステート ===
	kt.header("C: createTypedSessionState (型安全)");

	kt.write(`カウント: ${state.counter}`);

	if (kt.button("増加", { key: "typed_inc" })) {
		state.counter++;
	}

	const inputName = kt.text_input("名前", state.name, { key: "typed_name" });
	state.name = inputName;
	kt.write(`入力された名前: ${state.name}`);

	kt.divider();

	// === A: 動的セッションステート (Streamlit互換) ===
	kt.header("A: kt.session_state (Streamlit互換)");

	// 初期化
	if (kt.session_state.visits === undefined) {
		kt.session_state.visits = 0;
	}

	kt.session_state.visits++;
	kt.write(`訪問回数: ${kt.session_state.visits}`);

	// 動的キーの追加
	if (kt.button("動的キー追加", { key: "add_dynamic" })) {
		const timestamp = Date.now();
		kt.session_state[`dynamic_${timestamp}`] = "value";
		kt.success(`動的キー dynamic_${timestamp} を追加しました`);
	}

	kt.divider();
	kt.success("セッションステートテスト完了 (A + C 両方動作)");

	return undefined;
};

const app = await createApp(script, { port: 3108 });
console.log("Session state test: App created successfully");

const server = Bun.serve({
	port: 3108,
	fetch: app.fetch,
	websocket: app.websocket,
});
console.log(`Server started at http://localhost:${server.port}`);

setTimeout(() => {
	server.stop();
	console.log("Server stopped");
	process.exit(0);
}, 1000);
