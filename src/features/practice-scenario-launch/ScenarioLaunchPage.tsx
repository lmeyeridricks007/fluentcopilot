'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useEntitlement } from '@/features/entitlements'
import { getScenarioCatalogEntry } from '@/lib/practice/scenarioCatalog'
import { ScenarioSceneVisual } from '@/components/visual/ScenarioSceneVisual'
import { resolveScenarioVisual } from '@/lib/visual/scenarioVisualRegistry'
import { ScenarioModeSelector } from './ScenarioModeSelector'
import { ScenarioListeningWarmupCard } from './ScenarioListeningWarmupCard'
import { trackScenarioViewed } from '@/lib/analytics'
import { readListeningProfile } from '@/lib/listening-mode/listeningProfileStorage'
import { scenarioListeningWarmupForLaunch } from '@/lib/listening-mode/scenarioListeningWarmup'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'

export function ScenarioLaunchPage({ scenarioId }: { scenarioId: string }) {
  const { tier } = useEntitlement()
  const userId = useAuthStore((s) => s.user?.id ?? LOCAL_ANONYMOUS_LEARNER_ID)
  const entry = getScenarioCatalogEntry(scenarioId)
  const listeningWarmup = useMemo(() => {
    const profile = readListeningProfile(userId)
    return scenarioListeningWarmupForLaunch(scenarioId, profile)
  }, [scenarioId, userId])

  useEffect(() => {
    if (!entry) return
    trackScenarioViewed({
      scenario_id: scenarioId,
      surface: 'launch',
      scenario_category: entry.category,
      entitlement_tier: tier,
    })
  }, [entry, scenarioId, tier])

  if (!entry) {
    return (
      <div className="px-4 py-10 max-w-lg mx-auto text-center">
        <p className="text-body-sm text-ink-secondary">Scenario not found.</p>
        <Link href="/app/practice/scenarios" className="text-primary-600 font-medium text-body-sm mt-4 inline-block">
          Back to library
        </Link>
      </div>
    )
  }

  const visual = resolveScenarioVisual(entry)

  return (
    <div className="px-4 py-6 pb-28 max-w-lg mx-auto w-full space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/app/practice/scenarios"
          className="min-h-touch min-w-touch inline-flex items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-muted -ml-2"
          aria-label="Back to scenario library"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden />
        </Link>
      </div>

      <ScenarioSceneVisual visual={visual} variant="hero" priority showSceneChip className="rounded-2xl shadow-sm" />

      <header>
        <h1 className="text-title font-bold text-ink-primary tracking-tight">{entry.title}</h1>
        <p className="text-body-sm text-ink-secondary leading-snug mt-1">{entry.summary}</p>
        <p className="text-caption text-primary-800/90 font-medium mt-2">
          Step into this scene and train Dutch for exactly this situation.
        </p>
      </header>

      <Card variant="flat" padding="sm" className="border border-primary-100 bg-primary-50/30">
        <p className="text-caption font-semibold text-primary-800">Choose how you want to practice</p>
        <p className="text-body-sm text-ink-primary mt-1 leading-snug">
          Guided first when available — complete it once to unlock Semi-guided for this scenario. Free mode needs
          Premium and a bit of progress in the scene.
        </p>
      </Card>

      {listeningWarmup ? <ScenarioListeningWarmupCard suggestion={listeningWarmup} /> : null}

      <ScenarioModeSelector entry={entry} tier={tier} />
    </div>
  )
}
