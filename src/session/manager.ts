import type { WSContext } from "hono/ws";
import { DEFAULT_SESSION_CONFIG } from "../config";
import type { ResolvedSessionConfig, SessionConfig } from "../config/types";
import type { EventProcessResult, EventQueueItem, Session, SessionId, SessionState } from "./types";

// イベント処理コールバックの型
export type EventProcessor = (
	sessionId: SessionId,
	widgetId: string,
	value: unknown,
	signal?: AbortSignal,
) => EventProcessResult;

export class SessionManager {
	private sessions = new Map<SessionId, Session>();
	/**
	 * WebSocket → SessionId のマッピング
	 * Note: WSContextオブジェクトの参照等価性が保証されない可能性があるため、
	 * セッション検索には使用せず、onClose時のクリーンアップ目的でのみ使用。
	 * セッション検索にはクライアントから送信されるsessionIdを使用すること。
	 */
	private wsToSession = new Map<WSContext, SessionId>();
	private sessionToWs = new Map<SessionId, Set<WSContext>>();
	private config: ResolvedSessionConfig;
	private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

	// イベントキュー関連
	private eventQueues = new Map<SessionId, EventQueueItem[]>();
	private processingFlags = new Map<SessionId, boolean>();
	private eventProcessor: EventProcessor | null = null;
	private abortControllers = new Map<SessionId, AbortController>();

	// ping/pong関連
	private wsLastPong = new Map<WSContext, number>();
	private pingIntervalId: ReturnType<typeof setInterval> | null = null;
	private pingInterval = 0;
	private pongTimeout = 0;

	constructor(config: SessionConfig = {}) {
		this.config = {
			...DEFAULT_SESSION_CONFIG,
			...config,
			cookie: {
				...DEFAULT_SESSION_CONFIG.cookie,
				...config.cookie,
			},
		};

		// 定期的なクリーンアップを開始
		this.startCleanupInterval();
	}

	// 設定を取得
	getConfig(): ResolvedSessionConfig {
		return this.config;
	}

	// クリーンアップインターバルを開始
	private startCleanupInterval(): void {
		if (this.cleanupIntervalId) return;

		this.cleanupIntervalId = setInterval(() => {
			const cleaned = this.cleanup();
			if (cleaned > 0) {
				console.log(`Session cleanup: removed ${cleaned} expired session(s)`);
			}
		}, this.config.cleanupInterval);
	}

	// クリーンアップインターバルを停止
	stopCleanupInterval(): void {
		if (this.cleanupIntervalId) {
			clearInterval(this.cleanupIntervalId);
			this.cleanupIntervalId = null;
		}
	}

	// ping/pong接続維持を開始
	startPingInterval(pingInterval: number, pongTimeout: number): void {
		if (this.pingIntervalId || pingInterval <= 0) return;

		this.pingInterval = pingInterval;
		this.pongTimeout = pongTimeout;

		this.pingIntervalId = setInterval(() => {
			this.sendPingToAll();
		}, pingInterval);
	}

	// ping/pong接続維持を停止
	stopPingInterval(): void {
		if (this.pingIntervalId) {
			clearInterval(this.pingIntervalId);
			this.pingIntervalId = null;
		}
	}

	// すべての接続にpingを送信し、タイムアウトした接続を切断
	private sendPingToAll(): void {
		const now = Date.now();
		const pingMessage = JSON.stringify({ type: "ping" });

		for (const [_sessionId, connections] of this.sessionToWs) {
			const deadConnections: WSContext[] = [];

			for (const ws of connections) {
				// タイムアウトチェック
				// lastPong + pingInterval + pongTimeout < now ならタイムアウト
				// これにより、接続開始から pingInterval 後に ping を送信し、
				// さらに pongTimeout 経過しても pong が来なければタイムアウト
				const lastPong = this.wsLastPong.get(ws);
				if (lastPong !== undefined && now - lastPong > this.pingInterval + this.pongTimeout) {
					// タイムアウト - 接続を切断
					deadConnections.push(ws);
					try {
						ws.close();
					} catch (_e) {
						// 既に切断されている場合は無視
					}
					continue;
				}

				// ping送信
				try {
					ws.send(pingMessage);
				} catch (_e) {
					deadConnections.push(ws);
				}
			}

			// 切断された接続を削除
			for (const ws of deadConnections) {
				connections.delete(ws);
				this.wsToSession.delete(ws);
				this.wsLastPong.delete(ws);
			}
		}
	}

