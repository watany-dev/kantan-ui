import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPageConfig, resetPageConfig, set_page_config } from "../../../src/kt/config";

describe("Page Config", () => {
	beforeEach(() => {
		resetPageConfig();
	});

	afterEach(() => {
		resetPageConfig();
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
});
