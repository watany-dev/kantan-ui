import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getSessionManager } from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { createPlaceholder } from "../../../src/widgets/placeholder";
import { getWidgetValue, resetWidgetCounter } from "../../../src/widgets/registry";
import type { PlaceholderState } from "../../../src/widgets/types";

describe("createPlaceholder", () => {
	let testSessionId: string;

	beforeEach(() => {
		resetWidgetCounter();
		const session = getSessionManager().createSession();
		testSessionId = session.id;
		setCurrentSessionId(testSessionId);
	});

	afterEach(() => {
		getSessionManager().deleteSession(testSessionId);
		setCurrentSessionId(null);
	});

	it("has readonly id property", () => {
		const p = createPlaceholder("test-id");
		expect(p.id).toBe("test-id");
	});

	describe("write()", () => {
		it("updates state with escaped HTML", () => {
			const p = createPlaceholder("test-write");
			p.write("<script>alert(1)</script>");
			const state = getWidgetValue<PlaceholderState>("test-write", {
				html: "",
				contentType: "empty",
			});
			expect(state.html).toContain("&lt;script&gt;");
			expect(state.html).not.toContain("<script>");
			expect(state.contentType).toBe("write");
		});

		it("converts numbers to string", () => {
			const p = createPlaceholder("test-write-num");
			p.write(42);
			const state = getWidgetValue<PlaceholderState>("test-write-num", {
				html: "",
				contentType: "empty",
			});
			expect(state.html).toContain("42");
			expect(state.contentType).toBe("write");
		});

		it("converts booleans to string", () => {
			const p = createPlaceholder("test-write-bool");
			p.write(true);
			const state = getWidgetValue<PlaceholderState>("test-write-bool", {
				html: "",
				contentType: "empty",
			});
			expect(state.html).toContain("true");
		});
	});

	describe("text()", () => {
		it("creates text HTML", () => {
			const p = createPlaceholder("test-text");
			p.text("Hello World");
			const state = getWidgetValue<PlaceholderState>("test-text", {
				html: "",
				contentType: "empty",
			});
			expect(state.html).toContain("kt-text");
			expect(state.html).toContain("Hello World");
			expect(state.contentType).toBe("text");
		});
	});

	describe("success()", () => {
		it("creates success alert HTML", () => {
			const p = createPlaceholder("test-success");
			p.success("Done!");
			const state = getWidgetValue<PlaceholderState>("test-success", {
				html: "",
				contentType: "empty",
			});
			expect(state.html).toContain("kt-alert");
			expect(state.html).toContain("kt-alert-success");
			expect(state.html).toContain("Done!");
			expect(state.contentType).toBe("success");
		});
	});

	describe("error()", () => {
		it("creates error alert HTML", () => {
			const p = createPlaceholder("test-error");
			p.error("Something went wrong");
			const state = getWidgetValue<PlaceholderState>("test-error", {
				html: "",
				contentType: "empty",
			});
			expect(state.html).toContain("kt-alert-error");
			expect(state.html).toContain("Something went wrong");
			expect(state.contentType).toBe("error");
		});
	});

	describe("warning()", () => {
		it("creates warning alert HTML", () => {
			const p = createPlaceholder("test-warning");
			p.warning("Be careful");
			const state = getWidgetValue<PlaceholderState>("test-warning", {
				html: "",
				contentType: "empty",
			});
			expect(state.html).toContain("kt-alert-warning");
			expect(state.html).toContain("Be careful");
			expect(state.contentType).toBe("warning");
		});
	});

	describe("info()", () => {
		it("creates info alert HTML", () => {
			const p = createPlaceholder("test-info");
			p.info("FYI");
			const state = getWidgetValue<PlaceholderState>("test-info", {
				html: "",
				contentType: "empty",
			});
			expect(state.html).toContain("kt-alert-info");
			expect(state.html).toContain("FYI");
			expect(state.contentType).toBe("info");
		});
	});

	describe("empty()", () => {
		it("clears content", () => {
			const p = createPlaceholder("test-empty");
			p.write("Hello");
			p.empty();
			const state = getWidgetValue<PlaceholderState>("test-empty", {
				html: "fallback",
				contentType: "write",
			});
			expect(state.html).toBe("");
			expect(state.contentType).toBe("empty");
		});
	});

	describe("spinner()", () => {
		it("creates spinner HTML without text", () => {
			const p = createPlaceholder("test-spinner");
			p.spinner();
			const state = getWidgetValue<PlaceholderState>("test-spinner", {
				html: "",
				contentType: "empty",
			});
			expect(state.html).toContain("kt-spinner");
			expect(state.contentType).toBe("spinner");
		});

		it("creates spinner HTML with text", () => {
			const p = createPlaceholder("test-spinner-text");
			p.spinner("Loading...");
			const state = getWidgetValue<PlaceholderState>("test-spinner-text", {
				html: "",
				contentType: "empty",
			});
			expect(state.html).toContain("kt-spinner");
			expect(state.html).toContain("Loading...");
		});
	});

	describe("progress()", () => {
		it("creates progress HTML", () => {
			const p = createPlaceholder("test-progress");
			p.progress(0.5);
			const state = getWidgetValue<PlaceholderState>("test-progress", {
				html: "",
				contentType: "empty",
			});
			expect(state.html).toContain("kt-progress");
			expect(state.html).toContain('value="50"');
			expect(state.contentType).toBe("progress");
		});

		it("clamps value between 0 and 1 (upper)", () => {
			const p = createPlaceholder("test-progress-clamp-upper");
			p.progress(1.5);
			const state = getWidgetValue<PlaceholderState>("test-progress-clamp-upper", {
				html: "",
				contentType: "empty",
			});
			expect(state.html).toContain('value="100"');
		});

		it("clamps value between 0 and 1 (lower)", () => {
			const p = createPlaceholder("test-progress-clamp-lower");
			p.progress(-0.5);
			const state = getWidgetValue<PlaceholderState>("test-progress-clamp-lower", {
				html: "",
				contentType: "empty",
			});
			expect(state.html).toContain('value="0"');
		});

		it("includes text when provided", () => {
			const p = createPlaceholder("test-progress-text");
			p.progress(0.75, { text: "75% complete" });
			const state = getWidgetValue<PlaceholderState>("test-progress-text", {
				html: "",
				contentType: "empty",
			});
			expect(state.html).toContain("75% complete");
		});
	});

	describe("markdown()", () => {
		it("creates markdown HTML", () => {
			const p = createPlaceholder("test-md");
			p.markdown("**bold** text");
			const state = getWidgetValue<PlaceholderState>("test-md", {
				html: "",
				contentType: "empty",
			});
			expect(state.html).toContain("kt-markdown");
			expect(state.contentType).toBe("markdown");
		});
	});

	describe("html()", () => {
		it("creates raw HTML (unsafe)", () => {
			const p = createPlaceholder("test-html");
			p.html("<div class='custom'>Custom HTML</div>");
			const state = getWidgetValue<PlaceholderState>("test-html", {
				html: "",
				contentType: "empty",
			});
			expect(state.html).toContain("kt-html");
			expect(state.html).toContain("Custom HTML");
			expect(state.contentType).toBe("html");
		});
	});

	describe("json()", () => {
		it("creates formatted JSON HTML", () => {
			const p = createPlaceholder("test-json");
			p.json({ name: "test", value: 123 });
			const state = getWidgetValue<PlaceholderState>("test-json", {
				html: "",
				contentType: "empty",
			});
			expect(state.html).toContain("kt-json");
			expect(state.html).toContain("name");
			expect(state.html).toContain("test");
			expect(state.contentType).toBe("json");
		});
	});

	describe("code()", () => {
		it("creates code block HTML", () => {
			const p = createPlaceholder("test-code");
			p.code("const x = 1;", "typescript");
			const state = getWidgetValue<PlaceholderState>("test-code", {
				html: "",
				contentType: "empty",
			});
			expect(state.html).toContain("kt-code");
			expect(state.html).toContain("const x = 1;");
			expect(state.contentType).toBe("code");
		});

		it("escapes code content", () => {
			const p = createPlaceholder("test-code-escape");
			p.code("<script>alert(1)</script>");
			const state = getWidgetValue<PlaceholderState>("test-code-escape", {
				html: "",
				contentType: "empty",
			});
			expect(state.html).not.toContain("<script>");
			expect(state.html).toContain("&lt;script&gt;");
		});
	});
});
