# kantan-ui

Webスタンダードと [Hono](https://hono.dev/) のみに依存する、Streamlit風のUIフレームワークです。

## 特徴

- **シンプル** - Streamlitライクな宣言的API（`kt.button()`, `kt.slider()`など）
- **リアルタイム** - WebSocketによる即時UI更新、マルチタブ同期対応
- **軽量** - Honoのみに依存、マルチランタイム対応（Bun, Node.js, Deno）
- **セッション管理** - 複数ユーザーの状態を自動管理
- **接続安定性** - Ping/Pong、自動再接続、シーケンス番号による欠落パッチ復元
- **ストリーミング** - 大量UIの段階的レンダリング対応
- **商用対応** - 拡張性、性能、セキュリティを考慮した設計

## クイックスタート

### 必要環境

- [Bun](https://bun.sh/) v1.0以上（推奨）
- または Node.js v18以上、Deno

### インストール

```bash
bun install
```

### 開発サーバーの起動

```bash
bun run dev
```

ブラウザで `http://localhost:3000` を開くとデモアプリが表示されます。

## 使い方

### 基本的なアプリ作成（宣言的API）

```typescript
import { createApp, kt, createTypedSessionState } from "kantan-ui";

// 型安全なセッション状態を定義
type AppState = {
  count: number;
};

const state = createTypedSessionState<AppState>({
  count: 0,  // デフォルト値
});

const script = () => {
  kt.title("Counter App");

  // ボタンが押されたらtrueを返す
  if (kt.button("+ Increment")) {
    state.count++;  // 型安全！型アサーション不要
  }

  kt.write(`Count: ${state.count}`);

  // 宣言的APIを使用する場合はundefinedを返す
  return undefined;
};

export default createApp(script);
```

### kt API（宣言的API）

`kt` オブジェクトを使うと、Streamlitのように直感的にUIを構築できます。各関数はHTMLを自動的に出力し、適切な値を返します。

#### 出力API

```typescript
import { kt } from "kantan-ui";

kt.title("タイトル");       // <h1>
kt.header("ヘッダー");      // <h2>
kt.subheader("サブヘッダー"); // <h3>
kt.write("テキスト");       // テキスト出力
kt.text("テキスト");        // writeのエイリアス
kt.divider();              // 区切り線 <hr>
kt.html("<div>生HTML</div>"); // 生のHTML出力（注意: XSS対策必要）
```

#### データ表示API

```typescript
// テーブル - 様々なデータ形式に対応
kt.table([
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
]);

// 2D配列形式
kt.table([
  ["Name", "Age"],
  ["Alice", 30],
  ["Bob", 25],
]);

// 明示的ヘッダー指定
kt.table({
  columns: ["Name", "Age"],
  data: [["Alice", 30], ["Bob", 25]],
});
```

#### ページ設定API

```typescript
// ページの設定（タイトル、レイアウトなど）
kt.set_page_config({
  title: "My App",
  layout: "wide",  // "centered" | "wide"
  icon: "🚀",
});

// 明示的な再実行
kt.rerun();  // スクリプトを強制的に再実行
```

#### ウィジェットAPI

```typescript
// ボタン - 押されたらtrueを返す
if (kt.button("Click me", { key: "my_button" })) {
  // ボタンが押された時の処理
}

// スライダー - 現在の値を返す
const volume = kt.slider("Volume", 0, 100, 50, { key: "volume" });

// テキスト入力 - 現在の入力値を返す
const name = kt.text_input("Your name", "Default", { key: "name" });

// セレクトボックス - 選択された値を返す
const color = kt.selectbox("Color", ["Red", "Green", "Blue"], "Blue", { key: "color" });

// ダウンロードボタン - ファイルダウンロード
kt.download_button("Download CSV", "name,age\nAlice,30", "data.csv", {
  mime: "text/csv",
});

// チェックボックス - boolean値を返す
const agreed = kt.checkbox("I agree", false, { key: "agree" });

// トグル - boolean値を返す（スイッチスタイル）
const darkMode = kt.toggle("Dark mode", false, { key: "dark_mode" });

// ラジオボタン - 選択された値を返す
const size = kt.radio("Size", ["S", "M", "L"], "M", { key: "size" });

// 数値入力 - number値を返す
const age = kt.number_input("Age", 0, 120, 25, { key: "age", step: 1 });

// テキストエリア - 複数行テキストを返す
const bio = kt.text_area("Bio", "Tell us about yourself...", { key: "bio" });

// マルチセレクト - 選択された値の配列を返す
const tags = kt.multiselect("Tags", ["Tech", "Design", "Business"], [], { key: "tags" });
```

#### レイアウトAPI

```typescript
// タブ - 複数のタブで内容を整理
const [tab1, tab2, tab3] = kt.tabs(["Overview", "Data", "Settings"]);

tab1(() => {
  kt.header("Overview");
  kt.write("This is the overview tab.");
});

tab2(() => {
  kt.header("Data");
  kt.table(data);
});

tab3(() => {
  kt.header("Settings");
  kt.write("Configure your preferences here.");
});
```

### セッション状態管理

ユーザーごとのセッション状態を管理します。Streamlitの`st.session_state`と同様に使用できます。

#### createTypedSessionState（推奨）

型安全なセッション状態を作成します。型アサーションなしで安全にアクセスでき、IDEの補完も効きます。

```typescript
import { createTypedSessionState } from "kantan-ui";

// 型を定義してデフォルト値を指定
type AppState = {
  counter: number;
  name: string;
  items: string[];
};

const state = createTypedSessionState<AppState>({
  counter: 0,
  name: "World",
  items: [],
});

// 型安全にアクセス可能
state.counter++;           // OK - number型
state.name = "Hello";      // OK - string型
state.items.push("item");  // OK - string[]型
// state.unknown = 1;      // コンパイルエラー！
```

#### session_state（後方互換用）

動的なキーが必要な場合は、従来の`session_state`も利用できます。

```typescript
import { session_state } from "kantan-ui";

// 初期化
if (session_state.myValue === undefined) {
  session_state.myValue = "initial";
}

// 読み取り（型アサーションが必要）
const value = session_state.myValue as string;

// 書き込み
session_state.myValue = "new value";
```

### 命令的API（低レベルAPI）

より細かい制御が必要な場合は、命令的APIも利用できます。

```typescript
import { button, renderButton, slider, renderSlider } from "kantan-ui";

// 関数型API（押されたらtrueを返す）
const pressed = button("Click me", { key: "my_button" });

// レンダリング用（HTMLを返す）
const html = renderButton("Click me", { key: "my_button" });
```

## プロジェクト構造

```
src/
├── index.ts          # エントリーポイント（エクスポート）
├── app.ts            # createApp関数
├── server.ts         # デモサーバー
├── client/           # クライアントスクリプト生成
│   ├── script.ts     # WebSocket/イベント処理スクリプト
│   ├── types.ts      # クライアント設定の型定義
│   └── index.ts
├── config/           # 設定管理
│   ├── defaults.ts   # デフォルト設定
│   ├── types.ts      # 設定の型定義
│   └── index.ts
├── kt/               # 宣言的API（Streamlit風）
│   ├── context.ts    # レンダリングコンテキスト
│   ├── config.ts     # ページ設定（set_page_config）
│   ├── control.ts    # 制御API（rerun）
│   ├── data.ts       # データ表示（table）
│   ├── layout.ts     # レイアウト（tabs）
│   ├── output.ts     # 出力API（title, write, headerなど）
│   ├── widgets.ts    # ウィジェットAPI（button, sliderなど）
│   └── index.ts
├── runtime/          # 実行時コンテキスト管理
│   ├── context.ts    # getContext/setContext
│   ├── rerun.ts      # スクリプト再実行ロジック
│   └── index.ts
├── session/          # セッション管理
│   ├── manager.ts    # SessionManager（マルチタブ対応）
│   ├── state.ts      # session_state（Proxy実装）
│   ├── types.ts      # 型定義
│   └── index.ts
├── utils/            # ユーティリティ
│   ├── html.ts       # HTMLエスケープなど
│   └── type-guards.ts
├── websocket/        # WebSocket処理
│   ├── handler.ts    # WebSocketハンドラ
│   ├── types.ts      # メッセージ型定義
│   └── index.ts
└── widgets/          # UIウィジェット（命令的API）
    ├── button.ts
    ├── slider.ts
    ├── text-input.ts
    ├── text-area.ts
    ├── selectbox.ts
    ├── download-button.ts
    ├── checkbox.ts
    ├── toggle.ts
    ├── radio.ts
    ├── number-input.ts
    ├── multiselect.ts
    ├── core.ts       # 共通処理
    ├── registry.ts   # ウィジェットID管理
    ├── types.ts      # ウィジェット型定義
    └── index.ts
```

## NPMスクリプト

| コマンド | 説明 |
|---------|------|
| `bun run dev` | 開発サーバー起動（ホットリロード） |
| `bun run build` | プロダクションビルド |
| `bun run test` | ユニットテスト実行（Vitest） |
| `bun run test:watch` | ユニットテスト（監視モード） |
| `bun run test:coverage` | カバレッジ付きテスト |
| `bun run test:e2e` | E2Eテスト（Playwright） |
| `bun run lint` | Biomeでリントチェック |
| `bun run lint:fix` | リント自動修正 |
| `bun run ci` | CI用（lint + build + test:coverage） |

## 動作の仕組み

1. クライアントがページを読み込むと、WebSocket接続を確立
2. サーバーはセッションを作成し、初期HTMLを送信
3. ユーザーがウィジェットを操作すると、`sendEvent`でサーバーに通知（デバウンス付き）
4. サーバーは`session_state`を更新し、スクリプトを再実行（rerun）
5. 新しいHTMLをWebSocket経由でクライアントに送信（ストリーミング対応）
6. クライアントはDOMを更新（フォーカス状態を維持）

### 接続管理

- **Ping/Pong**: サーバーは定期的にpingを送信し、接続状態を監視
- **自動再接続**: 切断時はエクスポネンシャルバックオフで再接続を試行
- **シーケンス番号**: 再接続時に欠落したパッチを復元
- **マルチタブ**: 同一セッションの複数タブに状態変更をブロードキャスト

## ライセンス

MIT
