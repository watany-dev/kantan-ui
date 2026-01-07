/**
 * Node.js用サンプルサーバー
 *
 * 使用方法:
 *   npx tsx examples/node-server.ts
 *   または
 *   node --experimental-strip-types examples/node-server.ts
 */
import { createApp } from "../src/app";
import { serve } from "../src/serve";
import { counterScript } from "./_shared/counter-demo";

const script = counterScript("kantan-ui Node.js Demo", "Node.jsで動作するデモアプリです。");

const kantanApp = await createApp(script);
const { shutdown } = serve(kantanApp, { port: 3000 });

// Graceful shutdown
process.on("SIGINT", () => {
	console.log("\nShutting down...");
	shutdown();
	process.exit(0);
});
