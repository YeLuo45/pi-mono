# PRD: V120 Dynamic Agent Role Switching

## 1. Concept & Vision

实现根据任务类型动态分配 Agent 角色的能力。参考 ChatDev 2.0 的角色分配思想，系统根据输入自动选择最优的 Agent 组合和角色配置，而非固定的角色绑定。角色配置可运行时调整，支持自定义角色模板。

## 2. 功能列表

### 2.1 RoleDefinition & RoleRegistry
- 角色定义（name, description, capabilities, preferredAgents）
- 角色注册表支持 CRUD 和模板导入/导出
- 内置常用角色：Coordinator, Executor, Critic, Researcher, Summarizer

### 2.2 RoleAssigner
- 基于任务类型/标签自动分配角色
- 考虑 Agent 可用性和历史成功率
- 支持强制角色覆盖和角色优先级

### 2.3 DynamicRoleConfig
- 运行时调整角色配置
- 角色能力热更新
- 角色切换不影响进行中的任务

### 2.4 RoleAnalytics
- 角色使用统计
- 角色效率分析
- 角色负载均衡

## 3. 文件清单

```
src/services/agent/v120/
  roles/
    RoleDefinition.ts      — 角色定义
    RoleRegistry.ts        — 角色注册表
    RoleAssigner.ts        — 动态角色分配
    DynamicRoleConfig.ts   — 运行时配置
  analytics/
    RoleAnalytics.ts       — 角色分析
  types.ts
  index.ts
```

## 4. 验收标准

- [ ] RoleRegistry 支持角色 CRUD
- [ ] RoleAssigner 正确分配角色
- [ ] DynamicRoleConfig 运行时生效
- [ ] 构建通过
- [ ] 部署成功
