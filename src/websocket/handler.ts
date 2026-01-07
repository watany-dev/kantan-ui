import type { Hono } from "hono";

/**
 * Node.js HTTP/HTTPS Server型（@hono/node-serverからの依存を避けるためローカル定義）
 * Deno互換性のため、@hono/node-serverを直接インポートしない
 */
type NodeServerType = {
	close: () => void;
	listen: (port: number, hostname?: string, callback?: () => void) => void;
};

import { getRuntimeKey } from "hono/adapter";
import type { UpgradeWebSocket, WSContext } from "hono/ws";

interface WebSocketHandlers {
	onOpen?: ((evt: Event, ws: WSContext) => void) | undefined;
	onMessage?: ((message: MessageEvent, ws: WSContext) => void) | undefined;
	onClose?: ((evt: CloseEvent, ws: WSContext) => void) | undefined;
	onError?: ((error: Event, ws: WSContext) => void) | undefined;
}

export interface WebSocketAdapter {
	upgradeWebSocket: UpgradeWebSocket;
	/** Bun用: Bun.serve() の websocket オプションに渡す */
	websocket?: unknown;
	/** Node.js用: サーバー起動後に呼び出してWebSocketを有効化 */
	injectWebSocket?: (server: NodeServerType) => void;
}

let cachedAdapter: WebSocketAdapter | null = null;

/**
 * Bun用WebSocketアダプターを作成
 */
async function createBunAdapter(): Promise<WebSocketAdapter> {
	// biome-ignore lint/suspicious/noExplicitAny: dynamic import for runtime-specific module
	const { createBunWebSocket } = (await import("hono/bun")) as any;
	const { upgradeWebSocket, websocket } = createBunWebSocket();
	return { upgradeWebSocket, websocket };
}

/**
 * Node.js用WebSocketアダプターを作成
 */
async function createNodeAdapter(app: Hono): Promise<WebSocketAdapter> {
	// biome-ignore lint/suspicious/noExplicitAny: dynamic import for runtime-specific module
	const { createNodeWebSocket } = (await import("@hono/node-ws")) as any;
	const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });
	return { upgradeWebSocket, injectWebSocket };
}

/**
 * Deno用WebSocketアダプターを作成
 */
async function createDenoAdapter(): Promise<WebSocketAdapter> {
	// biome-ignore lint/suspicious/noExplicitAny: dynamic import for runtime-specific module
	const { upgradeWebSocket } = (await import("hono/deno")) as any;
	return { upgradeWebSocket };
}

/**
 * ランタイムに応じたWebSocketアダプターを非同期で作成
 * Node.jsの場合は app が必要
 */
export async function createWebSocketAdapterAsync(app?: Hono): Promise<WebSocketAdapter> {
	if (cachedAdapter) {
		return cachedAdapter;
	}

	const runtime = getRuntimeKey();

	if (runtime === "bun") {
		cachedAdapter = await createBunAdapter();
	} else if (runtime === "deno") {
		cachedAdapter = await createDenoAdapter();
	} else {
		// Node.js環境
		if (!app) {
			throw new Error("Hono app instance is required for Node.js WebSocket adapter");
		}
		cachedAdapter = await createNodeAdapter(app);
	}

	return cachedAdapter;
}

/**
 * ランタイムに応じたWebSocketアダプターを作成（同期版・後方互換性用）
 * Node.jsの場合は app が必要
 * @deprecated 非同期版の createWebSocketAdapterAsync を推奨
 */
export function createWebSocketAdapter(app?: Hono): WebSocketAdapter {
	if (cachedAdapter) {
		return cachedAdapter;
	}

	const runtime = getRuntimeKey();

	if (runtime === "bun") {
		// Bun環境: hono/bun を使用（同期的にimport可能）
		// biome-ignore lint/suspicious/noExplicitAny: dynamic import for runtime-specific module
		const { createBunWebSocket } = require("hono/bun") as any;
		const { upgradeWebSocket, websocket } = createBunWebSocket();
		cachedAdapter = { upgradeWebSocket, websocket };
	} else if (runtime === "deno") {
		// Deno環境: 同期版では初期化できないため、エラーを投げる
		throw new Error(
			"Deno runtime detected. Use createWebSocketAdapterAsync() instead of createWebSocketAdapter().",
		);
	} else {
		// Node.js環境: @hono/node-ws を使用
		if (!app) {
			throw new Error("Hono app instance is required for Node.js WebSocket adapter");
		}
		// biome-ignore lint/suspicious/noExplicitAny: dynamic import for runtime-specific module
		const { createNodeWebSocket } = require("@hono/node-ws") as any;
		const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });
		cachedAdapter = { upgradeWebSocket, injectWebSocket };
	}

	return cachedAdapter;
}

/**
 * アダプターキャッシュをクリア（テスト用）
 */
export function clearAdapterCache(): void {
	cachedAdapter = null;
}

/**
 * WebSocketハンドラーを作成するヘルパー関数
 */
export function createWebSocketHandler(
	upgradeWebSocket: UpgradeWebSocket,
	handlers: WebSocketHandlers,
) {
	return upgradeWebSocket(() => {
		const events: {
			onOpen?: (evt: Event, ws: WSContext) => void;
			onMessage?: (message: MessageEvent, ws: WSContext) => void;
			onClose?: (evt: CloseEvent, ws: WSContext) => void;
			onError?: (error: Event, ws: WSContext) => void;
		} = {};

		if (handlers.onOpen) events.onOpen = handlers.onOpen;
		if (handlers.onMessage) events.onMessage = handlers.onMessage;
		if (handlers.onClose) events.onClose = handlers.onClose;
		if (handlers.onError) events.onError = handlers.onError;

		return events;
	});
}

// 後方互換性のためのエクスポート（非推奨）
// 既存のserver-*.tsファイルで使用されている
let legacyAdapter: WebSocketAdapter | null = null;

function getLegacyAdapter(): WebSocketAdapter {
	if (!legacyAdapter) {
		const runtime = getRuntimeKey();
		if (runtime === "bun") {
			// biome-ignore lint/suspicious/noExplicitAny: dynamic import for runtime-specific module
			const { createBunWebSocket } = require("hono/bun") as any;
			const { upgradeWebSocket, websocket } = createBunWebSocket();
			legacyAdapter = { upgradeWebSocket, websocket };
		} else {
			throw new Error(
				"Legacy exports (upgradeWebSocket, websocket) are only available in Bun. " +
					"For Node.js, use createWebSocketAdapter(app) instead.",
			);
		}
	}
	return legacyAdapter;
}

/** @deprecated Use createWebSocketAdapter(app).upgradeWebSocket instead */
export const upgradeWebSocket: UpgradeWebSocket = new Proxy({} as UpgradeWebSocket, {
	apply(_target, _thisArg, args) {
		return getLegacyAdapter().upgradeWebSocket(...(args as Parameters<UpgradeWebSocket>));
	},
});

/** @deprecated Use createWebSocketAdapter(app).websocket instead */
export const websocket = new Proxy(
	{},
	{
		get(_target, prop) {
			const adapter = getLegacyAdapter();
			if (adapter.websocket && typeof adapter.websocket === "object") {
				return (adapter.websocket as Record<string | symbol, unknown>)[prop];
			}
			return undefined;
		},
	},
);
