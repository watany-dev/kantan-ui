import { describe, expect, it } from "vitest";
import type {
	ClientMessage,
	Patch,
	ReplaceRootPatch,
	ServerMessage,
} from "../../src/websocket/types";

describe("websocket types", () => {
	it("should allow valid ClientMessage with event type", () => {
		const message: ClientMessage = {
			type: "event",
			widgetId: "btn1",
			value: "clicked",
		};

		expect(message.type).toBe("event");
		expect(message.widgetId).toBe("btn1");
		expect(message.value).toBe("clicked");
	});

	it("should allow valid ClientMessage with init type", () => {
		const message: ClientMessage = {
			type: "init",
			sessionId: "abc-123",
		};

		expect(message.type).toBe("init");
		expect(message.sessionId).toBe("abc-123");
	});

	it("should allow ClientMessage with various value types", () => {
		const stringValue: ClientMessage = {
			type: "event",
			widgetId: "input1",
			value: "text",
		};
		expect(stringValue.value).toBe("text");

		const numberValue: ClientMessage = {
			type: "event",
			widgetId: "slider1",
			value: 42,
		};
		expect(numberValue.value).toBe(42);

		const objectValue: ClientMessage = {
			type: "event",
			widgetId: "complex1",
			value: { nested: true },
		};
		expect(objectValue.value).toEqual({ nested: true });
	});

	it("should allow valid ReplaceRootPatch", () => {
		const patch: ReplaceRootPatch = {
			type: "replaceRoot",
			html: "<div>Updated content</div>",
		};

		expect(patch.type).toBe("replaceRoot");
		expect(patch.html).toBe("<div>Updated content</div>");
	});

	it("should allow valid ServerMessage with patches", () => {
		const patches: Patch[] = [
			{ type: "replaceRoot", html: "<div>New content</div>" },
		];

		const message: ServerMessage = {
			type: "patch",
			patches,
		};

		expect(message.type).toBe("patch");
		expect(message.patches).toHaveLength(1);
		expect(message.patches?.[0].type).toBe("replaceRoot");
	});

	it("should allow ServerMessage with sessionId", () => {
		const message: ServerMessage = {
			type: "patch",
			patches: [{ type: "replaceRoot", html: "<div>Content</div>" }],
			sessionId: "session-123",
		};

		expect(message.sessionId).toBe("session-123");
	});
});
