import { createBunWebSocket } from "hono/bun";
import type { WSContext } from "hono/ws";

export const { upgradeWebSocket, websocket } = createBunWebSocket();

export interface WebSocketHandlers {
	onOpen?: (evt: Event, ws: WSContext) => void;
	onMessage?: (message: MessageEvent, ws: WSContext) => void;
	onClose?: (evt: CloseEvent, ws: WSContext) => void;
	onError?: (error: Event, ws: WSContext) => void;
}

export function createWebSocketHandler(handlers: WebSocketHandlers) {
	return upgradeWebSocket(() => ({
		onOpen: handlers.onOpen,
		onMessage: handlers.onMessage,
		onClose: handlers.onClose,
		onError: handlers.onError,
	}));
}

// 接続中の WebSocket を管理
const connections = new Set<WSContext>();

export function addConnection(ws: WSContext): void {
	connections.add(ws);
}

export function removeConnection(ws: WSContext): void {
	connections.delete(ws);
}

export function getConnectionCount(): number {
	return connections.size;
}
