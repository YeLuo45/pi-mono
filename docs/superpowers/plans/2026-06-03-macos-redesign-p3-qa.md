# macOS 重设计 P3 — Lint 与视觉 QA

**日期**: 2026-06-03  
**范围**: P3 收尾验证（lint、单元测试、手工视觉 QA）

---

## 1. 自动化检查

在仓库根目录执行：

```bash
cd /home/hermes/projects/pixel-pal-web
pnpm run lint
pnpm run build
pnpm exec vitest run \
  src/utils/macThemePresets.test.ts \
  src/utils/personaTheme.test.ts \
  src/hooks/useMacTheme.test.ts \
  src/theme/createMacMuiTheme.test.ts \
  src/components/macos/__tests__/MacSourceList.test.ts
```

| 检查项 | 通过标准 |
|--------|----------|
| ESLint | 无 error（warning 可记录待办） |
| `vite build` | 构建成功，无 TS 报错 |
| macOS 相关 vitest | 全部 green |

---

## 2. 视觉 QA（桌面 ≥1024px）

- [ ] **三栏布局**：Source / Item / Detail 均可见，分隔线为 `var(--separator)`
- [ ] **主题**：system / light / dark / sunset / forest 切换无大面积闪烁
- [ ] **Persona 跟随主题**：accent 体现在按钮/选中态（`--system-blue`）
- [ ] **Titlebar**：Electron traffic lights 可点；中间标题随面板/路由变化
- [ ] **工具栏**：Analytics 导出、Execution 刷新、Memory 刷新、Evolution 运行进化

### 分面板抽检（中间栏 + 详情联动）

| 面板 | 中间栏 | 详情区应隐藏重复 UI |
|------|--------|---------------------|
| chat | 会话列表 | — |
| tasks | 筛选 | 顶部筛选 Tabs |
| memory | 6 视图 | 顶部 Tabs |
| analytics | 7d/30d/90d | 时间范围 Toggle |
| agent | 筛选 + 任务 | TaskQueue 内 Tabs |
| mcp | clients/tools/logs | 顶部 Tab 条 |
| tools | 注册表/历史 | 双栏同屏 |
| execution | 日志列表 | 列表重复 |
| plugin | 插件列表 | Hub 网格 |
| evolution | 5 Tab + 时间线事件 | 顶部 Tabs |
| graph | 打开图谱 | —（对话框） |

---

## 3. 响应式 QA

| 宽度 | Source | Item | Detail |
|------|--------|------|--------|
| ≥1025px | 可见 | 可见 | 可见 |
| 640–1024px | 隐藏 | 可见 | 可见 |
| &lt;640px | 抽屉 | 上 40vh | 剩余 |

- [ ] 移动端左上角菜单打开 **MacSourceList**（非旧 Sidebar）
- [ ] 底部 **BottomTabNav** 使用 macOS token（毛玻璃 + `--separator`）

---

## 4. 路由回归

- [ ] `/` 主壳
- [ ] `/knowledge`
- [ ] `/skill-store`、`/skill-store/:category`
- [ ] `/skill-dev`
- [ ] `/settings/providers` → 重定向并选中 providers
- [ ] `/settings/usage` → 重定向并选中 usage

---

## 5. 已知遗留（非阻塞 P3）

- `index.css` / `design-tokens.ts` 仍含 `#08090a` 营销/遗留变量（MCP 面板已改用语义 token）
- Evolution / RelationGraph 部分交互仍为对话框模式
- `team` 面板未做三栏 Item List（单栏详情即可）

---

## 6. 签收

全部必选项勾选后，在 `2026-06-01-macos-redesign-design.md` P3 将「全站 lint + 视觉 QA」标为完成。
