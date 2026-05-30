import type { SkillTrackId } from '@/lib/schemas/practice/skillTrack.schema'
import type { WeaknessCategoryDefinition } from '@/lib/weakness/types'

const TRACK_LABEL: Record<SkillTrackId, string> = {
  listening_confidence: 'Listening confidence',
  speaking_fluency: 'Speaking fluency',
  reading_real_life: 'Reading in real life',
  writing_messages: 'Writing simple messages',
  conversation_repair: 'Reaction speed & repair',
}

export function skillTrackActionForCategory(def: WeaknessCategoryDefinition): {
  id: SkillTrackId
  label: string
  href: string
} | null {
  if (!def.skillTrackId) return null
  return {
    id: def.skillTrackId,
    label: TRACK_LABEL[def.skillTrackId],
    href: `/app/practice/tracks/${encodeURIComponent(def.skillTrackId)}`,
  }
}
