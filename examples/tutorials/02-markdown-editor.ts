/**
 * チュートリアル2: Markdownエディタ
 *
 * 使用API: text_area, markdown, columns, tabs, download_button, code
 *
 * テキストエリアにMarkdownを入力し、リアルタイムでプレビュー表示するアプリ
 *
 * 使用方法:
 *   bun run examples/tutorials/02-markdown-editor.ts
 */
import { createApp } from "../../src/app";
import { kt } from "../../src/kt";
import { serve } from "../../src/serve";
import { createTypedSessionState } from "../../src/session";

type AppState = {
	content: string;
};

const defaultMarkdown = `# kantan-ui Markdown Editor

これは**Markdown**エディタのデモです。

## 機能

- リアルタイムプレビュー
- コードブロック対応
- テーブル表示

## コード例

\`\`\`typescript
const app = createApp(script);
\`\`\`

## テーブル

| 名前 | 役割 |
|------|------|
| Alice | 開発者 |
| Bob | デザイナー |

> 引用もサポートされています。

---

*イタリック*、**ボールド**、~~取り消し線~~が使えます。`;

const state = createTypedSessionState<AppState>({
	content: defaultMarkdown,
});

const script = () => {
	kt.set_page_config({ title: "Markdownエディタ", layout: "wide" });
	kt.title("Markdownエディタ");
	kt.write("左側にMarkdownを入力すると、右側にリアルタイムでプレビューが表示されます。");
	kt.divider();

	// テンプレート選択
	const template = kt.selectbox(
		"テンプレート",
		["カスタム", "README", "議事録", "ブログ記事"],
		"カスタム",
		{ key: "template" },
	);

	if (template === "README") {
		state.content = `# プロジェクト名

## 概要
プロジェクトの説明をここに記述します。

## インストール
\`\`\`bash
npm install your-package
\`\`\`

## 使い方
\`\`\`typescript
import { something } from "your-package";
\`\`\`

## ライセンス
MIT`;
	} else if (template === "議事録") {
		state.content = `# 会議議事録

**日時**: 2026-02-21 10:00-11:00
**参加者**: Alice, Bob, Charlie

## アジェンダ
1. 進捗報告
2. 課題共有
3. 次回アクション

## 議事内容

### 1. 進捗報告
- Alice: 機能Aの実装完了
- Bob: デザイン修正中

### 2. 課題共有
- パフォーマンスの改善が必要

## 次回アクション
- [ ] パフォーマンス調査（担当: Alice）
- [ ] デザインレビュー（担当: Bob）`;
	} else if (template === "ブログ記事") {
		state.content = `# 記事タイトル

*公開日: 2026-02-21*

## はじめに
読者を引きつける導入文を書きましょう。

## 本文

### セクション1
内容をここに書きます。

### セクション2
さらに詳しく説明します。

## まとめ
重要なポイントを振り返ります。

---

*この記事が参考になったら共有してください！*`;
	}

	kt.divider();

	// エディタとプレビュー
	kt.columns(
		[
			() => {
				kt.subheader("エディタ");
				const input = kt.text_area("Markdown入力", state.content, {
					key: "editor",
					height: 400,
				});
				state.content = input;

				// 文字数カウント
				const charCount = state.content.length;
				const lineCount = state.content.split("\n").length;
				kt.caption(`${charCount}文字 / ${lineCount}行`);
			},
			() => {
				kt.subheader("プレビュー");
				kt.container(
					() => {
						kt.markdown(state.content);
					},
					{ border: true, height: "400px" },
				);
			},
		],
		{ ratios: [1, 1] },
	);

	kt.divider();

	// エクスポート
	kt.header("エクスポート");
	kt.columns(
		[
			() => {
				kt.download_button("Markdownとしてダウンロード", state.content, "document.md", {
					key: "dl_md",
					mime: "text/markdown",
				});
			},
			() => {
				kt.download_button("テキストとしてダウンロード", state.content, "document.txt", {
					key: "dl_txt",
					mime: "text/plain",
				});
			},
		],
		{ ratios: [1, 1] },
	);
	return undefined;
};

const kantanApp = await createApp(script);
const { shutdown } = serve(kantanApp, { port: 3202 });

console.log("Markdown Editor running at http://localhost:3202");

process.on("SIGINT", () => {
	console.log("\nShutting down...");
	shutdown();
	process.exit(0);
});
