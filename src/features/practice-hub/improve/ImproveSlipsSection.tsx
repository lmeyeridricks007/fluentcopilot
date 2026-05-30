'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Target } from 'lucide-react'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { trackWeakAreaShownOnce } from '../weakAreaShownAnalytics'
import type { WeakAreaVm } from '../types'
import { ImproveSectionIntro } from './ImproveSectionIntro'
import { IMPROVE_CTA } from './improveCtas'
import { improveWeakDrillHref } from './improveWeakDrillRoutes'

function SlipRow({ area }: { area: WeakAreaVm }) {
  useEffect(() => {
    trackWeakAreaShownOnce({
      weak_area_id: area.id,
      weak_area_label: area.label,
      surface: 'improve_slips_row',
      action_count: area.actions?.length ?? (area.href ? 1 : 0),
    })
  }, [area.actions?.length, area.href, area.id, area.label])

  return (
    <div className="flex min-h-touch flex-row items-start gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-slate-50/90">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50/90 text-amber-800 ring-1 ring-amber-100/80">
        <Target className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-snug text-slate-900">{area.headline ?? area.label}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-slate-600 line-clamp-2">{area.whyItMatters}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={area.href}
            onClick={() =>
              track(ANALYTICS_EVENTS.weak_area_practice_started, {
                weak_area_id: area.id,
                href: area.href,
                surface: 'improve_slips_row',
              })
            }
            className="inline-flex min-h-touch items-center justify-center rounded-xl bg-[#7c3aed] px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-[#0d5eb0]"
          >
            {IMPROVE_CTA.practiceNow}
          </Link>
          <Link
            href={improveWeakDrillHref(area.id)}
            className="inline-flex min-h-touch items-center justify-center rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-800 hover:bg-slate-50/90"
          >
            {IMPROVE_CTA.moreDetail}
          </Link>
        </div>
      </div>
    </div>
  )
}

/** Next repair rows after Top focus — flat list, max 2. */
export function ImproveSlipsSection({ areas }: { areas: WeakAreaVm[] }) {
  const next = areas.slice(1, 3)

  return (
    <section className="space-y-3" aria-label="Turn slips into strength">
      <ImproveSectionIntro
        title="Turn slips into strength"
        kicker="Short, targeted reps — not a grade."
      />
      {next.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200/80 bg-white/50 px-4 py-4 text-[13px] leading-relaxed text-slate-600">
          {areas.length <= 1
            ? 'Your main focus is above. More suggestions appear when additional patterns show up.'
            : 'Keep chipping away at the focus above — you’re on the right track.'}
        </p>
      ) : (
        <div className="rounded-3xl border border-slate-200/70 bg-white/85 p-2 shadow-[0_6px_24px_-12px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/[0.02] backdrop-blur-sm">
          <div className="flex flex-col gap-0.5">{next.map((w) => <SlipRow key={w.id} area={w} />)}</div>
        </div>
      )}
    </section>
  )
}
