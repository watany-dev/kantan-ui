/**
 * チュートリアル8章: セッションステートの検証
 *
 * [BUG] session_state は index.ts からエクスポートされていない
 * チュートリアルでは import { session_state } from "kantan-ui" と記載されているが、
 * 実際にはエクスポートされていない。createSessionState() 関数は存在する。
 */
import { createApp, kt, createTypedSessionState } from "../../src/index";

// === 型安全なセッションステート（推奨） ===
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

  // === 型安全なセッションステート ===
  kt.header("createTypedSessionState");

  kt.write(`カウント: ${state.counter}`);

  if (kt.button("増加", { key: "typed_inc" })) {
    state.counter++;
  }

  const inputName = kt.text_input("名前", state.name, { key: "typed_name" });
  state.name = inputName;
  kt.write(`入力された名前: ${state.name}`);

  kt.divider();

  // === 動的セッションステート ===
  // [BUG] session_state がエクスポートされていないため、このテストはスキップ
  kt.header("session_state (動的)");
  kt.warning("[BUG] session_state は index.ts からエクスポートされていません");
  kt.write("チュートリアルでは import { session_state } from 'kantan-ui' と記載");
  kt.write("実装: createSessionState() 関数は存在するがエクスポートされていない");

  kt.divider();
  kt.write("セッションステートテスト完了");

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
