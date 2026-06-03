# macOS 重设计 P0 — 设计基础 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 建立 macOS HIG 设计系统基础层——统一 token、主题（system/light/dark/sunset/forest）、三栏 Shell 壳层、Titlebar、8 个基础 UI 组件，并将 `App.tsx` / `MainPage.tsx` 接入新壳层。

**Architecture:** 以 `macos-tokens.css` 为单一 CSS 变量源；`useMacTheme` 监听系统偏好并应用 preset 映射；`createMacMuiTheme()` 从 CSS 变量生成 MUI theme；`MacAppShell` 包裹现有 Sidebar + Routes，P0 阶段 Item List 用占位组件；Electron 复用已有 `window.electronAPI` IPC。

**Tech Stack:** React 18, TypeScript, Vite 8, MUI 5, Emotion, Electron 36, Vitest

**Spec:** `docs/superpowers/specs/2026-06-01-macos-redesign-design.md`

---

## 文件结构（P0 新增/修改）

| 文件 | 职责 |
|------|------|
| `src/styles/macos-tokens.css` | light/dark 媒体查询 + sunset/forest 语义映射 |
| `src/utils/macThemePresets.ts` | macOS 语义 token preset 定义 |
| `src/hooks/useMacTheme.ts` | 主题应用 + 系统监听 |
| `src/theme/createMacMuiTheme.ts` | 从 CSS 变量生成 MUI theme |
| `src/components/macos/MacAppShell.tsx` | 顶层壳 |
| `src/components/macos/MacTitlebar.tsx` | Titlebar + traffic lights |
| `src/components/macos/MacSplitView.tsx` | 三栏可拖拽布局 |
| `src/components/macos/MacSourceList.tsx` | 第一栏（包装 Sidebar 导航数据） |
| `src/components/macos/MacItemList.tsx` | 第二栏占位 |
| `src/components/macos/MacDetailPane.tsx` | 第三栏容器 |
| `src/components/macos/MacListRow.tsx` | 标准列表行 |
| `src/components/macos/MacToolbar.tsx` | 工具栏 |
| `src/components/macos/index.ts` |  barrel export |
| `src/components/ui/ThemeProvider.tsx` | 改用 `createMacMuiTheme` |
| `src/App.tsx` | 删除内联 theme，接入 MacAppShell |
| `src/pages/MainPage.tsx` | Detail 区接入 MacDetailPane |
| `electron/main.ts` | `frame: false` + titleBarOverlay（可选） |
| `index.html` | 移除 Inter 字体 |

---

## Task 1: 扩展 macOS Design Tokens

**Files:**
- Modify: `src/styles/macos-tokens.css`
- Create: `src/utils/macThemePresets.ts`
- Test: `src/utils/macThemePresets.test.ts`

- [x] **Step 1: 写失败测试**

```ts
// src/utils/macThemePresets.test.ts
import { describe, it, expect } from 'vitest';
import { MAC_THEME_PRESETS, getMacPreset, mapPresetToSemanticTokens } from './macThemePresets';

describe('macThemePresets', () => {
  it('includes system presets and sunset/forest', () => {
    const ids = MAC_THEME_PRESETS.map((p) => p.id);
    expect(ids).toContain('light');
    expect(ids).toContain('dark');
    expect(ids).toContain('sunset');
    expect(ids).toContain('forest');
  });

  it('maps sunset to semantic bg and accent tokens', () => {
    const mapped = mapPresetToSemanticTokens(getMacPreset('sunset')!);
    expect(mapped['--bg-base']).toBeTruthy();
    expect(mapped['--system-blue']).toBeTruthy();
  });
});
```

- [x] **Step 2: 运行测试确认失败**

Run: `cd /home/hermes/projects/pixel-pal-web && pnpm exec vitest run src/utils/macThemePresets.test.ts`
Expected: FAIL — module not found

- [x] **Step 3: 实现 preset 映射**

