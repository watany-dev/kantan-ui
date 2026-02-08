/**
 * Cloudflare Workers用サンプル
 *
 * 使用方法:
 *   cd examples/cloudflare-worker
 *   npm install
 *   npx wrangler dev
 *
 * デプロイ:
 *   npx wrangler deploy
 */
import { createApp } from "../../src/cloudflare";
import { counterScript } from "../_shared/counter-demo";

const script = counterScript(
	"kantan-ui Cloudflare Workers Demo",
	"Cloudflare Workersで動作するデモアプリです。",
);

const kantanApp = await createApp(script);

export default {
	fetch: kantanApp.fetch,
};
