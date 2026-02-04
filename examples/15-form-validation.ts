/**
 * フォームバリデーションサンプルアプリ
 *
 * kt.validation_error() / kt.validation_errors() APIの使用例
 *
 * 使用方法:
 *   bun run examples/15-form-validation.ts
 */
import { createApp } from "../src/app";
import { kt } from "../src/kt";
import { serve } from "../src/serve";
import { createTypedSessionState } from "../src/session";

type AppState = {
	registeredUsers: Array<{ name: string; email: string }>;
};

const state = createTypedSessionState<AppState>({
	registeredUsers: [],
});

// バリデーション関数
function validateEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateSignupForm(fields: {
	name: string;
	email: string;
	password: string;
	confirmPassword: string;
	agreeTerms: boolean;
}): string[] {
	const errors: string[] = [];

	if (!fields.name) {
		errors.push("名前を入力してください");
	} else if (fields.name.length < 2) {
		errors.push("名前は2文字以上で入力してください");
	}

	if (!fields.email) {
		errors.push("メールアドレスを入力してください");
	} else if (!validateEmail(fields.email)) {
		errors.push("有効なメールアドレスを入力してください");
	}

	if (!fields.password) {
		errors.push("パスワードを入力してください");
	} else {
		errors.push(...validatePassword(fields.password));
	}

	if (fields.password !== fields.confirmPassword) {
		errors.push("パスワードが一致しません");
	}

	if (!fields.agreeTerms) {
		errors.push("利用規約への同意が必要です");
	}

	return errors;
}

function validatePassword(password: string): string[] {
	const errors: string[] = [];
	if (password.length < 8) {
		errors.push("パスワードは8文字以上必要です");
	}
	if (!/[A-Z]/.test(password)) {
		errors.push("大文字を1文字以上含める必要があります");
	}
	if (!/[a-z]/.test(password)) {
		errors.push("小文字を1文字以上含める必要があります");
	}
	if (!/[0-9]/.test(password)) {
		errors.push("数字を1文字以上含める必要があります");
	}
	return errors;
}

const script = () => {
	kt.title("Form Validation Demo");
	kt.write(
		"kt.validation_error() と kt.validation_errors() APIを使ってフォームバリデーションを実装します。",
	);
	kt.divider();

	// 単一エラー表示
	kt.header("単一エラー表示: validation_error()");
	kt.code(
		`kt.form("login", () => {
  const email = kt.text_input("Email");
  if (kt.form_submit_button("Login")) {
    if (!validateEmail(email)) {
      kt.validation_error("有効なメールアドレスを入力してください");
      return;
    }
    // 処理続行
  }
});`,
		"typescript",
	);

	kt.form(
		"login_form",
		() => {
			const email = kt.text_input("メールアドレス", "", { key: "login_email" });
			const password = kt.text_input("パスワード", "", {
				key: "login_password",
				type: "password",
			});

			if (kt.form_submit_button("ログイン", { key: "login_submit" })) {
				if (!email) {
					kt.validation_error("メールアドレスを入力してください");
					return;
				}
				if (!validateEmail(email)) {
					kt.validation_error("有効なメールアドレスを入力してください");
					return;
				}
				if (!password) {
					kt.validation_error("パスワードを入力してください");
					return;
				}
				kt.success("ログイン成功!");
			}
		},
		{ clear_on_submit: false },
	);

	kt.divider();

	// 複数エラー表示
	kt.header("複数エラー表示: validation_errors()");
	kt.code(
		`const errors: string[] = [];
if (!name) errors.push("名前は必須です");
if (!email) errors.push("メールは必須です");
if (errors.length > 0) {
  kt.validation_errors(errors);
  return;
}`,
		"typescript",
	);

	kt.form(
		"signup_form",
		() => {
			kt.subheader("ユーザー登録");

			const name = kt.text_input("名前", "", { key: "signup_name" });
			const email = kt.text_input("メールアドレス", "", { key: "signup_email" });
			const password = kt.text_input("パスワード", "", {
				key: "signup_password",
				type: "password",
			});
			const confirmPassword = kt.text_input("パスワード（確認）", "", {
				key: "signup_confirm",
				type: "password",
			});
			const agreeTerms = kt.checkbox("利用規約に同意する", false, {
				key: "signup_terms",
			});

			if (kt.form_submit_button("登録", { key: "signup_submit" })) {
				const errors = validateSignupForm({ name, email, password, confirmPassword, agreeTerms });

				if (errors.length > 0) {
					kt.validation_errors(errors);
					return;
				}

				state.registeredUsers.push({ name, email });
				kt.success(`${name}さんの登録が完了しました!`);
			}
		},
		{ clear_on_submit: false },
	);

	kt.divider();

	// リアルタイムバリデーション風
	kt.header("リアルタイムバリデーション風");
	kt.info("フォーム外でもvalidation_error()は使用できます。");

	const realtimePassword = kt.text_input("パスワードを入力", "", {
		key: "realtime_password",
		type: "password",
	});

	if (realtimePassword) {
		const errors = validatePassword(realtimePassword);
		if (errors.length > 0) {
			kt.validation_errors(errors);
		} else {
			kt.success("パスワードの要件を満たしています!");
		}
	}

	kt.divider();

	// 登録済みユーザー一覧
	kt.header("登録済みユーザー");
	if (state.registeredUsers.length > 0) {
		kt.table(state.registeredUsers);
	} else {
		kt.info("まだユーザーが登録されていません");
	}

	kt.divider();

	// API仕様
	kt.header("API仕様");
	kt.code(
		`// 単一エラー
kt.validation_error(message: string): void

// 複数エラー
kt.validation_errors(messages: string[]): void

// 空配列の場合は何も表示されない
kt.validation_errors([]); // 何も起きない`,
		"typescript",
	);
};

const kantanApp = await createApp(script);
const { shutdown } = serve(kantanApp, { port: 3015 });

console.log("Form Validation Demo running at http://localhost:3015");

process.on("SIGINT", () => {
	console.log("\nShutting down...");
	shutdown();
	process.exit(0);
});
