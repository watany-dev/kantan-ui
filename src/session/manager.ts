import type { WSContext } from "hono/ws";
import {
	DEFAULT_FILE_UPLOAD_RATE_LIMIT_CONFIG,
	DEFAULT_SECURITY_CONFIG,
	DEFAULT_SESSION_CONFIG,
} from "../config";
import type { ResolvedSessionConfig, SecurityConfig, SessionConfig } from "../config/types";
import { MAX_PATCH_HISTORY } from "../constants";
import { isUUID } from "../utils/type-guards";
import type { ChunkUploadStartMessage } from "../websocket/types";
import type { InternalUploadData } from "../widgets/types";
import { FILE_UPLOAD_LIMITS } from "../widgets/types";
import type { Scheduler } from "./scheduler";
import { defaultScheduler } from "./scheduler";
import type {
	DownloadData,
	DownloadId,
	EventProcessResult,
	EventQueueItem,
	Session,
	SessionId,
	SessionState,
	UploadId,
} from "./types";

/** レート制限の状態 */
interface RateLimitState {
	/** 現在のウィンドウでのイベント数 */
	count: number;
	/** ウィンドウの開始時刻（ミリ秒） */
	windowStart: number;
	/** クールダウン終了時刻（ミリ秒、制限中の場合） */
	cooldownUntil: number;
}

/** レート制限結果 */
export interface RateLimitResult {
	allowed: boolean;
	retryAfter?: number; // ミリ秒
}

/** ファイルアップロードレート制限の状態 */
interface FileUploadRateLimitState {
	/** 現在のウィンドウでのアップロード数 */
	uploadCount: number;
	/** 現在のウィンドウでのアップロードバイト数 */
	bytesUploaded: number;
	/** ウィンドウ開始時刻（ミリ秒） */
	windowStart: number;
	/** 現在進行中のアップロード数 */
	concurrentUploads: number;
}

/** ファイルアップロードレート制限結果 */
export interface FileUploadRateLimitResult {
	allowed: boolean;
	reason?: "count_exceeded" | "bytes_exceeded" | "concurrent_exceeded" | "cooldown";
	retryAfter?: number; // ミリ秒
}

/** チャンクアップロードの状態 */
interface ChunkUploadState {
	uploadId: string;
	sessionId: SessionId;
	widgetId: string;
	filename: string;
	mimeType: string;
	totalSize: number;
	totalChunks: number;
	chunkSize: number;
	receivedChunks: Set<number>;
	chunks: Map<number, ArrayBuffer>;
	startedAt: number;
	lastActivityAt: number;
}

/** チャンクアップロード進捗情報 */
export interface ChunkUploadProgress {
	totalChunks: number;
	receivedChunks: number;
	percentage: number;
}

