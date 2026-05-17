# PRD: V115 Task Decomposition Engine Enhancement

## 1. Concept & Vision

为 V114 的 MainAgent 引入 LLM 驱动的任务分解能力。基于用户目标自动拆解为 DAG 任务图，支持并行执行优化、依赖分析和动态重规划。用户输入复杂任务（如"帮我规划一次旅行并整理成文档"），Agent 自动拆解为子任务树，识别并行机会，最大化执行效率。

## 2. Core Architecture

### 2.1 TaskDecomposer

```typescript
class TaskDecomposer {
  decompose(goal: string, context: AgentContext): Promise<TaskGraph>;
  refine(graph: TaskGraph, feedback: string): Promise<TaskGraph>;
}

interface TaskGraph {
  nodes: TaskNode[];
  edges: DependencyEdge[];
  parallelGroups: string[][]; // 可并行的任务组
  estimatedDuration: number;
}

interface TaskNode {
  id: string;
  description: string;
  agentType: AgentType;
  subtasks: TaskStep[];
  parallelizable: boolean;
  dependsOn: string[];
}
```

### 2.2 Dependency Analyzer

- 分析子任务间的数据依赖和顺序依赖
- 识别可以并行执行的任务组
- 计算关键路径（Critical Path）
- 检测循环依赖

### 2.3 Parallel Executor

```typescript
class ParallelExecutor {
  executeGroup(tasks: Task[], context: AgentContext): Promise<TaskResult[]>;
  executeDAG(graph: TaskGraph): Promise<TaskResult>;
}
```

## 3. 功能列表

### 3.1 LLM Task Decomposition
- 调用 LLM 将用户目标拆解为结构化子任务
- 子任务带描述、agent 类型、预期工具
- 识别任务间的输入输出依赖

### 3.2 Dependency Graph Builder
- 构建 DAG（有向无环图）
- 识别并行任务组
- 关键路径分析
- 循环依赖检测与警告

### 3.3 Dynamic Replanning
- 子任务失败时自动重规划
- 基于执行反馈调整任务图
- 跳过不可行的分支

### 3.4 Progress Visualization
- 任务树 UI 实时更新
- 并行执行动画
- 关键路径高亮

## 4. 技术约束

- 复用 V114 的 AgentRegistry 和 EventBus
- 复用 V113 的 SQLite 存储（任务状态持久化）
- 不引入新依赖
- 离线优先

## 5. 验收标准

- [ ] LLM 能将复杂目标拆解为 3-7 个子任务
- [ ] 依赖图正确识别并行组
- [ ] 并行执行时结果正确聚合
- [ ] 任务树 UI 显示实时进度
- [ ] 构建通过
- [ ] 部署成功

## 6. 文件清单

```
src/services/agent/v115/
  TaskDecomposer.ts      — LLM 驱动任务分解
  DependencyGraph.ts      — DAG 构建与分析
  ParallelExecutor.ts    — 并行执行引擎
  Replanner.ts           — 动态重规划
src/components/Agent/
  TaskTreeViz.tsx        — 任务树可视化组件
```
