/**
 * チャート型定義
 *
 * バーチャート・エリアチャート・散布図に必要な型定義を提供する。
 */

/**
 * 共通チャートデータ型（line_chartと将来共有）
 */
export type ChartData =
	| Record<string, unknown>[]
	| unknown[][]
	| { columns: string[]; data: unknown[][] };

/**
 * バーチャートのデータ型
 * ChartDataに加え、便利なショートハンド形式をサポート
 */
export type BarChartData = number[] | Record<string, number> | ChartData;

/**
 * バーチャートの設定オプション
 */
export interface BarChartConfig {
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
	/** 積み上げ表示 @default true */
	stack?: boolean;
	/** 横向きバー @default false */
	horizontal?: boolean;
	/** バーのソート順 */
	sort?: "ascending" | "descending";
	/** チャートの高さ（px） @default 400 */
	height?: number;
	/** チャートのタイトル */
	title?: string;
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
 * 散布図のデータ型
 * 散布図はx, yの両軸が数値のため、number[]ショートハンドは非サポート
 */
export type ScatterChartData = ChartData;

/**
 * 散布図の設定オプション
 */
export interface ScatterChartConfig {
	/** x軸に使用するカラム名 */
	x?: string;
	/** y軸に使用するカラム名（単一または複数） */
	y?: string | string[];
	/** x軸のラベル */
	x_label?: string;
	/** y軸のラベル */
	y_label?: string;
	/**
	 * ポイントの色指定（2つの用途）
	 * - string: データ中のカラム名に一致→グループ分け、不一致→直接色適用
	 * - string[]: 色配列として各グループに適用
	 */
	color?: string | string[];
	/**
	 * ポイントサイズ
	 * - string: カラム名（バブルチャート）
	 * - number: 固定半径（px）
	 * @default 5
	 */
	size?: string | number;
	/** チャートの高さ（px） @default 400 */
	height?: number;
	/** チャートのタイトル */
	title?: string;
	/**
	 * ポイントの透明度
	 * @default 0.7
	 */
	opacity?: number;
}

/**
 * 正規化後の散布図データ
 */
export interface NormalizedScatterData {
	/** カラーグループ */
	groups: ScatterGroup[];
}

/**
 * 散布図のグループ（同一色のポイント集合）
 */
export interface ScatterGroup {
	/** グループ名（凡例表示用） */
	name: string;
	/** データポイント */
	points: ScatterPoint[];
	/** グループの色 */
	color: string;
}

/**
 * 散布図の1データポイント
 */
export interface ScatterPoint {
	/** x座標（データ空間） */
	x: number;
	/** y座標（データ空間） */
	y: number;
	/** ポイントサイズ（px半径） */
	size: number;
}

/**
 * エリアチャートのデータ型
 * number[] ショートハンドをサポート
 */
export type AreaChartData = number[] | ChartData;

/**
 * エリアチャートの設定オプション
 */
export interface AreaChartConfig {
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
	/** 積み上げ表示 @default false */
	stack?: boolean;
	/** チャートの高さ（px） @default 400 */
	height?: number;
	/** コンテナ幅に合わせる @default true */
	use_container_width?: boolean;
	/** チャートのタイトル */
	title?: string;
}
