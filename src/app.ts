import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { html, raw } from "hono/html";
import { generateClientScript } from "./client";
import { type KantanConfig, resolveConfig } from "./config";
import { diff, toWebSocketPatches } from "./diff";
import { type Script, type StreamingOptions, rerun } from "./runtime";
import { SessionManager, setSessionManager } from "./session";
import { upgradeWebSocket, websocket } from "./websocket";
import type { Patch } from "./websocket/types";
import { type ClientMessage, type ServerMessage, isClientMessage } from "./websocket/types";

/** CSP用のnonce生成 */
function generateNonce(): string {
	const array = new Uint8Array(16);
	crypto.getRandomValues(array);
	return btoa(String.fromCharCode(...array));
}

/** デフォルトスタイル */
const defaultStyles = `
  .kt-button { padding: 8px 16px; cursor: pointer; }
  .kt-slider-container,
  .kt-text-input-container,
  .kt-selectbox-container { margin: 10px 0; }
  .kt-slider-label,
  .kt-text-input-label,
  .kt-selectbox-label { display: block; margin-bottom: 4px; }
  .kt-slider { width: 200px; }
  .kt-text-input { padding: 8px; width: 200px; }
  .kt-selectbox { padding: 8px; }
`;

export function createApp(script: Script, userConfig?: KantanConfig) {
	const config = resolveConfig(userConfig);
	const sessionManager = new SessionManager(config.session, config.security);
	setSessionManager(sessionManager);

	// クライアントスクリプト生成（設定値を注入）
	const clientScript = generateClientScript({
		scope: config.session.scope,
		sessionKey: config.session.sessionKey,
		maxReconnectAttempts: config.client.maxReconnectAttempts,
		baseReconnectDelay: config.client.baseReconnectDelay,
		maxReconnectDelay: config.client.maxReconnectDelay,
	});

	const app = new Hono();

	// ルートページ
	app.get("/", (c) => {
		let sessionId: string | undefined;

		// scope='browser'の場合、Cookieでセッション管理
		if (config.session.scope === "browser") {
			const cookieSessionId = getCookie(c, config.session.sessionKey);

			if (cookieSessionId) {
				const existing = sessionManager.getSession(cookieSessionId);
				sessionId = existing ? existing.id : sessionManager.createSession().id;
			} else {
				sessionId = sessionManager.createSession().id;
			}

			// Cookie設定
			const isSecure =
				config.session.cookie.secure === "auto"
					? c.req.url.startsWith("https")
					: config.session.cookie.secure;

			setCookie(c, config.session.sessionKey, sessionId, {
				maxAge: Math.floor(config.session.ttl / 1000),
				path: config.session.cookie.path,
				httpOnly: config.session.cookie.httpOnly,
				secure: isSecure,
				sameSite: config.session.cookie.sameSite,
			});
		}

		const initialHtml = rerun(script, undefined, sessionId);
		const nonce = generateNonce();

		// CSPヘッダー設定
		c.header(
			"Content-Security-Policy",
			`default-src 'self'; script-src 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:;`,
		);

		// Honoのhtmlヘルパーを使用（raw()でエスケープを回避）
		return c.html(
			html`<!doctype html>
				<html>
					<head>
						<meta charset="UTF-8" />
						<meta name="viewport" content="width=device-width, initial-scale=1.0" />
						<title>kantan-ui</title>
						<style>
							${raw(defaultStyles)}
						</style>
					</head>
					<body>
						<div id="app">${raw(initialHtml)}</div>
						<script nonce="${nonce}">
							${raw(clientScript)}
						</script>
					</body>
				</html>`,
		);
	});

	// WebSocket エンドポイント
	app.get(
		"/ws",
		upgradeWebSocket((c) => {
			const cookieSessionId =
				config.session.scope === "browser" ? getCookie(c, config.session.sessionKey) : undefined;

			return {
				onOpen: (_evt, ws) => {
					console.log("WebSocket connected");
					sessionManager.initializePong(ws);
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

					if (data.type === "pong") {
						sessionManager.handlePong(ws);
						return;
					}

					if (data.type === "init") {
						const requestedSessionId = cookieSessionId ?? data.sessionId;
						const session = sessionManager.getOrCreateSession(requestedSessionId);
						sessionManager.associateWebSocket(ws, session.id);

						// 再接続時の欠損パッチ処理
						if (data.lastSeq !== undefined && data.lastSeq > 0) {
							const missedPatches = sessionManager.getMissedPatches(session.id, data.lastSeq);
							if (missedPatches !== null && missedPatches.length > 0) {
								const message: ServerMessage = {
									type: "patch",
									patches: missedPatches as Patch[],
									seq: sessionManager.getLastSeq(session.id),
									sessionId: config.session.scope === "tab" ? session.id : undefined,
								};
								ws.send(JSON.stringify(message));
								return;
							}
							if (missedPatches !== null && missedPatches.length === 0) {
								return; // 最新状態
							}
						}

						// 初期HTML生成
						const htmlContent = rerun(script, undefined, session.id);
						session.lastHtml = htmlContent;

						const seq = sessionManager.addPatchToHistory(session.id, [
							{ type: "replaceRoot", html: htmlContent },
						]);

						const message: ServerMessage = {
							type: "patch",
							patches: [{ type: "replaceRoot", html: htmlContent }],
							seq,
							sessionId: config.session.scope === "tab" ? session.id : undefined,
						};
						ws.send(JSON.stringify(message));
					} else if (data.type === "event") {
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

						// レート制限チェック
						const rateLimitResult = sessionManager.checkRateLimit(session.id);
						if (!rateLimitResult.allowed) {
							const errorMessage: ServerMessage = {
								type: "error",
								error: {
									code: "RATE_LIMITED",
									message: "Too many requests. Please slow down.",
									...(rateLimitResult.retryAfter !== undefined && {
										retryAfter: rateLimitResult.retryAfter,
									}),
								},
							};
							ws.send(JSON.stringify(errorMessage));
							return;
						}

						// ボタンの "clicked" イベントは一時的なものなので、セッション状態に保存しない
						// ボタンの判定は context.event.widgetId で行われるため、状態の永続化は不要
						if (data.widgetId && data.value !== undefined && data.value !== "clicked") {
							sessionManager.setState(session.id, data.widgetId, data.value);
						}

						// デバッグログ：イベント処理を確認
						console.log("[DEBUG] Event received:", {
							widgetId: data.widgetId,
							value: data.value,
							sessionState: sessionManager.getState(session.id),
						});

						// ストリーミング設定
						const streamingOptions: StreamingOptions | undefined = config.streaming.enabled
							? {
									onFlush: (htmlContent, _itemCount) => {
										const streamMessage: ServerMessage = {
											type: "patch",
											patches: [{ type: "streamAppend", html: htmlContent }],
											partial: true,
										};
										sessionManager.broadcast(session.id, JSON.stringify(streamMessage));
									},
									flushThreshold: config.streaming.flushThreshold,
								}
							: undefined;

						const widgetId = data.widgetId ?? "";
						const newHtml = rerun(
							script,
							{ widgetId, value: data.value },
							session.id,
							undefined,
							streamingOptions,
						);

						// 差分計算
						let patches: Patch[];
						if (session.lastHtml) {
							const diffResult = diff(session.lastHtml, newHtml);
							patches = toWebSocketPatches(diffResult, newHtml);
						} else {
							patches = [{ type: "replaceRoot", html: newHtml }];
						}

						session.lastHtml = newHtml;

						if (patches.length > 0) {
							const seq = sessionManager.addPatchToHistory(session.id, patches);
							const message: ServerMessage = {
								type: "patch",
								patches,
								seq,
							};
							sessionManager.broadcast(session.id, JSON.stringify(message));
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

	// ping/pong接続維持
	if (config.client.pingInterval > 0) {
		sessionManager.startPingInterval(config.client.pingInterval, config.client.pongTimeout);
	}

	const shutdown = () => {
		sessionManager.stopCleanupInterval();
		sessionManager.stopPingInterval();
	};

	return { app, websocket, shutdown };
}
