# Cloudflare Workers アダプター 設計書

## 実装ステータス

> **🔧 設計完了・実装未着手** (2026-02-12)
>
> 基盤は実装済み（エントリーポイント、WebSocketアダプター、ランタイム検出）。
> 本設計書では、本番環境で必要な残りの機能を設計する。

## 1. 概要

### 1.1 目的

kantan-ui アプリケーションを Cloudflare Workers 上で本番利用可能にするためのアダプター群を設計する。Workers のステートレス・エッジ分散アーキテクチャに対応するため、セッション永続化、スケジューリング、バインディングアクセスなどの仕組みを提供する。

### 1.2 スコープ

| タスク | 優先度 | セクション |
|--------|--------|------------|
| セッション永続化（SessionStorage 抽象化 + KV/Durable Objects） | Critical | §2 |
| Scheduler の Durable Objects alarm() 対応 | Critical | §3 |
| Bindings の型安全アクセス | Medium | §4 |
| E2E テスト（Miniflare） | Medium | §5 |
| nodejs_compat 依存整理 | Low | §6 |
| サンプル・デプロイガイド拡充 | Low | §7 |

### 1.3 設計原則

| 原則 | 説明 |
|------|------|
| **最小依存** | Hono と Cloudflare Workers の標準 API のみ使用。追加パッケージ不要 |
| **段階的導入** | インメモリ → KV → Durable Objects と段階的に移行可能 |
| **既存 API 互換** | `createApp()` の API を変更せず、オプションで Workers 固有機能を注入 |
| **薄いラッパー** | Cloudflare 固有のロジックを最小限に抑え、コアは Web 標準に維持 |
| **型安全** | Bindings, KV, Durable Objects のアクセスを TypeScript で型安全に提供 |

### 1.4 実装済み機能

| 機能 | ファイル | 状態 |
|------|----------|------|
| エントリーポイント | `src/cloudflare.ts` | ✅ |
| WebSocket アダプター | `src/websocket/handler.ts:55-59` | ✅ |
| ランタイム検出 (`workerd`) | `src/websocket/handler.ts:76-77` | ✅ |
| 環境変数ハンドリング | `src/utils/env.ts:20-21` | ✅ |
| package.json exports | `"./cloudflare"` | ✅ |
| Scheduler インターフェース | `src/session/scheduler.ts:8-11` | ✅ |
| サンプルプロジェクト | `examples/cloudflare-worker/` | ✅ |

### 1.5 Streamlit Cloud との比較

| 項目 | Streamlit Cloud | kantan-ui on CF Workers |
|------|----------------|------------------------|
| **デプロイ方式** | マネージドPaaS（GitHub連携） | Wrangler CLI でエッジデプロイ |
| **実行環境** | 常駐サーバー（コンテナ） | ステートレスエッジ関数 |
| **セッション管理** | プラットフォームが自動管理 | KV / Durable Objects で自前管理 |
| **レイテンシ** | 単一リージョン | エッジ（全世界300+拠点） |
| **スケーリング** | コンテナ数に依存 | 自動スケール（制限なし） |
| **コスト** | Free: 1アプリ / Paid: $250~/月 | Free: 10万リクエスト/日 / Paid: $5~/月 |
| **WebSocket** | プラットフォームが管理 | Workers + Durable Objects |
| **コールドスタート** | 数秒～数十秒 | ~0ms（エッジにコード配置済み） |
| **カスタムドメイン** | Paid プランのみ | Free で利用可能 |

**kantan-ui の優位性**: エッジ実行による低レイテンシ、自動スケール、低コスト。
**Streamlit Cloud の優位性**: セッション管理の自動化、セットアップ不要。

### 1.6 ランタイム対応マトリクス（更新後）

| ランタイム | ヘルパー | パッケージ | セッション | WebSocket |
|-----------|---------|-----------|-----------|-----------|
| Bun | 不要 | - | インメモリ | ✅ |
| Node.js | `serve()` | `kantan-ui/serve` | インメモリ | ✅ |
| Deno | 不要 | - | インメモリ | ✅ |
| AWS Lambda | `createLambdaHandler()` | `kantan-ui/lambda` | ❌ (SSRのみ) | ❌ |
| **CF Workers** | **不要** | **`kantan-ui/cloudflare`** | **KV / Durable Objects** | **✅** |

---

## 2. セッション永続化

### 2.1 問題

現在の `SessionManager` (`src/session/manager.ts:102`) は全データをインメモリ `Map` に保持している。Cloudflare Workers はステートレスかつ複数エッジで実行されるため、リクエスト間・インスタンス間でセッションが消失する。

### 2.2 SessionStorage インターフェース

セッションデータの保存先を差し替え可能にする抽象化層を導入する。

```typescript
// src/session/storage.ts

/**
 * セッションの永続化ストレージを抽象化するインターフェース
 *
 * インメモリ / KV / Durable Objects / D1 など、
 * 任意のバックエンドに差し替え可能にする。
 */
export interface SessionStorage {
  /** セッションを取得 */
  get(id: SessionId): Promise<SerializedSession | null>;

  /** セッションを保存（upsert） */
  set(id: SessionId, session: SerializedSession): Promise<void>;

  /** セッションを削除 */
  delete(id: SessionId): Promise<boolean>;

  /** 期限切れセッションをクリーンアップ */
  cleanup(ttl: number): Promise<number>;
}

/**
 * シリアライズ可能なセッションデータ
 *
 * Session型からWebSocketやlastHtmlなど非シリアライズ可能なフィールドを除外し、
 * JSON互換にした構造体。
 */
export interface SerializedSession {
  id: SessionId;
  state: SessionState;
  createdAt: number;       // Date → timestamp
  lastAccessedAt: number;  // Date → timestamp
  lastSeq: number;
  patchHistory: PatchHistoryEntry[];
}
```

### 2.2.1 シリアライズ / デシリアライズヘルパー

`Session` 型と `SerializedSession` 型の相互変換ヘルパーを提供する。

