# kantan-ui チュートリアル

このチュートリアルでは、kantan-uiを使ってインタラクティブなWebアプリケーションを構築する方法を学びます。

## 目次

1. [kantan-uiとは](#kantan-uiとは)
2. [環境構築](#環境構築)
3. [Hello World](#hello-world)
4. [ウィジェットの使い方](#ウィジェットの使い方)
5. [データ表示](#データ表示)
6. [レイアウト](#レイアウト)
7. [チャットUI](#チャットui)
8. [セッションステート](#セッションステート)
9. [ページ設定](#ページ設定)
10. [実践: カウンターアプリ](#実践-カウンターアプリ)
11. [実践: TODOアプリ](#実践-todoアプリ)
12. [実践: チャットアプリ](#実践-チャットアプリ)
13. [設定オプション](#設定オプション)
14. [次のステップ](#次のステップ)

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

// アプリを作成してエクスポート（ポート指定可能）
export default await createApp(script, { port: 3000 });
```

### 実行

**Bun（推奨）**

```bash
bun run src/index.ts
```

Bunは`export default`で`fetch`/`websocket`/`port`を持つオブジェクトを自動的にサーバーとして起動します。

**Node.js**

```typescript
import { createApp, kt } from "kantan-ui";
import { serve } from "kantan-ui/serve";

const script = () => {
  kt.title("Hello, kantan-ui!");
  kt.write("これは最初のkantan-uiアプリです。");
  return undefined;
};

const app = await createApp(script);
serve(app, { port: 3000 });
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
- 第4引数: デフォルト値（省略時はmin値）
- オプション: `{ key, step }`

```typescript
const volume = kt.slider("音量", 0, 100, 50, {
  key: "volume_slider",
  step: 5
});

// デフォルト値を省略すると最小値が使われる
const brightness = kt.slider("明るさ", 0, 100);  // デフォルトは0
```

**注意**: `min > max`や範囲外の`defaultValue`を指定するとエラーになります。

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
- 第2引数: 選択肢の配列（空配列は不可）
- 第3引数: デフォルト値（省略時は最初のオプション）
- オプション: `{ key }`

```typescript
// デフォルト値を省略すると最初のオプションが選択される
const size = kt.selectbox("サイズ", ["S", "M", "L"]);  // デフォルトは"S"
```

**注意**: 空の配列や、選択肢に存在しない`defaultValue`を指定するとエラーになります。

### ダウンロードボタン

ファイルダウンロードを提供するボタンです。

```typescript
// テキストデータのダウンロード
kt.download_button(
  "Download CSV",
  "name,age\nAlice,30\nBob,25",
  "users.csv",
  { mime: "text/csv" }
);

// バイナリデータのダウンロード
const buffer = new TextEncoder().encode("Binary content").buffer;
kt.download_button("Download Binary", buffer, "data.bin");
```

パラメータ:
- 第1引数: ボタンのラベル
- 第2引数: ダウンロードするデータ（文字列またはArrayBuffer）
- 第3引数: ファイル名
- オプション: `{ key, mime, disabled }`

```typescript
// 動的データのダウンロード
const jsonData = JSON.stringify(state.data, null, 2);
kt.download_button("Export JSON", jsonData, "export.json", {
  mime: "application/json",
});
```

### チェックボックス

真偽値を選択するチェックボックスです。

```typescript
const agreed = kt.checkbox("利用規約に同意する", false);
if (agreed) {
  kt.write("同意いただきありがとうございます！");
}
```

パラメータ:
- 第1引数: ラベル
- 第2引数: デフォルト値（省略時はfalse）
- オプション: `{ key, disabled }`

### トグル

オン/オフを切り替えるスイッチスタイルのウィジェットです。

```typescript
const darkMode = kt.toggle("ダークモード", false);
kt.write(`ダークモード: ${darkMode ? "オン" : "オフ"}`);
```

パラメータ:
- 第1引数: ラベル
- 第2引数: デフォルト値（省略時はfalse）
- オプション: `{ key, disabled }`

### ラジオボタン

複数の選択肢から1つを選択します。

```typescript
const size = kt.radio("サイズ", ["S", "M", "L"], "M");
kt.write(`選択されたサイズ: ${size}`);
```

パラメータ:
- 第1引数: ラベル
- 第2引数: 選択肢の配列
- 第3引数: デフォルト値（省略時は最初のオプション）
- オプション: `{ key, horizontal, disabled }`

```typescript
// 横並びレイアウト
const color = kt.radio("色", ["赤", "青", "緑"], "青", { horizontal: true });
```

### 数値入力

数値を入力するフィールドです。

```typescript
const age = kt.number_input("年齢", 0, 120, 25);
kt.write(`年齢: ${age}歳`);
```

パラメータ:
- 第1引数: ラベル
- 第2引数: 最小値
- 第3引数: 最大値
- 第4引数: デフォルト値（省略時は最小値）
- オプション: `{ key, step, disabled }`

```typescript
// ステップを指定
const price = kt.number_input("価格", 0, 10000, 100, { step: 100 });
```

### テキストエリア

複数行のテキストを入力するフィールドです。

```typescript
const bio = kt.text_area("自己紹介", "こんにちは！");
kt.write(`入力内容: ${bio}`);
```

パラメータ:
- 第1引数: ラベル
- 第2引数: デフォルト値
- オプション: `{ key, placeholder, rows, disabled }`

```typescript
// 行数を指定
const description = kt.text_area("説明", "", {
  placeholder: "説明を入力してください...",
  rows: 5
});
```

### マルチセレクト

複数の選択肢から複数を選択できます。

```typescript
const tags = kt.multiselect("タグ", ["技術", "デザイン", "ビジネス"], []);
kt.write(`選択されたタグ: ${tags.join(", ")}`);
```

パラメータ:
- 第1引数: ラベル
- 第2引数: 選択肢の配列
- 第3引数: デフォルト値（選択された値の配列）
- オプション: `{ key, maxSelections, disabled }`

```typescript
// 最大選択数を制限
const skills = kt.multiselect("スキル", ["JS", "TS", "Python", "Go"], [], {
  maxSelections: 3
});
```

### 日付入力

日付を選択するピッカーです。HTML5の`<input type="date">`を使用します。

```typescript
const birthday = kt.date_input("誕生日", "2000-01-15");
kt.write(`選択された日付: ${birthday}`);
```

パラメータ:
- 第1引数: ラベル
- 第2引数: デフォルト値（`"YYYY-MM-DD"`形式の文字列、または`Date`オブジェクト、省略時は空文字列）
- オプション: `{ key, min, max, disabled }`

```typescript
// 日付範囲を制限
const eventDate = kt.date_input("イベント日", "2024-06-01", {
  min: "2024-01-01",
  max: "2024-12-31",
  key: "event_date"
});
```

Dateオブジェクトも使用できます:

```typescript
// Dateオブジェクトをデフォルト値として使用
const today = new Date();
const selectedDate = kt.date_input("日付", today);

// min/maxにもDateオブジェクトを指定可能
const reservation = kt.date_input("予約日", new Date(), {
  min: new Date(),                    // 今日以降
  max: new Date(2025, 11, 31),        // 2025年12月31日まで
});
```

**戻り値**: `"YYYY-MM-DD"` 形式の文字列（例: `"2024-06-15"`）

### 時刻入力

時刻を選択するピッカーです。HTML5の`<input type="time">`を使用します。

```typescript
const alarm = kt.time_input("アラーム", "08:30");
kt.write(`設定時刻: ${alarm}`);
```

パラメータ:
- 第1引数: ラベル
- 第2引数: デフォルト値（`"HH:MM"`形式の文字列、または`Date`オブジェクト、省略時は空文字列）
- オプション: `{ key, step, disabled }`

```typescript
// 秒単位の精度を有効化
const preciseTime = kt.time_input("正確な時刻", "12:30:00", {
  step: 1,  // 1秒単位
  key: "precise_time"
});

// 15分刻みのスケジュール
const meetingTime = kt.time_input("会議時間", "09:00", {
  step: 900,  // 15分 = 900秒
  key: "meeting_time"
});
```

Dateオブジェクトも使用できます:

```typescript
// Dateオブジェクトをデフォルト値として使用
const now = new Date();
const selectedTime = kt.time_input("時刻", now);  // 現在時刻

// 秒も含める場合
const preciseNow = kt.time_input("正確な時刻", now, { step: 1 });
```

**戻り値**: `"HH:MM"` または `"HH:MM:SS"` 形式の文字列（stepによる）

---

## データ表示

データを視覚的に表示するためのAPIです。

### テーブル

様々な形式のデータをテーブルとして表示します。

```typescript
// オブジェクト配列形式（推奨）
kt.table([
  { name: "Alice", age: 30, city: "Tokyo" },
  { name: "Bob", age: 25, city: "Osaka" },
  { name: "Carol", age: 35, city: "Kyoto" },
]);
```

2D配列形式も使用できます:

```typescript
// 最初の行がヘッダーとして扱われます
kt.table([
  ["Name", "Age", "City"],
  ["Alice", 30, "Tokyo"],
  ["Bob", 25, "Osaka"],
]);
```

明示的にカラムを指定する場合:

```typescript
kt.table({
  columns: ["名前", "年齢", "都市"],
  data: [
    ["Alice", 30, "Tokyo"],
    ["Bob", 25, "Osaka"],
  ],
});
```

オプション:

```typescript
kt.table(data, {
  key: "user_table",      // ウィジェットキー
  headers: ["A", "B"],    // ヘッダーの上書き
});
```

**注意**: テーブル内のデータはXSS対策として自動的にエスケープされます。

---

## レイアウト

UIをレイアウトするためのコンポーネントです。

### タブ

複数のタブで内容を整理します。

```typescript
const [overview, details, settings] = kt.tabs([
  "概要",
  "詳細",
  "設定"
]);

overview(() => {
  kt.header("概要");
  kt.write("アプリケーションの概要説明です。");
});

details(() => {
  kt.header("詳細データ");
  kt.table(data);
});

settings(() => {
  kt.header("設定");
  const theme = kt.selectbox("テーマ", ["ライト", "ダーク"]);
  kt.write(`選択されたテーマ: ${theme}`);
});
```

タブの状態は自動的に保存され、ページをリロードしても選択したタブが維持されます。

各タブ関数には`isActive`プロパティがあり、現在アクティブかどうかを確認できます:

```typescript
const [tab1, tab2] = kt.tabs(["Tab 1", "Tab 2"]);

if (tab1.isActive) {
  kt.write("Tab 1 is currently active");
}

tab1(() => {
  kt.write("Content for Tab 1");
});

tab2(() => {
  kt.write("Content for Tab 2");
});
```

---

## チャットUI

チャットアプリケーションを構築するためのAPIです。

### チャットメッセージ

ユーザーとアシスタントのメッセージを表示します。

```typescript
// 基本的な使い方
kt.chat_message("user", "こんにちは！");
kt.chat_message("assistant", "はい、何かお手伝いできますか？");

// システムメッセージ
kt.chat_message("system", "チャットを開始しました");
```

メッセージの内容はMarkdownに対応しています:

```typescript
kt.chat_message("assistant", "**太字**や`コード`も使えます。\n\n```typescript\nconst x = 1;\n```");
```

カスタムアバターと名前を設定:

```typescript
kt.chat_message("user", "質問があります", {
  name: "田中太郎",
  avatar: "🧑‍💻",
});

kt.chat_message("assistant", "お答えします", {
  name: "AI Assistant",
  avatar: "🤖",
});
```

### チャットコンテナ

メッセージをスクロール可能な領域に表示し、新しいメッセージが追加されると自動的に最下部にスクロールします。

```typescript
kt.chat_container(() => {
  for (const msg of state.messages) {
    kt.chat_message(msg.role, msg.content);
  }
}, { height: "400px" });
```

オプション:
- `height`: コンテナの高さ（デフォルト: "400px"）

**自動スクロールの動作:**
- 新しいメッセージが追加されると自動的に最下部にスクロール
- ユーザーが上にスクロールすると自動スクロールは一時停止
- ユーザーが最下部に戻ると自動スクロールが再開

### ロール別スタイリング

| ロール | 説明 | スタイル |
|--------|------|----------|
| `user` | ユーザーのメッセージ | 右寄せ、薄い青背景 |
| `assistant` | アシスタントの応答 | 左寄せ、白背景 |
| `system` | システム通知 | 左寄せ、薄い黄色背景、イタリック |

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

## ページ設定

ページ全体の設定を行うためのAPIです。

### set_page_config

ページのタイトル、レイアウト、アイコンなどを設定します。

```typescript
kt.set_page_config({
  title: "My Dashboard",      // ブラウザタブのタイトル
  icon: "📊",                  // ファビコン（絵文字）
  layout: "wide",             // "centered" | "wide"
  initialSidebarState: "expanded",  // "auto" | "expanded" | "collapsed"
  menuItems: [
    { label: "GitHub", url: "https://github.com" },
    { label: "Docs", url: "/docs" },
  ],
});
```

**注意**: `set_page_config`はスクリプトの最初に呼び出してください。

### rerun

スクリプトを強制的に再実行します。

```typescript
const autoRefresh = kt.selectbox("自動更新", ["オン", "オフ"]);

if (autoRefresh === "オン") {
  // 何らかの条件で再実行
  kt.rerun();
}
```

**注意**: `rerun()`を呼び出すと、その時点でスクリプトの実行が中断され、最初から再実行されます。無限ループにならないよう注意してください。

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
  if (kt.button("+ 増加", { key: "inc" })) {
    state.count++;
  }

  if (kt.button("- 減少", { key: "dec" })) {
    state.count--;
  }

  if (kt.button("リセット", { key: "reset" })) {
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

export default await createApp(script);
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
      // 完了状態をアイコンで表示
      const status = todo.done ? "[完了]" : "[未完了]";
      kt.write(`${status} ${todo.text}`);

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

export default await createApp(script);
```

---

## 実践: チャットアプリ

Chat APIを使って、シンプルなチャットアプリを作成します。

```typescript
import { createApp, kt, createTypedSessionState } from "kantan-ui";

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
  kt.chat_container(() => {
    if (state.messages.length === 0) {
      kt.chat_message("system", "チャットを開始してください");
    }

    for (const msg of state.messages) {
      kt.chat_message(msg.role, msg.content);
    }
  }, { height: "400px" });

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

export default await createApp(script);
```

### 発展: LLM APIとの連携

実際のチャットボットでは、OpenAI APIなどと連携できます:

```typescript
// 注意: これは同期的な例です
// 実際のストリーミング応答には追加の実装が必要です

async function callLLM(messages: Message[]): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
```

---

## 設定オプション

`createApp`の第2引数で設定をカスタマイズできます。

### 基本設定

```typescript
// 全ランタイム共通: await createApp でアプリを作成
export default await createApp(script, {
  port: 3000,            // サーバーポート（Bun.serve互換）
  hostname: "0.0.0.0",   // ホスト名（省略可）
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

export default await createApp(script, {
  // サーバー設定（Bun.serve互換）
  port: 3000,
  hostname: "0.0.0.0",

  // セッション設定
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

  // クライアント設定
  client: {
    maxReconnectAttempts: 10,
    baseReconnectDelay: 500,
    maxReconnectDelay: 60000,
    pingInterval: 15000,
    pongTimeout: 30000,
  },

  // ストリーミング設定
  streaming: {
    enabled: false,
    flushThreshold: 5,
  },
});
```

---

## 次のステップ

### 現在利用可能な機能

- ✅ テキスト出力（title, header, write, divider, html）
- ✅ 基本ウィジェット（button, slider, text_input, selectbox, download_button）
- ✅ フォームウィジェット（checkbox, toggle, radio, number_input, text_area, multiselect）
- ✅ 日付・時刻入力（date_input, time_input）
- ✅ データ表示（table）
- ✅ レイアウト（tabs, sidebar, columns, container, expander）
- ✅ チャットUI（chat_message, chat_container）
- ✅ ページ設定（set_page_config, rerun）
- ✅ セッションステート管理
- ✅ WebSocketリアルタイム通信
- ✅ DOM差分更新
- ✅ マルチタブ対応
- ✅ 自動再接続
- ✅ フォーカス保持
- ✅ ストリーミングレンダリング

### 今後の予定（Phase 3-B/C）

- キャッシュ: `kt.cache_data()`, `kt.cache_resource()`
- データウィジェット: `kt.dataframe()`, `kt.file_uploader()`
- チャート: `kt.line_chart()`, `kt.bar_chart()`
- 追加ウィジェット: `kt.color_picker()`, `kt.metric()`
- メディア: `kt.image()`, `kt.audio()`, `kt.video()`
- プラグインシステム

### 関連ドキュメント

- [技術ブログ Week 4](./tech-blog-week4.md) - アーキテクチャの詳細
- [技術ブログ Week 5](./tech-blog-week5.md) - ストリーミングとリアルタイム通信
- [DOM差分モジュール](./diff-module.md) - 差分アルゴリズムの解説

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

export default await createApp(script);
```

シンプルで、型安全で、高速。これがkantan-uiです。
