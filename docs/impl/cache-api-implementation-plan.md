# Cache API 実装計画

## 実装ステータス

> **✅ 実装完了** (2026-01-12)
>
> 全フェーズ（Phase 1〜6）が実装済み。`src/kt/cache/` ディレクトリに完全実装。

---

## 概要

設計書 (`docs/design/cache-api.md`) に基づき、TDDサイクルでイテレーティブに実装を進める。

## 前提条件の確認

### 既存実装の理解

| コンポーネント | ファイル | 状況 |
|--------------|---------|------|
| structuredClone使用 | `src/session/state.ts` | 既存。ディープコピーの参考 |
| RenderContext | `src/kt/context.ts` | 既存。グローバル状態管理の参考 |
| kt オブジェクト | `src/kt/index.ts` | 既存。API追加先 |

### 新規追加ファイル構成

```
src/kt/
├── cache/
│   ├── index.ts          # cache_data, cache_resource のエクスポート
│   ├── cache-data.ts     # cache_data 実装
│   ├── cache-resource.ts # cache_resource 実装
│   ├── cache-store.ts    # CacheStore クラス
│   ├── cache-key.ts      # キー生成ロジック
│   └── types.ts          # 型定義

tests/unit/kt/cache/
│   ├── cache-store.test.ts
│   ├── cache-key.test.ts
│   ├── cache-data.test.ts
│   └── cache-resource.test.ts
```

---

## イテレーション計画

### Phase 1: 基盤（型定義・キャッシュストア）

#### Iteration 1.1: 型定義

**目標**: キャッシュ関連の型を定義

**ファイル**:
- `src/kt/cache/types.ts` (新規)
- `tests/unit/kt/cache/types.test.ts` (新規)

**TDDサイクル**:
1. Red: 型のテスト作成（型チェックのみ）
2. Green: 型定義実装
3. Refactor: JSDoc追加

**型定義**:
```typescript
interface CacheEntry<T> {
  value: T;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt?: number;
}

interface CacheDataOptions {
  ttl?: number;
  max_entries?: number;
  hash_func?: (args: unknown[]) => string;
  show_spinner?: boolean | string;
}

interface CacheResourceOptions {
  ttl?: number;
  max_entries?: number;
  hash_func?: (args: unknown[]) => string;
  validate?: (resource: unknown) => boolean;
}
```

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt/cache): add cache type definitions`

---

#### Iteration 1.2: キャッシュキー生成

**目標**: 引数からキャッシュキーを生成するユーティリティ

**ファイル**:
- `src/kt/cache/cache-key.ts` (新規)
- `tests/unit/kt/cache/cache-key.test.ts` (新規)

**TDDサイクル**:
1. Red: プリミティブ、オブジェクト、配列、null/undefined のテスト
2. Green: `generateCacheKey()`, `stableStringify()` 実装
3. Refactor: エッジケース処理整理

**テストケース**:
```typescript
describe("generateCacheKey", () => {
  it("handles primitives", () => {
    expect(generateCacheKey([1, "hello", true])).toBe("number:1|string:hello|boolean:true");
  });

  it("handles null and undefined", () => {
    expect(generateCacheKey([null, undefined])).toBe("null|undefined");
  });

  it("handles objects with stable key ordering", () => {
    expect(generateCacheKey([{ b: 2, a: 1 }])).toBe(generateCacheKey([{ a: 1, b: 2 }]));
  });

  it("handles nested objects", () => {
    expect(generateCacheKey([{ user: { id: 1, name: "test" } }])).toContain("json:");
  });

  it("throws on circular references with helpful message", () => {
    const obj = { a: 1 };
    obj.self = obj;
    expect(() => generateCacheKey([obj])).toThrow(/circular/i);
  });
});
```

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt/cache): add cache key generation utility`

---

#### Iteration 1.3: CacheStore クラス（基本機能）

**目標**: Map ベースのキャッシュストレージ実装（get/set/delete/clear）