/** チャンクアップロードメタデータ */
export interface ChunkUploadMetadata {
	widgetId: string;
	filename: string;
	mimeType: string;
	totalSize: number;
}

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
	private securityConfig: Required<SecurityConfig>;
	private scheduler: Scheduler;
	private cleanupIntervalId: unknown = null;

	// イベントキュー関連
	private eventQueues = new Map<SessionId, EventQueueItem[]>();
	private processingFlags = new Map<SessionId, boolean>();
	private eventProcessor: EventProcessor | null = null;
	private abortControllers = new Map<SessionId, AbortController>();

	// ping/pong関連
	private wsLastPong = new Map<WSContext, number>();
	private pingIntervalId: unknown = null;
	private pingInterval = 0;
	private pongTimeout = 0;

	// レート制限関連
	private rateLimitStates = new Map<SessionId, RateLimitState>();

	// ファイルアップロードレート制限関連
	private fileUploadRateLimitStates = new Map<SessionId, FileUploadRateLimitState>();
	private static readonly FILE_UPLOAD_WINDOW_MS = 60 * 1000; // 1分間

	// ダウンロードデータ（Blobストリーミング用）
	private downloadData = new Map<DownloadId, DownloadData>();
	private static readonly DOWNLOAD_TTL = 60 * 1000; // 1分間有効

	// アップロードデータ（セッション毎に管理）
	private uploadData = new Map<SessionId, Map<UploadId, InternalUploadData>>();

	// チャンクアップロード関連
	private chunkUploads = new Map<string, ChunkUploadState>();
	private static readonly CHUNK_UPLOAD_TIMEOUT = 5 * 60 * 1000; // 5分間

	// Web標準 TextEncoder（バイトサイズ計算用）
	private static readonly textEncoder = new TextEncoder();

	constructor(
		config: SessionConfig = {},
		securityConfig: SecurityConfig = {},
		scheduler: Scheduler = defaultScheduler,
	) {
		this.scheduler = scheduler;
		this.config = {
			...DEFAULT_SESSION_CONFIG,
			...config,
			cookie: {
				...DEFAULT_SESSION_CONFIG.cookie,
				...config.cookie,
			},
		};
		this.securityConfig = {
			...DEFAULT_SECURITY_CONFIG,
			...securityConfig,
			fileUploadRateLimit: {
				...DEFAULT_FILE_UPLOAD_RATE_LIMIT_CONFIG,
				...securityConfig.fileUploadRateLimit,
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

		this.cleanupIntervalId = this.scheduler.setInterval(() => {
			const cleaned = this.cleanup();
			if (cleaned > 0) {
				console.log(`Session cleanup: removed ${cleaned} expired session(s)`);
			}
		}, this.config.cleanupInterval);
	}

	// クリーンアップインターバルを停止
	stopCleanupInterval(): void {
		if (this.cleanupIntervalId) {
			this.scheduler.clearInterval(this.cleanupIntervalId);
			this.cleanupIntervalId = null;
		}
	}

	// ping/pong接続維持を開始
	startPingInterval(pingInterval: number, pongTimeout: number): void {
		if (this.pingIntervalId || pingInterval <= 0) return;

		this.pingInterval = pingInterval;
		this.pongTimeout = pongTimeout;

		this.pingIntervalId = this.scheduler.setInterval(() => {
			this.sendPingToAll();
		}, pingInterval);
	}

	// ping/pong接続維持を停止
	stopPingInterval(): void {
		if (this.pingIntervalId) {
			this.scheduler.clearInterval(this.pingIntervalId);
			this.pingIntervalId = null;
		}
	}

	// すべての接続にpingを送信し、タイムアウトした接続を切断
	private sendPingToAll(): void {
		const now = Date.now();
		const pingMessage = JSON.stringify({ type: "ping" });
		const timeoutThreshold = this.pingInterval + this.pongTimeout;
		const deadConnections: WSContext[] = [];

		// 全接続を直接イテレート
		for (const [ws, lastPong] of this.wsLastPong) {
			// タイムアウトチェック
			if (now - lastPong > timeoutThreshold) {
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

		// 切断された接続をクリーンアップ
		for (const ws of deadConnections) {
			this.removeWebSocket(ws);
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

	/**
	 * セッションIDの形式を検証
	 * crypto.randomUUID()が生成するUUID v4形式のみを受け入れる
	 */
	isValidSessionId(id: unknown): id is SessionId {
		return isUUID(id);
	}

	// セッションを取得または作成
	getOrCreateSession(id?: SessionId): Session {
		// セッションIDの形式を検証（UUID v4のみ受け入れ）
		if (id && this.isValidSessionId(id)) {
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
		this.wsLastPong.delete(ws);
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
			} catch {
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

	// セッションの state からキーを削除（一度きりのイベント用）
	clearState(sessionId: SessionId, key: string): void {
		const session = this.sessions.get(sessionId);
		if (session && key in session.state) {
			delete session.state[key];
			session.lastAccessedAt = new Date();
		}
	}

	/**
	 * パッチのバイトサイズを計算（Web標準 TextEncoder使用）
	 */
	private getPatchSize(patches: unknown[]): number {
		const json = JSON.stringify(patches);
		return SessionManager.textEncoder.encode(json).length;
	}

	/**
	 * パッチを履歴に追加し、新しいシーケンス番号を返す
	 * @returns シーケンス番号。サイズ超過の場合は現在のシーケンス番号を返す（履歴に保存しない）
	 */
	addPatchToHistory(sessionId: SessionId, patches: unknown[]): number {
		const session = this.sessions.get(sessionId);
		if (!session) return 0;

		// パッチサイズをチェック（Web標準 TextEncoderでバイトサイズを計算）
		const patchSize = this.getPatchSize(patches);
		if (patchSize > this.securityConfig.maxPatchSize) {
			console.warn(
				`Patch size ${patchSize} exceeds limit ${this.securityConfig.maxPatchSize}, skipping history`,
			);
			// 履歴には保存しないがシーケンス番号は進める
			session.lastSeq++;
			return session.lastSeq;
		}

		session.lastSeq++;
		const entry = {
			seq: session.lastSeq,
			patches,
			timestamp: Date.now(),
		};
		session.patchHistory.push(entry);

		// 古い履歴を削除
		if (session.patchHistory.length > MAX_PATCH_HISTORY) {
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
		if (session.lastSeq - lastClientSeq > MAX_PATCH_HISTORY) {
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

	// セッションを削除
	deleteSession(id: SessionId): boolean {
		const deleted = this.sessions.delete(id);
		this.sessionToWs.delete(id);
		this.eventQueues.delete(id);
		this.processingFlags.delete(id);
		this.rateLimitStates.delete(id);
		this.fileUploadRateLimitStates.delete(id);
		this.abortControllers.delete(id);
		this.uploadData.delete(id); // アップロードデータも削除
		return deleted;
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

	/**
	 * 現在のAbortSignalを取得
	 * @internal テスト用
	 */
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

	/**
	 * キューの長さを取得
	 * @internal テスト用
	 */
	getQueueLength(sessionId: SessionId): number {
		return this.eventQueues.get(sessionId)?.length ?? 0;
	}

	/**
	 * 処理中かどうかを取得
	 * @internal テスト用
	 */
	isProcessing(sessionId: SessionId): boolean {
		return this.processingFlags.get(sessionId) ?? false;
	}

	/**
	 * レート制限をチェック
	 * スライディングウィンドウ方式で1秒あたりのイベント数を制限
	 */
	checkRateLimit(sessionId: SessionId): RateLimitResult {
		const now = Date.now();
		let state = this.rateLimitStates.get(sessionId);

		if (!state) {
			state = { count: 0, windowStart: now, cooldownUntil: 0 };
			this.rateLimitStates.set(sessionId, state);
		}

		// クールダウン中かチェック
		if (state.cooldownUntil > now) {
			return {
				allowed: false,
				retryAfter: state.cooldownUntil - now,
			};
		}

		// ウィンドウをリセット（1秒経過した場合）
		if (now - state.windowStart >= 1000) {
			state.count = 0;
			state.windowStart = now;
		}

		// カウントをインクリメント
		state.count++;

		// 制限超過チェック
		if (state.count > this.securityConfig.maxEventsPerSecond) {
			state.cooldownUntil = now + this.securityConfig.rateLimitCooldown;
			return {
				allowed: false,
				retryAfter: this.securityConfig.rateLimitCooldown,
			};
		}

		return { allowed: true };
	}

	/**
	 * レート制限状態をリセット
	 * @internal テスト用
	 */
	resetRateLimit(sessionId: SessionId): void {
		this.rateLimitStates.delete(sessionId);
	}

	/**
	 * ファイルアップロードレート制限の状態を取得または作成
	 */
	private getOrCreateFileUploadRateLimitState(sessionId: SessionId): FileUploadRateLimitState {
		let state = this.fileUploadRateLimitStates.get(sessionId);
		const now = Date.now();

		if (!state) {
			state = {
				uploadCount: 0,
				bytesUploaded: 0,
				windowStart: now,
				concurrentUploads: 0,
			};
			this.fileUploadRateLimitStates.set(sessionId, state);
		} else if (now - state.windowStart >= SessionManager.FILE_UPLOAD_WINDOW_MS) {
			// ウィンドウがリセットされた場合
			state.uploadCount = 0;
			state.bytesUploaded = 0;
			state.windowStart = now;
		}

		return state;
	}

	/**
	 * ファイルアップロードのレート制限をチェック
	 */
	checkFileUploadRateLimit(sessionId: SessionId, fileSize: number): FileUploadRateLimitResult {
		const config = this.securityConfig.fileUploadRateLimit;
		const maxConcurrent =
			config.maxConcurrentUploads ?? DEFAULT_FILE_UPLOAD_RATE_LIMIT_CONFIG.maxConcurrentUploads;
		const maxUploads =
			config.maxUploadsPerMinute ?? DEFAULT_FILE_UPLOAD_RATE_LIMIT_CONFIG.maxUploadsPerMinute;
		const maxBytes =
			config.maxBytesPerMinute ?? DEFAULT_FILE_UPLOAD_RATE_LIMIT_CONFIG.maxBytesPerMinute;
		const cooldown =
			config.uploadRateLimitCooldown ??
			DEFAULT_FILE_UPLOAD_RATE_LIMIT_CONFIG.uploadRateLimitCooldown;

		const state = this.getOrCreateFileUploadRateLimitState(sessionId);
		const now = Date.now();
		const windowRemaining = SessionManager.FILE_UPLOAD_WINDOW_MS - (now - state.windowStart);

		// 同時アップロード数チェック
		if (state.concurrentUploads >= maxConcurrent) {
			return {
				allowed: false,
				reason: "concurrent_exceeded",
				retryAfter: cooldown,
			};
		}

		// アップロード数チェック
		if (state.uploadCount >= maxUploads) {
			return {
				allowed: false,
				reason: "count_exceeded",
				retryAfter: Math.max(windowRemaining, 0),
			};
		}

		// バイト数チェック（現在のアップロード済みバイト + 新しいファイルサイズ）
		if (state.bytesUploaded + fileSize > maxBytes) {
			return {
				allowed: false,
				reason: "bytes_exceeded",
				retryAfter: Math.max(windowRemaining, 0),
			};
		}

		return { allowed: true };
	}

	/**
	 * 同時アップロード数をインクリメント
	 */
	incrementConcurrentUploads(sessionId: SessionId): void {
		const state = this.getOrCreateFileUploadRateLimitState(sessionId);
		state.concurrentUploads++;
	}

	/**
	 * 同時アップロード数をデクリメント
	 */
	decrementConcurrentUploads(sessionId: SessionId): void {
		const state = this.fileUploadRateLimitStates.get(sessionId);
		if (state && state.concurrentUploads > 0) {
			state.concurrentUploads--;
		}
	}

	/**
	 * 同時アップロード数を取得
	 */
	getConcurrentUploads(sessionId: SessionId): number {
		const state = this.fileUploadRateLimitStates.get(sessionId);
		return state?.concurrentUploads ?? 0;
	}

	/**
	 * ファイルアップロード完了を記録
	 */
	recordFileUploadCompletion(sessionId: SessionId, fileSize: number): void {
		const state = this.getOrCreateFileUploadRateLimitState(sessionId);
		state.uploadCount++;
		state.bytesUploaded += fileSize;
	}

	/**
	 * ファイルアップロードレート制限をリセット
	 */
	resetFileUploadRateLimit(sessionId: SessionId): void {
		this.fileUploadRateLimitStates.delete(sessionId);
	}

	/**
	 * セキュリティ設定を取得
	 */
	getSecurityConfig(): Required<SecurityConfig> {
		return this.securityConfig;
	}

	/**
	 * ダウンロードデータを登録し、ダウンロードIDを返す
	 * Web標準 crypto.randomUUID() を使用
	 */
	registerDownload(data: ArrayBuffer, filename: string, mime: string): DownloadId {
		const id = crypto.randomUUID();
		this.downloadData.set(id, {
			data,
			filename,
			mime,
			createdAt: Date.now(),
		});
		// 古いダウンロードデータをクリーンアップ
		this.cleanupDownloads();
		return id;
	}

	/**
	 * ダウンロードデータを取得
	 * 取得後は自動削除（ワンタイムダウンロード）
	 */
	getDownload(id: DownloadId): DownloadData | undefined {
		const data = this.downloadData.get(id);
		if (data) {
			this.downloadData.delete(id);
		}
		return data;
	}

	/**
	 * 期限切れのダウンロードデータをクリーンアップ
	 */
	private cleanupDownloads(): void {
		const now = Date.now();
		for (const [id, data] of this.downloadData) {
			if (now - data.createdAt > SessionManager.DOWNLOAD_TTL) {
				this.downloadData.delete(id);
			}
		}
	}

	// ============================================================================
	// Upload Management
	// ============================================================================

	/**
	 * アップロードデータを登録し、アップロードIDを返す
	 * @returns アップロードID。セッションが無効またはファイル数制限超過の場合はnull
	 */
	registerUpload(
		sessionId: SessionId,
		data: ArrayBuffer,
		filename: string,
		mime: string,
	): UploadId | null {
		// セッション存在確認
		const session = this.sessions.get(sessionId);
		if (!session) {
			return null;
		}

		// セッション毎のアップロードマップを取得または作成
		let sessionUploads = this.uploadData.get(sessionId);
		if (!sessionUploads) {
			sessionUploads = new Map();
			this.uploadData.set(sessionId, sessionUploads);
		}

		// ファイル数制限チェック
		if (sessionUploads.size >= FILE_UPLOAD_LIMITS.MAX_FILES_PER_SESSION) {
			return null;
		}

		// アップロードID生成
		const uploadId = crypto.randomUUID();

		// アップロードデータを保存
		const uploadData: InternalUploadData = {
			id: uploadId,
			originalName: filename,
			verifiedMime: mime,
			data: data,
			size: data.byteLength,
			uploadedAt: Date.now(),
		};

		sessionUploads.set(uploadId, uploadData);

		return uploadId;
	}

	/**
	 * アップロードデータを取得
	 * ダウンロードと異なり、取得後も削除されない
	 */
	getUpload(sessionId: SessionId, uploadId: UploadId): InternalUploadData | null {
		const sessionUploads = this.uploadData.get(sessionId);
		if (!sessionUploads) {
			return null;
		}
		return sessionUploads.get(uploadId) ?? null;
	}

	/**
	 * アップロードデータを削除
	 * @returns 削除成功した場合true
	 */
	removeUpload(sessionId: SessionId, uploadId: UploadId): boolean {
		const sessionUploads = this.uploadData.get(sessionId);
		if (!sessionUploads) {
			return false;
		}
		return sessionUploads.delete(uploadId);
	}

	/**
	 * セッションのアップロード数を取得
	 */
	getUploadCount(sessionId: SessionId): number {
		return this.uploadData.get(sessionId)?.size ?? 0;
	}

	/**
	 * セッションの全アップロードを取得
	 */
	getSessionUploads(sessionId: SessionId): InternalUploadData[] {
		const sessionUploads = this.uploadData.get(sessionId);
		if (!sessionUploads) {
			return [];
		}
		return Array.from(sessionUploads.values());
	}

	/**
	 * 期限切れのアップロードをクリーンアップ
	 */
	cleanupExpiredUploads(): number {
		const now = Date.now();
		let cleaned = 0;

		for (const [sessionId, uploads] of this.uploadData) {
			for (const [uploadId, data] of uploads) {
				if (now - data.uploadedAt > FILE_UPLOAD_LIMITS.UPLOAD_TTL_MS) {
					uploads.delete(uploadId);
					cleaned++;
				}
			}
			// 空のセッションマップは削除
			if (uploads.size === 0) {
				this.uploadData.delete(sessionId);
			}
		}

		return cleaned;
	}

	// ============================================================================
	// Chunk Upload Management
	// ============================================================================

	/**
	 * チャンクアップロードを開始
	 * @returns uploadId。セッションが無効または重複uploadIdの場合はnull
	 */
	startChunkUpload(sessionId: SessionId, message: ChunkUploadStartMessage): string | null {
		// セッション存在確認
		const session = this.sessions.get(sessionId);
		if (!session) {
			return null;
		}

		// 重複uploadIdチェック
		if (this.chunkUploads.has(message.uploadId)) {
			return null;
		}

		const now = Date.now();
		const state: ChunkUploadState = {
			uploadId: message.uploadId,
			sessionId,
			widgetId: message.widgetId,
			filename: message.filename,
			mimeType: message.mimeType,
			totalSize: message.totalSize,
			totalChunks: message.totalChunks,
			chunkSize: message.chunkSize,
			receivedChunks: new Set(),
			chunks: new Map(),
			startedAt: now,
			lastActivityAt: now,
		};

		this.chunkUploads.set(message.uploadId, state);
		return message.uploadId;
	}

	/**
	 * チャンクデータを受信
	 * @returns 受信成功の場合true。uploadIdが存在しない、重複チャンク、または範囲外の場合false
	 */
	receiveChunk(uploadId: string, chunkIndex: number, base64Data: string): boolean {
		const state = this.chunkUploads.get(uploadId);
		if (!state) {
			return false;
		}

		// チャンクインデックスの範囲チェック
		if (chunkIndex < 0 || chunkIndex >= state.totalChunks) {
			return false;
		}

		// 重複チャンクチェック（冪等性のため、成功ではなく失敗を返す）
		if (state.receivedChunks.has(chunkIndex)) {
			return false;
		}

		// Base64デコード
		try {
			const binaryString = atob(base64Data);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			state.chunks.set(chunkIndex, bytes.buffer);
			state.receivedChunks.add(chunkIndex);
			state.lastActivityAt = Date.now();
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * チャンクアップロードを完了し、結合されたデータを返す
	 * @returns 結合されたArrayBuffer。全チャンクが揃っていない場合やuploadIdが存在しない場合はnull
	 */
	completeChunkUpload(uploadId: string): ArrayBuffer | null {
		const state = this.chunkUploads.get(uploadId);
		if (!state) {
			return null;
		}

		// 全チャンクが揃っているか確認
		if (state.receivedChunks.size !== state.totalChunks) {
			return null;
		}

		// チャンクを順番に結合
		const totalLength = Array.from(state.chunks.values()).reduce(
			(sum, chunk) => sum + chunk.byteLength,
			0,
		);
		const result = new Uint8Array(totalLength);
		let offset = 0;

		for (let i = 0; i < state.totalChunks; i++) {
			const chunk = state.chunks.get(i);
			if (!chunk) {
				return null;
			}
			result.set(new Uint8Array(chunk), offset);
			offset += chunk.byteLength;
		}

		// 状態をクリーンアップ
		this.chunkUploads.delete(uploadId);

		return result.buffer;
	}

	/**
	 * チャンクアップロードの進捗を取得
	 */
	getChunkUploadProgress(uploadId: string): ChunkUploadProgress | null {
		const state = this.chunkUploads.get(uploadId);
		if (!state) {
			return null;
		}

		return {
			totalChunks: state.totalChunks,
			receivedChunks: state.receivedChunks.size,
			percentage: Math.floor((state.receivedChunks.size / state.totalChunks) * 100),
		};
	}

	/**
	 * チャンクアップロードのメタデータを取得
	 */
	getChunkUploadMetadata(uploadId: string): ChunkUploadMetadata | null {
		const state = this.chunkUploads.get(uploadId);
		if (!state) {
			return null;
		}

		return {
			widgetId: state.widgetId,
			filename: state.filename,
			mimeType: state.mimeType,
			totalSize: state.totalSize,
		};
	}

	/**
	 * チャンクアップロードをキャンセル
	 * @returns キャンセル成功の場合true
	 */
	cancelChunkUpload(uploadId: string): boolean {
		return this.chunkUploads.delete(uploadId);
	}

	/**
	 * 期限切れのチャンクアップロードをクリーンアップ
	 */
	cleanupExpiredChunkUploads(): number {
		const now = Date.now();
		let cleaned = 0;

		for (const [uploadId, state] of this.chunkUploads) {
			if (now - state.lastActivityAt > SessionManager.CHUNK_UPLOAD_TIMEOUT) {
				this.chunkUploads.delete(uploadId);
				cleaned++;
			}
		}

		return cleaned;
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
