/**
 * cache_data - シリアライズ可能なデータのキャッシュ
 *
 * Streamlit の @st.cache_data に相当する機能
 * 同じ引数で呼び出された場合、キャッシュされた結果を返す
 */

import { generateCacheKeySafe } from "./cache-key.js";
import { CacheStore } from "./cache-store.js";
import type { CacheDataOptions, CachedFunction } from "./types.js";

/** cache_data で作成された全てのストアを追跡 */
const cacheDataStores = new Set<CacheStore<unknown>>();

/** デフォルトの max_entries */
const DEFAULT_MAX_ENTRIES = 100;

/**
 * 値をディープコピー
 * cache_data はキャッシュされた値のコピーを返す（意図しない変更を防ぐ）
 */
function copyValue<T>(value: T): T {
	if (value === null || typeof value !== "object") {
		return value;
	}
	return structuredClone(value);
}

/**
 * 同期関数かどうかを判定（戻り値がPromiseかどうか）
 */
function isPromise<T>(value: T | Promise<T>): value is Promise<T> {
	return value !== null && typeof value === "object" && "then" in value;
}

/**
 * cache_data - データキャッシュの高階関数
 *
 * @example
 * ```typescript
 * const fetchUsers = cache_data(async (limit: number) => {
 *   const res = await fetch(`/api/users?limit=${limit}`);
 *   return res.json();
 * }, { ttl: 3600 });
 *
 * const users = await fetchUsers(10);
 * ```
 */
export function cache_data<TArgs extends unknown[], TReturn>(
	fn: (...args: TArgs) => TReturn,
	options: CacheDataOptions = {},
): CachedFunction<TArgs, TReturn> {
	const storeOptions = {
		max_entries: options.max_entries ?? DEFAULT_MAX_ENTRIES,
		...(options.ttl !== undefined && { ttl: options.ttl }),
	};
	const store = new CacheStore<TReturn>(storeOptions);

	// グローバルレジストリに登録
	cacheDataStores.add(store as CacheStore<unknown>);

	const hashFunc = options.hash_func ?? generateCacheKeySafe;

	// Promise キャッシュ（同時呼び出しでの重複防止）
	const pendingPromises = new Map<string, Promise<TReturn>>();

	const cached = ((...args: TArgs): TReturn => {
		const key = hashFunc(args);

		// キャッシュヒットチェック（has()でnullもキャッシュ可能に）
		if (store.has(key)) {
			const cachedValue = store.get(key) as TReturn;
			return copyValue(cachedValue);
		}

		// 同時呼び出し中のPromiseがあればそれを返す
		const pending = pendingPromises.get(key);
		if (pending !== undefined) {
			return pending as TReturn;
		}

		// 関数を実行
		const result = fn(...args);

		// 非同期関数の場合
		if (isPromise(result)) {
			const promise = result
				.then((value) => {
					// 成功時のみキャッシュ
					store.set(key, value as TReturn);
					pendingPromises.delete(key);
					return copyValue(value);
				})
				.catch((error) => {
					// エラー時はキャッシュしない（再試行可能にする）
					pendingPromises.delete(key);
					throw error;
				});

			pendingPromises.set(key, promise as Promise<TReturn>);
			return promise as TReturn;
		}

		// 同期関数の場合
		store.set(key, result);
		return copyValue(result);
	}) as CachedFunction<TArgs, TReturn>;

	// clear メソッドを追加
	cached.clear = () => {
		store.clear();
		pendingPromises.clear();
	};

	return cached;
}

/**
 * 全ての cache_data キャッシュをクリア
 */
cache_data.clear = (): void => {
	for (const store of cacheDataStores) {
		store.clear();
	}
};

/**
 * cache_data のストア数を取得（テスト用）
 */
export function getCacheDataStoreCount(): number {
	return cacheDataStores.size;
}

/**
 * 全ての cache_data ストアをリセット（テスト用）
 */
export function resetCacheDataStores(): void {
	for (const store of cacheDataStores) {
		store.clear();
	}
	cacheDataStores.clear();
}