**ファイル**:
- `src/kt/cache/cache-store.ts` (新規)
- `tests/unit/kt/cache/cache-store.test.ts` (新規)

**TDDサイクル**:
1. Red: 基本CRUD操作のテスト
2. Green: CacheStore クラス実装
3. Refactor: メソッド整理

**テストケース**:
```typescript
describe("CacheStore", () => {
  it("stores and retrieves values", () => {
    const store = new CacheStore<number>();
    store.set("key1", 42);
    expect(store.get("key1")).toBe(42);
  });

  it("returns undefined for missing keys", () => {
    const store = new CacheStore<number>();
    expect(store.get("missing")).toBeUndefined();
  });

  it("deletes entries", () => {
    const store = new CacheStore<number>();
    store.set("key1", 42);
    store.delete("key1");
    expect(store.get("key1")).toBeUndefined();
  });

  it("clears all entries", () => {
    const store = new CacheStore<number>();
    store.set("key1", 1);
    store.set("key2", 2);
    store.clear();
    expect(store.get("key1")).toBeUndefined();
    expect(store.get("key2")).toBeUndefined();
  });

  it("tracks entry count", () => {
    const store = new CacheStore<number>();
    store.set("key1", 1);
    store.set("key2", 2);
    expect(store.size).toBe(2);
  });
});
```

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt/cache): add CacheStore class with basic CRUD operations`

---

### Phase 2: cache_data 実装

#### Iteration 2.1: cache_data 基本実装

**目標**: 高階関数ラッパーとして cache_data を実装

**ファイル**:
- `src/kt/cache/cache-data.ts` (新規)
- `tests/unit/kt/cache/cache-data.test.ts` (新規)

**TDDサイクル**:
1. Red: 基本キャッシュ動作のテスト
2. Green: cache_data() 実装
3. Refactor: 型推論改善

**テストケース**:
```typescript
describe("cache_data", () => {
  it("caches function results", () => {
    let callCount = 0;
    const fn = cache_data((x: number) => {
      callCount++;
      return x * 2;
    });

    expect(fn(5)).toBe(10);
    expect(fn(5)).toBe(10);
    expect(callCount).toBe(1);
  });

  it("uses different cache for different args", () => {
    let callCount = 0;
    const fn = cache_data((x: number) => {
      callCount++;
      return x * 2;
    });

    fn(1);
    fn(2);
    fn(1);
    expect(callCount).toBe(2);
  });

  it("preserves type inference", () => {
    const fn = cache_data((x: number, y: string) => ({ x, y }));
    const result = fn(1, "test");
    // TypeScript should infer: { x: number; y: string }
    expect(result.x).toBe(1);
    expect(result.y).toBe("test");
  });

  it("returns copy of cached value (mutation safety)", () => {
    const fn = cache_data(() => ({ count: 0 }));

    const result1 = fn();
    result1.count = 999;

    const result2 = fn();
    expect(result2.count).toBe(0); // 変更されていない
  });
});
```

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt/cache): implement cache_data with basic caching`

---

#### Iteration 2.2: cache_data の clear() メソッド

**目標**: 個別キャッシュ関数の clear() メソッド実装

**ファイル**:
- `src/kt/cache/cache-data.ts` (更新)
- `tests/unit/kt/cache/cache-data.test.ts` (更新)

**TDDサイクル**:
1. Red: clear() のテスト追加
2. Green: CachedFunction に clear() 追加
3. Refactor: 型定義整理

