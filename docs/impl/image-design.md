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

### イテレーション 1: 基本機能

- [ ] `ImageConfig` 型定義
- [ ] `renderImage()` 実装（URL/data URI のみ）
- [ ] `kt.image()` 宣言的API
- [ ] 基本CSSスタイル
- [ ] ユニットテスト

### イテレーション 2: バイナリ・SVG対応

- [ ] `Uint8Array` / `ArrayBuffer` → data URI 変換
- [ ] SVG文字列検出・変換
- [ ] `mimeType` バリデーション
- [ ] ユニットテスト追加

### イテレーション 3: 複数画像

- [ ] 配列オーバーロード実装
- [ ] ギャラリーレイアウト
- [ ] 複数キャプション対応
- [ ] ユニットテスト追加

### イテレーション 4: E2Eテスト・仕上げ

- [ ] E2Eテスト作成
- [ ] エラーハンドリング強化
- [ ] ドキュメント更新

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