	// pong受信時に呼び出す
	handlePong(ws: WSContext): void {
		this.wsLastPong.set(ws, Date.now());
	}

	// WebSocket接続時にlastPongを初期化
	initializePong(ws: WSContext): void {
		this.wsLastPong.set(ws, Date.now());
	}

	// セッションを生成
	createSession(): Session {
		const id = crypto.randomUUID();
		const session: Session = {
			id,
			state: {},
			createdAt: new Date(),
			lastAccessedAt: new Date(),
			lastSeq: 0,
			patchHistory: [],
		};
		this.sessions.set(id, session);
		this.sessionToWs.set(id, new Set());
		return session;
	}

	// セッションを取得
	getSession(id: SessionId): Session | undefined {
		const session = this.sessions.get(id);
		if (session) {
			session.lastAccessedAt = new Date();
		}
		return session;
	}

	// セッションを取得または作成
	getOrCreateSession(id?: SessionId): Session {
		if (id) {
			const existing = this.getSession(id);
			if (existing) return existing;
		}
		return this.createSession();
	}

	// WebSocket とセッションを紐付け
	associateWebSocket(ws: WSContext, sessionId: SessionId): void {
		this.wsToSession.set(ws, sessionId);
		const connections = this.sessionToWs.get(sessionId);
		if (connections) {
			connections.add(ws);
		}
	}

	/**
	 * WebSocket からセッションを取得
	 * @deprecated WSContextの参照等価性が保証されないため、
	 * クライアントから送信されるsessionIdを使用してgetSession()を呼び出すこと。
	 * このメソッドはonClose時のクリーンアップ用途でのみ残している。
	 */
	getSessionByWebSocket(ws: WSContext): Session | undefined {
		const sessionId = this.wsToSession.get(ws);
		if (sessionId) {
			return this.getSession(sessionId);
		}
		return undefined;
	}

	// WebSocket 切断時の処理
	removeWebSocket(ws: WSContext): void {
		const sessionId = this.wsToSession.get(ws);
		if (sessionId) {
			const connections = this.sessionToWs.get(sessionId);
			if (connections) {
				connections.delete(ws);
			}
			this.wsToSession.delete(ws);
		}
	}

	// セッションに紐づく全WebSocket接続を取得
	getConnections(sessionId: SessionId): Set<WSContext> {
		return this.sessionToWs.get(sessionId) ?? new Set();
	}

	// セッションに紐づく全WebSocket接続にメッセージをブロードキャスト
	broadcast(sessionId: SessionId, message: string): void {
		const connections = this.sessionToWs.get(sessionId);
		if (!connections) return;

		const deadConnections: WSContext[] = [];
		for (const ws of connections) {
			try {
				ws.send(message);
			} catch (e) {
				// 送信に失敗した接続は後で削除
				deadConnections.push(ws);
			}
		}

		// 切断されたWebSocketを削除
		for (const ws of deadConnections) {
			connections.delete(ws);
			this.wsToSession.delete(ws);
		}
	}

	// セッションの state を取得
	getState(sessionId: SessionId): SessionState | undefined {
		return this.sessions.get(sessionId)?.state;
	}

	// セッションの state を更新
	setState(sessionId: SessionId, key: string, value: unknown): void {
		const session = this.sessions.get(sessionId);
		if (session) {
			session.state[key] = value;
			session.lastAccessedAt = new Date();
		}
	}

	// パッチ履歴の最大保持数
	private static readonly MAX_PATCH_HISTORY = 100;

	// パッチを履歴に追加し、新しいシーケンス番号を返す
	addPatchToHistory(sessionId: SessionId, patches: unknown[]): number {
		const session = this.sessions.get(sessionId);
		if (!session) return 0;

		session.lastSeq++;
		const entry = {
			seq: session.lastSeq,
			patches,
			timestamp: Date.now(),
		};
		session.patchHistory.push(entry);

		// 古い履歴を削除
		if (session.patchHistory.length > SessionManager.MAX_PATCH_HISTORY) {
			session.patchHistory.shift();
		}

		return session.lastSeq;
	}

	// 欠損したパッチを取得
	getMissedPatches(sessionId: SessionId, lastClientSeq: number): unknown[] | null {
		const session = this.sessions.get(sessionId);
		if (!session) return null;

		// クライアントが最新の場合
		if (lastClientSeq >= session.lastSeq) {
			return [];
		}

		// 差分が大きすぎる場合はフル同期が必要（nullを返す）
		if (session.lastSeq - lastClientSeq > SessionManager.MAX_PATCH_HISTORY) {
			return null;
		}

		// 欠損パッチを収集
		const missedPatches: unknown[] = [];
		for (const entry of session.patchHistory) {
			if (entry.seq > lastClientSeq) {
				missedPatches.push(...entry.patches);
			}
		}

		return missedPatches;
	}

