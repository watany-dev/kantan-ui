# kt.dataframe API設計書

- 作成日: 2026-02-06
- ステータス: ✅ 実装完了

## 概要

`kt.dataframe()` は `kt.table()` のインタラクティブ拡張版で、ソート・検索・行選択機能を備えたデータ表示ウィジェットを提供する。Streamlitの `st.dataframe()` との互換性を意識しつつ、kantan-uiの「Honoのみ依存・Web標準」の方針に従い、純粋なHTML/CSS/JavaScriptで実装する。

## Streamlit st.dataframe() との比較

### st.dataframe() の主要機能

| 機能 | st.dataframe | kt.dataframe (Phase 1) | kt.dataframe (将来) |
|------|-------------|------------------------|---------------------|
| データ表示 | ✅ | ✅ | ✅ |
| スクロール | ✅ (canvas-based) | ✅ (CSS overflow) | ✅ |
| カラムソート | ✅ (ヘッダークリック) | ✅ (クライアントサイド) | ✅ |
| 検索/フィルタ | ✅ (ツールバー) | ✅ (テキスト検索) | ✅ |
| カラムリサイズ | ✅ | ❌ | P2 |
| カラム非表示 | ✅ | ❌ | P2 |
| カラム並べ替え | ✅ (D&D) | ✅ (columnOrder) | ✅ |
| 行選択 | ✅ (single/multi) | ✅ (single/multi) | ✅ |
| column_config | ✅ (17型) | ❌ | P2 |
| コピー機能 | ✅ | ❌ | P3 |
| カラムピン留め | ✅ | ❌ | P3 |

### 設計判断

- **glide-data-gridは不使用**: Streamlitはcanvasベースのgrid libraryに依存するが、kantan-uiは外部ライブラリ不使用の方針のため、純粋なHTML `<table>` + CSS + JSで実装
- **ソート・検索はクライアントサイド**: サーバーラウンドトリップ不要な操作はクライアントで完結
- **行選択のみサーバー通信**: 選択状態の変更はWebSocket経由でサーバーに送信

## API設計

### 基本シグネチャ

```typescript
// 表示のみ（デフォルト）
function dataframe(data: TableData, config?: DataframeConfig): void;

// 行選択有効時
function dataframe(
  data: TableData,
  config: DataframeConfig & { onSelect: "rerun" },
): DataframeSelection;
```

### 型定義

```typescript
/** 行選択モード */
type DataframeSelectionMode = "single-row" | "multi-row";

/** 選択結果 */
interface DataframeSelection {
  rows: number[];
}

/** dataframe設定 */
interface DataframeConfig {
  /** コンテナの高さ（px）。デフォルト: 400 */
  height?: number;
  /** 親コンテナ幅に合わせる。デフォルト: true */
  useContainerWidth?: boolean;
  /** インデックス列を非表示。デフォルト: false */
  hideIndex?: boolean;
  /** カラム表示順序 */
  columnOrder?: string[];
  /** ウィジェットキー */
  key?: string;
  /** 選択動作: "ignore"=選択無効, "rerun"=選択時に再実行 */
  onSelect?: "ignore" | "rerun";
  /** 選択モード */
  selectionMode?: DataframeSelectionMode;
}
```

### 使用例

```typescript
import { kt } from "kantan-ui";

// 基本的なデータ表示
kt.dataframe([
  { name: "Alice", age: 30, city: "Tokyo" },
  { name: "Bob", age: 25, city: "Osaka" },
  { name: "Charlie", age: 35, city: "Nagoya" },
]);

// 設定付き
kt.dataframe(data, {
  height: 300,
  hideIndex: true,
  columnOrder: ["name", "city", "age"],
});

// 行選択有効
const selection = kt.dataframe(data, {
  key: "my_df",
  onSelect: "rerun",
  selectionMode: "multi-row",
});
// selection.rows = [0, 2]  // 選択された行のインデックス

// 選択結果の利用
if (selection.rows.length > 0) {
  kt.write(`選択された行: ${selection.rows.join(", ")}`);
}
```

### データ入力形式

