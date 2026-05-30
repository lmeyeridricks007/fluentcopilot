'use client'

import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { ReadinessEvaluation } from '@/lib/post-a2/types'

export function ReadinessB1MiniCard({
  readiness,
  detailsHref,
  detailsLabel = 'How we decide →',
  insightLocked,
}: {
  readiness: ReadinessEvaluation
  /** e.g. post-A2 chooser when eligible, else Progress */
  detailsHref: string
  detailsLabel?: string
  /** Basic plan: show headline only; full reasoning + link are Premium. */
  insightLocked?: boolean
}) {
  return (
    <Card variant="flat" padding="sm" className="border border-slate-200/90 bg-surface-elevated h-full">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-primary-700" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-caption font-semibold text-ink-secondary">B1 readiness (at a glance)</p>
          <p className="text-body-sm font-semibold text-ink-primary mt-0.5 leading-snug">{readiness.headline}</p>
          {insightLocked ? (
            <p className="text-caption text-ink-secondary mt-1 leading-snug">
              Deeper breakdown and trend context are part of Premium. You still keep this headline on Basic.
            </p>
          ) : (
            <>
              <p className="text-caption text-ink-secondary mt-1 leading-snug line-clamp-3">{readiness.reasonLine}</p>
              <Link href={detailsHref} className="inline-flex mt-2 text-caption font-semibold text-primary-700 hover:underline">
                {detailsLabel}
              </Link>
            </>
          )}
          {insightLocked ? (
            <Link href="/pricing" className="inline-flex mt-2 text-caption font-semibold text-primary-700 hover:underline">
              Compare plans →
            </Link>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
