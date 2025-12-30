# kantan-ui

Webスタンダードと [Hono](https://hono.dev/) のみに依存する、Streamlit風のUIフレームワークです。

## 特徴

- **シンプル** - Streamlitライクな宣言的API（`kt.button()`, `kt.slider()`など）
- **リアルタイム** - WebSocketによる即時UI更新
- **軽量** - Honoのみに依存、マルチランタイム対応（Bun, Node.js, Deno）
- **セッション管理** - 複数ユーザーの状態を自動管理
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
import { createApp, kt, session_state } from "kantan-ui";

const script = () => {
  // セッション状態の初期化
  if (session_state.count === undefined) {
    session_state.count = 0;
  }

  kt.title("Counter App");

  // ボタンが押されたらtrueを返す
  if (kt.button("+ Increment")) {
    session_state.count = (session_state.count as number) + 1;
  }

  kt.write(`Count: ${session_state.count}`);

  // 宣言的APIを使用する場合はundefinedを返す
  return undefined;
};

const { app, websocket } = createApp(script);

export default {
  fetch: app.fetch,
  websocket,
};
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
```

### session_state

ユーザーごとのセッション状態を管理するオブジェクトです。Streamlitの`st.session_state`と同様に使用できます。

```typescript
import { session_state } from "kantan-ui";

// 初期化
if (session_state.myValue === undefined) {
  session_state.myValue = "initial";
}

// 読み取り
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
├── config/           # 設定管理
│   ├── defaults.ts   # デフォルト設定
│   ├── types.ts      # 設定の型定義
│   └── index.ts
├── kt/               # 宣言的API（Streamlit風）
│   ├── context.ts    # レンダリングコンテキスト
│   ├── output.ts     # 出力API（title, write, headerなど）
│   ├── widgets.ts    # ウィジェットAPI（button, sliderなど）
│   └── index.ts
├── runtime/          # 実行時コンテキスト管理
│   ├── context.ts    # getContext/setContext
│   ├── rerun.ts      # スクリプト再実行ロジック
│   └── index.ts
├── session/          # セッション管理
│   ├── manager.ts    # SessionManager
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
    ├── selectbox.ts
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
3. ユーザーがウィジェットを操作すると、`sendEvent`でサーバーに通知
4. サーバーは`session_state`を更新し、スクリプトを再実行（rerun）
5. 新しいHTMLをWebSocket経由でクライアントに送信
6. クライアントはDOMを更新

## ライセンス

MIT
