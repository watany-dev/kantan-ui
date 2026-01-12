# Cache API 設計書

## 実装ステータス

> **📝 設計中** (2026-01-12)
>
> API設計・アーキテクチャ設計中。

## 1. 概要

### 1.1 目的

Streamlit の `@st.cache_data` / `@st.cache_resource` に相当するAPIをkantan-uiに実装する。高コストな計算やデータ取得の結果をキャッシュし、再実行時のパフォーマンスを向上させる。

### 1.2 スコープ

- `kt.cache_data()`: シリアライズ可能なデータのキャッシュ（DataFrame相当、JSON等）
- `kt.cache_resource()`: シリアライズ不可なリソースのキャッシュ（DBコネクション、MLモデル等）
- TTL（Time-to-Live）によるキャッシュ有効期限管理
- 最大エントリ数によるメモリ管理
- 手動キャッシュクリア機能

### 1.3 設計原則

| 原則 | 説明 |
|------|------|
| **高階関数パターン** | TypeScriptで自然な関数ラップ方式を採用（デコレータ不使用） |
| **型安全** | 引数・戻り値の型推論を完全サポート |
| **Web標準準拠** | 外部依存なし、標準APIのみ使用 |
| **マルチランタイム** | Node.js, Deno, Bun, Cloudflare Workers で動作 |
| **Streamlit互換** | 同等の使用感を提供 |

### 1.4 Streamlitとの比較

| 機能 | Streamlit | kantan-ui |
|------|-----------|-----------|
| データキャッシュ | `@st.cache_data` | `kt.cache_data()` |
| リソースキャッシュ | `@st.cache_resource` | `kt.cache_resource()` |
| 構文 | Pythonデコレータ | 高階関数 |
| TTL | ✅ | ✅ |
| max_entries | ✅ | ✅ |
| show_spinner | ✅ | ⏳ Phase 2 |
| hash_funcs | ✅ | ⏳ Phase 2 |
| 型安全性 | ❌ | ✅ TypeScript |
| キャッシュスコープ | グローバル | グローバル（デフォルト） |

---

## 2. API設計

### 2.1 基本API

```typescript
// cache_data: シリアライズ可能なデータ向け
const fetchUsers = kt.cache_data(async (limit: number) => {
  const res = await fetch(`/api/users?limit=${limit}`);
  return res.json();
}, { ttl: 3600 });

const users = await fetchUsers(10);

// cache_resource: シリアライズ不可なリソース向け
const getDbConnection = kt.cache_resource(() => {
  return new DatabaseConnection(process.env.DB_URL);
});

const db = getDbConnection();
```

### 2.2 シグネチャ

```typescript
/**
 * cache_data: シリアライズ可能なデータをキャッシュ
 * 同じ引数で呼び出された場合、キャッシュされた結果を返す
 */
function cache_data<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  options?: CacheDataOptions
): (...args: TArgs) => TReturn;

/**
 * cache_resource: シリアライズ不可なリソースをキャッシュ
 * DBコネクション、MLモデル等の重いリソース向け
 */
function cache_resource<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  options?: CacheResourceOptions
): (...args: TArgs) => TReturn;
```

### 2.3 オプション型定義

```typescript
/**
 * cache_data のオプション
 */
interface CacheDataOptions {
  /**
   * キャッシュの有効期限（秒）
   * @default undefined (無期限)
   */
  ttl?: number;

  /**
   * キャッシュの最大エントリ数
   * 超過時はLRUで古いエントリを削除
   * @default 100
   */
  max_entries?: number;

  /**
   * キャッシュキー生成に使用するカスタムハッシュ関数
   * @default JSON.stringify ベースのハッシュ
   */
  hash_func?: (args: unknown[]) => string;

  /**
   * ローディング中にスピナーを表示
   * @default false
   */
  show_spinner?: boolean | string;
}

/**
 * cache_resource のオプション
 * cache_data と同様だが、デフォルト値が異なる
 */
interface CacheResourceOptions {
  /**
   * キャッシュの有効期限（秒）
   * @default undefined (無期限)
   */
  ttl?: number;

  /**
   * キャッシュの最大エントリ数
   * @default 10 (リソースは少なめ)
   */
  max_entries?: number;

  /**
   * キャッシュキー生成に使用するカスタムハッシュ関数
   */
  hash_func?: (args: unknown[]) => string;

  /**
   * 検証関数: リソースがまだ有効かチェック
   * falseを返すとキャッシュを破棄して再生成
   */
  validate?: (resource: unknown) => boolean;
}
```

