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

	// セッションを生成
	createSession(): Session {
		const id = crypto.randomUUID();
		const session: Session = {
			id,
			state: {},
			createdAt: new Date(),
			lastAccessedAt: new Date(),
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
		return new Promise((resolve) => {
			const item: EventQueueItem = {
				widgetId,
				value,
				timestamp: Date.now(),
				resolve,
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
