import { describe, expect, it } from "vitest";
import { createApp } from "../src/index";

describe("kantan-ui", () => {
	it("should create app and return HTML page", async () => {
		const script = () => "<h1>Test</h1>";
		const { app } = createApp(script);

		const res = await app.request("/");
		expect(res.status).toBe(200);

		const html = await res.text();
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("<h1>Test</h1>");
		expect(html).toContain("kantan-ui");
	});

	it("should serve client.js", async () => {
		const script = () => "<div>App</div>";
		const { app } = createApp(script);

		const res = await app.request("/client.js");
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toContain("javascript");

		const js = await res.text();
		expect(js).toContain("WebSocket");
		expect(js).toContain("sendEvent");
	});
});
