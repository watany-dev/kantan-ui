# kt.video API 設計書

作成日: 2026-02-04

## 実装ステータス

> **✅ 実装完了** (2026-02-06)

---

## 1. 概要

### 1.1 目的

Streamlit の `st.video()` に相当する機能を kantan-ui に実装する。HTML5 `<video>` 要素を用いて動画を表示する出力専用コンポーネントを提供する。

### 1.2 Streamlit API リファレンス

```python
st.video(
    data,
    format="video/mp4",
    start_time=0,
    *,
    subtitles=None,
    end_time=None,
    loop=False,
    autoplay=False,
    muted=False,
)
```

参考: [st.video - Streamlit Docs](https://docs.streamlit.io/develop/api-reference/media/st.video)

### 1.3 ユースケース

| ユースケース | 説明 |
|-------------|------|
| URL動画表示 | 外部ホストの動画URLを埋め込み表示 |
| アップロード動画再生 | ユーザーがアップロードした動画ファイルの再生 |
| バイナリデータ再生 | サーバーサイドで生成・変換した動画データの再生 |
| 字幕付き動画 | VTT形式の字幕を付与した動画再生 |
| プレゼンテーション | ループ・自動再生を活用した展示・デモ用途 |

### 1.4 設計原則

| 原則 | 説明 |
|------|------|
| **Web標準準拠** | HTML5 `<video>` 要素のネイティブ機能を活用 |
| **Streamlit互換** | `st.video()` と同等のパラメータ・使用感を提供 |
| **既存パターン準拠** | `kt.image()` と同様の出力コンポーネントパターンに従う |
| **セキュリティ** | ソースのエスケープ、バイナリデータのMIMEタイプ検証 |
| **アクセシビリティ** | WAI-ARIA、キーボード操作、字幕の言語メタデータ対応 |

---

## 2. API設計

### 2.1 基本API

```typescript
// URL から動画を表示
kt.video("https://example.com/movie.mp4");

// ポスター画像付き
kt.video("https://example.com/movie.mp4", {
  poster: "https://example.com/thumbnail.jpg",
});

// 字幕付き（単一言語）
kt.video("https://example.com/movie.mp4", {
  subtitles: { src: "/subs/ja.vtt", srclang: "ja", label: "日本語" },
});

// 字幕付き（複数言語）
kt.video("https://example.com/movie.mp4", {
  subtitles: [
    { src: "/subs/ja.vtt", srclang: "ja", label: "日本語" },
    { src: "/subs/en.vtt", srclang: "en", label: "English" },
  ],
});

// ループ・ミュート・自動再生（展示用途）
kt.video("https://example.com/demo.mp4", {
  autoplay: true,
  muted: true,
  loop: true,
});

// バイナリデータから再生
kt.video(videoBytes, {
  mimeType: "video/mp4",
});

// 再生範囲指定
kt.video("https://example.com/long-video.mp4", {
  startTime: 30,
  endTime: 120,
});
```

### 2.2 シグネチャ

```typescript
function video(
  source: VideoSource,
  config?: Partial<VideoConfig>
): void
```

### 2.3 パラメータ

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|------|------|-----------|------|
| `source` | `VideoSource` | ✅ | - | 動画ソース（URL, data URI, バイナリデータ） |
| `config` | `Partial<VideoConfig>` | - | `{}` | 設定オプション |

### 2.4 戻り値

| 型 | 説明 |
|------|------|
| `void` | 出力専用コンポーネント（状態を持たない） |

### 2.5 Streamlit との対応表

| Streamlit パラメータ | kantan-ui 対応 | 備考 |
|---------------------|---------------|------|
| `data` | `source` 引数 | `ImageSource` と同様のパターン |
| `format` | `config.mimeType` | バイナリデータ使用時に必要 |
| `start_time` | `config.startTime` | camelCase に変換 |
| `end_time` | `config.endTime` | camelCase に変換 |
| `subtitles` | `config.subtitles` | `SubtitleTrack` 型で `srclang` を明示的に管理 |
| `loop` | `config.loop` | そのまま |
| `autoplay` | `config.autoplay` | そのまま |
| `muted` | `config.muted` | そのまま |
| *(なし)* | `config.poster` | Streamlit未対応。HTML5標準属性として追加 |
| *(なし)* | `config.playsinline` | Streamlit未対応。モバイル対応に必須 |

---

## 3. 型定義

### 3.1 VideoSource

```typescript
/**
 * 動画ソースの型
 * - string: URL または data URI
 * - Uint8Array: バイナリデータ（mimeType必須）
 * - ArrayBuffer: バイナリデータ（mimeType必須）
 */
export type VideoSource = string | Uint8Array | ArrayBuffer;
```

> **注**: `ImageSource` と異なり、SVG文字列の判定は不要。Blob は非同期処理が必要なため初期実装では対象外とする（`ImageSource` と同じ方針）。

### 3.2 SubtitleTrack

```typescript
/**
 * 字幕トラックの定義
 *
 * W3C HTML5 <track> 要素に対応する型。
 * srclang を明示的に管理することで、スクリーンリーダーや
 * ブラウザの字幕選択UIが正しく動作する。
 */
export interface SubtitleTrack {
  /** VTT ファイルの URL */
  src: string;

  /**
   * BCP 47 言語タグ
   * @example "ja", "en", "zh-Hans"
   * @see https://www.w3.org/International/articles/language-tags/
   */
  srclang: string;

  /**
   * ユーザーに表示されるラベル
   * @example "日本語", "English"
   */
  label: string;
}
```

### 3.3 VideoConfig

```typescript
export interface VideoConfig {
  /**
   * バイナリデータのMIMEタイプ
   * Uint8Array / ArrayBuffer 使用時は必須。
   * "video/" プレフィックスで始まる値のみ受け付ける。
   * @example "video/mp4", "video/webm", "video/ogg"
   */
  mimeType?: string;

  /**
   * 再生開始位置（秒）
   * 0以上の有限数であること。負値・NaN・Infinityはエラー。
   * @default 0
   */
  startTime?: number;

  /**
   * 再生終了位置（秒）
   * startTime より大きい有限数であること。
   * 未指定の場合は動画の最後まで再生。
   */
  endTime?: number;

  /**
   * 字幕（WebVTT）
   * - SubtitleTrack: 単一言語の字幕
   * - SubtitleTrack[]: 複数言語の字幕（最初のトラックがデフォルト）
   *
   * @example
   * // 単一言語
   * { src: "/subs/ja.vtt", srclang: "ja", label: "日本語" }
   *
   * // 複数言語
   * [
   *   { src: "/subs/ja.vtt", srclang: "ja", label: "日本語" },
   *   { src: "/subs/en.vtt", srclang: "en", label: "English" },
   * ]
   */
  subtitles?: SubtitleTrack | SubtitleTrack[];

  /**
   * ループ再生
   * @default false
   */
  loop?: boolean;

  /**
   * 自動再生
   * ブラウザポリシーにより、muted: true との併用が推奨される。
   * muted なしの autoplay はブラウザにブロックされる可能性がある。
   * @default false
   */
  autoplay?: boolean;

  /**
   * ミュート（消音）
   * @default false
   */
  muted?: boolean;

  /**
   * ポスター画像の URL
   * 動画の読み込み前・再生前に表示されるサムネイル。
   * UXの観点から、動画コンテンツでは設定を推奨。
   * @example "https://example.com/thumbnail.jpg"
   */
  poster?: string;

  /**
   * インライン再生（モバイル対応）
   * iOS Safari でフルスクリーンに遷移せずインライン再生を行う。
   * モバイルファーストの商用アプリケーションでは true を推奨。
   * @default true
   */
  playsinline?: boolean;

  /**
   * ウィジェットの一意キー
   */
  key?: string;
}
```

### 3.4 設計判断

| 項目 | 判断 | 理由 |
|------|------|------|
| `Blob` 非対応 | 初期実装では除外 | `kt.image()` と同様、非同期処理が必要なため |
| `SubtitleTrack` 型の導入 | `Record<string, string>` を廃止 | `srclang` が `<track>` 要素に必須。アクセシビリティ・言語選択UIの正確な動作に不可欠 |
| `startTime` / `endTime` | Media Fragment URI で実装 | `#t=start,end` 形式。ブラウザネイティブ対応 |
| `poster` 初期実装に含める | HTML5基本属性 | サムネイル未表示は商用品質として不十分。UXに大きく影響 |
| `playsinline` デフォルト `true` | モバイル必須 | iOS Safari はデフォルトでフルスクリーン再生。商用アプリではインライン再生が標準的期待値 |
| `width` / `useContainerWidth` 非採用 | 初期実装では除外 | CSS でデフォルト `width: 100%` とし、必要に応じて将来追加 |
| `autoplay` + `muted` の警告 | バリデーションで対応 | ブラウザがブロックするため、`autoplay: true` かつ `muted: false` 時にコンソール警告 |

---

## 4. HTML構造

### 4.1 基本構造

```html
<figure class="kt-video" role="group" aria-label="動画プレイヤー">
  <video
    src="https://example.com/movie.mp4#t=30,120"
    controls
    playsinline
    poster="https://example.com/thumbnail.jpg"
    class="kt-video-player"
    preload="metadata">
    <track
      kind="subtitles"
      src="/subs/ja.vtt"
      srclang="ja"
      label="日本語"
      default />
    <track
      kind="subtitles"
      src="/subs/en.vtt"
      srclang="en"
      label="English" />
    <p class="kt-video-fallback">お使いのブラウザは動画再生に対応していません。</p>
  </video>
</figure>
```

### 4.2 属性

| 属性 | 値 | 説明 |
|------|------|------|
| `src` | URL / data URI | 動画ソース。`startTime`/`endTime` は Media Fragment URI (`#t=`) で付与 |
| `controls` | 常に付与 | ブラウザネイティブのコントロールUI |
| `preload` | `"metadata"` | メタデータのみ先読み（パフォーマンス考慮） |
| `playsinline` | デフォルト付与 | `config.playsinline !== false` の場合に付与（デフォルト `true`） |
| `poster` | 条件付き | `config.poster` が指定された場合に付与 |
| `loop` | 条件付き | `config.loop === true` の場合に付与 |
| `autoplay` | 条件付き | `config.autoplay === true` の場合に付与 |
| `muted` | 条件付き | `config.muted === true` の場合に付与 |
| `class` | `"kt-video-player"` | スタイリング用クラス |

### 4.3 フォールバックコンテンツ

`<video>` 要素内にフォールバックテキストを配置する。`<video>` 未対応ブラウザ（現在はほぼ存在しないが、Web標準として推奨されるプラクティス）で表示される。

### 4.4 字幕（`<track>` 要素）

```html
<!-- 単一字幕 -->
<track kind="subtitles" src="/subs/ja.vtt" srclang="ja" label="日本語" default />

<!-- 複数言語 -->
<track kind="subtitles" src="/subs/ja.vtt" srclang="ja" label="日本語" default />
<track kind="subtitles" src="/subs/en.vtt" srclang="en" label="English" />
```

- `SubtitleTrack` の場合: `default` 属性を付与
- `SubtitleTrack[]` の場合: 各エントリに `srclang`, `label` を設定、最初のトラックに `default` を付与
- `srclang` は BCP 47 言語タグ（`"ja"`, `"en"` 等）。ブラウザの字幕選択UIでの言語識別・スクリーンリーダーの読み上げに使用される

### 4.5 Media Fragment URI

`startTime` / `endTime` は [Media Fragments URI](https://www.w3.org/TR/media-frags/) 仕様に従い、`src` の URL フラグメントとして付与する:

| 条件 | 生成される URI |
|------|---------------|
| `startTime: 30` | `movie.mp4#t=30` |
| `endTime: 120` | `movie.mp4#t=,120` |
| `startTime: 30, endTime: 120` | `movie.mp4#t=30,120` |
| 両方未指定 | `movie.mp4`（フラグメントなし） |

---

## 5. CSSスタイル

```css
.kt-video {
  margin: 0;
  padding: 0;
  max-width: 100%;
}

.kt-video-player {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

/* poster未指定時のプレースホルダー背景 */
.kt-video-player:not([poster]) {
  background-color: var(--kt-bg-secondary, #f3f4f6);
}

/* フォールバックテキスト（video未対応ブラウザ用） */
.kt-video-fallback {
  padding: 1rem;
  text-align: center;
  color: var(--kt-text-secondary, #6b7280);
}
```

- デフォルトで `width: 100%` とし、コンテナ幅に合わせる
- `border-radius` は `kt-image-img` と統一
- `poster` 未指定時は背景色で最低限の視覚的領域を確保
- CSS カスタムプロパティにより、テーマ対応可能

---

## 6. ファイル構成

```
src/widgets/
├── types.ts              # VideoSource, VideoConfig を追加
├── video.ts              # 新規作成（renderVideo）
└── index.ts              # エクスポート追加

src/kt/
└── media.ts              # video() 宣言的API追加

src/styles/
└── default.ts            # .kt-video-* スタイル追加

tests/unit/widgets/
└── video.test.ts         # 新規作成
```

---

## 7. イテレーション計画

### Iteration 1: 型定義とテスト

**目標**: `VideoSource`, `SubtitleTrack`, `VideoConfig` の型定義とテスト作成

**作業内容**:
- `src/widgets/types.ts` に `VideoSource`, `SubtitleTrack`, `VideoConfig` を追加
- `tests/unit/widgets/video.test.ts` を作成（Red）

---

### Iteration 2: renderVideo 基本実装 + バリデーション

**目標**: URL ソースの動画レンダリングと入力バリデーション

**作業内容**:
- `src/widgets/video.ts` に `renderVideo()` を実装
  - URL ソースの処理
  - `controls`, `preload`, `playsinline` 属性の付与
  - `poster` 属性の条件付き付与
  - `escapeHtml()` によるソース・poster のサニタイズ
  - `javascript:` URI の検出・拒否
  - 空文字チェック
  - `role="group"`, `aria-label` の付与
  - フォールバックコンテンツの挿入
- テストを通す（Green）

---

### Iteration 3: バイナリデータ対応

**目標**: `Uint8Array` / `ArrayBuffer` ソースの対応

**作業内容**:
- `binaryToDataUri()` を活用したバイナリ→data URI 変換
- `mimeType` 未指定時のエラー
- `mimeType` の `video/` プレフィックス検証
- `data:` URI の MIME タイプ検証
- バイナリサイズ上限チェック（50MB）
- テスト追加

---

### Iteration 4: 再生オプション

**目標**: `loop`, `autoplay`, `muted`, `startTime`, `endTime` の実装

**作業内容**:
- boolean 属性の条件付き付与
- Media Fragment URI の生成ロジック
- `startTime` / `endTime` のバリデーション（負値、非有限数、endTime ≤ startTime）
- `autoplay` + `muted` の警告ロジック
- テスト追加

---

### Iteration 5: 字幕対応

**目標**: `subtitles` パラメータの実装

**作業内容**:
- `<track>` 要素の生成（`srclang`, `label`, `default` 属性）
- `SubtitleTrack` 単体 / `SubtitleTrack[]` 配列の両方に対応
- 字幕 `src` の `escapeHtml()` サニタイズ
- 字幕 `src` の `javascript:` URI 検証
- テスト追加

---

### Iteration 6: 宣言的API・スタイル

**目標**: `kt.video()` の完成

**作業内容**:
- `src/kt/media.ts` に `video()` 関数を追加
- `src/kt/index.ts` にエクスポート追加
- `src/styles/default.ts` に CSS 追加（フォールバック背景色含む）
- `tests/unit/kt/media.test.ts` にテスト追加（アクセシビリティ属性の検証含む）

---

## 8. バリデーションとエラーハンドリング

### 8.1 入力バリデーション

レンダリング前に以下のバリデーションを実施する。不正な入力はエラーをスローする（サイレントに無視しない）。

| 検証項目 | 条件 | エラーメッセージ |
|---------|------|----------------|
| `source` 空文字 | `source === ""` | `"video source must not be empty"` |
| `mimeType` プレフィックス | バイナリソースで `mimeType` が `video/` で始まらない | `"mimeType must start with 'video/'"` |
| `mimeType` 未指定 | バイナリソースで `mimeType` が未指定 | `"mimeType is required for binary video data"` |
| `startTime` 範囲 | `startTime < 0` または非有限数 | `"startTime must be a non-negative finite number"` |
| `endTime` 範囲 | `endTime <= 0` または非有限数 | `"endTime must be a positive finite number"` |
| `endTime` ≤ `startTime` | `endTime` が指定され `endTime <= startTime` | `"endTime must be greater than startTime"` |
| `javascript:` URI | `source` または `poster` が `javascript:` で始まる | `"javascript: URLs are not allowed"` |
| `data:` URI プレフィックス | `source` が `data:` で始まり `data:video/` でない | `"data URI must have a video/* MIME type"` |

### 8.2 実行時警告（コンソール出力）

エラーではないが、開発者に通知すべき状況:

| 条件 | 警告メッセージ |
|------|---------------|
| `autoplay: true` かつ `muted: false` | `"autoplay without muted may be blocked by browser policy"` |
| `poster` 未指定 | なし（警告しない。推奨はするが必須ではない） |

### 8.3 動画読み込みエラー（クライアントサイド）

`<video>` 要素の読み込みエラーはブラウザ側で発生する。サーバーサイドレンダリングでは検知できないため、CSS でフォールバック表示を提供する:

```css
.kt-video-player:not([poster]) {
  background-color: var(--kt-bg-secondary, #f3f4f6);
}
```

- `poster` が指定されていない場合、背景色でプレースホルダー領域を表示
- ブラウザネイティブのエラー表示に委ねる（カスタムエラーUIは過剰な複雑性）

---

## 9. バイナリデータのサイズ制限

### 9.1 data URI の制約

バイナリデータは Base64 エンコードして `data:` URI に変換される。これには以下の制約がある:

| 制約 | 値 | 根拠 |
|------|------|------|
| Base64 サイズ膨張 | 元データの約 1.33 倍 | Base64 エンコーディング仕様 |
| 最大ソースサイズ | **50 MB** | data URI がHTML内に埋め込まれるため、メモリ使用量を考慮 |
| 推奨ソースサイズ | **10 MB 以下** | 大規模データはURL参照を推奨 |

### 9.2 サイズ超過時の挙動

```typescript
const VIDEO_MAX_BINARY_SIZE = 50 * 1024 * 1024; // 50 MB

if (binaryData.byteLength > VIDEO_MAX_BINARY_SIZE) {
  throw new Error(
    `Video binary data size (${binaryData.byteLength} bytes) exceeds maximum allowed size (${VIDEO_MAX_BINARY_SIZE} bytes). Use a URL source instead.`
  );
}
```

### 9.3 パフォーマンスに関する注意事項

- data URI は HTML に直接埋め込まれるため、WebSocket 経由の差分更新で巨大なペイロードが発生する
- 大容量動画はURL参照を強く推奨。ドキュメントに明記する
- `kt.image()` の `binaryToDataUri()` を再利用するが、サイズチェックを動画用に調整する

---

## 10. セキュリティ考慮事項

| 脅威 | 対策 |
|------|------|
| XSS（URL インジェクション） | `escapeHtml()` で `src`, `poster` 属性をサニタイズ |
| 不正な MIME タイプ | バイナリデータ使用時は `mimeType` を `video/` プレフィックスで検証 |
| 字幕パスインジェクション | `<track>` の `src` も `escapeHtml()` でサニタイズ |
| JavaScript URI | `javascript:` スキームの検出・拒否（`source`, `poster`, `subtitles.src` 全てで検証） |
| data URI MIME 偽装 | `data:` URI が `data:video/` で始まることを検証 |
| バイナリ爆弾 | サイズ上限（50MB）の適用 |

---

## 11. アクセシビリティ

### 11.1 WAI-ARIA

| 属性 | 要素 | 値 | 説明 |
|------|------|------|------|
| `role="group"` | `<figure>` | - | 動画プレイヤー領域のセマンティックグルーピング |
| `aria-label` | `<figure>` | `"動画プレイヤー"` | スクリーンリーダーでの領域識別 |

> **注**: `<video controls>` はブラウザが内部的にアクセシビリティツリーを構築するため、`<video>` 要素自体に追加の ARIA 属性は不要。`controls` 属性の付与が最も重要。

### 11.2 キーボード操作

HTML5 `<video controls>` はブラウザネイティブで以下のキーボード操作をサポートする:

| キー | 動作 |
|------|------|
| `Space` / `Enter` | 再生 / 一時停止 |
| `←` / `→` | 巻き戻し / 早送り |
| `↑` / `↓` | 音量調整 |
| `M` | ミュート切替 |
| `F` | フルスクリーン切替 |
| `C` | 字幕切替（Chrome） |

カスタムキーボードハンドラは不要。`controls` 属性の付与で十分。

### 11.3 字幕のアクセシビリティ

- `<track>` 要素の `srclang` 属性により、支援技術が字幕の言語を正しく識別できる
- `label` 属性により、ユーザーが字幕選択UIで言語を識別できる
- `default` 属性により、字幕がデフォルトで有効になる（聴覚障害者への配慮）

---

## 12. ブラウザ互換性

| フォーマット | MIME タイプ | ブラウザ対応状況 |
|------------|-----------|----------------|
| MP4 (H.264) | `video/mp4` | 全主要ブラウザ ✅ |
| WebM (VP8/VP9) | `video/webm` | Chrome, Firefox, Edge ✅ / Safari ⚠️ |
| Ogg (Theora) | `video/ogg` | Chrome, Firefox ✅ / Safari, Edge ❌ |

> **推奨**: H.264 エンコードの MP4 を使用。OpenCV の MP4V コーデックはブラウザ非対応のため注意。

---

## 13. 非実装項目（将来検討）

| 項目 | 理由 |
|------|------|
| `width` / `useContainerWidth` | CSS デフォルトで十分。需要があれば追加 |
| YouTube / 外部プレイヤー埋め込み | セキュリティ（iframe）とスコープの問題。別 API として検討 |
| `Blob` ソース対応 | 非同期処理が必要。`kt.image()` と合わせて将来対応 |
| 複数ソース (`<source>` 要素) | フォーマット分岐。初期は単一ソースで十分 |
| カスタムコントロールUI | ブラウザネイティブで十分。拡張性は将来検討 |
| イベントハンドラ (`onPlay`, `onPause` 等) | 出力専用コンポーネントのスコープ外。将来のインタラクティブ版で検討 |

---

## 14. チェックリスト

### 実装前

- [x] 既存メディア実装パターンを確認（`image.ts`）
- [x] `binaryToDataUri()` の再利用可能性を確認

### 各イテレーション後

- [x] `bun run lint:fix` 実行
- [x] `bun run test` 実行
- [x] コミット

### 完了時

- [x] `bun run ci` 全パス
- [x] 単体テスト作成済み（バリデーション含む）
- [x] アクセシビリティテスト（`role`, `aria-label`, `srclang` の検証）
- [x] ドキュメント更新（README, TUTORIAL.md）

---

## 15. 参考資料

- [Streamlit st.video](https://docs.streamlit.io/develop/api-reference/media/st.video)
- [MDN HTMLVideoElement](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video)
- [MDN `<track>` 要素](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track)
- [W3C Media Fragments URI](https://www.w3.org/TR/media-frags/)
- [WebVTT](https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API)
- [BCP 47 言語タグ](https://www.w3.org/International/articles/language-tags/)
- [WAI-ARIA Authoring Practices - Video Player](https://www.w3.org/WAI/ARIA/apg/)
- kantan-ui 既存実装
  - `src/widgets/image.ts` - メディアコンポーネントパターン
  - `src/kt/media.ts` - 宣言的メディアAPI
  - `src/widgets/types.ts` - 型定義
