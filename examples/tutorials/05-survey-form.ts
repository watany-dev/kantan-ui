/**
 * チュートリアル5: アンケートフォーム
 *
 * 使用API: form, radio, selectbox, multiselect, checkbox, text_area,
 *          validation_error, validation_errors, table, bar_chart, metric
 *
 * アンケートの回答を収集し、結果をリアルタイムに集計表示するアプリ
 *
 * 使用方法:
 *   bun run examples/tutorials/05-survey-form.ts
 */
import { createApp } from "../../src/app";
import { kt } from "../../src/kt";
import { serve } from "../../src/serve";
import { createTypedSessionState } from "../../src/session";

type SurveyResponse = {
	name: string;
	age: string;
	role: string;
	experience: string;
	languages: string[];
	satisfaction: string;
	recommend: boolean;
	feedback: string;
};

type AppState = {
	responses: SurveyResponse[];
	submitted: boolean;
};

const state = createTypedSessionState<AppState>({
	responses: [],
	submitted: false,
});

function renderResults() {
	kt.header("回答結果");

	if (state.responses.length === 0) {
		kt.info("まだ回答がありません。");
		return;
	}

	kt.metric("総回答数", state.responses.length.toString());
	kt.divider();

	// 満足度の集計
	const satisfactionCounts: Record<string, number> = {};
	for (const r of state.responses) {
		satisfactionCounts[r.satisfaction] = (satisfactionCounts[r.satisfaction] || 0) + 1;
	}
	kt.subheader("満足度分布");
	kt.bar_chart(satisfactionCounts, {
		x_label: "満足度",
		y_label: "回答数",
		height: 250,
	});

	// 使用言語の集計
	const langCounts: Record<string, number> = {};
	for (const r of state.responses) {
		for (const lang of r.languages) {
			langCounts[lang] = (langCounts[lang] || 0) + 1;
		}
	}
	kt.subheader("使用プログラミング言語");
	kt.bar_chart(langCounts, {
		x_label: "言語",
		y_label: "回答数",
		height: 250,
	});

	// 推薦率
	const recommendCount = state.responses.filter((r) => r.recommend).length;
	const recommendRate = Math.round((recommendCount / state.responses.length) * 100);
	kt.subheader("推薦率");
	kt.metric("推薦する", `${recommendRate}%`, {
		delta: `${recommendCount}/${state.responses.length}人`,
		delta_color: "off",
	});

	// 回答一覧
	kt.subheader("回答一覧");
	kt.dataframe(
		state.responses.map((r) => ({
			名前: r.name,
			年齢: r.age,
			役割: r.role,
			経験: r.experience,
			満足度: r.satisfaction,
			推薦: r.recommend ? "はい" : "いいえ",
		})),
		{ key: "responses_df" },
	);
}

const script = () => {
	kt.set_page_config({ title: "アンケートフォーム" });
	kt.title("開発者アンケート");
	kt.write("開発環境に関するアンケートにご協力ください。");
	kt.divider();

	const [formTab, resultsTab] = kt.tabs(["回答する", "結果を見る"]);

	formTab(() => {
		if (state.submitted) {
			kt.success("回答ありがとうございました！");
			if (kt.button("新しい回答を入力", { key: "new_response" })) {
				state.submitted = false;
			}
			return;
		}

		kt.form(
			"survey",
			() => {
				kt.subheader("基本情報");
				const name = kt.text_input("お名前", "", {
					key: "name",
					placeholder: "山田太郎",
				});

				const age = kt.selectbox("年齢層", ["20代以下", "30代", "40代", "50代以上"], "30代", {
					key: "age",
				});

				const role = kt.radio(
					"役割",
					["フロントエンド", "バックエンド", "フルスタック", "インフラ", "その他"],
					"フルスタック",
					{ key: "role" },
				);

				kt.divider();

				kt.subheader("開発経験");
				const experience = kt.selectbox(
					"開発経験",
					["1年未満", "1-3年", "3-5年", "5-10年", "10年以上"],
					"3-5年",
					{ key: "experience" },
				);

				const languages = kt.multiselect(
					"使用プログラミング言語（複数選択可）",
					[
						"TypeScript",
						"JavaScript",
						"Python",
						"Go",
						"Rust",
						"Java",
						"C#",
						"Ruby",
						"PHP",
						"Swift",
					],
					["TypeScript", "JavaScript"],
					{ key: "languages" },
				);

				kt.divider();

				kt.subheader("フィードバック");
				const satisfaction = kt.radio(
					"現在の開発環境の満足度",
					["とても満足", "満足", "普通", "不満", "とても不満"],
					"普通",
					{ key: "satisfaction" },
				);

				const recommend = kt.checkbox("この開発環境を他の人にも薦めたい", false, {
					key: "recommend",
				});

				const feedback = kt.text_area("自由コメント", "", {
					key: "feedback",
					placeholder: "改善点やご意見をお聞かせください...",
				});

				if (kt.form_submit_button("送信", { key: "submit" })) {
					// バリデーション
					const errors: string[] = [];
					if (!name.trim()) {
						errors.push("お名前を入力してください");
					}
					if (languages.length === 0) {
						errors.push("使用言語を1つ以上選択してください");
					}

					if (errors.length > 0) {
						kt.validation_errors(errors);
						return;
					}

					// 保存
					state.responses.push({
						name,
						age,
						role,
						experience,
						languages,
						satisfaction,
						recommend,
						feedback,
					});
					state.submitted = true;
				}
			},
			{ clear_on_submit: false },
		);
	});

	resultsTab(() => {
		renderResults();
	});
	return undefined;
};

const kantanApp = await createApp(script);
const { shutdown } = serve(kantanApp, { port: 3205 });

console.log("Survey Form running at http://localhost:3205");

process.on("SIGINT", () => {
	console.log("\nShutting down...");
	shutdown();
	process.exit(0);
});
