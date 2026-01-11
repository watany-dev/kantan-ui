import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type RenderContext, setRenderContext } from "../../../src/kt/context";
import { SessionManager, setSessionManager } from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { resetWidgetCounter } from "../../../src/widgets/registry";
import type { UploadedFile } from "../../../src/widgets/types";

// Mock render context
function createMockRenderContext(): RenderContext & { getHtml: () => string } {
	let html = "";
	return {
		append: (content: string) => {
			html += content;
		},
		getHtml: () => html,
	};
}

describe("kt.file_uploader", () => {
	let manager: SessionManager;
	let sessionId: string;
	let mockCtx: RenderContext & { getHtml: () => string };

	beforeEach(async () => {
		manager = new SessionManager();
		setSessionManager(manager);
		const session = manager.createSession();
		sessionId = session.id;
		setCurrentSessionId(sessionId);
		resetWidgetCounter();
		mockCtx = createMockRenderContext();
		setRenderContext(mockCtx);

		// Dynamic import to get the module after context setup
		const { file_uploader } = await import("../../../src/kt/widgets");
		// Store for test use
		(globalThis as Record<string, unknown>).__file_uploader = file_uploader;
	});

	afterEach(() => {
		manager.stopCleanupInterval();
		setCurrentSessionId(null);
		setRenderContext(null as unknown as RenderContext);
	});

	it("appends HTML to render context", async () => {
		const { file_uploader } = await import("../../../src/kt/widgets");
		file_uploader("Upload File");
		expect(mockCtx.getHtml()).toContain('type="file"');
	});

	it("returns null in single mode when no file uploaded", async () => {
		const { file_uploader } = await import("../../../src/kt/widgets");
		const result = file_uploader("Upload");
		expect(result).toBeNull();
	});

	it("returns empty array in multiple mode when no files uploaded", async () => {
		const { file_uploader } = await import("../../../src/kt/widgets");
		const result = file_uploader("Upload", { multiple: true });
		expect(result).toEqual([]);
	});

	it("returns UploadedFile when file is uploaded", async () => {
		// Register a file in the session
		const data = new TextEncoder().encode("file content").buffer;
		const uploadId = manager.registerUpload(sessionId, data, "test.txt", "text/plain");

		// Set widget state to reference the upload
		manager.setState(sessionId, "widget_0", [uploadId]);

		const { file_uploader } = await import("../../../src/kt/widgets");
		const result = file_uploader("Upload") as UploadedFile | null;

		expect(result).not.toBeNull();
		expect(result?.name).toBe("test.txt");
		expect(result?.type).toBe("text/plain");
	});

	it("renders with accept attribute", async () => {
		const { file_uploader } = await import("../../../src/kt/widgets");
		file_uploader("Upload Image", { accept: "image/*" });
		expect(mockCtx.getHtml()).toContain('accept="image/*"');
	});

	it("renders with multiple attribute", async () => {
		const { file_uploader } = await import("../../../src/kt/widgets");
		file_uploader("Upload Files", { multiple: true });
		expect(mockCtx.getHtml()).toContain("multiple");
	});

	it("renders with disabled attribute", async () => {
		const { file_uploader } = await import("../../../src/kt/widgets");
		file_uploader("Upload", { disabled: true });
		expect(mockCtx.getHtml()).toContain("disabled");
	});

	it("renders with help text", async () => {
		const { file_uploader } = await import("../../../src/kt/widgets");
		file_uploader("Upload", { help: "Max 5MB" });
		expect(mockCtx.getHtml()).toContain("Max 5MB");
	});

	it("uses custom key for widget ID", async () => {
		const { file_uploader } = await import("../../../src/kt/widgets");
		file_uploader("Upload", { key: "my-uploader" });
		expect(mockCtx.getHtml()).toContain('id="my-uploader"');
	});
});
