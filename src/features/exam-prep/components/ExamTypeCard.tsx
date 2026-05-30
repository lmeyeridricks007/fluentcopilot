'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { ExamPrepTypeRow } from '@/features/exam-prep/examPrepCatalog'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'

type Props = {
  type: ExamPrepTypeRow
  href: string
}

export function ExamTypeCard({ type, href }: Props) {
  const Icon = type.icon

  return (
    <Link
      href={href}
      className="block min-h-touch"
      onClick={() =>
        track(ANALYTICS_EVENTS.exam_prep_type_selected, {
          exam_type: type.id,
        })
      }
    >
      <Card
        variant="outlined"
        padding="md"
        className="h-full border-slate-200/95 bg-surface-elevated hover:border-slate-300 hover:bg-slate-50/60 transition-colors shadow-sm"
      >
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-slate-700" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-body font-semibold text-ink-primary">{type.title}</h2>
              <ChevronRight className="w-5 h-5 text-ink-tertiary shrink-0" aria-hidden />
            </div>
            <p className="text-caption text-ink-secondary mt-0.5 leading-snug">{type.tagline}</p>
            <p className="text-caption text-ink-tertiary mt-2 leading-snug line-clamp-2">{type.whyItMatters}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="inline-flex items-center rounded-md bg-emerald-50 text-emerald-900/90 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                Training
              </span>
              <span className="inline-flex items-center rounded-md bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                Simulation
              </span>
              <span className="inline-flex items-center rounded-md bg-amber-50/90 text-amber-900/80 border border-amber-200/70 px-2 py-0.5 text-[10px] font-medium">
                Progress soon
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
