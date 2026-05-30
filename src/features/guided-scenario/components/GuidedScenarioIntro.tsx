import type { GuidedScenarioDefinition } from '@/lib/schemas/practice/guidedScenarioDefinition.schema'
import { Card } from '@/components/ui/Card'

export function GuidedScenarioIntro({
  definition,
}: {
  definition: Pick<GuidedScenarioDefinition, 'intro' | 'goals'>
}) {
  const { intro, goals } = definition
  const g0 = goals[0]
  const g1 = goals[1]
  return (
    <Card variant="flat" padding="md" className="border border-slate-200/90 bg-surface-elevated">
      <p className="text-caption font-semibold text-primary-700 uppercase tracking-wide">{intro.headline}</p>
      <p className="text-body-sm text-ink-secondary mt-2 leading-relaxed">{intro.setting}</p>
      <p className="text-body-sm text-ink-primary mt-2">
        <span className="font-medium text-ink-secondary">Your role: </span>
        {intro.yourRole}
      </p>
      <p className="text-body text-ink-primary mt-2 leading-snug">{intro.situation}</p>
      {g0 ? (
        <div className="mt-4 rounded-lg border border-slate-200/90 bg-surface-muted/50 px-3 py-2.5">
          <p className="text-caption font-semibold text-ink-secondary">What you need to handle</p>
          <p className="text-body-sm text-ink-primary mt-1 leading-snug">
            {g0}
            {g1 ? ` · ${g1}` : ''}
          </p>
        </div>
      ) : null}
    </Card>
  )
}