### 2.4 キャッシュクリアAPI

```typescript
// 特定のキャッシュ関数のクリア
fetchUsers.clear();

// 全cache_dataのクリア
kt.cache_data.clear();

// 全cache_resourceのクリア
kt.cache_resource.clear();

// 全キャッシュのクリア
kt.clear_all_caches();
```

### 2.5 使用例

```typescript
import { kt } from "kantan-ui";

// 例1: 基本的なデータキャッシュ
const loadData = kt.cache_data(async (filename: string) => {
  const res = await fetch(`/data/${filename}`);
  return res.json();
});

// 例2: TTL付きキャッシュ（1時間で期限切れ）
const fetchWeather = kt.cache_data(async (city: string) => {
  const res = await fetch(`https://api.weather.com/${city}`);
  return res.json();
}, { ttl: 3600 });

// 例3: 最大エントリ数制限
const searchProducts = kt.cache_data(async (query: string) => {
  return await productApi.search(query);
}, { max_entries: 50 });

// 例4: DBコネクション（リソースキャッシュ）
const getDb = kt.cache_resource(() => {
  console.log("Creating new DB connection...");
  return new Database(process.env.DATABASE_URL);
});

// 何度呼んでも同じインスタンスを返す
const db1 = getDb();
const db2 = getDb();
console.log(db1 === db2); // true

// 例5: 引数付きリソースキャッシュ
const getRedisClient = kt.cache_resource((host: string, port: number) => {
  return new RedisClient({ host, port });
});

const client1 = getRedisClient("localhost", 6379);
const client2 = getRedisClient("localhost", 6380); // 別インスタンス

// 例6: 検証付きリソースキャッシュ
const getConnection = kt.cache_resource(() => {
  return createConnection();
}, {
  validate: (conn) => conn.isConnected()
});

// 例7: キャッシュクリア
loadData.clear(); // loadDataのキャッシュのみクリア
kt.cache_data.clear(); // 全cache_dataをクリア
```

---

## 3. cache_data vs cache_resource

### 3.1 使い分け

| 特性 | cache_data | cache_resource |
|------|------------|----------------|
| 主な用途 | API結果、計算結果、ファイル内容 | DBコネクション、MLモデル、ソケット |
| シリアライズ | 可能（JSON等） | 不可（オブジェクト参照） |
| コピー | 値をコピーして返す | 同一インスタンスを返す |
| デフォルトmax_entries | 100 | 10 |
| メモリ使用 | 値のコピー分増加 | 参照のみ |
| スレッドセーフ | 各呼び出しで独立 | 共有に注意が必要 |

### 3.2 判断フローチャート

```
キャッシュしたいものは？
    │
    ├─ JSON/プリミティブ/配列 → cache_data
    │
    ├─ クラスインスタンス
    │      │
    │      ├─ ステートレス（設定のみ保持）→ cache_data
    │      │
    │      └─ ステートフル（接続状態等）→ cache_resource
    │
    └─ コネクション/ハンドル → cache_resource
```

---

## 4. 内部アーキテクチャ

### 4.1 キャッシュストレージ

```typescript
// 内部キャッシュエントリ
interface CacheEntry<T> {
  value: T;
  createdAt: number;      // Date.now()
  lastAccessedAt: number; // LRU用
  expiresAt?: number;     // TTL設定時
}

// キャッシュストア（関数ごと）
class CacheStore<T> {
  private entries: Map<string, CacheEntry<T>> = new Map();
  private maxEntries: number;
  private ttl?: number;

  get(key: string): T | undefined { ... }
  set(key: string, value: T): void { ... }
  delete(key: string): boolean { ... }
  clear(): void { ... }

  // LRU eviction
  private evictIfNeeded(): void { ... }

  // TTL check
  private isExpired(entry: CacheEntry<T>): boolean { ... }
}
```

### 4.2 キャッシュキー生成

```typescript
/**
 * 引数からキャッシュキーを生成
 *
 * 戦略:
 * 1. プリミティブ: 値をそのまま文字列化
 * 2. オブジェクト/配列: JSON.stringify でシリアライズ
 * 3. 関数/Symbol: 一意IDを生成（WeakMapで管理）
 * 4. undefined/null: 固定文字列
 */
