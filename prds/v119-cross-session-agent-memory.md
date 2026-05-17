# PRD: V119 Cross-Session Agent Collaboration Memory

## 1. Concept & Vision

实现跨会话的 Agent 协作记忆共享。不同会话之间共享 Agent 执行上下文、任务历史和知识图谱。参考 thunderbolt-design 的 offline-first 数据同步思想，让 Agent 在新会话中能够继承历史上下文，避免重复劳动。

## 2. 功能列表

### 2.1 SharedMemoryStore
- SQLite 表存储跨会话共享数据
- Session 维度隔离 + Agent 维度聚合
- 知识图谱存储（实体-关系-实体）

### 2.2 ContextInheritance
- 新会话自动继承相关历史上下文
- 基于任务类型召回相关历史
- 增量更新而非全量覆盖

### 2.3 KnowledgeGraph
- 实体节点（User, Task, Topic, Concept）
- 关系边（created_by, related_to, depends_on, part_of）
- 查询接口：按实体类型、关系类型、时间范围

### 2.4 SyncManager
- 多会话数据同步管理
- 冲突解决策略（Last-Write-Wins + 人工确认）
- 离线队列 + 在线同步

## 3. 文件清单

```
src/services/agent/v119/
  shared-memory/
    SharedMemoryStore.ts    — 跨会话存储
    ContextInheritance.ts   — 上下文继承
    KnowledgeGraph.ts       — 知识图谱
  sync/
    SyncManager.ts          — 同步管理
    ConflictResolver.ts     — 冲突解决
  types.ts
  index.ts
```

## 4. 验收标准

- [ ] SharedMemoryStore 存储跨会话数据
- [ ] ContextInheritance 实现会话继承
- [ ] KnowledgeGraph 查询正常工作
- [ ] 构建通过
- [ ] 部署成功
