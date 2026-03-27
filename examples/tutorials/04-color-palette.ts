/**
 * チュートリアル4: カラーパレットジェネレータ
 *
 * 使用API: color_picker, slider, columns, container, code, html
 *
 * ベースカラーからパレットを生成し、CSSコードをエクスポートするアプリ
 *
 * 使用方法:
 *   bun run examples/tutorials/04-color-palette.ts
 */
import { createApp } from "../../src/app";
import { kt } from "../../src/kt";
import { serve } from "../../src/serve";
import { createTypedSessionState } from "../../src/session";

type AppState = {
	colors: string[];
};

const state = createTypedSessionState<AppState>({
	colors: ["#3498db", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6"],
});

// HEX → RGB変換
function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: Number.parseInt(result[1], 16),
				g: Number.parseInt(result[2], 16),
				b: Number.parseInt(result[3], 16),
			}
		: { r: 0, g: 0, b: 0 };
}

// RGB → HEX変換
function rgbToHex(r: number, g: number, b: number): string {
	return `#${[r, g, b]
		.map((x) =>
			Math.max(0, Math.min(255, Math.round(x)))
				.toString(16)
				.padStart(2, "0"),
		)
		.join("")}`;
}

// 明度を調整してシェードを生成
function generateShades(hex: string, count: number): string[] {
	const { r, g, b } = hexToRgb(hex);
	const shades: string[] = [];

	for (let i = 0; i < count; i++) {
		const factor = 0.2 + (0.8 * i) / (count - 1);
		shades.push(rgbToHex(Math.round(r * factor), Math.round(g * factor), Math.round(b * factor)));
	}

	return shades.reverse();
}

// テキスト色（背景色に応じて白か黒を返す）
function getContrastColor(hex: string): string {
	const { r, g, b } = hexToRgb(hex);
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.5 ? "#000000" : "#ffffff";
}

const script = () => {
	kt.set_page_config({ title: "カラーパレット", layout: "wide" });
	kt.title("カラーパレットジェネレータ");
	kt.write("色を選択してパレットを生成し、CSSコードをエクスポートできます。");
	kt.divider();

	// カラーピッカー
	kt.header("カラーを選択");

	const colorLabels = ["プライマリ", "セカンダリ", "アクセント", "警告", "情報"];
	const updatedColors = [...state.colors];

	kt.columns(
		colorLabels.map((label, i) => () => {
			const color = kt.color_picker(label, state.colors[i], {
				key: `color_${i}`,
			});
			updatedColors[i] = color;
		}),
		{ ratios: colorLabels.map(() => 1) },
	);

	state.colors = updatedColors;

	kt.divider();

	// シェード数の調整
	const shadeCount = kt.slider("シェード数", 3, 9, 5, { key: "shade_count" });

	kt.divider();

	// パレットプレビュー
	kt.header("パレットプレビュー");

	for (let i = 0; i < state.colors.length; i++) {
		const shades = generateShades(state.colors[i], shadeCount);
		kt.subheader(`${colorLabels[i]}: ${state.colors[i]}`);

		const swatchHtml = shades
			.map((shade) => {
				const textColor = getContrastColor(shade);
				return `<div style="display:inline-block;width:${100 / shadeCount}%;height:60px;background:${shade};color:${textColor};text-align:center;line-height:60px;font-size:12px;font-family:monospace;">${shade}</div>`;
			})
			.join("");
		kt.html(`<div style="display:flex;border-radius:4px;overflow:hidden;">${swatchHtml}</div>`);
	}

	kt.divider();

	// CSS出力
	kt.header("CSSコード");

	const cssVariables = state.colors
		.map((color, i) => {
			const name = colorLabels[i].toLowerCase();
			const shades = generateShades(color, shadeCount);
			const shadeVars = shades
				.map((shade, j) => `  --color-${name}-${(j + 1) * 100}: ${shade};`)
				.join("\n");
			return `  /* ${colorLabels[i]} */\n  --color-${name}: ${color};\n${shadeVars}`;
		})
		.join("\n\n");

	const cssCode = `:root {\n${cssVariables}\n}`;

	kt.code(cssCode, "css");

	kt.download_button("CSSをダウンロード", cssCode, "palette.css", {
		key: "dl_css",
		mime: "text/css",
	});

	kt.divider();

	// コントラストチェック
	kt.header("コントラストチェック");
	kt.table(
		state.colors.map((color, i) => ({
			カラー: colorLabels[i],
			HEX: color,
			RGB: (() => {
				const { r, g, b } = hexToRgb(color);
				return `rgb(${r}, ${g}, ${b})`;
			})(),
			推奨テキスト色: getContrastColor(color) === "#ffffff" ? "白" : "黒",
		})),
	);
	return undefined;
};

const kantanApp = await createApp(script);
const { shutdown } = serve(kantanApp, { port: 3204 });

console.log("Color Palette Generator running at http://localhost:3204");

process.on("SIGINT", () => {
	console.log("\nShutting down...");
	shutdown();
	process.exit(0);
});
