import { beforeEach, describe, expect, it } from "vitest";
import { renderFileUploader } from "../../../src/widgets/file-uploader";
import { resetWidgetCounter } from "../../../src/widgets/registry";

describe("renderFileUploader", () => {
	beforeEach(() => {
		resetWidgetCounter();
	});

	it("renders input with correct attributes", () => {
		const html = renderFileUploader("Upload file", {});
		expect(html).toContain('type="file"');
		expect(html).toContain('data-kt-event="change"');
	});

	it("includes accept attribute for string", () => {
		const html = renderFileUploader("Upload", { accept: "image/*" });
		expect(html).toContain('accept="image/*"');
	});

	it("includes accept attribute for array", () => {
		const html = renderFileUploader("Upload", { accept: [".png", ".jpg", "image/gif"] });
		expect(html).toContain('accept=".png,.jpg,image/gif"');
	});

	it("includes multiple attribute", () => {
		const html = renderFileUploader("Upload", { multiple: true });
		expect(html).toContain("multiple");
	});

	it("does not include multiple attribute when false", () => {
		const html = renderFileUploader("Upload", { multiple: false });
		expect(html).not.toMatch(/\bmultiple\b/);
	});

	it("escapes label for XSS prevention", () => {
		const html = renderFileUploader("<script>alert(1)</script>", {});
		expect(html).not.toContain("<script>");
		expect(html).toContain("&lt;script&gt;");
	});

	it("includes data-max-size for client validation", () => {
		const html = renderFileUploader("Upload", { maxSize: 1024 });
		expect(html).toContain('data-max-size="1024"');
	});

	it("uses default max size when not specified", () => {
		const html = renderFileUploader("Upload", {});
		// Default max size is 200MB = 209715200 bytes
		expect(html).toContain('data-max-size="209715200"');
	});

	it("includes disabled attribute when disabled", () => {
		const html = renderFileUploader("Upload", { disabled: true });
		expect(html).toContain("disabled");
	});

	it("does not include disabled attribute when false", () => {
		const html = renderFileUploader("Upload", { disabled: false });
		expect(html).not.toMatch(/\bdisabled\b/);
	});

	it("renders help text when provided", () => {
		const html = renderFileUploader("Upload", { help: "Max file size: 5MB" });
		expect(html).toContain("Max file size: 5MB");
		expect(html).toContain("kt-file-uploader-help");
	});

	it("escapes help text for XSS prevention", () => {
		const html = renderFileUploader("Upload", { help: '<img src=x onerror="alert(1)">' });
		expect(html).not.toContain('onerror="alert(1)"');
		expect(html).toContain("&lt;img");
	});

	it("renders with unique widget id", () => {
		const html1 = renderFileUploader("Upload 1", {});
		resetWidgetCounter();
		const html2 = renderFileUploader("Upload 2", { key: "custom-key" });

		expect(html1).toContain('id="widget_0"');
		expect(html2).toContain('id="custom-key"');
	});

	it("includes container class", () => {
		const html = renderFileUploader("Upload", {});
		expect(html).toContain("kt-file-uploader-container");
	});

	it("includes label class", () => {
		const html = renderFileUploader("Upload", {});
		expect(html).toContain("kt-file-uploader-label");
	});

	it("includes input class", () => {
		const html = renderFileUploader("Upload", {});
		expect(html).toContain("kt-file-uploader");
	});

	it("includes data attributes for validation", () => {
		const html = renderFileUploader("Upload", {
			strictMode: true,
			detectPolyglot: false,
			verifyMagicBytes: true,
		});
		expect(html).toContain('data-strict-mode="true"');
		expect(html).toContain('data-detect-polyglot="false"');
		expect(html).toContain('data-verify-magic-bytes="true"');
	});

	it("uses default validation options when not specified", () => {
		const html = renderFileUploader("Upload", {});
		expect(html).toContain('data-strict-mode="false"');
		expect(html).toContain('data-detect-polyglot="true"');
		expect(html).toContain('data-verify-magic-bytes="true"');
	});

	describe("progress indicator", () => {
		it("includes progress container element", () => {
			const html = renderFileUploader("Upload", {});
			expect(html).toContain("kt-file-uploader-progress");
		});

		it("includes progress bar element", () => {
			const html = renderFileUploader("Upload", {});
			expect(html).toContain("kt-progress-bar");
			expect(html).toContain("kt-progress-fill");
		});

		it("includes progress text elements", () => {
			const html = renderFileUploader("Upload", {});
			expect(html).toContain("kt-progress-text");
			expect(html).toContain("kt-progress-percent");
			expect(html).toContain("kt-progress-size");
		});

		it("progress is initially hidden", () => {
			const html = renderFileUploader("Upload", {});
			expect(html).toMatch(/kt-file-uploader-progress[^>]*style="display:\s*none"/);
		});
	});

	describe("upload complete display", () => {
		it("includes complete container element", () => {
			const html = renderFileUploader("Upload", {});
			expect(html).toContain("kt-file-uploader-complete");
		});

		it("includes file name placeholder", () => {
			const html = renderFileUploader("Upload", {});
			expect(html).toContain("kt-file-name");
		});

		it("includes remove button", () => {
			const html = renderFileUploader("Upload", {});
			expect(html).toContain("kt-file-remove");
		});

		it("complete display is initially hidden", () => {
			const html = renderFileUploader("Upload", {});
			expect(html).toMatch(/kt-file-uploader-complete[^>]*style="display:\s*none"/);
		});
	});

	describe("error display", () => {
		it("includes error container element", () => {
			const html = renderFileUploader("Upload", {});
			expect(html).toContain("kt-file-uploader-error");
		});

		it("error is initially hidden", () => {
			const html = renderFileUploader("Upload", {});
			expect(html).toMatch(/kt-file-uploader-error[^>]*style="display:\s*none"/);
		});
	});
});