```typescript
// src/session/storage.ts

/**
 * Session → SerializedSession に変換
 * Date を timestamp に変換し、非シリアライズ可能フィールドを除外
 */
export function serializeSession(session: Session): SerializedSession {
  return {
    id: session.id,
    state: session.state,
    createdAt: session.createdAt.getTime(),
    lastAccessedAt: session.lastAccessedAt.getTime(),
    lastSeq: session.lastSeq,
    patchHistory: session.patchHistory,
  };
}

/**
 * SerializedSession → Session に復元
 * timestamp を Date に変換し、lastHtml等のキャッシュフィールドは未設定
 */
export function deserializeSession(data: SerializedSession): Session {
  return {
    id: data.id,
    state: data.state,
    createdAt: new Date(data.createdAt),
    lastAccessedAt: new Date(data.lastAccessedAt),
    lastSeq: data.lastSeq,
    patchHistory: data.patchHistory,
    // lastHtml, lastSidebarHtml は未設定（次回 rerun で再生成）
  };
}
```

**設計判断**: `lastHtml` / `lastSidebarHtml` はシリアライズ対象外とする。KV/DO から復元後の初回 rerun で再生成されるため、差分検出は不要（`replaceRoot` でフル送信）。

### 2.2.2 SessionConfig への storage オプション追加

```typescript
// src/config/types.ts（変更箇所）

export interface SessionConfig {
  // ... 既存フィールド
  /** セッションストレージの実装（デフォルト: MemorySessionStorage） */
  storage?: SessionStorage;
}
```

### 2.2.3 KantanApp 型への setSessionStorage 追加

```typescript
// src/app.ts（変更箇所）

export interface KantanApp {
  // ... 既存フィールド
  /** セッションストレージを動的に設定（Workers の env 注入用） */
  setSessionStorage: (storage: SessionStorage) => void;
}
```

### 2.3 MemorySessionStorage（デフォルト）

既存の動作を維持するインメモリ実装。Node.js / Bun / Deno で使用。

```typescript
// src/session/storage-memory.ts

export class MemorySessionStorage implements SessionStorage {
  private sessions = new Map<SessionId, SerializedSession>();

  async get(id: SessionId): Promise<SerializedSession | null> {
    return this.sessions.get(id) ?? null;
  }

  async set(id: SessionId, session: SerializedSession): Promise<void> {
    this.sessions.set(id, session);
  }

  async delete(id: SessionId): Promise<boolean> {
    return this.sessions.delete(id);
  }

  async cleanup(ttl: number): Promise<number> {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, session] of this.sessions) {
      if (now - session.lastAccessedAt > ttl) {
        this.sessions.delete(id);
        cleaned++;
      }
    }
    return cleaned;
  }
}
```

### 2.4 KVSessionStorage

Cloudflare KV を使った実装。TTL は KV のネイティブ `expirationTtl` を活用する。

```typescript
// src/session/storage-kv.ts

export class KVSessionStorage implements SessionStorage {
  private kv: KVNamespace;
  private ttlSeconds: number;

  /**
   * @param kv KVNamespace バインディング
   * @param ttlMs セッション有効期限（ミリ秒）。デフォルト: 30分
   */
  constructor(kv: KVNamespace, ttlMs: number = 30 * 60 * 1000) {
    this.kv = kv;
    // KV の expirationTtl は秒単位（最小60秒）
    this.ttlSeconds = Math.max(60, Math.ceil(ttlMs / 1000));
  }

  async get(id: SessionId): Promise<SerializedSession | null> {
    const data = await this.kv.get<SerializedSession>(`session:${id}`, "json");
    return data;
  }

  async set(id: SessionId, session: SerializedSession): Promise<void> {
    await this.kv.put(`session:${id}`, JSON.stringify(session), {
      expirationTtl: this.ttlSeconds,
    });
  }

  async delete(id: SessionId): Promise<boolean> {
    await this.kv.delete(`session:${id}`);
    return true;
  }

  async cleanup(_ttl: number): Promise<number> {
    // KV の expirationTtl で自動クリーンアップされるため、noop
    return 0;
  }
}
```

**KV の制約と設計判断:**

| 項目 | 値 | 対応 |
|------|------|------|
| 結果整合性 | 最大60秒の伝播遅延 | WebSocket接続中はインメモリキャッシュ併用 |
| 値サイズ上限 | 25 MiB | セッションデータは通常数KB、問題なし |
| 書き込み制限 | 同一キー1秒1回 | イベントごとの書き込みではなくバッチ化 |
| TTL | ネイティブサポート | `expirationTtl` で自動削除 |

### 2.5 DurableObjectSessionStorage

Durable Objects を使った実装。強整合性が必要な場合や、WebSocket 接続を Durable Object に紐づける場合に使用。

```typescript
// src/session/storage-durable-object.ts

/**
 * Durable Object として動作するセッションストレージ
 *
 * 各セッションが1つの Durable Object インスタンスにマッピングされ、
 * 強整合性とWebSocket管理を単一インスタンスで行う。
 */
export class SessionDurableObject implements DurableObject {
  private state: DurableObjectState;
  private session: SerializedSession | null = null;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/get":
        return Response.json(this.session);

      case "/set": {
        this.session = await request.json<SerializedSession>();
        await this.state.storage.put("session", this.session);
        return new Response("ok");
      }

      case "/delete":
        this.session = null;
        await this.state.storage.delete("session");
        return new Response("ok");

      default:
        return new Response("Not Found", { status: 404 });
    }
  }

  /** Durable Object の alarm() で TTL ベースの自動削除 */
  async alarm(): Promise<void> {
    const session = await this.state.storage.get<SerializedSession>("session");
    if (!session) return;

    const ttl = 30 * 60 * 1000; // 30分
    if (Date.now() - session.lastAccessedAt > ttl) {
      await this.state.storage.delete("session");
      this.session = null;
    }
  }
}

/**
 * DurableObjectSessionStorage: SessionStorage インターフェースの DO 実装
 */
export class DurableObjectSessionStorage implements SessionStorage {
  constructor(private namespace: DurableObjectNamespace) {}

  private getStub(id: SessionId): DurableObjectStub {
    const doId = this.namespace.idFromName(id);
    return this.namespace.get(doId);
  }

  async get(id: SessionId): Promise<SerializedSession | null> {
    const stub = this.getStub(id);
    const res = await stub.fetch(new Request("http://do/get"));
    return res.json();
  }

  async set(id: SessionId, session: SerializedSession): Promise<void> {
    const stub = this.getStub(id);
    await stub.fetch(new Request("http://do/set", {
      method: "POST",
      body: JSON.stringify(session),
    }));
  }

  async delete(id: SessionId): Promise<boolean> {
    const stub = this.getStub(id);
    await stub.fetch(new Request("http://do/delete", { method: "POST" }));
    return true;
  }

  async cleanup(_ttl: number): Promise<number> {
    // 各 DO の alarm() で自動クリーンアップ
    return 0;
  }
}
```