```ts
// src/utils/macThemePresets.ts
export type MacThemeId = 'light' | 'dark' | 'sunset' | 'forest';

export interface MacThemePreset {
  id: MacThemeId;
  label: string;
  dataTheme: string;
  variables: Record<string, string>;
}

/** macOS 语义 token — sunset/forest 覆盖 accent/background，结构不变 */
export const MAC_THEME_PRESETS: MacThemePreset[] = [
  {
    id: 'light',
    label: '浅色',
    dataTheme: 'light',
    variables: {
      '--bg-base': '#FFFFFF',
      '--bg-elevated': '#F5F5F7',
      '--bg-sidebar': 'rgba(246, 246, 246, 0.72)',
      '--bg-input': 'rgba(0, 0, 0, 0.04)',
      '--bg-hover': 'rgba(0, 0, 0, 0.04)',
      '--bg-active': 'rgba(0, 0, 0, 0.08)',
      '--text-primary': '#000000',
      '--text-secondary': 'rgba(0, 0, 0, 0.55)',
      '--text-tertiary': 'rgba(0, 0, 0, 0.25)',
      '--separator': 'rgba(0, 0, 0, 0.1)',
      '--system-blue': '#007AFF',
    },
  },
  {
    id: 'dark',
    label: '深色',
    dataTheme: 'dark',
    variables: {
      '--bg-base': '#1E1E1E',
      '--bg-elevated': '#2D2D2D',
      '--bg-sidebar': 'rgba(30, 30, 30, 0.72)',
      '--bg-input': 'rgba(255, 255, 255, 0.04)',
      '--bg-hover': 'rgba(255, 255, 255, 0.06)',
      '--bg-active': 'rgba(255, 255, 255, 0.08)',
      '--text-primary': '#FFFFFF',
      '--text-secondary': 'rgba(255, 255, 255, 0.6)',
      '--text-tertiary': 'rgba(255, 255, 255, 0.3)',
      '--separator': 'rgba(255, 255, 255, 0.08)',
      '--system-blue': '#0A84FF',
    },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    dataTheme: 'sunset',
    variables: {
      '--bg-base': '#1A1410',
      '--bg-elevated': '#2D1F15',
      '--bg-sidebar': 'rgba(26, 20, 16, 0.85)',
      '--bg-input': 'rgba(255, 255, 255, 0.05)',
      '--bg-hover': 'rgba(249, 115, 22, 0.08)',
      '--bg-active': 'rgba(249, 115, 22, 0.12)',
      '--text-primary': '#F5E6D3',
      '--text-secondary': '#B8998A',
      '--text-tertiary': 'rgba(184, 153, 138, 0.5)',
      '--separator': 'rgba(74, 53, 37, 0.8)',
      '--system-blue': '#F97316',
    },
  },
  {
    id: 'forest',
    label: 'Forest',
    dataTheme: 'forest',
    variables: {
      '--bg-base': '#0F1A14',
      '--bg-elevated': '#1A2D20',
      '--bg-sidebar': 'rgba(15, 26, 20, 0.85)',
      '--bg-input': 'rgba(255, 255, 255, 0.05)',
      '--bg-hover': 'rgba(34, 197, 94, 0.08)',
      '--bg-active': 'rgba(34, 197, 94, 0.12)',
      '--text-primary': '#E0F0E8',
      '--text-secondary': '#8AB89A',
      '--text-tertiary': 'rgba(138, 184, 154, 0.5)',
      '--separator': 'rgba(45, 74, 53, 0.8)',
      '--system-blue': '#22C55E',
    },
  },
];

export function getMacPreset(id: string): MacThemePreset | undefined {
  return MAC_THEME_PRESETS.find((p) => p.id === id);
}

export function mapPresetToSemanticTokens(preset: MacThemePreset): Record<string, string> {
  return { ...preset.variables };
}

export function applyMacThemePreset(preset: MacThemePreset): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', preset.dataTheme);
  Object.entries(mapPresetToSemanticTokens(preset)).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}
```

- [x] **Step 4: 扩展 CSS token 文件**

在 `src/styles/macos-tokens.css` 末尾追加：

```css
:root {
  --titlebar-height: 52px;
  --sidebar-width-source: 220px;
  --sidebar-width-item: 280px;
  --separator: rgba(255, 255, 255, 0.08);
  --control-radius: 6px;
}

@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]):not([data-theme="sunset"]):not([data-theme="forest"]) {
    --bg-base: #FFFFFF;
    --bg-elevated: #F5F5F7;
    --bg-sidebar: rgba(246, 246, 246, 0.72);
    --text-primary: #000000;
    --text-secondary: rgba(0, 0, 0, 0.55);
    --separator: rgba(0, 0, 0, 0.1);
    --system-blue: #007AFF;
  }
}

[data-theme="sunset"] { /* variables applied via JS */ }
[data-theme="forest"] { /* variables applied via JS */ }
```

