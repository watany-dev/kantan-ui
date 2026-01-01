import { bench, describe } from "vitest";
import { diff, toWebSocketPatches } from "../../src/diff/differ";
import { buildNodeMap, parseHtml } from "../../src/diff/parser";

/**
 * 指定した要素数のHTMLを生成
 */
function generateHtml(elementCount: number): string {
	return Array.from(
		{ length: elementCount },
		(_, i) => `<div id="el-${i}" class="widget" data-index="${i}">Content ${i}</div>`,
	).join("\n");
}

/**
 * 深いネスト構造のHTMLを生成
 */
function generateNestedHtml(depth: number): string {
	let html = "";
	for (let i = 0; i < depth; i++) {
		html += `<div id="level-${i}">`;
	}
	html += "Content";
	for (let i = 0; i < depth; i++) {
		html += "</div>";
	}
	return html;
}

/**
 * ウィジェットベースのHTMLを生成（実際のユースケースに近い）
 */
function generateWidgetHtml(widgetCount: number): string {
	const widgets: string[] = [];
	for (let i = 0; i < widgetCount; i++) {
		widgets.push(`
			<div id="widget_${i}-container" class="kt-widget-container">
				<label for="widget_${i}">Widget ${i}: ${i * 10}</label>
				<input id="widget_${i}" type="range" min="0" max="100" value="${i * 10}" />
			</div>
		`);
	}
	return widgets.join("\n");
}

// テストデータの事前生成
const html10 = generateHtml(10);
const html100 = generateHtml(100);
const html500 = generateHtml(500);

const nested10 = generateNestedHtml(10);
const nested50 = generateNestedHtml(50);
const nested100 = generateNestedHtml(100);

const widgets10 = generateWidgetHtml(10);
const widgets50 = generateWidgetHtml(50);
const widgets100 = generateWidgetHtml(100);

// 差分用のHTML（1要素だけ変更）
const html100Modified = html100.replace('Content 50"', 'Content 50 - Modified"');
const widgets50Modified = widgets50.replace("Widget 25: 250", "Widget 25: 999");

describe("parseHtml performance", () => {
	bench("parse 10 elements", () => {
		parseHtml(html10);
	});

	bench("parse 100 elements", () => {
		parseHtml(html100);
	});

	bench("parse 500 elements", () => {
		parseHtml(html500);
	});

	bench("parse nested 10 levels", () => {
		parseHtml(nested10);
	});

	bench("parse nested 50 levels", () => {
		parseHtml(nested50);
	});

	bench("parse nested 100 levels", () => {
		parseHtml(nested100);
	});

	bench("parse 10 widgets", () => {
		parseHtml(widgets10);
	});

	bench("parse 50 widgets", () => {
		parseHtml(widgets50);
	});

	bench("parse 100 widgets", () => {
		parseHtml(widgets100);
	});
});

describe("buildNodeMap performance", () => {
	const nodes100 = parseHtml(html100);
	const nodes500 = parseHtml(html500);

	bench("build map from 100 nodes", () => {
		buildNodeMap(nodes100);
	});

	bench("build map from 500 nodes", () => {
		buildNodeMap(nodes500);
	});
});

describe("diff performance", () => {
	bench("diff identical 100 elements", () => {
		diff(html100, html100);
	});

	bench("diff 1 change in 100 elements", () => {
		diff(html100, html100Modified);
	});

	bench("diff identical 50 widgets", () => {
		diff(widgets50, widgets50);
	});

	bench("diff 1 change in 50 widgets", () => {
		diff(widgets50, widgets50Modified);
	});

	bench("diff complete replacement 100 elements", () => {
		diff(html100, generateHtml(100)); // 完全に新しいHTML
	});
});

describe("toWebSocketPatches performance", () => {
	const diffResult1Change = diff(html100, html100Modified);
	const diffResult10Changes = diff(generateHtml(100), generateHtml(110));

	bench("convert 1 patch", () => {
		toWebSocketPatches(diffResult1Change, html100Modified);
	});

	bench("convert 10 patches", () => {
		toWebSocketPatches(diffResult10Changes, generateHtml(110));
	});
});

describe("full pipeline performance", () => {
	bench("full pipeline: parse + diff + convert (100 elements, 1 change)", () => {
		const result = diff(html100, html100Modified);
		toWebSocketPatches(result, html100Modified);
	});

	bench("full pipeline: parse + diff + convert (50 widgets, 1 change)", () => {
		const result = diff(widgets50, widgets50Modified);
		toWebSocketPatches(result, widgets50Modified);
	});
});