### 2.6 SessionManager への統合

`SessionManager` のコンストラクタに `SessionStorage` を注入可能にする。

```typescript
// src/session/manager.ts（変更箇所）

export class SessionManager {
  private memoryCache = new Map<SessionId, Session>(); // WebSocket接続中のインメモリキャッシュ
  private storage: SessionStorage;

  constructor(
    config: SessionConfig = {},
    securityConfig: SecurityConfig = {},
    scheduler: Scheduler = defaultScheduler,
  ) {
    // SessionConfig.storage から取得（§2.2.2 参照）。未設定時はインメモリ
    this.storage = config.storage ?? new MemorySessionStorage();
    // ... 既存の初期化処理
  }

  // getSession を非同期化（内部ではインメモリキャッシュ優先）
  async getSessionAsync(id: SessionId): Promise<Session | undefined> {
    // 1. インメモリキャッシュを確認
    const cached = this.memoryCache.get(id);
    if (cached) {
      cached.lastAccessedAt = new Date();
      return cached;
    }

    // 2. ストレージから取得
    const serialized = await this.storage.get(id);
    if (!serialized) return undefined;

    // 3. Session に復元してキャッシュ
    const session = deserializeSession(serialized);
    this.memoryCache.set(id, session);
    return session;
  }

  // セッション変更時にストレージへ永続化
  async persistSession(id: SessionId): Promise<void> {
    const session = this.memoryCache.get(id);
    if (session) {
      await this.storage.set(id, serializeSession(session));
    }
  }
}
```

**非同期化の戦略:**

既存の同期 `getSession()` を残しつつ、`getSessionAsync()` を追加する。Workers 環境ではアプリ初期化時にストレージを注入し、非同期メソッドが使用される。既存の Bun/Node.js/Deno 環境では `MemorySessionStorage` が使用されるため、実質的に同期動作と同等。

### 2.7 createApp への統合

```typescript
// src/cloudflare.ts（変更後）

export type { KantanApp, KantanAppOptions } from "./app";
export { createApp } from "./app";

// Workers 固有のエクスポート
export { KVSessionStorage } from "./session/storage-kv";
export { DurableObjectSessionStorage, SessionDurableObject } from "./session/storage-durable-object";
export { noopScheduler } from "./session/scheduler-noop";
export type { SessionStorage } from "./session/storage";
```

**使用例（KV + createCloudflareHandler）:**

```typescript
// worker.ts
import { createApp, createCloudflareHandler, KVSessionStorage, noopScheduler } from "kantan-ui/cloudflare";

interface Env {
  SESSIONS: KVNamespace;
}

// モジュールスコープで1回だけ createApp を呼び出す（§2.10.3 参照）
// Workers では noopScheduler を指定（KV TTL がクリーンアップを担当）
const kantanApp = await createApp(myScript, {
  scheduler: noopScheduler,
});

export default createCloudflareHandler<Env>(kantanApp, {
  getStorage: (env) => new KVSessionStorage(env.SESSIONS),
});
```

### 2.8 データフロー図

```
                        ┌─────────────────────────────────┐
                        │         Cloudflare Edge          │
                        │                                  │
    Client ──HTTP──▶    │  Worker Instance A               │
                        │    ┌──────────────────┐          │
                        │    │ SessionManager   │          │
                        │    │  ┌────────────┐  │          │
                        │    │  │MemoryCache │  │ miss     │
                        │    │  │ (Map)      │──┼──────┐   │
                        │    │  └────────────┘  │      │   │
                        │    └──────────────────┘      │   │
                        │                              ▼   │
                        │    ┌──────────────────────────┐   │
                        │    │  SessionStorage          │   │
                        │    │  (KV or Durable Object)  │   │
                        │    └──────────────────────────┘   │
                        │                                  │
    Client ──HTTP──▶    │  Worker Instance B               │
                        │    ┌──────────────────┐          │
                        │    │ SessionManager   │          │
                        │    │  ┌────────────┐  │ miss     │
                        │    │  │MemoryCache │──┼──────┘   │
                        │    │  └────────────┘  │          │
                        │    └──────────────────┘          │
                        └─────────────────────────────────┘
```

### 2.9 KV vs Durable Objects 選定ガイド

| 要件 | KV | Durable Objects |
|------|-----|-----------------|
| **整合性** | 結果整合性（~60秒遅延） | 強整合性 |
| **コスト** | 安い（読み取り主体なら最適） | やや高い（CPU課金） |
| **WebSocket管理** | ❌ Workers 側で管理 | ✅ DO がWebSocketを保持 |
| **セッションルーティング** | 不要（どのインスタンスからでもOK） | 自動（DOに紐づく） |
| **推奨ユースケース** | 単純なフォーム、一人利用 | リアルタイムUI、マルチタブ同期 |
| **実装複雑度** | 低い | 高い |

**推奨**: まず KV で実装し、リアルタイム性が求められる場合に Durable Objects へ移行。

### 2.10 エッジケースと異常系

#### 2.10.1 KV expirationTtl の動的計算

KVSessionStorage の `expirationTtl` は `SessionConfig.ttl`（ミリ秒）から動的に計算する。ハードコードしない。

```typescript
export class KVSessionStorage implements SessionStorage {
  private ttlSeconds: number;

  constructor(kv: KVNamespace, ttlMs: number = 30 * 60 * 1000) {
    this.kv = kv;
    // KV の expirationTtl は秒単位（最小60秒）— §2.4 と同一ロジック
    this.ttlSeconds = Math.max(60, Math.ceil(ttlMs / 1000));
  }

  async set(id: SessionId, session: SerializedSession): Promise<void> {
    await this.kv.put(`session:${id}`, JSON.stringify(session), {
      expirationTtl: this.ttlSeconds,
    });
  }
}
```

#### 2.10.2 DurableObject fetch エラー時のフォールバック

DO への通信が失敗した場合（ネットワークエラー、DO の過負荷等）、適切にエラーをハンドリングする。

```typescript
async get(id: SessionId): Promise<SerializedSession | null> {
  try {
    const stub = this.getStub(id);
    const res = await stub.fetch(new Request("http://do/get"));
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error(`Failed to fetch session from DO: ${id}`, error);
    return null; // セッション消失として扱い、新規セッションを作成
  }
}
```

