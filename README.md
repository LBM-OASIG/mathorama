# Mathorama — Math Agent Platform

<div align="center">

![Version](https://img.shields.io/badge/version-0.1.0-blue?style=flat-square)
![Electron](https://img.shields.io/badge/Electron-35-47848F?style=flat-square&logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3-3776AB?style=flat-square&logo=python&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

**LLM 驱动的 AI 数学解题桌面应用 — 精确计算，清晰展示，交互式探索**

</div>

---

## 概览

Mathorama 是一款基于 Electron 的桌面应用，将**大语言模型**与**Python 科学计算栈**（SymPy + NumPy + Matplotlib）深度融合。用户用自然语言描述数学问题，AI 自动规划解题步骤、调用数学工具精确计算，并输出教科书级别的解题报告。

> ✨ **核心亮点**：LLM 负责推理和自然语言组织，Python 引擎负责精确计算，两者取长补短。

---

## 特性

| 特性 | 说明 |
|------|------|
| 🧠 **AI 解题** | 自然语言输入，自动规划步骤、调用工具、输出完整解题过程 |
| 🔧 **6 种数学工具** | 数值计算、解方程、化简、求导、积分、函数绘图 |
| 🤖 **多 Agent** | 内置 Math Tutor / General Assistant / Plot Artist，支持自定义 Agent |
| 🔌 **多模型支持** | OpenAI / Anthropic / DeepSeek / Ollama 等兼容 API |
| 📐 **公式渲染** | KaTeX 渲染 LaTeX，流式逐字输出，智能分组 |
| 📊 **数学可视化** | Matplotlib 函数绘图，直接嵌入聊天 |
| 🎨 **Academic Manuscript 主题** | 暖象牙白纸色 + 衬线字体，学术风格 UI |

---

## 快速开始

```bash
# 1. 克隆
git clone https://github.com/your-username/mathorama.git
cd mathorama

# 2. 安装依赖
npm install
pip install sympy matplotlib numpy

# 3. 开发模式
npm run dev

# 4. 构建生产版本
npm run build
npm run preview
```

> **前提条件**：Node.js ≥ 18、Python 3.8+、npm 或 yarn。

### 配置 API

在应用设置中配置 LLM Provider（支持 OpenAI / Anthropic / 兼容 API），或直接编辑配置文件：

| 配置项 | 路径 |
|--------|------|
| 应用配置 | `Electron userData / config.json` |
| 对话存储 | `Electron userData / conversations.json` |

---

## 截图

<!-- TODO: 添加应用截图 -->
<!-- ![Mathorama 主界面](screenshots/main.png) -->

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 35 + electron-vite |
| 前端 | React 19 + TypeScript 5.8 + Tailwind CSS 4 |
| 状态管理 | Zustand 5 |
| 公式渲染 | KaTeX + react-markdown + remark-math + rehype-katex |
| 代码编辑器 | CodeMirror (Python) |
| LLM 接入 | OpenAI API 兼容 / Anthropic API |
| 数学引擎 | Python 3 + SymPy + NumPy + Matplotlib |

---

## 架构

### 数据流

```
用户输入
    │
    ▼
[React UI] ──IPC──▶ [Main Process]
                        │
                        ▼
              [LLM Gateway] ──HTTP──▶ OpenAI / Anthropic API
                        │
                        ▼ (tool_call)
              [Python Bridge] ──spawn──▶ math_engine.py (SymPy)
                        │
                        ▼
              [Agent Loop] (迭代直到 final answer)
                        │
                        ▼
              IPC 返回 + 流式 Token ──▶ [React UI] 逐字渲染
```

### Agent 运行循环

1. **System prompt + 历史消息** → LLM
2. LLM 返回**文本**或 **tool_calls**
3. 若返回 `tool_call` → 调用 Python 数学引擎执行 → 结果追加到消息列表 → 回到步骤 1
4. 若返回文本且没有 `tool_call` → **完成**
5. 最多迭代 **10 次**，防止无限循环
6. 若输出被 `max_tokens` 截断 → 自动追加继续提示

### 数学工具

| 工具名 | 功能 | 关键输入 |
|--------|------|----------|
| `evaluate_expression` | 数值计算 | expression |
| `solve_equation` | 解方程 | equation, variable |
| `simplify` | 化简表达式 | expression |
| `differentiate` | 求导 | expression, variable, order |
| `integrate` | 积分（定/不定） | expression, variable, lower, upper |
| `plot` | 函数绘图 → 返回 base64 PNG | expression, variable, xmin, xmax |

### 跨模型适配器

自动检测模型家族并适配参数差异：

| 模型家族 | 适配行为 |
|----------|----------|
| `openai-standard` | GPT-4o 等，支持 temperature / top_p |
| `openai-reasoning` | o1/o3 系列，使用 `max_completion_tokens` + `reasoning_effort` |
| `anthropic` | Claude 系列，支持 `thinking` 块 |
| `openai-compatible` | Ollama / vLLM / DeepSeek 等兼容 API |

**DeepSeek 特殊适配**：
- **DeepSeek-R1**：max_tokens 上限 64K（含 reasoning）
- **DeepSeek-V4**：max_tokens 上限 384K

### 流式渲染

- LLM token 通过 IPC `agent:stream-token` 事件逐字传输
- 智能分组：完整 `$$...$$` LaTeX 块一次显示，普通文本每 3 字符一刷
- 15ms 刷新间隔，50ms 完成检测

---

## 内置 Agent

| Agent | 描述 |
|-------|------|
| **Math Tutor** | 完整数学工具箱，输出教科书级别解题报告，用 `\boxed{}` 框出最终答案 |
| **General Assistant** | 纯对话，无数学工具 |
| **Plot Artist** | 专注数学可视化 |

用户可通过 **Agent 编辑器**自定义或新建 Agent。

---

## 项目结构

```
mathorama/
├── src/
│   ├── main/                      # Electron 主进程
│   │   ├── index.ts               # 应用入口，窗口创建，注册所有 IPC handler
│   │   ├── agent/                 # Agent 系统
│   │   │   ├── types.ts           # AgentConfig / AgentParams 类型定义
│   │   │   ├── adapter.ts         # 跨模型适配器（OpenAI/Anthropic/DeepSeek 等）
│   │   │   ├── tools.ts           # 数学工具定义（evaluate/solve/simplify 等）
│   │   │   ├── loop.ts            # Agent 运行循环（LLM ↔ Tool 迭代）
│   │   │   ├── bridge.ts          # agent IPC handler 注册
│   │   │   └── manager.ts         # Agent 配置的持久化/升级管理
│   │   ├── llm/                   # LLM 提供商层
│   │   │   ├── gateway.ts         # 统一的 LLM 网关（管理多个提供商）
│   │   │   ├── bridge.ts          # LLM IPC handler + 默认提供商初始化
│   │   │   └── providers/         # 具体提供商实现
│   │   │       ├── types.ts       # LLMProvider 接口定义
│   │   │       ├── openai.ts      # OpenAI / 兼容 API 实现
│   │   │       └── anthropic.ts   # Anthropic API 实现
│   │   ├── python/                # Python 集成
│   │   │   ├── bridge.ts          # Python 子进程管理 + IPC handler
│   │   │   └── math_engine.py     # SymPy 数学引擎（6 个工具函数）
│   │   ├── conversations/         # 对话管理
│   │   │   ├── manager.ts         # 对话持久化（JSON 文件）
│   │   │   └── bridge.ts          # 对话 IPC handler
│   │   └── config/                # 配置管理
│   │       └── manager.ts         # 配置读写 + IPC handler
│   ├── preload/
│   │   └── index.ts               # contextBridge 暴露 API 给渲染进程
│   └── renderer/                  # 渲染进程（React UI）
│       ├── index.html             # HTML 入口
│       └── src/
│           ├── main.tsx           # React 入口
│           ├── App.tsx            # 根组件
│           ├── style.css          # Tailwind + KaTeX + 主题定义
│           ├── types/index.ts     # 共享类型（Message, Conversation 等）
│           ├── store/
│           │   └── chatStore.ts   # Zustand 状态管理（核心）
│           └── components/
│               ├── Layout.tsx     # 主布局（侧边栏 + 聊天 + 工具栏）
│               ├── ChatPanel.tsx  # 聊天面板（消息列表 + 输入框 + 流式渲染）
│               ├── SettingsDialog.tsx   # 设置对话框（Providers / Python / About）
│               ├── AgentEditorDialog.tsx # Agent 编辑器对话框
│               └── ToolTraceViewer.tsx  # 工具调用追踪查看器
```

---

## 预加载桥接 API

通过 `window.mathorama` 暴露给渲染进程：

| API | 功能 |
|-----|------|
| `llm.chat()` / `llm.chatWithTools()` / `llm.listModels()` | LLM 交互 |
| `python.execute()` / `python.executeTool()` / `python.installPackages()` | Python 执行 |
| `config.get()` / `config.set()` / `config.getAll()` | 配置管理 |
| `provider.set()` / `provider.remove()` | Provider 管理 |
| `agent.run()` / `agent.list()` / `agent.save()` | Agent 管理 |
| `onStreamToken(callback)` | 流式 Token 回调（自动清理） |
| `conversations.loadAll()` / `conversations.saveAll()` | 对话持久化 |

---

## UI 主题

**"Academic Manuscript"** 风格：

- 暖象牙白纸色背景（`#FDFCF8`）
- 深靛蓝强调色（`#1E3A5F`）
- 三字体系统：Playfair Display（标题）+ Source Serif 4（正文）+ JetBrains Mono（代码）
- 极简边框、微妙纸张纹理、精心调制的动画

---

## 关键依赖

| 依赖 | 用途 |
|------|------|
| `@uiw/react-codemirror` | Python 代码编辑器 |
| `katex` / `remark-math` / `rehype-katex` | 数学公式渲染 |
| `react-markdown` + `remark-gfm` | Markdown 渲染 |
| `zustand` | 轻量状态管理 |

---

## 贡献

欢迎提交 Issue 和 Pull Request。详见 [CONTRIBUTING.md](CONTRIBUTING.md)（如适用）。

---

## 许可证

[MIT](LICENSE)
