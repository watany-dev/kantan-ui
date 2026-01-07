import { Hono } from "hono";

/**
 * Node.js HTTP/HTTPS Server型（@hono/node-serverからの依存を避けるためローカル定義）
 * Deno互換性のため、@hono/node-serverを直接インポートしない
 */
type NodeServerType = {
	close: () => void;
	listen: (port: number, hostname?: string, callback?: () => void) => void;
};

import { getCookie, setCookie } from "hono/cookie";
import { html, raw } from "hono/html";
import { logger } from "hono/logger";
import { NONCE, secureHeaders } from "hono/secure-headers";
import { generateClientScript } from "./client";
import { type KantanConfig, resolveConfig } from "./config";
import { diff, toWebSocketPatches } from "./diff";
import { getPageConfig } from "./kt/config";
import { rerun, type Script, type StreamingOptions } from "./runtime";
import { SessionManager, setSessionManager } from "./session";
import { defaultStyles } from "./styles";
import { createErrorMessageJson } from "./utils/error";
import { createWebSocketAdapterAsync } from "./websocket";
import type { Patch } from "./websocket/types";
import { type ClientMessage, isClientMessage, type ServerMessage } from "./websocket/types";

export interface KantanAppOptions extends KantanConfig {
	/** サーバーポート（Bun.serve互換） */
	port?: number;
	/** ホスト名 */
	hostname?: string;
}

export interface KantanApp {
	fetch: (request: Request) => Response | Promise<Response>;
	/** Bun用: Bun.serve() の websocket オプションに渡す */
	websocket: unknown;
	/** Bun.serve互換: ポート番号 */
	port: number | undefined;
	/** Bun.serve互換: ホスト名 */
	hostname: string | undefined;
	/** Node.js用: サーバー起動後に呼び出してWebSocketを有効化 */
	injectWebSocket: ((server: NodeServerType) => void) | undefined;
	shutdown: () => void;
	/** Honoインスタンス（拡張用） */
	app: Hono;
}

export async function createApp(script: Script, options?: KantanAppOptions): Promise<KantanApp> {
	const { port, hostname, ...userConfig } = options ?? {};
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

	// ミドルウェア設定
	app.use("*", logger());
	app.use(
		"*",
		secureHeaders({
			contentSecurityPolicy: {
				defaultSrc: ["'self'"],
				scriptSrc: [NONCE],
				styleSrc: ["'self'", "'unsafe-inline'"],
				connectSrc: ["'self'", "ws:", "wss:"],
			},
		}),
	);

	// ランタイムに応じたWebSocketアダプターを非同期で作成（全ランタイム共通）
	const wsAdapter = await createWebSocketAdapterAsync(app);
	const { upgradeWebSocket } = wsAdapter;

	// ルートページ
	app.get("/", (c) => {
		let sessionId: string;
		let isTemporarySession = false;

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
		} else {
			// scope='tab'の場合、初期レンダリング用に一時セッションを作成
			// WebSocket接続時に実際のセッションが作成される
			sessionId = sessionManager.createSession().id;
			isTemporarySession = true;
		}

		const initialHtml = rerun(script, undefined, sessionId);

		// 一時セッションは初期レンダリング後に削除
		if (isTemporarySession) {
			sessionManager.deleteSession(sessionId);
		}

		// secureHeadersミドルウェアが生成したnonceを取得
		const nonce = c.get("secureHeadersNonce");

		// PageConfig を取得
		const pageConfig = getPageConfig();
		const pageTitle = pageConfig.title ?? "kantan-ui";
		const layoutClass = pageConfig.layout === "wide" ? "kt-layout-wide" : "kt-layout-centered";

		// Honoのhtmlヘルパーを使用（raw()でエスケープを回避）
		return c.html(
			html`<!doctype html>
				<html>
					<head>
						<meta charset="UTF-8" />
						<meta name="viewport" content="width=device-width, initial-scale=1.0" />
						<title>${pageTitle}</title>
						<style>
							${raw(defaultStyles)}
						</style>
					</head>
					<body class="${layoutClass}">
						<div id="app">${raw(initialHtml)}</div>
						<script nonce="${nonce}">
							${raw(clientScript)}
						</script>
					</body>
				</html>`,
		);
	});

	// ダウンロードエンドポイント（Blobストリーミング）
	app.get("/download/:id", (c) => {
		const downloadId = c.req.param("id");
		const download = sessionManager.getDownload(downloadId);

		if (!download) {
			return c.text("Download not found or expired", 404);
		}

		// Web標準 Response + ReadableStream でストリーミング
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(new Uint8Array(download.data));
				controller.close();
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": download.mime,
				"Content-Disposition": `attachment; filename="${encodeURIComponent(download.filename)}"`,
				"Content-Length": download.data.byteLength.toString(),
			},
		});
	});

	// WebSocket エンドポイント
	app.get(
		"/ws",
		upgradeWebSocket((c) => {
			const cookieSessionId =
				config.session.scope === "browser" ? getCookie(c, config.session.sessionKey) : undefined;

			return {
				onOpen: (_evt, ws) => {
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
							ws.send(
								createErrorMessageJson(
									"SESSION_ID_REQUIRED",
									"sessionId is required for event messages.",
								),
							);
							return;
						}

						const session = sessionManager.getSession(eventSessionId);
						if (!session) {
							console.error("Session not found:", eventSessionId);
							ws.send(
								createErrorMessageJson(
									"SESSION_NOT_FOUND",
									"Session not found. Please refresh or reconnect.",
								),
							);
							return;
						}

						// レート制限チェック
						const rateLimitResult = sessionManager.checkRateLimit(session.id);
						if (!rateLimitResult.allowed) {
							ws.send(
								createErrorMessageJson(
									"RATE_LIMITED",
									"Too many requests. Please slow down.",
									rateLimitResult.retryAfter !== undefined
										? { retryAfter: rateLimitResult.retryAfter }
										: undefined,
								),
							);
							return;
						}

						// ボタンの "clicked" イベントは一時的なものなので、セッション状態に保存しない
						// ボタンの判定は context.event.widgetId で行われるため、状態の永続化は不要
						if (data.widgetId && data.value !== undefined && data.value !== "clicked") {
							sessionManager.setState(session.id, data.widgetId, data.value);
						}

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

	return {
		fetch: app.fetch,
		websocket: wsAdapter.websocket,
		port,
		hostname,
		injectWebSocket: wsAdapter.injectWebSocket as ((server: NodeServerType) => void) | undefined,
		shutdown,
		app,
	};
}
