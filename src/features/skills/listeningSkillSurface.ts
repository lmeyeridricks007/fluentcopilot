import type { ApiSkillDefinition, ApiSkillId } from '@/lib/api/apiTypes'
import { APP_LISTENING_MODE, listeningModeSessionHref } from '@/lib/routing/appRoutes'

/** Seven learner-facing listening subskills shown as the primary cluster on Skills. */
export const LISTENING_CLUSTER_SKILL_IDS: readonly ApiSkillId[] = [
  'gist_understanding',
  'detail_recognition',
  'fast_speech_handling',
  'route_words',
  'numbers_and_times',
  'service_replies',
  'response_readiness',
] as const

const ORDER = new Map<string, number>(LISTENING_CLUSTER_SKILL_IDS.map((id, i) => [id, i]))

export function filterListeningClusterDefinitions(defs: ApiSkillDefinition[]): ApiSkillDefinition[] {
  return defs
    .filter((d) => d.group === 'listening' && ORDER.has(d.id))
    .sort((a, b) => (ORDER.get(a.id) ?? 0) - (ORDER.get(b.id) ?? 0))
}

/** Short cluster label (product copy) — maps canonical skill ids to the Skills UI. */
export function listeningClusterDisplayLabel(skillId: ApiSkillId): string {
  const map: Partial<Record<ApiSkillId, string>> = {
    gist_understanding: 'Gist',
    detail_recognition: 'Details',
    fast_speech_handling: 'Fast speech',
    route_words: 'Route details',
    numbers_and_times: 'Numbers & times',
    service_replies: 'Service replies',
    response_readiness: 'Response readiness',
  }
  return map[skillId] ?? skillId
}

function listeningLevel(practiceLevel: 'A1' | 'A2' | 'B1' | 'B2'): 'A1' | 'A2' | 'B1' {
  return practiceLevel === 'B2' ? 'B1' : practiceLevel
}

/**
 * Primary “best next” action for listening subskills — deep-links into Listening mode
 * (not Speak Live) so the cluster feels first-class.
 */
export function listeningBestNextCta(
  def: ApiSkillDefinition,
  practiceLevel: 'A1' | 'A2' | 'B1' | 'B2',
): { href: string; label: string } | null {
  if (def.group !== 'listening') return null
  const level = listeningLevel(practiceLevel)
  switch (def.id) {
    case 'gist_understanding':
      return {
        href: listeningModeSessionHref({ packId: 'pack-train-platform', level, variation: 'announcements' }),
        label: 'Practice · Train announcements',
      }
    case 'detail_recognition':
      return {
        href: listeningModeSessionHref({ packId: 'pack-cafe-burst', level, variation: 'cafe_counter' }),
        label: 'Practice · Café details',
      }
    case 'fast_speech_handling':
      return {
        href: listeningModeSessionHref({ packId: 'pack-shop-fast', level, variation: 'aisle_floor' }),
        label: 'Practice · Fast shop Dutch',
      }
    case 'route_words':
      return {
        href: listeningModeSessionHref({ packId: 'pack-train-platform', level, variation: 'connections' }),
        label: 'Practice · Route & platforms',
      }
    case 'numbers_and_times':
      return {
        href: listeningModeSessionHref({ packId: 'pack-train-platform', level, variation: 'announcements' }),
        label: 'Practice · Times in announcements',
      }
    case 'service_replies':
      return {
        href: listeningModeSessionHref({ packId: 'pack-cafe-burst', level, variation: 'cafe_counter' }),
        label: 'Practice · Counter replies',
      }
    case 'response_readiness':
      return {
        href: listeningModeSessionHref({ packId: 'pack-cafe-burst', level, variation: 'follow_up' }),
        label: 'Practice · Listen & respond',
      }
    default:
      return { href: APP_LISTENING_MODE, label: 'Open Listening' }
  }
}
