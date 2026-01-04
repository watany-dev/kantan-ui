# kantan-ui チュートリアル

このチュートリアルでは、kantan-uiを使ってインタラクティブなWebアプリケーションを構築する方法を学びます。

## 目次

1. [kantan-uiとは](#kantan-uiとは)
2. [環境構築](#環境構築)
3. [Hello World](#hello-world)
4. [ウィジェットの使い方](#ウィジェットの使い方)
5. [セッションステート](#セッションステート)
6. [実践: カウンターアプリ](#実践-カウンターアプリ)
7. [実践: TODOアプリ](#実践-todoアプリ)
8. [設定オプション](#設定オプション)
9. [次のステップ](#次のステップ)

---

## kantan-uiとは

kantan-uiは、Streamlitライクな開発体験を提供する軽量UIフレームワークです。

### 特徴

- **最小依存**: Honoのみに依存し、軽量で高速
- **宣言的API**: `kt.button()`, `kt.slider()`などの直感的なAPI
- **リアルタイム更新**: WebSocketによる即座のUI更新
- **型安全**: TypeScriptによる完全な型サポート
- **マルチランタイム**: Bun、Node.js、Denoで動作

### Streamlitとの違い

| 機能 | kantan-ui | Streamlit |
|------|-----------|-----------|
| 言語 | TypeScript | Python |
| 依存関係 | Honoのみ | 多数 |
| セッション管理 | タブ/ブラウザ単位 | サーバー単位 |
| カスタマイズ性 | 高い | 限定的 |

---

## 環境構築

### 前提条件

- [Bun](https://bun.sh/) v1.0以上（推奨）
- または Node.js v18以上

### インストール

```bash
# 新しいプロジェクトを作成
mkdir my-kantan-app
cd my-kantan-app
bun init

# kantan-uiをインストール
bun add kantan-ui
```

### プロジェクト構造

```
my-kantan-app/
├── src/
│   └── index.ts    # メインアプリケーション
├── package.json
└── tsconfig.json
```

---

## Hello World

最初のアプリを作成しましょう。

### src/index.ts

```typescript
import { createApp, kt } from "kantan-ui";

// スクリプト関数: UIを定義
const script = () => {
  kt.title("Hello, kantan-ui!");
  kt.write("これは最初のkantan-uiアプリです。");

  return undefined;
};

// アプリを作成
const { app, websocket } = createApp(script);

// サーバーをエクスポート
export default {
  fetch: app.fetch,
  websocket,
};
```

### 実行

```bash
bun run src/index.ts
```

ブラウザで http://localhost:3000 を開くと、「Hello, kantan-ui!」が表示されます。

---

## ウィジェットの使い方

kantan-uiは、インタラクティブなウィジェットを提供します。

### テキスト出力

```typescript
kt.title("タイトル");         // h1見出し
kt.header("ヘッダー");        // h2見出し
kt.subheader("サブヘッダー"); // h3見出し
kt.write("テキスト");         // 通常のテキスト
kt.text("テキスト");          // writeのエイリアス
kt.divider();                 // 区切り線
```

### ボタン

ボタンがクリックされると`true`を返します。

```typescript
if (kt.button("クリック")) {
  kt.write("ボタンがクリックされました！");
}
```

オプションで`key`を指定できます:

```typescript
if (kt.button("送信", { key: "submit_btn" })) {
  // 処理
}
```

### スライダー

数値を選択するスライダーです。

```typescript
const age = kt.slider("年齢", 0, 100, 25);
kt.write(`選択された年齢: ${age}`);
```

パラメータ:
- 第1引数: ラベル
- 第2引数: 最小値
- 第3引数: 最大値
- 第4引数: デフォルト値
- オプション: `{ key, step }`

```typescript
const volume = kt.slider("音量", 0, 100, 50, {
  key: "volume_slider",
  step: 5
});
```

### テキスト入力

テキストを入力するフィールドです。

```typescript
const name = kt.text_input("名前", "");
kt.write(`こんにちは、${name}さん！`);
```

プレースホルダーを設定:

```typescript
const email = kt.text_input("メール", "", {
  key: "email_input",
  placeholder: "example@example.com"
});
```

### セレクトボックス

ドロップダウンから選択します。

```typescript
const color = kt.selectbox("好きな色", ["赤", "青", "緑"], "青");
kt.write(`選択された色: ${color}`);
```

パラメータ:
- 第1引数: ラベル
- 第2引数: 選択肢の配列
- 第3引数: デフォルト値
- オプション: `{ key }`

---

## セッションステート

セッションステートを使うと、ユーザーの操作間で状態を保持できます。

### 型安全なセッションステート（推奨）

`createTypedSessionState`を使うと、型安全な状態管理ができます。

```typescript
import { createApp, kt, createTypedSessionState } from "kantan-ui";

// 状態の型を定義
type AppState = {
  counter: number;
  name: string;
  items: string[];
};

// 初期値を指定して状態を作成
const state = createTypedSessionState<AppState>({
  counter: 0,
  name: "",
  items: [],
});

const script = () => {
  kt.title("ステート管理デモ");

  // 型安全にアクセス
  kt.write(`カウント: ${state.counter}`);

  if (kt.button("増加")) {
    state.counter++;  // 型チェックされる
  }

  return undefined;
};
```

### 動的セッションステート

動的なキーが必要な場合は`session_state`を使用:

```typescript
import { session_state } from "kantan-ui";

const script = () => {
  // 初期化
  if (session_state.visits === undefined) {
    session_state.visits = 0;
  }

  session_state.visits++;
  kt.write(`訪問回数: ${session_state.visits}`);

  return undefined;
};
```

---

## 実践: カウンターアプリ

学んだことを組み合わせて、カウンターアプリを作成します。

```typescript
import { createApp, kt, createTypedSessionState } from "kantan-ui";

type CounterState = {
  count: number;
};

const state = createTypedSessionState<CounterState>({
  count: 0,
});

const script = () => {
  kt.title("カウンター");
  kt.divider();

  // 現在のカウントを表示
  kt.header(`カウント: ${state.count}`);

  // 増減ボタン
  if (kt.button("➕ 増加", { key: "inc" })) {
    state.count++;
  }

  if (kt.button("➖ 減少", { key: "dec" })) {
    state.count--;
  }

  if (kt.button("🔄 リセット", { key: "reset" })) {
    state.count = 0;
  }

  kt.divider();

  // スライダーで直接値を設定
  const newValue = kt.slider("値を設定", -100, 100, state.count);
  if (newValue !== state.count) {
    state.count = newValue;
  }

  return undefined;
};

const { app, websocket } = createApp(script);

export default {
  fetch: app.fetch,
  websocket,
};
```

---

## 実践: TODOアプリ

より実践的なTODOアプリを作成します。

```typescript
import { createApp, kt, createTypedSessionState } from "kantan-ui";

type Todo = {
  id: number;
  text: string;
  done: boolean;
};

type TodoState = {
  todos: Todo[];
  nextId: number;
  newTodoText: string;
};

const state = createTypedSessionState<TodoState>({
  todos: [],
  nextId: 1,
  newTodoText: "",
});

const script = () => {
  kt.title("TODOリスト");
  kt.divider();

  // 新しいTODOを追加
  kt.subheader("新しいタスクを追加");

  const inputText = kt.text_input("タスク", state.newTodoText, {
    key: "new_todo",
    placeholder: "やることを入力...",
  });
  state.newTodoText = inputText;

  if (kt.button("追加", { key: "add_btn" })) {
    if (state.newTodoText.trim() !== "") {
      state.todos.push({
        id: state.nextId++,
        text: state.newTodoText,
        done: false,
      });
      state.newTodoText = "";
    }
  }

  kt.divider();

  // TODOリストを表示
  kt.subheader(`タスク一覧 (${state.todos.length}件)`);

  if (state.todos.length === 0) {
    kt.write("タスクがありません。");
  } else {
    for (const todo of state.todos) {
      const status = todo.done ? "✅" : "⬜";
      const text = todo.done ? `~~${todo.text}~~` : todo.text;

      kt.write(`${status} ${text}`);

      // 完了/未完了の切り替え
      if (kt.button(todo.done ? "未完了に戻す" : "完了", {
        key: `toggle_${todo.id}`
      })) {
        todo.done = !todo.done;
      }

      // 削除ボタン
      if (kt.button("削除", { key: `delete_${todo.id}` })) {
        state.todos = state.todos.filter(t => t.id !== todo.id);
      }
    }
  }

  kt.divider();

  // 統計情報
  const completed = state.todos.filter(t => t.done).length;
  kt.write(`完了: ${completed} / ${state.todos.length}`);

  // 全削除ボタン
  if (state.todos.length > 0) {
    if (kt.button("すべて削除", { key: "clear_all" })) {
      state.todos = [];
    }
  }

  return undefined;
};

const { app, websocket } = createApp(script);

export default {
  fetch: app.fetch,
  websocket,
};
```

---

## 設定オプション

`createApp`の第2引数で設定をカスタマイズできます。

### 基本設定

```typescript
const { app, websocket } = createApp(script, {
  session: {
    scope: "tab",        // "tab" または "browser"
    ttl: 24 * 60 * 60 * 1000,  // セッションの有効期限（24時間）
  },
});
```

### セッションスコープ

| スコープ | 説明 | 用途 |
|---------|------|------|
| `tab` | タブごとに独立したセッション | デフォルト。マルチタスク向け |
| `browser` | ブラウザ全体で共有 | 認証情報の共有など |

### クライアント設定

```typescript
const config = {
  client: {
    maxReconnectAttempts: 5,     // 再接続の最大試行回数
    baseReconnectDelay: 1000,    // 再接続の基本遅延（ms）
    maxReconnectDelay: 30000,    // 再接続の最大遅延（ms）
    pingInterval: 30000,         // ピング間隔（0で無効）
  },
};
```

### ストリーミング設定

大きなUIを段階的にレンダリングする場合:

```typescript
const config = {
  streaming: {
    enabled: true,       // ストリーミングを有効化
    flushThreshold: 3,   // N回のkt.*呼び出しごとにフラッシュ
  },
};
```

### 完全な設定例

```typescript
import { createApp, kt } from "kantan-ui";

const script = () => {
  kt.title("設定されたアプリ");
  return undefined;
};

const { app, websocket } = createApp(script, {
  session: {
    sessionKey: "__my_app_session",
    ttl: 7 * 24 * 60 * 60 * 1000,  // 1週間
    cleanupInterval: 60 * 1000,
    scope: "browser",
    cookie: {
      httpOnly: true,
      secure: "auto",
      sameSite: "Lax",
      path: "/",
    },
  },
  client: {
    maxReconnectAttempts: 10,
    baseReconnectDelay: 500,
    maxReconnectDelay: 60000,
    pingInterval: 15000,
    pongTimeout: 30000,
  },
  streaming: {
    enabled: false,
    flushThreshold: 5,
  },
});

export default {
  fetch: app.fetch,
  websocket,
};
```

---

## 次のステップ

### 現在利用可能な機能（Week 5まで）

- ✅ テキスト出力（title, header, write, divider）
- ✅ ウィジェット（button, slider, text_input, selectbox）
- ✅ セッションステート管理
- ✅ WebSocketリアルタイム通信
- ✅ DOM差分更新
- ✅ マルチタブ対応
- ✅ 自動再接続
- ✅ フォーカス保持

### 今後の予定

- レイアウトコンポーネント: `kt.columns()`, `kt.tabs()`, `kt.sidebar()`
- データウィジェット: `kt.dataframe()`, `kt.chart()`
- 追加ウィジェット: `kt.checkbox()`, `kt.radio()`, `kt.file_uploader()`
- プラグインシステム

### 関連ドキュメント

- [技術ブログ Week 4](./tech-blog-week4.md) - アーキテクチャの詳細
- [DOM差分モジュール](./diff-module.md) - 差分アルゴリズムの解説
- [Week 5 ストリーミング](./impl/week5-streaming-phase2.md) - ストリーミング機能の設計

---

## トラブルシューティング

### WebSocket接続エラー

ブラウザのコンソールに接続エラーが表示される場合:

1. サーバーが起動しているか確認
2. ポート3000が使用されていないか確認
3. ファイアウォールの設定を確認

### 状態がリセットされる

- セッションスコープを確認（`tab`vs`browser`）
- ブラウザのlocalStorageがクリアされていないか確認
- TTL設定を確認

### 型エラー

`createTypedSessionState`を使用している場合:

```typescript
// ❌ 型に存在しないプロパティ
state.unknown = 1;  // TypeScriptエラー

// ✅ 型を更新
type AppState = {
  counter: number;
  unknown: number;  // 追加
};
```

---

## まとめ

kantan-uiを使えば、Pythonを使わずにStreamlitライクな開発体験を得られます。

```typescript
import { createApp, kt, createTypedSessionState } from "kantan-ui";

type State = { name: string };
const state = createTypedSessionState<State>({ name: "" });

const script = () => {
  kt.title("My App");

  state.name = kt.text_input("名前", state.name);

  if (kt.button("挨拶")) {
    kt.write(`こんにちは、${state.name}さん！`);
  }

  return undefined;
};

const { app, websocket } = createApp(script);
export default { fetch: app.fetch, websocket };
```

シンプルで、型安全で、高速。これがkantan-uiです。
