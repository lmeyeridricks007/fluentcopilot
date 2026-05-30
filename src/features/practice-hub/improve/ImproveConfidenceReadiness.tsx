'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, CircleDot } from 'lucide-react'
import type { ReadinessEvaluation } from '@/lib/post-a2/types'
import type { ConfidenceTrendSummaryVm } from '@/lib/dashboard/confidenceTrendSummary'
import type { ConfidenceSectionVm } from '../types'
import { ImproveSectionIntro } from './ImproveSectionIntro'
import { IMPROVE_CTA } from './improveCtas'

type Props = {
  readiness: ReadinessEvaluation
  readinessDetailsHref: string
  readinessDetailsLabel: string
  insightLocked: boolean
  confidenceTrend: ConfidenceTrendSummaryVm
  section: ConfidenceSectionVm
}

function InsightBlock({
  label,
  title,
  body,
  tone = 'neutral',
}: {
  label: string
  /** When omitted, only the label + body are shown (e.g. A2 mastery band). */
  title?: string | null
  body: ReactNode
  tone?: 'neutral' | 'trend' | 'mastery'
}) {
  const shell =
    tone === 'trend'
      ? 'bg-gradient-to-br from-[#F8FAFF] via-white to-white'
      : tone === 'mastery'
        ? 'bg-gradient-to-br from-slate-50/95 via-white to-white'
        : 'bg-gradient-to-br from-slate-50/90 via-white to-white'

  return (
    <div className={`px-5 py-5 sm:px-6 sm:py-5 ${shell}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      {title ? (
        <p className="mt-2 text-[16px] font-semibold leading-snug tracking-tight text-slate-900">{title}</p>
      ) : null}
      <div className={`max-w-prose text-[13px] leading-relaxed text-slate-600 ${title ? 'mt-2' : 'mt-1.5'}`}>{body}</div>
    </div>
  )
}

const footerLinkClass =
  'group inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-[#0B5EA9] transition-[background-color,color] hover:bg-[#EFF6FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c3aed]'

/** Coaching snapshot: scan-first layout with clear bands and calmer “still building” cues. */
export function ImproveConfidenceReadiness({
  readiness,
  readinessDetailsHref,
  readinessDetailsLabel,
  insightLocked,
  confidenceTrend,
  section,
}: Props) {
  const strengths = section.strengths.slice(0, 2)
  const gaps = section.gaps.slice(0, 2)

  return (
    <section className="space-y-5" aria-label="Confidence and readiness">
      <ImproveSectionIntro
        title="Confidence & readiness"
        kicker="Where you are — not a verdict."
      />
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_48px_-28px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/[0.035]">
        <div className="divide-y divide-slate-100">
          <InsightBlock
            label="B1 readiness"
            title={readiness.headline}
            body={
              insightLocked ? (
                <p className="text-slate-600">
                  Deeper breakdown is on Premium — you still get this headline on Basic.
                </p>
              ) : (
                <p className="line-clamp-4">{readiness.reasonLine}</p>
              )
            }
          />
          <InsightBlock
            label="Confidence trend"
            title={confidenceTrend.headline}
            body={<p className="line-clamp-3">{confidenceTrend.body}</p>}
            tone="trend"
          />
          <InsightBlock
            label={section.headline}
            body={
              section.subline ? <p className="line-clamp-4">{section.subline}</p> : <span className="text-slate-500">—</span>
            }
            tone="mastery"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 bg-slate-50/35 p-4 sm:grid-cols-2 sm:gap-4 sm:p-5">
          <div className="rounded-xl border border-emerald-100/80 bg-white/90 px-4 py-3.5 shadow-sm shadow-emerald-900/[0.03] ring-1 ring-emerald-900/[0.04]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/90">Strong</p>
            <ul className="mt-2.5 space-y-2.5">
              {strengths.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-slate-800">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden strokeWidth={2.25} />
                  </span>
                  <span className="pt-0.5">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white/90 px-4 py-3.5 shadow-sm ring-1 ring-slate-900/[0.03]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Still building</p>
            <ul className="mt-2.5 space-y-2.5">
              {gaps.map((g, i) => (
                <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-slate-600">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <CircleDot className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
                  </span>
                  <span className="pt-0.5">{g.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="flex flex-wrap gap-x-1 gap-y-1 border-t border-slate-100 bg-white px-3 py-2.5 sm:px-4 sm:py-3">
          <Link href={readinessDetailsHref} className={footerLinkClass}>
            <span>{readinessDetailsLabel}</span>
            <ArrowRight className="h-3.5 w-3.5 opacity-70 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <Link href={section.ctaHref} className={footerLinkClass}>
            <span>{IMPROVE_CTA.howReadinessWorks}</span>
            <ArrowRight className="h-3.5 w-3.5 opacity-70 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <Link href="/app/progress#mastery-map" className={footerLinkClass}>
            <span>{IMPROVE_CTA.seeAbilityMap}</span>
            <ArrowRight className="h-3.5 w-3.5 opacity-70 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </footer>
      </div>
    </section>
  )
}
