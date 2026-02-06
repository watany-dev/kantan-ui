# Agent Skills API 設計書

## 実装ステータス

> **✅ 実装完了**
>
> `src/kt/agent.ts` に実装済み。
> - `create_agent_skills()`: スキルレジストリ作成・実行
> - `kt.agent_skills()`: スキル一覧表示（badges / cards レイアウト）
> - `kt.agent_step()`: エージェント実行ステップ表示（thinking / tool_call / tool_result / error）

---

## 1. 概要

### 1.1 目的
AIエージェントのスキル（ツール）定義・表示・実行をkantan-uiのUI上で簡単に構築するためのAPIを提供する。
LLMエージェントが使うツール（検索、計算、コード実行など）を定義し、その実行過程をチャットUI内でステップ表示できるようにする。

### 1.2 ユースケース
- AIチャットボットがツールを使用しながら回答する過程を可視化
- エージェントの思考プロセス（thinking → tool_call → tool_result → response）をUI上に表示
- 利用可能なスキル一覧をカード/バッジ形式で表示
- スキルの実行と結果のハンドリング

### 1.3 設計方針
- **Web標準優先**: 外部依存なし、Honoのみ
- **既存パターン踏襲**: Chat APIの拡張として自然に統合
- **セキュリティ**: XSS対策、入力検証を徹底
- **シンプルAPI**: 最小限のAPIで最大限の表現力

---

## 2. API設計

### 2.1 型定義

```typescript
/**
 * エージェントスキルの定義
 */
interface AgentSkill {
  /** スキル名（一意識別子） */
  name: string;
  /** スキルの説明 */
  description: string;
  /** アイコン（絵文字） */
  icon?: string;
  /** パラメータ定義 */
  parameters?: AgentSkillParameter[];
  /** スキル実行ハンドラ */
  handler: (input: string) => Promise<string> | string;
}

/**
 * スキルパラメータ定義
 */
interface AgentSkillParameter {
  /** パラメータ名 */
  name: string;
  /** パラメータ型 */
  type: "string" | "number" | "boolean";
  /** パラメータ説明 */
  description: string;
  /** 必須フラグ */
  required?: boolean;
}

/**
 * エージェントステップの種類
 */
type AgentStepType = "thinking" | "tool_call" | "tool_result" | "error";

/**
 * エージェントステップの設定
 */
interface AgentStepConfig {
  /** 関連するスキル名 */
  skill?: string;
  /** ステップが折りたたみ可能か */
  collapsed?: boolean;
}

/**
 * スキルレジストリの設定
 */
interface AgentSkillsConfig {
  /** 表示レイアウト */
  layout?: "badges" | "cards";
}
```

### 2.2 関数シグネチャ

```typescript
/**
 * スキルレジストリを作成
 */
function create_agent_skills(skills: AgentSkill[]): AgentSkillRegistry;

interface AgentSkillRegistry {
  /** 登録済みスキル一覧 */
  readonly skills: readonly AgentSkill[];
  /** スキルを名前で実行 */
  execute(name: string, input: string): Promise<string>;
}

/**
 * 利用可能なスキルを表示
 */
kt.agent_skills(registry: AgentSkillRegistry, config?: AgentSkillsConfig): void;

/**
 * エージェントの実行ステップを表示
 */
kt.agent_step(type: AgentStepType, content: string, config?: AgentStepConfig): void;
```

### 2.3 使用例

```typescript
import { createApp, kt, createTypedSessionState, create_agent_skills } from "kantan-ui";

// スキル定義
const skills = create_agent_skills([
  {
    name: "search",
    description: "Web検索を実行",
    icon: "🔍",
    handler: async (query) => {
      const res = await fetch(`/api/search?q=${query}`);
      return await res.text();
    },
  },
  {
    name: "calculate",
    description: "数値計算を実行",
    icon: "🔢",
    handler: (expr) => String(eval(expr)),
  },
]);

type State = {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
};

const state = createTypedSessionState<State>({ messages: [] });

const script = () => {
  kt.title("AI Agent Demo");

  // スキル一覧を表示
  kt.agent_skills(skills);

  // チャットコンテナ
  kt.chat_container(() => {
    for (const msg of state.messages) {
      kt.chat_message(msg.role, msg.content);
    }
  });

  const input = kt.chat_input("質問を入力...");
  if (input) {
    state.messages.push({ role: "user", content: input });

    // エージェントのステップを表示
    kt.agent_step("thinking", "質問を分析中...");
    kt.agent_step("tool_call", "search('TypeScript best practices')", { skill: "search" });
    kt.agent_step("tool_result", "5件の結果が見つかりました", { skill: "search" });

    // スキル実行
    const result = await skills.execute("search", input);
    state.messages.push({ role: "assistant", content: result });
  }
};
```

---

## 3. HTML出力

### 3.1 agent_skills（バッジレイアウト）

```html
<div class="kt-agent-skills" data-layout="badges">
  <div class="kt-agent-skill-badge">
    <span class="kt-agent-skill-icon">🔍</span>
    <span class="kt-agent-skill-name">search</span>
  </div>
  <div class="kt-agent-skill-badge">
    <span class="kt-agent-skill-icon">🔢</span>
    <span class="kt-agent-skill-name">calculate</span>
  </div>
</div>
```

### 3.2 agent_skills（カードレイアウト）

```html
<div class="kt-agent-skills" data-layout="cards">
  <div class="kt-agent-skill-card">
    <div class="kt-agent-skill-card-icon">🔍</div>
    <div class="kt-agent-skill-card-body">
      <div class="kt-agent-skill-card-name">search</div>
      <div class="kt-agent-skill-card-desc">Web検索を実行</div>
    </div>
  </div>
</div>
```

### 3.3 agent_step

```html
<div class="kt-agent-step kt-agent-step-thinking">
  <div class="kt-agent-step-indicator">
    <span class="kt-agent-step-icon">💭</span>
    <span class="kt-agent-step-label">Thinking</span>
  </div>
  <div class="kt-agent-step-content">質問を分析中...</div>
</div>

<div class="kt-agent-step kt-agent-step-tool_call">
  <div class="kt-agent-step-indicator">
    <span class="kt-agent-step-icon">🔧</span>
    <span class="kt-agent-step-label">Tool Call</span>
    <span class="kt-agent-step-skill">search</span>
  </div>
  <div class="kt-agent-step-content">search('TypeScript best practices')</div>
</div>
```

---

## 4. セキュリティ

| 対策 | 実装 |
|------|------|
| XSS防止 | スキル名・説明・コンテンツをescapeHtml |
| スキル名バリデーション | 英数字・ハイフン・アンダースコアのみ許可 |
| ハンドラエラー処理 | try/catchでラップ、エラーメッセージをサニタイズ |

---

## 5. スタイリング

- `.kt-agent-skills` - スキル一覧コンテナ（flexbox wrap）
- `.kt-agent-skill-badge` - バッジスタイル（丸角、ボーダー）
- `.kt-agent-skill-card` - カードスタイル（シャドウ、パディング）
- `.kt-agent-step` - ステップ表示（左ボーダーでタイプ別色分け）
- `.kt-agent-step-thinking` - 思考ステップ（紫系）
- `.kt-agent-step-tool_call` - ツール呼出（青系）
- `.kt-agent-step-tool_result` - ツール結果（緑系）
- `.kt-agent-step-error` - エラー（赤系）
