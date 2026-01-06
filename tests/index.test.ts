import { describe, expect, it } from "vitest";
import { kt } from "../src/kt";
import { clearContext, getContext, setContext } from "../src/runtime/context";
import { rerun } from "../src/runtime/rerun";
// Note: Import individual modules to avoid hono/bun dependency in Node.js test environment
import {
	getSessionManager,
	resetSessionManager,
	SessionManager,
	setSessionManager,
} from "../src/session/manager";
import { getCurrentSessionId, session_state, setCurrentSessionId } from "../src/session/state";
import { button } from "../src/widgets/button";
import { resetWidgetCounter } from "../src/widgets/registry";
import { selectbox } from "../src/widgets/selectbox";
import { slider } from "../src/widgets/slider";
import { text_input } from "../src/widgets/text-input";

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
		expect(kt.set_page_config).toBeDefined();
		expect(kt.rerun).toBeDefined();
		expect(kt.write).toBeDefined();
		expect(kt.title).toBeDefined();
		expect(kt.header).toBeDefined();
		expect(kt.subheader).toBeDefined();
		expect(kt.text).toBeDefined();
		expect(kt.divider).toBeDefined();
		expect(kt.html).toBeDefined();
		expect(kt.table).toBeDefined();
		expect(kt.button).toBeDefined();
		expect(kt.slider).toBeDefined();
		expect(kt.text_input).toBeDefined();
		expect(kt.selectbox).toBeDefined();
		expect(kt.download_button).toBeDefined();
		expect(kt.tabs).toBeDefined();
	});
});
