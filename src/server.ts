import { createApp } from "./app";

// サンプルスクリプト
const script = () => {
	return `
    <h1>kantan-ui</h1>
    <p>WebSocket connection established!</p>
    <button onclick="sendEvent('btn1', 'clicked')">Click me</button>
  `;
};

const { app, websocket } = createApp(script);

export default {
	fetch: app.fetch,
	websocket,
};
