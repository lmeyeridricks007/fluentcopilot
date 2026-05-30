'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Flame, MessageCircle, Mic, Plus, Sparkles, Zap } from 'lucide-react'
import { clsx } from 'clsx'
import type { PracticeDashboardSummary } from '@/features/practice-hub/usePracticeDashboardSummary'
import type { PracticeHubViewModel } from '@/features/practice-hub/types'
import { useTalkContinueSessions } from '@/features/practice-hub/useTalkContinueSessions'
import { playAppSound } from '@/lib/interaction/appSounds'
import {
  APP_LANGUAGE_COACH,
  APP_LIBRARY_FROM_YOUR_DAY,
  APP_LISTENING_MODE,
  APP_READ_ALOUD,
  APP_HISTORY,
  APP_SPEAK_LIVE,
  appTalkThread,
  appTalkTrainingLoopHref,
  speakLiveRunHref,
} from '@/lib/routing/appRoutes'
import {
  readResumableLiveSession,
  type ResumableLiveSession,
} from '@/lib/speak-live/resumableLiveSessionStorage'
import { TRAIN_STATION_SCENARIO_ID, getPersona, getScenario } from '@/features/feature1-chat'
import type { Suggestion } from '@/lib/progression/suggestionEngine'
import { useTodaySuggestion } from '@/lib/hooks/useProgression'
import { useQuickCaptureOptional } from '@/components/capture/QuickCaptureContext'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { quickCaptureClient } from '@/lib/api/quickCaptureClient'
import { FromYourDayEveningBanner } from '@/features/quick-capture/FromYourDayEveningBanner'

export type TalkLandingProps = {
  vm: PracticeHubViewModel
  /** Retained for hub compatibility; landing reads next steps from progression + continue data. */
  dash?: PracticeDashboardSummary
  retentionStreak: number
  retentionCaption: string
  totalXp: number
  exploreHref?: string
}