function generateCacheKey(args: unknown[]): string {
  return args.map(arg => {
    if (arg === null) return "null";
    if (arg === undefined) return "undefined";

    const type = typeof arg;
    if (type === "string" || type === "number" || type === "boolean") {
      return `${type}:${arg}`;
    }
    if (type === "function" || type === "symbol") {
      return getOrCreateObjectId(arg);
    }
    // object, array
    return `json:${stableStringify(arg)}`;
  }).join("|");
}

/**
 * オブジェクトキーの安定したJSON文字列化
 * キーをソートして一貫性を保証
 */
function stableStringify(obj: unknown): string {
  return JSON.stringify(obj, (_, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((sorted, key) => {
        sorted[key] = value[key];
        return sorted;
      }, {} as Record<string, unknown>);
    }
    return value;
  });
}
```

### 4.3 グローバルキャッシュレジストリ

```typescript
// 全キャッシュ関数を追跡（clear_all_caches用）
const cacheDataRegistry = new Set<CacheStore<unknown>>();
const cacheResourceRegistry = new Set<CacheStore<unknown>>();

// グローバルクリア
function clearAllCaches(): void {
  for (const store of cacheDataRegistry) store.clear();
  for (const store of cacheResourceRegistry) store.clear();
}
```

### 4.4 cache_data の値コピー

```typescript
// cache_data は値をコピーして返す（意図しない変更を防ぐ）
function copyValue<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value; // プリミティブはそのまま
  }
  // 構造化クローン（Web標準）
  return structuredClone(value);
}
```

### 4.5 ファイル構成

```
src/kt/
├── cache/
│   ├── index.ts          # cache_data, cache_resource のエクスポート
│   ├── cache-data.ts     # cache_data 実装
│   ├── cache-resource.ts # cache_resource 実装
│   ├── cache-store.ts    # CacheStore クラス
│   ├── cache-key.ts      # キー生成ロジック
│   └── types.ts          # 型定義
├── index.ts              # kt.cache_data, kt.cache_resource を追加
```

---

## 5. 技術選定: Web標準API・Hono

### 5.1 採用するAPI

| API | 用途 | 理由 |
|-----|------|------|
| **structuredClone** | cache_dataの値コピー | Web標準、既存コードで使用実績あり（`src/session/state.ts`）、深いコピーを安全に実行 |
| **WeakRef** | cache_resourceのリソース参照 | GC連携でメモリリーク自動防止、明示的なクリアが不要 |
| **FinalizationRegistry** | リソース解放時のクリーンアップ | WeakRefと組み合わせ、リソースがGCされた際にキャッシュエントリを自動削除 |
| **Map** | キャッシュストレージ | 順序保持、O(1)アクセス、任意キー対応 |
| **AbortSignal** | 非同期キャッシュ生成のキャンセル | 既存パターン踏襲（`src/runtime/rerun.ts`）、長時間処理の中断に対応 |

#### structuredClone（値コピー）

```typescript
// cache_data は値をコピーして返す
function copyValue<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  return structuredClone(value);
}
```

#### WeakRef + FinalizationRegistry（リソース管理）

```typescript
class ResourceCacheStore<T extends object> {
  private weakEntries = new Map<string, WeakRef<T>>();
  private registry = new FinalizationRegistry<string>((key) => {
    this.weakEntries.delete(key);
  });

  set(key: string, value: T): void {
    this.weakEntries.set(key, new WeakRef(value));
    this.registry.register(value, key);
  }

  get(key: string): T | undefined {
    return this.weakEntries.get(key)?.deref();
  }
}
```

### 5.2 不採用としたAPI

| API | 用途候補 | 不採用理由 |
|-----|----------|------------|
| **crypto.subtle** | キャッシュキーのハッシュ生成 | 非同期APIのため同期的なキャッシュキー生成に不向き。stableStringifyで十分 |
| **Cache API (Web)** | HTTPレスポンスキャッシュ | Request/Response専用。関数結果のキャッシュには不適合 |
| **IndexedDB** | 永続キャッシュ | 非同期API、オーバースペック。メモリ内キャッシュで十分 |
| **localStorage** | 永続キャッシュ | 同期APIだが文字列のみ、5MB制限、Node.js非対応 |

#### crypto.subtle を不採用とした詳細

```typescript
// crypto.subtle は非同期
async function hashArgs(args: unknown[]): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(args));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// 問題: キャッシュ取得が非同期になってしまう
const cachedFn = kt.cache_data((x: number) => x * 2);
const result = cachedFn(5); // ← 同期で返したいがasyncが必要になる

