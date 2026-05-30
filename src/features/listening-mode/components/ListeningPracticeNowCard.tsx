'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { ListeningLevel } from '@/lib/listening-mode/schema'
import type { ListeningRecCard } from '@/lib/listening-mode/listeningRecommendations'
import { listeningModeSessionHref } from '@/lib/routing/appRoutes'
import { estimatePackDurationMinutes } from '@/lib/listening-mode/catalog'

type Props = {
  level: ListeningLevel
  rec: ListeningRecCard | null
}

export function ListeningPracticeNowCard({ level, rec }: Props) {
  if (!rec) return null
  const mins = estimatePackDurationMinutes(rec.packId)
  return (
    <section aria-label="Practice now" className="scroll-mt-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary-600" aria-hidden />
        <h2 className="text-caption font-bold uppercase tracking-[0.14em] text-ink-secondary">Practice now</h2>
      </div>
      <Card variant="elevated" padding="lg" className="border border-primary-100/80 bg-gradient-to-br from-primary-50/40 via-surface-elevated to-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-800/80">Personal pick</p>
        <h3 className="mt-2 text-title font-semibold text-ink-primary">{rec.title}</h3>
        <p className="mt-1 text-body-sm text-ink-secondary">{rec.subtitle}</p>
        <p className="mt-3 text-body-sm leading-relaxed text-ink-secondary/95">{rec.reason}</p>
        <p className="mt-2 text-caption text-ink-tertiary tabular-nums">About {mins} min</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href={listeningModeSessionHref({ packId: rec.packId, level })}
            className="inline-flex min-h-touch w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-body font-semibold text-white shadow-md shadow-primary-900/12 transition hover:bg-primary-700 sm:w-auto sm:min-w-[9.5rem]"
          >
            Start
          </Link>
        </div>
      </Card>
    </section>
  )
}
