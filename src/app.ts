import { Hono } from "hono";
import { type Script, rerun } from "./runtime";
import { addConnection, createWebSocketHandler, removeConnection, websocket } from "./websocket";
import type { ServerMessage } from "./websocket/types";

const clientScript = `
  const ws = new WebSocket(\`ws://\${location.host}/ws\`);

  ws.onopen = () => {
    console.log("Connected to server");
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "patch") {
      for (const patch of msg.patches) {
        if (patch.type === "replaceRoot") {
          document.getElementById("app").innerHTML = patch.html;
        }
      }
    }
  };

  ws.onclose = () => {
    console.log("Disconnected from server");
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  // イベント送信用のグローバル関数
  window.sendEvent = (widgetId, value) => {
    ws.send(JSON.stringify({ type: "event", widgetId, value }));
  };
`;

export function createApp(script: Script) {
	const app = new Hono();

	// ルートページ（HTMLを返す）
	app.get("/", (c) => {
		const initialHtml = rerun(script);
		return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>kantan-ui</title>
      </head>
      <body>
        <div id="app">${initialHtml}</div>
        <script src="/client.js"></script>
      </body>
      </html>
    `);
	});

	// WebSocket エンドポイント
	app.get(
		"/ws",
		createWebSocketHandler({
			onOpen: (_evt, ws) => {
				addConnection(ws);
				console.log("WebSocket connected");
			},
			onMessage: (event, ws) => {
				const data = JSON.parse(event.data.toString());

				// rerun を実行
				const html = rerun(script, {
					widgetId: data.widgetId,
					value: data.value,
				});

				// replaceRoot パッチを送信
				const message: ServerMessage = {
					type: "patch",
					patches: [{ type: "replaceRoot", html }],
				};
				ws.send(JSON.stringify(message));
			},
			onClose: (_evt, ws) => {
				removeConnection(ws);
				console.log("WebSocket disconnected");
			},
		}),
	);

	// クライアント JavaScript
	app.get("/client.js", (c) => {
		return c.text(clientScript, 200, {
			"Content-Type": "application/javascript",
		});
	});

	return { app, websocket };
}
