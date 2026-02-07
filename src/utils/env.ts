import { getRuntimeKey } from "hono/adapter";

/**
 * クロスランタイム環境変数アクセス
 *
 * Node.js, Bun, Deno で動作し、process.env への直接依存を排除する。
 * Cloudflare Workers では環境変数は Hono Context 経由でアクセスするため、
 * この関数ではなく env(c) を使用すること。
 */
export function getEnvVar(key: string): string | undefined {
	const runtime = getRuntimeKey();

	if (runtime === "deno") {
		// biome-ignore lint/suspicious/noExplicitAny: Deno runtime global
		return (globalThis as any).Deno?.env?.get(key);
	}

	// Node.js and Bun both support process.env
	if (typeof globalThis.process !== "undefined" && globalThis.process.env) {
		return globalThis.process.env[key];
	}

	return undefined;
}
