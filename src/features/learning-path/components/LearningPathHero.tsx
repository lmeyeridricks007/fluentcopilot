import Link from 'next/link'
import { Flame, Sparkles } from 'lucide-react'
import type { LearningPathHeroModel } from '../types'

export function LearningPathHero({
  hero,
  onContinue,
  continueDisabled,
}: {
  hero: LearningPathHeroModel
  onContinue: () => void
  continueDisabled?: boolean
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary-200/60 bg-gradient-to-br from-primary-600 via-primary-700 to-slate-900 px-4 py-5 sm:px-5 sm:py-6 text-white shadow-lg">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-primary-400/20 blur-2xl" aria-hidden />

      <div className="relative space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-caption font-semibold uppercase tracking-wider text-primary-100/90">
              {hero.cefrLevel} · {hero.courseTitle}
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold leading-tight">{hero.courseTitle}</h1>
            <p className="mt-2 text-body-sm text-primary-50/90 max-w-prose">
              Stage <span className="font-semibold text-white">{hero.currentStageBand}</span> —{' '}
              <span className="font-medium">{hero.currentStageTitle}</span>
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm border border-white/15">
            <p className="text-caption text-primary-100">Overall</p>
            <p className="text-xl font-bold tabular-nums">{hero.pathPercentComplete}%</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-caption font-medium border border-white/10">
            <Flame className="w-4 h-4 text-amber-300" aria-hidden />
            {hero.streak} day streak
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-caption border border-white/10">
            {hero.weeklyMinutes} min this week
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-caption border border-white/10">
            {hero.xp} XP
          </span>
        </div>

        <div className="rounded-xl bg-black/20 border border-white/10 px-3 py-3 sm:px-4">
          <p className="text-caption font-semibold text-primary-100 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" aria-hidden />
            You can now
          </p>
          <p className="mt-1 text-body-sm text-white/95 leading-snug line-clamp-3">{hero.youCanNowLine}</p>
        </div>

        {hero.continueLesson ? (
          /* Native button: shared Button applies variant=primary (text-white + blue bg) alongside our
             overrides; without tailwind-merge, conflicting utilities can resolve to white-on-white. */
          <button
            type="button"
            disabled={continueDisabled}
            onClick={onContinue}
            className="inline-flex w-full min-h-touch items-center justify-center rounded-lg px-6 py-3 text-center text-body-lg font-semibold leading-snug text-primary-800 bg-white shadow-md transition-colors hover:bg-primary-50 active:bg-primary-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:pointer-events-none disabled:opacity-50"
          >
            <span className="line-clamp-3">
              Continue learning · {hero.continueLesson.title}
            </span>
          </button>
        ) : hero.postA2Cta ? (
          <div className="space-y-2">
            <Link
              href={hero.postA2Cta.href}
              className="inline-flex w-full min-h-touch items-center justify-center rounded-lg px-6 py-3 text-center text-body-lg font-semibold leading-snug text-primary-800 bg-white shadow-md transition-colors hover:bg-primary-50 active:bg-primary-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {hero.postA2Cta.label}
            </Link>
            <p className="text-caption text-primary-100/90 text-center leading-snug">{hero.postA2Cta.hint}</p>
          </div>
        ) : (
          <p className="text-body-sm text-primary-100/90 text-center py-1">You’re caught up — open a module below.</p>
        )}
      </div>
    </div>
  )
}