#### 2.10.3 createApp の呼び出し頻度

`createApp()` は重い初期化処理（Hono app 構築、WebSocket アダプター作成）を含むため、リクエストごとに呼ばないこと。Workers のモジュールスコープで1回だけ呼び出す。

```typescript
// ✅ 正しい: モジュールスコープで1回だけ呼び出す
const kantanApp = await createApp(myScript, { scheduler: noopScheduler });

export default createCloudflareHandler<Env>(kantanApp, {
  getStorage: (env) => new KVSessionStorage(env.SESSIONS, config.session?.ttl),
});

// ❌ 誤り: リクエストごとに createApp を呼び出す
export default {
  async fetch(request: Request, env: Env) {
    const app = await createApp(myScript); // 毎リクエストで再構築 → 性能劣化
    return app.fetch(request);
  },
};
```

#### 2.10.4 セッション状態の競合条件（Race Condition）

KV の結果整合性（~60秒遅延）により、同じセッションに対する同時書き込みが競合する可能性がある。

| シナリオ | 影響 | 対策 |
|---------|------|------|
| 同一タブからの高速イベント | WebSocket 接続中はインメモリキャッシュが使われるため問題なし | - |
| マルチタブ同時操作（KV） | 後勝ち（Last Write Wins）。片方の変更が失われる | Durable Objects を推奨 |
| マルチタブ同時操作（DO） | DO が単一インスタンスで処理するため競合しない | - |
| Worker再起動直後のリクエスト | インメモリキャッシュが空。KV から復元 | `getSessionAsync()` で KV フォールバック |

**設計判断**: KV 利用時は Last Write Wins を許容する。厳密な整合性が必要な場合は Durable Objects を使用する。

#### 2.10.5 WebSocket 再接続シナリオ

Workers 本体でのWebSocket接続はリクエスト処理中のみ有効。接続切断時のリカバリーフロー:

```
1. クライアントの WebSocket が切断
   └─▶ クライアントの自動再接続（既存の exponential backoff）

2. 再接続時、init メッセージに lastSeq を含めて送信
   └─▶ Worker は getSessionAsync() でセッションを復元
       ├─▶ インメモリキャッシュにあれば即座に返す
       └─▶ なければ KV/DO から取得

3. 欠損パッチの配信
   └─▶ patchHistory から lastSeq 以降のパッチを取得して送信
       ├─▶ パッチが見つかれば差分配信
       └─▶ 見つからなければ full sync（replaceRoot）
```

**注意**: KV にセッションを永続化する場合、`persistSession()` の呼び出しタイミングが重要。イベント処理完了後に非同期で永続化する。

#### 2.10.6 シリアライズの安全性

`SerializedSession` の `state` フィールドは `Record<string, unknown>` であり、ユーザーが任意の値を保存できる。

```typescript
// デシリアライズ時のバリデーション
function deserializeSession(data: unknown): Session {
  // JSON.parse の結果をそのまま信用しない
  if (!isValidSerializedSession(data)) {
    throw new Error("Invalid session data");
  }
  return {
    id: data.id,
    state: data.state,
    createdAt: new Date(data.createdAt),
    lastAccessedAt: new Date(data.lastAccessedAt),
    lastSeq: data.lastSeq,
    patchHistory: data.patchHistory,
  };
}

function isValidSerializedSession(data: unknown): data is SerializedSession {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.state === "object" && obj.state !== null &&
    typeof obj.createdAt === "number" &&
    typeof obj.lastAccessedAt === "number" &&
    typeof obj.lastSeq === "number" &&
    Array.isArray(obj.patchHistory)
  );
}
```

---

## 3. Scheduler の Durable Objects alarm() 対応

### 3.1 問題

`defaultScheduler` (`src/session/scheduler.ts:17-20`) は `globalThis.setInterval` を使用している。Workers は `nodejs_compat` フラグにより `setInterval` が利用可能だが、Workers のライフサイクル（リクエスト処理完了後にインスタンスが破棄される）と整合しない。

### 3.2 Workers 向けスケジューリング戦略

Workers 環境では、`setInterval` に依存するバックグラウンドタスクは以下の代替手段で実装する。

#### 3.2.1 リクエスト駆動クリーンアップ（KV 利用時）

KV の `expirationTtl` がセッション削除を自動的に行うため、明示的なスケジューラーは不要。

```typescript
// src/session/scheduler-noop.ts

/**
 * No-op スケジューラー
 *
 * KV の expirationTtl や Durable Objects の alarm() が
 * クリーンアップを担当するため、setInterval は不要。
 */
export const noopScheduler: Scheduler = {
  setInterval: (_callback, _ms) => null,
  clearInterval: (_id) => {},
};
```

#### 3.2.2 Durable Objects alarm() スケジューラー

Durable Objects の `alarm()` API で定期実行をエミュレートする。

```typescript
// src/session/scheduler-alarm.ts

/**
 * Durable Objects の alarm() を使ったスケジューラー
 *
 * SessionDurableObject 内部で alarm() を設定し、
 * 指定間隔でクリーンアップを実行する。
 */
export class AlarmScheduler implements Scheduler {
  private state: DurableObjectState;
  private callbacks = new Map<number, () => void>();
  private nextId = 1;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  setInterval(callback: () => void, ms: number): unknown {
    const id = this.nextId++;
    this.callbacks.set(id, callback);

    // alarm を設定
    this.state.storage.setAlarm(Date.now() + ms);
    return id;
  }

  clearInterval(id: unknown): void {
    if (typeof id === "number") {
      this.callbacks.delete(id);
    }
  }

  /** alarm() ハンドラーから呼び出される */
  async handleAlarm(intervalMs: number): Promise<void> {
    for (const callback of this.callbacks.values()) {
      callback();
    }
    // 次の alarm を設定（繰り返し）
    if (this.callbacks.size > 0) {
      await this.state.storage.setAlarm(Date.now() + intervalMs);
    }
  }
}
```

#### 3.2.3 Cron Triggers（将来検討）

大規模デプロイ時、Cron Triggers で全セッションの一括クリーンアップを実行する。

```toml
# wrangler.toml
[triggers]
crons = ["*/5 * * * *"]  # 5分ごと
```

