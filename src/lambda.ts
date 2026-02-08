/**
 * AWS Lambda用ハンドラーヘルパー
 *
 * createApp() の戻り値を受け取り、AWS Lambda + API Gateway で動作するハンドラーを生成
 *
 * @example
 * ```typescript
 * import { createApp } from "kantan-ui";
 * import { createLambdaHandler } from "kantan-ui/lambda";
 *
 * const kantanApp = await createApp(myScript);
 * export const handler = createLambdaHandler(kantanApp);
 * ```
 *
 * @example レスポンスストリーミング対応（Lambda Web Adapter / Function URL）
 * ```typescript
 * import { createApp } from "kantan-ui";
 * import { createLambdaStreamHandler } from "kantan-ui/lambda";
 *
 * const kantanApp = await createApp(myScript);
 * export const handler = createLambdaStreamHandler(kantanApp);
 * ```
 */

import type { APIGatewayProxyResult, LambdaContext, LambdaEvent } from "hono/aws-lambda";
import { handle, streamHandle } from "hono/aws-lambda";
import type { KantanApp } from "./app";

/**
 * AWS Lambda handler function type（hono/aws-lambda の Handler 互換）
 *
 * hono/aws-lambda の Handler 型は any を使用しており、
 * かつ public export されていないため、互換型をローカル定義
 */
type LambdaHandler = (
	// biome-ignore lint/suspicious/noExplicitAny: matches hono Handler<TEvent = any>
	event: any,
	context: LambdaContext,
	// biome-ignore lint/suspicious/noExplicitAny: matches hono Callback<TResult = any>
	callback: (error?: Error | string | null, result?: any) => void,
	// biome-ignore lint/suspicious/noConfusingVoidType: matches hono Handler return type (void | Promise<TResult>)
	// biome-ignore lint/suspicious/noExplicitAny: matches hono Handler<TResult = any>
) => void | Promise<any>;

/**
 * AWS Lambda ハンドラーを作成（API Gateway / ALB 対応）
 *
 * API Gateway v1 (REST API), v2 (HTTP API), ALB に対応
 */
export function createLambdaHandler(
	kantanApp: KantanApp,
): <L extends LambdaEvent>(
	event: L,
	lambdaContext?: LambdaContext,
) => Promise<APIGatewayProxyResult> {
	// biome-ignore lint/suspicious/noExplicitAny: handle return type uses conditional types that are complex to express
	return handle(kantanApp.app) as any;
}

/**
 * AWS Lambda ストリーミングハンドラーを作成（Lambda Function URL / Lambda Web Adapter 対応）
 *
 * レスポンスストリーミングにより、大きなHTMLの初期レンダリングを効率的に配信
 */
export function createLambdaStreamHandler(kantanApp: KantanApp): LambdaHandler {
	return streamHandle(kantanApp.app);
}
