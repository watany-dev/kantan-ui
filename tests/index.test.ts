import { describe, expect, it } from "vitest";
import {
	// App
	createApp,
	// Runtime
	rerun,
	getContext,
	setContext,
	clearContext,
	// Session
	SessionManager,
	getSessionManager,
	session_state,
	// Widgets
	button,
	slider,
	text_input,
	selectbox,
	resetWidgetCounter,
} from "../src/index";

describe("kantan-ui exports", () => {
	it("should export createApp", () => {
		expect(createApp).toBeDefined();
		expect(typeof createApp).toBe("function");
	});

	it("should export runtime functions", () => {
		expect(rerun).toBeDefined();
		expect(getContext).toBeDefined();
		expect(setContext).toBeDefined();
		expect(clearContext).toBeDefined();
	});

	it("should export session management", () => {
		expect(SessionManager).toBeDefined();
		expect(getSessionManager).toBeDefined();
		expect(session_state).toBeDefined();
	});

	it("should export widget functions", () => {
		expect(button).toBeDefined();
		expect(slider).toBeDefined();
		expect(text_input).toBeDefined();
		expect(selectbox).toBeDefined();
		expect(resetWidgetCounter).toBeDefined();
	});
});

describe("createApp", () => {
	it("should create app with script", () => {
		const script = () => "<div>Hello</div>";
		const { app, websocket } = createApp(script);

		expect(app).toBeDefined();
		expect(websocket).toBeDefined();
	});

	it("should return HTML from root route", async () => {
		const script = () => "<div>Test Content</div>";
		const { app } = createApp(script);

		const res = await app.request("/");

		expect(res.status).toBe(200);
		const html = await res.text();
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("Test Content");
		expect(html).toContain("kantan-ui");
	});
});