```typescript
// worker.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // ...通常のリクエスト処理
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // KV のリスト API でセッション一覧を取得し、期限切れを削除
    const list = await env.SESSIONS.list({ prefix: "session:" });
    // expirationTtl が有効なら基本的に不要だが、
    // メタデータの掃除等に活用可能
  },
};
```

### 3.3 ping/pong の Workers 対応

Workers の WebSocket は Durable Objects 内で管理する場合、永続的な接続維持が可能。Workers 本体では WebSocket 接続はリクエスト処理中のみ有効。

| 構成 | ping/pong | 方法 |
|------|-----------|------|
| Workers + KV | クライアント駆動 | クライアントが定期的にpingを送信 |
| Workers + Durable Objects | サーバー駆動 | DO の alarm() で定期的にping送信 |

```typescript
// クライアント駆動 ping の設定変更
const app = await createApp(myScript, {
  client: {
    pingInterval: 0,   // サーバー側 ping を無効化
    // クライアント側で setInterval → WebSocket keepalive
  },
});
```

---

## 4. Bindings の型安全アクセス

### 4.1 問題

Workers では環境変数・KV・Durable Objects・D1 等のバインディングに `env` パラメータ経由でアクセスするが、現在の `createApp()` にはその仕組みがない。

### 4.2 Env 型定義

```typescript
// ユーザーが定義する Env 型
interface Env {
  SESSIONS: KVNamespace;
  SESSION_DO: DurableObjectNamespace;
  DB: D1Database;
  API_KEY: string;
}
```

### 4.3 createApp へのバインディング注入

Workers 環境では `createApp()` 呼び出し時ではなく、リクエストごとに `env` が渡される。現在の設計では `createApp()` はトップレベルで1回呼ばれるため、`env` を後から注入する仕組みが必要。

```typescript
// src/cloudflare.ts（拡張案）

/**
 * Cloudflare Workers 用のアプリ作成
 *
 * Workers では fetch ハンドラーが env を受け取るため、
 * createApp の結果を fetch に変換するヘルパーを提供する。
 */
export function createCloudflareHandler<E extends Record<string, unknown>>(
  kantanApp: KantanApp,
  options?: {
    /** env から SessionStorage を生成する関数 */
    getStorage?: (env: E) => SessionStorage;
  },
): ExportedHandler<E> {
  return {
    async fetch(request: Request, env: E, ctx: ExecutionContext): Promise<Response> {
      // env をリクエストスコープで利用可能にする
      if (options?.getStorage) {
        const storage = options.getStorage(env);
        // SessionManager にストレージを設定
        kantanApp.setSessionStorage(storage);
      }

      return kantanApp.fetch(request);
    },
  };
}
```

**Scheduler の自動注入:**

`createApp()` に `noopScheduler` を渡す方法は2つある:

```typescript
// 方法1（推奨）: KantanAppOptions でスケジューラーを指定
import { noopScheduler } from "kantan-ui/cloudflare";

const kantanApp = await createApp(script, {
  scheduler: noopScheduler, // Workers 用に setInterval を無効化
});

// 方法2: createCloudflareHandler が内部で自動設定（将来検討）
// → createApp 時点でスケジューラーが決まるため、方法1を推奨
```

`KantanAppOptions` に `scheduler` を追加する:

```typescript
// src/app.ts（変更箇所）
export interface KantanAppOptions extends KantanConfig {
  port?: number;
  hostname?: string;
  /** スケジューラー実装（Workers 用に noopScheduler を指定可能） */
  scheduler?: Scheduler;
}
```

**使用例:**

```typescript
// worker.ts
import { createApp, createCloudflareHandler, KVSessionStorage, noopScheduler } from "kantan-ui/cloudflare";

interface Env {
  SESSIONS: KVNamespace;
}

const kantanApp = await createApp(myScript, { scheduler: noopScheduler });

export default createCloudflareHandler<Env>(kantanApp, {
  getStorage: (env) => new KVSessionStorage(env.SESSIONS),
});
```

### 4.4 Script 内でのバインディングアクセス

ユーザースクリプト内でバインディングにアクセスする場合、Hono の `env(c)` を活用する。

```typescript
// 将来検討: kt.env() ヘルパー
const apiKey = kt.env<Env>("API_KEY");
```

現時点ではスコープ外とし、ユーザーは `createApp` のオプション経由で必要なバインディングを渡す設計とする。

---

## 5. E2E テスト（Miniflare）

### 5.1 テスト戦略

| レイヤー | ツール | 対象 |
|---------|--------|------|
| Unit | Vitest | SessionStorage 各実装、Scheduler、シリアライズ |
| Integration | Miniflare + Vitest | Workers 環境での HTTP/WebSocket ライフサイクル |
| E2E | Miniflare + Playwright | ブラウザからの完全なユーザーフロー |

### 5.2 Miniflare セットアップ

```typescript
// tests/integration/cloudflare/setup.ts

import { Miniflare } from "miniflare";

export async function createTestWorker(options?: {
  kvNamespaces?: string[];
  durableObjects?: Record<string, string>;
}) {
  const mf = new Miniflare({
    modules: true,
    scriptPath: "./examples/cloudflare-worker/worker.ts",
    kvNamespaces: options?.kvNamespaces ?? ["SESSIONS"],
    durableObjects: options?.durableObjects,
    compatibilityDate: "2024-12-01",
    compatibilityFlags: ["nodejs_compat"],
  });
  return mf;
}
```

### 5.3 ユニットテスト

```typescript
// tests/unit/session/storage-kv.test.ts

describe("KVSessionStorage", () => {
  it("should store and retrieve a session", async () => {
    const kv = createMockKV();
    const storage = new KVSessionStorage(kv);

    const session = createTestSession();
    await storage.set(session.id, session);

    const retrieved = await storage.get(session.id);
    expect(retrieved).toEqual(session);
  });

  it("should return null for non-existent session", async () => {
    const kv = createMockKV();
    const storage = new KVSessionStorage(kv);

    const result = await storage.get("non-existent");
    expect(result).toBeNull();
  });

  it("should set expirationTtl on put", async () => {
    const kv = createMockKV();
    const storage = new KVSessionStorage(kv);

    await storage.set("test-id", createTestSession());

    expect(kv.put).toHaveBeenCalledWith(
      "session:test-id",
      expect.any(String),
      expect.objectContaining({ expirationTtl: 1800 }),
    );
  });
});
```

### 5.3.1 MemorySessionStorage テスト

