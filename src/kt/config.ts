/**
 * ページ設定
 *
 * Streamlit の st.set_page_config() に相当する機能
 */

import { getSessionManager } from "../session/manager";
import { getCurrentSessionId } from "../session/state";

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

/** セッションステートに保存するためのキー */
const PAGE_CONFIG_KEY = "__kt_page_config__";

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
	const sessionId = getCurrentSessionId();
	if (!sessionId) {
		console.warn("set_page_config must be called within a session context");
		return;
	}

	const manager = getSessionManager();
	const state = manager.getState(sessionId);

	if (state && PAGE_CONFIG_KEY in state) {
		console.warn("set_page_config should only be called once");
		return;
	}

	manager.setState(sessionId, PAGE_CONFIG_KEY, config);
}

/**
 * 現在のページ設定を取得
 */
export function getPageConfig(): PageConfig {
	const sessionId = getCurrentSessionId();
	if (!sessionId) {
		return {};
	}

	const state = getSessionManager().getState(sessionId);
	return (state?.[PAGE_CONFIG_KEY] as PageConfig) ?? {};
}

/**
 * ページ設定をリセット（テスト用）
 */
export function resetPageConfig(): void {
	const sessionId = getCurrentSessionId();
	if (!sessionId) {
		return;
	}

	const manager = getSessionManager();
	const state = manager.getState(sessionId);
	if (state && PAGE_CONFIG_KEY in state) {
		delete state[PAGE_CONFIG_KEY];
	}
}
