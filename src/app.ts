import { Hono } from "hono";
import { type KantanConfig, type ResolvedKantanConfig, resolveConfig } from "./config";
import { diff, toWebSocketPatches } from "./diff";
import { type Script, rerun } from "./runtime";
import {
	SessionManager,
	buildSetCookieHeader,
	parseSessionCookie,
	setSessionManager,
} from "./session";
import { upgradeWebSocket, websocket } from "./websocket";
import type { Patch } from "./websocket/types";
import { type ClientMessage, type ServerMessage, isClientMessage } from "./websocket/types";

// Generate a random nonce for CSP
function generateNonce(): string {
	const array = new Uint8Array(16);
	crypto.getRandomValues(array);
	return btoa(String.fromCharCode(...array));
}

// クライアントスクリプトを生成（設定値を注入）
function generateClientScript(config: ResolvedKantanConfig): string {
	const isBrowserScope = config.session.scope === "browser";

	return `
  ${isBrowserScope ? "// scope='browser': セッションはCookieで管理（HttpOnly）" : `let sessionId = localStorage.getItem("${config.session.sessionKey}");`}
  let ws = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = ${config.client.maxReconnectAttempts};
  const baseReconnectDelay = ${config.client.baseReconnectDelay};
  const maxReconnectDelay = ${config.client.maxReconnectDelay};
  ${isBrowserScope ? "" : `const sessionKey = "${config.session.sessionKey}";`}

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
      ${isBrowserScope ? `ws.send(JSON.stringify({ type: "init" }));` : `ws.send(JSON.stringify({ type: "init", sessionId }));`}
    };

    // フォーカス状態を保存（スクロール位置含む）
    function saveFocusState() {
      const state = {
        id: null,
        selectionStart: null,
        selectionEnd: null,
        scrollX: window.scrollX,
        scrollY: window.scrollY
      };
      const active = document.activeElement;
      if (!active || active === document.body) {
        return state;
      }
      state.id = active.id;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
        try {
          state.selectionStart = active.selectionStart;
          state.selectionEnd = active.selectionEnd;
        } catch (e) { /* 一部のinput typeでは取得不可 */ }
      }
      return state;
    }

    // フォーカス状態を復元
    function restoreFocusState(state, retryCount) {
      if (!state) return;
      // スクロール位置を復元
      if (state.scrollX !== undefined && state.scrollY !== undefined) {
        window.scrollTo(state.scrollX, state.scrollY);
      }
      // フォーカスを復元
      if (!state.id) return;
      const el = document.getElementById(state.id);
      if (!el) {
        // 要素がまだ存在しない場合、短い遅延後にリトライ
        if (retryCount < 3) {
          setTimeout(() => restoreFocusState(state, retryCount + 1), 10);
        }
        return;
      }
      el.focus();
      if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
          && state.selectionStart !== null) {
        try {
          el.setSelectionRange(state.selectionStart, state.selectionEnd);
        } catch (e) { /* 一部のinput typeでは設定不可 */ }
      }
    }

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
          ${
						isBrowserScope
							? `// scope='browser': Cookieはサーバー側で管理
          ws.close();
          // ページリロードでCookieを再設定
          location.reload();`
							: `localStorage.removeItem(sessionKey);
          sessionId = null;
          ws.close();
          connect();`
					}
        }
        return;
      }

      ${
				isBrowserScope
					? `// scope='browser': セッションIDはCookieで管理（クライアントでは保存しない）`
					: `// セッションID を保存
      if (msg.sessionId) {
        sessionId = msg.sessionId;
        localStorage.setItem(sessionKey, sessionId);
      }`
			}

      if (msg.type === "patch" && msg.patches) {
        const focusState = saveFocusState();
        for (const patch of msg.patches) {
          applyPatch(patch);
        }
        // 同期的に復元を試みる
        restoreFocusState(focusState, 0);
        // バックアップとしてrAFでも復元を試みる
        requestAnimationFrame(() => restoreFocusState(focusState, 0));
      }
    };

    // Security check for HTML content
    function isUnsafeHtml(html) {
      return /<script[\\s\\S]*?>|javascript:|\\s+on\\w+\\s*=/i.test(html);
    }

    // Apply a single patch to the DOM
    function applyPatch(patch) {
      switch (patch.type) {
        case "replaceRoot": {
          if (isUnsafeHtml(patch.html)) {
            console.error("Blocked potentially unsafe HTML content");
            return;
          }
          document.getElementById("app").innerHTML = patch.html;
          break;
        }

        case "replaceNode": {
          if (isUnsafeHtml(patch.html)) {
            console.error("Blocked potentially unsafe HTML content");
            return;
          }
          const el = document.getElementById(patch.id);
          if (el) {
            const temp = document.createElement("div");
            temp.innerHTML = patch.html;
            const newEl = temp.firstElementChild || temp.firstChild;
            if (newEl) {
              el.replaceWith(newEl);
            }
          }
          break;
        }

        case "removeNode": {
          const el = document.getElementById(patch.id);
          if (el) {
            el.remove();
          }
          break;
        }

        case "insertNode": {
          if (isUnsafeHtml(patch.html)) {
            console.error("Blocked potentially unsafe HTML content");
            return;
          }
          const parent = patch.parentId === "__root__"
            ? document.getElementById("app")
            : document.getElementById(patch.parentId);
          if (parent) {
            const temp = document.createElement("div");
            temp.innerHTML = patch.html;
            const newEl = temp.firstElementChild || temp.firstChild;
            if (newEl) {
              if (patch.index >= 0 && patch.index < parent.children.length) {
                parent.insertBefore(newEl, parent.children[patch.index]);
              } else {
                parent.appendChild(newEl);
              }
            }
          }
          break;
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
    // 指数バックオフ: 1s, 2s, 4s, 8s... 最大遅延まで
    const delay = Math.min(baseReconnectDelay * Math.pow(2, reconnectAttempts - 1), maxReconnectDelay);
    console.log("Reconnecting in " + delay + "ms (attempt " + reconnectAttempts + ")");
    updateConnectionStatus("reconnecting");
    setTimeout(connect, delay);
  }

  // 初回接続
  connect();

  // イベント送信用のグローバル関数
  window.sendEvent = (widgetId, value) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ${isBrowserScope ? `ws.send(JSON.stringify({ type: "event", widgetId, value }));` : `ws.send(JSON.stringify({ type: "event", widgetId, value, sessionId }));`}
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
}

const defaultStyles = `
  .kt-button { padding: 8px 16px; cursor: pointer; }

  /* 共通コンテナスタイル */
  .kt-slider-container,
  .kt-text-input-container,
  .kt-selectbox-container {
    margin: 10px 0;
  }

  /* 共通ラベルスタイル */
  .kt-slider-label,
  .kt-text-input-label,
  .kt-selectbox-label {
    display: block;
    margin-bottom: 4px;
  }

  /* 個別スタイル */
  .kt-slider { width: 200px; }
  .kt-text-input { padding: 8px; width: 200px; }
  .kt-selectbox { padding: 8px; }
`;

export function createApp(script: Script, userConfig?: KantanConfig) {
	const config = resolveConfig(userConfig);
	const sessionManager = new SessionManager(config.session);
	setSessionManager(sessionManager);
	const clientScript = generateClientScript(config);
	const app = new Hono();

	// ルートページ（HTMLを返す）
	app.get("/", (c) => {
		let sessionId: string | undefined;

		// scope='browser'の場合、Cookieでセッション管理
		if (config.session.scope === "browser") {
			const cookieHeader = c.req.header("cookie");
			const cookieSessionId = parseSessionCookie(cookieHeader, config.session.sessionKey);

			if (cookieSessionId) {
				const existing = sessionManager.getSession(cookieSessionId);
				if (existing) {
					sessionId = existing.id;
				} else {
					// セッション期限切れ → 新規作成
					const session = sessionManager.createSession();
					sessionId = session.id;
				}
			} else {
				// Cookie なし → 新規作成
				const session = sessionManager.createSession();
				sessionId = session.id;
			}

			// Cookie設定（新規または更新）
			const setCookieHeader = buildSetCookieHeader(
				config.session.sessionKey,
				sessionId,
				config.session.cookie,
				Math.floor(config.session.ttl / 1000),
				c.req.url,
			);
			c.header("Set-Cookie", setCookieHeader);
		}

		// 初期表示はセッションなしで rerun（scope='tab'の場合）
		// scope='browser'の場合はセッションIDを渡す
		const initialHtml = rerun(script, undefined, sessionId);
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
		upgradeWebSocket((c) => {
			// scope='browser'の場合、Cookieからセッション取得
			const cookieSessionId =
				config.session.scope === "browser"
					? parseSessionCookie(c.req.header("cookie"), config.session.sessionKey)
					: undefined;

			return {
				onOpen: (_evt, _ws) => {
					console.log("WebSocket connected");
				},
				onMessage: (event, ws) => {
					let parsed: unknown;
					try {
						parsed = JSON.parse(event.data.toString());
					} catch (err) {
						console.error("Failed to parse client message:", err);
						return;
					}

					if (!isClientMessage(parsed)) {
						console.error("Invalid client message format");
						return;
					}
					const data: ClientMessage = parsed;

					if (data.type === "init") {
						// 優先順位: Cookie (browser) > メッセージ (tab)
						const requestedSessionId = cookieSessionId ?? data.sessionId;
						const session = sessionManager.getOrCreateSession(requestedSessionId);
						sessionManager.associateWebSocket(ws, session.id);

						// 初期HTMLを生成して保存
						const html = rerun(script, undefined, session.id);
						session.lastHtml = html;

						// scope='tab'の場合のみsessionIdをクライアントに返す
						const message: ServerMessage = {
							type: "patch",
							patches: [{ type: "replaceRoot", html }],
							sessionId: config.session.scope === "tab" ? session.id : undefined,
						};
						ws.send(JSON.stringify(message));
					} else if (data.type === "event") {
						// セッションをsessionIdで取得
						// scope='browser': Cookieから取得したID、scope='tab': メッセージから取得したID
						const eventSessionId = cookieSessionId ?? data.sessionId;
						if (!eventSessionId) {
							console.error("Event received without sessionId");
							const errorMessage: ServerMessage = {
								type: "error",
								error: {
									code: "SESSION_ID_REQUIRED",
									message: "sessionId is required for event messages.",
								},
							};
							ws.send(JSON.stringify(errorMessage));
							return;
						}
						const session = sessionManager.getSession(eventSessionId);
						if (!session) {
							console.error("Session not found:", eventSessionId);
							const errorMessage: ServerMessage = {
								type: "error",
								error: {
									code: "SESSION_NOT_FOUND",
									message: "Session not found. Please refresh or reconnect.",
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
						const newHtml = rerun(script, { widgetId, value: data.value }, session.id);

						// 差分を計算
						// diff()は要素IDに基づいて差分を検出する
						// IDなし要素が多い場合はPATCH_THRESHOLDを超えてreplaceRootにフォールバック
						let patches: Patch[];
						if (session.lastHtml) {
							const diffResult = diff(session.lastHtml, newHtml);
							patches = toWebSocketPatches(diffResult, newHtml);
						} else {
							patches = [{ type: "replaceRoot", html: newHtml }];
						}

						// HTML履歴を更新
						session.lastHtml = newHtml;

						// パッチを送信（変更がある場合のみ）
						if (patches.length > 0) {
							const message: ServerMessage = {
								type: "patch",
								patches,
							};
							ws.send(JSON.stringify(message));
						}
					}
				},
				onClose: (_evt, ws) => {
					sessionManager.removeWebSocket(ws);
					console.log("WebSocket disconnected");
				},
			};
		}),
	);

	const shutdown = () => {
		sessionManager.stopCleanupInterval();
	};

	return { app, websocket, shutdown };
}