- [x] **Step 5: 运行测试**

Run: `pnpm exec vitest run src/utils/macThemePresets.test.ts`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add src/styles/macos-tokens.css src/utils/macThemePresets.ts src/utils/macThemePresets.test.ts
git commit -m "feat(macos): add semantic theme presets with sunset/forest mapping"
```

---

## Task 2: useMacTheme Hook

**Files:**
- Create: `src/hooks/useMacTheme.ts`
- Modify: `src/utils/appTheme.ts`（re-export 或标记 `@deprecated`，保留向后兼容）
- Test: `src/hooks/useMacTheme.test.ts`

- [x] **Step 1: 写失败测试**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMacTheme } from './useMacTheme';

describe('useMacTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('applies dark preset when mode is dark', () => {
    const { result } = renderHook(() => useMacTheme({ mode: 'dark', presetId: 'dark' }));
    act(() => result.current.apply());
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('uses system light when mode is system and prefers light', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
    const { result } = renderHook(() => useMacTheme({ mode: 'system', presetId: 'dark' }));
    act(() => result.current.apply());
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm exec vitest run src/hooks/useMacTheme.test.ts`
Expected: FAIL

- [x] **Step 3: 实现 hook**

```ts
// src/hooks/useMacTheme.ts
import { useCallback, useEffect } from 'react';
import { applyMacThemePreset, getMacPreset, type MacThemeId } from '../utils/macThemePresets';
import { getSystemTheme } from '../utils/appTheme';

export type MacThemeMode = 'system' | 'light' | 'dark' | MacThemeId;

export interface UseMacThemeOptions {
  mode: MacThemeMode;
  presetId: string;
}

function resolvePresetId(mode: MacThemeMode, presetId: string): MacThemeId {
  if (mode === 'system') return getSystemTheme();
  if (mode === 'light' || mode === 'dark' || mode === 'sunset' || mode === 'forest') return mode;
  const fromPreset = getMacPreset(presetId);
  return (fromPreset?.id ?? 'dark') as MacThemeId;
}

export function useMacTheme({ mode, presetId }: UseMacThemeOptions) {
  const apply = useCallback(() => {
    const id = resolvePresetId(mode, presetId);
    const preset = getMacPreset(id);
    if (preset) applyMacThemePreset(preset);
  }, [mode, presetId]);

  useEffect(() => { apply(); }, [apply]);

  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => apply();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode, apply]);

  return { apply, resolvedPresetId: resolvePresetId(mode, presetId) };
}
```

- [x] **Step 4: 运行测试**

Run: `pnpm exec vitest run src/hooks/useMacTheme.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/hooks/useMacTheme.ts src/hooks/useMacTheme.test.ts
git commit -m "feat(macos): add useMacTheme hook with system preference support"
```

---

## Task 3: MUI Theme 从 Token 生成

**Files:**
- Create: `src/theme/createMacMuiTheme.ts`
- Modify: `src/components/ui/ThemeProvider.tsx`
- Test: `src/theme/createMacMuiTheme.test.ts`

- [x] **Step 1: 写失败测试**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createMacMuiTheme } from './createMacMuiTheme';

