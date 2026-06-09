import { ipcMain } from 'electron'
import { readConfig, writeConfig } from '../config/manager'
import type { AgentConfig } from './types'

const AGENTS_KEY = 'agents'

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

When solving math problems:
1. Break the problem into steps
2. Use tools to perform calculations
3. For plots, use the plot tool and let the user know an image was generated
4. Explain your reasoning clearly between tool calls
5. Never solve math manually — always use the tools for computation`,
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
  if (stored && Array.isArray(stored) && stored.length > 0) {
    return stored
  }
  // First run: seed defaults
  const defaults = defaultAgents()
  saveAgents(defaults)
  return defaults
}

export function saveAgents(agents: AgentConfig[]): void {
  const config = readConfig()
  config[AGENTS_KEY] = agents
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
