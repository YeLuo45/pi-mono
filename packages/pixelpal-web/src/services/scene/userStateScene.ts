export type UserState = 'active' | 'idle' | 'returning' | 'struggling' | 'deep_focus'

export interface UserStateSignal {
  state: UserState
  timestamp: number
  context: {
    lastAction?: string
    errorCount?: number
    focusTarget?: string
    idleDuration?: number
  }
}
