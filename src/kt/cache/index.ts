/**
 * Cache API エントリポイント
 *
 * Streamlit の @st.cache_data / @st.cache_resource に相当するAPIを提供
 */

import { cache_data, resetCacheDataStores } from "./cache-data.js";
import { cache_resource, resetCacheResourceStores } from "./cache-resource.js";

// Re-export main APIs
export { cache_data, resetCacheDataStores };
export { cache_resource, resetCacheResourceStores };

// Re-export types
export type {
	CacheDataOptions,
	CachedFunction,
	CacheResourceOptions,
	CacheStoreOptions,
} from "./types.js";

/**
 * 全てのキャッシュをクリア
 * cache_data と cache_resource の両方のキャッシュを一括でクリア
 *
 * @example
 * ```typescript
 * import { clear_all_caches } from "kantan-ui";
 *
 * // 全キャッシュをクリア
 * clear_all_caches();
 * ```
 */
export function clear_all_caches(): void {
	cache_data.clear();
	cache_resource.clear();
}
