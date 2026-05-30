'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, Lightbulb } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import {
  trackPracticeHubRecommendationShown,
  trackPracticeHubRecommendationClicked,
} from '@/lib/analytics'
import { ScenarioSceneVisual } from '@/components/visual/ScenarioSceneVisual'
import { getScenarioCatalogEntry } from '@/lib/practice/scenarioCatalog'
import { resolveScenarioVisual } from '@/lib/visual/scenarioVisualRegistry'
import type { RecommendationVm } from '../types'

function modeShort(m: RecommendationVm['mode']): string {
  if (m === 'semi_guided') return 'Semi-guided'
  if (m === 'free') return 'Free'
  if (m === 'speaking_focus') return 'Speaking'
  if (m === 'listening_focus') return 'Listening'
  return 'Guided'
}

function practiceMetaLine(rec: RecommendationVm): string {
  if (rec.practiceKind === 'skill_track') {
    return `${rec.level} · Skill track · ~${rec.estimatedMinutes} min`
  }
  return `${rec.level} · ${modeShort(rec.mode)} · ~${rec.estimatedMinutes} min`
}

export function RecommendationCard({
  rec,
  variant = 'default',
}: {
  rec: RecommendationVm
  /** Larger, primary framing for dashboard “featured” slot */
  variant?: 'default' | 'featured'
}) {
  const featured = variant === 'featured'
  const catalogEntry =
    rec.practiceKind === 'skill_track' ? undefined : getScenarioCatalogEntry(rec.scenarioId)
  const sceneVisual = catalogEntry ? resolveScenarioVisual(catalogEntry) : null

  useEffect(() => {
    trackPracticeHubRecommendationShown({
      recommendation_id: rec.id,
      practice_kind: rec.practiceKind,
      scenario_id: rec.scenarioId,
      href: rec.href,
      variant,
    })
  }, [rec.id, rec.scenarioId, rec.href, rec.practiceKind, variant])

  return (
    <Link
      href={rec.href}
      className="block min-h-touch"
      onClick={() =>
        trackPracticeHubRecommendationClicked({
          recommendation_id: rec.id,
          practice_kind: rec.practiceKind,
          scenario_id: rec.scenarioId,
          href: rec.href,
          variant,
        })
      }
    >
      <Card
        variant="outlined"
        padding={featured ? 'md' : 'sm'}
        className={`h-full transition-colors active:scale-[0.99] ${
          featured
            ? 'border-primary-300/90 bg-gradient-to-br from-primary-50/70 to-surface-elevated shadow-sm ring-1 ring-primary-100 hover:border-primary-400'
            : 'border-slate-200/90 hover:border-primary-200 hover:bg-primary-50/20'
        }`}
      >
        <div className="flex gap-3">
          {sceneVisual ? (
            <div
              className={`relative shrink-0 overflow-hidden rounded-xl ${featured ? 'h-[3.25rem] w-[3.25rem]' : 'h-11 w-11'}`}
            >
              <ScenarioSceneVisual visual={sceneVisual} variant="square" fillSlot className="rounded-xl" />
            </div>
          ) : (
            <div
              className={`rounded-lg bg-primary-50 flex items-center justify-center shrink-0 ${featured ? 'w-11 h-11' : 'w-9 h-9'}`}
            >
              <Lightbulb className={featured ? 'w-5 h-5 text-primary-600' : 'w-4 h-4 text-primary-600'} aria-hidden />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {featured ? (
              <p className="text-caption font-semibold text-primary-800 uppercase tracking-wide">Recommended scenario</p>
            ) : null}
            <div className="flex items-start justify-between gap-2">
              <p
                className={`font-semibold text-ink-primary leading-snug ${featured ? 'text-body-lg mt-1' : 'text-body-sm'}`}
              >
                {rec.title}
              </p>
              <ChevronRight className="w-4 h-4 text-ink-tertiary shrink-0 mt-0.5" aria-hidden />
            </div>
            <p className="text-caption text-ink-secondary mt-1 line-clamp-2">{rec.reason}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-caption text-ink-secondary">{practiceMetaLine(rec)}</span>
              {rec.premium ? (
                <span className="text-caption font-medium text-amber-800 bg-amber-50 px-1.5 rounded">Premium</span>
              ) : null}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
