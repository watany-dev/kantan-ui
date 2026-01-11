import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SessionManager } from "../../../src/session/manager";

describe("SessionManager upload management", () => {
	let manager: SessionManager;
	let sessionId: string;

	beforeEach(() => {
		manager = new SessionManager();
		const session = manager.createSession();
		sessionId = session.id;
	});

	afterEach(() => {
		manager.stopCleanupInterval();
	});

	describe("registerUpload", () => {
		it("registers upload and returns ID", () => {
			const data = new ArrayBuffer(100);
			const id = manager.registerUpload(sessionId, data, "test.txt", "text/plain");
			expect(id).toBeDefined();
			expect(typeof id).toBe("string");
		});

		it("returns UUID format ID", () => {
			const data = new ArrayBuffer(100);
			const id = manager.registerUpload(sessionId, data, "test.txt", "text/plain");
			// UUID v4 format
			expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
		});

		it("generates unique IDs for each upload", () => {
			const ids = new Set<string | null>();
			for (let i = 0; i < 10; i++) {
				const id = manager.registerUpload(
					sessionId,
					new ArrayBuffer(10),
					`file${i}.txt`,
					"text/plain",
				);
				ids.add(id);
			}
			expect(ids.size).toBe(10);
		});

		it("returns null for invalid session", () => {
			const data = new ArrayBuffer(100);
			const id = manager.registerUpload("invalid-session-id", data, "test.txt", "text/plain");
			expect(id).toBeNull();
		});
	});

	describe("getUpload", () => {
		it("retrieves uploaded data", () => {
			const data = new TextEncoder().encode("content").buffer;
			const id = manager.registerUpload(sessionId, data, "test.txt", "text/plain");
			expect(id).not.toBeNull();
			if (id === null) return;

			const upload = manager.getUpload(sessionId, id);
			expect(upload).not.toBeNull();
			expect(upload?.originalName).toBe("test.txt");
			expect(upload?.verifiedMime).toBe("text/plain");
			expect(upload?.size).toBe(7);
		});

		it("returns null for unknown upload ID", () => {
			const upload = manager.getUpload(sessionId, "unknown-id");
			expect(upload).toBeNull();
		});

		it("returns null for invalid session", () => {
			const data = new ArrayBuffer(100);
			const id = manager.registerUpload(sessionId, data, "test.txt", "text/plain");
			expect(id).not.toBeNull();
			if (id === null) return;

			const upload = manager.getUpload("invalid-session", id);
			expect(upload).toBeNull();
		});

		it("does not delete upload after retrieval", () => {
			const data = new ArrayBuffer(100);
			const id = manager.registerUpload(sessionId, data, "test.txt", "text/plain");
			expect(id).not.toBeNull();
			if (id === null) return;

			// First retrieval
			const upload1 = manager.getUpload(sessionId, id);
			expect(upload1).not.toBeNull();

			// Second retrieval should still work
			const upload2 = manager.getUpload(sessionId, id);
			expect(upload2).not.toBeNull();
		});
	});

	describe("file count limit", () => {
		it("enforces file count limit per session", () => {
			// Register up to limit
			const ids: (string | null)[] = [];
			for (let i = 0; i < 100; i++) {
				const id = manager.registerUpload(
					sessionId,
					new ArrayBuffer(10),
					`file${i}.txt`,
					"text/plain",
				);
				ids.push(id);
			}

			// All 100 should succeed
			expect(ids.filter((id) => id !== null)).toHaveLength(100);

			// 101st should fail
			const overflowId = manager.registerUpload(
				sessionId,
				new ArrayBuffer(10),
				"overflow.txt",
				"text/plain",
			);
			expect(overflowId).toBeNull();
		});

		it("different sessions have separate limits", () => {
			// Fill first session
			for (let i = 0; i < 100; i++) {
				manager.registerUpload(sessionId, new ArrayBuffer(10), `file${i}.txt`, "text/plain");
			}

			// Create second session
			const session2 = manager.createSession();

			// Second session should be able to upload
			const id = manager.registerUpload(
				session2.id,
				new ArrayBuffer(10),
				"newfile.txt",
				"text/plain",
			);
			expect(id).not.toBeNull();
		});
	});

	describe("removeUpload", () => {
		it("removes specific upload", () => {
			const id = manager.registerUpload(sessionId, new ArrayBuffer(100), "test.txt", "text/plain");
			expect(id).not.toBeNull();
			if (id === null) return;

			const removed = manager.removeUpload(sessionId, id);
			expect(removed).toBe(true);

			const upload = manager.getUpload(sessionId, id);
			expect(upload).toBeNull();
		});

		it("returns false for unknown upload", () => {
			const removed = manager.removeUpload(sessionId, "unknown-id");
			expect(removed).toBe(false);
		});

		it("allows new upload after removal", () => {
			// Fill to limit
			const ids: string[] = [];
			for (let i = 0; i < 100; i++) {
				const id = manager.registerUpload(
					sessionId,
					new ArrayBuffer(10),
					`file${i}.txt`,
					"text/plain",
				);
				if (id) ids.push(id);
			}

			// Remove one
			manager.removeUpload(sessionId, ids[0]);

			// Should be able to add one more
			const newId = manager.registerUpload(sessionId, new ArrayBuffer(10), "new.txt", "text/plain");
			expect(newId).not.toBeNull();
		});
	});

	describe("getUploadCount", () => {
		it("returns correct count", () => {
			expect(manager.getUploadCount(sessionId)).toBe(0);

			manager.registerUpload(sessionId, new ArrayBuffer(10), "file1.txt", "text/plain");
			expect(manager.getUploadCount(sessionId)).toBe(1);

			manager.registerUpload(sessionId, new ArrayBuffer(10), "file2.txt", "text/plain");
			expect(manager.getUploadCount(sessionId)).toBe(2);
		});

		it("returns 0 for invalid session", () => {
			expect(manager.getUploadCount("invalid-session")).toBe(0);
		});
	});

	describe("session cleanup", () => {
		it("deletes uploads when session is destroyed", () => {
			const id = manager.registerUpload(sessionId, new ArrayBuffer(100), "test.txt", "text/plain");
			expect(id).not.toBeNull();
			if (id === null) return;

			// Delete session
			manager.deleteSession(sessionId);

			// Upload should be gone
			const upload = manager.getUpload(sessionId, id);
			expect(upload).toBeNull();
		});
	});

	describe("getSessionUploads", () => {
		it("returns all uploads for session", () => {
			manager.registerUpload(sessionId, new ArrayBuffer(10), "file1.txt", "text/plain");
			manager.registerUpload(sessionId, new ArrayBuffer(20), "file2.txt", "text/plain");
			manager.registerUpload(sessionId, new ArrayBuffer(30), "file3.txt", "text/plain");

			const uploads = manager.getSessionUploads(sessionId);
			expect(uploads).toHaveLength(3);
		});

		it("returns empty array for session with no uploads", () => {
			const uploads = manager.getSessionUploads(sessionId);
			expect(uploads).toEqual([]);
		});

		it("returns empty array for invalid session", () => {
			const uploads = manager.getSessionUploads("invalid-session");
			expect(uploads).toEqual([]);
		});
	});
});
