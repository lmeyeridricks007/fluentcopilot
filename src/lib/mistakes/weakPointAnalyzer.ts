/**
 * Derives prioritisation weights for SRS rows from mistakes + review item linkage.
 */
import type { MistakeEvent } from '@/lib/schemas/mistakeEvent.schema'
import { aggregateWeakAreas } from '@/lib/mistakes/mistakeTagger'

export function mistakeWeightByReviewItemId(events: MistakeEvent[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const e of events) {
    const rid = e.reviewItemId
    if (!rid) continue
    map.set(rid, (map.get(rid) ?? 0) + e.severity)
  }
  return map
}

export function mistakeLinkedReviewItemIds(events: MistakeEvent[], minSeverity = 3): Set<string> {
  const out = new Set<string>()
  for (const e of events) {
    if (e.severity >= minSeverity && e.reviewItemId) out.add(e.reviewItemId)
  }
  return out
}

export function topWeakTags(events: MistakeEvent[], limit = 8): string[] {
  const w = aggregateWeakAreas(events)
  return [...w.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k)
}
