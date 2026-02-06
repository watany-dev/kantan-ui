import { escapeHtml } from "../utils/html";
import { requireRenderContext } from "./context";

/**
 * エージェントスキルのパラメータ定義
 */
export interface AgentSkillParameter {
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
 * エージェントスキルの定義
 */
export interface AgentSkill {
	/** スキル名（英数字・ハイフン・アンダースコアのみ） */
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
 * スキルレジストリ
 */
export interface AgentSkillRegistry {
	/** 登録済みスキル一覧 */
	readonly skills: readonly AgentSkill[];
	/** スキルを名前で実行 */
	execute(name: string, input: string): Promise<string>;
}

/**
 * エージェントステップの種類
 */
export type AgentStepType = "thinking" | "tool_call" | "tool_result" | "error";

/**
 * エージェントステップの設定
 */
export interface AgentStepConfig {
	/** 関連するスキル名 */
	skill?: string;
	/** ステップを折りたたむ */
	collapsed?: boolean;
}

/**
 * スキル一覧表示の設定
 */
export interface AgentSkillsConfig {
	/** 表示レイアウト（デフォルト: "badges"） */
	layout?: "badges" | "cards";
}

/** スキル名バリデーション: 英数字・ハイフン・アンダースコアのみ */
const SKILL_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

/** ステップタイプごとのデフォルトアイコン */
const stepIcons: Record<AgentStepType, string> = {
	thinking: "💭",
	tool_call: "🔧",
	tool_result: "✅",
	error: "❌",
};

/** ステップタイプごとのデフォルトラベル */
const stepLabels: Record<AgentStepType, string> = {
	thinking: "Thinking",
	tool_call: "Tool Call",
	tool_result: "Result",
	error: "Error",
};

/**
 * スキルレジストリを作成
 *
 * @param skills - 登録するスキル配列
 * @returns スキルレジストリ
 *
 * @example
 * ```typescript
 * const skills = create_agent_skills([
 *   {
 *     name: "search",
 *     description: "Web検索を実行",
 *     icon: "🔍",
 *     handler: async (query) => {
 *       return `Results for: ${query}`;
 *     },
 *   },
 * ]);
 * ```
 */
export function create_agent_skills(skills: AgentSkill[]): AgentSkillRegistry {
	const skillMap = new Map<string, AgentSkill>();

	for (const skill of skills) {
		if (!SKILL_NAME_PATTERN.test(skill.name)) {
			throw new Error(
				`Invalid skill name: "${skill.name}". Only alphanumeric characters, hyphens, and underscores are allowed.`,
			);
		}
		if (skillMap.has(skill.name)) {
			throw new Error(`Duplicate skill name: ${skill.name}`);
		}
		skillMap.set(skill.name, skill);
	}

	const frozenSkills = Object.freeze([...skills]);

	return {
		skills: frozenSkills,
		async execute(name: string, input: string): Promise<string> {
			const skill = skillMap.get(name);
			if (!skill) {
				throw new Error(`Skill not found: ${name}`);
			}
			try {
				return await skill.handler(input);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				throw new Error(`Skill "${name}" execution failed: ${message}`);
			}
		},
	};
}

/**
 * 利用可能なスキルを表示
 *
 * @param registry - スキルレジストリ
 * @param config - 表示設定
 *
 * @example
 * ```typescript
 * kt.agent_skills(skills);
 * kt.agent_skills(skills, { layout: "cards" });
 * ```
 */
export function agent_skills(registry: AgentSkillRegistry, config?: AgentSkillsConfig): void {
	const ctx = requireRenderContext();

	if (registry.skills.length === 0) {
		return;
	}

	const layout = config?.layout ?? "badges";

	if (layout === "cards") {
		ctx.append(`<div class="kt-agent-skills" data-layout="cards">`);
		for (const skill of registry.skills) {
			const icon = escapeHtml(skill.icon ?? "🔧");
			const name = escapeHtml(skill.name);
			const desc = escapeHtml(skill.description);
			ctx.append(
				`<div class="kt-agent-skill-card">` +
					`<div class="kt-agent-skill-card-icon">${icon}</div>` +
					`<div class="kt-agent-skill-card-body">` +
					`<div class="kt-agent-skill-card-name">${name}</div>` +
					`<div class="kt-agent-skill-card-desc">${desc}</div>` +
					`</div>` +
					`</div>`,
			);
		}
		ctx.append(`</div>`);
	} else {
		ctx.append(`<div class="kt-agent-skills" data-layout="badges">`);
		for (const skill of registry.skills) {
			const icon = escapeHtml(skill.icon ?? "🔧");
			const name = escapeHtml(skill.name);
			ctx.append(
				`<div class="kt-agent-skill-badge">` +
					`<span class="kt-agent-skill-icon">${icon}</span>` +
					`<span class="kt-agent-skill-name">${name}</span>` +
					`</div>`,
			);
		}
		ctx.append(`</div>`);
	}
}

/**
 * エージェントの実行ステップを表示
 *
 * @param type - ステップの種類
 * @param content - ステップの内容
 * @param config - オプション設定
 *
 * @example
 * ```typescript
 * kt.agent_step("thinking", "質問を分析中...");
 * kt.agent_step("tool_call", "search('TypeScript')", { skill: "search" });
 * kt.agent_step("tool_result", "5件の結果が見つかりました", { skill: "search" });
 * kt.agent_step("error", "タイムアウトしました");
 * ```
 */
export function agent_step(type: AgentStepType, content: string, config?: AgentStepConfig): void {
	const ctx = requireRenderContext();

	const icon = stepIcons[type];
	const label = stepLabels[type];
	const escapedContent = escapeHtml(content);

	const skillHtml = config?.skill
		? `<span class="kt-agent-step-skill">${escapeHtml(config.skill)}</span>`
		: "";

	const indicatorHtml =
		`<div class="kt-agent-step-indicator">` +
		`<span class="kt-agent-step-icon">${icon}</span>` +
		`<span class="kt-agent-step-label">${label}</span>` +
		skillHtml +
		`</div>`;

	if (config?.collapsed) {
		ctx.append(
			`<div class="kt-agent-step kt-agent-step-${type}">` +
				`<details>` +
				`<summary>${indicatorHtml}</summary>` +
				`<div class="kt-agent-step-content">${escapedContent}</div>` +
				`</details>` +
				`</div>`,
		);
	} else {
		ctx.append(
			`<div class="kt-agent-step kt-agent-step-${type}">` +
				indicatorHtml +
				`<div class="kt-agent-step-content">${escapedContent}</div>` +
				`</div>`,
		);
	}
}
