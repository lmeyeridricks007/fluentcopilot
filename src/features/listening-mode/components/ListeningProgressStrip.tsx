'use client'

import { TrendingUp } from 'lucide-react'
import type { ListeningProgressSummary } from '@/lib/listening-mode/listeningProgressSummary'

type Props = {
  summary: ListeningProgressSummary
}

function formatWhen(iso: string | null): string | null {
  if (!iso) return null
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return null
  }
}

export function ListeningProgressStrip({ summary }: Props) {
  const when = formatWhen(summary.lastSessionWhen)
  const pct =
    summary.lastSessionCorrectRatio != null
      ? Math.round(summary.lastSessionCorrectRatio * 100)
      : null

  return (
    <section aria-label="Listening progress" className="rounded-xl border border-slate-200/80 bg-surface-muted/60 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 text-caption text-ink-secondary">
        <TrendingUp className="h-4 w-4 text-primary-600" aria-hidden />
        <span className="font-semibold text-ink-primary">Progress</span>
        <span className="text-ink-tertiary">·</span>
        <span>
          {summary.sessionsCompleted === 0
            ? 'No sessions yet — your first burst only takes a couple of minutes.'
            : `${summary.sessionsCompleted} listening session${summary.sessionsCompleted === 1 ? '' : 's'} so far`}
        </span>
        {pct != null && when ? (
          <>
            <span className="text-ink-tertiary">·</span>
            <span>
              Last run ({when}): <span className="tabular-nums font-medium text-ink-primary">{pct}%</span> items clean
            </span>
          </>
        ) : null}
      </div>
    </section>
  )
}