**テストケース**:
```typescript
describe("cache_data.clear", () => {
  it("clears cache for specific function", () => {
    let callCount = 0;
    const fn = cache_data(() => callCount++);

    fn();
    fn();
    expect(callCount).toBe(1);

    fn.clear();
    fn();
    expect(callCount).toBe(2);
  });
});
```

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt/cache): add clear() method to cached functions`

---

#### Iteration 2.3: cache_data の非同期関数サポート

**目標**: async関数のキャッシュ、同時呼び出しでのPromise共有

**ファイル**:
- `src/kt/cache/cache-data.ts` (更新)
- `tests/unit/kt/cache/cache-data.test.ts` (更新)

**TDDサイクル**:
1. Red: 非同期関数、Promise共有のテスト
2. Green: Promise キャッシュロジック追加
3. Refactor: エラー時のキャッシュ除外

**テストケース**:
```typescript
describe("cache_data async", () => {
  it("caches async function results", async () => {
    let callCount = 0;
    const fn = cache_data(async (x: number) => {
      callCount++;
      await new Promise(r => setTimeout(r, 10));
      return x * 2;
    });

    expect(await fn(5)).toBe(10);
    expect(await fn(5)).toBe(10);
    expect(callCount).toBe(1);
  });

  it("shares promise for concurrent calls", async () => {
    let callCount = 0;
    const fn = cache_data(async () => {
      callCount++;
      await new Promise(r => setTimeout(r, 50));
      return "result";
    });

    const results = await Promise.all([fn(), fn(), fn()]);
    expect(results).toEqual(["result", "result", "result"]);
    expect(callCount).toBe(1);
  });

  it("does not cache rejected promises", async () => {
    let callCount = 0;
    let shouldFail = true;
    const fn = cache_data(async () => {
      callCount++;
      if (shouldFail) {
        shouldFail = false;
        throw new Error("fail");
      }
      return "success";
    });

    await expect(fn()).rejects.toThrow("fail");
    expect(await fn()).toBe("success");
    expect(callCount).toBe(2);
  });
});
```

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt/cache): add async function support with promise deduplication`

---

### Phase 3: cache_resource 実装

#### Iteration 3.1: cache_resource 基本実装

**目標**: リソースキャッシュ（参照返却、コピーなし）

**ファイル**:
- `src/kt/cache/cache-resource.ts` (新規)
- `tests/unit/kt/cache/cache-resource.test.ts` (新規)

**TDDサイクル**:
1. Red: 同一インスタンス返却のテスト
2. Green: cache_resource() 実装
3. Refactor: cache_data との共通部分抽出

**テストケース**:
```typescript
describe("cache_resource", () => {
  it("returns same instance", () => {
    const fn = cache_resource(() => ({ id: Math.random() }));

    const a = fn();
    const b = fn();
    expect(a).toBe(b); // 同一参照
  });

  it("uses different instance for different args", () => {
    const fn = cache_resource((host: string) => ({ host, id: Math.random() }));

    const a = fn("localhost");
    const b = fn("127.0.0.1");
    expect(a).not.toBe(b);
    expect(a.host).toBe("localhost");
    expect(b.host).toBe("127.0.0.1");
  });

  it("has default max_entries of 10", () => {
    // リソースはメモリを多く使うので少なめ
    let callCount = 0;
    const fn = cache_resource((x: number) => {
      callCount++;
      return { x };
    });

    // 11個のエントリを作成
    for (let i = 0; i < 11; i++) {
      fn(i);
    }

    // 最初のエントリは削除されているはず
    fn(0); // 再計算
    expect(callCount).toBe(12); // 11 + 1
  });
});
```

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt/cache): implement cache_resource for non-serializable resources`

---

#### Iteration 3.2: cache_resource の validate オプション

**目標**: リソース有効性チェック機能

**ファイル**:
- `src/kt/cache/cache-resource.ts` (更新)
- `tests/unit/kt/cache/cache-resource.test.ts` (更新)

**TDDサイクル**:
1. Red: validate オプションのテスト
2. Green: validate チェック実装
3. Refactor: 検証ロジック整理

**テストケース**:
```typescript
describe("cache_resource validate", () => {
  it("invalidates when validate returns false", () => {
    let valid = true;
    let callCount = 0;
    const fn = cache_resource(
      () => {
        callCount++;
        return { created: Date.now() };
      },
      { validate: () => valid }
    );

    const first = fn();
    expect(callCount).toBe(1);

    fn(); // validate = true, キャッシュヒット
    expect(callCount).toBe(1);

    valid = false;
    const second = fn(); // validate = false, 再生成
    expect(callCount).toBe(2);
    expect(second).not.toBe(first);
  });

  it("passes resource to validate function", () => {
    const fn = cache_resource(
      () => ({ isConnected: true }),
      { validate: (resource) => resource.isConnected }
    );

    const result = fn();
    expect(result.isConnected).toBe(true);
  });
});
```

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt/cache): add validate option to cache_resource`