`kt.table()` と同じ `TableData` 型を使用:

```typescript
type TableData =
  | Record<string, unknown>[]                    // オブジェクト配列
  | unknown[][]                                  // 2D配列
  | { columns: string[]; data: unknown[][] };    // 明示的形式
```

## 実装アーキテクチャ

### コンポーネント構成

```
src/widgets/types.ts          - DataframeConfig, DataframeSelection 型定義追加
src/widgets/dataframe.ts      - コアロジック（状態管理、バリデーション）
src/kt/dataframe.ts           - 宣言的API（レンダリング含む）
src/client/dataframe-script.ts - クライアントサイドJS（ソート・検索・選択）
src/styles/default.ts         - CSSスタイル追加
tests/unit/widgets/dataframe.test.ts - ユニットテスト
```

### レンダリング構造

```html
<div id="${id}-container" class="kt-dataframe-container" style="height: ${height}px">
  <!-- ツールバー -->
  <div class="kt-dataframe-toolbar">
    <input type="text" class="kt-dataframe-search"
           placeholder="Search..."
           data-kt-dataframe-search="${id}" />
    <span class="kt-dataframe-row-count">${rows.length} rows</span>
  </div>

  <!-- テーブルラッパー（スクロール可能） -->
  <div class="kt-dataframe-table-wrapper">
    <table class="kt-dataframe-table" data-kt-dataframe="${id}">
      <thead>
        <tr>
          <!-- 選択チェックボックス列（selectionMode有効時） -->
          <th class="kt-dataframe-select-col" data-kt-dataframe-select-all="${id}">
            <input type="checkbox" />
          </th>
          <!-- インデックス列（hideIndex=false時） -->
          <th class="kt-dataframe-index-col">#</th>
          <!-- データ列（ソート可能） -->
          <th data-kt-dataframe-sort="${id}" data-col="0" class="kt-dataframe-sortable">
            Name <span class="kt-dataframe-sort-icon"></span>
          </th>
          ...
        </tr>
      </thead>
      <tbody>
        <tr data-row="0">
          <td class="kt-dataframe-select-col">
            <input type="checkbox" data-kt-dataframe-row="${id}" value="0" />
          </td>
          <td class="kt-dataframe-index-col">0</td>
          <td>Alice</td>
          ...
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

### クライアントサイドイベント処理

既存のイベント委譲システムを拡張:

```javascript
// ソート: ヘッダークリック
document.addEventListener("click", (e) => {
  const th = e.target.closest("[data-kt-dataframe-sort]");
  if (th) {
    const tableId = th.dataset.ktDataframeSort;
    const colIndex = Number(th.dataset.col);
    sortDataframeColumn(tableId, colIndex);
  }
});

// 検索: テキスト入力
document.addEventListener("input", (e) => {
  const input = e.target.closest("[data-kt-dataframe-search]");
  if (input) {
    const tableId = input.dataset.ktDataframeSearch;
    filterDataframeRows(tableId, input.value);
  }
});

// 行選択: チェックボックス変更
document.addEventListener("change", (e) => {
  const checkbox = e.target.closest("[data-kt-dataframe-row]");
  if (checkbox) {
    const tableId = checkbox.dataset.ktDataframeRow;
    updateDataframeSelection(tableId);
  }
});
```

### 選択状態のサーバー通信

```javascript
function updateDataframeSelection(tableId) {
  const checkboxes = document.querySelectorAll(
    `[data-kt-dataframe-row="${tableId}"]:checked`
  );
  const selectedRows = Array.from(checkboxes).map(cb => Number(cb.value));
  // 既存のsendEvent関数を使用
  window.sendEvent(tableId, { rows: selectedRows });
}
```

### サーバーサイドの状態管理

```typescript
// widgets/dataframe.ts
export function initializeDataframeSelection(
  widgetId: string,
  defaultValue?: DataframeSelection,
): DataframeSelection {
  const initial = defaultValue ?? { rows: [] };
  return initializeWidgetState(widgetId, initial);
}
```

## CSS設計

```css
.kt-dataframe-container {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.kt-dataframe-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
  gap: 8px;
}

