/**
 * チャート型定義
 *
 * バーチャート・エリアチャートに必要な型定義を提供する。
 */

/**
 * 共通チャートデータ型（line_chartと将来共有）
 */
export type ChartData =
	| Record<string, unknown>[]
	| unknown[][]
	| { columns: string[]; data: unknown[][] };

/**
 * normalizeChartData に渡す設定
 */
export interface NormalizeConfig {
	x?: string;
	y?: string | string[];
	color?: string | string[];
}

/**
 * チャート共通設定（bar_chart, area_chart で共有）
 */
export interface BaseChartConfig {
	/** x軸に使用するカラム名 */
	x?: string;
	/** y軸に使用するカラム名（単一または複数） */
	y?: string | string[];
	/** x軸のラベル */
	x_label?: string;
	/** y軸のラベル */
	y_label?: string;
	/** 各系列の色 */
	color?: string | string[];
	/** 積み上げ表示 */
	stack?: boolean;
	/** チャートの高さ（px） @default 400 */
	height?: number;
	/** チャートのタイトル */
	title?: string;
}

/**
 * バーチャートのデータ型
 * ChartDataに加え、便利なショートハンド形式をサポート
 */
export type BarChartData = number[] | Record<string, number> | ChartData;

/**
 * バーチャートの設定オプション
 */
export interface BarChartConfig extends BaseChartConfig {
	/** 積み上げ表示 @default true */
	stack?: boolean;
	/** 横向きバー @default false */
	horizontal?: boolean;
	/** バーのソート順 */
	sort?: "ascending" | "descending";
}

/**
 * 正規化後のバーチャートデータ（内部表現）
 */
export interface NormalizedBarChartData {
	xValues: (string | number)[];
	series: BarChartSeries[];
}

/**
 * バーチャートの系列データ
 */
export interface BarChartSeries {
	name: string;
	values: (number | null)[];
	color: string;
}

/**
 * エリアチャートのデータ型
 * number[] ショートハンドをサポート
 */
export type AreaChartData = number[] | ChartData;

/**
 * エリアチャートの設定オプション
 */
export interface AreaChartConfig extends BaseChartConfig {
	/** 積み上げ表示 @default false */
	stack?: boolean;
	/** コンテナ幅に合わせる @default true */
	use_container_width?: boolean;
}
