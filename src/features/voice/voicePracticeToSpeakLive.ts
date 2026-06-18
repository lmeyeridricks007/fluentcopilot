import { getScenarioCatalogEntries } from '@/lib/practice/scenarioCatalog'
import { resolveCatalogScenarioBackendTarget } from '@/lib/practice/catalogScenarioToBackend'
import { APP_SPEAK_LIVE, speakLiveRunHref } from '@/lib/routing/appRoutes'

export type VoicePracticeSpeakLiveTarget = {
  scenarioId: string
  level: 'A1' | 'A2' | 'B1'
  subType?: string
  variation?: string
}

function catalogLevel(catalogId: string): 'A1' | 'A2' | 'B1' {
  const entry = getScenarioCatalogEntries().find((s) => s.id === catalogId)
  const d = entry?.difficulty?.toUpperCase() ?? 'A2'
  if (d.startsWith('A1')) return 'A1'
  if (d.includes('B1')) return 'B1'
  return 'A2'
}

/** Maps legacy `/app/practice/voice/:id` catalog ids to live Speak Live runs. */
export function resolveVoicePracticeSpeakLiveTarget(demoScenarioId: string): VoicePracticeSpeakLiveTarget | null {
  const target = resolveCatalogScenarioBackendTarget(demoScenarioId)
  if (!target) return null
  const level = target.cefrLevel ?? catalogLevel(demoScenarioId)
  return {
    scenarioId: target.scenarioId,
    level,
    subType: target.scenarioOverrides?.subType,
    variation: target.scenarioOverrides?.variation,
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
  return getScenarioCatalogEntries().flatMap((s) => {
    const href = speakLiveHrefForVoicePracticeScenario(s.id)
    return href ? [{ demoId: s.id, title: s.title, description: s.summary, href }] : []
  })
}

export const VOICE_PRACTICE_FALLBACK_HREF = APP_SPEAK_LIVE
