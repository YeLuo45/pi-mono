/**
 * Persona Role Registry - V33 Multi-Agent Collaboration System
 * 
 * Manages persona roles and their configurations for the collaboration system.
 * Each role has specific capabilities, system prompts, and execution parameters.
 */

import type { PersonaRole, PersonaRoleConfig, PersonaContribution } from './types';

// ============================================================================
// Role Prompt Templates
// ============================================================================

export const ROLE_PROMPTS: Record<PersonaRole, PersonaRoleConfig> = {
  MemoryExpert: {
    role: 'MemoryExpert',
    capabilities: [
      '按时间范围检索记忆',
      '实体关系推理',
      '记忆质量评分',
      '上下文检索',
      '记忆重要性排序',
    ],
    systemPrompt: `你是记忆专家，负责从用户的记忆库中检索相关信息。

你擅长：
- 按时间范围检索记忆（最近一天、一周、一月等）
- 实体关系推理（找出相关人物、地点、事件）
- 记忆质量评分（重要性、相关性、可靠性）
- 上下文检索（根据情境找到相关记忆）

你只能访问记忆服务，不能生成新记忆。

当被问到记忆相关问题时，你应该：
1. 先分析用户的查询意图
2. 确定时间范围和关键实体
3. 检索相关记忆
4. 按重要性排序返回结果`,
    maxConcurrentTasks: 2,
    temperature: 0.7,
  },

  EmotionAnalyst: {
    role: 'EmotionAnalyst',
    capabilities: [
      '情绪曲线解读',
      '情绪触发因素识别',
      '情绪模式发现',
      '情绪预测',
      '情感趋势分析',
    ],
    systemPrompt: `你是情感分析师，负责分析用户的情绪数据。

你擅长：
- 情绪曲线解读（分析情绪随时间的变化）
- 情绪触发因素识别（找出导致情绪变化的原因）
- 情绪模式发现（识别周期性或习惯性情绪模式）
- 情绪预测（基于历史数据预测未来情绪）
- 情感趋势分析（整体情绪走向判断）

你只能分析已有数据，不能创造情绪。

当被要求分析情绪时，你应该：
1. 收集时间范围内的情绪数据
2. 识别情绪峰值和低谷
3. 分析触发因素
4. 发现情绪模式
5. 生成分析报告`,
    maxConcurrentTasks: 2,
    temperature: 0.6,
  },

  Advisor: {
    role: 'Advisor',
    capabilities: [
      '共情沟通',
      '实用建议生成',
      '行动规划',
      '多角度综合分析',
      '优先级排序',
    ],
    systemPrompt: `你是人生导师，负责基于分析结果给出实用建议。

你擅长：
- 共情沟通（理解用户感受，给予情感支持）
- 实用建议生成（具体、可执行的建议）
- 行动规划（将建议分解为具体步骤）
- 多角度综合分析（考虑多个专家的意见）
- 优先级排序（帮助用户决定先做什么）

你会综合其他专家的意见给出最终建议。

当被要求给出建议时，你应该：
1. 理解用户的核心需求
2. 综合分析各专家的意见
3. 生成具体、可执行的建议
4. 考虑用户的实际情况和限制
5. 提供优先级排序
6. 语言要亲切自然，像朋友间的对话`,
    maxConcurrentTasks: 1,
    temperature: 0.8,
  },

  Researcher: {
    role: 'Researcher',
    capabilities: [
      '信息搜集',
      '事实核查',
      '多源验证',
      '摘要生成',
      '趋势分析',
    ],
    systemPrompt: `你是研究员，负责从各种来源搜集和验证信息。

你擅长：
- 信息搜集（从多个来源获取相关信息）
- 事实核查（验证信息的准确性）
- 多源验证（交叉验证多个来源）
- 摘要生成（将长文本压缩为关键点）
- 趋势分析（分析信息的变化趋势）

当被要求进行研究时，你应该：
1. 明确研究目标
2. 搜集多种来源的信息
3. 验证信息的可靠性
4. 生成结构化的研究报告
5. 标注信息来源和置信度`,
    maxConcurrentTasks: 3,
    temperature: 0.5,
  },

  Coder: {
    role: 'Coder',
    capabilities: [
      '代码编写',
      '代码审查',
      '问题诊断',
      '代码优化',
      '技术文档撰写',
    ],
    systemPrompt: `你是程序员，负责编写和调试代码。

你擅长：
- 代码编写（根据需求编写功能性代码）
- 代码审查（检查代码质量和潜在问题）
- 问题诊断（定位和解决 bug）
- 代码优化（提升性能和可维护性）
- 技术文档撰写（编写清晰的技术文档）

当被要求编写代码时，你应该：
1. 理解需求和约束条件
2. 设计合适的解决方案
3. 编写清晰、可维护的代码
4. 添加必要的注释
5. 提供使用示例`,
    maxConcurrentTasks: 2,
    temperature: 0.4,
  },
};

// ============================================================================
// Persona Role Registry Implementation
// ============================================================================

/**
 * Registry for managing persona role configurations
 */
export class PersonaRoleRegistry {
  private roles: Map<PersonaRole, PersonaRoleConfig>;
  private personaIdMap: Map<string, PersonaRole>;

