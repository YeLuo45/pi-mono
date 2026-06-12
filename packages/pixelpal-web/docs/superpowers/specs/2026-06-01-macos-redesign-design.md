# PixelPal Web — macOS HIG 全站重设计规范

**日期**: 2026-06-01  
**状态**: 已评审（用户确认）  
**范围**: 全站 UI 重设计，Design System 先行，分 P0–P3 四阶段交付

---

## 1. 目标与成功标准

### 1.1 目标

将 PixelPal Web / Electron 客户端的视觉与交互统一为 **macOS Notes / Reminders 风格**：

- 三栏 Split View（Source List → Item List → Detail）
- 完整 macOS 窗口 chrome（titlebar、traffic lights、侧栏 vibrancy）
- **默认跟随系统**浅色/深色（`prefers-color-scheme`）
- **保留**用户可选的 `sunset` / `forest` 主题 preset
- 以 `macos-tokens.css` 为单一设计 token 源，消除与 `App.tsx` 内联 MUI 主题、`index.css` 的重复

### 1.2 成功标准

| 指标 | 标准 |
|------|------|
| 视觉一致性 | P3 完成后，所有路由/面板使用同一套 macOS token，无硬编码 `#08090a` 等旧色 |
| 主题 | 「跟随系统」为默认；Settings 可切换 system / light / dark / sunset / forest |
| 布局 | 桌面宽度 ≥1024px 时，核心模块（Chat、Tasks、Knowledge、Settings）均为三栏 |
| Electron | macOS/Windows 桌面端具备可拖拽 titlebar 与窗口控制按钮 |
| 回归 | 现有功能行为不丢失（导航、Persona、插件、Zustand 状态） |
| 移动端 | <768px 退化为单栏 + 返回栈，不阻塞桌面交付 |

### 1.3 非目标（本阶段不做）

- 重写业务逻辑或 API 层
- 将 18+ Zustand 面板全部改为 URL 路由（Phase 2 可选）
- Discord/Telegram 等 Node 频道适配器架构调整
- 移除 PixelPal 桌面宠物（保留为 Detail 区浮动 overlay）

---

## 2. 设计决策摘要

| 决策项 | 选择 |
|--------|------|
| 布局范式 | Notes / Reminders 三栏 Split View |
| 实现策略 | **方案 1**：Design System 先行，再逐页迁移 |
| 默认主题 | 跟随系统（`system`） |
| 扩展主题 | 保留 `sunset`、`forest`（及现有 `light`/`dark` 手动覆盖） |
| 窗口 chrome | Electron 完整 titlebar + traffic lights + vibrancy |
| Web 部署 | GitHub Pages 无 Electron chrome，仅 Split View 内容区 macOS 化 |

---

## 3. 全局布局架构

### 3.1 桌面结构（≥1024px）

```
┌─ MacTitlebar (52px) ─────────────────────────────────────────┐
│ ● ● ●   PixelPal — {模块名}              [搜索] [+] [···]    │
├────────────┬──────────────────┬───────────────────────────────┤
│ SourceList │ ItemList         │ DetailPane                    │
│ 220px      │ 280px (可拖拽)    │ flex-1                        │
│            │                  │                               │
│ 分组导航    │ 条目列表          │ 主内容与工具栏                  │
└────────────┴──────────────────┴───────────────────────────────┘
         ↑ 可选：PixelPal 宠物浮动于 DetailPane 右下角
```

### 3.2 栏位职责

| 栏位 | 组件 | 职责 | 参考 |
|------|------|------|------|
| Source List | `MacSourceList` | 模块分组导航（工作区 / 工具 / 设置） | Notes 侧边文件夹 |
| Item List | `MacItemList` | 当前模块下的会话、任务、文档等列表 | Reminders 列表 |
| Detail | `MacDetailPane` | 消息流、编辑器、表单、看板 | Notes 编辑区 |

### 3.3 响应式断点

| 断点 | 行为 |
|------|------|
| ≥1024px | 三栏完整显示，列宽可拖拽（`MacSplitView`） |
| 768–1023px | 两栏：Source List 折叠为图标栏 + Item + Detail |
| <768px | 单栏栈：Item List → 点击进入 Detail，返回按钮 |

### 3.4 与现有导航的映射

- **保留** Zustand `activePanel` 作为模块切换状态源
- **保留** 现有 6 条 URL 路由；P2 可选统一为 `/app/:module/:itemId?`
- Sidebar 逻辑迁移至 `MacSourceList`，原 `Sidebar.tsx` 在 P0 完成后标记 deprecated，P3 删除

