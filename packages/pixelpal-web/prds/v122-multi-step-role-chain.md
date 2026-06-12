# PRD: V122 Multi-Step Role Chain

## 1. Concept & Vision

实现多步骤角色链功能。一个复杂任务由多个角色顺序执行，每个角色完成子任务后传递给下一个角色。参考 ChatDev 的流水线思想，支持角色链定义、依赖关系图构建、并行分支和结果聚合。

## 2. 功能列表

### 2.1 RoleChain
- 角色链定义（id, name, roles[], condition, resultAggregator）
- 链节点定义（roleId, inputMapping, outputMapping, condition）
- 链执行状态（pending, running, completed, failed, skipped）

### 2.2 RoleChainExecutor
- 顺序执行链中每个角色
- 输入/输出映射（上一个角色输出作为下一个输入）
- 条件跳转（根据执行结果决定下一步）
- 错误处理和回退策略

### 2.3 RoleDependencyGraph
- 可视化角色间的依赖关系
- 检测循环依赖
- 计算关键路径
- 并行分支识别

### 2.4 RoleChainEditor
- 可视化编辑器创建角色链
- 拖拽添加/移除角色
- 连接线定义数据流
- 预览和测试

## 3. 文件清单

```
src/services/agent/v122/
  chain/
    RoleChain.ts          — 角色链定义
    RoleChainExecutor.ts — 链执行器
    ChainState.ts        — 链执行状态
  graph/
    RoleDependencyGraph.ts — 依赖图分析
    GraphVisualizer.tsx   — 依赖图可视化
  editor/
    RoleChainEditor.tsx   — 链编辑器
  types.ts
  index.ts
```

## 4. 验收标准

- [ ] RoleChainExecutor 正确顺序执行
- [ ] 输入/输出映射工作正常
- [ ] RoleDependencyGraph 无循环依赖
- [ ] RoleChainEditor 可视化完整
- [ ] 构建通过
- [ ] 部署成功