describe('createMacMuiTheme', () => {
  beforeEach(() => {
    document.documentElement.style.setProperty('--bg-base', '#1E1E1E');
    document.documentElement.style.setProperty('--system-blue', '#0A84FF');
    document.documentElement.style.setProperty('--text-primary', '#FFFFFF');
  });

  it('creates dark theme with SF Pro stack', () => {
    const theme = createMacMuiTheme('dark');
    expect(theme.palette?.mode).toBe('dark');
    expect(theme.typography?.fontFamily).toContain('-apple-system');
    expect(theme.shape?.borderRadius).toBe(8);
  });
});
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm exec vitest run src/theme/createMacMuiTheme.test.ts`
Expected: FAIL

- [x] **Step 3: 实现 createMacMuiTheme**

```ts
// src/theme/createMacMuiTheme.ts
import { createTheme } from '@mui/material/styles';

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function createMacMuiTheme(mode: 'light' | 'dark') {
  return createTheme({
    palette: {
      mode,
      primary: { main: cssVar('--system-blue', '#007AFF') },
      background: {
        default: cssVar('--bg-base', mode === 'dark' ? '#1E1E1E' : '#FFFFFF'),
        paper: cssVar('--bg-elevated', mode === 'dark' ? '#2D2D2D' : '#F5F5F7'),
      },
      text: {
        primary: cssVar('--text-primary', mode === 'dark' ? '#FFFFFF' : '#000000'),
        secondary: cssVar('--text-secondary', 'rgba(128,128,128,1)'),
      },
      divider: cssVar('--separator', 'rgba(128,128,128,0.2)'),
    },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
      fontSize: 13,
      button: { textTransform: 'none', fontWeight: 500 },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFamily: 'var(--font-stack)',
            backgroundColor: 'var(--bg-base)',
            color: 'var(--text-primary)',
          },
        },
      },
    },
  });
}
```

- [x] **Step 4: 简化 ThemeProvider**

修改 `ThemeProvider.tsx`：接受 `mode: 'light' | 'dark'`，内部调用 `createMacMuiTheme(mode)`，删除文件内 `darkTheme`/`lightTheme` 硬编码对象（保留 Global scrollbar 样式）。

- [x] **Step 5: 运行测试 + lint**

Run: `pnpm exec vitest run src/theme/createMacMuiTheme.test.ts && pnpm run lint`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add src/theme/createMacMuiTheme.ts src/theme/createMacMuiTheme.test.ts src/components/ui/ThemeProvider.tsx
git commit -m "feat(macos): generate MUI theme from CSS semantic tokens"
```

---

## Task 4: macOS Shell 组件

**Files:**
- Create: `src/components/macos/MacSplitView.tsx`
- Create: `src/components/macos/MacDetailPane.tsx`
- Create: `src/components/macos/MacItemList.tsx`
- Create: `src/components/macos/MacListRow.tsx`
- Create: `src/components/macos/MacToolbar.tsx`
- Create: `src/components/macos/index.ts`

- [x] **Step 1: 实现 MacSplitView**

```tsx
// src/components/macos/MacSplitView.tsx
import { css } from '@emotion/react';
import { ReactNode, useState } from 'react';

interface MacSplitViewProps {
  source: ReactNode;
  itemList: ReactNode;
  detail: ReactNode;
}

export function MacSplitView({ source, itemList, detail }: MacSplitViewProps) {
  const [itemWidth, setItemWidth] = useState(280);

  return (
    <div css={css({ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' })}>
      <aside css={css({
        width: 'var(--sidebar-width-source, 220px)',
        flexShrink: 0,
        borderRight: '1px solid var(--separator)',
        background: 'var(--bg-sidebar)',
        backdropFilter: 'blur(20px)',
        overflowY: 'auto',
      })}>
        {source}
      </aside>
      <aside css={css({
        width: itemWidth,
        flexShrink: 0,
        borderRight: '1px solid var(--separator)',
        background: 'var(--bg-elevated)',
        overflowY: 'auto',
      })}>
        {itemList}
      </aside>
      <main css={css({ flex: 1, minWidth: 0, overflow: 'hidden', background: 'var(--bg-base)' })}>
        {detail}
      </main>
    </div>
  );
}
```

- [x] **Step 2: 实现 MacDetailPane / MacItemList 占位**

```tsx
// MacDetailPane.tsx — 容器 + 可选 toolbar slot
// MacItemList.tsx — P0 占位："选择一项以查看详情" 空状态
// MacListRow.tsx — 图标 + title + subtitle + selected 背景 var(--bg-active)
// MacToolbar.tsx — flex row, gap 8px, 按钮用 MyIconButton
```

- [x] **Step 3: barrel export**

```ts
// src/components/macos/index.ts
export { MacSplitView } from './MacSplitView';
export { MacDetailPane } from './MacDetailPane';
export { MacItemList } from './MacItemList';
export { MacListRow } from './MacListRow';
export { MacToolbar } from './MacToolbar';
```

- [x] **Step 4: 手动验证**