function formatUpdated(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function continueItemModeLabel(mode: NonNullable<PracticeHubViewModel['continueItem']>['mode']): string {
  switch (mode) {
    case 'guided':
      return 'Guided'
    case 'semi_guided':
      return 'Semi-guided'
    case 'free':
      return 'Free flow'
    case 'speaking_focus':
      return 'Speaking focus'
    case 'listening_focus':
      return 'Listening focus'
    default:
      return 'Practice'
  }
}

function hrefForSuggestion(s: Suggestion): string {
  const href = typeof s.action.config.href === 'string' ? s.action.config.href.trim() : ''
  if (href) return href
  switch (s.action.type) {
    case 'listening':
      return APP_LISTENING_MODE
    case 'read_aloud':
      return APP_READ_ALOUD
    case 'coach':
      return APP_LANGUAGE_COACH
    case 'scenario':
    default:
      return APP_SPEAK_LIVE
  }
}

const primaryCta =
  'inline-flex min-h-touch w-full items-center justify-center rounded-full bg-brand-gradient px-5 py-3.5 text-[15px] font-bold text-white shadow-hero transition hover:brightness-[1.06] active:scale-[0.99]'

export function TalkLanding({ vm, retentionStreak, retentionCaption, totalXp, exploreHref }: TalkLandingProps) {
  const pathname = usePathname()
  const quickCapture = useQuickCaptureOptional()

  const {
    useBackend,
    continueQuery,
    activeTrainingLoops,
    backendTrainContinue,
    activeTrainThread,
    showContinueCard,
  } = useTalkContinueSessions()

  const [resumableLive, setResumableLive] = useState<ResumableLiveSession | null>(null)
  const refreshResumable = useCallback(() => setResumableLive(readResumableLiveSession()), [])
  useEffect(() => {
    refreshResumable()
  }, [pathname, refreshResumable])

  const trainScenario = useMemo(() => getScenario(TRAIN_STATION_SCENARIO_ID), [])
  const trainPersona = useMemo(() => getPersona(trainScenario.personaId), [trainScenario])

  const continueThreadId = useBackend ? backendTrainContinue?.threadId : activeTrainThread?.id
  const continueUpdatedAt = useBackend ? backendTrainContinue?.updatedAt : activeTrainThread?.updatedAt
  const continueMode = useBackend ? backendTrainContinue?.mode : activeTrainThread?.mode
  const continueFeedback = useBackend ? backendTrainContinue?.feedbackMode : activeTrainThread?.feedbackMode

  const practiceContinue = vm.continueItem ?? vm.fallbackPrimary

  const lastActiveContinue = useMemo(() => {
    if (resumableLive) {
      return {
        kind: 'speak_live' as const,
        title: 'Speak Live',
        subtitle: `${resumableLive.scenarioTitle} — pick up where you left off.`,
        href: speakLiveRunHref({
          scenarioId: resumableLive.scenarioId,
          level: resumableLive.level,
          threadId: resumableLive.threadId,
        }),
        meta: 'Paused session',
      }
    }
    if (showContinueCard && continueThreadId && continueUpdatedAt && continueMode && continueFeedback) {
      return {
        kind: 'train' as const,
        title: 'Train station',
        subtitle: `With ${(useBackend ? backendTrainContinue?.personaName : trainPersona.displayName) ?? trainPersona.displayName}. ${continueMode === 'guided' ? 'Guided' : 'Free flow'} · ${continueFeedback === 'after_each' ? 'Notes after each turn' : 'Recap at the end'}.`,
        href: appTalkThread(continueThreadId),
        meta: formatUpdated(continueUpdatedAt),
      }
    }
    if (practiceContinue) {
      return {
        kind: 'practice' as const,
        title: practiceContinue.title,
        subtitle: practiceContinue.summary,
        href: practiceContinue.href,
        meta: `${continueItemModeLabel(practiceContinue.mode)} · ~${practiceContinue.estimatedMinutes} min${practiceContinue.lastActiveLabel ? ` · ${practiceContinue.lastActiveLabel}` : ''}`,
      }
    }
    return null
  }, [
    resumableLive,
    showContinueCard,
    continueThreadId,
    continueUpdatedAt,
    continueMode,
    continueFeedback,
    useBackend,
    backendTrainContinue?.personaName,
    trainPersona.displayName,
    practiceContinue,
  ])

  const {
    suggestion,
    streak,
    xpToday,
    xpWeek,
    isLoading: progressionLoading,
    fromYourDayReadyCount,
    fromYourDayHints,
  } = useTodaySuggestion({
    retentionStreak,
    totalXpFallback: totalXp,
    activeTrainingLoopsForFallback: activeTrainingLoops,
  })

  const fromYourDayHref = useMemo(
    () => `${APP_LIBRARY_FROM_YOUR_DAY}?date=${encodeURIComponent(quickCaptureClient.localDateYmd())}`,
    [],
  )

  const fromYourDayPackIntent =
    suggestion?.action?.config &&
    typeof (suggestion.action.config as { intent?: unknown }).intent === 'string' &&
    (suggestion.action.config as { intent: string }).intent === 'from_your_day_pack'

  const fromYourDayPreviewLine =
    fromYourDayPackIntent && suggestion?.action?.config
      ? String((suggestion.action.config as { previewLine?: unknown }).previewLine ?? '').trim()
      : ''

  const loopsShown = activeTrainingLoops.slice(0, 2)

  return (
    <div className="space-y-8 motion-safe:animate-learn-segment-crossfade sm:space-y-9">
      {/* 1 — Today suggestion */}
      <section aria-label="Today suggestion" className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Today</p>
        <div className="overflow-hidden rounded-[1.35rem] border border-slate-200/90 bg-gradient-to-br from-white via-violet-50/40 to-indigo-50/30 p-5 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.04] sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-indigo-700 text-white shadow-lg ring-1 ring-violet-400/30">
              <Sparkles className="h-6 w-6" strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              {progressionLoading ? (
                <div className="space-y-2">
                  <div className="h-6 w-[88%] max-w-md animate-pulse rounded-lg bg-slate-200/80" />
                  <div className="h-4 w-full max-w-sm animate-pulse rounded bg-slate-200/60" />
                  <div className="h-4 w-[60%] animate-pulse rounded bg-slate-200/50" />
                </div>
              ) : (
                <>
                  <h2 className="text-[1.35rem] font-bold leading-tight tracking-tight text-[#0F172A]">{suggestion.title}</h2>
                  <p className="mt-2 text-[14px] leading-snug text-[#475569] line-clamp-2">{suggestion.description}</p>
                  <p className="mt-1.5 text-[13px] font-medium leading-snug text-slate-600 line-clamp-2">{suggestion.reason}</p>
                  <p className="mt-3 text-[13px] font-semibold tabular-nums text-slate-800">
                    {Math.max(1, Math.round(suggestion.estimatedTime))} min ·{' '}
                    <span className="text-[#7c3aed]">+{suggestion.xpRewardEstimate} XP</span>
                  </p>
                  {fromYourDayPackIntent && fromYourDayPreviewLine ? (
                    <p className="mt-2 rounded-xl border border-violet-100/90 bg-white/80 px-3 py-2 text-[12px] font-medium leading-snug text-slate-800">
                      Today{"'"}s mix: <span className="text-slate-950">{fromYourDayPreviewLine}</span>
                    </p>
                  ) : null}
                  {!fromYourDayPackIntent && fromYourDayReadyCount >= 2 ? (
                    <p className="mt-3 rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-2 text-[12px] leading-snug text-slate-700">
                      You also saved{' '}
                      <span className="font-bold text-slate-900">{fromYourDayReadyCount} useful Dutch moments</span>{' '}
                      today —{' '}
                      <Link href={fromYourDayHref} className="font-semibold text-[#7c3aed] underline-offset-2 hover:underline">
                        practice them in one pack
                      </Link>
                      .
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </div>
          <Link
            href={hrefForSuggestion(suggestion)}
            onClick={() => playAppSound('tap')}
            className={clsx(primaryCta, 'mt-5')}
          >
            Start now
          </Link>
        </div>
      </section>

      <FromYourDayEveningBanner readyCount={fromYourDayReadyCount} backend={isFeature1ChatBackendEnabled()} />

      {/* 2 — Momentum bar */}
      <section aria-label="Momentum" className="rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-3 shadow-sm ring-1 ring-slate-900/[0.02] sm:px-4">
        <div className="grid grid-cols-3 gap-2 divide-x divide-slate-100">
          <div className="flex flex-col items-center px-1 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-orange-600 ring-1 ring-orange-100/80">
              <Flame className="h-4 w-4" aria-hidden />
            </span>
            <p className="mt-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">Streak</p>
            <p className="text-lg font-bold tabular-nums text-slate-900">{streak > 0 ? `${streak}d` : '—'}</p>
          </div>
          <div className="flex flex-col items-center px-1 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-[#7c3aed] ring-1 ring-violet-100/90">
              <Zap className="h-4 w-4" aria-hidden />
            </span>
            <p className="mt-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">Today</p>
            <p className="text-lg font-bold tabular-nums text-slate-900">{xpToday}</p>
          </div>
          <div className="flex flex-col items-center px-1 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100/90">
              <Zap className="h-4 w-4 opacity-80" aria-hidden />
            </span>
            <p className="mt-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">Week</p>
            <p className="text-lg font-bold tabular-nums text-slate-900">{xpWeek}</p>
          </div>
        </div>
        {retentionCaption ? (
          <p className="mt-2 border-t border-slate-100 pt-2 text-center text-[11px] leading-snug text-slate-500 line-clamp-2">{retentionCaption}</p>
        ) : null}
      </section>

      {/* 3 — From your day (Quick Capture practice) */}
      <section aria-label="From your day" className="space-y-2">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Saved from your life</h2>
        <Link
          href={fromYourDayHref}
          onClick={() => playAppSound('tap')}
          className="flex min-h-touch flex-col gap-1 rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 to-white px-4 py-3.5 shadow-sm transition hover:border-indigo-300"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-700">From your day</p>
          <p className="text-[15px] font-semibold text-slate-900">Practice real Dutch you captured</p>
          {fromYourDayReadyCount > 0 ? (
            <p className="text-[13px] font-medium leading-snug text-slate-800">
              You saved{' '}
              <span className="font-bold text-indigo-950">
                {fromYourDayReadyCount} useful Dutch moment{fromYourDayReadyCount === 1 ? '' : 's'}
              </span>{' '}
              today — open a short personalized pack.
              {fromYourDayHints?.previewFragments?.length ? (
                <span className="mt-1 block text-[12px] font-normal text-slate-600">
                  Includes {fromYourDayHints.previewFragments.slice(0, 3).join(' + ')}.
                </span>
              ) : null}
            </p>
          ) : (
            <p className="text-[12px] leading-snug text-slate-600">
              Quick capture in Library, then build a calm pack from what you saved — XP when you finish.
            </p>
          )}
        </Link>
        {quickCapture ? (
          <button
            type="button"
            onClick={() => {
              playAppSound('tap')
              quickCapture.open()
            }}
            className="flex min-h-touch w-full items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-left shadow-sm transition hover:border-primary-200 hover:bg-primary-50/20"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-800">
              <Plus className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-slate-900">Quick capture</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-slate-600">
                Word, phrase, place, or voice — a few seconds, then Library.
              </span>
            </span>
          </button>
        ) : null}
      </section>

      {/* 4 — Speak Live library + Language coach (full scenario lists live on /talk/live) */}
      <section aria-label="Speak and coach" className="space-y-2">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Speak</h2>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={APP_SPEAK_LIVE}
            onClick={() => playAppSound('tap')}
            className="flex min-h-touch flex-col items-start justify-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white px-3.5 py-3.5 shadow-sm transition hover:border-slate-300 hover:shadow-md active:scale-[0.99]"
          >
            <Mic className="h-5 w-5 shrink-0 text-emerald-700" strokeWidth={2.1} aria-hidden />
            <p className="text-[14px] font-bold leading-snug text-[#0F172A]">Voice scenes</p>
            <p className="text-[11px] leading-snug text-slate-600">Full Speak Live catalog</p>
          </Link>
          <Link
            href={APP_LANGUAGE_COACH}
            onClick={() => playAppSound('tap')}
            className="flex min-h-touch flex-col items-start justify-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white px-3.5 py-3.5 shadow-sm transition hover:border-slate-300 hover:shadow-md active:scale-[0.99]"
          >
            <MessageCircle className="h-5 w-5 shrink-0 text-[#7c3aed]" strokeWidth={2.1} aria-hidden />
            <p className="text-[14px] font-bold leading-snug text-[#0F172A]">Language coach</p>
            <p className="text-[11px] leading-snug text-slate-600">AI coach chat</p>
          </Link>
        </div>
        {exploreHref ? (
          <Link
            href={exploreHref}
            onClick={() => playAppSound('tap')}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#7c3aed] underline-offset-4 hover:underline"
          >
            More practice options
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : null}
      </section>

      {/* 5 — Continue (single) */}
      {lastActiveContinue ? (
        <section aria-label="Continue" className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Continue</h2>
          <Link
            href={lastActiveContinue.href}
            onClick={() => playAppSound('tap')}
            className="flex min-h-touch flex-col gap-1 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7c3aed]">Last active</p>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
            </div>
            <p className="text-[17px] font-bold leading-snug text-[#0F172A]">{lastActiveContinue.title}</p>
            <p className="text-[13px] leading-snug text-slate-600 line-clamp-3">{lastActiveContinue.subtitle}</p>
            <p className="text-[12px] font-medium text-slate-500">{lastActiveContinue.meta}</p>
          </Link>
        </section>
      ) : null}

      {/* 6 — Training loops (max 2) */}
      {loopsShown.length > 0 ? (
        <section aria-label="Training loops" className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Training loops</h2>
          <div className="space-y-2">
            {loopsShown.map((loop) => (
              <Link
                key={loop.id}
                href={appTalkTrainingLoopHref(loop.id)}
                onClick={() => playAppSound('tap')}
                className="block rounded-2xl border border-violet-200/70 bg-gradient-to-r from-violet-50/80 to-white px-4 py-3.5 shadow-sm transition hover:border-violet-300"
              >
                <p className="text-[15px] font-semibold text-slate-900">{loop.title}</p>
                {loop.reason ? (
                  <p className="mt-1 text-[12px] leading-snug text-slate-600 line-clamp-2">{loop.reason}</p>
                ) : null}
                <p className="mt-2 text-[11px] font-semibold text-violet-800">
                  {Math.max(0.5, Math.round((loop.estimatedMinutes ?? 8) * 10) / 10)} min suggested
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : useBackend && continueQuery.isLoading ? (
        <div className="h-24 animate-pulse rounded-2xl border border-slate-200/80 bg-white" aria-hidden />
      ) : null}

      {/* 6 — History link only */}
      <section aria-label="History" className="pt-1">
        <Link
          href={APP_HISTORY}
          onClick={() => playAppSound('tap')}
          className="inline-flex items-center gap-1 text-[14px] font-semibold text-[#7c3aed] underline-offset-4 hover:underline"
        >
          View history
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    </div>
  )
}
