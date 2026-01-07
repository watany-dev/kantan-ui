/**
 * Deno用サンプルサーバー
 *
 * 使用方法:
 *   deno run --allow-net --allow-read examples/deno-server.ts
 *   または
 *   deno task dev (watchモード)
 */
import { createApp } from "../src/app.ts";
import { counterScript } from "./_shared/counter-demo.ts";

const script = counterScript("kantan-ui Deno Demo", "Denoで動作するデモアプリです。");

const kantanApp = await createApp(script);

const port = 3000;
console.log(`Server running at http://localhost:${port}`);

Deno.serve({ port }, kantanApp.fetch);
