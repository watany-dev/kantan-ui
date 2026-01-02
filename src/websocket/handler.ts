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
	return upgradeWebSocket(() => {
		// exactOptionalPropertyTypes対応: undefinedの場合はプロパティを省略
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
