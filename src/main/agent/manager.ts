import { ipcMain } from 'electron'
import { readConfig, writeConfig } from '../config/manager'
import type { AgentConfig } from './types'

const AGENTS_KEY = 'agents'
const AGENTS_VERSION_KEY = 'agents_version'
const CURRENT_AGENTS_VERSION = 4  // Increment when default prompts change

function defaultAgents(): AgentConfig[] {
  return [
    {
      name: 'Math Tutor',
      description: 'Full mathematical toolbox — evaluate, solve, simplify, differentiate, integrate, plot',
      provider: 'openai',
      model: 'gpt-4o',
      system_prompt: `你是一名专业的数学解题助手 Mathorama，使用中文作答。你拥有符号计算工具箱，但**所有关键计算必须调用工具完成**。

可用工具：
- evaluate_expression：数值计算（如 sin(pi/2) + 1）
- solve_equation：解方程（如 x**2 - 4 = 0）
- simplify：化简表达式（如 x**2 + 2x + 1）
- differentiate：求导（如 x**3 + 2x**2 + x）
- integrate：积分，可带上下限
- plot：绘制函数图像并返回图片

## 输出要求

直接给出**完整的、严谨的数学解答**，逐步骤推导，**不要只写最终答案**。

要求：
- 这是一个**完整的解题报告**，包含所有推理步骤和数学推导
- 每一步用文字解释清楚
- 所有数学公式用 $$...$$ 或 $...$ 排版
- 最终答案单独醒目地放在末尾，用 $$\\boxed{...}$$ 框出
- 让你的解答达到教科书或考试标准答案的水平

## 工作流程

1. **分析** — 先写出题目条件和要求
2. **计算** — 每一步计算必须调用工具，不得心算
3. **推导** — 每次工具返回结果后，将其融入推导过程
4. **结论** — 末尾给出最终答案，用 $$\\boxed{...}$$ 框出

## 示例

**问题：** 求函数 $$f(x) = \\frac{1}{3} x^3 - \\frac{1}{2} x^2 - 2x + 1$$ 在区间 $$[-2, 3]$$ 上的最大值与最小值。

**第一步：求导数**

调用 differentiate 工具得：
$$f'(x) = x^2 - x - 2$$

**第二步：求临界点**

令 $$f'(x) = 0$$，调用 solve_equation：
$$x^2 - x - 2 = 0$$
解得 $$x = -1$$ 或 $$x = 2$$，均在区间 $$[-2, 3]$$ 内。

**第三步：计算各候选点的函数值**

调用 evaluate_expression 逐次计算：

| $$x$$ | $$f(x)$$ |
|-------|----------|
| $$-2$$ | $$-\\frac{11}{3}$$ |
| $$-1$$ | $$\\frac{13}{6}$$ |
| $$2$$ | $$-\\frac{7}{3}$$ |
| $$3$$ | $$-\\frac{11}{6}$$ |

**第四步：比较得出最值**

最大值在 $$x = -1$$ 处取得：
$$\\boxed{\\max f(x) = \\frac{13}{6}}$$

最小值在 $$x = 2$$ 处取得：
$$\\boxed{\\min f(x) = -\\frac{7}{3}}$$`,
      params: { temperature: 0.3, max_tokens: 4096 },
      tools: ['evaluate_expression', 'solve_equation', 'simplify', 'differentiate', 'integrate', 'plot']
    },
    {
      name: 'General Assistant',
      description: 'Chat-only, no math tools',
      provider: 'openai',
      model: 'gpt-4o',
      system_prompt: 'You are a helpful and concise assistant.',
      params: { temperature: 0.7, max_tokens: 2048 },
      tools: []
    },
    {
      name: 'Plot Artist',
      description: 'Focused on mathematical visualization',
      provider: 'openai',
      model: 'gpt-4o',
      system_prompt: `You are a mathematical visualization specialist.
Use the plot tool to create clear, well-labeled plots.
Explain what each plot shows and why it's relevant.
If a problem requires computation before plotting, use evaluate or solve first.`,
      params: { temperature: 0.7, max_tokens: 4096 },
      tools: ['plot']
    }
  ]
}

export function loadAgents(): AgentConfig[] {
  const config = readConfig()
  const stored = config[AGENTS_KEY] as AgentConfig[] | undefined
  const storedVersion = (config[AGENTS_VERSION_KEY] as number) || 0
  const defaults = defaultAgents()

  if (!stored || !Array.isArray(stored) || stored.length === 0) {
    // First run: seed defaults
    saveAgents(defaults)
    return defaults
  }

  // Upgrade built-in agent prompts when version changes (preserve provider/model/params)
  if (storedVersion < CURRENT_AGENTS_VERSION) {
    const upgraded = stored.map((agent) => {
      const match = defaults.find((d) => d.name === agent.name)
      if (match) {
        return { ...agent, system_prompt: match.system_prompt, tools: match.tools }
      }
      return agent
    })
    saveAgents(upgraded)
    return upgraded
  }

  return stored
}

export function saveAgents(agents: AgentConfig[]): void {
  const config = readConfig()
  config[AGENTS_KEY] = agents
  config[AGENTS_VERSION_KEY] = CURRENT_AGENTS_VERSION
  writeConfig(config)
}

export function registerAgentManagerHandlers(): void {
  ipcMain.handle('agent:list', () => {
    return loadAgents()
  })

  ipcMain.handle('agent:save', (_event, agents: AgentConfig[]) => {
    saveAgents(agents)
  })
}
