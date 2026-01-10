# kt.image 設計書

作成日: 2026-01-10

## 実装状況

| 機能 | 状態 |
|------|------|
| 基本機能（単一画像） | ⬜ 未実装 |
| 複数画像表示 | ⬜ 未実装 |
| バイナリデータ対応 | ⬜ 未実装 |
| キャプション | ⬜ 未実装 |
| サイズ制御 | ⬜ 未実装 |
| CSS スタイル | ⬜ 未実装 |
| ユニットテスト | ⬜ 未実装 |
| E2Eテスト | ⬜ 未実装 |

---

## 概要

Streamlit の `st.image` に相当する機能。画像を表示するためのコンポーネントで、URL、data URI、バイナリデータからの画像表示に対応する。複数画像の同時表示もサポート。

### Streamlit との比較

| 機能 | Streamlit | kantan-ui |
|------|-----------|-----------|
| URL | ✅ | ✅ |
| ローカルパス | ✅ | ❌（セキュリティ + マルチランタイム） |
| bytes | ✅ | ✅（Uint8Array / ArrayBuffer） |
| numpy配列 | ✅ | ❌（JS環境では一般的でない） |
| PIL.Image | ✅ | ❌（Python固有） |
| data URI | ✅ | ✅ |
| SVG文字列 | ✅ | ✅ |
| 複数画像 | ✅（リスト渡し） | ✅（配列渡し） |
| キャプション | ✅ | ✅ |
| 幅指定 | ✅ | ✅ |
| コンテナ幅 | ✅ use_container_width | ✅ useContainerWidth |

---

## 使用例

### 基本的な使い方

```typescript
import { kt, createApp } from "kantan-ui";

const script = () => {
  // URL から画像を表示
  kt.image("https://example.com/photo.jpg");

  // キャプション付き
  kt.image("https://example.com/photo.jpg", {
    caption: "サンプル画像",
  });

  // サイズ指定
  kt.image("https://example.com/photo.jpg", {
    width: 300,
  });

  // コンテナ幅に合わせる
  kt.image("https://example.com/photo.jpg", {
    useContainerWidth: true,
  });
};

export default await createApp(script);
```

### data URI / Base64

```typescript
const base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

kt.image(`data:image/png;base64,${base64}`, {
  caption: "1x1 pixel",
});
```

### バイナリデータ

```typescript
// Uint8Array からの表示
const imageBytes: Uint8Array = await fetchImageAsBytes();
kt.image(imageBytes, {
  mimeType: "image/png",  // バイナリ時は必須
  caption: "Uploaded image",
});
```

### SVG

```typescript
kt.image(`<svg width="100" height="100">
  <circle cx="50" cy="50" r="40" fill="red" />
</svg>`, {
  caption: "Red circle",
});
```

### 複数画像

```typescript
// 複数画像を横並び表示
kt.image([
  "https://example.com/img1.jpg",
  "https://example.com/img2.jpg",
  "https://example.com/img3.jpg",
], {
  caption: ["Image 1", "Image 2", "Image 3"],
  width: 200,
});
```

---

## API設計

### 関数シグネチャ

```typescript
// 単一画像
function image(source: ImageSource, config?: Partial<ImageConfig>): void;

// 複数画像（オーバーロード）
function image(sources: ImageSource[], config?: Partial<ImageConfig>): void;
```

### ImageSource 型

```typescript
/**
 * 画像ソースの型
 * - string: URL, data URI, または SVG文字列
 * - Uint8Array: バイナリデータ（mimeType必須）
 * - ArrayBuffer: バイナリデータ（mimeType必須）
 * - Blob: Blobオブジェクト
 */
type ImageSource = string | Uint8Array | ArrayBuffer | Blob;
```

### ImageConfig 型

