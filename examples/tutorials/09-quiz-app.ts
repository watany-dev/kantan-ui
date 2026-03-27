/**
 * チュートリアル9: クイズアプリ
 *
 * 使用API: radio, session state, progress, metric, button, columns, expander
 *
 * TypeScript/Web開発に関する択一クイズアプリ
 *
 * 使用方法:
 *   bun run examples/tutorials/09-quiz-app.ts
 */
import { createApp } from "../../src/app";
import { kt } from "../../src/kt";
import { serve } from "../../src/serve";
import { createTypedSessionState } from "../../src/session";

type Question = {
	question: string;
	options: string[];
	answer: number; // 0-based index
	explanation: string;
};

const questions: Question[] = [
	{
		question: "TypeScriptの型推論で、`const x = 42` の型は何になりますか？",
		options: ["number", "42", "any", "unknown"],
		answer: 1,
		explanation: "constで宣言された変数はリテラル型になります。`const x = 42` の型は `42` です。",
	},
	{
		question: "以下のうち、JavaScriptのファルシー値でないものはどれですか？",
		options: ['""（空文字列）', "0", "[]（空配列）", "null"],
		answer: 2,
		explanation: "空配列 `[]` はトルーシー値です。空文字列、0、nullはファルシー値です。",
	},
	{
		question: "HTTPステータスコード 204 の意味は何ですか？",
		options: ["OK", "Created", "No Content", "Not Modified"],
		answer: 2,
		explanation: "204 No Content はリクエストは成功したがレスポンスボディがないことを示します。",
	},
	{
		question: "`Promise.all()` はいつ reject されますか？",
		options: [
			"すべてのPromiseが完了した時",
			"いずれかのPromiseがrejectされた時",
			"最後のPromiseが完了した時",
			"タイムアウトした時",
		],
		answer: 1,
		explanation: "`Promise.all()` は渡されたPromiseのいずれかがrejectされた時点でrejectされます。",
	},
	{
		question: "CSS Flexboxで、`justify-content` はどの方向の配置を制御しますか？",
		options: ["交差軸（cross axis）", "主軸（main axis）", "両方", "なし"],
		answer: 1,
		explanation:
			"`justify-content` は主軸（main axis）方向の配置を制御します。交差軸は `align-items` で制御します。",
	},
	{
		question: "Web APIの `fetch()` はデフォルトでどのHTTPメソッドを使いますか？",
		options: ["POST", "GET", "PUT", "PATCH"],
		answer: 1,
		explanation:
			"`fetch()` はデフォルトでGETメソッドを使用します。POSTなどは `method` オプションで指定します。",
	},
	{
		question: "TypeScriptの `unknown` 型と `any` 型の違いは何ですか？",
		options: [
			"違いはない",
			"unknownはanyのエイリアス",
			"unknownは型チェックなしで操作できない",
			"anyは型チェックなしで操作できない",
		],
		answer: 2,
		explanation:
			"`unknown` は型安全な `any` です。`unknown` 型の値を操作するには型ガードや型アサーションが必要です。",
	},
	{
		question: "Honoフレームワークの特徴として正しいものはどれですか？",
		options: ["Node.js専用", "Web標準APIベース", "Expressの後継", "React Server Components専用"],
		answer: 1,
		explanation:
			"HonoはWeb標準APIベースで、Bun、Deno、Cloudflare Workers、Node.jsなど複数のランタイムで動作します。",
	},
];

type AppState = {
	currentQuestion: number;
	answers: (number | null)[];
	showResults: boolean;
	answered: boolean;
};

const state = createTypedSessionState<AppState>({
	currentQuestion: 0,
	answers: questions.map(() => null),
	showResults: false,
	answered: false,
});

function calculateScore(): number {
	let correct = 0;
	for (let i = 0; i < questions.length; i++) {
		if (state.answers[i] === questions[i].answer) {
			correct++;
		}
	}
	return correct;
}

function getGrade(percentage: number): string {
	if (percentage >= 90) return "S";
	if (percentage >= 80) return "A";
	if (percentage >= 60) return "B";
	if (percentage >= 40) return "C";
	return "D";
}

