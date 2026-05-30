'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Target, Flame } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { isExamPrepMissionTemplateId } from '@/lib/missions/examPrepMissionHelpers'
import type { DailyMissionVm } from '../types'
import { NEXT_BEST_CTA } from '@/lib/dashboard/nextBestActionCtas'

export function DailyMissionCard({
  mission,
  compact = false,
}: {
  mission: DailyMissionVm
  /** Lighter card for Improve “stretch” — less vertical weight. */
  compact?: boolean
}) {
  const pct = Math.min(100, (mission.progressCurrent / mission.progressTarget) * 100)
  const viewedRef = useRef(false)

  useEffect(() => {
    if (viewedRef.current) return
    viewedRef.current = true
    track(ANALYTICS_EVENTS.mission_viewed, {
      missionId: mission.id,
      scope: mission.scopeLabel ?? 'Today',
      completed: Boolean(mission.completed),
    })
  }, [mission.id, mission.scopeLabel, mission.completed])

  const eyebrow = mission.scopeLabel ?? 'Today'

  const pad = compact ? 'sm' : 'md'
  const iconBox = compact ? 'w-9 h-9 rounded-lg' : 'w-11 h-11 rounded-xl'
  const iconSz = compact ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <Card
      variant="outlined"
      padding={pad}
      className={compact ? 'border-slate-200/70 bg-surface-muted/20' : 'border-slate-200/90 bg-surface-elevated'}
    >
      <div className="flex items-start gap-3">
        <div
          className={`${iconBox} bg-warning/15 flex items-center justify-center shrink-0`}
        >
          <Target className={`${iconSz} text-warning`} aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-caption font-semibold text-ink-secondary uppercase tracking-wide">{eyebrow}</p>
          <p
            className={
              compact
                ? 'text-body-sm font-semibold text-ink-primary mt-0.5'
                : 'text-body font-semibold text-ink-primary mt-0.5'
            }
          >
            {mission.title}
          </p>
          <p className="text-body-sm text-ink-secondary mt-1 line-clamp-2">{mission.description}</p>
          {!compact && mission.rationale ? (
            <p className="text-caption text-primary-800/90 mt-2 leading-snug border-l-2 border-primary-200 pl-2">
              <span className="font-medium">Why this fits you: </span>
              {mission.rationale}
            </p>
          ) : null}
          <ProgressBar value={pct} max={100} className={compact ? 'mt-2 h-1.5' : 'mt-3 h-2'} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-caption text-ink-secondary">
            <span className="inline-flex items-center gap-1 font-medium text-ink-primary">
              <Flame className="w-3.5 h-3.5 text-warning" aria-hidden />
              +{mission.xpReward} XP
            </span>
            {!compact && mission.countsForStreak ? <span>Counts toward streak when completed</span> : null}
          </div>
        </div>
      </div>
      {mission.completed ? (
        <div className="mt-4 space-y-2">
          <p className="text-caption text-center text-emerald-800/90 font-medium">Goal completed — nice work.</p>
          <Link
            href={mission.href}
            onClick={() =>
              track(ANALYTICS_EVENTS.mission_replay_clicked, {
                missionId: mission.id,
                scope: eyebrow,
                href: mission.href,
              })
            }
            className="flex w-full min-h-touch items-center justify-center rounded-lg border border-primary-200 bg-primary-50/80 px-4 py-2.5 text-body font-semibold text-primary-800 hover:bg-primary-100/90 transition-colors"
          >
            Practice again
          </Link>
          <p className="text-caption text-center text-ink-tertiary leading-snug">
            Extra reps won’t change today’s XP, but they still build skill.
          </p>
        </div>
      ) : (
        <Link
          href={mission.href}
          onClick={() => {
            track(ANALYTICS_EVENTS.mission_started, {
              missionId: mission.id,
              scope: eyebrow,
              href: mission.href,
            })
            if (isExamPrepMissionTemplateId(mission.id)) {
              track(ANALYTICS_EVENTS.exam_mission_started, {
                templateId: mission.id,
                scope: eyebrow,
                href: mission.href,
              })
            }
          }}
          className={
            compact
              ? 'mt-3 flex w-full min-h-touch items-center justify-center rounded-lg border border-slate-200/80 bg-surface-elevated px-3 py-2 text-body-sm font-semibold text-ink-primary hover:bg-surface-muted/60 transition-colors'
              : 'mt-4 flex w-full min-h-touch items-center justify-center rounded-lg border border-slate-200 bg-surface-muted px-4 py-2.5 text-body font-medium text-ink-primary hover:bg-slate-100 transition-colors'
          }
        >
          {compact ? NEXT_BEST_CTA.practiceNow : mission.ctaLabel}
        </Link>
      )}
    </Card>
  )
}
