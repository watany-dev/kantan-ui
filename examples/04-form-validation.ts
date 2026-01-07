import { z } from "zod";
import { createApp, createTypedSessionState, kt } from "../src/index";

const formSchema = z
	.object({
		name: z.string().min(1, "名前は必須です").min(2, "名前は2文字以上である必要があります"),
		email: z
			.string()
			.min(1, "メールアドレスは必須です")
			.email("有効なメールアドレスを入力してください"),
		age: z
			.number()
			.min(1, "年齢は1～120の範囲で入力してください")
			.max(120, "年齢は1～120の範囲で入力してください"),
		password: z
			.string()
			.min(1, "パスワードは必須です")
			.min(8, "パスワードは8文字以上である必要があります"),
		confirmPassword: z.string(),
		agree: z.literal(true, { errorMap: () => ({ message: "利用規約に同意する必要があります" }) }),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "パスワードが一致しません",
		path: ["confirmPassword"],
	});

type FormState = z.infer<typeof formSchema> & { errors: string[] };

const state = createTypedSessionState<FormState>({
	name: "",
	email: "",
	age: 0,
	password: "",
	confirmPassword: "",
	agree: false,
	errors: [],
});

const validateForm = (): string[] => {
	const result = formSchema.safeParse(state);
	return result.success ? [] : result.error.errors.map((e) => e.message);
};

const script = () => {
	kt.title("ユーザー登録フォーム");
	kt.write("以下の情報を入力してください");
	kt.divider();

	kt.subheader("基本情報");
	state.name = kt.text_input("名前", state.name, { key: "name_input", placeholder: "太郎山田" });
	state.email = kt.text_input("メールアドレス", state.email, {
		key: "email_input",
		placeholder: "user@example.com",
	});
	state.age = kt.number_input("年齢", state.age, { key: "age_input", min: 1, max: 120 });

	kt.subheader("パスワード");
	state.password = kt.text_input("パスワード", state.password, {
		key: "password_input",
		placeholder: "8文字以上",
		type: "password",
	});
	state.confirmPassword = kt.text_input("パスワード（確認）", state.confirmPassword, {
		key: "confirm_password_input",
		placeholder: "同じパスワードを入力",
		type: "password",
	});

	kt.subheader("同意");
	state.agree = kt.checkbox("利用規約に同意する", state.agree, { key: "agree_checkbox" });

	kt.divider();

	if (kt.button("登録する", { key: "submit_btn" })) {
		state.errors = validateForm();
		if (state.errors.length === 0) {
			kt.success("登録が完了しました！");
			Object.assign(state, {
				name: "",
				email: "",
				age: 0,
				password: "",
				confirmPassword: "",
				agree: false,
			});
		}
	}

	if (state.errors.length > 0) {
		kt.divider();
		kt.error("入力にエラーがあります:");
		for (const error of state.errors) {
			kt.write(`• ${error}`);
		}
	}

	return undefined;
};

const kantanApp = createApp(script);

// Bun: export default で自動起動
// Node.js: serve() で明示的に起動
if (typeof Bun !== "undefined") {
	// Bun runtime
	// @ts-expect-error - Bun global
	Bun.serve({
		fetch: kantanApp.fetch,
		websocket: kantanApp.websocket,
		port: 3000,
	});
	console.log("Server running at http://localhost:3000");
} else {
	// Node.js runtime
	import("../src/serve").then(({ serve }) => {
		serve(kantanApp, { port: 3000 });
	});
}

export default kantanApp;
