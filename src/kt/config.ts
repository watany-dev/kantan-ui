/**
 * ページ設定
 *
 * Streamlit の st.set_page_config() に相当する機能
 */

/**
 * ページ設定の型定義
 */
export interface PageConfig {
	/** ページタイトル */
	title?: string;
	/** ファビコン（絵文字またはURL） */
	icon?: string;
	/** レイアウト */
	layout?: "centered" | "wide";
	/** サイドバーの初期状態 */
	initialSidebarState?: "auto" | "expanded" | "collapsed";
	/** メニュー項目 */
	menuItems?: { label: string; url: string }[];
}

let pageConfig: PageConfig | null = null;

/**
 * ページ設定を行う
 *
 * @param config ページ設定
 *
 * @example
 * ```typescript
 * kt.set_page_config({
 *   title: "My App",
 *   icon: "🚀",
 *   layout: "wide",
 *   initialSidebarState: "collapsed",
 * });
 * ```
 */
export function set_page_config(config: PageConfig): void {
	if (pageConfig !== null) {
		console.warn("set_page_config should only be called once");
		return;
	}
	pageConfig = config;
}

/**
 * 現在のページ設定を取得
 */
export function getPageConfig(): PageConfig {
	return pageConfig ?? {};
}

/**
 * ページ設定をリセット（テスト用）
 */
export function resetPageConfig(): void {
	pageConfig = null;
}
