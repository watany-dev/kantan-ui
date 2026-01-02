import { describe, expect, it } from "vitest";
import {
	DEFAULT_CLIENT_CONFIG,
	DEFAULT_CONFIG,
	DEFAULT_COOKIE_CONFIG,
	DEFAULT_SESSION_CONFIG,
	DEFAULT_STREAMING_CONFIG,
	resolveConfig,
} from "../../../src/config";

describe("Config Defaults", () => {
	describe("DEFAULT_COOKIE_CONFIG", () => {
		it("should have httpOnly enabled by default", () => {
			expect(DEFAULT_COOKIE_CONFIG.httpOnly).toBe(true);
		});

		it("should have secure set to auto by default", () => {
			expect(DEFAULT_COOKIE_CONFIG.secure).toBe("auto");
		});

		it("should have sameSite set to Lax by default", () => {
			expect(DEFAULT_COOKIE_CONFIG.sameSite).toBe("Lax");
		});

		it("should have path set to / by default", () => {
			expect(DEFAULT_COOKIE_CONFIG.path).toBe("/");
		});
	});

	describe("DEFAULT_SESSION_CONFIG", () => {
		it("should have correct default session key", () => {
			expect(DEFAULT_SESSION_CONFIG.sessionKey).toBe("kt-session-id");
		});

		it("should have correct default TTL (30 minutes)", () => {
			expect(DEFAULT_SESSION_CONFIG.ttl).toBe(30 * 60 * 1000);
		});

		it("should have correct default cleanup interval (1 minute)", () => {
			expect(DEFAULT_SESSION_CONFIG.cleanupInterval).toBe(60 * 1000);
		});

		it("should have scope set to tab by default", () => {
			expect(DEFAULT_SESSION_CONFIG.scope).toBe("tab");
		});

		it("should have default cookie config", () => {
			expect(DEFAULT_SESSION_CONFIG.cookie).toEqual(DEFAULT_COOKIE_CONFIG);
		});
	});

	describe("DEFAULT_CLIENT_CONFIG", () => {
		it("should have correct default max reconnect attempts", () => {
			expect(DEFAULT_CLIENT_CONFIG.maxReconnectAttempts).toBe(10);
		});

		it("should have correct default base reconnect delay (1 second)", () => {
			expect(DEFAULT_CLIENT_CONFIG.baseReconnectDelay).toBe(1000);
		});

		it("should have correct default max reconnect delay (30 seconds)", () => {
			expect(DEFAULT_CLIENT_CONFIG.maxReconnectDelay).toBe(30000);
		});
	});

	describe("DEFAULT_STREAMING_CONFIG", () => {
		it("should be disabled by default", () => {
			expect(DEFAULT_STREAMING_CONFIG.enabled).toBe(false);
		});

		it("should have correct default flush threshold", () => {
			expect(DEFAULT_STREAMING_CONFIG.flushThreshold).toBe(3);
		});
	});

	describe("DEFAULT_CONFIG", () => {
		it("should contain session, client, and streaming configs", () => {
			expect(DEFAULT_CONFIG.session).toEqual(DEFAULT_SESSION_CONFIG);
			expect(DEFAULT_CONFIG.client).toEqual(DEFAULT_CLIENT_CONFIG);
			expect(DEFAULT_CONFIG.streaming).toEqual(DEFAULT_STREAMING_CONFIG);
		});
	});
});

