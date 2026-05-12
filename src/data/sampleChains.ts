/**
 * Sample Chains — Seed data for Skill Chaining (V79)
 * These chains are loaded on first run to demonstrate the feature.
 */

import type { ChainDefinition } from '../services/skills/types';
import { getAllChains, saveChain } from '../services/chains/chainStorage';

export const sampleChains: ChainDefinition[] = [
  {
    id: 'trip-planner',
    name: '旅行规划助手',
    description: '查询天气 → 判断景点是否合适 → 生成行程安排',
    triggerKeywords: ['#trip', '#旅行', '#行程'],
    enabled: true,
    steps: [
      {
        id: 'step-1',
        skillId: 'weather-skill',
        condition: 'always',
        inputTemplate: {
          city: '{{context.city}}',
          date: '{{context.date}}',
        },
        outputKey: 'weather_result',
      },
      {
        id: 'step-2',
        skillId: 'attraction-judge',
        condition: 'if:weather_result not contains "雨天"',
        inputTemplate: {
          weather: '{{weather_result}}',
          city: '{{context.city}}',
        },
        outputKey: 'attraction_result',
      },
      {
        id: 'step-3',
        skillId: 'itinerary-generator',
        condition: 'always',
        inputTemplate: {
          city: '{{context.city}}',
          attractions: '{{attraction_result}}',
          days: '{{context.days}}',
        },
        outputKey: 'itinerary_result',
      },
    ],
  },
  {
    id: 'code-review-flow',
    name: '代码审查流',
    description: '接收代码 → 代码审查 → 生成审查报告',
    triggerKeywords: ['#review', '#codereview', '#审查'],
    enabled: true,
    steps: [
      {
        id: 'step-1',
        skillId: 'code-receiver',
        condition: 'always',
        inputTemplate: {
          code: '{{triggerMessage}}',
          language: '{{context.language}}',
        },
        outputKey: 'code_result',
      },
      {
        id: 'step-2',
        skillId: 'code-reviewer',
        condition: 'always',
        inputTemplate: {
          code: '{{code_result}}',
          focus: '{{context.focus}}',
        },
        outputKey: 'review_result',
      },
      {
        id: 'step-3',
        skillId: 'report-generator',
        condition: 'always',
        inputTemplate: {
          review: '{{review_result}}',
          format: 'markdown',
        },
        outputKey: 'final_report',
      },
    ],
  },
  {
    id: 'weekly-report-flow',
    name: '周报助手',
    description: '收集本周数据 → 总结关键进展 → 格式化输出',
    triggerKeywords: ['#weekly', '#周报', '#report'],
    enabled: true,
    steps: [
      {
        id: 'step-1',
        skillId: 'data-collector',
        condition: 'always',
        inputTemplate: {
          period: 'weekly',
          source: '{{context.source}}',
        },
        outputKey: 'data_result',
      },
      {
        id: 'step-2',
        skillId: 'summary-writer',
        condition: 'always',
        inputTemplate: {
          data: '{{data_result}}',
          style: '{{context.style}}',
        },
        outputKey: 'summary_result',
      },
      {
        id: 'step-3',
        skillId: 'report-formatter',
        condition: 'always',
        inputTemplate: {
          summary: '{{summary_result}}',
          template: '{{context.template}}',
        },
        outputKey: 'final_report',
      },
    ],
  },
];

/**
 * Seed sample chains into storage if none exist.
 */
export async function seedSampleChains(): Promise<void> {
  const existing = await getAllChains();
  if (existing.length === 0) {
    for (const chain of sampleChains) {
      await saveChain(chain);
    }
  }
}
