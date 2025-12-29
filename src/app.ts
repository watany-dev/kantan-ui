import { Hono } from "hono";
import { type Script, rerun } from "./runtime";
import { getSessionManager } from "./session";
import { createWebSocketHandler, websocket } from "./websocket";
import type { ClientMessage, ServerMessage } from "./websocket/types";

const clientScript = `
  let sessionId = localStorage.getItem("kt-session-id");
  const ws = new WebSocket(\`ws://\${location.host}/ws\`);

  ws.onopen = () => {
    console.log("Connected to server");
    // 初期化メッセージを送信
    ws.send(JSON.stringify({ type: "init", sessionId }));
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);

    // セッションID を保存
    if (msg.sessionId) {
      sessionId = msg.sessionId;
      localStorage.setItem("kt-session-id", sessionId);
    }

    if (msg.type === "patch" && msg.patches) {
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
    ws.send(JSON.stringify({ type: "event", widgetId, value, sessionId }));
  };
`;

const defaultStyles = `
  .kt-button { padding: 8px 16px; cursor: pointer; }
  .kt-slider-container { margin: 10px 0; }
  .kt-slider { width: 200px; }
  .kt-slider-label { display: block; margin-bottom: 4px; }
  .kt-text-input-container { margin: 10px 0; }
  .kt-text-input { padding: 8px; width: 200px; }
  .kt-text-input-label { display: block; margin-bottom: 4px; }
  .kt-selectbox-container { margin: 10px 0; }
  .kt-selectbox { padding: 8px; }
  .kt-selectbox-label { display: block; margin-bottom: 4px; }
`;

export function createApp(script: Script) {
	const app = new Hono();
	const sessionManager = getSessionManager();

	// ルートページ（HTMLを返す）
	app.get("/", (c) => {
		// 初期表示はセッションなしで rerun
		const initialHtml = rerun(script);
		return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>kantan-ui</title>
        <style>${defaultStyles}</style>
      </head>
      <body>
        <div id="app">${initialHtml}</div>
        <script>${clientScript}</script>
      </body>
      </html>
    `);
	});

	// WebSocket エンドポイント
	app.get(
		"/ws",
		createWebSocketHandler({
			onOpen: (_evt, _ws) => {
				console.log("WebSocket connected");
			},
			onMessage: (event, ws) => {
				const data: ClientMessage = JSON.parse(event.data.toString());

				if (data.type === "init") {
					// セッションを取得または作成
					const session = sessionManager.getOrCreateSession(data.sessionId);
					sessionManager.associateWebSocket(ws, session.id);

					// 初期HTMLを送信
					const html = rerun(script, undefined, session.id);
					const message: ServerMessage = {
						type: "patch",
						patches: [{ type: "replaceRoot", html }],
						sessionId: session.id,
					};
					ws.send(JSON.stringify(message));
				} else if (data.type === "event") {
					// セッションを取得
					const session = sessionManager.getSessionByWebSocket(ws);
					if (!session) {
						console.error("Session not found for WebSocket");
						return;
					}

					// Widget の値を更新
					if (data.widgetId && data.value !== undefined) {
						sessionManager.setState(session.id, data.widgetId, data.value);
					}

					// rerun を実行
					const html = rerun(
						script,
						{ widgetId: data.widgetId!, value: data.value },
						session.id,
					);

					// replaceRoot パッチを送信
					const message: ServerMessage = {
						type: "patch",
						patches: [{ type: "replaceRoot", html }],
					};
					ws.send(JSON.stringify(message));
				}
			},
			onClose: (_evt, ws) => {
				sessionManager.removeWebSocket(ws);
				console.log("WebSocket disconnected");
			},
		}),
	);

	return { app, websocket };
}
