import { describe, expect, it } from "vitest";
// Note: Import individual modules to avoid hono/bun dependency in Node.js test environment
import {
	SessionManager,
	getSessionManager,
	setSessionManager,
	resetSessionManager,
} from "../src/session/manager";
import { session_state, setCurrentSessionId, getCurrentSessionId } from "../src/session/state";
import { rerun } from "../src/runtime/rerun";
import { getContext, setContext, clearContext } from "../src/runtime/context";
import { button } from "../src/widgets/button";
import { slider } from "../src/widgets/slider";
import { text_input } from "../src/widgets/text-input";
import { selectbox } from "../src/widgets/selectbox";
import { resetWidgetCounter } from "../src/widgets/registry";
import { kt } from "../src/kt";

describe("kantan-ui module exports", () => {
	it("should export runtime functions", () => {
		expect(rerun).toBeDefined();
		expect(getContext).toBeDefined();
		expect(setContext).toBeDefined();
		expect(clearContext).toBeDefined();
	});

	it("should export session management", () => {
		expect(SessionManager).toBeDefined();
		expect(getSessionManager).toBeDefined();
		expect(setSessionManager).toBeDefined();
		expect(resetSessionManager).toBeDefined();
		expect(session_state).toBeDefined();
		expect(setCurrentSessionId).toBeDefined();
		expect(getCurrentSessionId).toBeDefined();
	});

	it("should export widget functions", () => {
		expect(button).toBeDefined();
		expect(slider).toBeDefined();
		expect(text_input).toBeDefined();
		expect(selectbox).toBeDefined();
		expect(resetWidgetCounter).toBeDefined();
	});

	it("should export kt object with all APIs", () => {
		expect(kt).toBeDefined();
		expect(kt.write).toBeDefined();
		expect(kt.title).toBeDefined();
		expect(kt.header).toBeDefined();
		expect(kt.subheader).toBeDefined();
		expect(kt.text).toBeDefined();
		expect(kt.divider).toBeDefined();
		expect(kt.html).toBeDefined();
		expect(kt.button).toBeDefined();
		expect(kt.slider).toBeDefined();
		expect(kt.text_input).toBeDefined();
		expect(kt.selectbox).toBeDefined();
	});
});
