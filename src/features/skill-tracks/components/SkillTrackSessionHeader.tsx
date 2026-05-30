import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SkillTrackLevelBadge } from '@/features/skill-tracks/components/SkillTrackLevelBadge'
import { SkillTrackProgressBar } from '@/features/skill-tracks/components/SkillTrackProgressBar'
import type { SkillTrackLevel } from '@/lib/schemas/practice/skillTrack.schema'

export function SkillTrackSessionHeader({
  trackTitle,
  trackId,
  level,
  unlockedLevelIndex,
  exerciseIndex,
  exerciseTotal,
}: {
  trackTitle: string
  trackId: string
  level: SkillTrackLevel
  unlockedLevelIndex: number
  exerciseIndex: number
  exerciseTotal: number
}) {
  return (
    <header className="space-y-3 mb-4">
      <div className="flex items-center gap-2">
        <Link
          href={`/app/practice/tracks/${encodeURIComponent(trackId)}`}
          className="min-h-touch min-w-touch inline-flex items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-muted -ml-2"
          aria-label="Back to track"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-caption text-ink-secondary truncate">{trackTitle}</p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <SkillTrackLevelBadge label={level.label} index={level.index} compact />
            <span className="text-caption text-ink-tertiary">
              Step {exerciseIndex + 1}/{exerciseTotal}
            </span>
          </div>
        </div>
      </div>
      <SkillTrackProgressBar unlockedLevelIndex={unlockedLevelIndex} currentLevelIndex={level.index} />
    </header>
  )
}
