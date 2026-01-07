export {
	createWebSocketAdapter,
	createWebSocketHandler,
	clearAdapterCache,
	// 後方互換性のためのエクスポート（非推奨、Bunのみ）
	upgradeWebSocket,
	websocket,
} from "./handler";
export type { WebSocketAdapter } from "./handler";