```typescript
// tests/unit/session/storage-memory.test.ts

describe("MemorySessionStorage", () => {
  it("should store and retrieve a session", async () => {
    const storage = new MemorySessionStorage();
    const session = createTestSession();

    await storage.set(session.id, session);
    const result = await storage.get(session.id);

    expect(result).toEqual(session);
  });

  it("should cleanup expired sessions", async () => {
    const storage = new MemorySessionStorage();
    const old = createTestSession({ lastAccessedAt: Date.now() - 60000 });
    const recent = createTestSession({ lastAccessedAt: Date.now() });

    await storage.set(old.id, old);
    await storage.set(recent.id, recent);

    const cleaned = await storage.cleanup(30000); // 30秒TTL

    expect(cleaned).toBe(1);
    expect(await storage.get(old.id)).toBeNull();
    expect(await storage.get(recent.id)).not.toBeNull();
  });
});
```

### 5.3.2 noopScheduler テスト

```typescript
// tests/unit/session/scheduler-noop.test.ts

describe("noopScheduler", () => {
  it("should return null from setInterval", () => {
    const id = noopScheduler.setInterval(() => {}, 1000);
    expect(id).toBeNull();
  });

  it("should not throw on clearInterval", () => {
    expect(() => noopScheduler.clearInterval(null)).not.toThrow();
  });

  it("should never execute the callback", async () => {
    const fn = vi.fn();
    noopScheduler.setInterval(fn, 10);

    await new Promise((r) => setTimeout(r, 50));
    expect(fn).not.toHaveBeenCalled();
  });
});
```

### 5.3.3 DurableObjectSessionStorage テスト

```typescript
// tests/unit/session/storage-durable-object.test.ts

describe("DurableObjectSessionStorage", () => {
  it("should store and retrieve a session via DO stub", async () => {
    const namespace = createMockDONamespace();
    const storage = new DurableObjectSessionStorage(namespace);

    const session = createTestSession();
    await storage.set(session.id, session);
    const result = await storage.get(session.id);

    expect(result).toEqual(session);
  });

  it("should return null when DO fetch fails", async () => {
    const namespace = createMockDONamespace({ shouldFail: true });
    const storage = new DurableObjectSessionStorage(namespace);

    const result = await storage.get("any-id");
    expect(result).toBeNull();
  });

  it("should use idFromName for consistent routing", async () => {
    const namespace = createMockDONamespace();
    const storage = new DurableObjectSessionStorage(namespace);

    await storage.get("session-123");

    expect(namespace.idFromName).toHaveBeenCalledWith("session-123");
  });
});
```

### 5.3.4 シリアライズ / デシリアライズ テスト

```typescript
// tests/unit/session/storage.test.ts

describe("serializeSession / deserializeSession", () => {
  it("should round-trip session data", () => {
    const original: Session = {
      id: "test-id",
      state: { counter: 42, name: "test" },
      createdAt: new Date("2026-01-01T00:00:00Z"),
      lastAccessedAt: new Date("2026-01-01T01:00:00Z"),
      lastSeq: 5,
      patchHistory: [{ seq: 5, patches: [], timestamp: Date.now() }],
    };

    const serialized = serializeSession(original);
    const restored = deserializeSession(serialized);

    expect(restored.id).toBe(original.id);
    expect(restored.state).toEqual(original.state);
    expect(restored.createdAt.getTime()).toBe(original.createdAt.getTime());
    expect(restored.lastSeq).toBe(original.lastSeq);
  });

  it("should exclude lastHtml from serialization", () => {
    const session: Session = {
      id: "test",
      state: {},
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      lastSeq: 0,
      patchHistory: [],
      lastHtml: "<div>cached</div>",
    };

    const serialized = serializeSession(session);
    expect(serialized).not.toHaveProperty("lastHtml");
  });

  it("should reject invalid serialized data", () => {
    expect(() => deserializeSession({ id: 123 } as unknown)).toThrow();
  });
});
```

### 5.4 統合テスト

```typescript
// tests/integration/cloudflare/worker.test.ts

describe("Cloudflare Worker Integration", () => {
  let mf: Miniflare;

  beforeAll(async () => {
    mf = await createTestWorker();
  });

  afterAll(async () => {
    await mf.dispose();
  });

  it("should serve the initial HTML page", async () => {
    const res = await mf.dispatchFetch("http://localhost/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("kantan-ui");
  });

  it("should upgrade to WebSocket", async () => {
    const res = await mf.dispatchFetch("http://localhost/ws", {
      headers: { Upgrade: "websocket" },
    });
    expect(res.status).toBe(101);
  });

  it("should persist session state across requests (KV)", async () => {
    // 1. 初回リクエストでセッション作成
    const res1 = await mf.dispatchFetch("http://localhost/");
    const sessionCookie = extractSessionCookie(res1);

    // 2. 同じセッションIDで再リクエスト
    const res2 = await mf.dispatchFetch("http://localhost/", {
      headers: { Cookie: sessionCookie },
    });

    // 3. セッション状態が維持されていることを検証
    expect(res2.status).toBe(200);
  });
});
```

### 5.5 ファイル構成

```
tests/
├── unit/
│   └── session/
│       ├── storage-kv.test.ts
│       ├── storage-durable-object.test.ts
│       ├── storage-memory.test.ts
│       └── scheduler-noop.test.ts
│
├── integration/
│   └── cloudflare/
│       ├── setup.ts
│       ├── worker.test.ts
│       └── websocket.test.ts
│
└── e2e/
    └── cloudflare/
        └── counter.spec.ts   # Playwright + Miniflare
```

### 5.6 package.json スクリプト追加

```json
{
  "scripts": {
    "test:cloudflare": "vitest run tests/integration/cloudflare",
    "test:e2e:cloudflare": "playwright test tests/e2e/cloudflare"
  }
}
```

---

## 6. nodejs_compat 依存整理

### 6.1 現状の依存分析

`wrangler.toml` で `nodejs_compat` フラグが有効になっている。コアフレームワークで使用されている Node.js 互換 API を特定する。

