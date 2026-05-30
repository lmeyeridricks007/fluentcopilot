'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { MOCK_SCENARIOS } from '@/mocks/scenarios'
import { useRetentionProfile } from '@/features/retention/useRetentionProfile'
import { useEntitlement } from '@/features/entitlements'
import { loadWeakTags } from '@/features/curriculum/a2ReviewStore'
import { getRetentionUserId } from '@/lib/retention/retentionService'
import { readMistakeEventsSync, readMasterySync } from '@/lib/review-engine/reviewPersistence'
import {
  loadLastPracticeWeakSignals,
  computeSkillTrackWeakestById,
  buildWeaknessInsights,
} from '@/lib/weakness'
import { getScenarioCatalogEntry } from '@/lib/practice/scenarioCatalog'
import { ensureMissionRuntimeHydrated } from '@/lib/missions/missionAssigner'
import {
  buildMissionPresentationBundle,
  type MissionPresentationBundle,
} from '@/lib/missions/missionPresenterModel'
import type { MissionGeneratorContext } from '@/lib/missions/types'
import { getLastPracticeContinue } from './practiceHubStorage'
import { buildPracticeHubViewModel } from './buildPracticeHubViewModel'
import type { PracticeHubViewModel } from './types'
import { readListeningProfile } from '@/lib/listening-mode/listeningProfileStorage'
import type { MistakeEvent } from '@/lib/schemas/mistakeEvent.schema'
import type { SkillTrackId } from '@/lib/schemas/practice/skillTrack.schema'

export function usePracticeHubViewModel(): PracticeHubViewModel {
  const { streak, totalXp, completedLessonIds, abilities } = useRetentionProfile()
  const { tier, atScenarioCap } = useEntitlement()
  const [weakTags, setWeakTags] = useState<ReturnType<typeof loadWeakTags>>([])
  const [lastContinue, setLastContinue] = useState(() => getLastPracticeContinue())
  const [mistakeEvents, setMistakeEvents] = useState<MistakeEvent[]>([])
  const [lastPracticeWeak, setLastPracticeWeak] = useState<
    | {
        tags: string[]
        scenarioId: string
        recordedAt: string
        outcome?: 'success' | 'partial' | 'needs_practice'
      }
    | null
  >(() => {
    const lp = loadLastPracticeWeakSignals()
    return lp
      ? {
          tags: lp.tags,
          scenarioId: lp.scenarioId,
          recordedAt: lp.recordedAt,
          outcome: lp.outcome,
        }
      : null
  })
  const [skillTrackWeakestById, setSkillTrackWeakestById] = useState<
    Partial<Record<SkillTrackId, number>>
  >(() => computeSkillTrackWeakestById())
  const [listeningProfileTick, setListeningProfileTick] = useState(0)

  const refreshLocalSignals = useCallback(() => {
    setWeakTags(loadWeakTags())
    setLastContinue(getLastPracticeContinue())
    setMistakeEvents(readMistakeEventsSync(getRetentionUserId()))
    const lp = loadLastPracticeWeakSignals()
    setLastPracticeWeak(
      lp
        ? {
            tags: lp.tags,
            scenarioId: lp.scenarioId,
            recordedAt: lp.recordedAt,
            outcome: lp.outcome,
          }
        : null
    )
    setSkillTrackWeakestById(computeSkillTrackWeakestById())
  }, [])

  useEffect(() => {
    refreshLocalSignals()
  }, [completedLessonIds.length, streak, refreshLocalSignals])

  useEffect(() => {
    const onFocus = () => refreshLocalSignals()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshLocalSignals])

  useEffect(() => {
    const onWeak = () => refreshLocalSignals()
    window.addEventListener('lt-weakness-updated', onWeak)
    return () => window.removeEventListener('lt-weakness-updated', onWeak)
  }, [refreshLocalSignals])

  useEffect(() => {
    const onListen = () => setListeningProfileTick((n) => n + 1)
    window.addEventListener('lt-listening-profile-updated', onListen)
    return () => window.removeEventListener('lt-listening-profile-updated', onListen)
  }, [])

  const listeningBurstRelief = useMemo(() => {
    void listeningProfileTick
    const uid = getRetentionUserId()
    const p = readListeningProfile(uid)
    return {
      sessionCount: p.sessionIds.length,
      fastSpeechStress: p.dimensionStress.fast_speech,
    }
  }, [listeningProfileTick])

  const weaknessInsights = useMemo(() => {
    const uid = getRetentionUserId()
    const mastery = readMasterySync(uid)
    return buildWeaknessInsights({
      scenarios: MOCK_SCENARIOS,
      weakTags,
      mistakeEvents,
      lastPractice: lastPracticeWeak,
      skillTrackWeakestById,
      masterySkills: mastery?.skillLevels,
      listeningBurstRelief,
    })
  }, [weakTags, mistakeEvents, lastPracticeWeak, skillTrackWeakestById, listeningBurstRelief])

  const [missionPresentation, setMissionPresentation] = useState<MissionPresentationBundle | null>(null)

  useEffect(() => {
    const uid = getRetentionUserId()
    const ctx: MissionGeneratorContext = {
      tier,
      atScenarioCap,
      weaknessInsights,
      userId: uid,
      inferredCategory: lastPracticeWeak
        ? getScenarioCatalogEntry(lastPracticeWeak.scenarioId)?.category
        : undefined,
    }
    const state = ensureMissionRuntimeHydrated(uid, ctx)
    setMissionPresentation(buildMissionPresentationBundle(state))
  }, [tier, atScenarioCap, weaknessInsights, lastPracticeWeak, streak, totalXp])

  return useMemo(() => {
    const uid = getRetentionUserId()
    const mastery = readMasterySync(uid)

    return buildPracticeHubViewModel({
      scenarios: MOCK_SCENARIOS,
      lastContinue,
      weakTags,
      mistakeEvents,
      lastPracticeWeak,
      skillTrackWeakestById,
      masterySkills: mastery?.skillLevels,
      completedLessonIds,
      abilities,
      tier,
      atScenarioCap,
      streak,
      totalXp,
      weaknessInsights,
      missionPresentation,
      listeningBurstRelief,
    })
  }, [
    lastContinue,
    weakTags,
    mistakeEvents,
    lastPracticeWeak,
    skillTrackWeakestById,
    completedLessonIds,
    abilities,
    tier,
    atScenarioCap,
    streak,
    totalXp,
    weaknessInsights,
    missionPresentation,
    listeningBurstRelief,
  ])
}
