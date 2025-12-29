// Re-export Hono
export { Hono } from "hono";

// App factory
export { createApp } from "./app";

// Runtime
export { clearContext, getContext, rerun, setContext } from "./runtime";
export type { RerunContext, Script } from "./runtime";

// WebSocket
export {
	addConnection,
	createWebSocketHandler,
	getConnectionCount,
	removeConnection,
	upgradeWebSocket,
	websocket,
} from "./websocket";
export type {
	ClientMessage,
	Patch,
	ReplaceRootPatch,
	ServerMessage,
} from "./websocket/types";