| API | 使用箇所 | Workers 標準で代替可能か |
|-----|----------|--------------------------|
| `crypto.randomUUID()` | `src/session/manager.ts:267,781,850` | ✅ Web 標準で利用可能 |
| `TextEncoder` | `src/session/manager.ts:147` | ✅ Web 標準 |
| `console.*` | 複数箇所 | ✅ Workers 標準サポート |
| `Map`, `Set`, `WeakRef` | 複数箇所 | ✅ Web 標準 |
| `ReadableStream` | ストリーミング関連 | ✅ Web 標準 |
| `structuredClone` | キャッシュ関連 | ✅ Workers サポート |
| `globalThis.setInterval` | `src/session/scheduler.ts:18` | ⚠️ `nodejs_compat` 依存 |
| `queueMicrotask` | `src/session/manager.ts:582` | ✅ Web 標準 |

### 6.2 結論

kantan-ui のコアコードは **ほぼ Web 標準 API のみ** で構成されている。`nodejs_compat` が必要な理由は:

1. **`setInterval`/`clearInterval`**: `defaultScheduler` で使用。Workers 用に `noopScheduler` を使えば不要
2. **Hono の内部実装**: `hono/cloudflare-workers` が内部で Node.js 互換 API を使用する可能性

### 6.3 対応方針

| アプローチ | 説明 | 推奨 |
|-----------|------|------|
| A: `nodejs_compat` を維持 | 最も安全。Hono の内部互換性も含めて保証 | ✅ 当面はこちら |
| B: `nodejs_compat` を外す | `noopScheduler` 使用で自前コードは対応可能だが、Hono 内部の互換性が不明 | 将来検証 |

**推奨**: `nodejs_compat` を維持しつつ、自前コードでは Web 標準 API のみを使用する方針を堅持する。ドキュメントに `nodejs_compat` が必要な理由を明記する。

### 6.4 不採用としたストレージ候補

| ストレージ | 不採用理由 |
|-----------|-----------|
| **D1 (SQLite)** | セッションデータはキー・バリュー構造で十分。RDB のスキーマ管理・マイグレーションはオーバーヘッド。SQL クエリのレイテンシも KV より大きい |
| **R2 (S3互換)** | オブジェクトストレージは大容量ファイル向け。セッションデータ（数KB）には不適。アクセスレイテンシも KV より大きい |
| **Workers Cache API** | HTTP レスポンスキャッシュ専用。セッション状態のような任意の構造体の保存には不向き |
| **外部 Redis / DynamoDB** | 追加の外部依存を生む。Cloudflare ネイティブの KV/DO で十分なため不採用 |

---

## 7. サンプル・デプロイガイド拡充

### 7.1 サンプル一覧

| サンプル | 内容 | ファイル |
|---------|------|----------|
| 基本（既存） | カウンターデモ | `examples/cloudflare-worker/worker.ts` |
| KV セッション | KV でセッション永続化 | `examples/cloudflare-worker-kv/worker.ts` |
| Durable Objects | DO でリアルタイム同期 | `examples/cloudflare-worker-do/worker.ts` |

### 7.2 KV サンプル

```typescript
// examples/cloudflare-worker-kv/worker.ts

import { createApp, createCloudflareHandler, KVSessionStorage, noopScheduler } from "kantan-ui/cloudflare";

interface Env {
  SESSIONS: KVNamespace;
}

const script = (ctx) => {
  ctx.write("# Cloudflare Workers + KV Demo");

  const count = ctx.state("count", 0);
  if (ctx.button("Increment")) {
    count.set(count.value + 1);
  }
  ctx.write(`Count: ${count.value}`);
};

const kantanApp = await createApp(script, { scheduler: noopScheduler });

export default createCloudflareHandler<Env>(kantanApp, {
  getStorage: (env) => new KVSessionStorage(env.SESSIONS),
});
```

```toml
# examples/cloudflare-worker-kv/wrangler.toml
name = "kantan-ui-worker-kv"
main = "worker.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[[kv_namespaces]]
binding = "SESSIONS"
id = "your-kv-namespace-id"
```

### 7.3 デプロイガイド

デプロイガイドは `docs/guide/cloudflare-workers.md` として作成する。

**目次:**

1. 前提条件（Cloudflare アカウント、Wrangler CLI）
2. プロジェクトセットアップ
3. 基本デプロイ（インメモリセッション）
4. KV を使ったセッション永続化
5. Durable Objects を使ったリアルタイム同期
6. wrangler.toml の設定リファレンス
7. 制約事項と既知の制限
8. トラブルシューティング

### 7.4 制約事項ドキュメント

| 制約 | 影響 | 対応 |
|------|------|------|
| CPU 時間制限 | Free: 10ms, Paid: 50ms / リクエスト | 重い計算は避ける。script 実行を軽量に保つ |
| メモリ制限 | 128 MB / Worker | 大きなファイルアップロードに注意 |
| WebSocket | Workers 本体ではリクエスト中のみ有効 | Durable Objects で永続化 |
| セッション | ステートレス。リクエスト間で消失 | KV or Durable Objects で永続化 |
| `setInterval` | Workers ライフサイクルと不整合 | `noopScheduler` + KV TTL で代替 |
| ファイルシステム | 利用不可 | インメモリ処理のみ（既に対応済み） |

---

## 8. 実装計画

### TDD サイクル

各 Iteration は以下のサイクルで実装する（CLAUDE.md 準拠）:
1. **Red**: テストを書く（失敗する）
2. **Green**: 最小限の実装でテストを通す
3. **Refactor**: コードを改善する

各 Iteration 完了後: `bun run lint:fix && bun run test`

### Phase 依存関係

```
Phase 1 ──▶ Phase 2 ──▶ Phase 3
                │
                └──────▶ Phase 4
```

- Phase 2 は Phase 1（SessionStorage 抽象化）が前提
- Phase 3 は Phase 2（KV 実装）が前提
- Phase 4 は Phase 2 以降いつでも着手可能

### Phase 1: SessionStorage 抽象化（Critical）

| Iteration | 内容 | 成果物 |
|-----------|------|--------|
| 1.1 | `SessionStorage` インターフェース定義 | `src/session/storage.ts` |
| 1.2 | `MemorySessionStorage` 実装 + テスト | `src/session/storage-memory.ts` |
| 1.3 | `SessionManager` へのストレージ注入 | `src/session/manager.ts` 変更 |
| 1.4 | 既存テストの修正・通過確認 | テスト全パス |

### Phase 2: KV SessionStorage（Critical）

