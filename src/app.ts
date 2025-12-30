import { Hono } from "hono";
import { type Script, rerun } from "./runtime";
import { getSessionManager } from "./session";
import { createWebSocketHandler, websocket } from "./websocket";
import type { ClientMessage, ServerMessage } from "./websocket/types";

// Generate a random nonce for CSP
function generateNonce(): string {
	const array = new Uint8Array(16);
	crypto.getRandomValues(array);
	return btoa(String.fromCharCode(...array));
}

const clientScript = `
  let sessionId = localStorage.getItem("kt-session-id");
  const ws = new WebSocket(\`ws://\${location.host}/ws\`);

  ws.onopen = () => {
    console.log("Connected to server");
    // 初期化メッセージを送信
    ws.send(JSON.stringify({ type: "init", sessionId }));
  };

  ws.onmessage = (e) => {
    let msg;
    try {
      msg = JSON.parse(e.data);
    } catch (err) {
      console.error("Failed to parse WebSocket message:", err);
      return;
    }

    // セッションID を保存
    if (msg.sessionId) {
      sessionId = msg.sessionId;
      localStorage.setItem("kt-session-id", sessionId);
    }

    if (msg.type === "patch" && msg.patches) {
      for (const patch of msg.patches) {
        if (patch.type === "replaceRoot") {
          // Security: Check for potentially dangerous content
          const html = patch.html;
          if (/<script[\\s\\S]*?>|javascript:/i.test(html)) {
            console.error("Blocked potentially unsafe HTML content");
            continue;
          }
          document.getElementById("app").innerHTML = html;
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

  // イベント委譲: data-kt-event 属性を持つ要素のイベントを処理
  document.getElementById("app").addEventListener("click", (e) => {
    const target = e.target.closest("[data-kt-event='click']");
    if (target && target.id) {
      window.sendEvent(target.id, "clicked");
    }
  });

  document.getElementById("app").addEventListener("input", (e) => {
    const target = e.target;
    if (target.dataset && target.dataset.ktEvent === "input" && target.id) {
      const value = target.dataset.ktType === "number" ? Number(target.value) : target.value;
      window.sendEvent(target.id, value);
    }
  });

  document.getElementById("app").addEventListener("change", (e) => {
    const target = e.target;
    if (target.dataset && target.dataset.ktEvent === "change" && target.id) {
      window.sendEvent(target.id, target.value);
    }
  });
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
		const nonce = generateNonce();

		// Set CSP header to prevent XSS attacks
		c.header(
			"Content-Security-Policy",
			`default-src 'self'; script-src 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:;`,
		);

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
        <script nonce="${nonce}">${clientScript}</script>
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
				let data: ClientMessage;
				try {
					data = JSON.parse(event.data.toString());
				} catch (err) {
					console.error("Failed to parse client message:", err);
					return;
				}

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
					// セッションを取得（sessionIdを直接使用、WSContext比較の問題を回避）
					const session = data.sessionId
						? sessionManager.getSession(data.sessionId)
						: sessionManager.getSessionByWebSocket(ws);
					if (!session) {
						console.error("Session not found for WebSocket");
						return;
					}

					// Widget の値を更新
					if (data.widgetId && data.value !== undefined) {
						sessionManager.setState(session.id, data.widgetId, data.value);
					}

					// rerun を実行
					const widgetId = data.widgetId ?? "";
					const html = rerun(script, { widgetId, value: data.value }, session.id);

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
