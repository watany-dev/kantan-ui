/**
 * 日付・時刻変換ユーティリティ
 */

/**
 * Date オブジェクトまたは文字列を "YYYY-MM-DD" 形式の文字列に変換
 */
export function toDateString(value: string | Date | undefined): string {
	if (value === undefined) {
		return "";
	}
	if (typeof value === "string") {
		return value;
	}
	// Date オブジェクトを "YYYY-MM-DD" 形式に変換
	const year = value.getFullYear();
	const month = String(value.getMonth() + 1).padStart(2, "0");
	const day = String(value.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Date オブジェクトまたは文字列を "HH:MM" または "HH:MM:SS" 形式の文字列に変換
 */
/**
 * Date オブジェクトまたは文字列を "YYYY-MM-DDTHH:MM" または
 * "YYYY-MM-DDTHH:MM:SS" 形式の文字列に変換
 *
 * Invalid Date が渡された場合は空文字列を返す（安全側に倒す）
 */
export function toDatetimeString(value: string | Date | undefined, includeSeconds = false): string {
	if (value === undefined) {
		return "";
	}
	if (typeof value === "string") {
		return value;
	}
	if (Number.isNaN(value.getTime())) {
		return "";
	}
	const datePart = toDateString(value);
	const timePart = toTimeString(value, includeSeconds);
	return `${datePart}T${timePart}`;
}

export function toTimeString(value: string | Date | undefined, includeSeconds = false): string {
	if (value === undefined) {
		return "";
	}
	if (typeof value === "string") {
		return value;
	}
	// Date オブジェクトを時刻形式に変換
	const hours = String(value.getHours()).padStart(2, "0");
	const minutes = String(value.getMinutes()).padStart(2, "0");
	if (includeSeconds) {
		const seconds = String(value.getSeconds()).padStart(2, "0");
		return `${hours}:${minutes}:${seconds}`;
	}
	return `${hours}:${minutes}`;
}
