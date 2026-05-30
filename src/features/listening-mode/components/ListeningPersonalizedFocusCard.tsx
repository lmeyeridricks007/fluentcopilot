'use client'

import Link from 'next/link'
import { ArrowRight, ChevronDown, Headphones, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { ListeningLevel } from '@/lib/listening-mode/schema'
import type { ListeningPersonalizedFocus } from '@/lib/listening-mode/listeningPersonalizedFocus'
import { listeningModeReportHref, listeningModeSessionHref } from '@/lib/routing/appRoutes'

type Props = {
  level: ListeningLevel
  focus: ListeningPersonalizedFocus
}

export function ListeningPersonalizedFocusCard({ level, focus }: Props) {
  const reviewHref = focus.lastSessionId ? listeningModeReportHref(focus.lastSessionId) : null
  return (
    <Card
      variant="outlined"
      padding="lg"
      className="relative overflow-hidden border-violet-200/80 bg-gradient-to-br from-violet-50/50 via-surface-elevated to-white shadow-sm"
    >
      <div className="pointer-events-none absolute -right-6 top-0 h-28 w-28 rounded-full bg-violet-400/10 blur-2xl" aria-hidden />
      <div className="relative flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-900 ring-1 ring-violet-200/80">
          <Headphones className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-900/80">Your listening focus</p>
          <p className="mt-2 text-[1.05rem] font-semibold leading-snug text-ink-primary sm:text-lg">{focus.headline}</p>
          <p className="mt-2 text-body-sm leading-relaxed text-ink-secondary">{focus.supportingLine}</p>
        </div>
      </div>
      <div className="relative mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          href={listeningModeSessionHref({ packId: focus.primaryPackId, level })}
          className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-body font-semibold text-white shadow-md shadow-primary-900/12 transition hover:bg-primary-700 sm:w-auto sm:min-w-[10rem]"
        >
          Practice now
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        {reviewHref ? (
          <Link
            href={reviewHref}
            className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-lg border border-slate-200/90 bg-surface-muted px-4 py-2.5 text-body font-semibold text-ink-primary transition hover:bg-slate-200/80 sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Review mistakes
          </Link>
        ) : (
          <span className="inline-flex min-h-touch w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-200/60 bg-surface-muted/50 px-4 py-2.5 text-body font-semibold text-ink-tertiary opacity-60 sm:w-auto">
            <RotateCcw className="h-4 w-4" aria-hidden />
            Review mistakes
          </span>
        )}
        <a
          href="#listening-skill-focus"
          className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-body font-semibold text-ink-primary transition hover:bg-surface-muted sm:w-auto"
        >
          <ChevronDown className="h-4 w-4" aria-hidden />
          More detail
        </a>
      </div>
      {!reviewHref ? (
        <p className="relative mt-2 text-[11px] text-ink-tertiary">Finish a session to unlock a one-tap recap of slips.</p>
      ) : null}
    </Card>
  )
}