---

### Phase 4: TTL & LRU

#### Iteration 4.1: TTL サポート

**目標**: キャッシュエントリの有効期限管理

**ファイル**:
- `src/kt/cache/cache-store.ts` (更新)
- `tests/unit/kt/cache/cache-store.test.ts` (更新)

**TDDサイクル**:
1. Red: TTL 期限切れのテスト
2. Green: expiresAt チェック実装
3. Refactor: 期限切れエントリのクリーンアップ

**テストケース**:
```typescript
describe("CacheStore TTL", () => {
  it("returns undefined for expired entries", async () => {
    const store = new CacheStore<number>({ ttl: 0.05 }); // 50ms
    store.set("key1", 42);

    expect(store.get("key1")).toBe(42);

    await new Promise(r => setTimeout(r, 60));
    expect(store.get("key1")).toBeUndefined();
  });

  it("allows per-entry TTL override", async () => {
    const store = new CacheStore<number>({ ttl: 1 }); // 1秒
    store.set("short", 1, { ttl: 0.05 }); // 50ms
    store.set("long", 2); // デフォルト1秒

    await new Promise(r => setTimeout(r, 60));
    expect(store.get("short")).toBeUndefined();
    expect(store.get("long")).toBe(2);
  });
});
```

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt/cache): add TTL support to CacheStore`

---

#### Iteration 4.2: max_entries & LRU eviction

**目標**: 最大エントリ数制限とLRU削除

**ファイル**:
- `src/kt/cache/cache-store.ts` (更新)
- `tests/unit/kt/cache/cache-store.test.ts` (更新)

**TDDサイクル**:
1. Red: max_entries 超過時のLRU削除テスト
2. Green: lastAccessedAt 追跡、eviction 実装
3. Refactor: eviction ロジック最適化

**テストケース**:
```typescript
describe("CacheStore LRU", () => {
  it("evicts least recently used entry when max_entries exceeded", () => {
    const store = new CacheStore<number>({ max_entries: 3 });

    store.set("a", 1);
    store.set("b", 2);
    store.set("c", 3);

    // "a" を最近使用
    store.get("a");

    // 新しいエントリ追加 → "b" が削除されるはず
    store.set("d", 4);

    expect(store.get("a")).toBe(1);
    expect(store.get("b")).toBeUndefined(); // LRU で削除
    expect(store.get("c")).toBe(3);
    expect(store.get("d")).toBe(4);
  });

  it("updates lastAccessedAt on get", () => {
    const store = new CacheStore<number>({ max_entries: 2 });

    store.set("a", 1);
    store.set("b", 2);

    // "a" を再アクセスして最近使用に
    store.get("a");

    store.set("c", 3); // "b" が削除される

    expect(store.get("a")).toBe(1);
    expect(store.get("b")).toBeUndefined();
    expect(store.get("c")).toBe(3);
  });
});
```

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt/cache): add max_entries with LRU eviction`

---

### Phase 5: グローバルクリア & レジストリ

#### Iteration 5.1: グローバルキャッシュレジストリ

**目標**: 全キャッシュ関数を追跡するレジストリ

**ファイル**:
- `src/kt/cache/registry.ts` (新規)
- `tests/unit/kt/cache/registry.test.ts` (新規)

**TDDサイクル**:
1. Red: register/clear のテスト
2. Green: レジストリ実装
3. Refactor: WeakSet による自動クリーンアップ検討

