/**
 * 汎用バリデーション関数
 * 各ウィジェットで共通して使用されるバリデーションロジック
 */

/**
 * 範囲バリデーション（min/max）
 * @throws min > max の場合
 */
export function validateMinMax(min: number, max: number, fieldName: string): void {
	if (min > max) {
		throw new Error(`${fieldName}: min (${min}) must be <= max (${max})`);
	}
}

/**
 * 値が範囲内にあるかをバリデーション
 * @throws value が min より小さい、または max より大きい場合
 */
export function validateValueInRange(
	value: number,
	min: number | undefined,
	max: number | undefined,
	fieldName: string,
): void {
	if (min !== undefined && value < min) {
		throw new Error(
			`${fieldName}: defaultValue (${value}) must be between min (${min}) and max (${max})`,
		);
	}
	if (max !== undefined && value > max) {
		throw new Error(
			`${fieldName}: defaultValue (${value}) must be between min (${min}) and max (${max})`,
		);
	}
}

/**
 * オプション配列が空でないことをバリデーション
 * @throws options が空または null/undefined の場合
 */
export function validateOptionsNotEmpty(
	options: string[] | null | undefined,
	fieldName: string,
): void {
	if (!options || options.length === 0) {
		throw new Error(`${fieldName}: options array must not be empty`);
	}
}

/**
 * 値がオプション内に含まれるかをバリデーション
 * @throws value が options に含まれない場合
 */
export function validateValueInOptions(value: string, options: string[], fieldName: string): void {
	if (!options.includes(value)) {
		throw new Error(`${fieldName}: defaultValue "${value}" must be one of the options`);
	}
}
