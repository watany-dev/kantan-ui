/**
 * cache_resource - シリアライズ不可なリソースのキャッシュ
 *
 * Streamlit の @st.cache_resource に相当する機能
 * DBコネクション、MLモデル等の重いリソース向け
 * cache_data と異なり、同一インスタンスを返す（コピーしない）
 */

import { generateCacheKeySafe } from "./cache-key.js";
import { CacheStore } from "./cache-store.js";
import type { CachedFunction, CacheResourceOptions } from "./types.js";

/** cache_resource で作成された全てのストアを追跡 */
const cacheResourceStores = new Set<CacheStore<unknown>>();

/** デフォルトの max_entries（リソースは少なめ） */
const DEFAULT_MAX_ENTRIES = 10;

/**
 * cache_resource - リソースキャッシュの高階関数
 *
 * @example
 * ```typescript
 * const getDbConnection = cache_resource(() => {
 *   return new DatabaseConnection(process.env.DB_URL);
 * });
 *
 * const db = getDbConnection();
 * ```
 */
export function cache_resource<TArgs extends unknown[], TReturn>(
	fn: (...args: TArgs) => TReturn,
	options: CacheResourceOptions = {},
): CachedFunction<TArgs, TReturn> {
	const storeOptions = {
		max_entries: options.max_entries ?? DEFAULT_MAX_ENTRIES,
		...(options.ttl !== undefined && { ttl: options.ttl }),
	};
	const store = new CacheStore<TReturn>(storeOptions);

	// グローバルレジストリに登録
	cacheResourceStores.add(store as CacheStore<unknown>);

	const hashFunc = options.hash_func ?? generateCacheKeySafe;
	const validate = options.validate;

	const cached = ((...args: TArgs): TReturn => {
		const key = hashFunc(args);

		// キャッシュヒットチェック
		if (store.has(key)) {
			const cachedValue = store.get(key) as TReturn;

			// validate オプションがある場合は検証
			if (validate) {
				const isValid = validate(cachedValue);
				if (!isValid) {
					// 無効な場合はキャッシュを削除して再生成
					store.delete(key);
				} else {
					// 有効な場合はそのまま返す（コピーしない）
					return cachedValue;
				}
			} else {
				// validate がない場合はそのまま返す
				return cachedValue;
			}
		}

		// 関数を実行して新しいリソースを生成
		const result = fn(...args);

		// キャッシュに保存
		store.set(key, result);

		// コピーせずそのまま返す（同一インスタンス）
		return result;
	}) as CachedFunction<TArgs, TReturn>;

	// clear メソッドを追加
	cached.clear = () => {
		store.clear();
	};

	return cached;
}

/**
 * 全ての cache_resource キャッシュをクリア
 */
cache_resource.clear = (): void => {
	for (const store of cacheResourceStores) {
		store.clear();
	}
};

/**
 * 全ての cache_resource ストアをリセット（テスト用）
 */
export function resetCacheResourceStores(): void {
	for (const store of cacheResourceStores) {
		store.clear();
	}
	cacheResourceStores.clear();
}
