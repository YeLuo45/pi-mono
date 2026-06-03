# PixelPal Web

AI 桌面宠物与工作助手。

## 功能特性

- **PixelPal 宠物**: 可视化的 AI 伙伴
- **任务管理**: 任务面板 + 看板视图
- **日历**: 日历视图与日程管理
- **邮件**: Gmail 邮件查看与回复
- **AI 聊天**: ChatPanel 多功能 AI 对话
- **文档解析**: 支持 PDF、Word、Excel 文档解析
- **设置**: 灵活的个性化配置

## macOS 设计系统

P0 已完成 macOS HIG 设计基础：统一 `macos-tokens.css` 语义 token、`MacAppShell` 三栏壳层，以及从 token 生成的 MUI 主题。外观支持 **system / light / dark / sunset / forest**（默认跟随系统）。本地开发：`pnpm run dev`。

## 技术栈

- React 18 + TypeScript
- Vite 8 (构建工具)
- Electron (Windows 桌面客户端)
- Zustand (状态管理)
- MUI (Material UI) + Emotion
- pdfjs-dist, mammoth, xlsx (文档解析)
- date-fns, react-router-dom, uuid

## 环境要求

- **Node.js** >= 20.19（Vite 8 要求；CI 使用 Node 20）
- **包管理器**: 推荐 [pnpm](https://pnpm.io/)（项目含 `pnpm-lock.yaml`）
- **WSL2**（可选）: 项目在 WSL 中开发时，Electron 桌面窗口需 WSLg 或 X11

## 首次安装

```bash
# 进入项目目录
cd projects/pixel-pal-web

# 安装依赖（推荐 pnpm）
pnpm install
# 或
npm install --legacy-peer-deps

# 可选：复制环境变量模板并填写 API Key
cp .env.example .env
```

若 Electron 启动报错 `Electron failed to install correctly`，在 WSL/Linux 中执行：

```bash
node node_modules/.pnpm/electron@*/node_modules/electron/install.js
```

WSL 默认 Node 版本过低时，可用 `n` 安装 Node 22：

```bash
N_PREFIX=$HOME/.n n 22
export PATH=$HOME/.n/bin:$PATH
```

## 本地运行

### 方式一：一键脚本（推荐）

**WSL / Linux / macOS**

```bash
bash scripts/dev.sh
```

**Windows PowerShell**（通过 WSL 启动，适用于项目在 WSL 文件系统）

```powershell
.\scripts\dev.ps1
```

可选参数示例：

```powershell
.\scripts\dev.ps1 -Distro Ubuntu -ProjectPath /home/hermes/projects/pixel-pal-web -WslUser hermes
```

### macOS 重设计验证（P3）

```bash
pnpm run lint
pnpm run build
pnpm run test:macos
```

手工视觉 QA 清单见 `docs/superpowers/plans/2026-06-03-macos-redesign-p3-qa.md`。

### 方式二：手动命令

**桌面客户端 + Web 热更新（默认）**

```bash
pnpm run dev
# 或
npm run dev
```

- Web 地址: http://127.0.0.1:5173/
- 同时编译并启动 Electron 主进程（`electron/main.ts`）

**仅 Web 预览（模拟 GitHub Pages 路径，不启动 Electron）**

```bash
GITHUB_PAGES=1 pnpm run dev
```

- 地址: http://127.0.0.1:5173/pixel-pal-web/

**生产构建预览**

```bash
pnpm run build
pnpm run preview
```

### 从 Windows PowerShell 调用 WSL 项目

若项目位于 WSL（如 `/home/hermes/projects/pixel-pal-web`），可直接：

```powershell
wsl -d Ubuntu -- env PATH=/home/hermes/.n/bin:/home/hermes/.npm-global/bin:/usr/bin:/bin HOME=/home/hermes DISPLAY=:0 bash --noprofile --norc -c "cd /home/hermes/projects/pixel-pal-web && bash scripts/dev.sh"
```

> 注意：不要在 PowerShell 中直接 `cd \\wsl$\...` 后运行 `npm`，CMD 不支持 UNC 路径作为当前目录。

## 常用脚本

| 命令 | 说明 |
|------|------|
| `pnpm run dev` | 开发模式（Vite + Electron） |
| `GITHUB_PAGES=1 pnpm run dev` | 仅 Web，GitHub Pages 路径 |
| `pnpm run build` | 构建 Web 产物到 `dist/renderer` |
| `pnpm run preview` | 预览生产构建 |
| `pnpm run lint` | ESLint 检查 |
| `pnpm run package` | 打包 Windows NSIS 安装包 |
| `pnpm run package:dir` | 打包免安装目录到 `release/` |

## 构建

```bash
# Web 构建
pnpm run build

# GitHub Pages 构建（与 CI 一致）
GITHUB_PAGES=1 npx vite build

# Electron 桌面客户端
pnpm run package
```

## 部署

- Web: GitHub Pages (https://YeLuo45.github.io/pixel-pal-web)
- Electron: Windows NSIS 安装包 (`release/` 目录)

## 故障排查

| 现象 | 处理 |
|------|------|
| `Vite requires Node.js version 20.19+` | 升级 Node：`N_PREFIX=$HOME/.n n 22` |
| `Electron failed to install correctly` | 运行 Electron 安装脚本（见「首次安装」） |
| PowerShell 下 `'vite' 不是内部或外部命令` | 改用 WSL 内执行，或使用 `scripts/dev.ps1` |
| 依赖扫描警告 `discord.js` / `node-telegram-bot-api` | 正常；这两项为可选频道适配器，GitHub Pages 构建会 external 处理 |
