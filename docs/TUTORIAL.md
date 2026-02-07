# kantan-ui チュートリアル

このチュートリアルでは、kantan-uiを使ってインタラクティブなWebアプリケーションを構築する方法を学びます。

## 目次

1. [kantan-uiとは](#kantan-uiとは)
2. [環境構築](#環境構築)
3. [Hello World](#hello-world)
4. [ウィジェットの使い方](#ウィジェットの使い方)
5. [データ表示](#データ表示)
6. [チャート](#チャート)
7. [メディア](#メディア)
8. [レイアウト](#レイアウト)
9. [チャットUI](#チャットui)
10. [セッションステート](#セッションステート)
11. [キャッシュ](#キャッシュ)
12. [ページ設定](#ページ設定)
13. [実践: カウンターアプリ](#実践-カウンターアプリ)
14. [実践: TODOアプリ](#実践-todoアプリ)
15. [実践: チャットアプリ](#実践-チャットアプリ)
16. [設定オプション](#設定オプション)
17. [次のステップ](#次のステップ)

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

### ファイルアップローダー

ファイルをアップロードするウィジェットです。セキュリティ対策（マジックバイト検証、Polyglot検出、ファイル名サニタイズ）が組み込まれています。

```typescript
// 単一ファイル
const file = kt.file_uploader("ファイルをアップロード");
if (file) {
  kt.write(`ファイル名: ${file.name}`);
  kt.write(`サイズ: ${file.size} bytes`);
  kt.write(`タイプ: ${file.type}`);

  // テキストとして読み込み
  const content = file.text();
  kt.write(`内容: ${content}`);
}
```

パラメータ:
- 第1引数: ラベル
- オプション: `{ accept, multiple, maxSize, key, disabled, help, strictMode }`

```typescript
// 画像のみ、サイズ制限付き
const image = kt.file_uploader("画像をアップロード", {
  accept: "image/*",
  maxSize: 5 * 1024 * 1024,  // 5MB
});

// 複数ファイル
const files = kt.file_uploader("複数ファイルをアップロード", {
  multiple: true,
});
for (const f of files) {
  kt.write(`${f.name}: ${f.size} bytes`);
}

// 特定の拡張子のみ
const doc = kt.file_uploader("ドキュメントをアップロード", {
  accept: [".pdf", ".docx", ".txt"],
});
```

**UploadedFileオブジェクト:**

| メソッド/プロパティ | 説明 |
|-------------------|------|
| `name` | サニタイズ済みファイル名 |
| `size` | ファイルサイズ（バイト） |
| `type` | 検証済みMIMEタイプ |
| `text()` | UTF-8テキストとして取得 |
| `arrayBuffer()` | バイナリデータとして取得 |
| `stream()` | ReadableStreamとして取得 |

```typescript
// CSVファイルの処理例
const csv = kt.file_uploader("CSVファイル", { accept: ".csv" });
if (csv) {
  const text = csv.text();
  const lines = text.split("\n");
  kt.write(`行数: ${lines.length}`);
}

// バイナリファイルの処理例
const binary = kt.file_uploader("バイナリファイル");
if (binary) {
  const buffer = binary.arrayBuffer();
  const view = new DataView(buffer);
  kt.write(`最初のバイト: ${view.getUint8(0)}`);
}
```

**セキュリティ機能:**

- マジックバイト検証: ファイルの実際の内容からMIMEタイプを検証
- Polyglot検出: 複数形式として解釈可能な悪意あるファイルを検出
- ファイル名サニタイズ: パストラバーサル攻撃を防止
- 危険なファイルのブロック: 実行可能ファイル（.exe, .sh等）を拒否

```typescript
// 厳格モード（警告もエラーとして扱う）
const secure = kt.file_uploader("セキュアアップロード", {
  strictMode: true,
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

### データフレーム

`kt.dataframe()`は`kt.table()`のインタラクティブ拡張版です。ソート、検索、行選択の機能を備えています。

```typescript
// 基本的な使い方（kt.tableと同じデータ形式をサポート）
kt.dataframe([
  { name: "Alice", age: 30, city: "Tokyo" },
  { name: "Bob", age: 25, city: "Osaka" },
  { name: "Carol", age: 35, city: "Kyoto" },
]);
```

ヘッダーをクリックするとソート、ツールバーの検索ボックスでフィルタリングができます。

**行選択を有効にする場合:**

```typescript
const selection = kt.dataframe(
  [
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
    { name: "Carol", age: 35 },
  ],
  {
    onSelect: "rerun",           // 行選択を有効化（選択時にスクリプト再実行）
    selectionMode: "multi-row",  // "single-row" | "multi-row"
    key: "user_df",
  },
);

if (selection) {
  kt.write(`選択された行: ${selection.rows.join(", ")}`);
}
```

**オプション:**

| オプション | 型 | 説明 |
|-----------|-----|------|
| `height` | `number` | コンテナの高さ（px、デフォルト: 400） |
| `hideIndex` | `boolean` | 行番号を非表示にする |
| `columnOrder` | `string[]` | カラムの表示順を指定 |
| `onSelect` | `"ignore" \| "rerun"` | 行選択時の動作 |
| `selectionMode` | `"single-row" \| "multi-row"` | 選択モード |
| `key` | `string` | ウィジェットキー |

### メトリクス

ダッシュボードやKPI表示で使用するメトリクスコンポーネントです。

```typescript
// 基本使用
kt.metric("Revenue", "$1,234");

// 変化量付き
kt.metric("Revenue", "$1,234", { delta: "+12%" });

// 変化量の色を反転（増加=悪い場合、例: レスポンスタイム）
kt.metric("Response Time", "120ms", { delta: "+15ms", delta_color: "inverse" });

// 変化量の色を無効化
kt.metric("Users", "1,234", { delta: "+100", delta_color: "off" });

// 数値のdeltaは自動で符号が付く
kt.metric("Active Users", 1234, { delta: 156 }); // +156 と表示

// ヘルプテキスト付き
kt.metric("CPU Usage", "78%", {
  delta: "+5%",
  delta_color: "inverse",
  help: "高いCPU使用率はパフォーマンスに影響します"
});
```

**オプション:**

| オプション | 説明 |
|-----------|------|
| `delta` | 変化量（文字列または数値） |
| `delta_color` | `"normal"`（デフォルト）、`"inverse"`、`"off"` |
| `help` | ツールチップで表示されるヘルプテキスト |
| `label_visibility` | `"visible"`（デフォルト）、`"hidden"`、`"collapsed"` |

---

## チャート

データを視覚的にグラフ表示するためのAPIです。外部ライブラリ不要で、純粋なSVGで描画されます。

### 折れ線グラフ

`kt.line_chart()`は数値データを折れ線グラフとして表示します。

```typescript
// 数値配列（最もシンプルな使い方）
kt.line_chart([10, 20, 15, 30, 25]);
```

オブジェクト配列を使うと、複数シリーズを自動的に描画します:

```typescript
kt.line_chart([
  { month: "Jan", sales: 100, profit: 50 },
  { month: "Feb", sales: 120, profit: 60 },
  { month: "Mar", sales: 150, profit: 80 },
]);
```

x軸・y軸のカラムやラベル、色を指定できます:

```typescript
kt.line_chart(data, {
  x: "month",              // x軸のカラム名
  y: ["sales", "profit"],  // y軸のカラム名（複数可）
  x_label: "月",
  y_label: "金額（円）",
  color: ["#ff6384", "#36a2eb"],  // 線の色
  height: 300,             // グラフの高さ（px）
});
```

**サポートするデータ形式:**

| 形式 | 例 |
|------|-----|
| 数値配列 | `[10, 20, 30]` |
| オブジェクト配列 | `[{ x: 1, y: 10 }, { x: 2, y: 20 }]` |
| 2D配列 | `[[1, 10], [2, 20], [3, 30]]` |
| 明示的カラム形式 | `{ columns: ["x", "y"], data: [[1, 10], [2, 20]] }` |

**オプション:**

| オプション | 型 | デフォルト | 説明 |
|-----------|-----|---------|------|
| `x` | `string` | 自動検出 | x軸のカラム名 |
| `y` | `string \| string[]` | 自動検出 | y軸のカラム名（複数可） |
| `x_label` | `string` | - | x軸ラベル |
| `y_label` | `string` | - | y軸ラベル |
| `color` | `string \| string[]` | パレット | 線の色（HEX） |
| `height` | `number` | `400` | グラフの高さ（px） |
| `use_container_width` | `boolean` | `true` | コンテナ幅に合わせる |

---

## メディア

画像、音声、動画を表示するためのAPIです。

### 画像

画像を表示します。URLまたはバイナリデータを指定できます。

```typescript
// URLから画像を表示
kt.image("https://example.com/photo.jpg");

// キャプション付き
kt.image("https://example.com/photo.jpg", {
  caption: "美しい風景",
});

// 幅を指定
kt.image("https://example.com/photo.jpg", {
  width: 300,
});

// バイナリデータから表示
const imageData = await fetch("/api/image").then(res => res.arrayBuffer());
kt.image(new Uint8Array(imageData), {
  mimeType: "image/png",
});
```

### 音声

音声を再生するプレイヤーを表示します。

```typescript
// URLから音声を再生
kt.audio("https://example.com/music.mp3");

// 自動再生（ミュート必須）
kt.audio("https://example.com/music.mp3", {
  autoplay: true,
  muted: true,
});

// ループ再生
kt.audio("https://example.com/music.mp3", {
  loop: true,
});

// 再生範囲を指定（秒単位）
kt.audio("https://example.com/music.mp3", {
  startTime: 30,   // 30秒から開始
  endTime: 60,     // 60秒で終了
});
```

### 動画

動画を再生するプレイヤーを表示します。

```typescript
// URLから動画を再生
kt.video("https://example.com/movie.mp4");

// ポスター画像付き（サムネイル）
kt.video("https://example.com/movie.mp4", {
  poster: "https://example.com/thumbnail.jpg",
});

// 字幕付き
kt.video("https://example.com/movie.mp4", {
  subtitles: {
    src: "/subs/ja.vtt",
    srclang: "ja",
    label: "日本語",
  },
});

// 複数の字幕トラック
kt.video("https://example.com/movie.mp4", {
  subtitles: [
    { src: "/subs/ja.vtt", srclang: "ja", label: "日本語" },
    { src: "/subs/en.vtt", srclang: "en", label: "English" },
  ],
});
```

**再生オプション:**

```typescript
// 自動再生（ミュート必須）
kt.video("https://example.com/movie.mp4", {
  autoplay: true,
  muted: true,
});

// ループ再生
kt.video("https://example.com/movie.mp4", {
  loop: true,
});

// 再生範囲を指定（秒単位）
kt.video("https://example.com/movie.mp4", {
  startTime: 30,   // 30秒から開始
  endTime: 120,    // 2分で終了
});
```

**バイナリデータからの再生:**

```typescript
// Uint8Arrayから動画を表示
const videoData = await fetch("/api/video").then(res => res.arrayBuffer());
kt.video(new Uint8Array(videoData), {
  mimeType: "video/mp4",
});
```

**動画オプション一覧:**

| オプション | 型 | 説明 |
|-----------|-----|------|
| `poster` | `string` | サムネイル画像のURL |
| `subtitles` | `SubtitleTrack \| SubtitleTrack[]` | 字幕トラック |
| `autoplay` | `boolean` | 自動再生（muted必須） |
| `muted` | `boolean` | ミュート状態 |
| `loop` | `boolean` | ループ再生 |
| `startTime` | `number` | 再生開始位置（秒） |
| `endTime` | `number` | 再生終了位置（秒） |
| `mimeType` | `string` | MIMEタイプ（バイナリ用） |
| `playsinline` | `boolean` | インライン再生（デフォルト: true） |

**注意事項:**

- `autoplay`を使用する場合は`muted: true`が必須です（ブラウザのポリシー）
- バイナリデータは50MB以下に制限されています
- 字幕ファイルはWebVTT形式（.vtt）を使用してください

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

## Emptyプレースホルダー

動的に更新可能なプレースホルダーを作成します。Streamlitの`st.empty()`と同様に、コンテンツを後から変更できます。

### 基本的な使い方

```typescript
// プレースホルダーを作成
const status = kt.empty({ key: "status" });

// 動的にコンテンツを変更
if (kt.button("処理開始")) {
  status.spinner("処理中...");
}

if (kt.button("完了")) {
  status.success("処理が完了しました！");
}

if (kt.button("クリア")) {
  status.empty();  // コンテンツをクリア
}
```

### ユースケース

**ローディング表示 → 結果表示**

```typescript
const result = kt.empty({ key: "result" });

if (kt.button("データを取得")) {
  result.spinner("読み込み中...");
  // 実際のアプリではここで非同期処理を行う
  result.success("データを取得しました！");
}
```

**進捗表示**

```typescript
const progress = kt.empty({ key: "progress" });

if (kt.button("処理を開始")) {
  progress.progress(0.25, { text: "25% 完了" });
  // 処理が進むたびに更新
  progress.progress(0.75, { text: "75% 完了" });
  progress.success("完了！");
}
```

**条件付きアラート**

```typescript
const alert = kt.empty({ key: "alert" });

const value = kt.number_input("値を入力", 0, 100, 50);

if (value > 80) {
  alert.error("値が大きすぎます！");
} else if (value < 20) {
  alert.warning("値が小さすぎます");
} else {
  alert.empty();  // 正常な範囲内ではクリア
}
```

### 利用可能なメソッド

| メソッド | 説明 |
|---------|------|
| `write(content)` | テキスト/数値/真偽値を表示 |
| `text(content)` | プレーンテキストを表示 |
| `markdown(content)` | Markdownを表示 |
| `html(content)` | 生HTMLを表示 |
| `json(data)` | JSONをフォーマット表示 |
| `code(content, language?)` | コードブロックを表示 |
| `success(message)` | 成功アラートを表示 |
| `error(message)` | エラーアラートを表示 |
| `warning(message)` | 警告アラートを表示 |
| `info(message)` | 情報アラートを表示 |
| `progress(value, config?)` | プログレスバーを表示（0.0〜1.0） |
| `spinner(text?)` | ローディングスピナーを表示 |
| `empty()` | コンテンツをクリア |

```typescript
const placeholder = kt.empty({ key: "demo" });

// 様々なコンテンツを表示
placeholder.write("テキスト");
placeholder.markdown("**太字** と *斜体*");
placeholder.json({ name: "Alice", age: 30 });
placeholder.code("const x = 1;", "typescript");
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

### 動的セッションステート（Streamlit互換）

動的なキーが必要な場合は`kt.session_state`を使用します。Streamlitの`st.session_state`と同じパターンです:

```typescript
import { kt } from "kantan-ui";

const script = () => {
  // 初期化
  if (kt.session_state.visits === undefined) {
    kt.session_state.visits = 0;
  }

  kt.session_state.visits++;
  kt.write(`訪問回数: ${kt.session_state.visits}`);

  return undefined;
};
```

**注意**: `kt.session_state`は型がつきません。型安全が必要な場合は`createTypedSessionState`を使用してください。

---

## キャッシュ

高コストな計算やデータ取得の結果をキャッシュして、パフォーマンスを向上させます。Streamlitの`@st.cache_data`/`@st.cache_resource`に相当します。

### cache_data

シリアライズ可能なデータ（API結果、計算結果など）のキャッシュに使用します。

```typescript
import { kt } from "kantan-ui";

// 基本使用
const fetchUsers = kt.cache_data(async (limit: number) => {
  const res = await fetch(`/api/users?limit=${limit}`);
  return res.json();
});

const users = await fetchUsers(10);  // 2回目以降はキャッシュから返す
```

**オプション:**

```typescript
// TTL（有効期限）付き - 1時間で期限切れ
const fetchWeather = kt.cache_data(async (city: string) => {
  return await weatherApi.get(city);
}, { ttl: 3600 });

// 最大エントリ数制限 - LRUで古いエントリを削除
const searchProducts = kt.cache_data(async (query: string) => {
  return await productApi.search(query);
}, { max_entries: 50 });
```

### cache_resource

シリアライズ不可なリソース（DBコネクション、MLモデルなど）のキャッシュに使用します。

```typescript
// 何度呼んでも同じインスタンスを返す
const getDb = kt.cache_resource(() => {
  console.log("Creating new DB connection...");
  return new Database(process.env.DATABASE_URL);
});

const db1 = getDb();
const db2 = getDb();
console.log(db1 === db2); // true - 同一インスタンス
```

### キャッシュのクリア

```typescript
// 特定のキャッシュ関数をクリア
fetchUsers.clear();

// 全cache_dataをクリア
kt.cache_data.clear();

// 全cache_resourceをクリア
kt.cache_resource.clear();

// 全キャッシュをクリア
kt.clear_all_caches();
```

### cache_data vs cache_resource

| 特性 | cache_data | cache_resource |
|------|------------|----------------|
| 主な用途 | API結果、計算結果 | DBコネクション、MLモデル |
| 戻り値 | 値をコピーして返す | 同一インスタンスを返す |
| デフォルトmax_entries | 100 | 10 |

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
- ✅ ファイルアップロード（file_uploader）
- ✅ データ表示（table, dataframe, metric）
- ✅ チャート（line_chart）
- ✅ メディア（image, audio, video）
- ✅ レイアウト（tabs, sidebar, columns, container, expander, empty）
- ✅ チャットUI（chat_message, chat_container, chat_input）
- ✅ カラーピッカー（color_picker）
- ✅ ストリーミング出力（write_stream）
- ✅ ページ設定（set_page_config, rerun）
- ✅ セッションステート管理
- ✅ キャッシュ（cache_data, cache_resource）
- ✅ WebSocketリアルタイム通信
- ✅ DOM差分更新
- ✅ マルチタブ対応
- ✅ 自動再接続
- ✅ フォーカス保持
- ✅ ストリーミングレンダリング

### 今後の予定

- チャート: `kt.bar_chart()`
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
