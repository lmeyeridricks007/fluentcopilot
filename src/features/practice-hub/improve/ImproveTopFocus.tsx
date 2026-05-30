'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, Crosshair } from 'lucide-react'
import type { PracticeHubViewModel } from '../types'
import { practiceHubHrefsDiffer } from '../practiceHubHrefUtils'
import { trackWeakAreaShownOnce } from '../weakAreaShownAnalytics'
import { ImproveSectionIntro } from './ImproveSectionIntro'
import { IMPROVE_CTA } from './improveCtas'
import { improveWeakDrillHref } from './improveWeakDrillRoutes'

/** Single lead coaching block — always visible, no nested list. */
export function ImproveTopFocus({ vm }: { vm: PracticeHubViewModel }) {
  const primary = vm.weakAreas[0]
  const coach = vm.weaknessCoachHint
  const topWeakId = primary?.id
  const topWeakLabel = primary?.label
  const topWeakHref = primary?.href
  const topWeakActionCount = primary?.actions?.length

  useEffect(() => {
    const p = vm.weakAreas[0]
    if (!p) return
    trackWeakAreaShownOnce({
      weak_area_id: p.id,
      weak_area_label: p.label,
      surface: 'improve_top_focus',
      action_count: p.actions?.length ?? (p.href ? 1 : 0),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally read `vm.weakAreas[0]` inside; deps are stable primitives from that row
  }, [topWeakActionCount, topWeakHref, topWeakId, topWeakLabel])

  if (!primary && !coach) {
    return (
      <section aria-labelledby="improve-top-focus-heading" className="space-y-3">
        <ImproveSectionIntro
          id="improve-top-focus-heading"
          title="Top focus"
          kicker="When something’s flagged, your fastest repair path shows up here."
        />
        <div className="rounded-3xl border border-dashed border-slate-200/90 bg-white/60 px-4 py-5 text-center shadow-[0_6px_24px_-12px_rgba(15,23,42,0.06)]">
          <p className="text-[14px] leading-relaxed text-slate-600">
            Nothing urgent flagged yet — keep a short Talk rep going or add captures in Library.
          </p>
          <Link
            href="/app/library"
            className="mt-4 inline-flex items-center justify-center gap-1 rounded-xl bg-[#7c3aed] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-[#0d5eb0]"
          >
            Open Library
            <ChevronRight className="h-4 w-4 opacity-90" aria-hidden />
          </Link>
        </div>
      </section>
    )
  }

  const headline = primary?.headline ?? primary?.label ?? coach?.headline ?? ''
  const why = primary?.whyItMatters ?? coach?.subline ?? ''
  const mainHref = primary?.href ?? coach?.href ?? '/app/talk'
  const coachExtra =
    coach && primary && practiceHubHrefsDiffer(coach.href, primary.href) ? coach : null

  return (
      <section aria-labelledby="improve-top-focus-heading" className="space-y-3">
        <ImproveSectionIntro
          id="improve-top-focus-heading"
          title="Top focus"
          kicker="Short reps on the slips that cost you — then your best next fix: real context, Coach remembers why."
        />
      <div className="rounded-3xl border border-slate-200/70 bg-white/85 p-4 shadow-[0_6px_24px_-12px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/[0.02] backdrop-blur-sm sm:p-5">
        <div className="flex flex-row items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF]/90 text-[#7c3aed] ring-1 ring-[#BFDBFE]/50">
            <Crosshair className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-snug text-slate-900">{headline}</p>
            {why ? (
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600 line-clamp-3">{why}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          <Link
            href={mainHref}
            className="inline-flex min-h-touch flex-1 items-center justify-center rounded-2xl bg-[#7c3aed] px-4 py-2.5 text-center text-[14px] font-semibold text-white shadow-sm hover:bg-[#0d5eb0] sm:flex-none"
          >
            {IMPROVE_CTA.practiceNow}
          </Link>
          <Link
            href="/app/review/mistakes"
            className="inline-flex min-h-touch flex-1 items-center justify-center rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 text-center text-[14px] font-semibold text-slate-800 hover:bg-slate-50/90 sm:flex-none"
          >
            {IMPROVE_CTA.reviewMistakes}
          </Link>
        </div>
        {primary ? (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <Link
              href={improveWeakDrillHref(primary.id)}
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#7c3aed] hover:underline"
            >
              {IMPROVE_CTA.moreDetail}
              <ChevronRight className="h-4 w-4 opacity-70" aria-hidden />
            </Link>
          </div>
        ) : null}
        {coachExtra ? (
          <p className="mt-3 border-t border-slate-100 pt-3 text-[12px] leading-snug text-slate-600">
            <span className="font-semibold text-slate-800">Also try: </span>
            {coachExtra.subline}{' '}
            <Link href={coachExtra.href} className="font-semibold text-[#7c3aed] hover:underline">
              {IMPROVE_CTA.practiceNow}
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  )
}
