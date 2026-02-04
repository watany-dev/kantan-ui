/**
 * チュートリアル12章: TODOアプリのコード検証
 */
import { createApp, createTypedSessionState, kt } from "../../src/index";

type Todo = {
	id: number;
	text: string;
	done: boolean;
};

type TodoState = {
	todos: Todo[];
	nextId: number;
	newTodoText: string;
};

const state = createTypedSessionState<TodoState>({
	todos: [],
	nextId: 1,
	newTodoText: "",
});

/** 新しいTODOを追加するセクション */
function addTodoSection() {
	kt.subheader("新しいタスクを追加");

	const inputText = kt.text_input("タスク", state.newTodoText, {
		key: "new_todo",
		placeholder: "やることを入力...",
	});
	state.newTodoText = inputText;

	if (kt.button("追加", { key: "add_btn" })) {
		if (state.newTodoText.trim() !== "") {
			state.todos.push({
				id: state.nextId++,
				text: state.newTodoText,
				done: false,
			});
			state.newTodoText = "";
		}
	}
}

/** TODOリストを表示するセクション */
function todoListSection() {
	kt.subheader(`タスク一覧 (${state.todos.length}件)`);

	if (state.todos.length === 0) {
		kt.write("タスクがありません。");
		return;
	}

	for (const todo of state.todos) {
		const status = todo.done ? "[完了]" : "[未完了]";
		kt.write(`${status} ${todo.text}`);

		if (
			kt.button(todo.done ? "未完了に戻す" : "完了", {
				key: `toggle_${todo.id}`,
			})
		) {
			todo.done = !todo.done;
		}

		if (kt.button("削除", { key: `delete_${todo.id}` })) {
			state.todos = state.todos.filter((t) => t.id !== todo.id);
		}
	}
}

/** 統計情報セクション */
function statsSection() {
	const completed = state.todos.filter((t) => t.done).length;
	kt.write(`完了: ${completed} / ${state.todos.length}`);

	if (state.todos.length > 0) {
		if (kt.button("すべて削除", { key: "clear_all" })) {
			state.todos = [];
		}
	}
}

const script = () => {
	kt.title("TODOリスト");
	kt.divider();

	addTodoSection();
	kt.divider();

	todoListSection();
	kt.divider();

	statsSection();

	return undefined;
};

const app = await createApp(script, { port: 3102 });
console.log("TODO app test: App created successfully");

const server = Bun.serve({
	port: 3102,
	fetch: app.fetch,
	websocket: app.websocket,
});
console.log(`Server started at http://localhost:${server.port}`);

setTimeout(() => {
	server.stop();
	console.log("Server stopped");
	process.exit(0);
}, 1000);
