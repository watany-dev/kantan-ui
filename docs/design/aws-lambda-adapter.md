# AWS Lambda アダプター 設計書

## 実装ステータス

> **✅ 実装完了** (2026-02-08)
>
> Honoの `hono/aws-lambda` アダプターを活用し、新たな依存パッケージなしでAWS Lambda対応を実装。
> - `createLambdaHandler()`: API Gateway v1/v2, ALB 対応
> - `createLambdaStreamHandler()`: Lambda Function URL / Lambda Web Adapter 対応

## 1. 概要

### 1.1 目的

kantan-ui アプリケーションをAWS Lambda上で動作させるためのアダプターを提供する。Honoが既にサポートしている `hono/aws-lambda` を活用し、最小限のコードで Lambda デプロイを可能にする。

### 1.2 スコープ

- API Gateway v1 (REST API) / v2 (HTTP API) / ALB 対応のハンドラー生成
- Lambda Function URL / Lambda Web Adapter 対応のストリーミングハンドラー生成
- `kantan-ui/lambda` としてのパッケージエクスポート

### 1.3 設計原則

| 原則 | 説明 |
|------|------|
| **最小依存** | 新たな依存パッケージを追加しない（Honoに内蔵の `hono/aws-lambda` を利用） |
| **既存パターン踏襲** | `kantan-ui/serve` (Node.js用) と同様のヘルパー関数パターン |
| **薄いラッパー** | Honoのアダプターを直接活用し、独自ロジックを最小化 |
| **Web標準準拠** | Hono の fetch ベースアーキテクチャをそのまま活用 |

### 1.4 ランタイム対応マトリクス

| ランタイム | ヘルパー | パッケージ |
|-----------|---------|-----------|
| Bun | 不要（`Bun.serve()` に直接渡す） | - |
| Node.js | `serve()` | `kantan-ui/serve` |
| Deno | 不要（`Deno.serve()` に直接渡す） | - |
| **AWS Lambda** | **`createLambdaHandler()` / `createLambdaStreamHandler()`** | **`kantan-ui/lambda`** |

---

## 2. API設計

### 2.1 createLambdaHandler

API Gateway (v1 REST API, v2 HTTP API) および ALB に対応するLambdaハンドラーを作成する。

```typescript
import { createApp } from "kantan-ui";
import { createLambdaHandler } from "kantan-ui/lambda";

const kantanApp = await createApp(myScript);
export const handler = createLambdaHandler(kantanApp);
```

**パラメータ:**

| パラメータ | 型 | 説明 |
|-----------|------|------|
| kantanApp | `KantanApp` | `createApp()` の戻り値 |

**戻り値:** Lambda ハンドラー関数（API Gateway / ALB イベントを受け取り、レスポンスを返す）

### 2.2 createLambdaStreamHandler

Lambda Function URL および Lambda Web Adapter 対応のストリーミングハンドラーを作成する。レスポンスストリーミングにより、大きなHTMLの初期レンダリングを効率的に配信できる。

```typescript
import { createApp } from "kantan-ui";
import { createLambdaStreamHandler } from "kantan-ui/lambda";

const kantanApp = await createApp(myScript);
export const handler = createLambdaStreamHandler(kantanApp);
```

**パラメータ:** `createLambdaHandler` と同一

**戻り値:** Lambda ストリーミングハンドラー関数

---

## 3. 実装詳細

### 3.1 ファイル構成

```
src/
└── lambda.ts          # Lambda ハンドラーヘルパー（createLambdaHandler / createLambdaStreamHandler）

examples/
└── aws-lambda.ts      # Lambda 用サンプルハンドラー

tests/unit/
└── lambda.test.ts     # ユニットテスト（API Gateway v1/v2 イベント処理）
```

### 3.2 内部実装

`createLambdaHandler` は Hono の `handle()` を、`createLambdaStreamHandler` は `streamHandle()` をラップする薄いヘルパー関数。

```typescript
import { handle, streamHandle } from "hono/aws-lambda";

export function createLambdaHandler(kantanApp: KantanApp) {
  return handle(kantanApp.app);
}

export function createLambdaStreamHandler(kantanApp: KantanApp) {
  return streamHandle(kantanApp.app);
}
```

### 3.3 対応イベントタイプ

| イベント | サポート | 備考 |
|---------|---------|------|
| API Gateway v1 (REST API) | ✅ | `httpMethod`, `resource`, `requestContext` |
| API Gateway v2 (HTTP API) | ✅ | `version: "2.0"`, `routeKey`, `rawPath` |
| ALB (Application Load Balancer) | ✅ | `requestContext.elb` |
| Lambda Function URL | ✅ | API Gateway v2 互換形式 |

### 3.4 制約事項

- **WebSocket**: Lambda 上では WebSocket エンドポイント (`/ws`) は機能しない。初期HTMLのSSR（`GET /`）は正常に動作する。将来的にAPI Gateway WebSocket APIとの統合を検討。
- **ステートフルセッション**: Lambda はステートレスなため、セッション状態はリクエスト間で保持されない。静的コンテンツの配信やSSR用途に適している。

---

## 4. パッケージエクスポート

```json
{
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./serve": { "types": "./dist/serve.d.ts", "import": "./dist/serve.js" },
    "./lambda": { "types": "./dist/lambda.d.ts", "import": "./dist/lambda.js" }
  }
}
```

---

## 5. デプロイ例

### 5.1 esbuild によるバンドル

```bash
esbuild src/handler.ts --bundle --platform=node --target=node18 --outfile=dist/handler.js --format=esm
```

### 5.2 AWS CDK での定義

```typescript
const fn = new lambda.Function(this, "KantanUiFunction", {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: "handler.handler",
  code: lambda.Code.fromAsset("dist"),
});

const api = new apigateway.HttpApi(this, "KantanUiApi");
api.addRoutes({
  path: "/{proxy+}",
  integration: new HttpLambdaIntegration("LambdaIntegration", fn),
});
```

---

## 6. テスト

### 6.1 ユニットテスト（4件）

| テスト | 内容 |
|-------|------|
| `createLambdaHandler: should return a function` | ハンドラー関数が生成されること |
| `createLambdaHandler: should handle API Gateway v2 event` | HTTP API イベントの処理 |
| `createLambdaHandler: should handle API Gateway v1 event` | REST API イベントの処理 |
| `createLambdaStreamHandler: should return a function` | ストリーミングハンドラーが生成されること |

---

## 7. 参考資料

- [Hono - AWS Lambda Adapter](https://hono.dev/docs/getting-started/aws-lambda)
- [AWS Lambda Function URLs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html)
- [AWS Lambda Response Streaming](https://docs.aws.amazon.com/lambda/latest/dg/configuration-response-streaming.html)
