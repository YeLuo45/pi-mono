# PRD: V117 Collaboration UI Enhancement

## 1. Concept & Vision

为 V114-V116 的多 Agent 系统提供完整的协作 UI，深化 TaskTree 可视化，增加 Agent 状态动态仪表盘、协作文本展开（多 Agent 思维链）和实时进度追踪面板。参考 thunderbolt-design 的双层状态 UI 模式，让用户清晰看到每个 Agent 在任务中的角色和贡献。

## 2. 功能列表

### 2.1 TaskTreeViz Timeline View
- 时间线横向展开，显示任务执行顺序
- 每个节点显示 Agent 图标、执行时长、状态
- 关键路径高亮（红色边框）
- 并行任务组在同一泳道

### 2.2 AgentDashboard
- 网格布局显示所有 Agent 实时状态
- 每个 Agent：avatar、状态灯、当前任务、负载指示器
- 状态：idle/running/completed/failed/unreachable

### 2.3 CollaborativeTextExpander
- 展开多 Agent 思维链
- 每个 Agent 的推理过程用不同颜色标注
- 支持折叠/展开

### 2.4 ProgressPanel
- 总体进度条（X/Y 任务完成）
- 耗时分析（预估 vs 实际）
- 关键路径状态

## 3. 文件清单

```
src/components/Agent/
  AgentDashboard.tsx    — Agent 实时状态网格
  TimelineView.tsx      — 任务时序图
  CollaborativeExpander.tsx — 协作文本展开
  ProgressPanel.tsx     — 进度追踪面板
```

## 4. 验收标准

- [ ] TaskTreeViz 显示 timeline 模式
- [ ] AgentDashboard 显示所有 Agent 状态
- [ ] 协作文本展开正确显示多 Agent 思维链
- [ ] ProgressPanel 显示完成度
- [ ] 构建通过
- [ ] 部署成功
