import type { UserPreference, InteractionRecord } from './types'

const PREFERENCE_KEYWORDS: Record<string, string[]> = {
  language: ['中文', 'English', '代码', 'code', 'python', 'javascript', 'typescript'],
  domain: ['金融', '电商', '教育', '游戏', '医疗', 'finance', 'ecommerce', 'education', 'gaming'],
  task_type: ['写代码', 'debug', 'review', '分析', 'analyze', '生成', 'generate'],
  tone: ['简洁', '详细', 'formal', 'casual', '专业', '友好'],
}

export class PreferenceEngine {
  private preferences = new Map<string, UserPreference>()

  extractFromInteraction(record: InteractionRecord): void {
    const content = record.content.toLowerCase()

    this.updatePreference('language', this.detectLanguage(content), record.timestamp)

    for (const [key, keywords] of Object.entries(PREFERENCE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (content.includes(keyword.toLowerCase())) {
          this.updatePreference(key, keyword, record.timestamp)
        }
      }
    }
  }

  private updatePreference(key: string, value: string, timestamp: number): void {
    const existing = this.preferences.get(key)

    if (existing && existing.value === value) {
      existing.count++
      existing.lastUpdated = timestamp
      existing.confidence = Math.min(1, existing.count / 10)
    } else {
      this.preferences.set(key, {
        key,
        value,
        count: 1,
        lastUpdated: timestamp,
        confidence: 0.1,
      })
    }
  }

  private detectLanguage(content: string): string {
    const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length
    return chineseChars > content.length * 0.3 ? '中文' : 'English'
  }

  getPreference(key: string): UserPreference | undefined {
    return this.preferences.get(key)
  }

  getAllPreferences(): UserPreference[] {
    return Array.from(this.preferences.values())
  }

  getTopPreferences(limit = 5): UserPreference[] {
    return this.getAllPreferences()
      .filter(p => p.confidence > 0.2)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit)
  }

  clearPreferences(): void {
    this.preferences.clear()
  }
}

export const preferenceEngine = new PreferenceEngine()
