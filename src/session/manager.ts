import type { WSContext } from "hono/ws";
import type { Session, SessionConfig, SessionId, SessionState } from "./types";

const DEFAULT_TTL = 30 * 60 * 1000; // 30分

export class SessionManager {
	private sessions = new Map<SessionId, Session>();
	private wsToSession = new Map<WSContext, SessionId>();
	private sessionToWs = new Map<SessionId, Set<WSContext>>();
	private config: Required<SessionConfig>;

	constructor(config: SessionConfig = {}) {
		this.config = {
			ttl: config.ttl ?? DEFAULT_TTL,
		};
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

	// WebSocket からセッションを取得
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
