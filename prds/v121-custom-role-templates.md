# PRD: V121 Custom Role Templates

## 1. Concept & Vision

实现用户自定义角色模板功能。用户可以创建新角色、编辑现有角色、导入/导出角色模板。参考 nanobot-design 的 skill 模板系统，让角色定义可扩展、可复用。

## 2. 功能列表

### 2.1 RoleTemplate
- 角色模板结构（name, description, capabilities, compatibleTaskTypes, icon, color）
- 模板验证（必填字段、能力格式）
- 模板版本管理

### 2.2 RoleTemplateManager
- CRUD 操作（create, read, update, delete）
- 模板导入/导出（JSON 格式）
- 预设模板库（用户提供可选择的模板）
- 模板搜索和过滤

### 2.3 CustomRoleEditor UI
- 表单编辑角色（名称、描述、能力标签）
- 能力选择器（预定义能力列表）
- 任务类型选择器
- 角色预览

### 2.4 Built-in Templates
- 提供 10+ 预设模板
- 模板分类（协作类、工具类、分析类）
- 模板评分和评论

## 3. 文件清单

```
src/services/agent/v121/
  templates/
    RoleTemplate.ts         — 模板定义
    RoleTemplateManager.ts  — 模板管理器
    BuiltInTemplates.ts    — 预设模板库
  editor/
    CustomRoleEditor.tsx   — 角色编辑器
  types.ts
  index.ts
```

## 4. 验收标准

- [ ] RoleTemplateManager 支持 CRUD
- [ ] 模板导入/导出 JSON 正常
- [ ] 预设模板库可用
- [ ] CustomRoleEditor 表单完整
- [ ] 构建通过
- [ ] 部署成功
