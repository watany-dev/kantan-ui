/**
 * Cache API 型定義
 *
 * Streamlit の @st.cache_data / @st.cache_resource に相当するAPIの型定義
 */

/**
 * キャッシュエントリの内部表現
 */
export interface CacheEntry<T> {
	/** キャッシュされた値 */
	value: T;
	/** エントリ作成時刻 (Date.now()) */
	createdAt: number;
	/** 最終アクセス時刻 (LRU用) */
	lastAccessedAt: number;
	/** 有効期限 (TTL設定時) */
	expiresAt?: number | undefined;
}

/**
 * cache_data のオプション
 */
export interface CacheDataOptions {
	/**
	 * キャッシュの有効期限（秒）
	 * @default undefined (無期限)
	 */
	ttl?: number;

	/**
	 * キャッシュの最大エントリ数
	 * 超過時はLRUで古いエントリを削除
	 * @default 100
	 */
	max_entries?: number;

	/**
	 * キャッシュキー生成に使用するカスタムハッシュ関数
	 * @default JSON.stringify ベースのハッシュ
	 */
	hash_func?: (args: unknown[]) => string;

	/**
	 * ローディング中にスピナーを表示
	 * @default false
	 */
	show_spinner?: boolean | string;
}

/**
 * cache_resource のオプション
 * cache_data と同様だが、デフォルト値が異なる
 */
export interface CacheResourceOptions {
	/**
	 * キャッシュの有効期限（秒）
	 * @default undefined (無期限)
	 */
	ttl?: number;

	/**
	 * キャッシュの最大エントリ数
	 * @default 10 (リソースは少なめ)
	 */
	max_entries?: number;

	/**
	 * キャッシュキー生成に使用するカスタムハッシュ関数
	 */
	hash_func?: (args: unknown[]) => string;

	/**
	 * 検証関数: リソースがまだ有効かチェック
	 * falseを返すとキャッシュを破棄して再生成
	 */
	validate?: (resource: unknown) => boolean;
}

/**
 * CacheStore のオプション
 */
export interface CacheStoreOptions {
	/**
	 * デフォルトのTTL（秒）
	 */
	ttl?: number;

	/**
	 * 最大エントリ数
	 */
	max_entries?: number;
}

/**
 * キャッシュされた関数の型
 * 元の関数の型を保持しつつ、clear() メソッドを追加
 */
export type CachedFunction<TArgs extends unknown[], TReturn> = ((...args: TArgs) => TReturn) & {
	/** このキャッシュ関数のキャッシュをクリア */
	clear: () => void;
};

/**
 * cache_data 関数の型シグネチャ
 */
export interface CacheDataFunction {
	<TArgs extends unknown[], TReturn>(
		fn: (...args: TArgs) => TReturn,
		options?: CacheDataOptions,
	): CachedFunction<TArgs, TReturn>;

	/** 全ての cache_data キャッシュをクリア */
	clear: () => void;
}

/**
 * cache_resource 関数の型シグネチャ
 */
export interface CacheResourceFunction {
	<TArgs extends unknown[], TReturn>(
		fn: (...args: TArgs) => TReturn,
		options?: CacheResourceOptions,
	): CachedFunction<TArgs, TReturn>;

	/** 全ての cache_resource キャッシュをクリア */
	clear: () => void;
}
