/**
 * チュートリアル7: 単位変換器
 *
 * 使用API: selectbox, number_input, tabs, columns, metric, table, expander
 *
 * 長さ・重さ・温度などの単位を変換するアプリ
 *
 * 使用方法:
 *   bun run examples/tutorials/07-unit-converter.ts
 */
import { createApp } from "../../src/app";
import { kt } from "../../src/kt";
import { serve } from "../../src/serve";

// 単位変換データ
const lengthUnits: Record<string, number> = {
	メートル: 1,
	キロメートル: 0.001,
	センチメートル: 100,
	ミリメートル: 1000,
	インチ: 39.3701,
	フィート: 3.28084,
	ヤード: 1.09361,
	マイル: 0.000621371,
};

const weightUnits: Record<string, number> = {
	グラム: 1,
	キログラム: 0.001,
	ミリグラム: 1000,
	トン: 0.000001,
	ポンド: 0.00220462,
	オンス: 0.035274,
};

const areaUnits: Record<string, number> = {
	平方メートル: 1,
	平方キロメートル: 0.000001,
	ヘクタール: 0.0001,
	アール: 0.01,
	平方フィート: 10.7639,
	エーカー: 0.000247105,
	坪: 0.3025,
};

const volumeUnits: Record<string, number> = {
	リットル: 1,
	ミリリットル: 1000,
	立方メートル: 0.001,
	ガロン: 0.264172,
	クォート: 1.05669,
	パイント: 2.11338,
	カップ: 4.22675,
};

function convertUnits(
	value: number,
	fromUnit: string,
	toUnit: string,
	conversionTable: Record<string, number>,
): number {
	const fromFactor = conversionTable[fromUnit] ?? 1;
	const toFactor = conversionTable[toUnit] ?? 1;
	// value in base unit = value / fromFactor
	// value in target unit = (value / fromFactor) * toFactor
	const baseValue = value / fromFactor;
	return baseValue * toFactor;
}

function convertTemperature(value: number, from: string, to: string): number {
	// まず摂氏に変換
	let celsius: number;
	switch (from) {
		case "摂氏 (°C)":
			celsius = value;
			break;
		case "華氏 (°F)":
			celsius = (value - 32) * (5 / 9);
			break;
		case "ケルビン (K)":
			celsius = value - 273.15;
			break;
		default:
			celsius = value;
	}

	// 摂氏から目的の単位に変換
	switch (to) {
		case "摂氏 (°C)":
			return celsius;
		case "華氏 (°F)":
			return celsius * (9 / 5) + 32;
		case "ケルビン (K)":
			return celsius + 273.15;
		default:
			return celsius;
	}
}

function formatNumber(n: number): string {
	if (Number.isInteger(n)) return n.toString();
	// 小数点以下6桁まで、末尾の0を除去
	return Number.parseFloat(n.toFixed(6)).toString();
}