  constructor() {
    this.roles = new Map();
    this.personaIdMap = new Map();
    
    // Initialize with default role prompts
    this.initializeDefaults();
  }

  /**
   * Initialize with default role configurations
   */
  private initializeDefaults(): void {
    for (const [role, config] of Object.entries(ROLE_PROMPTS)) {
      this.roles.set(role as PersonaRole, config as PersonaRoleConfig);
    }
  }

  /**
   * Get role configuration by role type
   */
  getRole(role: PersonaRole): PersonaRoleConfig | undefined {
    return this.roles.get(role);
  }

  /**
   * Get all registered roles
   */
  getAllRoles(): PersonaRoleConfig[] {
    return Array.from(this.roles.values());
  }

  /**
   * Get role by persona ID
   */
  getRoleByPersonaId(personaId: string): PersonaRole | undefined {
    return this.personaIdMap.get(personaId);
  }

  /**
   * Register a custom role configuration
   */
  registerRole(config: PersonaRoleConfig): void {
    this.roles.set(config.role, config);
  }

  /**
   * Register a persona ID to role mapping
   */
  registerPersona(personaId: string, role: PersonaRole): void {
    this.personaIdMap.set(personaId, role);
  }

  /**
   * Unregister a role
   */
  unregisterRole(role: PersonaRole): boolean {
    return this.roles.delete(role);
  }

  /**
   * Check if a role is registered
   */
  hasRole(role: PersonaRole): boolean {
    return this.roles.has(role);
  }

  /**
   * Get the system prompt for a role
   */
  getSystemPrompt(role: PersonaRole): string | undefined {
    return this.roles.get(role)?.systemPrompt;
  }

  /**
   * Get capabilities for a role
   */
  getCapabilities(role: PersonaRole): string[] {
    return this.roles.get(role)?.capabilities ?? [];
  }

  /**
   * Get max concurrent tasks for a role
   */
  getMaxConcurrentTasks(role: PersonaRole): number {
    return this.roles.get(role)?.maxConcurrentTasks ?? 1;
  }

  /**
   * Create a contribution from a persona
   */
  createContribution(
    personaId: string,
    role: PersonaRole,
    perspective: string,
    keyPoints: string[],
    emotion: string = 'neutral',
    confidence: number = 0.8
  ): PersonaContribution {
    return {
      personaId,
      role,
      perspective,
      keyPoints,
      emotion,
      confidence,
    };
  }

  /**
   * Get default roles for a task type
   */
  getRolesForTaskType(taskType: string): PersonaRole[] {
    const mapping: Record<string, PersonaRole[]> = {
      memory_retrieval: ['MemoryExpert'],
      emotion_analysis: ['EmotionAnalyst'],
      advice_generation: ['Advisor'],
      web_search: ['Researcher'],
      code_execution: ['Coder'],
    };
    
    return mapping[taskType] ?? ['MemoryExpert'];
  }

  /**
   * Validate role configuration
   */
  validateConfig(config: PersonaRoleConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.role) {
      errors.push('Role must be specified');
    }
    
    if (!config.systemPrompt || config.systemPrompt.length < 10) {
      errors.push('System prompt must be at least 10 characters');
    }
    
    if (!config.capabilities || config.capabilities.length === 0) {
      errors.push('At least one capability must be defined');
    }
    
    if (config.maxConcurrentTasks < 1) {
      errors.push('maxConcurrentTasks must be at least 1');
    }
    
    return { valid: errors.length === 0, errors };
  }
}

// ============================================================================
// Global Registry Instance
// ============================================================================

let globalRegistry: PersonaRoleRegistry | null = null;

export function getRoleRegistry(): PersonaRoleRegistry {
  if (!globalRegistry) {
    globalRegistry = new PersonaRoleRegistry();
  }
  return globalRegistry;
}

export function resetRoleRegistry(): void {
  globalRegistry = null;
}

// ============================================================================
// Role Helper Functions
// ============================================================================

/**
 * Get all available roles
 */
export function getAvailableRoles(): PersonaRole[] {
  return ['MemoryExpert', 'EmotionAnalyst', 'Advisor', 'Researcher', 'Coder'];
}

/**
 * Check if a role is valid
 */
export function isValidRole(role: string): role is PersonaRole {
  return getAvailableRoles().includes(role as PersonaRole);
}

/**
 * Get role display name (localized)
 */
export function getRoleDisplayName(role: PersonaRole): string {
  const names: Record<PersonaRole, string> = {
    MemoryExpert: '记忆专家',
    EmotionAnalyst: '情感分析师',
    Advisor: '建议顾问',
    Researcher: '研究员',
    Coder: '程序员',
  };
  return names[role] ?? role;
}

/**
 * Get role emoji icon
 */
export function getRoleEmoji(role: PersonaRole): string {
  const emojis: Record<PersonaRole, string> = {
    MemoryExpert: '🧠',
    EmotionAnalyst: '📊',
    Advisor: '💡',
    Researcher: '🔍',
    Coder: '💻',
  };
  return emojis[role] ?? '👤';
}
