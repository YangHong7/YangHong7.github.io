---
title: Claude Code Best (CCB) 本地部署与使用
date: 2026-07-25
aside: false
tags:
  - Claude Code
  - 工具使用
  - 其他
categories:
  - [工具使用, AI工具]
---

---

# Claude Code Best (CCB) 本地部署与使用指南

> **文档说明**：本文档基于 [claude-code-best/claude-code](https://github.com/claude-code-best/claude-code) 官方 README 与 [DeepSeek API 文档](https://api-docs.deepseek.com/zh-cn/) 整理，面向希望通过 npm 全局安装方式在本地终端快速部署 CCB 并接入 DeepSeek API 的用户。

---

## 目录
- [Claude Code Best (CCB) 本地部署与使用指南](#claude-code-best-ccb-本地部署与使用指南)
  - [目录](#目录)
  - [一、项目简介](#一项目简介)
  - [二、前置环境准备](#二前置环境准备)
    - [2.1 基础环境要求](#21-基础环境要求)
    - [2.2 检查 Node.js 与 npm 环境](#22-检查-nodejs-与-npm-环境)
    - [2.3 Windows PowerShell 执行策略配置](#23-windows-powershell-执行策略配置)
  - [三、安装 CCB](#三安装-ccb)
    - [3.1 配置 npm 镜像源](#31-配置-npm-镜像源)
    - [3.2 全局安装 claude-code-best](#32-全局安装-claude-code-best)
    - [3.3 解决 ccb 命令未找到问题](#33-解决-ccb-命令未找到问题)
  - [四、获取 DeepSeek API Key](#四获取-deepseek-api-key)
  - [五、初始化配置](#五初始化配置)
    - [5.1 启动 CCB](#51-启动-ccb)
    - [5.2 通过 /login 配置 DeepSeek](#52-通过-login-配置-deepseek)
    - [5.3 模型映射逻辑说明](#53-模型映射逻辑说明)
  - [六、日常使用与维护](#六日常使用与维护)
    - [6.1 常用终端命令](#61-常用终端命令)
    - [6.2 在 VS Code 中配合使用](#62-在-vs-code-中配合使用)
    - [6.3 版本更新与卸载](#63-版本更新与卸载)
  - [七、参考链接](#七参考链接)

---

## 一、项目简介

[Claude Code Best (CCB)](https://github.com/claude-code-best/claude-code) 是 Anthropic Claude Code 的开源复刻与工程化实现。它保留了原版的终端交互体验，同时扩展了 Goal 持续驱动、Artifacts 上传、Ultracode 多 Agent 编排、Voice 语音、Computer Use、Chrome 自动化以及 Langfuse 监控等能力。

CCB 兼容 Claude Code 原有配置，支持通过 `/login` 接入 OpenAI、Anthropic、Gemini、Grok 及第三方 Anthropic 兼容协议（如 DeepSeek），无需 Anthropic 官方账号即可在本地终端独立使用。

---

## 二、前置环境准备

### 2.1 基础环境要求

| 项目 | 要求 | 说明 |
| :--- | :--- | :--- |
| **操作系统** | Windows / macOS / Linux | 均可使用 Node.js 版本 |
| **Node.js** | LTS 版本（建议 ≥ 18） | 请前往 [nodejs.org](https://nodejs.org/) 下载 |
| **npm** | 随 Node.js 自动提供 | 无需单独安装 |
| **网络环境** | 可访问 npm 与 DeepSeek | 国内用户建议配置 npm 国内镜像 |

### 2.2 检查 Node.js 与 npm 环境

打开终端（Terminal 或 PowerShell），运行以下命令验证安装：

```bash
node --version
npm --version
```

正常情况下应输出类似 `v20.x.x` 与 `10.x.x` 的版本号。若提示命令不存在，请检查 Node.js 安装路径是否已正确添加到系统环境变量 `PATH` 中。

### 2.3 Windows PowerShell 执行策略配置

在 Windows 环境下运行 npm 全局安装脚本时，PowerShell 可能会拦截并报错“无法加载脚本，因为在此系统上禁止运行脚本”。

解决办法：以管理员身份打开 PowerShell，执行以下命令：

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

系统提示确认时输入 `Y` 即可。

> **提示**：此设置仅作用于当前 Windows 用户，不会影响系统整体安全策略；若仅使用传统 CMD 命令行，可跳过此步骤。

---

## 三、安装 CCB

### 3.1 配置 npm 镜像源

为避免国内直连 npm 官方源超时，建议提前切换为阿里云镜像源：

```bash
# 设置为阿里云镜像
npm config set registry https://registry.npmmirror.com

# 验证镜像源设置
npm config get registry
# 正常输出：https://registry.npmmirror.com/
```

如后续需要恢复官方源，可执行：

```bash
npm config set registry https://registry.npmjs.org/
```

### 3.2 全局安装 claude-code-best

```bash
npm i -g claude-code-best
```

安装完成后，系统终端将新增 `ccb` 命令。直接运行以下命令验证：

```bash
ccb
```

若成功进入 CCB 的 TUI 交互界面，即代表安装成功。

> **更新/重装提示**：若安装或升级过程中报错，建议先完全卸载旧版本：
> ```bash
> npm rm -g claude-code-best
> npm i -g claude-code-best@latest
> ```

### 3.3 解决 ccb 命令未找到问题

若全局安装后终端提示 `ccb: command not found`，通常是因为 npm 全局可执行目录未加入系统环境变量 `PATH`。

**解决步骤**：

1. 获取 npm 全局安装路径前缀：
   ```bash
   npm config get prefix
   ```
2. 将返回的路径加入环境变量 `PATH`：
   - **Windows**：将输出路径（例如 `C:\Users\<用户名>\AppData\Roaming\npm`）添加至“系统属性 → 环境变量 → 用户变量 / 系统变量 → Path”。
   - **macOS / Linux**：将 `<prefix>/bin` 添加至 `~/.bashrc` 或 `~/.zshrc` 中：
     ```bash
     export PATH="$(npm config get prefix)/bin:$PATH"
     ```
3. 重新打开终端生效。

> **临时替代方案**：若急需使用，亦可通过 `npx claude-code-best` 直接启动。

---

## 四、获取 DeepSeek API Key

CCB 通过 **Anthropic Compatible** 协议接入 DeepSeek，使用前需准备有效的 DeepSeek API Key：

1. 登录 [DeepSeek 开放平台](https://platform.deepseek.com)。
2. 进入“API Keys”页面，点击“创建 API Key”。
3. 复制生成的 Key 并妥善保存（Key 仅在创建时显示一次）。

---

## 五、初始化配置

### 5.1 启动 CCB

在终端中输入命令进入交互界面：

```bash
ccb
```

### 5.2 通过 /login 配置 DeepSeek

进入 CCB 后，在命令输入框中输入：

```text
/login
```

配置界面支持通过 `Tab` / `Shift+Tab` 键切换输入框，按 `Enter` 确认并跳至下一项。请按下表进行参数配置：

| 配置字段 | 字段说明 | 推荐填写值 |
| :--- | :--- | :--- |
| **Login Method** | 登录/供应商模式 | `Anthropic Compatible` |
| **Base URL** | 接口基地址 | `https://api.deepseek.com/anthropic` |
| **API Key** | 密钥 | 填写自 DeepSeek 平台获取的 Key (`sk-...`) |
| **Haiku Model** | 轻量快速模型 | `deepseek-v4-flash` |
| **Sonnet Model** | 均衡性能模型 | `deepseek-v4-flash` |
| **Opus Model** | 高性能复杂任务模型 | `deepseek-v4-pro` |

填写完毕后，在最后一个字段按 `Enter` 保存。配置将自动存入本地，后续启动无需重复配置。

### 5.3 模型映射逻辑说明

由于 Claude Code 原生架构将模型能力划分为 **Haiku / Sonnet / Opus** 三个档位，在接入 DeepSeek 时可按照使用场景进行映射：

- `deepseek-v4-flash`：响应速度极快、成本低，适合日常代码补全、小段问答与基础分析。
- `deepseek-v4-pro`：逻辑推理能力强，适合复杂代码重构、多文件分析与系统设计。

> **注意**：DeepSeek 官方模型名称若有更新，请以 [DeepSeek API 官方文档](https://api-docs.deepseek.com/zh-cn/) 为准。

---

## 六、日常使用与维护

### 6.1 常用终端命令

在 CCB 交互环境或终端中可使用以下指令：

| 指令 | 作用 |
| :--- | :--- |
| `ccb` | 启动 CCB 终端 |
| `ccb-bun` | 使用 Bun 运行时启动（需要系统已安装 Bun） |
| `ccb update` | 检查并更新 CCB 至最新版本 |
| `/login` | 打开配置界面重新调整模型或 API 参数 |
| `/goal <目标描述>` | 设定持续驱动任务目标 |
| `/poor` | 切换为低频模式（减少并发与请求消耗） |
| `/quit` 或 `Ctrl+C` | 退出 CCB |

### 6.2 在 VS Code 中配合使用

VS Code 中的 Claude Code 插件本质上是 IDE 前端界面，后台逻辑依然依赖本地启动的 CLI 进程。

1. 在 VS Code 扩展商店中搜索并安装 **Claude Code**（发布者 `anthropic.claude-code`）。
2. 该插件会自动识别本地配置并链接由 CCB 托管的环境。

### 6.3 版本更新与卸载

```bash
# 更新至最新版本
npm i -g claude-code-best@latest

# 完全卸载 CCB
npm rm -g claude-code-best
```



## 七、参考链接

- [claude-code-best GitHub 官方仓库](https://github.com/claude-code-best/claude-code)
- [Claude Code Best 在线文档](https://ccb.agent-aura.top)
- [DeepSeek API 官方文档](https://api-docs.deepseek.com/zh-cn/)
- [Node.js 官方下载页面](https://nodejs.org/)

---

> **文档维护说明**：本文档更新于 2026-07-22。鉴于开源项目与 API 迭代频繁，若遇到接口或参数调整，请以对应官方仓库说明为准。
