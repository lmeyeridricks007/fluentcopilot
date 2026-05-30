'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Lock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { getSkillTrackDefinition } from '@/lib/skill-tracks'
import { loadSkillTrackProgress } from '@/lib/skill-tracks/skillTrackProgressStorage'
import { SkillTrackLevelBadge } from '@/features/skill-tracks/components/SkillTrackLevelBadge'
import { SkillTrackProgressBar } from '@/features/skill-tracks/components/SkillTrackProgressBar'
import { Button } from '@/components/ui/Button'
import { useEntitlement, PaywallModal } from '@/features/entitlements'
import { useState } from 'react'

export function SkillTrackDetailPage({ trackId }: { trackId: string }) {
  const def = useMemo(() => getSkillTrackDefinition(trackId), [trackId])
  const prog = useMemo(() => (def ? loadSkillTrackProgress(def.id) : null), [def])
  const { tier } = useEntitlement()
  const [paywallOpen, setPaywallOpen] = useState(false)
  const searchParams = useSearchParams()
  const highlightLevel = searchParams.get('level')

  useEffect(() => {
    if (def) track(ANALYTICS_EVENTS.skill_track_detail_viewed, { trackId: def.id })
  }, [def])

  if (!def) {
    return (
      <div className="px-4 py-10 text-center text-body-sm text-ink-secondary max-w-lg mx-auto">
        Unknown track.{' '}
        <Link href="/app/practice/tracks" className="text-primary-600 font-medium">
          Back
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-28 max-w-lg mx-auto w-full space-y-5">
      <header className="flex items-start gap-2">
        <Link
          href="/app/practice/tracks"
          className="min-h-touch min-w-touch inline-flex items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-muted -ml-2 shrink-0"
          aria-label="All skill tracks"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden />
        </Link>
        <div className="min-w-0">
          <span className="text-3xl" aria-hidden>
            {def.icon}
          </span>
          <h1 className="text-title font-bold text-ink-primary tracking-tight mt-1">{def.title}</h1>
          <p className="text-body-sm text-ink-secondary mt-2 leading-relaxed">{def.purpose}</p>
        </div>
      </header>

      <Card variant="flat" padding="sm" className="border border-slate-200/90">
        <p className="text-caption text-ink-secondary">
          Typical session · ~{def.estimatedMinutesPerSession} min · {def.levels[0]?.exercises.length ?? 0} quick
          steps per level
        </p>
        <div className="mt-3">
          <SkillTrackProgressBar
            unlockedLevelIndex={prog?.unlockedLevelIndex ?? 0}
            currentLevelIndex={
              highlightLevel !== null ? Math.min(3, Math.max(0, Number(highlightLevel))) : prog?.unlockedLevelIndex ?? 0
            }
          />
        </div>
      </Card>

      <section aria-label="Levels">
        <h2 className="text-body-sm font-semibold text-ink-primary mb-2">Levels</h2>
        <ul className="space-y-2">
          {def.levels.map((lev) => {
            const locked = lev.index > (prog?.unlockedLevelIndex ?? 0)
            const premiumLock = Boolean(lev.premiumLocked && tier === 'free')
            const canStart = !locked && !premiumLock

            return (
              <li key={lev.index}>
                <Card
                  variant="outlined"
                  padding="sm"
                  className={`border-slate-200/90 ${locked ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <SkillTrackLevelBadge label={lev.label} index={lev.index} />
                      <p className="text-body-sm font-medium text-ink-primary mt-1">{lev.title}</p>
                      <p className="text-caption text-ink-secondary mt-0.5">{lev.summary}</p>
                      {prog?.bestScoreByLevel[lev.index] != null ? (
                        <p className="text-caption text-primary-700 mt-1">
                          Best run · {Math.round((prog.bestScoreByLevel[lev.index] ?? 0) * 100)}%
                        </p>
                      ) : null}
                    </div>
                    {premiumLock ? (
                      <span className="text-caption text-amber-800 flex items-center gap-0.5 shrink-0">
                        <Lock className="w-3.5 h-3.5" aria-hidden />
                        Plus
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    {canStart ? (
                      <Link
                        href={`/app/practice/tracks/${encodeURIComponent(def.id)}/session?level=${lev.index}`}
                        className="inline-flex w-full justify-center items-center min-h-touch px-3 py-2 rounded-lg text-body-sm font-medium bg-primary-600 text-white hover:bg-primary-700"
                      >
                        Start level
                      </Link>
                    ) : locked ? (
                      <p className="text-caption text-ink-tertiary">Complete the previous level to unlock.</p>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        fullWidth
                        variant="secondary"
                        onClick={() => setPaywallOpen(true)}
                      >
                        Unlock with Premium
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      </section>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} reason="premium_feature" />
    </div>
  )
}