**テストケース**:
```typescript
describe("CacheRegistry", () => {
  it("tracks registered cache stores", () => {
    const registry = new CacheRegistry();
    const store1 = new CacheStore<number>();
    const store2 = new CacheStore<string>();

    registry.register("data", store1);
    registry.register("data", store2);

    expect(registry.getStores("data")).toHaveLength(2);
  });

  it("clears all registered stores by type", () => {
    const registry = new CacheRegistry();
    const store1 = new CacheStore<number>();
    const store2 = new CacheStore<number>();

    store1.set("a", 1);
    store2.set("b", 2);

    registry.register("data", store1);
    registry.register("data", store2);
    registry.clearAll("data");

    expect(store1.get("a")).toBeUndefined();
    expect(store2.get("b")).toBeUndefined();
  });
});
```

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt/cache): add global cache registry`

---

#### Iteration 5.2: グローバルクリアAPI

**目標**: cache_data.clear(), cache_resource.clear(), clear_all_caches()

**ファイル**:
- `src/kt/cache/index.ts` (新規)
- `tests/unit/kt/cache/index.test.ts` (新規)

**TDDサイクル**:
1. Red: グローバルクリアAPIのテスト
2. Green: 各クリア関数実装
3. Refactor: cache_data/cache_resource に static clear 追加

**テストケース**:
```typescript
describe("global cache clear", () => {
  it("cache_data.clear() clears all cache_data caches", () => {
    const fn1 = cache_data(() => Math.random());
    const fn2 = cache_data(() => Math.random());

    const v1 = fn1();
    const v2 = fn2();

    cache_data.clear();

    expect(fn1()).not.toBe(v1);
    expect(fn2()).not.toBe(v2);
  });

  it("cache_resource.clear() clears all cache_resource caches", () => {
    const fn = cache_resource(() => ({ id: Math.random() }));
    const v1 = fn();

    cache_resource.clear();

    expect(fn()).not.toBe(v1);
  });

  it("clear_all_caches() clears everything", () => {
    const dataFn = cache_data(() => Math.random());
    const resourceFn = cache_resource(() => ({ id: Math.random() }));

    const v1 = dataFn();
    const v2 = resourceFn();

    clear_all_caches();

    expect(dataFn()).not.toBe(v1);
    expect(resourceFn()).not.toBe(v2);
  });
});
```

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt/cache): add global clear APIs`

---

### Phase 6: kt統合 & エクスポート

#### Iteration 6.1: kt オブジェクトへの統合

**目標**: kt.cache_data, kt.cache_resource, kt.clear_all_caches を追加

**ファイル**:
- `src/kt/index.ts` (更新)

