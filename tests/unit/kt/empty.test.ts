import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getRenderContext, RenderContext, setRenderContext } from "../../../src/kt/context";
import { empty } from "../../../src/kt/empty";
import { getSessionManager } from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { resetWidgetCounter } from "../../../src/widgets/registry";

describe("kt.empty", () => {
	let testSessionId: string;

	beforeEach(() => {
		resetWidgetCounter();
		const session = getSessionManager().createSession();
		testSessionId = session.id;
		setCurrentSessionId(testSessionId);
		setRenderContext(new RenderContext());
	});

	afterEach(() => {
		setRenderContext(null);
		getSessionManager().deleteSession(testSessionId);
		setCurrentSessionId(null);
	});

	describe("empty()", () => {
		it("returns a Placeholder object", () => {
			const placeholder = empty();
			expect(placeholder).toBeDefined();
			expect(typeof placeholder.id).toBe("string");
			expect(typeof placeholder.write).toBe("function");
			expect(typeof placeholder.empty).toBe("function");
		});

		it("uses provided key as ID", () => {
			const placeholder = empty({ key: "my-placeholder" });
			expect(placeholder.id).toBe("my-placeholder");
		});

		it("generates unique IDs when key not provided", () => {
			const p1 = empty();
			const p2 = empty();
			expect(p1.id).not.toBe(p2.id);
		});

		it("appends placeholder container to render context", () => {
			empty();
			const ctx = getRenderContext();
			const html = ctx?.getMainHtml() ?? "";
			expect(html).toContain('class="kt-empty"');
			expect(html).toContain("id=");
		});

		it("includes current state HTML in container", () => {
			// First call to set state
			const p = empty({ key: "test-key" });
			p.write("Hello World");

			// Clear and re-render
			setRenderContext(new RenderContext());

			// Second call should render with saved state
			empty({ key: "test-key" });

			const ctx = getRenderContext();
			const html = ctx?.getMainHtml() ?? "";
			expect(html).toContain("Hello World");
		});

		it("renders empty container when no previous state", () => {
			empty({ key: "new-key" });
			const ctx = getRenderContext();
			const html = ctx?.getMainHtml() ?? "";
			expect(html).toContain('class="kt-empty"');
		});
	});

	describe("Placeholder methods work correctly", () => {
		it("write() updates and re-renders with new content", () => {
			const p = empty({ key: "write-test" });
			p.write("Updated content");

			// Clear and re-render
			setRenderContext(new RenderContext());
			empty({ key: "write-test" });

			const ctx = getRenderContext();
			const html = ctx?.getMainHtml() ?? "";
			expect(html).toContain("Updated content");
		});

		it("success() shows success alert on re-render", () => {
			const p = empty({ key: "success-test" });
			p.success("Done!");

			setRenderContext(new RenderContext());
			empty({ key: "success-test" });

			const ctx = getRenderContext();
			const html = ctx?.getMainHtml() ?? "";
			expect(html).toContain("kt-alert-success");
			expect(html).toContain("Done!");
		});

		it("error() shows error alert on re-render", () => {
			const p = empty({ key: "error-test" });
			p.error("Failed!");

			setRenderContext(new RenderContext());
			empty({ key: "error-test" });

			const ctx = getRenderContext();
			const html = ctx?.getMainHtml() ?? "";
			expect(html).toContain("kt-alert-error");
		});

		it("spinner() shows loading indicator on re-render", () => {
			const p = empty({ key: "spinner-test" });
			p.spinner("Loading...");

			setRenderContext(new RenderContext());
			empty({ key: "spinner-test" });

			const ctx = getRenderContext();
			const html = ctx?.getMainHtml() ?? "";
			expect(html).toContain("kt-spinner");
			expect(html).toContain("Loading...");
		});

		it("progress() shows progress bar on re-render", () => {
			const p = empty({ key: "progress-test" });
			p.progress(0.75);

			setRenderContext(new RenderContext());
			empty({ key: "progress-test" });

			const ctx = getRenderContext();
			const html = ctx?.getMainHtml() ?? "";
			expect(html).toContain("kt-progress");
			expect(html).toContain('value="75"');
		});

		it("empty() clears content on re-render", () => {
			const p = empty({ key: "clear-test" });
			p.write("Some content");
			p.empty();

			setRenderContext(new RenderContext());
			empty({ key: "clear-test" });

			const ctx = getRenderContext();
			const html = ctx?.getMainHtml() ?? "";
			// Should have empty placeholder
			expect(html).toContain('class="kt-empty"');
			expect(html).not.toContain("Some content");
		});
	});
});
