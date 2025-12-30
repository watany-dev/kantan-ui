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

## 対応済み (MEDIUM) - Phase 1 & 2

| 優先度 | 問題 | 対応 |
|--------|------|------|
| MEDIUM | WebSocket再接続ロジックの欠如 | 指数バックオフ再接続 + 接続状態UI表示 |
| MEDIUM | セッション未発見時のサイレント失敗 | クライアントにエラー通知送信 |
| MEDIUM | 型安全性の問題 | 型ガード関数追加 (`utils/type-guards.ts`) |
| MEDIUM | Widgetバリデーションの欠如 | slider/selectboxにバリデーション追加 |

---

## 未対応 (LOW)

### 1. ハードコードされた値
| 場所 | 値 | 推奨 |
|------|-----|------|
| `app.ts` | `"kt-session-id"` | 設定可能に |
| `manager.ts` | `30 * 60 * 1000` (TTL) | 設定可能に |
| `manager.ts` | `60 * 1000` (cleanup interval) | 設定可能に |

---

### 2. テストカバレッジ不足

**追加済みテスト**:
- [x] 無効なslider範囲 (min > max)
- [x] 空のselectboxオプション
- [x] 型ミスマッチ時のフォールバック
- [x] 型ガードユーティリティ
- [x] XSSインジェクション (escapeHtml)
- [x] セッションタイムアウト/クリーンアップ (既存)

**備考**: JSON.parse/WebSocketメッセージのテストはE2Eテストでカバー

---

### 3. Traditional API と kt.* API の重複
**ファイル**: `src/widgets/*.ts` vs `src/kt/widgets.ts`

**現状**: 同じ機能が2箇所で実装されている

**対策案**:
- kt.* API を Traditional API の薄いラッパーにする
- または共通のコアロジックを抽出

---

## 優先順位

1. ~~**Phase 1**: WebSocket再接続 + セッションエラー通知~~ ✅ 完了
2. ~~**Phase 2**: 型安全性 + バリデーション + テスト追加~~ ✅ 完了
3. **Phase 3**: 設定の外部化 + 残テスト追加
4. **Phase 4**: API重複の解消
