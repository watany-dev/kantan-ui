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

// グローバル session_state インスタンス
export const session_state = createSessionState();
