/** @deprecated Use `PracticeFeedbackScreen` — kept for reference / tests. */
import Link from 'next/link'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import type { GuidedEvaluation } from '@/lib/schemas/practice/guidedScenarioDefinition.schema'
import type { GuidedOutcome } from '@/lib/practice/guided/guidedSessionState'

export function ScenarioCompletionCard({
  evaluation,
  outcome,
}: {
  evaluation: GuidedEvaluation
  outcome: GuidedOutcome
}) {
  const title =
    outcome === 'success'
      ? evaluation.successTitle
      : outcome === 'partial'
        ? evaluation.partialTitle
        : evaluation.needsPracticeTitle

  const goalLabel =
    outcome === 'success'
      ? 'Goal: completed'
      : outcome === 'partial'
        ? 'Goal: partly completed'
        : 'Goal: needs more practice'

  return (
    <div className="space-y-4">
      <Card variant="flat" padding="md" className="border border-primary-100 bg-primary-50/30">
        <p className="text-caption font-semibold text-primary-800">{goalLabel}</p>
        <h2 className="text-title font-bold text-ink-primary mt-1 tracking-tight">{title}</h2>
      </Card>

      <Card variant="flat" padding="md" className="border border-slate-200/90 space-y-3">
        <p className="text-body-sm font-semibold text-ink-primary">What went well</p>
        <ul className="list-disc pl-5 space-y-1 text-body-sm text-ink-secondary">
          {evaluation.wentWellBullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </Card>

      <Card variant="flat" padding="md" className="border border-slate-200/90 space-y-3">
        <p className="text-body-sm font-semibold text-ink-primary">What to improve</p>
        <ul className="list-disc pl-5 space-y-1 text-body-sm text-ink-secondary">
          {evaluation.improveBullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </Card>

      <Card variant="flat" padding="md" className="border border-slate-200/90 space-y-3">
        <p className="text-body-sm font-semibold text-ink-primary">Stronger phrases to try</p>
        <ul className="space-y-2">
          {evaluation.betterPhrases.map((p, i) => (
            <li key={i} className="text-body-sm">
              <span className="font-medium text-ink-primary">{p.nl}</span>
              {p.en ? <span className="block text-caption text-ink-secondary">{p.en}</span> : null}
            </li>
          ))}
        </ul>
      </Card>

      <div className="space-y-2">
        <p className="text-caption font-medium text-ink-secondary">Next step</p>
        <div className="flex flex-col gap-2">
          {evaluation.nextActions.map((a) => (
            <Link
              key={a.href + a.label}
              href={a.href}
              className={clsx(
                'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 min-h-touch px-4 py-2.5 text-body w-full text-center',
                a.variant === 'primary'
                  ? 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800'
                  : a.variant === 'ghost'
                    ? 'bg-transparent text-ink-primary hover:bg-surface-muted'
                    : 'bg-surface-muted text-ink-primary hover:bg-slate-200 active:bg-slate-300'
              )}
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      <p className="text-caption text-ink-tertiary text-center px-2">
        Semi-guided and free conversation modes will unlock more open practice later.
      </p>
    </div>
  )
}