	// 現在のシーケンス番号を取得
	getLastSeq(sessionId: SessionId): number {
		return this.sessions.get(sessionId)?.lastSeq ?? 0;
	}

	// 期限切れセッションをクリーンアップ
	cleanup(): number {
		const now = Date.now();
		let cleaned = 0;
		for (const [id, session] of this.sessions) {
			if (now - session.lastAccessedAt.getTime() > this.config.ttl) {
				this.sessions.delete(id);
				this.sessionToWs.delete(id);
				cleaned++;
			}
		}
		return cleaned;
	}

	// セッション数を取得
	getSessionCount(): number {
		return this.sessions.size;
	}

	// イベント処理コールバックを設定
	setEventProcessor(processor: EventProcessor): void {
		this.eventProcessor = processor;
	}

	// イベントをキューに追加して処理結果を待つ
	queueEvent(sessionId: SessionId, widgetId: string, value: unknown): Promise<EventProcessResult> {
		return new Promise((resolve, reject) => {
			const item: EventQueueItem = {
				widgetId,
				value,
				timestamp: Date.now(),
				resolve,
				reject,
			};

			// キューがなければ作成
			if (!this.eventQueues.has(sessionId)) {
				this.eventQueues.set(sessionId, []);
			}

			// キューに追加
			const queue = this.eventQueues.get(sessionId);
			if (queue) {
				queue.push(item);
			}

			// 処理を開始
			this.processEventQueue(sessionId);
		});
	}

	// 処理中のイベントを中断
	abortCurrentEvent(sessionId: SessionId): void {
		const controller = this.abortControllers.get(sessionId);
		if (controller) {
			controller.abort();
			this.abortControllers.delete(sessionId);
		}
	}

	// 現在のAbortSignalを取得（テスト用）
	getCurrentAbortSignal(sessionId: SessionId): AbortSignal | undefined {
		return this.abortControllers.get(sessionId)?.signal;
	}

	// イベントキューを処理
	private processEventQueue(sessionId: SessionId): void {
		// 既に処理中なら何もしない
		if (this.processingFlags.get(sessionId)) {
			return;
		}

		const queue = this.eventQueues.get(sessionId);
		if (!queue || queue.length === 0) {
			return;
		}

		// 処理中フラグを立てる
		this.processingFlags.set(sessionId, true);

		// キューから取り出して処理
		const item = queue.shift();
		if (!item) {
			this.processingFlags.set(sessionId, false);
			return;
		}

		// AbortControllerを作成
		const controller = new AbortController();
		this.abortControllers.set(sessionId, controller);

		try {
			if (this.eventProcessor) {
				const result = this.eventProcessor(sessionId, item.widgetId, item.value, controller.signal);
				item.resolve(result);
			} else {
				item.resolve({ html: "", patches: [] });
			}
		} catch (error) {
			// エラーが発生した場合はrejectして、次のイベント処理を継続
			item.reject(error instanceof Error ? error : new Error(String(error)));
		} finally {
			// AbortControllerをクリーンアップ
			this.abortControllers.delete(sessionId);

			// 処理中フラグを下ろす
			this.processingFlags.set(sessionId, false);

			// 次のイベントを処理
			if (queue.length > 0) {
				// 同期的に次を処理（イベントループで分離）
				queueMicrotask(() => this.processEventQueue(sessionId));
			}
		}
	}

	// キューの長さを取得（テスト用）
	getQueueLength(sessionId: SessionId): number {
		return this.eventQueues.get(sessionId)?.length ?? 0;
	}

	// 処理中かどうかを取得（テスト用）
	isProcessing(sessionId: SessionId): boolean {
		return this.processingFlags.get(sessionId) ?? false;
	}
}

// グローバルセッションマネージャー
let globalSessionManager: SessionManager | null = null;

export function getSessionManager(): SessionManager {
	if (!globalSessionManager) {
		globalSessionManager = new SessionManager();
	}
	return globalSessionManager;
}

export function setSessionManager(manager: SessionManager): void {
	globalSessionManager = manager;
}

export function resetSessionManager(): void {
	globalSessionManager = null;
}
