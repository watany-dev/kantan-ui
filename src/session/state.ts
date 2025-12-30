import { getSessionManager } from "./manager";
import type { SessionId, SessionState } from "./types";

// 現在のセッションID（rerun中に設定）
let currentSessionId: SessionId | null = null;

export function setCurrentSessionId(id: SessionId | null): void {
	currentSessionId = id;
}

export function getCurrentSessionId(): SessionId | null {
	return currentSessionId;
}

// session_state オブジェクト（Proxy で実装）
export function createSessionState(): SessionState {
	return new Proxy({} as SessionState, {
		get(_target, prop: string) {
			if (!currentSessionId) {
				return undefined;
			}
			const state = getSessionManager().getState(currentSessionId);
			return state?.[prop];
		},
		set(_target, prop: string, value: unknown) {
			if (!currentSessionId) {
				console.warn("session_state への書き込みは rerun 中のみ有効です");
				return true;
			}
			getSessionManager().setState(currentSessionId, prop, value);
			return true;
		},
		has(_target, prop: string) {
			if (!currentSessionId) return false;
			const state = getSessionManager().getState(currentSessionId);
			return state ? prop in state : false;
		},
		ownKeys() {
			if (!currentSessionId) return [];
			const state = getSessionManager().getState(currentSessionId);
			return state ? Object.keys(state) : [];
		},
		getOwnPropertyDescriptor(_target, prop: string) {
			if (!currentSessionId) return undefined;
			const state = getSessionManager().getState(currentSessionId);
			if (state && prop in state) {
				return {
					enumerable: true,
					configurable: true,
					value: state[prop],
				};
			}
			return undefined;
		},
	});
}

/**
 * 型安全なセッションステートを作成
 *
 * @example
 * ```typescript
 * interface AppState {
 *   counter: number;
 *   name: string;
 * }
 *
 * const state = createTypedSessionState<AppState>({
 *   counter: 0,
 *   name: "World"
 * });
 *
 * // 型安全にアクセス可能
 * state.counter++;  // OK
 * state.name = "Hello";  // OK
 * state.unknown = 1;  // コンパイルエラー
 * ```
 */
export function createTypedSessionState<T extends Record<string, unknown>>(
	defaults: T,
): T {
	return new Proxy({} as T, {
		get(_target, prop: string) {
			if (!currentSessionId) {
				// セッション外ではデフォルト値を返す
				return defaults[prop as keyof T];
			}
			const state = getSessionManager().getState(currentSessionId);
			const value = state?.[prop];
			// 値が未設定ならデフォルト値を設定して返す
			if (value === undefined && prop in defaults) {
				const defaultValue = defaults[prop as keyof T];
				getSessionManager().setState(currentSessionId, prop, defaultValue);
				return defaultValue;
			}
			return value;
		},
		set(_target, prop: string, value: unknown) {
			if (!currentSessionId) {
				console.warn("session_state への書き込みは rerun 中のみ有効です");
				return true;
			}
			getSessionManager().setState(currentSessionId, prop, value);
			return true;
		},
		has(_target, prop: string) {
			// デフォルト値に定義されているキーも含める
			if (prop in defaults) return true;
			if (!currentSessionId) return false;
			const state = getSessionManager().getState(currentSessionId);
			return state ? prop in state : false;
		},
		ownKeys() {
			const keys = new Set(Object.keys(defaults));
			if (currentSessionId) {
				const state = getSessionManager().getState(currentSessionId);
				if (state) {
					for (const key of Object.keys(state)) {
						keys.add(key);
					}
				}
			}
			return Array.from(keys);
		},
		getOwnPropertyDescriptor(_target, prop: string) {
			if (!currentSessionId) {
				if (prop in defaults) {
					return {
						enumerable: true,
						configurable: true,
						value: defaults[prop as keyof T],
					};
				}
				return undefined;
			}
			const state = getSessionManager().getState(currentSessionId);
			if (state && prop in state) {
				return {
					enumerable: true,
					configurable: true,
					value: state[prop],
				};
			}
			if (prop in defaults) {
				return {
					enumerable: true,
					configurable: true,
					value: defaults[prop as keyof T],
				};
			}
			return undefined;
		},
	});
}

// グローバル session_state インスタンス（後方互換用）
export const session_state = createSessionState();
