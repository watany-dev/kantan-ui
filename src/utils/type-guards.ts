/**
 * 型ガードユーティリティ
 * ランタイムで値の型を検証する関数群
 */

export function isString(value: unknown): value is string {
	return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
	return typeof value === "number" && !Number.isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
	return typeof value === "boolean";
}

export function isNull(value: unknown): value is null {
	return value === null;
}

export function isUndefined(value: unknown): value is undefined {
	return value === undefined;
}

export function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

/**
 * 値が期待する型かどうかを検証し、そうでなければデフォルト値を返す
 */
export function validateType<T>(
	value: unknown,
	validator: (v: unknown) => v is T,
	defaultValue: T,
): T {
	return validator(value) ? value : defaultValue;
}

/**
 * 型のミスマッチをログに記録（開発時のデバッグ用）
 */
export function assertType<T>(
	value: unknown,
	validator: (v: unknown) => v is T,
	context: string,
): value is T {
	const isValid = validator(value);
	if (!isValid && value !== undefined) {
		console.warn(
			`Type mismatch in ${context}: expected ${validator.name.replace("is", "").toLowerCase()}, got ${typeof value}`,
		);
	}
	return isValid;
}