**作業内容**:
1. cache モジュールからインポート追加
2. kt オブジェクトに cache_data, cache_resource, clear_all_caches 追加
3. 型エクスポート追加

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt): integrate cache APIs into kt object`

---

#### Iteration 6.2: 公開APIエクスポート

**目標**: kantan-ui のメインエントリポイントからエクスポート

**ファイル**:
- `src/index.ts` (更新)

**作業内容**:
1. cache関連の型エクスポート追加
2. 必要に応じて re-export 追加

**検証コマンド**: `bun run ci`

**コミット**: `feat: export cache APIs from main entry point`

---

### Phase 7: E2Eテスト & ドキュメント

#### Iteration 7.1: E2Eテスト

**目標**: Playwrightによる統合テスト

**ファイル**:
- `e2e/cache.spec.ts` (新規)
- `e2e/fixtures/cache-demo.ts` (新規)

**テストケース**:
1. cache_data でAPI呼び出しが1回のみ実行される
2. cache_resource でリソースが再利用される
3. clear() でキャッシュがリセットされる
4. TTL で期限切れ後に再取得される

**検証コマンド**: `bun run ci`

**コミット**: `test(e2e): add cache API integration tests`

---

## 実装順序まとめ

| # | Iteration | 新規/更新 | 主要ファイル | コミットメッセージ |
|---|-----------|----------|-------------|------------------|
| 1 | 1.1 | 新規 | cache/types.ts | `feat(kt/cache): add cache type definitions` |
| 2 | 1.2 | 新規 | cache/cache-key.ts | `feat(kt/cache): add cache key generation utility` |
| 3 | 1.3 | 新規 | cache/cache-store.ts | `feat(kt/cache): add CacheStore class` |
| 4 | 2.1 | 新規 | cache/cache-data.ts | `feat(kt/cache): implement cache_data` |
| 5 | 2.2 | 更新 | cache/cache-data.ts | `feat(kt/cache): add clear() method` |
| 6 | 2.3 | 更新 | cache/cache-data.ts | `feat(kt/cache): add async function support` |
| 7 | 3.1 | 新規 | cache/cache-resource.ts | `feat(kt/cache): implement cache_resource` |
| 8 | 3.2 | 更新 | cache/cache-resource.ts | `feat(kt/cache): add validate option` |
| 9 | 4.1 | 更新 | cache/cache-store.ts | `feat(kt/cache): add TTL support` |
| 10 | 4.2 | 更新 | cache/cache-store.ts | `feat(kt/cache): add LRU eviction` |
| 11 | 5.1 | 新規 | cache/registry.ts | `feat(kt/cache): add global cache registry` |
| 12 | 5.2 | 新規 | cache/index.ts | `feat(kt/cache): add global clear APIs` |
| 13 | 6.1 | 更新 | kt/index.ts | `feat(kt): integrate cache APIs` |
| 14 | 6.2 | 更新 | src/index.ts | `feat: export cache APIs` |
| 15 | 7.1 | 新規 | e2e/cache.spec.ts | `test(e2e): add cache API tests` |

---

## 各イテレーション完了条件

1. `bun run lint:fix` - リントエラーなし
2. `bun run ci` - lint, build, test すべてパス
3. コミット作成

## 依存関係

```
Iteration 1.1 (types)
    ↓
Iteration 1.2 (cache-key) ←─┐
    ↓                       │
Iteration 1.3 (cache-store) ┘
    ↓
Iteration 2.1 (cache-data基本)
    ↓
Iteration 2.2 (clear)
    ↓
Iteration 2.3 (async)
    ↓
Iteration 3.1 (cache-resource基本)
    ↓
Iteration 3.2 (validate)
    ↓
Iteration 4.1 (TTL)  ← cache-store更新
    ↓
Iteration 4.2 (LRU)  ← cache-store更新
    ↓
Iteration 5.1 (registry)
    ↓
Iteration 5.2 (global clear)
    ↓
Iteration 6.1 (kt統合)
    ↓
Iteration 6.2 (export)
    ↓
Iteration 7.1 (E2E)
```

## 完了時チェックリスト

- [x] 全ユニットテストがパス
- [x] E2Eテストがパス
- [x] knip（dead-code検出）パス
- [x] 型推論が正しく機能
- [x] cache_data: 値コピー動作確認
- [x] cache_resource: 参照返却動作確認
- [x] TTL/LRU が設計通り動作
- [x] グローバルクリアが動作

## 注意事項

### structuredClone の制限

```typescript
// これらはstructuredCloneでコピー不可
- 関数
- DOM ノード
- WeakMap/WeakSet
- Error オブジェクト（一部プロパティが失われる）
```

→ cache_data で使用時はユーザーに警告または代替手段を提供

### 循環参照対策

```typescript
// cache-key.ts で検出してエラー
function generateCacheKey(args: unknown[]): string {
  try {
    return stableStringify(args);
  } catch (e) {
    if (e instanceof TypeError && e.message.includes("circular")) {
      throw new Error(
        "Cannot cache arguments with circular references. " +
        "Consider using a custom hash_func option."
      );
    }
    throw e;
  }
}
```

### メモリリーク対策

- max_entries のデフォルト値設定（cache_data: 100, cache_resource: 10）
- TTL 設定推奨のJSDocコメント
- 将来的に WeakRef の活用を検討
