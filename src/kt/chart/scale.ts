/**
 * 軸スケール計算
 *
 * Nice numbers アルゴリズムで見やすいy軸目盛りを生成する。
 * バーチャートでは y 軸（値軸）のスケールに使用。
 */

export interface AxisScale {
	min: number;
	max: number;
	step: number;
	ticks: number[];
}

/**
 * Nice numbers アルゴリズムで軸スケールを計算
 *
 * バーチャートの特性:
 * - min >= 0 の場合、scale.min = 0 に固定
 * - max <= 0 の場合（全て負の値）、scale.max = 0 に固定
 *
 * @param values - データ値の配列
 * @param maxTicks - 最大目盛り数（デフォルト: 5）
 */
export function calculateAxisScale(values: number[], maxTicks = 5): AxisScale {
	if (values.length === 0) {
		return { min: 0, max: 1, step: 1, ticks: [0, 1] };
	}

	let dataMin = Math.min(...values);
	let dataMax = Math.max(...values);

	// バーチャート: 0を含めるルール
	if (dataMin >= 0) dataMin = 0;
	if (dataMax <= 0) dataMax = 0;

	// 同じ値の場合
	if (dataMin === dataMax) {
		if (dataMin === 0) {
			return { min: 0, max: 1, step: 0.5, ticks: [0, 0.5, 1] };
		}
		const offset = Math.abs(dataMin) * 0.1 || 1;
		// 0を含めるルール適用後なので、0から適切な範囲を設定
		if (dataMin > 0) {
			dataMax = dataMin + offset;
			dataMin = 0;
		} else {
			dataMin = dataMin - offset;
			dataMax = 0;
		}
	}

	const range = dataMax - dataMin;
	const roughStep = range / maxTicks;
	const magnitude = 10 ** Math.floor(Math.log10(roughStep));
	const normalized = roughStep / magnitude;

	let niceStep: number;
	if (normalized <= 1) niceStep = 1;
	else if (normalized <= 2) niceStep = 2;
	else if (normalized <= 5) niceStep = 5;
	else niceStep = 10;

	niceStep *= magnitude;

	const niceMin = Math.floor(dataMin / niceStep) * niceStep;
	const niceMax = Math.ceil(dataMax / niceStep) * niceStep;

	// 0を含めるルール（niceScale後も維持）
	const finalMin = dataMin >= 0 ? 0 : niceMin;
	const finalMax = dataMax <= 0 ? 0 : niceMax;

	// 目盛り生成
	const ticks: number[] = [];
	for (let v = finalMin; v <= finalMax + niceStep * 0.001; v += niceStep) {
		ticks.push(Math.round(v * 1e10) / 1e10);
	}

	return { min: finalMin, max: finalMax, step: niceStep, ticks };
}

/**
 * 数値を表示用にフォーマット
 */
export function formatTickValue(n: number): string {
	if (Number.isInteger(n) && Math.abs(n) < 1e6) return String(n);
	if (Math.abs(n) >= 1e6) return n.toExponential(1);
	return Number.parseFloat(n.toPrecision(4)).toString();
}
