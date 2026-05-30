'use client'

import type { GuidedScenarioDefinition } from '@/lib/schemas/practice/guidedScenarioDefinition.schema'
import { Button } from '@/components/ui/Button'
import { ScenarioSceneVisual } from '@/components/visual/ScenarioSceneVisual'
import { getScenarioCatalogEntry } from '@/lib/practice/scenarioCatalog'
import { resolveScenarioVisual } from '@/lib/practice/scenarioImageRegistry'
import { GuidedModeProgressStepper } from './GuidedModeProgressStepper'

export function ScenarioPrepCompact({
  scenarioId,
  definition,
  onStartScene,
  onOpenPhrases,
  startDisabled,
}: {
  scenarioId: string
  definition: GuidedScenarioDefinition
  onStartScene: () => void
  onOpenPhrases: () => void
  startDisabled?: boolean
}) {
  const { intro, goals } = definition
  const catalogEntry = getScenarioCatalogEntry(scenarioId)
  const visual = catalogEntry ? resolveScenarioVisual(catalogEntry) : null

  return (
    <div className="space-y-4 pb-4">
      {visual ? (
        <ScenarioSceneVisual visual={visual} variant="compact" showSceneChip className="shadow-sm" />
      ) : null}
      <div className="rounded-2xl border border-slate-200/90 bg-surface-elevated px-3.5 py-3 shadow-sm">
        <p className="text-caption font-bold text-primary-800/80 uppercase tracking-wide">{intro.headline}</p>
        <p className="text-body-sm text-ink-secondary mt-1.5 leading-snug line-clamp-3">{intro.setting}</p>
        <p className="text-body-sm text-ink-primary mt-2">
          <span className="font-semibold text-ink-secondary">Your role: </span>
          {intro.yourRole}
        </p>
        <p className="text-caption text-ink-secondary mt-2 leading-snug line-clamp-4">{intro.situation}</p>
        {goals.length > 0 ? (
          <div className="mt-3 pt-2 border-t border-slate-200/70">
            <p className="text-caption font-semibold text-ink-secondary">Your goal</p>
            <ul className="mt-1.5 list-disc pl-4 text-caption font-medium text-ink-primary space-y-0.5">
              {goals.map((g, i) => (
                <li key={`${i}-${g}`} className="leading-snug">
                  {g}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl bg-slate-50/80 ring-1 ring-slate-200/60 px-3 py-2.5">
        <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wide mb-1.5">
          After this: other modes
        </p>
        <GuidedModeProgressStepper />
        <p className="text-caption text-ink-tertiary mt-2 leading-snug">
          Semi-guided unlocks after you finish Guided once. Free mode needs Premium and a bit of progress.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button type="button" size="lg" fullWidth disabled={startDisabled} onClick={onStartScene}>
          Enter the conversation
        </Button>
        <Button type="button" variant="secondary" size="lg" fullWidth onClick={onOpenPhrases}>
          Prepare what to say
        </Button>
      </div>
    </div>
  )
}