```typescript
interface ImageConfig {
  /**
   * 画像のキャプション
   * 複数画像の場合は配列で指定
   */
  caption?: string | string[];

  /**
   * 画像の幅（ピクセル）
   * useContainerWidth と併用不可
   */
  width?: number;

  /**
   * コンテナ幅に合わせる
   * true の場合、width は無視される
   */
  useContainerWidth?: boolean;

  /**
   * アクセシビリティ用の代替テキスト
   * 指定しない場合は caption が使用される
   * 複数画像の場合は配列で指定
   */
  alt?: string | string[];

  /**
   * バイナリデータのMIMEタイプ
   * Uint8Array / ArrayBuffer 使用時は必須
   * @example "image/png", "image/jpeg", "image/webp"
   */
  mimeType?: string;

  /**
   * ウィジェットの一意キー
   */
  key?: string;
}
```

---

## 入力ソースの処理

### ソース判別ロジック

```typescript
function detectSourceType(source: ImageSource): SourceType {
  if (source instanceof Uint8Array || source instanceof ArrayBuffer) {
    return "binary";
  }
  if (source instanceof Blob) {
    return "blob";
  }
  if (typeof source === "string") {
    if (source.startsWith("data:")) {
      return "dataUri";
    }
    if (source.trimStart().startsWith("<svg")) {
      return "svg";
    }
    if (source.startsWith("http://") || source.startsWith("https://")) {
      return "url";
    }
    // その他の文字列はURLとして扱う
    return "url";
  }
  throw new Error("Unsupported image source type");
}
```

### バイナリ → data URI 変換

```typescript
function binaryToDataUri(data: Uint8Array | ArrayBuffer, mimeType: string): string {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  const base64 = btoa(String.fromCharCode(...bytes));
  return `data:${mimeType};base64,${base64}`;
}
```

### SVG → data URI 変換

```typescript
function svgToDataUri(svg: string): string {
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml,${encoded}`;
}
```

---

## 出力HTML

### 単一画像

```html
<figure class="kt-image" style="--kt-image-width: 300px">
  <img
    src="https://example.com/photo.jpg"
    alt="サンプル画像"
    class="kt-image-img"
    loading="lazy"
  />
  <figcaption class="kt-image-caption">サンプル画像</figcaption>
</figure>
```

### 単一画像（キャプションなし）

```html
<figure class="kt-image" style="--kt-image-width: 300px">
  <img
    src="https://example.com/photo.jpg"
    alt=""
    class="kt-image-img"
    loading="lazy"
  />
</figure>
```

### 複数画像

```html
<div class="kt-image-gallery">
  <figure class="kt-image" style="--kt-image-width: 200px">
    <img src="..." alt="Image 1" class="kt-image-img" loading="lazy" />
    <figcaption class="kt-image-caption">Image 1</figcaption>
  </figure>
  <figure class="kt-image" style="--kt-image-width: 200px">
    <img src="..." alt="Image 2" class="kt-image-img" loading="lazy" />
    <figcaption class="kt-image-caption">Image 2</figcaption>
  </figure>
  <figure class="kt-image" style="--kt-image-width: 200px">
    <img src="..." alt="Image 3" class="kt-image-img" loading="lazy" />
    <figcaption class="kt-image-caption">Image 3</figcaption>
  </figure>
</div>
```

### useContainerWidth

```html
<figure class="kt-image kt-image-container-width">
  <img src="..." alt="" class="kt-image-img" loading="lazy" />
</figure>
```

---

## CSSスタイル

```css
/* 単一画像 */
.kt-image {
  margin: 0;
  padding: 0;
  display: inline-block;
  max-width: 100%;
}

.kt-image-img {
  display: block;
  width: var(--kt-image-width, auto);
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.kt-image-caption {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--kt-text-secondary, #6b7280);
  text-align: center;
}

/* コンテナ幅 */
.kt-image-container-width {
  display: block;
  width: 100%;
}

.kt-image-container-width .kt-image-img {
  width: 100%;
}

/* 複数画像ギャラリー */
.kt-image-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-start;
}