// 代替: stableStringify で十分高速
function generateCacheKey(args: unknown[]): string {
  return stableStringify(args); // 同期、シンプル
}
```

### 5.3 Honoのキャッシュ機能

| 機能 | 対応状況 | 採用可否 |
|------|----------|----------|
| **Cache Middleware** | Cloudflare Workers / Deno のみ | ❌ 不採用 |
| **hono-server-cache** | サードパーティ | ❌ 不採用 |

#### Hono Cache Middleware を不採用とした理由

```typescript
// Honoのcache middlewareはWeb標準Cache APIを使用
import { cache } from "hono/cache";

app.use("/api/*", cache({
  cacheName: "my-cache",
  cacheControl: "max-age=3600",
}));
```

**不採用理由**:

1. **マルチランタイム非対応**: Node.js / Bun では動作しない（Cloudflare Workers / Deno 専用）
2. **用途の違い**: HTTPレスポンスキャッシュ向け。関数結果のキャッシュ（cache_data/cache_resource）とは用途が異なる
3. **外部依存回避**: プロジェクト方針として Hono 本体以外の依存を避ける

#### 将来の統合可能性

Cloudflare Workers デプロイ時に、Hono Cache Middleware と連携するオプションは将来検討可能:

```typescript
// 将来構想: 環境に応じたストレージ切り替え
const fetchData = kt.cache_data(fn, {
  storage: "auto", // "memory" | "cf-cache" | "auto"
});
```

### 5.4 ランタイム互換性まとめ

| API | Node.js | Deno | Bun | CF Workers |
|-----|---------|------|-----|------------|
| structuredClone | ✅ v17+ | ✅ | ✅ | ✅ |
| WeakRef | ✅ v14.6+ | ✅ | ✅ | ✅ |
| FinalizationRegistry | ✅ v14.6+ | ✅ | ✅ | ✅ |
| Map | ✅ | ✅ | ✅ | ✅ |
| AbortSignal | ✅ v15+ | ✅ | ✅ | ✅ |
| Cache API | ❌ | ✅ | ❌ | ✅ |
| crypto.subtle | ✅ v15+ | ✅ | ✅ | ✅ |

→ 採用APIは全ランタイムで動作保証

---

## 6. エッジケースと注意点

### 5.1 非同期関数のキャッシュ

```typescript
// Promiseをキャッシュし、同時呼び出しで重複リクエストを防ぐ
const fetchData = kt.cache_data(async (id: string) => {
  return await api.fetch(id);
});

// 同時に呼ばれても1回のみfetch
await Promise.all([
  fetchData("123"),
  fetchData("123"),
  fetchData("123"),
]); // 全て同じPromiseを共有
```

### 5.2 エラーハンドリング

```typescript
// エラーはキャッシュしない（再試行可能にする）
const fetchWithRetry = kt.cache_data(async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
});

// 1回目: エラー → キャッシュされない
// 2回目: 再試行 → 成功すればキャッシュ
```

### 5.3 循環参照

```typescript
// 循環参照を含むオブジェクトは引数に使えない
const obj = { a: 1 };
obj.self = obj; // 循環参照

// JSON.stringify でエラー → 適切なエラーメッセージを表示
cachedFn(obj); // Error: Cannot cache arguments with circular references
```

### 5.4 セッション間でのキャッシュ共有

```typescript
// デフォルト: グローバルキャッシュ（全セッション共有）
const globalCache = kt.cache_data(fn);

