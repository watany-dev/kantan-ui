import { RateLimitStore } from "./store";

/**
 * WebSocketレート制限オプション
 */
export interface WebSocketRateLimitOptions {
	/** メッセージウィンドウサイズ（ミリ秒）デフォルト: 1秒 */
	windowMs?: number;
	/** ウィンドウ内の最大メッセージ数 デフォルト: 30 */
	maxMessages?: number;
	/** IP単位の最大接続数 デフォルト: 10 */
	maxConnectionsPerIp?: number;
}

/**
 * メッセージレート制限チェック結果
 */
export interface MessageRateLimitResult {
	/** メッセージが許可されるか */
	allowed: boolean;
	/** 残りメッセージ数 */
	remaining: number;
}

/**
 * WebSocketレート制限マネージャー
 */
export class WebSocketRateLimiter {
	private store: RateLimitStore;
	private connectionCount = new Map<string, number>();
	private connectionToIp = new Map<string, string>();
	private options: Required<WebSocketRateLimitOptions>;

	constructor(options: WebSocketRateLimitOptions = {}) {
		this.store = new RateLimitStore(0); // 手動クリーンアップ
		this.options = {
			windowMs: options.windowMs ?? 1000,
			maxMessages: options.maxMessages ?? 30,
			maxConnectionsPerIp: options.maxConnectionsPerIp ?? 10,
		};
	}

	/**
	 * 接続時のチェック
	 * @param connectionId WebSocket接続を識別するID
	 * @param ip クライアントIP
	 * @returns 接続を許可するかどうか
	 */
	onConnect(connectionId: string, ip: string): boolean {
		const count = this.connectionCount.get(ip) ?? 0;

		if (count >= this.options.maxConnectionsPerIp) {
			return false; // 接続拒否
		}

		this.connectionCount.set(ip, count + 1);
		this.connectionToIp.set(connectionId, ip);
		return true;
	}

	/**
	 * 切断時のクリーンアップ
	 * @param connectionId WebSocket接続を識別するID
	 */
	onDisconnect(connectionId: string): void {
		const ip = this.connectionToIp.get(connectionId);
		if (ip) {
			const count = this.connectionCount.get(ip) ?? 1;
			if (count <= 1) {
				this.connectionCount.delete(ip);
			} else {
				this.connectionCount.set(ip, count - 1);
			}
			this.connectionToIp.delete(connectionId);
		}
	}

	/**
	 * メッセージ送信時のレート制限チェック
	 * @param connectionId WebSocket接続を識別するID
	 * @returns メッセージが許可されるか
	 */
	onMessage(connectionId: string): MessageRateLimitResult {
		const ip = this.connectionToIp.get(connectionId) ?? "unknown";
		const key = `ws:${ip}`;

		const result = this.store.check(key, this.options.windowMs, this.options.maxMessages);

		return { allowed: result.allowed, remaining: result.remaining };
	}

	/**
	 * 特定IPの接続数を取得
	 * @param ip クライアントIP
	 */
	getConnectionCount(ip: string): number {
		return this.connectionCount.get(ip) ?? 0;
	}

	/**
	 * 設定を取得
	 */
	getOptions(): Required<WebSocketRateLimitOptions> {
		return { ...this.options };
	}

	/**
	 * リソースをクリーンアップ
	 */
	stop(): void {
		this.store.stop();
		this.connectionCount.clear();
		this.connectionToIp.clear();
	}
}
