export interface UserPreference {
  key: string
  value: string
  count: number
  lastUpdated: number
  confidence: number
}

export interface InteractionRecord {
  id: string
  type: 'task' | 'query' | 'command' | 'feedback'
  content: string
  timestamp: number
  rating?: number
  tags?: string[]
}

export interface Recommendation {
  id: string
  type: 'feature' | 'action' | 'content' | 'agent'
  title: string
  description: string
  action: string
  score: number
  reason: string
  createdAt: number
  dismissed: boolean
}
