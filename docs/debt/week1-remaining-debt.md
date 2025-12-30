# Week1 技術的負債 - 残課題

## 対応済み (CRITICAL/HIGH)

| 優先度 | 問題 | 対応 | PR |
|--------|------|------|-----|
| CRITICAL | JSON.parse エラーハンドリング欠如 | try-catch追加 | #13 |
| CRITICAL | XSS脆弱性 (innerHTML) | CSP + nonce + サニタイズ | #13 |
| HIGH | escapeHtml 7箇所重複 | utils/html.ts に統合 | #14 |
| HIGH | セッションクリーンアップ未実行 | 60秒インターバル追加 | #14 |
| HIGH | インラインイベントハンドラ | イベント委譲に変更 | #16 |

---

## 未対応 (MEDIUM)

### 1. WebSocket再接続ロジックの欠如
**ファイル**: `src/app.ts` (clientScript)

**現状**: 接続切断時の自動復旧なし
```typescript
ws.onclose = () => {
  console.log("Disconnected from server");
  // 再接続ロジックなし
};
```

**対策案**:
- 指数バックオフによる自動再接続
- オフライン時のメッセージキューイング
- 接続状態のUI表示

---

### 2. セッション未発見時のサイレント失敗
**ファイル**: `src/app.ts:127-130`

**現状**:
```typescript
if (!session) {
  console.error("Session not found for WebSocket");
  return; // クライアントに通知なし
}
```

**対策案**:
- クライアントにエラーメッセージを送信
- セッション再確立のフローを実装

---

### 3. 型安全性の問題
**ファイル**: `src/widgets/registry.ts`, `src/session/state.ts`

**現状**:
```typescript
return state[widgetId] as T;  // 型検証なし
```

**対策案**:
- ランタイム型バリデーション (zod等)
- 型ガード関数の追加

---

### 4. Widgetバリデーションの欠如
**ファイル**: `src/widgets/slider.ts`, `src/kt/widgets.ts`

**現状**: 入力値の検証なし
- `min > max` のチェックなし
- `defaultValue` の範囲チェックなし
- `selectbox` の空配列チェックなし

**対策案**:
```typescript
if (min > max) throw new Error("min must be <= max");
if (defaultValue < min || defaultValue > max) {
  throw new Error("defaultValue out of range");
}
```

---

## 未対応 (LOW)

### 5. ハードコードされた値
| 場所 | 値 | 推奨 |
|------|-----|------|
| `app.ts` | `"kt-session-id"` | 設定可能に |
| `manager.ts` | `30 * 60 * 1000` (TTL) | 設定可能に |
| `manager.ts` | `60 * 1000` (cleanup interval) | 設定可能に |

---

### 6. テストカバレッジ不足

**不足しているテスト**:
- [ ] JSON.parse失敗時のエラーハンドリング
- [ ] 不正なWebSocketメッセージ
- [ ] セッションタイムアウト/クリーンアップ
- [ ] 無効なslider範囲 (min > max)
- [ ] 空のselectboxオプション
- [ ] XSSインジェクション

---

### 7. Traditional API と kt.* API の重複
**ファイル**: `src/widgets/*.ts` vs `src/kt/widgets.ts`

**現状**: 同じ機能が2箇所で実装されている

**対策案**:
- kt.* API を Traditional API の薄いラッパーにする
- または共通のコアロジックを抽出

---

## 優先順位

1. **Phase 1**: WebSocket再接続 + セッションエラー通知
2. **Phase 2**: 型安全性 + バリデーション
3. **Phase 3**: 設定の外部化 + テスト追加
4. **Phase 4**: API重複の解消
