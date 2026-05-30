import Link from 'next/link'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import type { PracticeSessionEvaluationVm } from '@/lib/practice/conversation/buildPracticeSessionEvaluation'

export function SessionEvaluationSummary({
  evaluation,
  scenarioTitle,
}: {
  evaluation: PracticeSessionEvaluationVm
  scenarioTitle: string
}) {
  const goal =
    evaluation.outcome === 'success'
      ? 'Completed'
      : evaluation.outcome === 'partial'
        ? 'Partly completed'
        : 'Needs more practice'

  return (
    <div className="space-y-4">
      <Card variant="flat" padding="md" className="border border-primary-100 bg-primary-50/30">
        <p className="text-caption font-semibold text-primary-800">Session · {scenarioTitle}</p>
        <p className="text-caption text-ink-secondary mt-1">Goal: {goal}</p>
        <h2 className="text-title font-bold text-ink-primary mt-1 tracking-tight">{evaluation.goalHeadline}</h2>
      </Card>

      <Card variant="flat" padding="md" className="border border-slate-200/90 space-y-2">
        <p className="text-body-sm font-semibold text-ink-primary">What went well</p>
        <ul className="list-disc pl-5 space-y-1 text-body-sm text-ink-secondary">
          {evaluation.wentWell.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </Card>

      <Card variant="flat" padding="md" className="border border-slate-200/90 space-y-2">
        <p className="text-body-sm font-semibold text-ink-primary">What to improve</p>
        <ul className="list-disc pl-5 space-y-1 text-body-sm text-ink-secondary">
          {evaluation.improve.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </Card>

      <Card variant="flat" padding="md" className="border border-slate-200/90 space-y-2">
        <p className="text-body-sm font-semibold text-ink-primary">Stronger phrases</p>
        <ul className="space-y-2">
          {evaluation.betterPhrases.map((p, i) => (
            <li key={i} className="text-body-sm">
              <span className="font-medium text-ink-primary">{p.nl}</span>
              {p.en ? <span className="block text-caption text-ink-secondary">{p.en}</span> : null}
            </li>
          ))}
        </ul>
      </Card>

      <Card variant="flat" padding="sm" className="border border-slate-200/80 bg-surface-muted/50">
        <p className="text-caption text-ink-secondary">{evaluation.confidenceNote}</p>
      </Card>

      <Link
        href={evaluation.nextHref}
        className={clsx(
          'inline-flex w-full justify-center items-center min-h-touch px-4 py-2.5 rounded-lg font-medium text-body',
          'bg-primary-600 text-white hover:bg-primary-700'
        )}
      >
        {evaluation.nextLabel}
      </Link>

      <Link
        href="/app/practice/scenarios"
        className="block text-center text-caption font-medium text-primary-600 py-2"
      >
        Back to scenario library
      </Link>
    </div>
  )
}
