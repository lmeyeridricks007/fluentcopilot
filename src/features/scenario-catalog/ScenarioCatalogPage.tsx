'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Library } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useEntitlement } from '@/features/entitlements'
import { useRetentionProfile } from '@/features/retention/useRetentionProfile'
import { loadWeakTags } from '@/features/curriculum/a2ReviewStore'
import { getScenarioCatalogEntries } from '@/lib/practice/scenarioCatalog'
import {
  filterScenarioCatalogEntries,
  sortCatalogEntriesByRecommendation,
  defaultCatalogFilterState,
} from '@/lib/practice/applyScenarioCatalogFilters'
import { getRecommendedScenarioIds } from '@/lib/practice/recommendationSignals'
import { parseCatalogSearchParams, catalogFiltersToSearchParams } from './parseCatalogSearchParams'
import { buildScenarioCardModels } from './buildScenarioCardModels'
import { ScenarioFilterBar } from './components/ScenarioFilterBar'
import { ScenarioCard } from './components/ScenarioCard'
import { ScenarioEmptyState } from './components/ScenarioEmptyState'
import type { ScenarioCatalogFilterState } from '@/lib/practice/applyScenarioCatalogFilters'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'

export function ScenarioCatalogPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { tier } = useEntitlement()
  const { completedLessonIds } = useRetentionProfile()
  const [weakTags, setWeakTags] = useState(() => loadWeakTags())
  const [expandedFilters, setExpandedFilters] = useState(false)
  const [practiceProgressEpoch, setPracticeProgressEpoch] = useState(0)

  useEffect(() => {
    setWeakTags(loadWeakTags())
  }, [completedLessonIds.length])

  useEffect(() => {
    const bump = () => setPracticeProgressEpoch((e) => e + 1)
    window.addEventListener('lt-practice-progress-updated', bump)
    return () => window.removeEventListener('lt-practice-progress-updated', bump)
  }, [])

  const filters: ScenarioCatalogFilterState = useMemo(() => {
    return parseCatalogSearchParams(new URLSearchParams(searchParams.toString()))
  }, [searchParams])

  const setFilters = useCallback(
    (next: ScenarioCatalogFilterState) => {
      const p = catalogFiltersToSearchParams(next)
      const q = p.toString()
      router.replace(q ? `/app/practice/scenarios?${q}` : '/app/practice/scenarios')
    },
    [router]
  )

  const recommendedIds = useMemo(
    () =>
      getRecommendedScenarioIds({
        weakTags,
        completedLessonIds,
        max: 12,
      }),
    [weakTags, completedLessonIds]
  )

  const allEntries = useMemo(() => getScenarioCatalogEntries(), [])

  const filtered = useMemo(() => {
    const f = filterScenarioCatalogEntries(allEntries, filters, weakTags)
    return sortCatalogEntriesByRecommendation(f, recommendedIds)
  }, [allEntries, filters, weakTags, recommendedIds])

  useEffect(() => {
    track(ANALYTICS_EVENTS.scenario_catalog_viewed, {
      filter_weak_only: filters.weakOnly,
      result_count: filtered.length,
    })
  }, [filters.weakOnly, filtered.length])

  const cardModels = useMemo(
    () =>
      buildScenarioCardModels({
        entries: filtered,
        recommendedIds,
        weakTags,
        tier,
      }),
    [filtered, recommendedIds, weakTags, tier, practiceProgressEpoch]
  )

  const topTitle = cardModels.find((m) => m.isRecommendedNext)?.entry.title

  return (
    <div className="px-4 py-6 pb-28 max-w-lg mx-auto w-full space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/app/practice"
          className="min-h-touch min-w-touch inline-flex items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-muted -ml-2"
          aria-label="Back to Practice hub"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-title font-bold text-ink-primary tracking-tight">Scenario library</h1>
          <p className="text-body-sm text-ink-secondary leading-snug">
            Browse real-life Dutch by situation, level, and skill.
          </p>
        </div>
      </div>

      {topTitle && !filters.weakOnly ? (
        <Card variant="flat" padding="sm" className="border border-primary-100 bg-primary-50/40">
          <p className="text-caption font-semibold text-primary-800 flex items-center gap-1.5">
            <Library className="w-3.5 h-3.5" aria-hidden />
            Suggested next
          </p>
          <p className="text-body-sm text-ink-primary mt-1">
            Start with <span className="font-semibold">{topTitle}</span> — it fits your goals right now.
          </p>
        </Card>
      ) : null}

      <ScenarioFilterBar
        filters={filters}
        onChange={setFilters}
        expanded={expandedFilters}
        onToggleExpanded={() => setExpandedFilters((e) => !e)}
      />

      <div className="space-y-2" aria-live="polite">
        {cardModels.length === 0 ? (
          <ScenarioEmptyState
            weakOnly={filters.weakOnly}
            onResetFilters={() => setFilters(defaultCatalogFilterState())}
          />
        ) : (
          cardModels.map((m) => (
            <ScenarioCard
              key={m.entry.id}
              model={m}
              hrefOverride={m.isPremiumLocked ? '/app/premium' : undefined}
            />
          ))
        )}
      </div>
    </div>
  )
}