/** 結果画面の表示 */
function renderResults() {
	const score = calculateScore();
	const percentage = Math.round((score / questions.length) * 100);

	kt.header("結果発表");
	kt.columns(
		[
			() => {
				kt.metric("正解数", `${score}/${questions.length}`, {
					delta: `${percentage}%`,
					delta_color: "off",
				});
			},
			() => kt.metric("ランク", getGrade(percentage)),
		],
		{ ratios: [1, 1] },
	);

	kt.progress(percentage / 100, { label: `正解率: ${percentage}%` });

	if (percentage >= 80) {
		kt.success("素晴らしい成績です！");
	} else if (percentage >= 60) {
		kt.info("良い成績です。もう少しで満点！");
	} else {
		kt.warning("もう一度チャレンジしてみましょう！");
	}

	kt.divider();

	kt.header("解答詳細");
	for (let i = 0; i < questions.length; i++) {
		const q = questions[i];
		const userAnswer = state.answers[i];
		const isCorrect = userAnswer === q.answer;

		kt.expander(
			`問${i + 1}: ${isCorrect ? "正解" : "不正解"} - ${q.question}`,
			() => {
				if (isCorrect) {
					kt.success(`正解: ${q.options[q.answer]}`);
				} else {
					kt.error(`あなたの回答: ${userAnswer !== null ? q.options[userAnswer] : "未回答"}`);
					kt.success(`正解: ${q.options[q.answer]}`);
				}
				kt.info(q.explanation);
			},
			{ expanded: !isCorrect },
		);
	}

	kt.divider();

	if (kt.button("もう一度挑戦する", { key: "retry" })) {
		state.currentQuestion = 0;
		state.answers = questions.map(() => null);
		state.showResults = false;
		state.answered = false;
	}
}

/** クイズ問題画面の表示 */
function renderQuestion() {
	const q = questions[state.currentQuestion];
	const questionNum = state.currentQuestion + 1;

	kt.progress(questionNum / questions.length, {
		label: `問 ${questionNum} / ${questions.length}`,
	});

	kt.header(`問${questionNum}: ${q.question}`);

	const selected = kt.radio(
		"回答を選択してください",
		q.options,
		state.answers[state.currentQuestion] !== null
			? q.options[state.answers[state.currentQuestion] as number]
			: undefined,
		{ key: `q_${state.currentQuestion}` },
	);

	const selectedIndex = q.options.indexOf(selected);
	if (selectedIndex >= 0) {
		state.answers[state.currentQuestion] = selectedIndex;
	}

	if (state.answered) {
		const isCorrect = state.answers[state.currentQuestion] === q.answer;
		if (isCorrect) {
			kt.success("正解です！");
		} else {
			kt.error(`不正解です。正解は「${q.options[q.answer]}」です。`);
		}
		kt.info(q.explanation);
	}

	kt.divider();
	renderNavigation();
}

/** ナビゲーションボタン */
function renderNavigation() {
	kt.columns(
		[
			() => {
				if (state.currentQuestion > 0 && kt.button("← 前の問題", { key: "prev" })) {
					state.currentQuestion--;
					state.answered = false;
				}
			},
			() => {
				if (!state.answered && kt.button("回答する", { key: "answer" })) {
					state.answered = true;
				}
			},
			() => {
				if (
					state.answered &&
					state.currentQuestion < questions.length - 1 &&
					kt.button("次の問題 →", { key: "next" })
				) {
					state.currentQuestion++;
					state.answered = false;
				}
			},
			() => {
				if (
					state.answered &&
					state.currentQuestion === questions.length - 1 &&
					kt.button("結果を見る", { key: "show_results" })
				) {
					state.showResults = true;
				}
			},
		],
		{ ratios: [1, 1, 1, 1] },
	);
}

const script = () => {
	kt.set_page_config({ title: "TypeScriptクイズ" });
	kt.title("TypeScript & Web開発クイズ");
	kt.write(`全${questions.length}問のクイズに挑戦しましょう！`);
	kt.divider();

	if (state.showResults) {
		renderResults();
	} else {
		renderQuestion();
	}
	return undefined;
};

const kantanApp = await createApp(script);
const { shutdown } = serve(kantanApp, { port: 3209 });

console.log("Quiz App running at http://localhost:3209");

process.on("SIGINT", () => {
	console.log("\nShutting down...");
	shutdown();
	process.exit(0);
});
