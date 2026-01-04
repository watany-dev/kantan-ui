import { createBunWebSocket } from "hono/bun";
import type { WSContext } from "hono/ws";

export const { upgradeWebSocket, websocket } = createBunWebSocket();

interface WebSocketHandlers {
	onOpen?: ((evt: Event, ws: WSContext) => void) | undefined;
	onMessage?: ((message: MessageEvent, ws: WSContext) => void) | undefined;
	onClose?: ((evt: CloseEvent, ws: WSContext) => void) | undefined;
	onError?: ((error: Event, ws: WSContext) => void) | undefined;
}

export function createWebSocketHandler(handlers: WebSocketHandlers) {
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
