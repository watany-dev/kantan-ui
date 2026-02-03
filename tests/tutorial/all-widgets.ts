/**
 * チュートリアル4章: ウィジェット全体の検証
 */
import { createApp, createTypedSessionState, kt } from "../../src/index";

type State = {
	counter: number;
};

const state = createTypedSessionState<State>({
	counter: 0,
});

const script = () => {
	// === テキスト出力 ===
	kt.title("ウィジェット全テスト");
	kt.header("ヘッダー");
	kt.subheader("サブヘッダー");
	kt.write("テキスト");
	kt.text("テキスト (alias)");
	kt.divider();

	// === ボタン ===
	if (kt.button("クリック")) {
		kt.write("ボタンがクリックされました！");
	}

	if (kt.button("送信", { key: "submit_btn" })) {
		state.counter++;
	}

	// === スライダー ===
	const age = kt.slider("年齢", 0, 100, 25);
	kt.write(`選択された年齢: ${age}`);

	const _volume = kt.slider("音量", 0, 100, 50, {
		key: "volume_slider",
		step: 5,
	});

	// デフォルト値を省略
	const _brightness = kt.slider("明るさ", 0, 100);

	// === テキスト入力 ===
	const name = kt.text_input("名前", "");
	kt.write(`こんにちは、${name}さん！`);

	const _email = kt.text_input("メール", "", {
		key: "email_input",
		placeholder: "example@example.com",
	});

	// === セレクトボックス ===
	const color = kt.selectbox("好きな色", ["赤", "青", "緑"], "青");
	kt.write(`選択された色: ${color}`);

	const _size = kt.selectbox("サイズ", ["S", "M", "L"]);

	// === ダウンロードボタン ===
	kt.download_button("Download CSV", "name,age\nAlice,30\nBob,25", "users.csv", {
		mime: "text/csv",
	});

	// === チェックボックス ===
	const agreed = kt.checkbox("利用規約に同意する", false);
	if (agreed) {
		kt.write("同意いただきありがとうございます！");
	}

	// === トグル ===
	const darkMode = kt.toggle("ダークモード", false);
	kt.write(`ダークモード: ${darkMode ? "オン" : "オフ"}`);

	// === ラジオボタン ===
	const radioSize = kt.radio("サイズ", ["S", "M", "L"], "M");
	kt.write(`選択されたサイズ: ${radioSize}`);

	const _radioColor = kt.radio("色", ["赤", "青", "緑"], "青", { horizontal: true });

	// === 数値入力 ===
	const inputAge = kt.number_input("年齢", 0, 120, 25);
	kt.write(`年齢: ${inputAge}歳`);

	const _price = kt.number_input("価格", 0, 10000, 100, { step: 100 });

	// === テキストエリア ===
	const bio = kt.text_area("自己紹介", "こんにちは！");
	kt.write(`入力内容: ${bio}`);

	const _description = kt.text_area("説明", "", {
		placeholder: "説明を入力してください...",
		rows: 5,
	});

	// === マルチセレクト ===
	const tags = kt.multiselect("タグ", ["技術", "デザイン", "ビジネス"], []);
	kt.write(`選択されたタグ: ${tags.join(", ")}`);

	const _skills = kt.multiselect("スキル", ["JS", "TS", "Python", "Go"], [], {
		maxSelections: 3,
	});

	// === 日付入力 ===
	const birthday = kt.date_input("誕生日", "2000-01-15");
	kt.write(`選択された日付: ${birthday}`);

	const _eventDate = kt.date_input("イベント日", "2024-06-01", {
		min: "2024-01-01",
		max: "2024-12-31",
		key: "event_date",
	});

	// Dateオブジェクトも使用できます
	const today = new Date();
	const _selectedDate = kt.date_input("日付", today);

	// === 時刻入力 ===
	const alarm = kt.time_input("アラーム", "08:30");
	kt.write(`設定時刻: ${alarm}`);

	const _preciseTime = kt.time_input("正確な時刻", "12:30:00", {
		step: 1,
		key: "precise_time",
	});

	kt.divider();
	kt.write("全ウィジェットテスト完了");

	return undefined;
};

const app = await createApp(script, { port: 3104 });
console.log("All widgets test: App created successfully");

const server = Bun.serve({
	port: 3104,
	fetch: app.fetch,
	websocket: app.websocket,
});
console.log(`Server started at http://localhost:${server.port}`);

setTimeout(() => {
	server.stop();
	console.log("Server stopped");
	process.exit(0);
}, 1000);
