/**
 * チュートリアル8: カンバンボード
 *
 * 使用API: columns, container, button, text_input, selectbox, expander,
 *          session state, metric, form, form_submit_button
 *
 * タスクを「未着手」「進行中」「完了」のカラムで管理するカンバンボード
 *
 * 使用方法:
 *   bun run examples/tutorials/08-kanban-board.ts
 */
import { createApp } from "../../src/app";
import { kt } from "../../src/kt";
import { serve } from "../../src/serve";
import { createTypedSessionState } from "../../src/session";

type Priority = "高" | "中" | "低";
type KanbanStatus = "todo" | "in_progress" | "done";

type KanbanTask = {
	id: number;
	title: string;
	description: string;
	priority: Priority;
	status: KanbanStatus;
	createdAt: string;
};

type AppState = {
	tasks: KanbanTask[];
	nextId: number;
};

const state = createTypedSessionState<AppState>({
	tasks: [
		{
			id: 1,
			title: "要件定義",
			description: "プロジェクトの要件を整理する",
			priority: "高",
			status: "done",
			createdAt: "2026-02-19",
		},
		{
			id: 2,
			title: "UIデザイン",
			description: "画面モックアップを作成",
			priority: "中",
			status: "in_progress",
			createdAt: "2026-02-20",
		},
		{
			id: 3,
			title: "API設計",
			description: "RESTful APIのエンドポイントを設計",
			priority: "高",
			status: "in_progress",
			createdAt: "2026-02-20",
		},
		{
			id: 4,
			title: "テスト作成",
			description: "ユニットテストとE2Eテストを作成",
			priority: "中",
			status: "todo",
			createdAt: "2026-02-21",
		},
		{
			id: 5,
			title: "ドキュメント作成",
			description: "APIドキュメントとREADMEを作成",
			priority: "低",
			status: "todo",
			createdAt: "2026-02-21",
		},
	],
	nextId: 6,
});

function getStatusLabel(status: KanbanStatus): string {
	switch (status) {
		case "todo":
			return "未着手";
		case "in_progress":
			return "進行中";
		case "done":
			return "完了";
	}
}

function getPriorityColor(priority: Priority): "error" | "warning" | "info" {
	switch (priority) {
		case "高":
			return "error";
		case "中":
			return "warning";
		case "低":
			return "info";
	}
}

/** タスクの移動ボタンをレンダリング */
function renderMoveButtons(task: KanbanTask, status: KanbanStatus) {
	if (status === "todo") {
		if (kt.button("→ 進行中へ", { key: `move_ip_${task.id}` })) {
			task.status = "in_progress";
		}
	} else if (status === "in_progress") {
		kt.columns(
			[
				() => {
					if (kt.button("← 未着手", { key: `move_todo_${task.id}` })) {
						task.status = "todo";
					}
				},
				() => {
					if (kt.button("完了 →", { key: `move_done_${task.id}` })) {
						task.status = "done";
					}
				},
			],
			{ ratios: [1, 1] },
		);
	} else {
		if (kt.button("← 進行中へ", { key: `move_back_${task.id}` })) {
			task.status = "in_progress";
		}
	}
}

/** タスクカードをレンダリング */
function renderTaskCard(task: KanbanTask, status: KanbanStatus) {
	kt.container(
		() => {
			const priorityAlert = kt[getPriorityColor(task.priority)];
			priorityAlert(`[${task.priority}] ${task.title}`);

			if (task.description) {
				kt.caption(task.description);
			}

			renderMoveButtons(task, status);

			if (kt.button("削除", { key: `del_${task.id}` })) {
				state.tasks = state.tasks.filter((t) => t.id !== task.id);
			}
		},
		{ border: true },
	);
}

function renderColumn(status: KanbanStatus) {
	const tasks = state.tasks.filter((t) => t.status === status);
	const label = getStatusLabel(status);

	kt.subheader(`${label} (${tasks.length})`);

	if (tasks.length === 0) {
		kt.caption("タスクなし");
		return;
	}

	for (const task of tasks) {
		renderTaskCard(task, status);
	}
}

const script = () => {
	kt.set_page_config({ title: "カンバンボード", layout: "wide" });
	kt.title("カンバンボード");
	kt.write("タスクをカラム間で移動して進捗を管理します。");
	kt.divider();

	// メトリクス
	const todoCount = state.tasks.filter((t) => t.status === "todo").length;
	const ipCount = state.tasks.filter((t) => t.status === "in_progress").length;
	const doneCount = state.tasks.filter((t) => t.status === "done").length;

	kt.columns(
		[
			() => kt.metric("未着手", todoCount.toString()),
			() => kt.metric("進行中", ipCount.toString()),
			() => kt.metric("完了", doneCount.toString()),
			() => kt.metric("合計", state.tasks.length.toString()),
		],
		{ ratios: [1, 1, 1, 1] },
	);

	kt.divider();

	// 新規タスク追加
	kt.expander("新しいタスクを追加", () => {
		kt.form(
			"add_task",
			() => {
				const title = kt.text_input("タスク名", "", {
					key: "new_title",
					placeholder: "タスク名を入力...",
				});
				const description = kt.text_area("説明", "", {
					key: "new_desc",
					placeholder: "タスクの説明（任意）...",
				});
				const priority = kt.radio("優先度", ["高", "中", "低"], "中", {
					key: "new_priority",
				});

				if (kt.form_submit_button("追加", { key: "add_btn" })) {
					if (!title.trim()) {
						kt.validation_error("タスク名を入力してください");
						return;
					}

					state.tasks.push({
						id: state.nextId++,
						title: title.trim(),
						description: description.trim(),
						priority: priority as Priority,
						status: "todo",
						createdAt: new Date().toISOString().split("T")[0],
					});
					kt.success("タスクを追加しました");
				}
			},
			{ clear_on_submit: true },
		);
	});

	kt.divider();

	// カンバンボード
	kt.columns(
		[() => renderColumn("todo"), () => renderColumn("in_progress"), () => renderColumn("done")],
		{ ratios: [1, 1, 1] },
	);
	return undefined;
};

const kantanApp = await createApp(script);
const { shutdown } = serve(kantanApp, { port: 3208 });

console.log("Kanban Board running at http://localhost:3208");

process.on("SIGINT", () => {
	console.log("\nShutting down...");
	shutdown();
	process.exit(0);
});
