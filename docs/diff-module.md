# Diff Module 仕様書

## 概要

kantan-uiのHTML差分検出モジュール。ID属性を持つ要素を追跡し、効率的なDOM更新パッチを生成します。

## アーキテクチャ

```
src/diff/
├── types.ts    - 型定義（VNode, DiffPatch, DiffResult）
├── parser.ts   - HTMLパーサー（要素抽出、親子関係解析）
├── differ.ts   - 差分検出、WebSocketパッチ変換
└── index.ts    - モジュールエクスポート
```

## 処理フロー

```
HTML (old) ─┐
            ├─> parseHtml() ─> VNode[] ─┐
HTML (new) ─┘                           ├─> diff() ─> DiffResult ─> toWebSocketPatches() ─> Patch[]
                                        │
```

## 対応するHTML構造

### サポート対象

| 構造 | 例 | 備考 |
|-----|-----|-----|
| id属性を持つ要素 | `<div id="widget_0">` | 主要な追跡対象 |
| 自己終了タグ | `<input id="x" />` | input, br, img等 |
| ネストされた要素 | 親子関係を自動検出 | 最も近い包含親を特定 |
| 標準的なHTML5タグ | div, span, button等 | 大文字・小文字両対応 |

### 非サポート

| 構造 | 理由 |
|-----|-----|
| id属性のない要素 | 追跡キーがないため変更検出不可 |
| カスタム要素 | `<my-component>` - タグパターン非対応 |
| HTMLコメント | `<!-- comment -->` - 無視される |
| CDATAセクション | パース対象外 |

## 制限事項

| 項目 | 制限値 | 設定場所 |
|-----|-------|---------|
| HTML最大サイズ | 1MB (1,048,576 bytes) | `PARSER_LIMITS.MAX_HTML_SIZE` |
| 最大要素数 | 1,000 | `PARSER_LIMITS.MAX_ELEMENTS` |
| ID最大長 | 128文字 | `PARSER_LIMITS.MAX_ID_LENGTH` |
| パース最大時間 | 100ms | `PARSER_LIMITS.MAX_PARSE_TIME_MS` |
| パッチしきい値 | 10 | `PATCH_THRESHOLD` |

## セキュリティ

### サーバー側（parser.ts）

- **サイズ制限**: 1MBを超えるHTMLは拒否
- **タイムアウト**: 100msを超えるパースは中断（ReDoS対策）
- **ID検証**: 不正なID形式の要素はスキップ

### クライアント側（app.ts内のapplyPatch）

```javascript
function isUnsafeHtml(html) {
  return /<script[\s\S]*?>|javascript:|\s+on\w+\s*=/i.test(html);
}
```

ブロック対象:
- `<script>` タグ
- `javascript:` URL
- イベントハンドラ属性（`onclick`, `onload`等）

## パッチタイプ

| タイプ | 説明 | 用途 |
|-------|-----|-----|
| `replaceRoot` | ルート要素全体を置換 | 大規模変更、フォールバック |
| `replaceNode` | 特定IDの要素を置換 | 要素内容の変更 |
| `removeNode` | 特定IDの要素を削除 | 要素の削除 |
| `insertNode` | 指定位置に要素を挿入 | 新規要素の追加 |

## VNode構造

```typescript
interface VNode {
  id: string;           // 要素のid属性値
  tag: string;          // HTMLタグ名
  html: string;         // 要素の完全なHTML文字列
  parentId: string | null;  // 親要素のID（ルートはnull）
  order: number;        // 兄弟間の順序（0から開始）
}
```

### 親子関係の判定

- 要素の開始位置と終了位置を比較
- 他の要素を完全に包含する最も小さい要素が親
- 同じ親を持つ要素間で出現順序がorder

## パフォーマンス特性

### ベンチマーク結果（参考値）

| 操作 | 要素数 | 処理速度 |
|-----|-------|---------|
| parseHtml | 10要素 | ~94,000 ops/s |
| parseHtml | 100要素 | ~10,000 ops/s |
| parseHtml | 500要素 | ~1,800 ops/s |
| diff | 100要素（変更なし） | ~4,500 ops/s |
| diff | 50ウィジェット（1変更） | ~5,400 ops/s |
| toWebSocketPatches | 1パッチ | ~11,500,000 ops/s |

### 計算量

| 操作 | 計算量 | 備考 |
|-----|-------|------|
| parseHtml | O(n) | n = HTML文字数 |
| buildNodeTree | O(k²) | k = id付き要素数 |
| diff | O(k) | k = max(old, new要素数) |
| toWebSocketPatches | O(p) | p = パッチ数 |

## ID形式

有効なID形式:
```
^[a-zA-Z_][a-zA-Z0-9_-]*$
```

- 先頭: 英字またはアンダースコア
- 以降: 英数字、アンダースコア、ハイフン
- 最大長: 128文字

例:
- ✓ `btn-1`, `widget_0`, `MyComponent`, `_private`
- ✗ `123abc`, `-invalid`, `has space`, `日本語`

## 使用例

```typescript
import { diff, toWebSocketPatches } from "./diff";

const oldHtml = '<button id="btn-1">Click</button>';
const newHtml = '<button id="btn-1">Clicked!</button>';

const result = diff(oldHtml, newHtml);
// result = {
//   patches: [{ type: "replace", id: "btn-1", html: "..." }],
//   hasChanges: true
// }

const wsPatches = toWebSocketPatches(result, newHtml);
// wsPatches = [{ type: "replaceNode", id: "btn-1", html: "..." }]
```

## 今後の課題

1. **diff統合の有効化**: 現在`app.ts`では無効化されている
2. **カスタム要素対応**: Web Components対応
3. **HTMLパーサー改善**: 正規表現からDOM APIへの移行検討
4. **キャッシュ機構**: パース結果のメモ化
