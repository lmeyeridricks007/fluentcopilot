import { MOCK_SCENARIOS } from '@/mocks/scenarios'
import { APP_SPEAK_LIVE, speakLiveRunHref } from '@/lib/routing/appRoutes'

export type VoicePracticeSpeakLiveTarget = {
  scenarioId: string
  level: 'A1' | 'A2' | 'B1'
  subType?: string
  variation?: string
}

/** Maps legacy `/app/practice/voice/:id` demo catalog ids to live Speak Live runs. */
export function resolveVoicePracticeSpeakLiveTarget(demoScenarioId: string): VoicePracticeSpeakLiveTarget | null {
  const demo = MOCK_SCENARIOS.find((s) => s.id === demoScenarioId)
  const levelRaw = demo?.level?.trim().toUpperCase()
  const level: 'A1' | 'A2' | 'B1' = levelRaw === 'A1' || levelRaw === 'B1' ? levelRaw : 'A2'

  switch (demoScenarioId) {
    case 'cafe':
      return { scenarioId: 'ordering_food', level, subType: 'cafe', variation: 'simple' }
    case 'doctor':
      return { scenarioId: 'doctor_pharmacy', level, subType: 'doctor_visit' }
    case 'supermarket_shop':
      return { scenarioId: 'supermarket_shop', level, variation: 'asking_where_something_is' }
    case 'municipality':
      return { scenarioId: 'booking_reservations', level, subType: 'town_hall' }
    case 'work':
      return { scenarioId: 'work_colleague_interaction', level }
    case 'train':
      return { scenarioId: 'train-station', level }
    case 'housing':
      return { scenarioId: 'housing_landlord', level }
    case 'social_plans':
      return { scenarioId: 'small_talk', level }
    case 'problem_solving':
      return { scenarioId: 'store_service_issue', level }
    default:
      return null
  }
}

export function speakLiveHrefForVoicePracticeScenario(demoScenarioId: string): string | null {
  const target = resolveVoicePracticeSpeakLiveTarget(demoScenarioId)
  if (!target) return null
  return speakLiveRunHref({
    scenarioId: target.scenarioId,
    level: target.level,
    ...(target.subType ? { subType: target.subType } : {}),
    ...(target.variation ? { variation: target.variation } : {}),
  })
}

export function speakLiveHrefForAllVoicePracticeScenarios(): Array<{
  demoId: string
  title: string
  description: string
  href: string
}> {
  return MOCK_SCENARIOS.flatMap((s) => {
    const href = speakLiveHrefForVoicePracticeScenario(s.id)
    return href ? [{ demoId: s.id, title: s.title, description: s.description, href }] : []
  })
}

export const VOICE_PRACTICE_FALLBACK_HREF = APP_SPEAK_LIVE
