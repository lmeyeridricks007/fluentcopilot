'use client'

import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { ConfidenceTrendSummaryVm } from '@/lib/dashboard/confidenceTrendSummary'

export function ConfidenceTrendMiniCard({
  summary,
}: {
  summary: ConfidenceTrendSummaryVm
}) {
  return (
    <Card variant="flat" padding="sm" className="border border-slate-200/90 bg-surface-elevated h-full">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-emerald-700" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-caption font-semibold text-ink-secondary">Confidence trend</p>
          <p className="text-body-sm font-semibold text-ink-primary mt-0.5 leading-snug">{summary.headline}</p>
          <p className="text-caption text-ink-secondary mt-1 leading-snug line-clamp-3">{summary.body}</p>
          <Link href="/app/progress#mastery-map" className="inline-flex mt-2 text-caption font-semibold text-primary-700 hover:underline">
            Ability map →
          </Link>
        </div>
      </div>
    </Card>
  )
}
