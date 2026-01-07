import { createRequire } from "node:module";
import type { ServerType } from "@hono/node-server";
import type { Hono } from "hono";
import { getRuntimeKey } from "hono/adapter";
import type { UpgradeWebSocket, WSContext } from "hono/ws";

// ES modules require createRequire for dynamic require() calls
const require = createRequire(import.meta.url);

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
	injectWebSocket?: (server: ServerType) => void;
}

let cachedAdapter: WebSocketAdapter | null = null;

/**
 * ランタイムに応じたWebSocketアダプターを作成
 * Node.jsの場合は app が必要
 */
export function createWebSocketAdapter(app?: Hono): WebSocketAdapter {
	if (cachedAdapter) {
		return cachedAdapter;
	}

	const runtime = getRuntimeKey();

	if (runtime === "bun") {
		// Bun環境: hono/bun を使用
		// biome-ignore lint/suspicious/noExplicitAny: dynamic import for runtime-specific module
		const { createBunWebSocket } = require("hono/bun") as any;
		const { upgradeWebSocket, websocket } = createBunWebSocket();
		cachedAdapter = { upgradeWebSocket, websocket };
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
