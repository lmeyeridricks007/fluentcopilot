'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MOCK_SCENARIOS } from '@/mocks/scenarios'
import type { DemoScenario } from '@/demo-data/types'
import { getRetentionUserId } from '@/lib/retention/retentionService'
import { useRetentionProfile } from '@/features/retention/useRetentionProfile'
import { readMistakeEventsSync, readMasterySync } from '@/lib/review-engine/reviewPersistence'
import { loadWeakTags } from '@/features/curriculum/a2ReviewStore'
import { loadLastPracticeWeakSignals, computeSkillTrackWeakestById } from '@/lib/weakness'
import { buildWeaknessInsights } from '@/lib/weakness'
import type { MasteryMapBuildInput } from '@/lib/mastery/types'

export type MasteryMapFullInput = MasteryMapBuildInput & { scenarios: DemoScenario[] }

export function useMasteryBuildInput(): MasteryMapFullInput {
  const { profile, completedLessonIds } = useRetentionProfile()
  const [epoch, setEpoch] = useState(0)

  const refresh = useCallback(() => setEpoch((e) => e + 1), [])

  useEffect(() => {
    const onUp = () => refresh()
    window.addEventListener('lt-mastery-updated', onUp)
    window.addEventListener('lt-weakness-updated', onUp)
    window.addEventListener('focus', onUp)
    return () => {
      window.removeEventListener('lt-mastery-updated', onUp)
      window.removeEventListener('lt-weakness-updated', onUp)
      window.removeEventListener('focus', onUp)
    }
  }, [refresh])

  return useMemo(() => {
    void epoch
    const userId = getRetentionUserId()
    const ledgerRefs = (profile?.ledger ?? [])
      .filter((e) => e.reason === 'practice_scenario_complete')
      .map((e) => e.ref)
      .filter((x): x is string => Boolean(x))

    const weakTags = loadWeakTags()
    const mistakes = readMistakeEventsSync(userId)
    const lastPractice = loadLastPracticeWeakSignals()
    const mastery = readMasterySync(userId)
    const skillWeak = computeSkillTrackWeakestById()
    const insights = buildWeaknessInsights({
      scenarios: MOCK_SCENARIOS as DemoScenario[],
      weakTags,
      mistakeEvents: mistakes,
      lastPractice: lastPractice
        ? {
            tags: lastPractice.tags,
            scenarioId: lastPractice.scenarioId,
            recordedAt: lastPractice.recordedAt,
            outcome: lastPractice.outcome,
          }
        : null,
      skillTrackWeakestById: skillWeak,
      masterySkills: mastery?.skillLevels,
    })

    return {
      userId,
      practiceScenarioLedgerRefs: ledgerRefs,
      completedLessonIds,
      topWeaknessCategoryIds: insights.map((i) => i.categoryId),
      skillTrackWeakestById: skillWeak,
      scenarios: MOCK_SCENARIOS as DemoScenario[],
    }
  }, [profile?.ledger, completedLessonIds, epoch])
}
