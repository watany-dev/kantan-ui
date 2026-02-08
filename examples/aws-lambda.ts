/**
 * AWS Lambda用サンプルハンドラー
 *
 * API Gateway (HTTP API / REST API) または Lambda Function URL で動作
 *
 * デプロイ方法:
 *   1. esbuild 等でバンドル: esbuild examples/aws-lambda.ts --bundle --platform=node --outfile=dist/handler.js
 *   2. Lambda関数として dist/handler.js をデプロイ
 *   3. API Gateway HTTP API または Function URL を設定
 *
 * ストリーミング対応:
 *   Lambda Function URL + レスポンスストリーミングを使用する場合は
 *   createLambdaStreamHandler を使用してください
 */
import { createApp } from "../src/app";
import { createLambdaHandler } from "../src/lambda";
import { counterScript } from "./_shared/counter-demo";

const script = counterScript("kantan-ui Lambda Demo", "AWS Lambdaで動作するデモアプリです。");

const kantanApp = await createApp(script);

export const handler = createLambdaHandler(kantanApp);
