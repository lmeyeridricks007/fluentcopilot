import Link from 'next/link'
import { Compass, Check, Circle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { ConfidenceSectionVm } from '../types'

export function ConfidenceSummaryCard({ section }: { section: ConfidenceSectionVm }) {
  return (
    <Card variant="outlined" padding="md" className="border-primary-100 bg-gradient-to-b from-primary-50/40 to-surface-elevated">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
          <Compass className="w-5 h-5 text-primary-600" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body-lg font-semibold text-ink-primary">{section.headline}</p>
          <p className="text-body-sm text-ink-secondary mt-1 leading-snug">{section.subline}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div>
          <p className="text-caption font-semibold text-success uppercase tracking-wide mb-2">Growing confidence</p>
          <ul className="space-y-2">
            {section.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-body-sm text-ink-primary">
                <Check className="w-4 h-4 text-success shrink-0 mt-0.5" aria-hidden />
                <span>{s.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-caption font-semibold text-ink-secondary uppercase tracking-wide mb-2">Still building</p>
          <ul className="space-y-2">
            {section.gaps.map((g, i) => (
              <li key={i} className="flex gap-2 text-body-sm text-ink-secondary">
                <Circle className="w-3 h-3 text-ink-tertiary shrink-0 mt-1" aria-hidden />
                <span>{g.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-caption text-ink-tertiary mt-4 leading-snug">
        B1 readiness is a journey — scenarios and review together build the bridge from A2.
      </p>
      <Link
        href={section.ctaHref}
        className="mt-3 flex w-full min-h-touch items-center justify-center rounded-lg bg-surface-muted px-4 py-2.5 text-body font-medium text-ink-primary border border-slate-200 hover:bg-slate-100 transition-colors"
      >
        {section.ctaLabel}
      </Link>
      <Link
        href="/app/progress#mastery-map"
        className="mt-2 block text-center text-caption font-medium text-primary-600 hover:underline"
      >
        Real-life ability map →
      </Link>
    </Card>
  )
}
