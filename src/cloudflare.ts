/**
 * Cloudflare Workers 用エントリーポイント
 *
 * @example
 * ```typescript
 * // worker.ts
 * import { createApp } from "kantan-ui/cloudflare";
 *
 * const app = await createApp((ctx) => {
 *   ctx.write("Hello from Cloudflare Workers!");
 * });
 *
 * export default { fetch: app.fetch };
 * ```
 */

export type { KantanApp, KantanAppOptions } from "./app";
export { createApp } from "./app";
