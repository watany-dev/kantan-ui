/**
 * タイマースケジューリングの抽象化
 *
 * SessionManagerのsetInterval/clearIntervalをプラグイン化し、
 * Cloudflare Workers Durable Objectsのalarm() APIなど
 * 異なるタイマー実装に差し替え可能にする。
 */
export interface Scheduler {
	setInterval(callback: () => void, ms: number): unknown;
	clearInterval(id: unknown): void;
}

/**
 * デフォルトのスケジューラー実装
 * グローバルのsetInterval/clearIntervalを使用（Node.js, Bun, Deno対応）
 */
export const defaultScheduler: Scheduler = {
	setInterval: (callback, ms) => globalThis.setInterval(callback, ms),
	clearInterval: (id) => globalThis.clearInterval(id as ReturnType<typeof globalThis.setInterval>),
};
