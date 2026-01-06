import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPageConfig, resetPageConfig, set_page_config } from "../../../src/kt/config";
import { resetSessionManager, setSessionManager } from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";

// Mock SessionManager
class MockSessionManager {
	private states = new Map<string, Record<string, unknown>>();

	getSession(id: string) {
		return { id, state: this.states.get(id) ?? {} };
	}

	getState(sessionId: string): Record<string, unknown> | undefined {
		return this.states.get(sessionId);
	}

	setState(sessionId: string, key: string, value: unknown): void {
		if (!this.states.has(sessionId)) {
			this.states.set(sessionId, {});
		}
		const state = this.states.get(sessionId);
		if (state) {
			state[key] = value;
		}
	}

	hasState(sessionId: string, key: string): boolean {
		const state = this.states.get(sessionId);
		return state ? key in state : false;
	}

	// テスト用: セッション状態をクリア
	clearSession(sessionId: string): void {
		this.states.delete(sessionId);
	}
}

describe("Page Config", () => {
	let mockManager: MockSessionManager;
	const TEST_SESSION_ID = "test-session-123";

	beforeEach(() => {
		mockManager = new MockSessionManager();
		setSessionManager(mockManager as never);
		setCurrentSessionId(TEST_SESSION_ID);
	});

	afterEach(() => {
		resetPageConfig();
		setCurrentSessionId(null);
		resetSessionManager();
	});

	describe("set_page_config", () => {
		it("should store page configuration", () => {
			set_page_config({
				title: "My App",
				icon: "🚀",
				layout: "wide",
			});

			const config = getPageConfig();
			expect(config.title).toBe("My App");
			expect(config.icon).toBe("🚀");
			expect(config.layout).toBe("wide");
		});

		it("should warn on second call", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			set_page_config({ title: "First" });
			set_page_config({ title: "Second" });

			expect(warnSpy).toHaveBeenCalledWith("set_page_config should only be called once");
			warnSpy.mockRestore();
		});

		it("should not override config on second call", () => {
			vi.spyOn(console, "warn").mockImplementation(() => {});

			set_page_config({ title: "First" });
			set_page_config({ title: "Second" });

			expect(getPageConfig().title).toBe("First");
		});

		it("should handle partial config", () => {
			set_page_config({ title: "Only Title" });

			const config = getPageConfig();
			expect(config.title).toBe("Only Title");
			expect(config.icon).toBeUndefined();
			expect(config.layout).toBeUndefined();
		});

		it("should handle initialSidebarState", () => {
			set_page_config({
				title: "App",
				initialSidebarState: "collapsed",
			});

			expect(getPageConfig().initialSidebarState).toBe("collapsed");
		});

		it("should handle menuItems", () => {
			set_page_config({
				title: "App",
				menuItems: [
					{ label: "Home", url: "/" },
					{ label: "About", url: "/about" },
				],
			});

			expect(getPageConfig().menuItems).toHaveLength(2);
			expect(getPageConfig().menuItems?.[0].label).toBe("Home");
		});

		it("should warn when called outside session context", () => {
			setCurrentSessionId(null);
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			set_page_config({ title: "Test" });

			expect(warnSpy).toHaveBeenCalledWith(
				"set_page_config must be called within a session context",
			);
			warnSpy.mockRestore();
		});
	});

	describe("getPageConfig", () => {
		it("should return empty object when not set", () => {
			const config = getPageConfig();
			expect(config).toEqual({});
		});

		it("should return stored config", () => {
			set_page_config({ title: "Test App", layout: "centered" });

			const config = getPageConfig();
			expect(config.title).toBe("Test App");
			expect(config.layout).toBe("centered");
		});

		it("should return empty object when called outside session context", () => {
			set_page_config({ title: "Test" });
			setCurrentSessionId(null);

			expect(getPageConfig()).toEqual({});
		});
	});

	describe("resetPageConfig", () => {
		it("should reset config to empty state", () => {
			set_page_config({ title: "Test" });
			resetPageConfig();

			expect(getPageConfig()).toEqual({});
		});

		it("should allow set_page_config after reset", () => {
			vi.spyOn(console, "warn").mockImplementation(() => {});

			set_page_config({ title: "First" });
			resetPageConfig();
			set_page_config({ title: "Second" });

			expect(getPageConfig().title).toBe("Second");
		});
	});

	describe("session isolation", () => {
		it("should isolate page config between sessions", () => {
			// First session
			set_page_config({ title: "Session 1 App" });
			expect(getPageConfig().title).toBe("Session 1 App");

			// Switch to second session
			const SESSION_2_ID = "test-session-456";
			setCurrentSessionId(SESSION_2_ID);

			// Second session should have empty config
			expect(getPageConfig()).toEqual({});

			// Set config for second session
			set_page_config({ title: "Session 2 App" });
			expect(getPageConfig().title).toBe("Session 2 App");

			// Switch back to first session
			setCurrentSessionId(TEST_SESSION_ID);
			expect(getPageConfig().title).toBe("Session 1 App");
		});
	});
});