| Iteration | 内容 | 成果物 |
|-----------|------|--------|
| 2.1 | `KVSessionStorage` 実装 + テスト | `src/session/storage-kv.ts` |
| 2.2 | `noopScheduler` 実装 + テスト | `src/session/scheduler-noop.ts` |
| 2.3 | `createCloudflareHandler` 実装 | `src/cloudflare.ts` 拡張 |
| 2.4 | KV サンプルプロジェクト | `examples/cloudflare-worker-kv/` |

### Phase 3: Durable Objects（Medium）

| Iteration | 内容 | 成果物 |
|-----------|------|--------|
| 3.1 | `SessionDurableObject` 実装 | `src/session/storage-durable-object.ts` |
| 3.2 | `DurableObjectSessionStorage` 実装 + テスト | 同上 |
| 3.3 | `AlarmScheduler` 実装 + テスト | `src/session/scheduler-alarm.ts` |
| 3.4 | DO サンプルプロジェクト | `examples/cloudflare-worker-do/` |

### Phase 4: テスト・ドキュメント（Medium）

| Iteration | 内容 | 成果物 |
|-----------|------|--------|
| 4.1 | Miniflare 統合テストセットアップ | `tests/integration/cloudflare/` |
| 4.2 | 統合テスト実装 | `tests/integration/cloudflare/*.test.ts` |
| 4.3 | デプロイガイド作成 | `docs/guide/cloudflare-workers.md` |
| 4.4 | nodejs_compat 検証・ドキュメント | 検証結果記録 |

### Phase 5: 将来検討

- Cron Triggers による一括クリーンアップ
- `kt.env()` ヘルパー
- Cloudflare Cache API 統合（`kt.cache_data` のストレージバックエンド）
- Durable Objects WebSocket Hibernation API

---

## 9. ファイル構成（全体）

```
src/
├── cloudflare.ts                         # エントリーポイント（拡張）
├── session/
│   ├── storage.ts                        # SessionStorage インターフェース [新規]
│   ├── storage-memory.ts                 # MemorySessionStorage [新規]
│   ├── storage-kv.ts                     # KVSessionStorage [新規]
│   ├── storage-durable-object.ts         # DurableObjectSessionStorage [新規]
│   ├── scheduler.ts                      # Scheduler インターフェース（既存）
│   ├── scheduler-noop.ts                 # NoopScheduler [新規]
│   ├── scheduler-alarm.ts               # AlarmScheduler [新規]
│   ├── manager.ts                        # SessionManager（変更）
│   └── types.ts                          # 型定義（既存）
│
examples/
├── cloudflare-worker/                    # 基本サンプル（既存）
├── cloudflare-worker-kv/                 # KV サンプル [新規]
│   ├── worker.ts
│   ├── wrangler.toml
│   └── package.json
└── cloudflare-worker-do/                 # DO サンプル [新規]
    ├── worker.ts
    ├── wrangler.toml
    └── package.json

tests/
├── unit/session/
│   ├── storage-kv.test.ts                [新規]
│   ├── storage-durable-object.test.ts    [新規]
│   ├── storage-memory.test.ts            [新規]
│   └── scheduler-noop.test.ts            [新規]
├── integration/cloudflare/
│   ├── setup.ts                          [新規]
│   ├── worker.test.ts                    [新規]
│   └── websocket.test.ts                 [新規]
└── e2e/cloudflare/
    └── counter.spec.ts                   [新規]

docs/
├── design/
│   └── cloudflare-workers-adapter.md     # 本設計書 [新規]
└── guide/
    └── cloudflare-workers.md             # デプロイガイド [新規]
```

---

## 10. セキュリティ考慮

### 10.1 KV ストレージ

- セッションデータは JSON でシリアライズされるため、機密情報（パスワード等）を `state` に保存しないよう注意喚起
- KV の `expirationTtl` でセッションが自動削除されるため、漏洩リスクを時間で限定
- KV のキーにセッションID（UUID v4）を使用し、推測困難性を保証

### 10.2 Durable Objects

- DO はセッションIDに基づく `idFromName()` でアクセス。不正なセッションIDでアクセスしても空の DO が返るだけ
- DO 間の通信は Cloudflare 内部ネットワークで完結

### 10.3 WebSocket Origin 検証

- 既存の `validateOrigin()` (`src/websocket/origin-validation.ts`) が Workers 環境でも機能する
- Workers では `Host` ヘッダーが Cloudflare のドメインになるため、`allowedOrigins` の設定が重要

### 10.4 セッションハイジャック対策

KV/DO にセッションデータが永続化されるため、セッションIDの漏洩がインメモリ環境より深刻になる。

| 対策 | 方法 | 実装 |
|------|------|------|
| セッションID の推測困難性 | UUID v4（`crypto.randomUUID()`）を使用 | 既存実装で対応済み |
| Cookie のセキュリティ属性 | `HttpOnly`, `Secure`, `SameSite=Lax` | 既存実装で対応済み |
| セッション固定攻撃防止 | 認証後にセッションIDを再生成 | ユーザー責任（ドキュメントで注意喚起） |
| KV アクセス制御 | Workers のバインディング経由のみアクセス可能 | Cloudflare の仕組みで保証 |

### 10.5 デシリアライズ時の安全性

KV/DO から取得した JSON データをデシリアライズする際の安全性対策:

```typescript
// ✅ 安全: バリデーション付きデシリアライズ（§2.10.6 参照）
const session = deserializeSession(validated);

// ❌ 危険: 未検証のデータを直接使用
const session = JSON.parse(raw) as Session; // プロトタイプポリューション等のリスク
```

- `JSON.parse` の結果を `isValidSerializedSession()` で検証してから使用する（§2.10.6 参照）
- `__proto__`, `constructor`, `prototype` 等の危険なキーを含むデータは拒否する
- KV/DO のデータは Cloudflare 内部で管理されるため、外部からの注入リスクは低いが、防御的にバリデーションを行う

---

## 11. 参考資料

- [Hono - Cloudflare Workers](https://hono.dev/docs/getting-started/cloudflare-workers)
- [Cloudflare KV](https://developers.cloudflare.com/kv/)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Cloudflare Durable Objects - Alarms](https://developers.cloudflare.com/durable-objects/api/alarms/)
- [Cloudflare Workers WebSocket](https://developers.cloudflare.com/workers/runtime-apis/websockets/)
- [Miniflare](https://miniflare.dev/)
- [Hono - WebSocket Helper (Cloudflare Workers)](https://hono.dev/docs/helpers/websocket)
