'use client'

import type { SkillTrackId } from '@/lib/schemas/practice/skillTrack.schema'
import { loadSkillTrackProgress } from '@/lib/skill-tracks/skillTrackProgressStorage'

const ALL_TRACKS: SkillTrackId[] = [
  'speaking_fluency',
  'listening_confidence',
  'reading_real_life',
  'writing_messages',
  'conversation_repair',
]

/**
 * Lowest best level score per track (0–1). Omits tracks with no completed level scores.
 */
export function computeSkillTrackWeakestById(): Partial<Record<SkillTrackId, number>> {
  const out: Partial<Record<SkillTrackId, number>> = {}
  for (const id of ALL_TRACKS) {
    const p = loadSkillTrackProgress(id)
    const scores = Object.values(p.bestScoreByLevel).filter((x) => typeof x === 'number')
    if (scores.length === 0) continue
    out[id] = Math.min(...scores)
  }
  return out
}
