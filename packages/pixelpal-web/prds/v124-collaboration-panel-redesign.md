# PRD: V124 Multi-Agent Collaboration Panel Redesign

## 1. Concept & Vision

为 V114-V123 的多 Agent 系统提供全新的协作面板。整合任务看板、Agent 时序图、角色链编辑器和实时监控仪表盘，提供统一的一站式协作界面。参考 thunderbolt-design 的双层状态 UI 和 ChatDev 的任务看板。

## 2. 功能列表

### 2.1 CollaborationBoard
- 任务看板视图（Todo/InProgress/Done/Failed 列）
- 拖拽任务状态切换
- Agent-任务指派显示
- 实时任务计数

### 2.2 AgentTimeline
- Agent 执行时序图
- 并行任务可视化
- 任务依赖关系线
- 缩放和滚动支持

### 2.3 RoleChainPanel
- 角色链编辑器集成
- 可视化节点编辑
- 链执行状态追踪

### 2.4 UnifiedDashboard
- Agent 状态仪表盘（V117 增强）
- 资源使用监控
- 协作效率指标
- 告警和通知

## 3. 验收标准

- [ ] 看板视图正常渲染
- [ ] 时序图交互正常
- [ ] 角色链面板集成正常
- [ ] 仪表盘数据更新正常
- [ ] 构建通过
- [ ] 部署成功