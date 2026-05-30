import Link from 'next/link'
import { ChevronRight, Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ScenarioSceneVisual } from '@/components/visual/ScenarioSceneVisual'
import { exerciseDifficultyLabel } from '@/features/scenario-catalog/exerciseDifficultyLabel'
import { READINESS_LABELS, MODE_LABELS, CATALOG_CATEGORY_LABELS } from '@/lib/practice/scenarioCatalog'
import { resolveScenarioVisual } from '@/lib/visual/scenarioVisualRegistry'
import { ScenarioBadge } from './ScenarioBadge'
import { SkillTagList } from './SkillTagList'
import type { ScenarioCardModel } from '../types'
import { getPracticeScenarioHref } from '@/lib/practice/getPracticeScenarioHref'

export function ScenarioCard({
  model,
  hrefOverride,
}: {
  model: ScenarioCardModel
  /** e.g. premium upsell instead of simulation */
  hrefOverride?: string
}) {
  const { entry, isRecommendedNext, isWeakAreaMatch, isPremiumLocked } = model
  const href = hrefOverride ?? getPracticeScenarioHref(entry.id)
  const visual = resolveScenarioVisual(entry)

  return (
    <Link
      href={href}
      className="block min-h-touch"
      aria-label={`${entry.title}. ${isPremiumLocked ? 'Premium scenario' : 'Start scenario'}`}
    >
      <Card
        variant="outlined"
        padding="none"
        className="h-full border-slate-200/90 hover:border-primary-200/90 hover:shadow-sm transition-all active:scale-[0.99]"
      >
        <ScenarioSceneVisual
          visual={visual}
          variant="thumbnail"
          showSceneChip
          className="rounded-none"
        />
        <div className="p-3 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              {isRecommendedNext ? (
                <ScenarioBadge variant="recommended" icon="sparkles">
                  Next for you
                </ScenarioBadge>
              ) : null}
              {isWeakAreaMatch && !isRecommendedNext ? (
                <ScenarioBadge variant="weak" icon="heart">
                  Weak-area fit
                </ScenarioBadge>
              ) : null}
              {entry.premiumRequirement === 'premium_only' ? (
                <ScenarioBadge variant="premium" icon="crown">
                  Premium
                </ScenarioBadge>
              ) : null}
              {isPremiumLocked ? (
                <ScenarioBadge variant="locked" icon="lock">
                  Unlock
                </ScenarioBadge>
              ) : null}
            </div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-body font-semibold text-ink-primary leading-snug">{entry.title}</h3>
              <ChevronRight className="w-5 h-5 text-ink-tertiary shrink-0 mt-0.5" aria-hidden />
            </div>
            <p className="text-caption text-ink-secondary mt-1 line-clamp-2 leading-snug">{entry.summary}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-caption text-ink-tertiary">
              <span className="font-medium text-ink-secondary">{CATALOG_CATEGORY_LABELS[entry.category].short}</span>
              <span aria-hidden>·</span>
              <span>{READINESS_LABELS[entry.readiness]}</span>
              <span aria-hidden>·</span>
              <span>{exerciseDifficultyLabel(entry.difficulty)}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-0.5">
                <Clock className="w-3 h-3" aria-hidden />
                {entry.estimatedMinutes} min
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {entry.supportedModes.slice(0, 3).map((m) => (
                <span
                  key={m}
                  className="text-caption font-medium text-primary-700 bg-primary-50/80 px-1.5 py-0.5 rounded border border-primary-100/80"
                >
                  {MODE_LABELS[m]}
                </span>
              ))}
            </div>
            <div className="mt-2">
              <SkillTagList skills={entry.skillFocus} max={4} size="xs" />
            </div>
        </div>
      </Card>
    </Link>
  )
}
