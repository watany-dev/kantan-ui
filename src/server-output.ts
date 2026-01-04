import { createApp } from "./app";
import { kt } from "./kt";
import { createTypedSessionState } from "./session";

/**
 * 出力API専用デモサーバー（E2Eテスト用）
 * port: 3003
 *
 * テスト対象:
 * - kt.write()
 * - kt.title()
 * - kt.header()
 * - kt.subheader()
 * - kt.text()
 * - kt.divider()
 * - kt.html()
 */

type AppState = {
	showElement: boolean;
};

const state = createTypedSessionState<AppState>({
	showElement: true,
});

const script = () => {
	// kt.title() テスト
	kt.title("Output API Test");

	// kt.write() テスト - 文字列
	kt.write("This is a write output");

	// kt.write() テスト - 数値
	kt.write(42);

	// kt.write() テスト - 真偽値
	kt.write(true);

	// kt.write() テスト - HTMLエスケープ
	kt.write("<script>alert('xss')</script>");

	// kt.divider() テスト
	kt.divider();

	// kt.header() テスト
	kt.header("Header Section");

	// kt.subheader() テスト
	kt.subheader("Subheader Section");

	// kt.text() テスト（writeのエイリアス）
	kt.text("This is text output");

	kt.divider();

	// kt.html() テスト - 生のHTML出力
	kt.html('<div id="custom-html" class="custom-class">Custom HTML Content</div>');

	kt.divider();

	// removeNode テスト用のトグル機能
	kt.header("Toggle Element Test");

	if (kt.button("Toggle Element", { key: "btn_toggle" })) {
		state.showElement = !state.showElement;
	}

	if (state.showElement) {
		kt.html('<div id="removable-element" class="kt-write">This element can be removed</div>');
	}

	kt.html(`<div id="toggle-status" class="kt-write">Element visible: ${state.showElement}</div>`);

	return undefined;
};

const { app, websocket } = createApp(script);

export default {
	fetch: app.fetch,
	websocket,
};
