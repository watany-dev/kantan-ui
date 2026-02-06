import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { agent_skills, agent_step, create_agent_skills } from "../../../src/kt/agent";
import { RenderContext, setRenderContext } from "../../../src/kt/context";

describe("Agent Skills API", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
	});

	afterEach(() => {
		setRenderContext(null);
	});

	describe("create_agent_skills", () => {
		it("should create a registry with provided skills", () => {
			const registry = create_agent_skills([
				{
					name: "search",
					description: "Web検索",
					handler: async (input) => `result: ${input}`,
				},
			]);
			expect(registry.skills).toHaveLength(1);
			expect(registry.skills[0].name).toBe("search");
		});

		it("should return readonly skills array", () => {
			const registry = create_agent_skills([
				{
					name: "search",
					description: "Web検索",
					handler: async (input) => `result: ${input}`,
				},
			]);
			// readonly array should not allow direct modification
			expect(Object.isFrozen(registry.skills)).toBe(true);
		});

		it("should create empty registry when no skills provided", () => {
			const registry = create_agent_skills([]);
			expect(registry.skills).toHaveLength(0);
		});

		it("should throw error for duplicate skill names", () => {
			expect(() =>
				create_agent_skills([
					{
						name: "search",
						description: "Search 1",
						handler: () => "a",
					},
					{
						name: "search",
						description: "Search 2",
						handler: () => "b",
					},
				]),
			).toThrow("Duplicate skill name: search");
		});

		it("should throw error for invalid skill name", () => {
			expect(() =>
				create_agent_skills([
					{
						name: "invalid name!",
						description: "Bad",
						handler: () => "a",
					},
				]),
			).toThrow("Invalid skill name");
		});

		it("should accept skill names with hyphens and underscores", () => {
			const registry = create_agent_skills([
				{
					name: "web-search",
					description: "Web検索",
					handler: () => "a",
				},
				{
					name: "code_execute",
					description: "コード実行",
					handler: () => "b",
				},
			]);
			expect(registry.skills).toHaveLength(2);
		});

		it("should execute a skill by name", async () => {
			const registry = create_agent_skills([
				{
					name: "echo",
					description: "Echo input",
					handler: (input) => `echo: ${input}`,
				},
			]);
			const result = await registry.execute("echo", "hello");
			expect(result).toBe("echo: hello");
		});

		it("should execute an async skill", async () => {
			const registry = create_agent_skills([
				{
					name: "async-skill",
					description: "Async skill",
					handler: (input) => {
						return Promise.resolve(`async: ${input}`);
					},
				},
			]);
			const result = await registry.execute("async-skill", "test");
			expect(result).toBe("async: test");
		});

		it("should throw error when executing unknown skill", async () => {
			const registry = create_agent_skills([
				{
					name: "echo",
					description: "Echo",
					handler: (input) => input,
				},
			]);
			await expect(registry.execute("unknown", "test")).rejects.toThrow("Skill not found: unknown");
		});

		it("should catch and wrap handler errors", async () => {
			const registry = create_agent_skills([
				{
					name: "failing",
					description: "Always fails",
					handler: () => {
						throw new Error("handler error");
					},
				},
			]);
			await expect(registry.execute("failing", "test")).rejects.toThrow(
				'Skill "failing" execution failed: handler error',
			);
		});
	});

	describe("agent_skills (display)", () => {
		it("should render skills container with badges layout by default", () => {
			const registry = create_agent_skills([
				{
					name: "search",
					description: "Web検索",
					icon: "🔍",
					handler: () => "",
				},
			]);
			agent_skills(registry);
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-agent-skills"');
			expect(html).toContain('data-layout="badges"');
		});

		it("should render skill badges with name and icon", () => {
			const registry = create_agent_skills([
				{
					name: "search",
					description: "Web検索",
					icon: "🔍",
					handler: () => "",
				},
			]);
			agent_skills(registry);
			const html = ctx.getHtml();
			expect(html).toContain("kt-agent-skill-badge");
			expect(html).toContain("🔍");
			expect(html).toContain("search");
		});

		it("should use default icon when none provided", () => {
			const registry = create_agent_skills([
				{
					name: "test",
					description: "Test",
					handler: () => "",
				},
			]);
			agent_skills(registry);
			const html = ctx.getHtml();
			expect(html).toContain("🔧");
		});

		it("should render cards layout when specified", () => {
			const registry = create_agent_skills([
				{
					name: "search",
					description: "Web検索",
					icon: "🔍",
					handler: () => "",
				},
			]);
			agent_skills(registry, { layout: "cards" });
			const html = ctx.getHtml();
			expect(html).toContain('data-layout="cards"');
			expect(html).toContain("kt-agent-skill-card");
			expect(html).toContain("Web検索");
		});

		it("should render multiple skills", () => {
			const registry = create_agent_skills([
				{
					name: "search",
					description: "Web検索",
					icon: "🔍",
					handler: () => "",
				},
				{
					name: "calculate",
					description: "計算",
					icon: "🔢",
					handler: () => "",
				},
			]);
			agent_skills(registry);
			const html = ctx.getHtml();
			expect(html).toContain("🔍");
			expect(html).toContain("search");
			expect(html).toContain("🔢");
			expect(html).toContain("calculate");
		});

		it("should escape HTML in skill name and description", () => {
			const registry = create_agent_skills([
				{
					name: "test",
					description: "<script>xss</script>",
					handler: () => "",
				},
			]);
			agent_skills(registry, { layout: "cards" });
			const html = ctx.getHtml();
			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;script&gt;");
		});

		it("should escape HTML in icon", () => {
			const registry = create_agent_skills([
				{
					name: "test",
					description: "Test",
					icon: "<img onerror=alert(1)>",
					handler: () => "",
				},
			]);
			agent_skills(registry);
			const html = ctx.getHtml();
			expect(html).not.toContain("<img");
			expect(html).toContain("&lt;img");
		});

		it("should render nothing for empty registry", () => {
			const registry = create_agent_skills([]);
			agent_skills(registry);
			const html = ctx.getHtml();
			expect(html).toBe("");
		});

		it("should throw error when no render context", () => {
			setRenderContext(null);
			const registry = create_agent_skills([
				{
					name: "test",
					description: "Test",
					handler: () => "",
				},
			]);
			expect(() => agent_skills(registry)).toThrow("RenderContext is not available");
		});
	});

	describe("agent_step", () => {
		it("should render thinking step", () => {
			agent_step("thinking", "分析中...");
			const html = ctx.getHtml();
			expect(html).toContain("kt-agent-step");
			expect(html).toContain("kt-agent-step-thinking");
			expect(html).toContain("分析中...");
		});

		it("should render tool_call step", () => {
			agent_step("tool_call", "search('TypeScript')");
			const html = ctx.getHtml();
			expect(html).toContain("kt-agent-step-tool_call");
			expect(html).toContain("search(&#039;TypeScript&#039;)");
		});

		it("should render tool_result step", () => {
			agent_step("tool_result", "5件の結果");
			const html = ctx.getHtml();
			expect(html).toContain("kt-agent-step-tool_result");
			expect(html).toContain("5件の結果");
		});

		it("should render error step", () => {
			agent_step("error", "接続エラー");
			const html = ctx.getHtml();
			expect(html).toContain("kt-agent-step-error");
			expect(html).toContain("接続エラー");
		});

		it("should display default icon for each step type", () => {
			agent_step("thinking", "test");
			expect(ctx.getHtml()).toContain("💭");

			ctx = new RenderContext();
			setRenderContext(ctx);
			agent_step("tool_call", "test");
			expect(ctx.getHtml()).toContain("🔧");

			ctx = new RenderContext();
			setRenderContext(ctx);
			agent_step("tool_result", "test");
			expect(ctx.getHtml()).toContain("✅");

			ctx = new RenderContext();
			setRenderContext(ctx);
			agent_step("error", "test");
			expect(ctx.getHtml()).toContain("❌");
		});

		it("should display default label for each step type", () => {
			agent_step("thinking", "test");
			expect(ctx.getHtml()).toContain("Thinking");

			ctx = new RenderContext();
			setRenderContext(ctx);
			agent_step("tool_call", "test");
			expect(ctx.getHtml()).toContain("Tool Call");

			ctx = new RenderContext();
			setRenderContext(ctx);
			agent_step("tool_result", "test");
			expect(ctx.getHtml()).toContain("Result");

			ctx = new RenderContext();
			setRenderContext(ctx);
			agent_step("error", "test");
			expect(ctx.getHtml()).toContain("Error");
		});

		it("should display skill name when provided", () => {
			agent_step("tool_call", "search query", { skill: "search" });
			const html = ctx.getHtml();
			expect(html).toContain("kt-agent-step-skill");
			expect(html).toContain("search");
		});

		it("should not display skill element when not provided", () => {
			agent_step("tool_call", "test");
			const html = ctx.getHtml();
			expect(html).not.toContain("kt-agent-step-skill");
		});

		it("should render collapsed step with details element", () => {
			agent_step("tool_result", "Long result...", { collapsed: true });
			const html = ctx.getHtml();
			expect(html).toContain("<details");
			expect(html).toContain("Long result...");
		});

		it("should escape HTML in content", () => {
			agent_step("thinking", "<script>alert('xss')</script>");
			const html = ctx.getHtml();
			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;script&gt;");
		});

		it("should escape HTML in skill name", () => {
			agent_step("tool_call", "test", {
				skill: "<script>xss</script>",
			});
			const html = ctx.getHtml();
			expect(html).not.toContain("<script>xss");
			expect(html).toContain("&lt;script&gt;");
		});

		it("should throw error when no render context", () => {
			setRenderContext(null);
			expect(() => agent_step("thinking", "test")).toThrow("RenderContext is not available");
		});

		it("should render multiple steps in order", () => {
			agent_step("thinking", "Step 1");
			agent_step("tool_call", "Step 2");
			agent_step("tool_result", "Step 3");
			const html = ctx.getHtml();
			const thinkingPos = html.indexOf("Step 1");
			const toolCallPos = html.indexOf("Step 2");
			const toolResultPos = html.indexOf("Step 3");
			expect(thinkingPos).toBeLessThan(toolCallPos);
			expect(toolCallPos).toBeLessThan(toolResultPos);
		});
	});
});
