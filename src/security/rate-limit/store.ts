/**
 * レート制限エントリ
 */
export interface RateLimitEntry {
	/** リクエストカウント */
	count: number;
	/** リセット時刻（ミリ秒） */
	resetAt: number;
}

/**
 * レート制限チェック結果
 */
export interface RateLimitCheckResult {
	/** リクエストが許可されるか */
	allowed: boolean;
	/** 残りリクエスト数 */
	remaining: number;
	/** リセット時刻（ミリ秒） */
	resetAt: number;
}

/**
 * インメモリレート制限ストア
 * プロダクションではRedis等に置き換え可能
 */
export class RateLimitStore {
	private store = new Map<string, RateLimitEntry>();
	private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

	constructor(cleanupIntervalMs = 60000) {
		if (cleanupIntervalMs > 0) {
			this.cleanupIntervalId = setInterval(() => {
				this.cleanup();
			}, cleanupIntervalMs);
		}
	}

	/**
	 * リクエストをカウントし、制限チェック
	 */
	check(key: string, windowMs: number, maxRequests: number): RateLimitCheckResult {
		const now = Date.now();
		const entry = this.store.get(key);

		// 新規 or ウィンドウ期限切れ
		if (!entry || now >= entry.resetAt) {
			const resetAt = now + windowMs;
			this.store.set(key, { count: 1, resetAt });
			const allowed = 1 <= maxRequests;
			const remaining = Math.max(0, maxRequests - 1);
			return { allowed, remaining, resetAt };
		}

		// ウィンドウ内
		entry.count++;
		const allowed = entry.count <= maxRequests;
		const remaining = Math.max(0, maxRequests - entry.count);

		return { allowed, remaining, resetAt: entry.resetAt };
	}

	/**
	 * 特定のキーのエントリを取得（テスト用）
	 */
	get(key: string): RateLimitEntry | undefined {
		return this.store.get(key);
	}

	/**
	 * 期限切れエントリをクリーンアップ
	 */
	cleanup(): number {
		const now = Date.now();
		let cleaned = 0;
		for (const [key, entry] of this.store) {
			if (now >= entry.resetAt) {
				this.store.delete(key);
				cleaned++;
			}
		}
		return cleaned;
	}

	/**
	 * ストアサイズを取得
	 */
	size(): number {
		return this.store.size;
	}

	/**
	 * クリーンアップインターバルを停止
	 */
	stop(): void {
		if (this.cleanupIntervalId) {
			clearInterval(this.cleanupIntervalId);
			this.cleanupIntervalId = null;
		}
	}

	/**
	 * ストアをクリア
	 */
	clear(): void {
		this.store.clear();
	}
}
