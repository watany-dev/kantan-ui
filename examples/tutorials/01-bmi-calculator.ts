/**
 * チュートリアル1: BMI計算機
 *
 * 使用API: number_input, slider, metric, columns, info/warning/error/success
 *
 * 身長と体重を入力してBMIを計算し、結果を表示するアプリ
 *
 * 使用方法:
 *   bun run examples/tutorials/01-bmi-calculator.ts
 */
import { createApp } from "../../src/app";
import { kt } from "../../src/kt";
import { serve } from "../../src/serve";

function getBmiCategory(bmi: number): {
	label: string;
	level: "success" | "info" | "warning" | "error";
} {
	if (bmi < 18.5) return { label: "低体重", level: "info" };
	if (bmi < 25) return { label: "普通体重", level: "success" };
	if (bmi < 30) return { label: "肥満(1度)", level: "warning" };
	return { label: "肥満(2度以上)", level: "error" };
}

const script = () => {
	kt.set_page_config({ title: "BMI計算機", layout: "centered" });
	kt.title("BMI計算機");
	kt.write("身長と体重を入力してBMIを計算します。");
	kt.divider();

	// 入力セクション
	kt.header("身体情報を入力");

	kt.columns(
		[
			() => {
				kt.subheader("身長");
				kt.caption("cm単位で入力してください");
			},
			() => {
				kt.subheader("体重");
				kt.caption("kg単位で入力してください");
			},
		],
		{ ratios: [1, 1] },
	);

	const height = kt.number_input("身長 (cm)", 100, 250, 170, {
		key: "height",
	});

	const weight = kt.number_input("体重 (kg)", 20, 300, 60, {
		key: "weight",
	});

	kt.divider();

	// BMI計算
	const heightM = height / 100;
	const bmi = weight / (heightM * heightM);
	const bmiRounded = Math.round(bmi * 10) / 10;
	const category = getBmiCategory(bmi);

	// 結果表示
	kt.header("計算結果");

	kt.columns(
		[
			() => {
				kt.metric("BMI", bmiRounded.toString(), {
					help: "BMI = 体重(kg) / 身長(m)²",
				});
			},
			() => {
				kt.metric("判定", category.label);
			},
		],
		{ ratios: [1, 1] },
	);

	// カテゴリに応じたメッセージ表示
	const alertFn = kt[category.level];
	alertFn(`あなたのBMIは ${bmiRounded} で「${category.label}」に該当します。`);

	kt.divider();

	// BMI基準表
	kt.expander("BMI基準値一覧", () => {
		kt.table([
			{ 分類: "低体重", BMI: "18.5未満" },
			{ 分類: "普通体重", BMI: "18.5〜24.9" },
			{ 分類: "肥満(1度)", BMI: "25.0〜29.9" },
			{ 分類: "肥満(2度)", BMI: "30.0〜34.9" },
			{ 分類: "肥満(3度)", BMI: "35.0〜39.9" },
			{ 分類: "肥満(4度)", BMI: "40.0以上" },
		]);
		kt.caption("出典: 日本肥満学会の基準");
	});

	// 理想体重の計算
	kt.expander("理想体重の目安", () => {
		const idealBmi = 22;
		const idealWeight = idealBmi * heightM * heightM;
		const idealWeightRounded = Math.round(idealWeight * 10) / 10;
		const diff = Math.round((weight - idealWeight) * 10) / 10;

		kt.metric("理想体重 (BMI 22)", `${idealWeightRounded} kg`, {
			delta: `${diff > 0 ? "+" : ""}${diff} kg`,
			delta_color: Math.abs(diff) < 3 ? "off" : "inverse",
		});
	});
	return undefined;
};

const kantanApp = await createApp(script);
const { shutdown } = serve(kantanApp, { port: 3201 });

console.log("BMI Calculator running at http://localhost:3201");

process.on("SIGINT", () => {
	console.log("\nShutting down...");
	shutdown();
	process.exit(0);
});
