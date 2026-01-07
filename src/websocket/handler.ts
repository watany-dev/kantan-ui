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
 * アダプターキャッシュをクリア
 * @internal テスト用
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