Run: `pnpm run dev`，临时在 Story 或测试页渲染 `<MacSplitView source={...} itemList={...} detail={...} />`
Expected: 三栏可见，分隔线使用 `--separator`

- [x] **Step 5: Commit**

```bash
git add src/components/macos/
git commit -m "feat(macos): add SplitView shell components for P0"
```

---

## Task 5: MacTitlebar + Electron 窗口

**Files:**
- Create: `src/components/macos/MacTitlebar.tsx`
- Create: `src/components/macos/MacAppShell.tsx`
- Modify: `electron/main.ts`（`frame: false`, `titleBarOverlay` 或 transparent）
- Modify: `index.html`（移除 Inter）

- [x] **Step 1: 实现 MacTitlebar**

```tsx
// src/components/macos/MacTitlebar.tsx
import { css } from '@emotion/react';

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

export function MacTitlebar({ title, toolbar }: { title: string; toolbar?: React.ReactNode }) {
  return (
    <header css={css({
      height: 'var(--titlebar-height, 52px)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      borderBottom: '1px solid var(--separator)',
      background: 'var(--bg-sidebar)',
      backdropFilter: 'blur(20px)',
      WebkitAppRegion: 'drag',
      userSelect: 'none',
    })}>
      {isElectron && (
        <div css={css({ display: 'flex', gap: 8, WebkitAppRegion: 'no-drag' })}>
          <button aria-label="Close" onClick={() => window.electronAPI.close()}
            css={css({ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57', border: 'none', cursor: 'pointer' })} />
          <button aria-label="Minimize" onClick={() => window.electronAPI.minimize()}
            css={css({ width: 12, height: 12, borderRadius: '50%', background: '#FEBC2E', border: 'none', cursor: 'pointer' })} />
          <button aria-label="Maximize" onClick={() => window.electronAPI.maximize()}
            css={css({ width: 12, height: 12, borderRadius: '50%', background: '#28C840', border: 'none', cursor: 'pointer' })} />
        </div>
      )}
      <span css={css({ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' })}>
        {title}
      </span>
      <div css={css({ WebkitAppRegion: 'no-drag' })}>{toolbar}</div>
    </header>
  );
}
```

- [x] **Step 2: 实现 MacAppShell**

```tsx
// MacAppShell.tsx — column flex: Titlebar + MacSplitView
export function MacAppShell({ title, source, itemList, detail, toolbar }: Props) {
  return (
    <div css={css({ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' })}>
      <MacTitlebar title={title} toolbar={toolbar} />
      <MacSplitView source={source} itemList={itemList} detail={detail} />
    </div>
  );
}
```

- [x] **Step 3: 修改 electron/main.ts**

在 `createWindow` 的 `BrowserWindow` 选项中添加：

```ts
frame: false,
transparent: process.platform === 'darwin',
backgroundColor: '#00000000',
```

确认已有 IPC handler：`window:minimize`, `window:maximize`, `window:close`（preload 已暴露）。

- [x] **Step 4: 移除 Inter 字体**

删除 `index.html` 中 Google Fonts 三行 `<link>`；更新 `theme-color` 为 `#007AFF`。

- [x] **Step 5: Commit**

```bash
git add src/components/macos/MacTitlebar.tsx src/components/macos/MacAppShell.tsx electron/main.ts index.html
git commit -m "feat(macos): add titlebar with Electron traffic lights"
```

---

## Task 6: MacSourceList（包装现有 Sidebar 导航）

**Files:**
- Create: `src/components/macos/MacSourceList.tsx`
- Modify: `src/components/Layout/Sidebar.tsx`（导出 NAV_ITEMS 常量供复用，或迁移至 `src/config/navItems.ts`）

- [x] **Step 1: 提取导航配置**

```ts
// src/config/navItems.ts — 从 Sidebar.tsx 移出 NAV_ITEMS 数组
```

- [x] **Step 2: 实现 MacSourceList**

使用 `MacListRow` 渲染分组：
- **工作区**: chat, tasks, calendar, knowledge, writing, email
- **工具**: agent, tools, mcp, plugin, analytics
- **其他**: settings

选中态：`background: var(--bg-active)`，`color: var(--system-blue)`

点击行为：复用 Sidebar 现有 `handleNavClick` 逻辑（复制或提取为 `useNavClick` hook）

- [x] **Step 3: Commit**

