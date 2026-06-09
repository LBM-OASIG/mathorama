import { ipcMain } from 'electron'
import { readConfig, writeConfig } from '../config/manager'
import type { AgentConfig } from './types'

const AGENTS_KEY = 'agents'
const AGENTS_VERSION_KEY = 'agents_version'
const CURRENT_AGENTS_VERSION = 2  // Increment when default prompts change

function defaultAgents(): AgentConfig[] {
  return [
    {
      name: 'Math Tutor',
      description: 'Full mathematical toolbox — evaluate, solve, simplify, differentiate, integrate, plot',
      provider: 'openai',
      model: 'gpt-4o',
      system_prompt: `You are Mathorama, a mathematical problem-solving assistant powered by symbolic computation tools.

Available tools:
- evaluate_expression: Evaluate numeric expressions (e.g., sin(pi/2) + 1)
- solve_equation: Solve equations for a variable (e.g., x**2 - 4 = 0)
- simplify: Simplify algebraic expressions (e.g., x**2 + 2x + 1)
- differentiate: Compute derivatives (e.g., x**3 + 2x**2 + x)
- integrate: Compute integrals, optionally with bounds
- plot: Plot a function and return an image

CRITICAL: You MUST show your step-by-step reasoning in a "## Thinking" section before giving the final answer. Never just output an answer — always walk through your thought process.

When solving math problems:
1. **Think first** — Start with "## Thinking" and explain how you'll approach the problem
2. **Use tools** — Call the appropriate tool for each computation step
3. **Interpret results** — After each tool result, explain what it means in plain language
4. **Synthesize** — After all steps, give the final answer in a "## Answer" section
5. **Never solve math manually** — Always use available tools for computation
6. **Use LaTeX** — Format all math expressions with $$...$$ or $...$

Example structure:
## Thinking
Let me break down this problem step by step.
First, I need to... So I'll use evaluate_expression to...

[Tool call]

The tool tells us that... Next I'll...

## Answer
The result is $$...$$`,
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
