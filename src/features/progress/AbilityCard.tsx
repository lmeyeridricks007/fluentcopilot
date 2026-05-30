import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { AbilityCardVm } from '@/lib/mastery/masteryPresenterModel'
import { clsx } from 'clsx'

function bandStyles(band: AbilityCardVm['band']): string {
  if (band === 'strong') return 'bg-emerald-50 text-emerald-900 border-emerald-200'
  if (band === 'improving') return 'bg-amber-50 text-amber-900 border-amber-200'
  return 'bg-slate-50 text-ink-primary border-slate-200'
}

export function AbilityCard({ ability }: { ability: AbilityCardVm }) {
  return (
    <Card variant="outlined" padding="sm" className="border-slate-200/90 h-full">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={clsx(
                'text-caption font-semibold px-2 py-0.5 rounded-md border',
                bandStyles(ability.band)
              )}
            >
              {ability.bandLabel}
            </span>
            <span className="text-caption text-ink-tertiary">{ability.trendLabel}</span>
          </div>
          <h3 className="text-body-sm font-semibold text-ink-primary mt-2 leading-snug">{ability.title}</h3>
          <p className="text-caption text-ink-secondary mt-1 leading-snug line-clamp-2">{ability.description}</p>
          {ability.weaknessNote ? (
            <p className="text-caption text-primary-800 mt-2 leading-snug bg-primary-50/60 rounded-lg px-2 py-1.5 border border-primary-100">
              {ability.weaknessNote}
            </p>
          ) : null}
          {ability.lastPracticedLabel ? (
            <p className="text-caption text-ink-tertiary mt-2">{ability.lastPracticedLabel}</p>
          ) : null}
        </div>
        <Link
          href={`/app/progress/abilities/${encodeURIComponent(ability.id)}`}
          className="shrink-0 min-h-touch min-w-touch inline-flex items-center justify-center rounded-lg text-ink-tertiary hover:bg-surface-muted"
          aria-label={`Details for ${ability.title}`}
        >
          <ChevronRight className="w-5 h-5" aria-hidden />
        </Link>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
        <Link
          href={ability.nextPractice.href}
          className="flex items-center justify-between gap-2 text-body-sm font-medium text-primary-600 hover:underline"
        >
          <span className="min-w-0">{ability.nextPractice.label}</span>
          <ChevronRight className="w-4 h-4 shrink-0" aria-hidden />
        </Link>
        <p className="text-caption text-ink-secondary leading-snug">{ability.nextPractice.detail}</p>
        {ability.secondaryPractice ? (
          <Link
            href={ability.secondaryPractice.href}
            className="inline-block text-caption font-medium text-ink-secondary hover:text-primary-600"
          >
            {ability.secondaryPractice.label} →
          </Link>
        ) : null}
      </div>
    </Card>
  )
}