const script = () => {
	kt.set_page_config({ title: "単位変換器" });
	kt.title("単位変換器");
	kt.write("さまざまな単位を簡単に変換できます。");
	kt.divider();

	const [lengthTab, weightTab, tempTab, areaTab, volumeTab] = kt.tabs([
		"長さ",
		"重さ",
		"温度",
		"面積",
		"体積",
	]);

	lengthTab(() => {
		kt.header("長さの変換");
		const unitNames = Object.keys(lengthUnits);
		const fromUnit = kt.selectbox("変換元", unitNames, "メートル", { key: "len_from" });
		const value = kt.number_input("値", 0, 999999999, 1, { key: "len_value" });
		const toUnit = kt.selectbox("変換先", unitNames, "キロメートル", { key: "len_to" });

		const result = convertUnits(value, fromUnit, toUnit, lengthUnits);
		kt.metric(`${formatNumber(value)} ${fromUnit}`, `${formatNumber(result)} ${toUnit}`);

		kt.expander("全単位への変換", () => {
			kt.table(
				unitNames.map((unit) => ({
					単位: unit,
					値: formatNumber(convertUnits(value, fromUnit, unit, lengthUnits)),
				})),
			);
		});
	});

	weightTab(() => {
		kt.header("重さの変換");
		const unitNames = Object.keys(weightUnits);
		const fromUnit = kt.selectbox("変換元", unitNames, "キログラム", { key: "wt_from" });
		const value = kt.number_input("値", 0, 999999999, 1, { key: "wt_value" });
		const toUnit = kt.selectbox("変換先", unitNames, "ポンド", { key: "wt_to" });

		const result = convertUnits(value, fromUnit, toUnit, weightUnits);
		kt.metric(`${formatNumber(value)} ${fromUnit}`, `${formatNumber(result)} ${toUnit}`);

		kt.expander("全単位への変換", () => {
			kt.table(
				unitNames.map((unit) => ({
					単位: unit,
					値: formatNumber(convertUnits(value, fromUnit, unit, weightUnits)),
				})),
			);
		});
	});

	tempTab(() => {
		kt.header("温度の変換");
		const tempUnits = ["摂氏 (°C)", "華氏 (°F)", "ケルビン (K)"];
		const fromUnit = kt.selectbox("変換元", tempUnits, "摂氏 (°C)", { key: "temp_from" });
		const value = kt.number_input("値", -273.15, 999999, 100, { key: "temp_value" });
		const toUnit = kt.selectbox("変換先", tempUnits, "華氏 (°F)", { key: "temp_to" });

		const result = convertTemperature(value, fromUnit, toUnit);
		kt.metric(`${formatNumber(value)} ${fromUnit}`, `${formatNumber(result)} ${toUnit}`);

		kt.expander("全単位への変換", () => {
			kt.table(
				tempUnits.map((unit) => ({
					単位: unit,
					値: formatNumber(convertTemperature(value, fromUnit, unit)),
				})),
			);
		});
	});

	areaTab(() => {
		kt.header("面積の変換");
		const unitNames = Object.keys(areaUnits);
		const fromUnit = kt.selectbox("変換元", unitNames, "平方メートル", { key: "area_from" });
		const value = kt.number_input("値", 0, 999999999, 1, { key: "area_value" });
		const toUnit = kt.selectbox("変換先", unitNames, "坪", { key: "area_to" });

		const result = convertUnits(value, fromUnit, toUnit, areaUnits);
		kt.metric(`${formatNumber(value)} ${fromUnit}`, `${formatNumber(result)} ${toUnit}`);

		kt.expander("全単位への変換", () => {
			kt.table(
				unitNames.map((unit) => ({
					単位: unit,
					値: formatNumber(convertUnits(value, fromUnit, unit, areaUnits)),
				})),
			);
		});
	});

	volumeTab(() => {
		kt.header("体積の変換");
		const unitNames = Object.keys(volumeUnits);
		const fromUnit = kt.selectbox("変換元", unitNames, "リットル", { key: "vol_from" });
		const value = kt.number_input("値", 0, 999999999, 1, { key: "vol_value" });
		const toUnit = kt.selectbox("変換先", unitNames, "ミリリットル", { key: "vol_to" });

		const result = convertUnits(value, fromUnit, toUnit, volumeUnits);
		kt.metric(`${formatNumber(value)} ${fromUnit}`, `${formatNumber(result)} ${toUnit}`);

		kt.expander("全単位への変換", () => {
			kt.table(
				unitNames.map((unit) => ({
					単位: unit,
					値: formatNumber(convertUnits(value, fromUnit, unit, volumeUnits)),
				})),
			);
		});
	});
	return undefined;
};

const kantanApp = await createApp(script);
const { shutdown } = serve(kantanApp, { port: 3207 });

console.log("Unit Converter running at http://localhost:3207");

process.on("SIGINT", () => {
	console.log("\nShutting down...");
	shutdown();
	process.exit(0);
});
