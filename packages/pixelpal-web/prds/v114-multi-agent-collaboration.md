# PRD: V114 Multi-Agent Collaboration System

## 1. Concept & Vision

为 pixel-pal-web 引入多 Agent 协作能力，参考 ChatDev 2.0 的多 Agent 编排思想。主 Agent 作为协调者，专用 Agent（记忆、搜索、工具）作为执行者，通过 EventBus 通信实现复杂任务分解与协同。用户提供自然语言指令，Agent 团队自动分工完成。

## 2. Core Architecture

### 2.1 Agent 系统

```
User Input
    ↓
┌─────────────────┐
│   Main Agent    │ ← 协调者：理解意图、分解任务、聚合结果
└────────┬────────┘
         │ EventBus (agent:*)
    ┌────┼────┬────────────┐
    ↓    ↓    ↓            ↓
┌───────┐ ┌───────┐ ┌───────────┐ ┌──────────┐
│Memory │ │Search │ │  Tool     │ │ Persona  │
│Agent  │ │Agent  │ │  Agent    │ │ Agent    │
└───────┘ └───────┘ └───────────┘ └──────────┘
```

### 2.2 EventBus 消息协议

```
agent:dispatch      — Main → Sub: 分派任务
agent:result       — Sub → Main: 返回结果
agent:error        — Sub → Main: 错误报告
agent:status       — Sub → Main: 状态更新
agent:delegate     — Main → Main: 自我委托（递归分解）
```

### 2.3 核心接口

```typescript
interface Agent {
  id: string;
  name: string;
  capabilities: string[];
  handle(message: AgentMessage): Promise<AgentResponse>;
}

interface AgentMessage {
  type: 'agent:dispatch';
  taskId: string;
  payload: any;
  deadline?: number;
}

interface AgentResponse {
  taskId: string;
  status: 'success' | 'error' | 'partial';
  result?: any;
  error?: string;
}
```

## 3. 功能列表

### 3.1 Main Agent（协调者）
- 意图识别：解析用户指令，识别任务类型
- 任务分解：将复杂任务拆分为子任务
- 结果聚合：将多个 Agent 结果整合为统一回复
- 状态同步：跟踪所有 Sub Agent 进度

### 3.2 Memory Agent
- 长期记忆检索（向量相似度搜索）
- 记忆优先级排序
- 记忆压缩与摘要

### 3.3 Search Agent
- 聚合多源搜索（Web/API/RSS）
- 去重与排序
- 结果缓存

### 3.4 Tool Agent
- 工具调用编排
- 工具链组合
- 错误重试与降级

### 3.5 协作 UI
- Agent 状态面板（显示各 Agent 活跃状态）
- 任务分解可视化
- 协作日志展开/折叠

## 4. 技术约束

- EventBus 复用现有实现（src/services/bus/）
- 保持 API 接口不变，向后兼容
- SQLite 存储（V113 成果）用于 Agent 记忆持久化
- 离线优先，Agent 协作支持离线降级
- 不引入新的外部依赖

## 5. 验收标准

- [ ] Main Agent 能接收并解析用户指令
- [ ] 任务能自动分解给 Sub Agent
- [ ] Sub Agent 结果能聚合回传给用户
- [ ] Agent 状态面板显示活跃状态
- [ ] 单元测试覆盖 Agent 核心逻辑
- [ ] 构建通过（npx vite build）
- [ ] 部署成功

## 6. 文件清单

```
src/
  agents/
    index.ts              — Agent 注册表
    base.ts                — BaseAgent 抽象类
    main.ts                — MainAgent 实现
    memory.ts              — MemoryAgent 实现
    search.ts              — SearchAgent 实现
    tool.ts                — ToolAgent 实现
    types.ts               — Agent 类型定义
  components/
    AgentPanel.tsx         — Agent 状态面板
    AgentLog.tsx           — 协作日志组件
```

## 7. 里程碑

- **V114a**: Agent 类型系统 + BaseAgent + EventBus 集成
- **V114b**: MainAgent 任务分解 + MemoryAgent
- **V114c**: SearchAgent + ToolAgent
- **V114d**: AgentPanel UI + 协作可视化