.kt-image-gallery .kt-image {
  flex: 0 0 auto;
}
```

---

## 実装ファイル構成

| ファイル | 内容 |
|---------|------|
| `src/widgets/types.ts` | `ImageConfig` 型定義追加 |
| `src/widgets/image.ts` | 画像レンダリング実装 |
| `src/widgets/index.ts` | エクスポート追加 |
| `src/kt/media.ts` | kt.image() 宣言的API（新規） |
| `src/kt/index.ts` | image エクスポート追加 |
| `src/styles/default.ts` | 画像スタイル追加 |
| `tests/unit/kt/media.test.ts` | ユニットテスト |
| `e2e/media.spec.ts` | E2Eテスト |

---

## 実装計画

各イテレーションは `bun run ci` を通過することを完了条件とする。

---

### イテレーション 1: 型定義とスケルトン

**目標**: 型定義とファイル構成を整備

- [ ] `src/widgets/types.ts` に `ImageConfig` 型を追加
- [ ] `src/widgets/image.ts` を作成（空の `renderImage()` 関数）
- [ ] `src/widgets/index.ts` にエクスポート追加
- [ ] `src/kt/media.ts` を作成（空の `image()` 関数）
- [ ] `src/kt/index.ts` に `image` エクスポート追加
- [ ] `tests/unit/kt/media.test.ts` を作成（スケルトンテスト）

**テスト**: 型定義が正しくエクスポートされることを確認

**完了条件**: `bun run ci` 通過

---

### イテレーション 2: URL画像の基本表示

**目標**: URLからの画像表示を実装

- [ ] `renderImage()` でURL画像のHTML生成を実装
- [ ] `kt.image()` で `renderImage()` を呼び出し、RenderContextに追加
- [ ] `escapeHtml()` でalt/caption をエスケープ

**テスト**:
- [ ] URL画像のHTML出力が正しいこと
- [ ] alt属性が正しく設定されること
- [ ] caption未指定時はfigcaptionが出力されないこと

**完了条件**: `bun run ci` 通過

---

### イテレーション 3: キャプションとalt

**目標**: キャプションとアクセシビリティ対応

- [ ] `caption` オプションでfigcaptionを表示
- [ ] `alt` オプションでalt属性を設定
- [ ] alt未指定時はcaptionをaltに使用
- [ ] 両方未指定時は空文字列

**テスト**:
- [ ] caption指定時のfigcaption出力
- [ ] alt指定時のalt属性
- [ ] alt未指定・caption指定時の挙動
- [ ] XSSエスケープが正しく行われること

**完了条件**: `bun run ci` 通過

---

### イテレーション 4: サイズ制御

**目標**: width / useContainerWidth オプション実装

- [ ] `width` オプションで幅をCSS変数として設定
- [ ] `useContainerWidth` オプションでコンテナ幅に合わせる
- [ ] 両方指定時は `useContainerWidth` を優先

**テスト**:
- [ ] width指定時のstyle属性
- [ ] useContainerWidth時のクラス付与
- [ ] 両方指定時の優先順位

**完了条件**: `bun run ci` 通過

---

### イテレーション 5: CSSスタイル

**目標**: 画像コンポーネントのスタイル実装

- [ ] `src/styles/default.ts` に画像スタイル追加
  - `.kt-image` 基本スタイル
  - `.kt-image-img` 画像スタイル
  - `.kt-image-caption` キャプションスタイル
  - `.kt-image-container-width` コンテナ幅スタイル

**テスト**:
- [ ] スタイル文字列に必要なクラスが含まれること

**完了条件**: `bun run ci` 通過

---

### イテレーション 6: data URI対応

**目標**: data URI形式の画像表示

- [ ] data URI文字列をそのままsrcに設定
- [ ] ソースタイプ判別ロジック実装

**テスト**:
- [ ] data URI画像のHTML出力
- [ ] URL vs data URI の判別

**完了条件**: `bun run ci` 通過

---

### イテレーション 7: SVG文字列対応

**目標**: SVG文字列からの画像表示

- [ ] SVG文字列検出ロジック実装
- [ ] SVG → data URI 変換実装
- [ ] `<img src="data:image/svg+xml,...">` として出力

**テスト**:
- [ ] SVG文字列の検出
- [ ] SVG → data URI 変換の正確性
- [ ] SVG画像のHTML出力

**完了条件**: `bun run ci` 通過

---

### イテレーション 8: バイナリデータ対応

**目標**: Uint8Array / ArrayBuffer からの画像表示

- [ ] バイナリ → Base64 変換実装
- [ ] Base64 → data URI 変換実装
- [ ] `mimeType` オプション必須チェック
- [ ] mimeType未指定時のエラーハンドリング

**テスト**:
- [ ] Uint8Array からの変換
- [ ] ArrayBuffer からの変換
- [ ] mimeType未指定時のエラー

**完了条件**: `bun run ci` 通過

---

### イテレーション 9: 複数画像表示

**目標**: 配列渡しによる複数画像のギャラリー表示

- [ ] `image()` 関数で配列を受け付けるオーバーロード
- [ ] `.kt-image-gallery` ラッパーで複数画像を囲む
- [ ] 各画像に個別のcaption/alt対応

**テスト**:
- [ ] 配列渡し時のギャラリーHTML出力
- [ ] 複数caption（配列）の対応
- [ ] caption配列長が画像数と異なる場合の挙動

**完了条件**: `bun run ci` 通過

---

### イテレーション 10: ギャラリーCSS

**目標**: 複数画像用のギャラリースタイル

- [ ] `.kt-image-gallery` Flexboxレイアウト
- [ ] gap / flex-wrap 設定
- [ ] レスポンシブ対応（必要に応じて）

**テスト**:
- [ ] ギャラリースタイルが含まれること

**完了条件**: `bun run ci` 通過

---

### イテレーション 11: E2Eテスト（基本）

**目標**: 基本機能のE2Eテスト

- [ ] `e2e/media.spec.ts` 作成
- [ ] URL画像の表示確認
- [ ] キャプション表示確認
- [ ] サイズ制御確認

**テスト**:
- [ ] 画像が正しく表示されること
- [ ] キャプションがDOMに存在すること
- [ ] 幅が正しく適用されること

**完了条件**: `bun run ci` 通過

---

### イテレーション 12: E2Eテスト（応用）

**目標**: 応用機能のE2Eテスト

- [ ] data URI画像のE2Eテスト
- [ ] SVG画像のE2Eテスト
- [ ] 複数画像ギャラリーのE2Eテスト

**テスト**:
- [ ] 各ソースタイプが正しく表示されること
- [ ] ギャラリーレイアウトが正しいこと

**完了条件**: `bun run ci` 通過

---

### イテレーション 13: エラーハンドリング

**目標**: エッジケースとエラー処理

- [ ] 空文字列ソースのハンドリング
- [ ] 無効なソースタイプのエラー
- [ ] 空配列のハンドリング

**テスト**:
- [ ] 各エッジケースの挙動確認
- [ ] エラーメッセージの内容確認

**完了条件**: `bun run ci` 通過

---

### イテレーション 14: ドキュメント・仕上げ

**目標**: ドキュメント更新と最終確認

- [ ] この設計書の実装状況を更新
- [ ] TUTORIAL.md に使用例を追加（任意）
- [ ] 全テストの最終確認

**完了条件**: `bun run ci` 通過、設計書の実装状況が全て ✅

---

## セキュリティ考慮事項

### XSS対策

- **alt / caption**: `escapeHtml()` で必ずエスケープ
- **SVG**: インラインSVGは data URI に変換して `<img>` で表示（スクリプト実行を防止）
- **URL**: 外部URLはそのまま使用（CSPヘッダーで制御推奨）

### CSP推奨設定

```
Content-Security-Policy: img-src 'self' data: https:;
```

---

## 将来の拡張候補

| 機能 | 優先度 | 説明 |
|------|--------|------|
| クリック拡大（ライトボックス） | 中 | `clickToExpand: boolean` |
| 遅延読み込み制御 | 低 | `loading: "lazy" \| "eager"` |
| エラー時フォールバック | 中 | `fallback?: string` |
| オブジェクトフィット | 低 | `objectFit: "cover" \| "contain"` |
| アスペクト比固定 | 低 | `aspectRatio?: string` |

---

## 参考

- [Streamlit st.image](https://docs.streamlit.io/develop/api-reference/media/st.image)
- [MDN: img element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img)
- [MDN: figure element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure)
