# PRD: V125 Cross-Agent Knowledge Graph Visualization

## 1. Concept & Vision

为多 Agent 系统提供跨 Agent 知识图谱可视化。展示 Agents 之间共享的知识实体、关系和依赖。参考 thunderbolt-design 的知识聚合和 nanobot-design 的 skill 知识管理。

## 2. 功能列表

### 2.1 KnowledgeGraphViz
- 实体节点（Agent、Task、Concept）可视化
- 关系边（knows, depends_on, produces, requires）渲染
- 力导向布局
- 缩放、平移、筛选

### 2.2 SharedKnowledgeStore
- 跨 Agent 共享知识存储
- 实体 CRUD 操作
- 关系管理
- 知识版本控制

### 2.3 KnowledgePanel
- 知识详情侧边栏
- 实体编辑
- 关系编辑
- 知识来源追踪

### 2.4 ConflictDetection
- 知识冲突检测
- 冲突解决 UI
- 版本历史

## 3. 验收标准

- [ ] 知识图谱渲染正常
- [ ] 节点交互正常
- [ ] 知识存储正常
- [ ] 构建通过
- [ ] 部署成功