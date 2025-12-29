// Re-export Hono
export { Hono } from "hono";

// App factory
export { createApp } from "./app";

// Runtime
export { rerun, getContext, setContext, clearContext } from "./runtime";
export type { Script, RerunContext } from "./runtime";

// Session
export {
	SessionManager,
	getSessionManager,
	setSessionManager,
	resetSessionManager,
	session_state,
	setCurrentSessionId,
	getCurrentSessionId,
} from "./session";
export type {
	SessionId,
	Session,
	SessionConfig,
	SessionState,
} from "./session/types";

// Widgets
export {
	button,
	renderButton,
	slider,
	renderSlider,
	text_input,
	renderTextInput,
	selectbox,
	renderSelectbox,
	generateWidgetId,
	resetWidgetCounter,
	getWidgetValue,
	setWidgetValue,
	hasWidgetValue,
} from "./widgets";
export type {
	WidgetConfig,
	WidgetState,
	WidgetRenderResult,
	ButtonConfig,
	SliderConfig,
	TextInputConfig,
	SelectboxConfig,
} from "./widgets/types";

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

// kt - Declarative UI API
export { kt } from "./kt";
export {
	RenderContext,
	setRenderContext,
	getRenderContext,
	requireRenderContext,
} from "./kt/context";
