/**
 * チャート共通描画ユーティリティ
 *
 * グリッド・軸・凡例など、複数チャートタイプで共有する描画関数を提供する。
 * bar_chart, area_chart で使用。
 */

import { renderHtml } from "../../utils/html";
import { formatTickValue } from "./scale";

/**
 * グリッド線を描画する
 */
export function renderGrid(
	scale: { min: number; max: number; step: number; ticks: number[] },
	marginLeft: number,
	plotWidth: number,
	scaleY: (v: number) => number,
): string {
	const parts: string[] = ['<g class="kt-chart-grid">'];
	for (const tick of scale.ticks) {
		const y = scaleY(tick);
		parts.push(
			`<line x1="${marginLeft}" y1="${y}" x2="${marginLeft + plotWidth}" y2="${y}" stroke="#e9ecef" stroke-width="1" />`,
		);
	}
	parts.push("</g>");
	return parts.join("");
}

/**
 * y軸を描画する
 */
export function renderYAxis(
	scale: { min: number; max: number; step: number; ticks: number[] },
	marginLeft: number,
	scaleY: (v: number) => number,
): string {
	const parts: string[] = ['<g class="kt-chart-axis-y">'];
	parts.push(
		`<line x1="${marginLeft}" y1="${scaleY(scale.max)}" x2="${marginLeft}" y2="${scaleY(scale.min)}" stroke="#dee2e6" stroke-width="1" />`,
	);
	for (const tick of scale.ticks) {
		const y = scaleY(tick);
		parts.push(
			`<text x="${marginLeft - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#6c757d">${formatTickValue(tick)}</text>`,
		);
	}
	parts.push("</g>");
	return parts.join("");
}

/**
 * x軸を描画する（カテゴリラベル）
 */
export function renderXAxis(
	xValues: (string | number)[],
	marginLeft: number,
	plotWidth: number,
	baseY: number,
): string {
	const parts: string[] = ['<g class="kt-chart-axis-x">'];
	parts.push(
		`<line x1="${marginLeft}" y1="${baseY}" x2="${marginLeft + plotWidth}" y2="${baseY}" stroke="#dee2e6" stroke-width="1" />`,
	);

	const categoryWidth = plotWidth / xValues.length;
	for (const [i, xVal] of xValues.entries()) {
		const label = String(xVal);
		const x = marginLeft + categoryWidth * i + categoryWidth / 2;
		parts.push(
			renderHtml`<text x="${x}" y="${baseY + 16}" text-anchor="middle" font-size="11" fill="#6c757d">${label}</text>`,
		);
	}

	parts.push("</g>");
	return parts.join("");
}

/**
 * 凡例を描画する
 */
export function renderLegend(
	series: { name: string; color: string }[],
	startX: number,
	y: number,
): string {
	const parts: string[] = ['<g class="kt-chart-legend">'];
	let x = startX;

	for (const s of series) {
		parts.push(renderHtml`<rect x="${x}" y="${y}" width="10" height="10" fill="${s.color}" />`);
		parts.push(
			renderHtml`<text x="${x + 14}" y="${y + 9}" font-size="11" fill="#495057">${s.name}</text>`,
		);
		x += 80;
	}

	parts.push("</g>");
	return parts.join("");
}
