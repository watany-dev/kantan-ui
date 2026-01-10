import { describe, expect, it } from "vitest";
import {
	alertStyles,
	baseStyles,
	codeStyles,
	defaultStyles,
	feedbackStyles,
	formStyles,
	imageStyles,
	jsonStyles,
	layoutStyles,
	markdownStyles,
	sidebarStyles,
} from "../../../src/styles";

describe("Default Styles", () => {
	describe("defaultStyles", () => {
		it("should be a non-empty string", () => {
			expect(typeof defaultStyles).toBe("string");
			expect(defaultStyles.length).toBeGreaterThan(0);
		});

		it("should include all component styles", () => {
			expect(defaultStyles).toContain(".kt-button");
			expect(defaultStyles).toContain(".kt-alert");
			expect(defaultStyles).toContain(".kt-json");
			expect(defaultStyles).toContain(".kt-code");
			expect(defaultStyles).toContain(".kt-markdown");
			expect(defaultStyles).toContain(".kt-progress");
			expect(defaultStyles).toContain(".kt-spinner");
			expect(defaultStyles).toContain(".kt-toast");
			expect(defaultStyles).toContain(".kt-columns");
			expect(defaultStyles).toContain(".kt-expander");
			expect(defaultStyles).toContain(".kt-sidebar");
			expect(defaultStyles).toContain(".kt-image");
			expect(defaultStyles).toContain(".kt-form");
		});
	});

	describe("baseStyles", () => {
		it("should include layout classes", () => {
			expect(baseStyles).toContain(".kt-layout-centered");
			expect(baseStyles).toContain(".kt-layout-wide");
		});

		it("should include button styles", () => {
			expect(baseStyles).toContain(".kt-button");
		});

		it("should include input styles", () => {
			expect(baseStyles).toContain(".kt-slider");
			expect(baseStyles).toContain(".kt-text-input");
			expect(baseStyles).toContain(".kt-selectbox");
		});
	});

	describe("alertStyles", () => {
		it("should include alert base class", () => {
			expect(alertStyles).toContain(".kt-alert");
		});

		it("should include all alert types", () => {
			expect(alertStyles).toContain(".kt-alert-success");
			expect(alertStyles).toContain(".kt-alert-error");
			expect(alertStyles).toContain(".kt-alert-warning");
			expect(alertStyles).toContain(".kt-alert-info");
		});

		it("should define colors for each type", () => {
			expect(alertStyles).toContain("#d4edda"); // success
			expect(alertStyles).toContain("#f8d7da"); // error
			expect(alertStyles).toContain("#fff3cd"); // warning
			expect(alertStyles).toContain("#d1ecf1"); // info
		});
	});

	describe("jsonStyles", () => {
		it("should include json viewer class", () => {
			expect(jsonStyles).toContain(".kt-json");
		});

		it("should include type-specific classes", () => {
			expect(jsonStyles).toContain(".kt-json-null");
			expect(jsonStyles).toContain(".kt-json-boolean");
			expect(jsonStyles).toContain(".kt-json-number");
			expect(jsonStyles).toContain(".kt-json-string");
			expect(jsonStyles).toContain(".kt-json-key");
		});
	});

	describe("codeStyles", () => {
		it("should include code block class", () => {
			expect(codeStyles).toContain(".kt-code");
		});

		it("should include line numbers styles", () => {
			expect(codeStyles).toContain(".kt-code-line-numbers");
		});

		it("should include copy button styles", () => {
			expect(codeStyles).toContain(".kt-code-copy");
			expect(codeStyles).toContain(".kt-code-copy-success");
		});

		it("should include syntax highlighting classes", () => {
			expect(codeStyles).toContain(".kt-hl-keyword");
			expect(codeStyles).toContain(".kt-hl-string");
			expect(codeStyles).toContain(".kt-hl-number");
			expect(codeStyles).toContain(".kt-hl-comment");
		});
	});

	describe("markdownStyles", () => {
		it("should include markdown class", () => {
			expect(markdownStyles).toContain(".kt-markdown");
		});

		it("should include heading styles", () => {
			expect(markdownStyles).toContain(".kt-markdown h1");
			expect(markdownStyles).toContain(".kt-markdown h2");
			expect(markdownStyles).toContain(".kt-markdown h3");
		});

		it("should include code styles", () => {
			expect(markdownStyles).toContain(".kt-markdown code");
			expect(markdownStyles).toContain(".kt-markdown pre");
		});
	});

	describe("feedbackStyles", () => {
		it("should include progress bar class", () => {
			expect(feedbackStyles).toContain(".kt-progress");
			expect(feedbackStyles).toContain(".kt-progress-bar");
			expect(feedbackStyles).toContain(".kt-progress-fill");
		});

		it("should include animated progress bar styles", () => {
			expect(feedbackStyles).toContain(".kt-progress-animated");
			expect(feedbackStyles).toContain("@keyframes kt-progress-stripes");
		});

		it("should include spinner class", () => {
			expect(feedbackStyles).toContain(".kt-spinner");
			expect(feedbackStyles).toContain(".kt-spinner-icon");
		});

		it("should include spinner animation", () => {
			expect(feedbackStyles).toContain("@keyframes kt-spin");
		});

		it("should include toast classes", () => {
			expect(feedbackStyles).toContain(".kt-toast");
			expect(feedbackStyles).toContain(".kt-toast-success");
			expect(feedbackStyles).toContain(".kt-toast-error");
		});
	});

	describe("layoutStyles", () => {
		it("should include columns class", () => {
			expect(layoutStyles).toContain(".kt-columns");
			expect(layoutStyles).toContain(".kt-column");
		});

		it("should include responsive columns media query", () => {
			expect(layoutStyles).toContain("@media (max-width: 768px)");
			expect(layoutStyles).toContain(".kt-columns-responsive");
			expect(layoutStyles).toContain("flex-direction: column");
		});

		it("should include expander class", () => {
			expect(layoutStyles).toContain(".kt-expander");
			expect(layoutStyles).toContain(".kt-expander-header");
			expect(layoutStyles).toContain(".kt-expander-content");
		});

		it("should include tabs class", () => {
			expect(layoutStyles).toContain(".kt-tabs");
			expect(layoutStyles).toContain(".kt-tab");
			expect(layoutStyles).toContain(".kt-tab-active");
		});
	});

	describe("formStyles", () => {
		it("should include form class", () => {
			expect(formStyles).toContain(".kt-form");
		});

		it("should include submit button class", () => {
			expect(formStyles).toContain(".kt-form-submit");
		});

		it("should include disabled state", () => {
			expect(formStyles).toContain(".kt-form-submit:disabled");
		});

		it("should include validation error styles", () => {
			expect(formStyles).toContain(".kt-validation-error");
			expect(formStyles).toContain(".kt-validation-errors");
		});
	});

	describe("imageStyles", () => {
		it("should include image class", () => {
			expect(imageStyles).toContain(".kt-image");
		});

		it("should include image element class", () => {
			expect(imageStyles).toContain(".kt-image-img");
		});

		it("should include caption class", () => {
			expect(imageStyles).toContain(".kt-image-caption");
		});

		it("should include container width class", () => {
			expect(imageStyles).toContain(".kt-image-container-width");
		});

		it("should include CSS variable for width", () => {
			expect(imageStyles).toContain("--kt-image-width");
		});

		it("should include gallery class", () => {
			expect(imageStyles).toContain(".kt-image-gallery");
		});

		it("should include gallery flex layout", () => {
			expect(imageStyles).toContain("display: flex");
			expect(imageStyles).toContain("flex-wrap: wrap");
			expect(imageStyles).toContain("gap: 1rem");
		});
	});

	describe("sidebarStyles", () => {
		it("should include sidebar layout class", () => {
			expect(sidebarStyles).toContain(".kt-layout-sidebar");
		});

		it("should include sidebar class", () => {
			expect(sidebarStyles).toContain(".kt-sidebar");
		});

		it("should include sidebar collapsed state", () => {
			expect(sidebarStyles).toContain('.kt-sidebar[data-state="collapsed"]');
		});

		it("should include sidebar content class", () => {
			expect(sidebarStyles).toContain(".kt-sidebar-content");
		});

		it("should include sidebar toggle button", () => {
			expect(sidebarStyles).toContain(".kt-sidebar-toggle");
			expect(sidebarStyles).toContain(".kt-sidebar-toggle-icon");
		});

		it("should include responsive media query", () => {
			expect(sidebarStyles).toContain("@media (max-width: 768px)");
		});

		it("should include mobile overlay styles", () => {
			expect(sidebarStyles).toContain(".kt-sidebar-overlay");
		});

		it("should include main area styles", () => {
			expect(sidebarStyles).toContain(".kt-layout-sidebar .kt-main");
		});
	});
});