---

## 4. 设计 Token 体系

### 4.1 单一数据源

**主文件**: `src/styles/macos-tokens.css`

所有颜色、间距、圆角、阴影、字体、动效、z-index 仅在此定义（及 light/dark 媒体查询变体）。其他文件 **禁止** 新增硬编码色值。

**合并与删除（P0）**:

- `App.tsx` 内 `linearDarkTheme` / `minimaxLightTheme` → 改为从 token 生成 MUI theme
- `index.css` 中 Linear/MiniMax 变量 → 迁移至 macos token 或标记废弃
- `src/components/ui/design-tokens.ts` → 从 CSS 变量读取或导出 TS 常量镜像

### 4.2 语义 Token 层级

```
背景: --bg-base, --bg-elevated, --bg-sidebar, --bg-input, --bg-hover, --bg-active
文字: --text-primary, --text-secondary, --text-tertiary
系统色: --system-blue … --system-gray-6
分隔: --separator, --separator-opaque
控件: --control-bg, --control-border, --control-radius
布局: --sidebar-width-source (220px), --sidebar-width-item (280px), --titlebar-height (52px)
效果: --vibrancy-sidebar, --shadow-sm/md/lg, --transition-fast/normal
```

### 4.3 主题模式与优先级

**设置项**（Settings → 外观）:

| 模式 ID | 行为 |
|---------|------|
| `system` | **默认**。监听 `prefers-color-scheme`，应用 macOS light/dark token 集 |
| `light` | 强制 macOS 浅色 token |
| `dark` | 强制 macOS 深色 token |
| `sunset` | 应用 sunset preset，**映射到 macOS 语义 token**（非独立 UI 体系） |
| `forest` | 应用 forest preset，同上 |

**优先级**: 用户手动选择 > `system` 自动 > 浏览器默认

**实现**:

- 新增 `src/hooks/useMacTheme.ts`：合并 `getSystemTheme()`（已有）与 `applyAppTheme()` preset
- sunset/forest 的 preset 变量扩展为覆盖 `--bg-base`、`--bg-sidebar`、`--system-blue`（accent）等语义 token，保证 Split View / 组件无需分支判断
- `data-theme` 属性值：`system-light` | `system-dark` | `light` | `dark` | `sunset` | `forest`

### 4.4 字体

- 移除 Google Fonts Inter（`index.html`）
- 使用 `--font-stack: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif`
- 字号遵循 HIG：正文 13px，标题 15–22px，caption 11px

### 4.5 MUI Theme 生成

`ThemeProvider.tsx` 使用 `@mui/material/styles` 的 `createTheme`，从 CSS 变量读取：

```ts
palette: {
  mode: isDark ? 'dark' : 'light',
  primary: { main: 'var(--system-blue)' },
  background: { default: 'var(--bg-base)', paper: 'var(--bg-elevated)' },
}
typography: { fontFamily: 'var(--font-stack)', fontSize: 13 },
shape: { borderRadius: 8 },
```

删除 `App.tsx` 中 ~1000 行 `components` override，改为 macOS 化后的 `MUI替代` 组件承担样式。

---

## 5. macOS 组件库（`src/components/macos/`）

| 组件 | 职责 |
|------|------|
| `MacAppShell` | 顶层壳：Titlebar + SplitView + 主题 context |
| `MacTitlebar` | 窗口标题、traffic lights、模块工具栏；Web 端隐藏 lights |
| `MacSplitView` | 三栏布局、可拖拽分隔条、最小/最大宽度约束 |
| `MacSourceList` | 分组导航、选中态、折叠 |
| `MacItemList` | 虚拟化长列表、搜索、空状态 |
| `MacDetailPane` | Detail 容器、内嵌 toolbar 槽位 |
| `MacToolbar` | HIG 工具栏按钮组（icon + label 可选） |
| `MacListRow` | 标准列表行（图标、标题、副标题、chevron） |
| `MacSearchField` | 圆角搜索框（Spotlight 风格） |

### 5.1 `MUI替代` 改造清单（P0 优先）

| 组件 | macOS 化要点 |
|------|-------------|
| `MyButton` | 6px 圆角；primary 用 `--system-blue`；ghost 用 `--bg-hover` |
| `MyTextField` | 内凹输入框、`--bg-input`、focus ring |
| `MyDialog` |  sheet 风格圆角 10px、居中、背景 blur |
| `MyTabs` | 分段控制器（Segmented Control）风格 |
| `MyList` / `MyListItem` | 对齐 `MacListRow` |
| `MyIconButton` | 28×28 hit area，hover `--bg-hover` |
| `MyTooltip` | 延迟 500ms，深色半透明背景 |
| `MySwitch` | macOS toggle 外观 |
| `MyMenu` / `MyPopover` | 圆角 8px、阴影 `--shadow-md` |

