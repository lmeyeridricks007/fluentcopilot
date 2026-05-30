'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { listSkillTrackDefinitions } from '@/lib/skill-tracks'
import { loadSkillTrackProgress } from '@/lib/skill-tracks/skillTrackProgressStorage'
import { SkillTrackProgressBar } from '@/features/skill-tracks/components/SkillTrackProgressBar'

export function SkillTracksHubPage() {
  const tracks = listSkillTrackDefinitions()

  useEffect(() => {
    track(ANALYTICS_EVENTS.skill_tracks_hub_viewed, {})
  }, [])

  return (
    <div className="px-4 py-6 pb-28 max-w-lg mx-auto w-full space-y-6">
      <header className="flex items-center gap-2">
        <Link
          href="/app/practice"
          className="min-h-touch min-w-touch inline-flex items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-muted -ml-2"
          aria-label="Back to practice"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden />
        </Link>
        <div>
          <h1 className="text-title font-bold text-ink-primary tracking-tight">Skill tracks</h1>
          <p className="text-body-sm text-ink-secondary mt-0.5">
            3–5 minute focus — one skill at a time, not a full scenario.
          </p>
        </div>
      </header>

      <div className="space-y-2">
        {tracks.map((t) => {
          const prog = loadSkillTrackProgress(t.id)
          return (
            <Link
              key={t.id}
              href={`/app/practice/tracks/${encodeURIComponent(t.id)}`}
              className="block min-h-touch"
              onClick={() =>
                track(ANALYTICS_EVENTS.skill_track_detail_viewed, { trackId: t.id, from: 'hub' })
              }
            >
              <Card
                variant="outlined"
                padding="sm"
                className="border-slate-200/90 hover:border-primary-200 hover:bg-primary-50/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl w-11 text-center shrink-0" aria-hidden>
                    {t.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-semibold text-ink-primary">{t.title}</p>
                    <p className="text-caption text-ink-secondary mt-0.5 line-clamp-2">{t.purpose}</p>
                    <div className="mt-2 pr-6">
                      <SkillTrackProgressBar
                        unlockedLevelIndex={prog.unlockedLevelIndex}
                        currentLevelIndex={Math.min(prog.unlockedLevelIndex, 3)}
                      />
                    </div>
                    <p className="text-caption text-ink-tertiary mt-1">
                      ~{t.estimatedMinutesPerSession} min · {prog.sessionsCompleted} session
                      {prog.sessionsCompleted === 1 ? '' : 's'}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-ink-tertiary shrink-0" aria-hidden />
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
