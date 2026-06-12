import type { Recommendation } from './types'
import { preferenceEngine } from './preferenceEngine'

const RECOMMENDATION_TEMPLATES: Omit<Recommendation, 'id' | 'score' | 'createdAt' | 'dismissed'>[] = [
  {
    type: 'feature',
    title: '🎯 多Agent协作',
    description: '使用多Agent模式处理复杂任务',
    action: '/multi',
    reason: '检测到您经常处理复杂任务',
  },
  {
    type: 'feature',
    title: '📝 代码审查',
    description: '让审查Agent帮您检查代码',
    action: '/multi 帮我审查代码',
    reason: '您经常编写代码',
  },
  {
    type: 'agent',
    title: '🔍 审查Agent',
    description: '专门负责代码质量和测试',
    action: 'review',
    reason: '您关注代码质量',
  },
  {
    type: 'action',
    title: '💾 记忆功能',
    description: '开启持久化记忆，跨会话记住您的偏好',
    action: 'enable_memory',
    reason: '基于您的使用习惯推荐',
  },
]

export class RecommendationEngine {
  private recommendations: Recommendation[] = []
  private dismissedIds = new Set<string>()

  generateRecommendations(): Recommendation[] {
    const topPrefs = preferenceEngine.getTopPreferences(3)

    const matched = RECOMMENDATION_TEMPLATES.map((template, index) => {
      let score = 0.5

      for (const pref of topPrefs) {
        if (pref.key === 'task_type' && template.reason.includes('任务')) {
          score += 0.2
        }
        if (pref.key === 'language' && template.description.includes('代码')) {
          score += 0.1
        }
      }

      return {
        ...template,
        id: `rec-${index}-${Date.now()}`,
        score: Math.min(1, score),
        createdAt: Date.now(),
        dismissed: false,
      } as Recommendation
    })

    this.recommendations = matched
    return matched.filter(r => !this.dismissedIds.has(r.id))
  }

  dismissRecommendation(id: string): void {
    this.dismissedIds.add(id)
  }

  getActiveRecommendations(limit = 3): Recommendation[] {
    return this.generateRecommendations().slice(0, limit)
  }
}

export const recommendationEngine = new RecommendationEngine()
