# PRD: V118 Agent Introspection & Learning

## 1. Concept & Vision

为 Agent 系统增加自省与学习能力。记录任务执行模式、分析成功率、动态优化任务分解策略。参考 nanobot-design 的 skill 系统，让 Agent 能够从历史执行中学习并自我改进。

## 2. 功能列表

### 2.1 ExecutionRecorder
- 记录每次任务执行的完整轨迹（输入、输出、耗时、成功率）
- 存储到 SQLite（V113 wa-sqlite）
- 支持批量查询和聚合分析

### 2.2 PatternAnalyzer
- 分析任务类型与最优 Agent 组合的映射
- 计算平均执行时间、成功率、并行效率
- 识别慢任务和失败模式

### 2.3 StrategyOptimizer
- 基于历史数据动态调整任务分解策略
- 选择最优的 Agent 组合顺序
- 自动优化并行组大小

### 2.4 AgentMetricsDashboard
- 每个 Agent 的 KPI：成功率、平均响应时间、负载峰值
- 可视化统计图表

## 3. 文件清单

```
src/services/agent/v118/
  introspection/
    ExecutionRecorder.ts  — 执行轨迹记录
    PatternAnalyzer.ts    — 模式分析
    StrategyOptimizer.ts  — 策略优化
    types.ts
  metrics/
    AgentMetrics.ts       — Agent 指标计算
  index.ts
```

## 4. 验收标准

- [ ] ExecutionRecorder 记录任务执行
- [ ] PatternAnalyzer 分析任务-Agent 映射
- [ ] StrategyOptimizer 优化分解策略
- [ ] 构建通过
- [ ] 部署成功
