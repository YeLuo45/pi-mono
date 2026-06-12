export type TimeScene = 'morning' | 'work' | 'afternoon' | 'late_afternoon' | 'evening' | 'night'

export function getTimeScene(): TimeScene {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 9) return 'morning'
  if (hour >= 9 && hour < 12) return 'work'
  if (hour >= 12 && hour < 14) return 'afternoon'
  if (hour >= 14 && hour < 18) return 'late_afternoon'
  if (hour >= 18 && hour < 22) return 'evening'
  return 'night'
}

export function isWeekend(): boolean {
  const day = new Date().getDay()
  return day === 0 || day === 6
}
