'use client'

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import type { SessionCompleteBody } from '@/lib/progression/progressionSessionComplete'
import { generateTodaySuggestion, type Suggestion } from '@/lib/progression/suggestionEngine'
import type { StreakUserProgress } from '@/lib/progression/streakEngine'
import type { TalkTrainingLoopCard } from '@/lib/api/apiTypes'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { quickCaptureClient } from '@/lib/api/quickCaptureClient'
import {
  computeFromYourDayHintsFromItems,
  hintsFromQuickCaptureApiSummary,
} from '@/lib/progression/fromYourDaySuggestionHeuristics'
import { useQuickCaptureOfflineStore } from '@/store/quickCaptureOfflineStore'

export type ProgressionTodayResponse = {
  suggestion: Suggestion
  streak: number
  xpToday: number
  xpWeek: number
}

export function progressionTodayQueryKey(userId: string, timeZone: string) {
  return ['progression', 'today', userId, timeZone] as const
}

export function progressionMomentumQueryKey(userId: string, timeZone: string) {
  return ['progression', 'momentum', userId, timeZone] as const
}

/** Stable query key factories for progression-related caches. */
export const PROGRESSION_QUERY_KEYS = {
  today: progressionTodayQueryKey,
  momentum: progressionMomentumQueryKey,
} as const

export function getClientTimeZone(): string {
  return typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'
}

export async function fetchProgressionToday(userId: string, timeZone: string): Promise<ProgressionTodayResponse> {
  const r = await fetch(`/api/progression/today?userId=${encodeURIComponent(userId)}`, {
    headers: { 'x-time-zone': timeZone, 'x-user-id': userId },
  })
  if (!r.ok) {
    const t = await r.text()
    throw new Error(t || r.statusText)
  }
  return (await r.json()) as ProgressionTodayResponse
}

export async function postProgressionSessionComplete(
  body: SessionCompleteBody,
  timeZone: string,
): Promise<{ xpAwarded: number; newStreak: number; streakChanged: boolean; suggestion: Suggestion }> {
  const r = await fetch('/api/progression/session-complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-time-zone': timeZone,
      'x-user-id': body.userId,
    },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const t = await r.text()
    throw new Error(t || r.statusText)
  }
  return (await r.json()) as { xpAwarded: number; newStreak: number; streakChanged: boolean; suggestion: Suggestion }
}

export function invalidateProgressionQueries(
  qc: QueryClient,
  userId: string,
  _timeZone: string,
): Promise<void> {
  return qc.invalidateQueries({
    predicate: (q) =>
      Array.isArray(q.queryKey) && q.queryKey[0] === 'progression' && q.queryKey.includes(userId),
  })
}

function loopsForSuggestionEngine(loops: TalkTrainingLoopCard[]) {
  return loops.map((l) => ({
    id: l.id,
    title: l.title,
    subtitle: l.subtitle,
    reason: l.reason,
    loopType: l.loopType,
    status: l.status,
    estimatedMinutes: l.estimatedMinutes,
    loopSlot: l.loopSlot ?? undefined,
  }))
}

export type UseTodaySuggestionOptions = {
  /** Shown while /today loads; also seeds client fallback. */
  retentionStreak?: number
  totalXpFallback?: number
  /** Loops merged into offline `generateTodaySuggestion` when API is unavailable. */
  activeTrainingLoopsForFallback?: TalkTrainingLoopCard[]
}

/**
 * Loads `/api/progression/today` and always exposes a suggestion (client engine fallback).
 */
