'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { ListeningLevel } from '@/lib/listening-mode/schema'
import type { ListeningLandingTrack } from '@/lib/listening-mode/listeningLandingContent'
import { listeningTrackSetupHref } from '@/lib/routing/appRoutes'

type Props = {
  track: ListeningLandingTrack
  level: ListeningLevel
}

export function ListeningTrackCard({ track, level }: Props) {
  return (
    <Link
      href={listeningTrackSetupHref({ trackId: track.trackId, presetLevel: level })}
      className="group block min-h-touch rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
    >
      <Card
        variant="outlined"
        padding="md"
        className="h-full border-slate-200/90 transition-colors group-hover:border-primary-200/90 group-hover:bg-primary-50/20"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <span className="text-lg leading-none" aria-hidden>
                {track.visualEmoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body font-semibold text-ink-primary">{track.title}</p>
                <p className="mt-1 text-caption font-medium uppercase tracking-wide text-ink-tertiary">
                  {track.category}
                </p>
              </div>
            </div>
            <p className="mt-2 text-caption text-ink-secondary">{track.levelsLabel}</p>
            <p className="mt-2 text-body-sm leading-snug text-ink-secondary line-clamp-3">{track.reason}</p>
            {track.skillTags.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Skill focus">
                {track.skillTags.slice(0, 4).map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-secondary ring-1 ring-slate-200/70"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-tertiary">
              <span className="tabular-nums">{track.durationMin} min</span>
              <span className="font-semibold text-primary-700">Start</span>
            </div>
          </div>
          <ChevronRight
            className="mt-0.5 h-5 w-5 shrink-0 text-ink-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-primary-600"
            aria-hidden
          />
        </div>
      </Card>
    </Link>
  )
}
