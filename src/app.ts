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
  let ws = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000; // 1秒

  // 接続状態インジケーターを作成
  function createConnectionIndicator() {
    let indicator = document.getElementById("kt-connection-status");
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.id = "kt-connection-status";
      indicator.style.cssText = "position:fixed;top:8px;right:8px;padding:4px 8px;border-radius:4px;font-size:12px;z-index:9999;transition:opacity 0.3s;";
      document.body.appendChild(indicator);
    }
    return indicator;
  }

  function updateConnectionStatus(status) {
    const indicator = createConnectionIndicator();
    switch (status) {
      case "connected":
        indicator.textContent = "● Connected";
        indicator.style.background = "#d4edda";
        indicator.style.color = "#155724";
        // 接続後2秒でフェードアウト
        setTimeout(() => { indicator.style.opacity = "0"; }, 2000);
        break;
      case "connecting":
        indicator.style.opacity = "1";
        indicator.textContent = "◌ Connecting...";
        indicator.style.background = "#fff3cd";
        indicator.style.color = "#856404";
        break;
      case "disconnected":
        indicator.style.opacity = "1";
        indicator.textContent = "○ Disconnected";
        indicator.style.background = "#f8d7da";
        indicator.style.color = "#721c24";
        break;
      case "reconnecting":
        indicator.style.opacity = "1";
        indicator.textContent = "◌ Reconnecting (" + reconnectAttempts + "/" + maxReconnectAttempts + ")...";
        indicator.style.background = "#fff3cd";
        indicator.style.color = "#856404";
        break;
    }
  }

  function connect() {
    updateConnectionStatus("connecting");
    ws = new WebSocket(\`ws://\${location.host}/ws\`);

    ws.onopen = () => {
      console.log("Connected to server");
      reconnectAttempts = 0;
      updateConnectionStatus("connected");
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

      // エラーメッセージの処理
      if (msg.type === "error") {
        console.error("Server error:", msg.error?.code, msg.error?.message);
        if (msg.error?.code === "SESSION_NOT_FOUND") {
          // セッションをクリアして再接続
          localStorage.removeItem("kt-session-id");
          sessionId = null;
          ws.close();
          connect();
        }
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
      updateConnectionStatus("disconnected");
      scheduleReconnect();
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  function scheduleReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      updateConnectionStatus("disconnected");
      return;
    }
    reconnectAttempts++;
    // 指数バックオフ: 1s, 2s, 4s, 8s... 最大30秒
    const delay = Math.min(baseReconnectDelay * Math.pow(2, reconnectAttempts - 1), 30000);
    console.log("Reconnecting in " + delay + "ms (attempt " + reconnectAttempts + ")");
    updateConnectionStatus("reconnecting");
    setTimeout(connect, delay);
  }

  // 初回接続
  connect();

  // イベント送信用のグローバル関数
  window.sendEvent = (widgetId, value) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "event", widgetId, value, sessionId }));
    } else {
      console.warn("WebSocket not connected, event not sent");
    }
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
						// クライアントにエラー通知
						const errorMessage: ServerMessage = {
							type: "error",
							error: {
								code: "SESSION_NOT_FOUND",
								message:
									"Session not found. Please refresh or reconnect.",
							},
						};
						ws.send(JSON.stringify(errorMessage));
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
