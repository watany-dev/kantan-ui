import { describe, expect, it } from "vitest";
import {
	DEFAULT_CLIENT_CONFIG,
	DEFAULT_CONFIG,
	DEFAULT_SESSION_CONFIG,
	resolveConfig,
} from "../../../src/config";

describe("Config Defaults", () => {
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

	describe("DEFAULT_CONFIG", () => {
		it("should contain session and client configs", () => {
			expect(DEFAULT_CONFIG.session).toEqual(DEFAULT_SESSION_CONFIG);
			expect(DEFAULT_CONFIG.client).toEqual(DEFAULT_CLIENT_CONFIG);
		});
	});
});

describe("resolveConfig", () => {
	it("should return defaults when no config provided", () => {
		const resolved = resolveConfig();

		expect(resolved.session).toEqual(DEFAULT_SESSION_CONFIG);
		expect(resolved.client).toEqual(DEFAULT_CLIENT_CONFIG);
	});

	it("should return defaults when empty config provided", () => {
		const resolved = resolveConfig({});

		expect(resolved.session).toEqual(DEFAULT_SESSION_CONFIG);
		expect(resolved.client).toEqual(DEFAULT_CLIENT_CONFIG);
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

	it("should override both session and client configs", () => {
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
		});

		expect(resolved.session.sessionKey).toBe("my-session");
		expect(resolved.session.ttl).toBe(5 * 60 * 1000);
		expect(resolved.session.cleanupInterval).toBe(30 * 1000);
		expect(resolved.client.maxReconnectAttempts).toBe(3);
		expect(resolved.client.baseReconnectDelay).toBe(2000);
		expect(resolved.client.maxReconnectDelay).toBe(60000);
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
});
