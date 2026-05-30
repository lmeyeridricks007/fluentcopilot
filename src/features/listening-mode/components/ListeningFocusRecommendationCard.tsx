'use client'

import Link from 'next/link'
import { ArrowRight, ChevronDown, Headphones, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { ListeningLevel } from '@/lib/listening-mode/schema'
import type { ListeningFocusRecommendationCard as FocusCardModel } from '@/lib/listening-mode/listeningPersonalizedRecommendations'
import { listeningModeReportHref, listeningModeSessionHref } from '@/lib/routing/appRoutes'

type Props = {
  card: FocusCardModel
  level: ListeningLevel
  lastSessionId: string | null
  variant?: 'hero' | 'compact'
}

export function ListeningFocusRecommendCard({ card, level, lastSessionId, variant = 'compact' }: Props) {
  const reviewHref = lastSessionId ? listeningModeReportHref(lastSessionId) : null
  const isHero = variant === 'hero'

  return (
    <Card
      variant="outlined"
      padding="lg"
      className={
        isHero
          ? 'relative overflow-hidden border-violet-200/80 bg-gradient-to-br from-violet-50/50 via-surface-elevated to-white shadow-sm'
          : 'border-slate-200/85 bg-surface-elevated/90 shadow-sm'
      }
    >
      {isHero ? (
        <div
          className="pointer-events-none absolute -right-6 top-0 h-28 w-28 rounded-full bg-violet-400/10 blur-2xl"
          aria-hidden
        />
      ) : null}
      <div className={`relative flex items-start gap-3 ${isHero ? '' : ''}`}>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${
            isHero ? 'bg-violet-100 text-violet-900 ring-violet-200/80' : 'bg-teal-50 text-teal-900 ring-teal-200/70'
          }`}
        >
          <Headphones className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`text-[11px] font-bold uppercase tracking-[0.14em] ${
              isHero ? 'text-violet-900/80' : 'text-teal-900/75'
            }`}
          >
            {isHero ? 'Top pick for you' : 'Also matches your ear'}
          </p>
          <p className="mt-2 text-[1.05rem] font-semibold leading-snug text-ink-primary sm:text-lg">{card.title}</p>
          <p className="mt-2 text-body-sm leading-relaxed text-ink-secondary">{card.explanation}</p>
        </div>
      </div>
      <div className="relative mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          href={listeningModeSessionHref({ packId: card.packId, level })}
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
          href={card.detailHref}
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