---

## 6. Electron 窗口 Chrome

### 6.1 BrowserWindow 配置（`electron/main.ts`）

- `titleBarStyle: 'hiddenInset'`（macOS）或 `frame: false` + 自定义 titlebar（跨平台统一）
- `transparent: true` + vibrancy（macOS 可选，`visualEffectState: 'active'`）
- 通过 `preload` 暴露 `window.electron.window.minimize/maximize/close`

### 6.2 MacTitlebar 行为

- 左侧 traffic lights：红关闭、黄最小化、绿最大化（Windows 可映射到同等 IPC）
- 中间标题：`{ProductName} — {模块名}`，模块名来自 `activePanel` i18n
- 右侧：模块级 actions（由 `MacToolbar` slot 注入）
- `-webkit-app-region: drag` / `no-drag` 分区

### 6.3 Web 端差异

- GitHub Pages / 纯浏览器：不渲染 traffic lights，titlebar 高度保留作模块标题栏

---

## 7. 页面迁移计划

### P0 — 设计基础（预估 3–5 天）

- [x] 扩展 `macos-tokens.css`（light/dark 媒体查询 + sunset/forest 映射）
- [x] 实现 `useMacTheme` + 重构 `ThemeProvider`
- [x] 移除 `App.tsx` 内联 MUI theme
- [x] 创建 `macos/` 壳层组件（Shell、Titlebar、SplitView、SourceList、ItemList、DetailPane）
- [x] 改造 8 个 `MUI替代` 基础组件
- [x] Electron titlebar IPC + `main.ts` 窗口配置
- [x] `App.tsx` / `MainPage.tsx` 接入 `MacAppShell`（占位 Detail 即可）

**P0 完成标志**: 应用启动后为 macOS 三栏空壳，主题切换（含 system/sunset/forest）正常。

### P1 — 核心模块（预估 5–7 天）

| 模块 | 文件 | Split View 映射 |
|------|------|-----------------|
| 聊天 | `ChatPanel/` | Item=会话列表，Detail=消息流 |
| 任务 | `Tasks/` | Item=任务组/筛选，Detail=看板或详情 |
| 知识库 | `KnowledgePage` + `Knowledge/` | Item=文档列表，Detail=预览/编辑 |
| 设置 | `Settings/` | Source=设置分组，Detail=表单（System Settings 风格） |

- [x] `macSplitStore` + `ChatItemList` / `TasksItemList` / `KnowledgeItemList` / `SettingsItemList`
- [x] `Tasks` / `Knowledge` / `Settings` 接入 `splitLayout`，中间栏驱动筛选与分区
- [x] `KnowledgePanel` 响应 `knowledgeDocId`（文档预览 +  scoped 搜索）
- [x] Settings「外观」分区仅显示主题表单
- [x] i18n 补全（tasks 筛选、settings 分组、knowledge、macos）
- [ ] MacTitlebar 按 panel 注入工具栏（新建会话等）→ 延至 P2

**P1 完成标志**: 上述 4 模块在三栏布局下功能与现版等价。

### P2 — 扩展模块（预估 5–7 天）

Calendar、Email、Writing、Document、SkillStorePage、SkillDevPage、ProvidersPage、UsageStatsPage

每个模块按相同模式拆分 Item List + Detail；Settings 子路由可嵌入 Settings Detail 区。

- [x] `CalendarItemList` / `EmailItemList` / `WritingItemList` / `DocumentItemList`
- [x] `macSplitStore` 扩展（calendarFilter、emailMessageId、writingMode、documentId）
- [x] Calendar / Email / Writing / Document 接入 `splitLayout`
- [x] `useGmailMessages` 共享邮件列表加载
- [x] `SkillStoreItemList` / `SkillDevItemList` + 路由三栏（`/skill-store`、`/skill-dev`）
- [x] Settings 嵌入 `providers` / `usage`（中间栏分区 + Detail 内嵌）
- [x] `/settings/providers`、`/settings/usage` 重定向回主壳层
- [x] MacTitlebar 按 panel 注入工具栏（`MacPanelToolbar`：analytics / execution / memory）

### P3 — 收尾（预估 3–5 天）

