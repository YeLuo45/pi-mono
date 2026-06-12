import type { Task } from './types'

const STORAGE_KEY = 'multiAgentTasks'

interface StoreData {
  traceId: string | null
  tasks: Task[]
  lastUpdated: number
}

class MultiAgentStore {
  save(data: { traceId: string; tasks: Task[] }): void {
    const storeData: StoreData = {
      traceId: data.traceId,
      tasks: data.tasks,
      lastUpdated: Date.now(),
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(storeData))
    } catch (e) {
      console.warn('[MultiAgentStore] save failed:', e)
    }
  }

  load(): StoreData | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as StoreData
    } catch (e) {
      console.warn('[MultiAgentStore] load failed:', e)
      return null
    }
  }

  clear(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.warn('[MultiAgentStore] clear failed:', e)
    }
  }

  getTasks(): Task[] {
    const data = this.load()
    return data?.tasks || []
  }

  getTraceId(): string | null {
    const data = this.load()
    return data?.traceId || null
  }
}

export const multiAgentStore = new MultiAgentStore()
