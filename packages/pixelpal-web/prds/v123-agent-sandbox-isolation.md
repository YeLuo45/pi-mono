# PRD: V123 Agent Sandbox Isolation

## 1. Concept & Vision

实现多 Agent 沙箱隔离执行环境。每个沙箱提供独立的资源空间（内存、文件系统、网络），Agents 在沙箱中安全执行，互不干扰。参考 thunderbolt-design 的安全隔离思想和 ChatDev 的多租户架构。

## 2. 功能列表

### 2.1 SandboxDefinition
- 沙箱配置（id, name, resources, permissions, agentIds）
- 资源限制（内存、CPU 时间、网络访问）
- 权限模型（文件系统只读/读写、无网络、有限 API）

### 2.2 SandboxManager
- 创建/销毁沙箱
- 沙箱生命周期管理
- 资源监控和配额管理
- 沙箱状态（active, paused, terminated）

### 2.3 SandboxExecutor
- 在沙箱中执行 Agent 代码
- 消息传递接口（postMessage/onMessage）
- 超时和资源限制执行
- 执行结果捕获

### 2.4 SandboxSecurity
- Capability-based 安全模型
- 资源使用审计
- 恶意行为检测
- 沙箱逃逸防护

## 3. 文件清单

```
src/services/agent/v123/
  sandbox/
    SandboxDefinition.ts  — 沙箱定义
    SandboxManager.ts     — 沙箱管理器
    SandboxExecutor.ts    — 沙箱执行器
    SandboxSecurity.ts    — 安全模型
    SandboxState.ts       — 状态快照与恢复
  types.ts
  index.ts
```

## 4. 验收标准

- [ ] SandboxManager 创建/销毁沙箱正常
- [ ] SandboxExecutor 隔离执行正常
- [ ] 资源限制生效
- [ ] 状态快照/恢复功能正常
- [ ] 构建通过
- [ ] 部署成功