- [x] Memory、Analytics、Plugin、Agent、MCP、Tools、Execution、Graph、Evolution 三栏化（Item List + `splitLayout`）
- [x] `MacSplitView` 响应式（桌面三栏 / 平板隐藏 Source / 移动 Source 进抽屉 + 上项下详）
- [x] `MobileDrawer` 改用 `MacSourceList`
- [x] Persona tint：`applyPersonaTheme` 同步 `--system-blue` accent
- [x] Evolution：主导航 `evolution` 面板 + `EvolutionItemList` + 嵌入 Detail（Settings 卡片仍可调 `openPanel()`）
- [x] 删除 deprecated `Sidebar.tsx`（迁移至 `MacSourceList.test.tsx`）
- [x] 全站 lint + 视觉 QA checklist（见 `docs/superpowers/plans/2026-06-03-macos-redesign-p3-qa.md`；`pnpm run lint` / `pnpm run test:macos`）

---

## 8. 模块布局示例

### 8.1 ChatPanel

```
Source: [聊天] (高亮)
Item:   会话 1 / 会话 2 / … + 搜索
Detail: ChatPanel 消息 + ChatInput
Titlebar 工具: 新建会话、模型选择
```

### 8.2 Tasks

```
Source: [任务]
Item:   全部 / 今天 / 项目 A / …
Detail: Kanban 或任务详情抽屉
```

### 8.3 Knowledge

```
Source: [知识库]
Item:   文档列表 + 标签筛选
Detail: Markdown/ PDF 预览 + 元数据侧栏
```

### 8.4 Settings

```
Source: 通用 | 外观 | AI 提供商 | …
Item:   (可选二级分组)
Detail: 表单 + CollapsiblePanel
外观页: 主题选择 system / light / dark / sunset / forest
```

---

## 9. 数据流与状态

- **不新增** global store 字段（除非 `themeMode: 'system' | 'light' | 'dark' | 'sunset' | 'forest'` 需持久化）
- `activePanel` 继续驱动 Source List 选中态
- 各模块 Item List 选中项：模块内 `useState` 或现有 store slice；P2 可选 URL `:itemId`
- Persona 主题：`personaTheme.ts` 仅写入 `--persona-*` 变量，与 macOS token 叠加

---

## 10. 测试与 QA

| 类型 | 内容 |
|------|------|
| 视觉 | 浅色/深色/system 切换无闪烁；sunset/forest 语义 token 正确 |
| 布局 | 1024/768/375 宽度三档截图对比 |
| Electron | traffic lights 功能；拖拽区域不遮挡按钮 |
| 回归 | 18 个 activePanel 均可达；6 条路由可访问 |
| a11y | 列表键盘导航；focus ring 可见；对比度 ≥ WCAG AA |

---

## 11. 风险与缓解

| 风险 | 缓解 |
|------|------|
| `App.tsx` theme 删除导致 MUI 组件样式回退 | P0 先改 `MUI替代` 再删 override |
| sunset/forest 与 macOS 语义色冲突 | preset 只映射语义 token，不做独立组件分支 |
| Electron vibrancy 跨平台不一致 | macOS 启用 blur；Windows/Linux 降级为半透明 `--bg-sidebar` |
| ChatPanel 1800+ 行拆分困难 | P1 仅包 Split View 外壳，内部组件渐进重构 |
| 移动端三栏不可用 | P3 专门做栈式导航，不阻塞 P0–P2 桌面交付 |

---

## 12. 文件变更预估

**新增**:

- `src/components/macos/*.tsx`（~10 文件）
- `src/hooks/useMacTheme.ts`
- `src/styles/macos-tokens.css`（扩展）

**大幅修改**:

- `src/App.tsx`, `src/pages/MainPage.tsx`
- `src/components/ui/ThemeProvider.tsx`
- `src/utils/appTheme.ts`（sunset/forest → 语义 token 映射）
- `electron/main.ts`, `electron/preload.ts`
- `MUI替代/` 下 8–15 个组件

**删除（P3）**:

- `App.tsx` 内联 theme 对象
- `Sidebar.tsx`（由 MacSourceList 替代）
- `index.css` 中废弃 Linear/MiniMax 块

---

## 13. 审批记录

- **2026-06-01**: 用户确认方案 1、三栏 Split View、P0–P3 分阶段、保留 sunset/forest 主题

---

## 14. 下一步

1. 用户审阅本文档  
2. 通过后调用 `writing-plans` 生成 P0 详细实现计划  
3. 按 P0 → P1 → P2 → P3 顺序实施，每阶段结束前视觉 QA