```bash
git add src/config/navItems.ts src/components/macos/MacSourceList.tsx src/components/Layout/Sidebar.tsx
git commit -m "feat(macos): add Source List navigation component"
```

---

## Task 7: 改造 8 个 MUI替代 基础组件

**Files:**
- Modify: `src/components/MUI替代/基础组件/MyButton.tsx`
- Modify: `src/components/MUI替代/基础组件/MyIconButton.tsx`
- Modify: `src/components/MUI替代/MyTextField.tsx`
- Modify: `src/components/MUI替代/MyDialog.tsx`
- Modify: `src/components/MUI替代/MyTabs.tsx`
- Modify: `src/components/MUI替代/MyListItemButton.tsx`
- Modify: `src/components/MUI替代/MyTooltip.tsx`
- Modify: `src/components/MUI替代/基础组件/MySwitch.tsx`

- [x] **Step 1: MyButton — 改用 CSS 变量**

将 `colorMap.primary.bg` 等硬编码替换为 `var(--system-blue)`；ghost 变体 `background: var(--bg-hover)`；圆角 `var(--control-radius, 6px)`。

- [x] **Step 2: MyTextField — macOS 内凹输入框**

```tsx
background: 'var(--bg-input)',
border: '1px solid var(--separator)',
borderRadius: 'var(--control-radius, 6px)',
'&:focus-within': { outline: '2px solid var(--system-blue)', outlineOffset: 1 },
```

- [x] **Step 3: MyDialog — 10px 圆角 + shadow-lg**

`borderRadius: 'var(--radius-lg, 10px)'`, `boxShadow: 'var(--shadow-lg)'`

- [x] **Step 4: MyTabs — Segmented Control 风格**

容器 `background: var(--bg-input)`, `borderRadius: 8px`, `padding: 2px`；选中 tab `background: var(--bg-elevated)`, `boxShadow: var(--shadow-sm)`

- [x] **Step 5: MyListItemButton / MyIconButton / MyTooltip / MySwitch**

统一 hover → `var(--bg-hover)`；tooltip 背景 `rgba(0,0,0,0.75)`；switch 轨道对齐 macOS toggle 尺寸（51×31）

- [x] **Step 6: 视觉验证**

Run: `pnpm run dev`，打开 Settings 页检查按钮、输入框、Tab、Dialog
Expected: 无硬编码 `#007AFF` 残留（组件内），主题切换后颜色跟随

- [x] **Step 7: Commit**

```bash
git add src/components/MUI替代/
git commit -m "feat(macos): restyle core MUI wrapper components with semantic tokens"
```

---

## Task 8: 接入 App.tsx — 删除内联 Theme

**Files:**
- Modify: `src/App.tsx`（删除 `linearDarkTheme` / `minimaxLightTheme` ~950 行）
- Modify: `src/store/index.ts`（`appThemeMode` 移除 `'minimax'`，默认 `'system'`）

- [x] **Step 1: 替换 theme 逻辑**

```tsx
// App.tsx 关键变更
import { useMacTheme } from './hooks/useMacTheme';
import { createMacMuiTheme } from './theme/createMacMuiTheme';
import { MacAppShell, MacSourceList, MacItemList, MacDetailPane } from './components/macos';

function App() {
  const appThemeMode = useStore((s) => s.appThemeMode);
  const appThemePresetId = useStore((s) => s.appThemePresetId);
  const { resolvedPresetId } = useMacTheme({
    mode: appThemeMode === 'minimax' ? 'light' : appThemeMode as MacThemeMode,
    presetId: appThemePresetId,
  });
  const muiTheme = createMacMuiTheme(resolvedPresetId === 'light' ? 'light' : 'dark');
  const activePanel = useStore((s) => s.activePanel);

  return (
    <HashRouter>
      <ThemeProvider theme={muiTheme}>
        <MacAppShell
          title={`PixelPal — ${activePanel}`}
          source={<MacSourceList />}
          itemList={<MacItemList panel={activePanel} />}
          detail={
            <Box css={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <Routes>...</Routes>
              <CostAlertToast />
            </Box>
          }
        />
      </ThemeProvider>
    </HashRouter>
  );
}
```

- [x] **Step 2: 删除内联 theme 对象**

