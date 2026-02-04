# kt.video API 設計書

作成日: 2026-02-04

## 実装ステータス

> **📋 設計中**

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

---

## 2. API設計

### 2.1 基本API

```typescript
// URL から動画を表示
kt.video("https://example.com/movie.mp4");

// 字幕付き
kt.video("https://example.com/movie.mp4", {
  subtitles: "https://example.com/captions.vtt",
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
| `subtitles` | `config.subtitles` | VTT URL または文字列 |
| `loop` | `config.loop` | そのまま |
| `autoplay` | `config.autoplay` | そのまま |
| `muted` | `config.muted` | そのまま |

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

### 3.2 VideoConfig

```typescript
export interface VideoConfig {
  /**
   * バイナリデータのMIMEタイプ
   * Uint8Array / ArrayBuffer 使用時は必須
   * @example "video/mp4", "video/webm", "video/ogg"
   */
  mimeType?: string;

  /**
   * 再生開始位置（秒）
   * @default 0
   */
  startTime?: number;

  /**
   * 再生終了位置（秒）
   * 未指定の場合は動画の最後まで再生
   */
  endTime?: number;

  /**
   * 字幕（WebVTT）
   * - string: VTTファイルのURL
   * - Record<string, string>: ラベルとURLのマッピング（複数言語対応）
   * @example "https://example.com/captions.vtt"
   * @example { "日本語": "/subs/ja.vtt", "English": "/subs/en.vtt" }
   */
  subtitles?: string | Record<string, string>;

  /**
   * ループ再生
   * @default false
   */
  loop?: boolean;

  /**
   * 自動再生
   * ブラウザポリシーにより、muted: true との併用が推奨される
   * @default false
   */
  autoplay?: boolean;

  /**
   * ミュート（消音）
   * @default false
   */
  muted?: boolean;

  /**
   * ウィジェットの一意キー
   */
  key?: string;
}
```

### 3.3 設計判断

| 項目 | 判断 | 理由 |
|------|------|------|
| `Blob` 非対応 | 初期実装では除外 | `kt.image()` と同様、非同期処理が必要なため |
| `subtitles` に `Record` 型 | 複数言語対応 | Streamlitも辞書形式をサポート。`<track>` 要素を複数生成 |
| `startTime` / `endTime` | Media Fragment URI で実装 | `#t=start,end` 形式。ブラウザネイティブ対応 |
| `width` / `useContainerWidth` 非採用 | 初期実装では除外 | CSS でデフォルト `width: 100%` とし、必要に応じて将来追加 |

---

## 4. HTML構造

### 4.1 基本構造

```html
<figure class="kt-video">
  <video
    src="https://example.com/movie.mp4#t=30,120"
    controls
    class="kt-video-player"
    preload="metadata">
    <track
      kind="subtitles"
      src="https://example.com/captions.vtt"
      default />
  </video>
</figure>
```

### 4.2 属性

| 属性 | 値 | 説明 |
|------|------|------|
| `src` | URL / data URI | 動画ソース。`startTime`/`endTime` は Media Fragment URI (`#t=`) で付与 |
| `controls` | 常に付与 | ブラウザネイティブのコントロールUI |
| `preload` | `"metadata"` | メタデータのみ先読み（パフォーマンス考慮） |
| `loop` | 条件付き | `config.loop === true` の場合に付与 |
| `autoplay` | 条件付き | `config.autoplay === true` の場合に付与 |
| `muted` | 条件付き | `config.muted === true` の場合に付与 |
| `class` | `"kt-video-player"` | スタイリング用クラス |

### 4.3 字幕（`<track>` 要素）

```html
<!-- 単一字幕 -->
<track kind="subtitles" src="captions.vtt" default />

<!-- 複数言語 -->
<track kind="subtitles" src="/subs/ja.vtt" label="日本語" default />
<track kind="subtitles" src="/subs/en.vtt" label="English" />
```

- 単一文字列の場合: ラベルなしで `default` 属性を付与
- `Record<string, string>` の場合: 各エントリに `label` 属性を設定、最初のトラックに `default` を付与

