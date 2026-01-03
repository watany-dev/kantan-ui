# Week3 テストレビュー改善計画

## 概要

Week3のテストをレビューし、不足する観点を追加実装する。
各イテレーションでCIパスを条件とし、コミットを行う。

---

## イテレーション 1: 境界値テスト追加

### 目的
パーサーの制限値周辺の境界値テストを追加

### 対象ファイル
- `tests/unit/diff/parser.test.ts`

### 追加テスト
```typescript
describe("parseHtml boundary values", () => {
  it("should handle HTML at MAX_HTML_SIZE - 1 byte");
  it("should handle exactly MAX_ELEMENTS - 1 elements");
  it("should handle ID at MAX_ID_LENGTH - 1 characters");
});
```

### 完了条件
- `bun run ci` パス
- コミット: `test(diff): add boundary value tests for parser limits`

---

## イテレーション 2: 差分検出エッジケーステスト追加

### 目的
differ.ts の未テストケースをカバー

### 対象ファイル
- `tests/unit/diff/differ.test.ts`

### 追加テスト
```typescript
describe("diff edge cases", () => {
  it("should detect reordering of elements");
  it("should handle element moved to different parent");
  it("should fallback to replaceRoot when hasChanges but no patches (non-id changes)");
  it("should handle rapid consecutive diffs");
});
```

### 完了条件
- `bun run ci` パス
- コミット: `test(diff): add edge case tests for differ`

---

## イテレーション 3: toWebSocketPatches 完全カバレッジ

### 目的
toWebSocketPatches のすべての分岐をテスト

### 対象ファイル
- `tests/unit/diff/differ.test.ts`

### 追加テスト
```typescript
describe("toWebSocketPatches edge cases", () => {
  it("should return replaceRoot when hasChanges is true but patches is empty");
  it("should handle exactly PATCH_THRESHOLD patches without fallback");
  it("should fallback at PATCH_THRESHOLD + 1 patches");
});
```

### 完了条件
- `bun run ci` パス
- コミット: `test(diff): add toWebSocketPatches edge case coverage`

---

## イテレーション 4: エラーハンドリングテスト追加

### 目的
異常系のエラーハンドリングをテスト

### 対象ファイル
- `tests/unit/diff/differ.test.ts`
- `tests/unit/diff/parser.test.ts`

### 追加テスト
```typescript
// parser.test.ts
describe("parseHtml error handling", () => {
  it("should handle malformed HTML gracefully without crashing");
});

// differ.test.ts
describe("diff error handling", () => {
  it("should handle empty old and new HTML");
  it("should handle completely different HTML structures");
});
```

### 完了条件
- `bun run ci` パス
- コミット: `test(diff): add error handling tests`

---

## イテレーション 5: E2Eテストの強化

### 目的
弱いE2Eテストをアサーションベースに修正

### 対象ファイル
- `e2e/focus-preservation.spec.ts`

### 修正内容
- console.log のみのテストを `expect()` ベースに変更
- フォーカス維持が実装されていない場合は `test.fixme()` でマーク

### 完了条件
- `bun run ci` パス
- コミット: `test(e2e): strengthen focus preservation tests`

---

## イテレーション 6: クライアントサイド applyPatch テスト

### 目的
クライアントスクリプトのパッチ適用ロジックをE2Eでテスト

### 対象ファイル
- `e2e/websocket.spec.ts` (追加テスト)

### 追加テスト
```typescript
describe("applyPatch behavior", () => {
  it("should handle replaceNode for non-existent element gracefully");
  it("should handle insertNode at invalid index");
  it("should handle removeNode for non-existent element");
});
```

### 完了条件
- `bun run ci` パス
- コミット: `test(e2e): add applyPatch edge case tests`

---

## 実装順序とリスク

| イテレーション | 複雑度 | リスク | 所要時間目安 |
|---------------|--------|--------|-------------|
| 1. 境界値テスト | 低 | 低 | 短 |
| 2. 差分エッジケース | 中 | 中 | 中 |
| 3. toWebSocketPatches | 低 | 低 | 短 |
| 4. エラーハンドリング | 低 | 低 | 短 |
| 5. E2E強化 | 中 | 中 | 中 |
| 6. applyPatch E2E | 中 | 中 | 中 |

---

## 除外項目（今回のスコープ外）

以下は実装が必要なため、テスト追加のみでは対応不可:

1. **updateAttr パッチタイプ** - 機能未実装
2. **saveFocusState/restoreFocusState ユニットテスト** - クライアントスクリプト内のため抽出が必要
3. **Session + Diff 統合テスト** - 別途統合テストフレームワークが必要
4. **パフォーマンス計測** - ベンチマーク基盤が必要

---

## 成功基準

- [ ] 全イテレーションで `bun run ci` パス
- [ ] 6つのコミットが作成される
- [ ] テストカバレッジが向上
- [ ] スキップテスト以外のすべてのテストがパス

---

*作成日: 2025-01-03*
