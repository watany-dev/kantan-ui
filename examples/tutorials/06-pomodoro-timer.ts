/**
 * チュートリアル6: ポモドーロタイマー
 *
 * 使用API: button, progress, empty, session state, metric, columns, selectbox
 *
 * 作業時間と休憩時間を管理するポモドーロ・テクニックタイマー
 * ※ サーバーサイドで動作するため、タイマーはボタン操作で進行をシミュレートします
 *
 * 使用方法:
 *   bun run examples/tutorials/06-pomodoro-timer.ts
 */
import { createApp } from "../../src/app";
import { kt } from "../../src/kt";
import { serve } from "../../src/serve";
import { createTypedSessionState } from "../../src/session";

type TimerPhase = "idle" | "work" | "short_break" | "long_break";

type AppState = {
	phase: TimerPhase;
	totalPomodoros: number;
	currentPomodoro: number;
	minutesRemaining: number;
	workMinutes: number;
	shortBreakMinutes: number;
	longBreakMinutes: number;
	pomodorosUntilLongBreak: number;
	taskLog: Array<{ task: string; pomodoros: number }>;
	currentTask: string;
};

const state = createTypedSessionState<AppState>({
	phase: "idle",
	totalPomodoros: 0,
	currentPomodoro: 0,
	minutesRemaining: 25,
	workMinutes: 25,
	shortBreakMinutes: 5,
	longBreakMinutes: 15,
	pomodorosUntilLongBreak: 4,
	taskLog: [],
	currentTask: "",
});

function getPhaseLabel(phase: TimerPhase): string {
	switch (phase) {
		case "work":
			return "作業中";
		case "short_break":
			return "小休憩";
		case "long_break":
			return "長休憩";
		default:
			return "待機中";
	}
}

function getPhaseDuration(phase: TimerPhase): number {
	switch (phase) {
		case "work":
			return state.workMinutes;
		case "short_break":
			return state.shortBreakMinutes;
		case "long_break":
			return state.longBreakMinutes;
		default:
			return state.workMinutes;
	}
}

/** タスクログを更新する */
function recordTaskLog() {
	if (!state.currentTask) return;
	const existing = state.taskLog.find((t) => t.task === state.currentTask);
	if (existing) {
		existing.pomodoros++;
	} else {
		state.taskLog.push({ task: state.currentTask, pomodoros: 1 });
	}
}

/** 作業フェーズ完了時の処理 */
function completeWorkPhase() {
	state.totalPomodoros++;
	state.currentPomodoro++;
	recordTaskLog();

	if (state.currentPomodoro >= state.pomodorosUntilLongBreak) {
		state.phase = "long_break";
		state.minutesRemaining = state.longBreakMinutes;
		state.currentPomodoro = 0;
	} else {
		state.phase = "short_break";
		state.minutesRemaining = state.shortBreakMinutes;
	}
}

/** フェーズ完了ボタンの処理 */
function handlePhaseComplete() {
	if (state.phase === "work") {
		completeWorkPhase();
	} else {
		state.phase = "idle";
		state.minutesRemaining = state.workMinutes;
	}
}

/** サイドバーの設定UI */
function renderSidebar() {
	kt.header("設定");
	state.workMinutes = kt.slider("作業時間 (分)", 1, 60, state.workMinutes, {
		key: "work_min",
	});
	state.shortBreakMinutes = kt.slider("小休憩 (分)", 1, 30, state.shortBreakMinutes, {
		key: "short_break_min",
	});
	state.longBreakMinutes = kt.slider("長休憩 (分)", 1, 60, state.longBreakMinutes, {
		key: "long_break_min",
	});
	state.pomodorosUntilLongBreak = kt.slider(
		"長休憩までのポモドーロ数",
		2,
		8,
		state.pomodorosUntilLongBreak,
		{ key: "pom_until_long" },
	);

	kt.divider();
	kt.header("使い方");
	kt.write("1. タスク名を入力");
	kt.write("2. 「開始」ボタンで作業スタート");
	kt.write("3. 「完了」ボタンで次のフェーズへ");
	kt.write("4. 作業と休憩を繰り返す");
}

/** タスクログセクション */
function renderTaskLog() {
	kt.header("タスクログ");
	if (state.taskLog.length === 0) {
		kt.info("まだタスクが記録されていません。");
		return;
	}

	kt.table(
		state.taskLog.map((t) => ({
			タスク: t.task,
			ポモドーロ数: t.pomodoros,
			作業時間: `${t.pomodoros * state.workMinutes}分`,
		})),
	);

	const totalWork = state.taskLog.reduce((sum, t) => sum + t.pomodoros, 0);
	kt.metric("合計作業時間", `${totalWork * state.workMinutes}分`, {
		delta: `${totalWork}ポモドーロ`,
		delta_color: "off",
	});
}

const script = () => {
	kt.set_page_config({ title: "ポモドーロタイマー" });
	kt.title("ポモドーロタイマー");
	kt.write("ポモドーロ・テクニックで集中力を管理しましょう。");
	kt.divider();

	kt.sidebar(renderSidebar);

	// メトリクス
	kt.columns(
		[
			() => kt.metric("フェーズ", getPhaseLabel(state.phase)),
			() => kt.metric("完了ポモドーロ", state.totalPomodoros.toString()),
			() => {
				const duration = getPhaseDuration(state.phase);
				kt.metric("残り時間", `${state.minutesRemaining}/${duration}分`);
			},
			() => {
				const progress = `${state.currentPomodoro}/${state.pomodorosUntilLongBreak}`;
				kt.metric("次の長休憩まで", progress);
			},
		],
		{ ratios: [1, 1, 1, 1] },
	);

	kt.divider();

	// タイマー表示
	const phaseDuration = getPhaseDuration(state.phase);
	const progressValue = state.phase === "idle" ? 0 : 1 - state.minutesRemaining / phaseDuration;

	if (state.phase !== "idle") {
		const label = getPhaseLabel(state.phase);
		kt.progress(progressValue, { label: `${label}: ${state.minutesRemaining}分残り` });
	}

	// タスク入力
	if (state.phase === "idle") {
		state.currentTask = kt.text_input("現在のタスク", state.currentTask, {
			key: "task_input",
			placeholder: "取り組むタスクを入力...",
		});
	} else {
		kt.info(`現在のタスク: ${state.currentTask || "未設定"}`);
	}

	kt.divider();

	// コントロールボタン
	kt.columns(
		[
			() => {
				if (state.phase === "idle" && kt.button("作業を開始", { key: "start" })) {
					state.phase = "work";
					state.minutesRemaining = state.workMinutes;
				}
			},
			() => {
				if (state.phase !== "idle" && kt.button("5分経過", { key: "tick" })) {
					state.minutesRemaining = Math.max(0, state.minutesRemaining - 5);
				}
			},
			() => {
				if (state.phase !== "idle" && kt.button("フェーズ完了", { key: "complete" })) {
					handlePhaseComplete();
				}
			},
			() => {
				if (state.phase !== "idle" && kt.button("リセット", { key: "reset" })) {
					state.phase = "idle";
					state.minutesRemaining = state.workMinutes;
				}
			},
		],
		{ ratios: [1, 1, 1, 1] },
	);

	kt.divider();
	renderTaskLog();
	return undefined;
};

const kantanApp = await createApp(script);
const { shutdown } = serve(kantanApp, { port: 3206 });

console.log("Pomodoro Timer running at http://localhost:3206");

process.on("SIGINT", () => {
	console.log("\nShutting down...");
	shutdown();
	process.exit(0);
});
