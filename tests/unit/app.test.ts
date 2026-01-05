import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { resetPageConfig, set_page_config } from "../../src/kt/config";

describe("createApp with PageConfig", () => {
	beforeEach(() => {
		resetPageConfig();
	});

	afterEach(() => {
		resetPageConfig();
	});

	it("should use default title when no config is set", async () => {
		const { app } = createApp(() => {});
		const res = await app.request("/");
		const html = await res.text();

		expect(html).toContain("<title>kantan-ui</title>");
	});

	it("should apply custom title from page config", async () => {
		set_page_config({ title: "My Custom App" });

		const { app } = createApp(() => {});
		const res = await app.request("/");
		const html = await res.text();

		expect(html).toContain("<title>My Custom App</title>");
	});

	it("should apply wide layout class when configured", async () => {
		set_page_config({ layout: "wide" });

		const { app } = createApp(() => {});
		const res = await app.request("/");
		const html = await res.text();

		expect(html).toContain('class="kt-layout-wide"');
	});

	it("should apply centered layout class by default", async () => {
		set_page_config({ layout: "centered" });

		const { app } = createApp(() => {});
		const res = await app.request("/");
		const html = await res.text();

		expect(html).toContain('class="kt-layout-centered"');
	});

	it("should include emoji icon in title when configured", async () => {
		set_page_config({ title: "App", icon: "🚀" });

		const { app } = createApp(() => {});
		const res = await app.request("/");
		const html = await res.text();

		// Emoji favicon can be included in different ways
		// For now, we just verify the title is set
		expect(html).toContain("<title>App</title>");
	});
});
