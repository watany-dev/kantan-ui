# kantan-ui

Webスタンダードと [Hono](https://hono.dev/) のみに依存する、Streamlit風のUIフレームワークです。

## 特徴

- **シンプル** - Streamlitライクな直感的API
- **リアルタイム** - WebSocketによる即時UI更新
- **軽量** - HonoとBunのみに依存
- **セッション管理** - 複数ユーザーの状態を自動管理

## クイックスタート

### 必要環境

- [Bun](https://bun.sh/) v1.0以上

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

### 基本的なアプリ作成

```typescript
import { createApp, getContext, session_state } from "kantan-ui";

const script = () => {
  const context = getContext();

  // セッション状態の初期化
  if (session_state.count === undefined) {
    session_state.count = 0;
  }

  // ボタンイベントの処理
  if (context?.event?.widgetId === "increment") {
    session_state.count = (session_state.count as number) + 1;
  }

  const count = session_state.count as number;

  return `
    <div>
      <h1>Count: ${count}</h1>
      <button id="increment" onclick="sendEvent('increment', 'clicked')">
        +1
      </button>
    </div>
  `;
};

const { app, websocket } = createApp(script);

export default {
  fetch: app.fetch,
  websocket,
};
```

### session_state

ユーザーごとのセッション状態を管理するオブジェクトです。Streamlitの`st.session_state`と同様に使用できます。

```typescript
// 初期化
if (session_state.myValue === undefined) {
  session_state.myValue = "initial";
}

// 読み取り
const value = session_state.myValue as string;

// 書き込み
session_state.myValue = "new value";
```

### getContext

現在の実行コンテキストを取得します。ウィジェットからのイベント情報が含まれます。

```typescript
const context = getContext();

// イベントが発生した場合
if (context?.event) {
  console.log(context.event.widgetId); // イベントを発生させたウィジェットのID
  console.log(context.event.value);    // イベントの値
}
```

### ウィジェット

#### Button

```typescript
import { button, renderButton } from "kantan-ui";

// 関数型API（押されたらtrueを返す）
const pressed = button("Click me", { key: "my_button" });

// レンダリング用
const html = renderButton("Click me", { key: "my_button" });
```

#### Slider

```typescript
import { slider, renderSlider } from "kantan-ui";

// 関数型API（現在の値を返す）
const value = slider("Volume", 0, 100, 50, { key: "volume", step: 5 });

// レンダリング用
const html = renderSlider("Volume", 0, 100, value, { key: "volume", step: 5 });
```

#### Text Input

```typescript
import { text_input, renderTextInput } from "kantan-ui";

// 関数型API（現在の入力値を返す）
const name = text_input("Your name", "Default", { key: "name", placeholder: "Enter name" });

// レンダリング用
const html = renderTextInput("Your name", name, { key: "name", placeholder: "Enter name" });
```

#### Selectbox

```typescript
import { selectbox, renderSelectbox } from "kantan-ui";

const options = ["Red", "Green", "Blue"];

// 関数型API（選択された値を返す）
const color = selectbox("Color", options, "Blue", { key: "color" });

// レンダリング用
const html = renderSelectbox("Color", options, color, { key: "color" });
```

### イベント送信（クライアント側）

クライアント側のHTMLでは`sendEvent`関数を使用してサーバーにイベントを送信します：

```html
<button onclick="sendEvent('widget_id', 'value')">Click</button>
<input oninput="sendEvent('input_id', this.value)" />
<input type="range" oninput="sendEvent('slider_id', Number(this.value))" />
<select onchange="sendEvent('select_id', this.value)">...</select>
```

## プロジェクト構造

```
src/
├── index.ts          # エントリーポイント（エクスポート）
├── app.ts            # createApp関数
├── server.ts         # デモサーバー
├── runtime/          # 実行時コンテキスト管理
│   ├── context.ts    # getContext/setContext
│   └── rerun.ts      # スクリプト再実行ロジック
├── session/          # セッション管理
│   ├── manager.ts    # SessionManager
│   ├── state.ts      # session_state（Proxy実装）
│   └── types.ts      # 型定義
├── websocket/        # WebSocket処理
│   ├── handler.ts    # WebSocketハンドラ
│   └── types.ts      # メッセージ型定義
└── widgets/          # UIウィジェット
    ├── button.ts
    ├── slider.ts
    ├── text-input.ts
    ├── selectbox.ts
    ├── registry.ts   # ウィジェットID管理
    └── types.ts      # ウィジェット型定義
```

## NPMスクリプト

| コマンド | 説明 |
|---------|------|
| `bun run dev` | 開発サーバー起動（ホットリロード） |
| `bun run build` | プロダクションビルド |
| `bun run test` | ユニットテスト実行 |
| `bun run test:watch` | ユニットテスト（監視モード） |
| `bun run test:coverage` | カバレッジ付きテスト |
| `bun run test:e2e` | E2Eテスト（Playwright） |
| `bun run lint` | Biomeでリント |
| `bun run format` | Biomeでフォーマット |
| `bun run check` | リント＆フォーマット自動修正 |

## 動作の仕組み

1. クライアントがページを読み込むと、WebSocket接続を確立
2. サーバーはセッションを作成し、初期HTMLを送信
3. ユーザーがウィジェットを操作すると、`sendEvent`でサーバーに通知
4. サーバーは`session_state`を更新し、スクリプトを再実行（rerun）
5. 新しいHTMLをWebSocket経由でクライアントに送信
6. クライアントはDOMを更新

## ライセンス

MIT
