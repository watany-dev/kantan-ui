// Re-export Hono
export { Hono } from "hono";

// App factory
export { createApp } from "./app";

// Runtime
export { rerun, getContext, setContext, clearContext } from "./runtime";
export type { Script, RerunContext } from "./runtime";

// WebSocket
export {
	createWebSocketHandler,
	upgradeWebSocket,
	websocket,
	addConnection,
	removeConnection,
	getConnectionCount,
} from "./websocket";
export type {
	ClientMessage,
	ServerMessage,
	Patch,
	ReplaceRootPatch,
} from "./websocket/types";
