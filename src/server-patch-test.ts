import { createApp } from "./app";
import { kt } from "./kt";
import { createTypedSessionState } from "./session";

/**
 * パッチ操作テスト用サーバー
 *
 * 動的リスト管理でinsertNode, removeNodeパッチを検証するためのテストアプリ
 */

type AppState = {
	items: string[];
	nextId: number;
};

const state = createTypedSessionState<AppState>({
	items: ["Item 1", "Item 2", "Item 3"],
	nextId: 4,
});

const script = () => {
	kt.title("Patch Operations Test");
	kt.write("動的リスト管理でパッチ操作をテストします。");

	kt.divider();

	// アイテム追加ボタン
	if (kt.button("Add Item", { key: "btn_add" })) {
		state.items = [...state.items, `Item ${state.nextId}`];
		state.nextId++;
	}

	// アイテム削除ボタン（最後のアイテムを削除）
	if (kt.button("Remove Last", { key: "btn_remove" })) {
		if (state.items.length > 0) {
			state.items = state.items.slice(0, -1);
		}
	}

	// 先頭に追加ボタン
	if (kt.button("Add to Start", { key: "btn_add_start" })) {
		state.items = [`Item ${state.nextId}`, ...state.items];
		state.nextId++;
	}

	// 先頭を削除ボタン
	if (kt.button("Remove First", { key: "btn_remove_first" })) {
		if (state.items.length > 0) {
			state.items = state.items.slice(1);
		}
	}

	// 全削除ボタン
	if (kt.button("Clear All", { key: "btn_clear" })) {
		state.items = [];
	}

	kt.divider();

	kt.header("Item List");

	// リストを表示
	kt.html(`<ul id="item-list">`);
	for (const item of state.items) {
		kt.html(`<li class="list-item">${item}</li>`);
	}
	kt.html(`</ul>`);

	// アイテム数表示
	kt.html(`<div id="item-count" class="kt-write">Total items: ${state.items.length}</div>`);

	kt.divider();

	// デバッグ表示
	kt.subheader("Debug State");
	kt.html(`
		<pre id="debug-state" style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
${JSON.stringify({ items: state.items, nextId: state.nextId }, null, 2)}
		</pre>
	`);

	return undefined;
};

const { app, websocket } = createApp(script, {
	session: { scope: "tab" },
});

export default {
	port: 3003,
	fetch: app.fetch,
	websocket,
};