describe("resolveConfig", () => {
	it("should return defaults when no config provided", () => {
		const resolved = resolveConfig();

		expect(resolved.session).toEqual(DEFAULT_SESSION_CONFIG);
		expect(resolved.client).toEqual(DEFAULT_CLIENT_CONFIG);
		expect(resolved.streaming).toEqual(DEFAULT_STREAMING_CONFIG);
	});

	it("should return defaults when empty config provided", () => {
		const resolved = resolveConfig({});

		expect(resolved.session).toEqual(DEFAULT_SESSION_CONFIG);
		expect(resolved.client).toEqual(DEFAULT_CLIENT_CONFIG);
		expect(resolved.streaming).toEqual(DEFAULT_STREAMING_CONFIG);
	});

	it("should override session config values", () => {
		const resolved = resolveConfig({
			session: {
				sessionKey: "custom-key",
				ttl: 60000,
			},
		});

		expect(resolved.session.sessionKey).toBe("custom-key");
		expect(resolved.session.ttl).toBe(60000);
		// Default should still be used for cleanupInterval
		expect(resolved.session.cleanupInterval).toBe(DEFAULT_SESSION_CONFIG.cleanupInterval);
	});

	it("should override client config values", () => {
		const resolved = resolveConfig({
			client: {
				maxReconnectAttempts: 5,
				baseReconnectDelay: 500,
			},
		});

		expect(resolved.client.maxReconnectAttempts).toBe(5);
		expect(resolved.client.baseReconnectDelay).toBe(500);
		// Default should still be used for maxReconnectDelay
		expect(resolved.client.maxReconnectDelay).toBe(DEFAULT_CLIENT_CONFIG.maxReconnectDelay);
	});

	it("should override streaming config values", () => {
		const resolved = resolveConfig({
			streaming: {
				enabled: true,
				flushThreshold: 5,
			},
		});

		expect(resolved.streaming.enabled).toBe(true);
		expect(resolved.streaming.flushThreshold).toBe(5);
	});

	it("should override all config sections", () => {
		const resolved = resolveConfig({
			session: {
				sessionKey: "my-session",
				ttl: 5 * 60 * 1000,
				cleanupInterval: 30 * 1000,
			},
			client: {
				maxReconnectAttempts: 3,
				baseReconnectDelay: 2000,
				maxReconnectDelay: 60000,
			},
			streaming: {
				enabled: true,
				flushThreshold: 10,
			},
		});

		expect(resolved.session.sessionKey).toBe("my-session");
		expect(resolved.session.ttl).toBe(5 * 60 * 1000);
		expect(resolved.session.cleanupInterval).toBe(30 * 1000);
		expect(resolved.client.maxReconnectAttempts).toBe(3);
		expect(resolved.client.baseReconnectDelay).toBe(2000);
		expect(resolved.client.maxReconnectDelay).toBe(60000);
		expect(resolved.streaming.enabled).toBe(true);
		expect(resolved.streaming.flushThreshold).toBe(10);
	});

	it("should not mutate the original config", () => {
		const userConfig = {
			session: { ttl: 5000 },
		};
		const resolved = resolveConfig(userConfig);

		// Original should be unchanged
		expect(userConfig.session).toEqual({ ttl: 5000 });
		// Resolved should have all fields
		expect(resolved.session.sessionKey).toBe("kt-session-id");
	});

	it("should override scope to browser", () => {
		const resolved = resolveConfig({
			session: {
				scope: "browser",
			},
		});

		expect(resolved.session.scope).toBe("browser");
		// Default cookie config should still be present
		expect(resolved.session.cookie).toEqual(DEFAULT_COOKIE_CONFIG);
	});

	it("should override cookie config values", () => {
		const resolved = resolveConfig({
			session: {
				cookie: {
					httpOnly: false,
					secure: true,
					sameSite: "Strict",
				},
			},
		});

		expect(resolved.session.cookie.httpOnly).toBe(false);
		expect(resolved.session.cookie.secure).toBe(true);
		expect(resolved.session.cookie.sameSite).toBe("Strict");
		// Default path should still be used
		expect(resolved.session.cookie.path).toBe("/");
	});

	it("should merge nested cookie config correctly", () => {
		const resolved = resolveConfig({
			session: {
				scope: "browser",
				cookie: {
					path: "/app",
				},
			},
		});

		expect(resolved.session.scope).toBe("browser");
		expect(resolved.session.cookie.path).toBe("/app");
		// Other cookie defaults should be preserved
		expect(resolved.session.cookie.httpOnly).toBe(true);
		expect(resolved.session.cookie.secure).toBe("auto");
		expect(resolved.session.cookie.sameSite).toBe("Lax");
	});
});
