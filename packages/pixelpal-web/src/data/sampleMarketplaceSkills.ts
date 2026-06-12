/**
 * V78: Sample Marketplace Skills - Seed Data
 * Pre-populated sample skills for the Skill Marketplace.
 */

import type { SkillDefinition, SkillCategory } from '../services/skills/types';

// Marketplace skill extends SkillDefinition with additional metadata
export interface MarketplaceSkill extends SkillDefinition {
  installCount: number;
  avgRating: number;
  uploadedAt: string;
  updatedAt: string;
}

export interface SkillRating {
  userId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  review?: string;
  createdAt: string;
}

export const sampleMarketplaceSkills: MarketplaceSkill[] = [
  {
    id: 'markettplace-egg-timer',
    name: '煎蛋计时器',
    description: '完美溏心蛋指南 - 智能计时器，精准控制蛋黄熟度，做出完美溏心蛋。支持多种熟度选择：3分钟溏心、6分钟半熟、10分钟全熟。',
    icon: '🍳',
    version: '1.0.0',
    author: '@chefs_community',
    category: 'productivity',
    tags: ['timer', 'cooking', 'eggs', 'breakfast', '生活技巧'],
    chatTriggerable: true,
    chatKeywords: ['煎蛋', '煮蛋', '溏心蛋', 'egg timer', '煮鸡蛋'],
    order: 1,
    enabled: false,
    systemPrompt: '你是一个专业的烹饪助手，专注于鸡蛋料理。当用户询问煎蛋或煮蛋时，提供精准的时间和步骤指导。',
    examplePrompts: [
      '教我做一个溏心蛋',
      '煮6分钟鸡蛋会是什么熟度？',
      '如何判断蛋黄的熟度？',
    ],
    requiredContext: [],
    optionalContext: [],
    maxSteps: 5,
    showSteps: false,
    installCount: 1284,
    avgRating: 4.7,
    uploadedAt: '2025-03-15T08:00:00Z',
    updatedAt: '2025-04-20T10:30:00Z',
  },
  {
    id: 'marketplace-code-reviewer',
    name: '代码审查助手',
    description: 'AI辅助代码审查 - 自动分析代码质量，发现潜在bug，优化建议，提升代码可读性和性能。支持多种编程语言。',
    icon: '🔍',
    version: '1.2.0',
    author: '@dev_team',
    category: 'developer',
    tags: ['code review', 'programming', 'quality', 'debug', '开发者工具'],
    chatTriggerable: true,
    chatKeywords: ['review', 'code review', '审查代码', '检查代码', 'bug'],
    order: 2,
    enabled: false,
    systemPrompt: '你是一个资深的代码审查专家，负责分析代码质量、发现潜在问题并提供优化建议。',
    examplePrompts: [
      '帮我审查这段代码',
      '这段代码有什么问题吗？',
      '如何优化这段Python代码？',
    ],
    requiredContext: [],
    optionalContext: [],
    maxSteps: 8,
    showSteps: true,
    installCount: 2156,
    avgRating: 4.9,
    uploadedAt: '2025-02-10T14:00:00Z',
    updatedAt: '2025-05-01T09:15:00Z',
  },
  {
    id: 'marketplace-weekly-report',
    name: '周报生成器',
    description: '自动生成周报摘要 - 输入本周工作内容，AI自动整理成结构清晰的周报，包含工作总结、下周计划和心得体会。',
    icon: '📊',
    version: '1.1.0',
    author: '@productivity_guru',
    category: 'productivity',
    tags: ['report', 'weekly', 'summary', 'work', '效率工具'],
    chatTriggerable: true,
    chatKeywords: ['周报', '周总结', 'weekly report', '工作报告', '总结'],
    order: 3,
    enabled: false,
    systemPrompt: '你是一个专业的周报生成助手，帮助用户整理一周的工作内容，生成结构化的周报文档。',
    examplePrompts: [
      '帮我写本周周报',
      '整理一下这周的工作内容',
      '生成周报摘要',
    ],
    requiredContext: [],
    optionalContext: [],
    maxSteps: 3,
    showSteps: false,
    installCount: 3421,
    avgRating: 4.5,
    uploadedAt: '2025-01-20T11:00:00Z',
    updatedAt: '2025-04-28T16:45:00Z',
  },
  {
    id: 'marketplace-fitness-plan',
    name: '健身计划',
    description: '个性化健身方案 - 根据您的身体状况、健身目标和可用时间，生成专属的健身计划。支持增肌、减脂、塑形等多种目标。',
    icon: '💪',
    version: '1.3.0',
    author: '@fit_life',
    category: 'lifestyle',
    tags: ['fitness', 'workout', 'gym', 'health', '健身', '运动'],
    chatTriggerable: true,
    chatKeywords: ['健身', '锻炼', '运动计划', 'workout', 'fitness plan', '增肌', '减脂'],
    order: 4,
    enabled: false,
    systemPrompt: '你是一个专业的健身教练，根据用户的具体情况和目标，制定个性化的健身计划。',
    examplePrompts: [
      '给我一个健身计划',
      '我想增肌怎么练？',
      '上班族如何在家健身？',
    ],
    requiredContext: [],
    optionalContext: [],
    maxSteps: 6,
    showSteps: false,
    installCount: 1876,
    avgRating: 4.6,
    uploadedAt: '2025-02-28T09:30:00Z',
    updatedAt: '2025-05-05T11:20:00Z',
  },
  {
    id: 'marketplace-translator',
    name: '翻译助手',
    description: '多语言实时翻译 - 支持中英日韩等20+语言的即时翻译，提供准确的语境理解和文化背景注释，让沟通无障碍。',
    icon: '🌐',
    version: '2.0.0',
    author: '@global_connect',
    category: 'productivity',
    tags: ['translation', 'language', 'multilingual', '翻译', '语言'],
    chatTriggerable: true,
    chatKeywords: ['翻译', 'translate', 'translator', '英文翻译', '日文翻译'],
    order: 5,
    enabled: false,
    systemPrompt: '你是一个多语言翻译专家，提供准确、地道的翻译服务，并解释文化背景和用法差异。',
    examplePrompts: [
      '帮我翻译这段话成英文',
      '这句话用日语怎么说？',
      '这句中文俗语怎么用英文表达？',
    ],
    requiredContext: [],
    optionalContext: [],
    maxSteps: 2,
    showSteps: false,
    installCount: 4532,
    avgRating: 4.8,
    uploadedAt: '2025-01-05T07:00:00Z',
    updatedAt: '2025-05-08T14:00:00Z',
  },
  {
    id: 'marketplace-sql-generator',
    name: 'SQL查询生成器',
    description: '自然语言转SQL - 将您的日常语言描述转换为精准的SQL查询语句，无需编写代码即可完成数据库查询，支持复杂的多表关联。',
    icon: '🗃️',
    version: '1.4.0',
    author: '@data_ninja',
    category: 'developer',
    tags: ['sql', 'database', 'query', 'data', '开发者工具', '数据库'],
    chatTriggerable: true,
    chatKeywords: ['sql', '查询', 'database', '数据库', 'query builder'],
    order: 6,
    enabled: false,
    systemPrompt: '你是一个SQL专家，将用户的自然语言描述转换为准确的SQL查询语句。',
    examplePrompts: [
      '帮我写一个SQL查询',
      '查询所有订单金额大于1000的用户',
      '如何统计每日的销售额？',
    ],
    requiredContext: [],
    optionalContext: [],
    maxSteps: 4,
    showSteps: true,
    installCount: 2987,
    avgRating: 4.7,
    uploadedAt: '2025-03-01T10:00:00Z',
    updatedAt: '2025-05-03T08:30:00Z',
  },
];