.kt-dataframe-search {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.kt-dataframe-table-wrapper {
  overflow: auto;
  flex: 1;
}

.kt-dataframe-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.kt-dataframe-table thead {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f5f5f5;
}

.kt-dataframe-table th {
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid #ddd;
  white-space: nowrap;
  user-select: none;
}

.kt-dataframe-sortable {
  cursor: pointer;
}

.kt-dataframe-sortable:hover {
  background: #eee;
}

.kt-dataframe-table td {
  padding: 6px 12px;
  border-bottom: 1px solid #eee;
}

.kt-dataframe-table tbody tr:hover {
  background: #f8f8f8;
}

.kt-dataframe-table tbody tr.kt-dataframe-selected {
  background: #e3f2fd;
}

.kt-dataframe-sort-icon::after {
  content: "⇅";
  opacity: 0.3;
  margin-left: 4px;
}

th[data-sort-dir="asc"] .kt-dataframe-sort-icon::after {
  content: "↑";
  opacity: 1;
}

th[data-sort-dir="desc"] .kt-dataframe-sort-icon::after {
  content: "↓";
  opacity: 1;
}

.kt-dataframe-index-col {
  color: #999;
  font-size: 12px;
  min-width: 40px;
}

.kt-dataframe-select-col {
  width: 32px;
  text-align: center;
}

.kt-dataframe-row-count {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
}
```

## 実装フェーズ

### Phase 1（本実装）: 基本機能

1. **型定義**: `DataframeConfig`, `DataframeSelection`, `DataframeSelectionMode`
2. **レンダリング**: スクロール可能なテーブル、ソートアイコン、検索バー
3. **クライアントJS**: ソート、検索フィルタ、行選択
4. **サーバー側**: 選択状態の管理、wrapWidget統合
5. **テスト**: レンダリング、状態管理、バリデーション

### Phase 2（将来）: 拡張機能

- `column_config` サポート（NumberColumn、LinkColumn等）
- カラムリサイズ（ドラッグ）
- セル選択（`"single-cell"`, `"multi-cell"`）
- カラム選択
- CSV/JSONエクスポート

### Phase 3（将来）: 高度な機能

- `kt.data_editor()` - 編集可能なデータフレーム
- 仮想スクロール（大量データ対応）
- カラムピン留め
- コピー機能

## テスト計画

### ユニットテスト

```typescript
describe("dataframe", () => {
  // レンダリングテスト
  it("should render scrollable table with headers");
  it("should render sort icons on column headers");
  it("should render search toolbar");
  it("should respect height config");
  it("should hide index column when hideIndex is true");
  it("should reorder columns based on columnOrder");
  it("should escape HTML in cell content");

  // 選択モードテスト
  it("should render checkboxes when onSelect is 'rerun'");
  it("should not render checkboxes when onSelect is 'ignore'");
  it("should return DataframeSelection when onSelect is 'rerun'");
  it("should return void when onSelect is 'ignore'");
  it("should initialize empty selection");
  it("should restore selection from state");

  // データ形式テスト
  it("should accept object array data");
  it("should accept 2D array data");
  it("should accept explicit {columns, data} format");
  it("should handle empty data");
});
```

## kt.table() との違い

| 機能 | kt.table() | kt.dataframe() |
|------|-----------|----------------|
| 用途 | 静的テーブル | インタラクティブテーブル |
| ソート | なし | ヘッダークリックでソート |
| 検索 | なし | ツールバーから検索 |
| スクロール | ブラウザ標準 | 固定高さ+スクロール |
| 行選択 | なし | single-row / multi-row |
| 戻り値 | void | void or DataframeSelection |
| 状態管理 | なし | 選択状態をセッションに保存 |

## 参考資料

- [Streamlit st.dataframe](https://docs.streamlit.io/develop/api-reference/data/st.dataframe)
- [Streamlit st.data_editor](https://docs.streamlit.io/develop/api-reference/data/st.data_editor)
- [Streamlit Column Config](https://docs.streamlit.io/develop/api-reference/data/st.column_config)