export function useTodaySuggestion(opts?: UseTodaySuggestionOptions) {
  const authUserId = useAuthStore((s) => s.user?.id)
  const userId = authUserId ?? LOCAL_ANONYMOUS_LEARNER_ID
  const timeZone = useMemo(() => getClientTimeZone(), [])

  const retentionStreak = opts?.retentionStreak ?? 0
  const totalXpFallback = opts?.totalXpFallback ?? 0
  const activeTrainingLoopsForFallback = opts?.activeTrainingLoopsForFallback
  /** Stable identity when caller doesn't provide loops — otherwise the `?? []` allocates a fresh array
   *  per render and busts the `clientFallbackSuggestion` useMemo (and anything depending on it). */
  const activeTrainingLoops = useMemo(
    () => activeTrainingLoopsForFallback ?? [],
    [activeTrainingLoopsForFallback],
  )

  const fallbackUserProgress: StreakUserProgress = useMemo(
    () => ({
      userId,
      totalXP: totalXpFallback,
      weeklyXP: 0,
      currentStreak: retentionStreak,
      longestStreak: retentionStreak,
      lastActiveDate: '',
    }),
    [userId, totalXpFallback, retentionStreak],
  )

  const todayYmd = useMemo(
    () =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date()),
    [timeZone],
  )

  const offlineCaptures = useQuickCaptureOfflineStore((s) => s.captures)
  const offlineReadyCount = useMemo(
    () =>
      offlineCaptures.filter(
        (c) =>
          c.localCaptureDate === todayYmd &&
          c.status === 'ready_for_practice' &&
          (c.bodyPrimary ?? c.transcript ?? '').trim().length > 0,
      ).length,
    [offlineCaptures, todayYmd],
  )

  const fySummaryQuery = useQuery({
    queryKey: ['quickCapture', 'summary', userId, todayYmd] as const,
    enabled: isFeature1ChatBackendEnabled(),
    queryFn: () => quickCaptureClient.summary(todayYmd),
    staleTime: 45_000,
  })

  const hintsFromApi = useMemo(() => {
    if (!fySummaryQuery.data) return null
    return hintsFromQuickCaptureApiSummary(fySummaryQuery.data as Record<string, unknown>)
  }, [fySummaryQuery.data])

  const hintsOffline = useMemo(() => {
    if (isFeature1ChatBackendEnabled()) return null
    return computeFromYourDayHintsFromItems(offlineCaptures, todayYmd)
  }, [offlineCaptures, todayYmd])

  const fromYourDayHints = isFeature1ChatBackendEnabled() ? hintsFromApi : hintsOffline

  const legacyReadyCount = isFeature1ChatBackendEnabled()
    ? (fySummaryQuery.data?.practiceReadyCount ??
        fySummaryQuery.data?.readyCount ??
        0)
    : offlineReadyCount

  const fromYourDayReadyCount = fromYourDayHints?.practiceReadyCount ?? legacyReadyCount

  const clientFallbackSuggestion = useMemo(
    () =>
      generateTodaySuggestion({
        userProgress: fallbackUserProgress,
        recentSessions: [],
        activeTrainingLoops: loopsForSuggestionEngine(activeTrainingLoops),
        skillProfile: null,
        now: new Date(),
        timeZone,
        fromYourDayHints,
        fromYourDayReadyCount,
      }),
    [fallbackUserProgress, activeTrainingLoops, timeZone, fromYourDayHints, fromYourDayReadyCount],
  )

  const todayQuery = useQuery({
    queryKey: progressionTodayQueryKey(userId, timeZone),
    queryFn: () => fetchProgressionToday(userId, timeZone),
    staleTime: 30_000,
    retry: 1,
  })

  const apiSuggestion = todayQuery.data?.suggestion
  const suggestion =
    apiSuggestion &&
    typeof apiSuggestion.title === 'string' &&
    apiSuggestion.title.trim().length > 0 &&
    typeof apiSuggestion.description === 'string'
      ? apiSuggestion
      : clientFallbackSuggestion

  return {
    suggestion,
    streak: todayQuery.data?.streak ?? retentionStreak,
    xpToday: todayQuery.data?.xpToday ?? 0,
    xpWeek: todayQuery.data?.xpWeek ?? 0,
    isLoading: todayQuery.isLoading,
    isFetching: todayQuery.isFetching,
    error: todayQuery.error,
    refetch: todayQuery.refetch,
    clientFallbackSuggestion,
    fromYourDayReadyCount,
    fromYourDayHints,
  }
}

/**
 * Progression surface: today strip + POST session-complete with cache invalidation.
 */
export function useProgression() {
  const queryClient = useQueryClient()
  const authUserId = useAuthStore((s) => s.user?.id)
  const userId = authUserId ?? LOCAL_ANONYMOUS_LEARNER_ID
  const timeZone = useMemo(() => getClientTimeZone(), [])

  const todayQuery = useQuery({
    queryKey: progressionTodayQueryKey(userId, timeZone),
    queryFn: () => fetchProgressionToday(userId, timeZone),
    staleTime: 30_000,
    retry: 1,
  })

  const completeMut = useMutation({
    mutationFn: (body: SessionCompleteBody) => postProgressionSessionComplete(body, timeZone),
    onSettled: async () => {
      await invalidateProgressionQueries(queryClient, userId, timeZone)
    },
  })

  return {
    userId,
    timeZone,
    streak: todayQuery.data?.streak ?? 0,
    xpToday: todayQuery.data?.xpToday ?? 0,
    xpWeek: todayQuery.data?.xpWeek ?? 0,
    todayQuery,
    submitSessionComplete: completeMut.mutateAsync,
    isSubmittingSession: completeMut.isPending,
    sessionCompleteError: completeMut.error,
    refreshToday: todayQuery.refetch,
  }
}