// 将来拡張: セッション単位キャッシュ
const sessionCache = kt.cache_data(fn, { scope: "session" });
```

---

## 7. 実装計画

### Phase 1: 基本実装（MVP）

1. **Iteration 1**: CacheStore クラス
   - Map ベースのストレージ
   - get/set/delete/clear
   - 基本テスト

2. **Iteration 2**: キャッシュキー生成
   - プリミティブ対応
   - オブジェクト/配列対応（stableStringify）
   - テスト

3. **Iteration 3**: cache_data 実装
   - 高階関数ラッパー
   - 基本キャッシュ動作
   - clear() メソッド

4. **Iteration 4**: cache_resource 実装
   - 値コピーなし（参照返却）
   - validate オプション

### Phase 2: 拡張機能

5. **Iteration 5**: TTL サポート
   - expiresAt チェック
   - 自動クリーンアップ

6. **Iteration 6**: max_entries & LRU
   - lastAccessedAt 追跡
   - eviction ロジック

7. **Iteration 7**: グローバルクリア
   - cache_data.clear()
   - cache_resource.clear()
   - clear_all_caches()

### Phase 3: 高度な機能（将来）

8. show_spinner サポート
9. hash_funcs カスタマイズ
10. セッションスコープオプション
11. 統計/デバッグAPI

---

## 8. テスト戦略

### 8.1 ユニットテスト

```typescript
// tests/unit/kt/cache/cache-data.test.ts
describe("kt.cache_data", () => {
  it("should cache function results", async () => {
    let callCount = 0;
    const fn = kt.cache_data((x: number) => {
      callCount++;
      return x * 2;
    });

    expect(fn(5)).toBe(10);
    expect(fn(5)).toBe(10);
    expect(callCount).toBe(1); // 1回のみ実行
  });

  it("should use different cache for different args", () => {
    let callCount = 0;
    const fn = kt.cache_data((x: number) => {
      callCount++;
      return x * 2;
    });

    fn(1);
    fn(2);
    fn(1);
    expect(callCount).toBe(2); // 1と2で2回
  });

  it("should respect TTL", async () => {
    const fn = kt.cache_data(() => Date.now(), { ttl: 0.1 }); // 100ms

    const first = fn();
    await new Promise(r => setTimeout(r, 150));
    const second = fn();

    expect(second).not.toBe(first);
  });

  it("should evict LRU entries when max_entries exceeded", () => {
    const fn = kt.cache_data((x: number) => x, { max_entries: 2 });

    fn(1);
    fn(2);
    fn(3); // 1 が削除される

    // 内部状態を検証（または再計算されることを確認）
  });

  it("should clear cache", () => {
    let callCount = 0;
    const fn = kt.cache_data(() => callCount++);

    fn();
    fn();
    expect(callCount).toBe(1);

    fn.clear();
    fn();
    expect(callCount).toBe(2);
  });
});
```

### 8.2 cache_resource テスト

```typescript
describe("kt.cache_resource", () => {
  it("should return same instance", () => {
    const fn = kt.cache_resource(() => ({ id: Math.random() }));

    const a = fn();
    const b = fn();
    expect(a).toBe(b); // 同一参照
  });

  it("should invalidate when validate returns false", () => {
    let valid = true;
    const fn = kt.cache_resource(
      () => ({ created: Date.now() }),
      { validate: () => valid }
    );

    const first = fn();
    valid = false;
    const second = fn();

    expect(second).not.toBe(first);
  });
});
```

---

## 9. セキュリティ考慮

### 9.1 キャッシュポイズニング対策

- キャッシュキーはユーザー入力を直接使用しない
- 引数のサニタイズ/バリデーションは呼び出し側の責任

### 9.2 メモリ管理

- max_entries でメモリ上限を設定
- TTL で古いエントリを自動削除
- WeakRef の活用を検討（将来）

### 9.3 機密データ

```typescript
// 機密データはキャッシュしない、または短いTTLを設定
const getUserToken = kt.cache_data(async (userId: string) => {
  return await auth.getToken(userId);
}, { ttl: 60 }); // 1分で期限切れ
```

---

## 10. 参考リソース

- [Streamlit cache_data](https://docs.streamlit.io/develop/api-reference/caching-and-state/st.cache_data)
- [Streamlit cache_resource](https://docs.streamlit.io/develop/api-reference/caching-and-state/st.cache_resource)
- [React Query](https://tanstack.com/query/latest) - キャッシュ戦略の参考
- [SWR](https://swr.vercel.app/) - stale-while-revalidate パターン
