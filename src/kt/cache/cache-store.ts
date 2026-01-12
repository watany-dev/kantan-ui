/**
 * CacheStore - キャッシュストレージクラス
 *
 * Map ベースのキャッシュストレージ
 * TTL と LRU eviction をサポート
 */

import type { CacheEntry, CacheStoreOptions } from "./types.js";

/**
 * キャッシュストア
 * 関数ごとのキャッシュを管理
 */
export class CacheStore<T> {
	private entries: Map<string, CacheEntry<T>> = new Map();
	private readonly defaultTtl?: number;
	private readonly maxEntries: number;

	constructor(options: CacheStoreOptions = {}) {
		this.defaultTtl = options.ttl;
		this.maxEntries = options.max_entries ?? Number.POSITIVE_INFINITY;
	}

	/**
	 * キャッシュから値を取得
	 * TTL が設定されている場合は期限切れをチェック
	 */
	get(key: string): T | undefined {
		const entry = this.entries.get(key);

		if (!entry) {
			return undefined;
		}

		// TTL チェック
		if (this.isExpired(entry)) {
			this.entries.delete(key);
			return undefined;
		}

		// LRU: アクセス時刻を更新
		entry.lastAccessedAt = Date.now();

		return entry.value;
	}

	/**
	 * キャッシュに値を設定
	 */
	set(key: string, value: T, options?: { ttl?: number }): void {
		const now = Date.now();
		const ttl = options?.ttl ?? this.defaultTtl;

		const entry: CacheEntry<T> = {
			value,
			createdAt: now,
			lastAccessedAt: now,
			expiresAt: ttl !== undefined ? now + ttl * 1000 : undefined,
		};

		// 既存のエントリを削除（順序を更新するため）
		this.entries.delete(key);
		this.entries.set(key, entry);

		// max_entries を超えた場合は LRU で削除
		this.evictIfNeeded();
	}

	/**
	 * キャッシュから削除
	 */
	delete(key: string): boolean {
		return this.entries.delete(key);
	}

	/**
	 * 全てのキャッシュをクリア
	 */
	clear(): void {
		this.entries.clear();
	}

	/**
	 * キャッシュのエントリ数
	 */
	get size(): number {
		return this.entries.size;
	}

	/**
	 * キーが存在するかチェック（TTLも考慮）
	 */
	has(key: string): boolean {
		const entry = this.entries.get(key);
		if (!entry) {
			return false;
		}
		if (this.isExpired(entry)) {
			this.entries.delete(key);
			return false;
		}
		return true;
	}

	/**
	 * エントリが期限切れかどうかをチェック
	 */
	private isExpired(entry: CacheEntry<T>): boolean {
		if (entry.expiresAt === undefined) {
			return false;
		}
		return Date.now() > entry.expiresAt;
	}

	/**
	 * max_entries を超えた場合に LRU で古いエントリを削除
	 */
	private evictIfNeeded(): void {
		while (this.entries.size > this.maxEntries) {
			// LRU: 最も古いアクセス時刻のエントリを探す
			let oldestKey: string | undefined;
			let oldestTime = Number.POSITIVE_INFINITY;

			for (const [key, entry] of this.entries) {
				if (entry.lastAccessedAt < oldestTime) {
					oldestTime = entry.lastAccessedAt;
					oldestKey = key;
				}
			}

			if (oldestKey !== undefined) {
				this.entries.delete(oldestKey);
			} else {
				// 念のため無限ループを防ぐ
				break;
			}
		}
	}

	/**
	 * 期限切れのエントリを全て削除
	 * 定期的なクリーンアップに使用
	 */
	pruneExpired(): number {
		let count = 0;
		const now = Date.now();

		for (const [key, entry] of this.entries) {
			if (entry.expiresAt !== undefined && now > entry.expiresAt) {
				this.entries.delete(key);
				count++;
			}
		}

		return count;
	}
}