// Pre-populated ratings for demo purposes
export const sampleRatings: Record<string, SkillRating[]> = {
  'markettplace-egg-timer': [
    { userId: 'user_001', rating: 5, review: '超级好用！终于能做出完美溏心蛋了！', createdAt: '2025-03-20T10:00:00Z' },
    { userId: 'user_002', rating: 4, review: '计时功能很准，就是建议可以再多一些食谱', createdAt: '2025-03-25T14:30:00Z' },
    { userId: 'user_003', rating: 5, review: '简单实用，早餐好帮手', createdAt: '2025-04-01T08:15:00Z' },
  ],
  'marketplace-code-reviewer': [
    { userId: 'user_010', rating: 5, review: '发现了我没注意到的性能问题！', createdAt: '2025-02-15T16:00:00Z' },
    { userId: 'user_011', rating: 5, review: '代码质量提升利器，团队必备', createdAt: '2025-02-20T11:30:00Z' },
    { userId: 'user_012', rating: 4, review: '建议支持更多语言', createdAt: '2025-03-05T09:45:00Z' },
  ],
  'marketplace-weekly-report': [
    { userId: 'user_020', rating: 5, review: '周报不再痛苦，节省大量时间', createdAt: '2025-01-25T17:00:00Z' },
    { userId: 'user_021', rating: 4, review: '格式很漂亮，但希望能自定义模板', createdAt: '2025-02-10T10:20:00Z' },
    { userId: 'user_022', rating: 5, review: '老板说我的周报越来越专业了 😎', createdAt: '2025-03-15T14:00:00Z' },
  ],
  'marketplace-fitness-plan': [
    { userId: 'user_030', rating: 5, review: '计划很科学，坚持一个月效果明显', createdAt: '2025-03-10T07:30:00Z' },
    { userId: 'user_031', rating: 4, review: '适合新手入门，但进阶内容偏少', createdAt: '2025-03-20T19:00:00Z' },
  ],
  'marketplace-translator': [
    { userId: 'user_040', rating: 5, review: '翻译地道，比谷歌翻译好很多', createdAt: '2025-01-15T12:00:00Z' },
    { userId: 'user_041', rating: 5, review: '支持语言很多，出国旅行必备', createdAt: '2025-02-01T09:00:00Z' },
    { userId: 'user_042', rating: 4, review: '速度很快，个别翻译可以更口语化', createdAt: '2025-02-15T15:30:00Z' },
    { userId: 'user_043', rating: 5, review: '日剧生肉翻译超方便！', createdAt: '2025-03-01T20:00:00Z' },
  ],
  'marketplace-sql-generator': [
    { userId: 'user_050', rating: 5, review: '不会SQL也能查数据库了，太方便了', createdAt: '2025-03-05T11:00:00Z' },
    { userId: 'user_051', rating: 5, review: '生成的SQL很规范，还带注释', createdAt: '2025-03-12T14:30:00Z' },
    { userId: 'user_052', rating: 4, review: '多表查询偶尔需要调整，但已经很好了', createdAt: '2025-04-01T10:00:00Z' },
  ],
};

// Categories for the marketplace
export const MARKETPLACE_CATEGORIES: { id: SkillCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: '全部', icon: '🏪' },
  { id: 'productivity', label: '效率工具', icon: '⚡' },
  { id: 'developer', label: '开发者', icon: '💻' },
  { id: 'lifestyle', label: '生活', icon: '🌿' },
  { id: 'creative', label: '创意', icon: '🎨' },
  { id: 'analysis', label: '分析', icon: '📈' },
  { id: 'entertainment', label: '娱乐', icon: '🎮' },
];