### 4.4 Media Fragment URI

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
```

- デフォルトで `width: 100%` とし、コンテナ幅に合わせる
- `border-radius` は `kt-image-img` と統一

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

**目標**: `VideoSource`, `VideoConfig` の型定義とテスト作成

**作業内容**:
- `src/widgets/types.ts` に `VideoSource`, `VideoConfig` を追加
- `tests/unit/widgets/video.test.ts` を作成（Red）

---

### Iteration 2: renderVideo 基本実装

**目標**: URL ソースの動画レンダリング

**作業内容**:
- `src/widgets/video.ts` に `renderVideo()` を実装
  - URL ソースの処理
  - `controls`, `preload` 属性の付与
  - `escapeHtml()` によるソースのサニタイズ
- テストを通す（Green）

---

### Iteration 3: バイナリデータ対応

**目標**: `Uint8Array` / `ArrayBuffer` ソースの対応

**作業内容**:
- `binaryToDataUri()` を活用したバイナリ→data URI 変換
- `mimeType` 未指定時のエラーハンドリング
- テスト追加

---

### Iteration 4: 再生オプション

**目標**: `loop`, `autoplay`, `muted`, `startTime`, `endTime` の実装

**作業内容**:
- boolean 属性の条件付き付与
- Media Fragment URI の生成ロジック
- テスト追加

---

### Iteration 5: 字幕対応

**目標**: `subtitles` パラメータの実装

**作業内容**:
- `<track>` 要素の生成
- 単一文字列 / `Record<string, string>` の両方に対応
- テスト追加

---

### Iteration 6: 宣言的API・スタイル

**目標**: `kt.video()` の完成

**作業内容**:
- `src/kt/media.ts` に `video()` 関数を追加
- `src/kt/index.ts` にエクスポート追加
- `src/styles/default.ts` に CSS 追加
- `tests/unit/kt/media.test.ts` にテスト追加

---

## 8. セキュリティ考慮事項

| 脅威 | 対策 |
|------|------|
| XSS（URL インジェクション） | `escapeHtml()` で `src` 属性をサニタイズ |
| 不正な MIME タイプ | バイナリデータ使用時は `mimeType` を `video/` プレフィックスで検証 |
| 字幕パスインジェクション | `<track>` の `src` も `escapeHtml()` でサニタイズ |
| JavaScript URI | `javascript:` スキームの検出・拒否 |

---

## 9. ブラウザ互換性

| フォーマット | MIME タイプ | ブラウザ対応状況 |
|------------|-----------|----------------|
| MP4 (H.264) | `video/mp4` | 全主要ブラウザ ✅ |
| WebM (VP8/VP9) | `video/webm` | Chrome, Firefox, Edge ✅ / Safari ⚠️ |
| Ogg (Theora) | `video/ogg` | Chrome, Firefox ✅ / Safari, Edge ❌ |

> **推奨**: H.264 エンコードの MP4 を使用。OpenCV の MP4V コーデックはブラウザ非対応のため注意。

---

## 10. 非実装項目（将来検討）

| 項目 | 理由 |
|------|------|
| `width` / `useContainerWidth` | CSS デフォルトで十分。需要があれば追加 |
| YouTube / 外部プレイヤー埋め込み | セキュリティ（iframe）とスコープの問題。別 API として検討 |
| `Blob` ソース対応 | 非同期処理が必要。`kt.image()` と合わせて将来対応 |
| ポスター画像 (`poster`) | 需要に応じて追加可能 |
| `playsinline` 属性 | モバイル対応として将来検討 |
| 複数ソース (`<source>` 要素) | フォーマット分岐。初期は単一ソースで十分 |
| カスタムコントロールUI | ブラウザネイティブで十分。拡張性は将来検討 |

---

## 11. チェックリスト

### 実装前

- [ ] 既存メディア実装パターンを確認（`image.ts`）
- [ ] `binaryToDataUri()` の再利用可能性を確認

### 各イテレーション後

- [ ] `bun run lint:fix` 実行
- [ ] `bun run test` 実行
- [ ] コミット

### 完了時

- [ ] `bun run ci` 全パス
- [ ] 単体テスト作成済み
- [ ] ドキュメント更新（README, streamlit-api-comparison.md）

---

## 12. 参考資料

- [Streamlit st.video](https://docs.streamlit.io/develop/api-reference/media/st.video)
- [MDN HTMLVideoElement](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video)
- [W3C Media Fragments URI](https://www.w3.org/TR/media-frags/)
- [WebVTT](https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API)
- kantan-ui 既存実装
  - `src/widgets/image.ts` - メディアコンポーネントパターン
  - `src/kt/media.ts` - 宣言的メディアAPI
  - `src/widgets/types.ts` - 型定義