删除 `linearDarkTheme` 和 `minimaxLightTheme` 常量及所有 `Mui*` styleOverrides（~lines 30-982）。

- [x] **Step 3: Store 迁移**

`appThemeMode` 类型改为 `'system' | 'light' | 'dark'`；preset 仍用 `appThemePresetId` 存 sunset/forest；Settings 中 minimax 选项映射为 `light`。

- [x] **Step 4: 运行 dev 验证**

Run: `pnpm run dev`
Expected:
- 三栏壳层显示
- 主题切换 system/light/dark/sunset/forest 有效
- 无 console theme 相关错误

- [x] **Step 5: Commit**

```bash
git add src/App.tsx src/store/index.ts
git commit -m "refactor(macos): replace inline MUI themes with MacAppShell integration"
```

---

## Task 9: MainPage 接入 Detail 区

**Files:**
- Modify: `src/pages/MainPage.tsx`

- [x] **Step 1: 移除 MainPage 重复背景壳**

删除 `bgcolor: '#08090a'` 等硬编码；内容区使用 `MacDetailPane` 包裹 `resolvePanelComponent()` 输出。

- [x] **Step 2: P0 占位 Item List 内容**

`MacItemList` 根据 `activePanel` 显示简单占位列表（如 chat 显示 "默认会话" 一行），P1 再替换为真实数据。

- [x] **Step 3: 验证面板切换**

点击 Source List 各 nav item，Detail 区应切换 ChatPanel / Tasks 等组件。

- [x] **Step 4: Commit**

```bash
git add src/pages/MainPage.tsx src/components/macos/MacItemList.tsx
git commit -m "feat(macos): wire MainPage panels into Detail pane"
```

---

## Task 10: P0 验收与文档

**Files:**
- Modify: `docs/superpowers/specs/2026-06-01-macos-redesign-design.md`（标记 P0 checklist 完成）
- Modify: `README.md`（可选：补充主题说明）

- [x] **Step 1: 运行全量检查**

```bash
pnpm run lint
pnpm exec vitest run src/utils/macThemePresets.test.ts src/hooks/useMacTheme.test.ts src/theme/createMacMuiTheme.test.ts
pnpm run build
```

Expected: 全部 PASS

- [x] **Step 2: 手动 QA Checklist**

| 检查项 | 预期 |
|--------|------|
| 启动应用 | 三栏 + titlebar 可见 |
| system 主题 | 跟随 OS 浅色/深色 |
| sunset/forest | 背景与 accent 变色，布局不变 |
| Electron traffic lights | 最小化/关闭可用（WSL 可跳过） |
| ChatPanel | 在 Detail 区正常渲染 |
| 无 Inter 字体 | DevTools computed font 为 SF 系统栈 |

- [x] **Step 3: 更新 spec P0 checklist**

- [x] **Step 4: Commit**

```bash
git add docs/
git commit -m "docs(macos): mark P0 design foundation complete"
```

---

## Spec 覆盖自检

| Spec 要求 | 对应 Task |
|-----------|-----------|
| macos-tokens 单一源 | Task 1 |
| system/light/dark/sunset/forest | Task 1, 2 |
| MacAppShell + SplitView | Task 4, 5 |
| MacTitlebar + Electron | Task 5 |
| MUI替代 8 组件 | Task 7 |
| 删除 App.tsx 内联 theme | Task 8 |
| MainPage 接入 | Task 9 |
| SF Pro 字体栈 | Task 5 (index.html) |

**P1 范围（本 plan 不含）:** ChatPanel/Tasks/Knowledge/Settings 三栏数据绑定

---

## 风险提醒

1. **删除 App.tsx 大段 Mui override** 可能导致部分页面样式回退 — Task 7 必须先完成
2. **`appThemeMode: 'minimax'`** 持久化用户需映射到 `light` — Task 8 store 迁移
3. **WSL Electron** titlebar 可渲染但窗口控制可能受限 — Web 端验证为主

---

## 执行方式

Plan 已保存。请选择执行方式：

**1. Subagent-Driven（推荐）** — 每个 Task 派发独立 subagent，任务间 review，迭代快

**2. Inline Execution** — 在本会话按 Task 顺序直接实现，每 2–3 个 Task 设 checkpoint 供你 review

请问选哪种？
