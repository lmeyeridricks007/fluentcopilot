import Link from 'next/link'
import { CheckCircle2, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { SkillTrackLevelLabel } from '@/lib/schemas/practice/skillTrack.schema'

const LEVEL_WORD: Record<SkillTrackLevelLabel, string> = {
  beginner: 'Beginner',
  building: 'Building',
  strong: 'Strong',
  confident: 'Confident',
}

export function SkillTrackCompletionSummary({
  trackTitle,
  trackId,
  levelLabel,
  levelIndex,
  scorePercent,
  passedLevel,
  xpGained,
  correctCount,
  totalCount,
}: {
  trackTitle: string
  trackId: string
  levelLabel: SkillTrackLevelLabel
  levelIndex: number
  scorePercent: number
  passedLevel: boolean
  xpGained: number
  correctCount: number
  totalCount: number
}) {
  return (
    <div className="space-y-4 pb-8">
      <Card variant="flat" padding="md" className="border border-primary-100 bg-primary-50/25">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-8 h-8 text-primary-600 shrink-0" aria-hidden />
          <div>
            <p className="text-caption font-semibold text-primary-800">Session complete</p>
            <h2 className="text-title font-bold text-ink-primary mt-0.5">{trackTitle}</h2>
            <p className="text-body-sm text-ink-secondary mt-1">
              {LEVEL_WORD[levelLabel]} · Level {levelIndex + 1}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-body-sm">
          <TrendingUp className="w-4 h-4 text-primary-600" aria-hidden />
          <span className="font-semibold text-ink-primary">{scorePercent}%</span>
          <span className="text-ink-secondary">
            — {correctCount}/{totalCount} steps strong
            {passedLevel ? ' · Level threshold met' : ' · Keep this level for another quick rep'}
          </span>
        </div>
        {xpGained > 0 ? (
          <p className="text-caption font-medium text-primary-800 mt-2">+{xpGained} XP · counts toward today’s practice</p>
        ) : null}
      </Card>

      <Card variant="flat" padding="md" className="border border-slate-200">
        <p className="text-body-sm text-ink-secondary leading-relaxed">
          {passedLevel
            ? 'Nice — you’re ready for the next band when you want a bit more challenge.'
            : 'Short sessions add up. One more run here often clears the bar.'}
        </p>
      </Card>

      <Link
        href={`/app/practice/tracks/${encodeURIComponent(trackId)}`}
        className="inline-flex w-full justify-center items-center min-h-touch px-4 py-2.5 rounded-xl font-medium text-body bg-primary-600 text-white hover:bg-primary-700"
      >
        Back to track
      </Link>
      <Link
        href="/app/practice/tracks"
        className="block text-center text-caption font-medium text-primary-600 py-2"
      >
        All skill tracks
      </Link>
      <Link href="/app/practice" className="block text-center text-caption text-ink-tertiary">
        Practice hub
      </Link>
    </div>
  )
}
