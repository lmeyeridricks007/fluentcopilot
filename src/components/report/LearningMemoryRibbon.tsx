'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import type { ReportLearningMemoryRibbon, ReportMemorySurfaces } from '@/lib/api/apiTypes'
import { mergeReportSkillSurfaces, mergedSkillSurfacesHaveContent } from './mergeReportSkillSurfaces'

export type { ReportLearningMemoryRibbon, ReportMemorySurfaces }

/** @deprecated Use `ReportLearningMemoryRibbon` from apiTypes — alias kept for feature imports. */
export type LearningMemoryRibbonPayload = ReportLearningMemoryRibbon

export function learningMemoryRibbonHasContent(ribbon: ReportLearningMemoryRibbon): boolean {
  const merged = mergeReportSkillSurfaces(ribbon)
  return mergedSkillSurfacesHaveContent(ribbon, merged)
}

function surfaceRowKind(kicker: string): 'session' | 'tryNext' | 'default' {
  if (kicker.trim().toLowerCase() === 'this session') return 'session'
  if (/try next|suggested next/i.test(kicker)) return 'tryNext'
  return 'default'
}

function SurfaceRow({
  kicker,
  body,
  tone = 'neutral',
  rowKind,
}: {
  kicker: string
  body: string
  tone?: 'neutral' | 'growth'
  rowKind: 'session' | 'tryNext' | 'default'
}) {
  const shell =
    rowKind === 'session'
      ? 'rounded-xl border border-amber-300/55 bg-gradient-to-br from-amber-50/95 to-white px-3.5 py-3 shadow-sm ring-1 ring-amber-200/50'
      : rowKind === 'tryNext'
        ? 'rounded-xl border border-violet-300/50 bg-gradient-to-br from-violet-50/90 to-white px-3.5 py-3 shadow-sm ring-1 ring-violet-200/45'
        : tone === 'growth'
          ? 'rounded-xl border border-emerald-200/55 bg-emerald-50/40 px-3 py-2.5'
          : 'rounded-xl border border-slate-200/70 bg-slate-50/55 px-3 py-2.5'
  const kickerClass =
    rowKind === 'session'
      ? 'text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-950/75'
      : rowKind === 'tryNext'
        ? 'text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-900/80'
        : 'text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500'
  const bodyClass =
    rowKind === 'session'
      ? 'mt-1.5 text-[14px] font-medium leading-snug text-amber-950/95'
      : rowKind === 'tryNext'
        ? 'mt-1.5 text-[13px] leading-snug text-violet-950/95'
        : tone === 'growth'
          ? 'mt-1 text-[13px] leading-snug text-emerald-950/95'
          : 'mt-1 text-[13px] leading-snug text-slate-700'
  return (
    <div className={shell}>
      <p className={kickerClass}>{kicker}</p>
      <p className={bodyClass}>{body}</p>
    </div>
  )
}

export function LearningMemoryRibbon({ ribbon }: { ribbon: ReportLearningMemoryRibbon }) {
  const merged = useMemo(() => mergeReportSkillSurfaces(ribbon, 3), [ribbon])
  const hasBody = mergedSkillSurfacesHaveContent(ribbon, merged)
  if (!hasBody && !ribbon.confidenceNote?.trim()) return null

  const s: ReportMemorySurfaces | null | undefined = ribbon.surfaces
  const hasStructured = Boolean(s && (s.sessionEcho || s.currentFocus || s.recurringPattern || s.improving))
  const subline =
    ribbon.basedOnRecentSessions && !ribbon.coldStart
      ? 'Connected to your recent practice — not just today.'
      : hasStructured || (ribbon.skillInsights?.length ?? 0) > 0
        ? 'A quick read on how this fits your longer arc.'
        : null

  const next = ribbon.nextPractice
  const showNextCta = Boolean(next?.href?.trim() && next?.label?.trim())

  return (
    <section
      aria-label="Beyond this session"
      className="rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3.5 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.03]"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Beyond this session</p>
      {subline ? <p className="mt-1 text-[11px] font-medium leading-snug text-slate-400">{subline}</p> : null}

      {merged.length > 0 ? (
        <div className="mt-3 space-y-2.5">
          {merged.map((row) => (
            <SurfaceRow
              key={`${row.kicker}:${row.body}`}
              kicker={row.kicker}
              body={row.body}
              tone={row.tone}
              rowKind={surfaceRowKind(row.kicker)}
            />
          ))}
        </div>
      ) : null}

      {showNextCta ? (
        <Link
          href={next!.href}
          className="mt-4 inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-[14px] font-semibold text-white shadow-[0_14px_32px_-18px_rgba(79,70,229,0.55)] transition-transform hover:from-violet-500 hover:to-indigo-500 active:scale-[0.99]"
        >
          {next!.label}
          <ArrowRight className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
        </Link>
      ) : null}

      {ribbon.confidenceNote ? (
        <p className="mt-2.5 text-[11px] text-slate-500 leading-snug">{ribbon.confidenceNote}</p>
      ) : null}
    </section>
  )
}
