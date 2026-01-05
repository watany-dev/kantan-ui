import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { resetSessionManager, setSessionManager } from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { download_button, renderDownloadButton } from "../../../src/widgets/download-button";
import { resetWidgetCounter } from "../../../src/widgets/registry";

// Mock SessionManager
class MockSessionManager {
	private states = new Map<string, Map<string, unknown>>();
	getSession(id: string) {
		return { id, state: this.states.get(id) ?? new Map() };
	}
	getState(sessionId: string, key: string): unknown {
		return this.states.get(sessionId)?.get(key);
	}
	setState(sessionId: string, key: string, value: unknown): void {
		if (!this.states.has(sessionId)) {
			this.states.set(sessionId, new Map());
		}
		this.states.get(sessionId)?.set(key, value);
	}
	hasState(sessionId: string, key: string): boolean {
		return this.states.get(sessionId)?.has(key) ?? false;
	}
}

describe("download_button", () => {
	let ctx: RenderContext;
	let mockManager: MockSessionManager;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
		resetWidgetCounter();
		mockManager = new MockSessionManager();
		setSessionManager(mockManager as never);
		setCurrentSessionId("test-session");
	});

	afterEach(() => {
		setRenderContext(null);
		resetWidgetCounter();
		resetSessionManager();
		setCurrentSessionId(null);
	});

	describe("renderDownloadButton", () => {
		it("should render a download link with label", () => {
			const html = renderDownloadButton("Download", "Hello World", "test.txt");

			expect(html).toContain("Download");
			expect(html).toContain('class="kt-download-button"');
			expect(html).toContain('download="test.txt"');
		});

		it("should encode string data as base64", () => {
			const html = renderDownloadButton("Download", "Hello World", "test.txt");

			// "Hello World" in base64 is "SGVsbG8gV29ybGQ="
			expect(html).toContain("data:application/octet-stream;base64,");
		});

		it("should encode ArrayBuffer data as base64", () => {
			const buffer = new TextEncoder().encode("Hello World").buffer;
			const html = renderDownloadButton("Download", buffer, "test.bin");

			expect(html).toContain("data:application/octet-stream;base64,");
			// Verify it's a valid base64 data URL
			expect(html).toMatch(/data:[^;]+;base64,[A-Za-z0-9+/=]+/);
		});

		it("should use custom mime type", () => {
			const html = renderDownloadButton("Download", "col1,col2\n1,2", "data.csv", {
				mime: "text/csv",
			});

			expect(html).toContain("data:text/csv;base64,");
		});

		it("should escape HTML in label", () => {
			const html = renderDownloadButton('<script>alert("xss")</script>', "data", "file.txt");

			expect(html).toContain("&lt;script&gt;");
			expect(html).not.toContain("<script>");
		});

		it("should escape HTML in filename", () => {
			const html = renderDownloadButton("Download", "data", 'file" onclick="alert(1)".txt');

			expect(html).not.toContain('onclick="alert(1)"');
		});

		it("should support disabled state", () => {
			const html = renderDownloadButton("Download", "data", "file.txt", {
				disabled: true,
			});

			expect(html).toContain("disabled");
		});

		it("should use custom key for widget ID", () => {
			const html = renderDownloadButton("Download", "data", "file.txt", {
				key: "custom-download",
			});

			expect(html).toContain('id="custom-download"');
		});
	});

	describe("download_button function", () => {
		it("should return false by default", () => {
			const result = download_button("Download", "data", "file.txt");

			expect(result).toBe(false);
		});

		it("should append HTML to render context", () => {
			download_button("Download", "data", "file.txt");

			const html = ctx.getHtml();
			expect(html).toContain("Download");
			expect(html).toContain('class="kt-download-button"');
		});
	});
});
