import type { SpeakLiveLiveScenario } from '../speakLiveScenarios'

export type SpeakLiveBrowseGroup = {
  key: string
  title: string
  items: SpeakLiveLiveScenario[]
}

/**
 * Curated browse groups (display order + labels).
 * Categories map to exactly one group; see `CATEGORY_TO_GROUP` below.
 */
const GROUP_ORDER: { key: string; title: string; categories: readonly string[] }[] = [
  { key: 'getting_around', title: 'Getting around', categories: ['Transport', 'Getting around'] },
  { key: 'daily_life', title: 'Daily life', categories: ['Food & drink', 'Shopping', 'Housing', 'Friction'] },
  { key: 'work_practical', title: 'Work & practical', categories: ['Work', 'Appointments'] },
  { key: 'social', title: 'Social', categories: ['Social'] },
  { key: 'health_service', title: 'Health & service', categories: ['Health'] },
  { key: 'advanced', title: 'Advanced speaking', categories: ['Advanced'] },
]

const CATEGORY_TO_GROUP = new Map<string, string>()
for (const g of GROUP_ORDER) {
  for (const c of g.categories) {
    CATEGORY_TO_GROUP.set(c, g.key)
  }
}

const STANDARD_LEVELS: readonly string[] = ['A1', 'A2', 'B1']

/** True when every scenario in the group supports the same default A1–B1 band (hides per-row level chips). */
export function groupHasUniformStandardLevels(items: readonly SpeakLiveLiveScenario[]): boolean {
  if (items.length === 0) return false
  return items.every(
    (i) =>
      i.levelSupport.length === STANDARD_LEVELS.length &&
      STANDARD_LEVELS.every((lv, idx) => i.levelSupport[idx] === lv)
  )
}

export function groupLiveScenariosForBrowse(items: readonly SpeakLiveLiveScenario[]): SpeakLiveBrowseGroup[] {
  const buckets = new Map<string, SpeakLiveLiveScenario[]>()
  for (const g of GROUP_ORDER) {
    buckets.set(g.key, [])
  }
  const fallbackKey = 'daily_life'
  for (const item of items) {
    const key = CATEGORY_TO_GROUP.get(item.category) ?? fallbackKey
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(item)
  }
  return GROUP_ORDER.map((g) => ({
    key: g.key,
    title: g.title,
    items: buckets.get(g.key) ?? [],
  })).filter((g) => g.items.length > 0)
}
