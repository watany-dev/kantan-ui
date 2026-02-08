import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAdapterCache, createWebSocketAdapterAsync } from "../../../src/websocket/handler";

// getRuntimeKey をモック
vi.mock("hono/adapter", () => ({
	getRuntimeKey: vi.fn(),
}));

// ランタイム固有モジュールをモック
vi.mock("hono/cloudflare-workers", () => ({
	upgradeWebSocket: vi.fn(() => "cloudflare-upgrade-handler"),
}));

vi.mock("hono/deno", () => ({
	upgradeWebSocket: vi.fn(() => "deno-upgrade-handler"),
}));

import { getRuntimeKey } from "hono/adapter";

describe("createWebSocketAdapterAsync", () => {
	beforeEach(() => {
		clearAdapterCache();
	});

	afterEach(() => {
		clearAdapterCache();
	});

	it("should create Cloudflare Workers adapter when runtime is workerd", async () => {
		vi.mocked(getRuntimeKey).mockReturnValue("workerd");

		const adapter = await createWebSocketAdapterAsync();

		expect(adapter.upgradeWebSocket).toBeDefined();
		// Cloudflare Workersアダプターはwebsocket/injectWebSocketを持たない
		expect(adapter.websocket).toBeUndefined();
		expect(adapter.injectWebSocket).toBeUndefined();
	});

	it("should cache Cloudflare adapter on subsequent calls", async () => {
		vi.mocked(getRuntimeKey).mockReturnValue("workerd");

		const adapter1 = await createWebSocketAdapterAsync();
		const adapter2 = await createWebSocketAdapterAsync();

		expect(adapter1).toBe(adapter2);
	});

	it("should create Deno adapter when runtime is deno", async () => {
		vi.mocked(getRuntimeKey).mockReturnValue("deno");

		const adapter = await createWebSocketAdapterAsync();

		expect(adapter.upgradeWebSocket).toBeDefined();
		expect(adapter.websocket).toBeUndefined();
		expect(adapter.injectWebSocket).toBeUndefined();
	});

	it("should throw for Node.js runtime without app", async () => {
		vi.mocked(getRuntimeKey).mockReturnValue("node");

		await expect(createWebSocketAdapterAsync()).rejects.toThrow(
			"Hono app instance is required for Node.js WebSocket adapter",
		);
	});
});
