# PRD: V116 Agent Communication Protocol Enhancement

## 1. Concept & Vision

完善 V114/V115 的 Agent 间通信协议，建立规范化的消息流、超时重试机制、消息持久化和 Dead Letter Queue 处理。参考 nanobot-design 的 Channel Adapter 模式和 thunderbolt-design 的异步消息架构，实现可靠的多 Agent 通信。

## 2. Core Architecture

### 2.1 Message Protocol

```typescript
// 规范化消息格式
interface AgentProtocolMessage {
  id: string;              // 全局唯一 ID (uuid)
  type: AgentMessageType;  // dispatch | result | error | status | heartbeat | ack
  from: AgentId;
  to: AgentId | 'broadcast';
  taskId: string;
  payload: unknown;
  timestamp: number;
  deadline?: number;       // 超时截止时间
  retryCount: number;
  correlationId?: string;  // 用于请求/响应关联
  headers?: Record<string, string>;
}

type AgentMessageType = 
  | 'dispatch'      // 分发任务
  | 'result'        // 返回结果
  | 'error'         // 错误报告
  | 'status'        // 状态更新
  | 'heartbeat'     // 心跳检测
  | 'ack'           // 确认收到
  | 'retry'         // 请求重试
  | 'timeout'       // 超时通知
  | 'cancel';       // 取消任务
```

### 2.2 Message Queue (SQLite-backed)

- 持久化消息到 SQLite（V113 的 wa-sqlite）
- 消息状态：pending | processing | completed | failed | dead_letter
- 批量处理优化

### 2.3 Timeout & Retry

```typescript
interface RetryConfig {
  maxRetries: number;      // 默认 3
  baseDelay: number;         // 初始延迟 ms，默认 1000
  maxDelay: number;          // 最大延迟 ms，默认 30000
  backoffMultiplier: number; // 退避倍数，默认 2
}

// 超时策略：
// - dispatch 消息 deadline 内未收到 ack → 重试
// - dispatch 消息 deadline 内未收到 result → 超时错误
// - 心跳超时 → Agent 标记为 unreachable
```

### 2.4 Dead Letter Queue

- 重试次数耗尽的消息进入 DLQ
- DLQ UI 面板：查看、重新入队、丢弃

## 3. 文件清单

```
src/services/agent/v116/
  protocol/
    types.ts          — 协议类型定义
    MessageQueue.ts   — SQLite 消息队列
    RetryHandler.ts   — 重试处理器
    DLQProcessor.ts   — 死信队列处理
  events/
    AgentProtocolEvents.ts  — 协议事件定义
  index.ts
```

## 4. 验收标准

- [ ] 消息格式规范化
- [ ] SQLite 消息持久化
- [ ] 超时自动重试
- [ ] DLQ 处理
- [ ] 构建通过
- [ ] 部署成功
