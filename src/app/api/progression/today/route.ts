import { NextResponse } from 'next/server'
import { loadProgressionState } from '@/lib/progression/serverProgressionStore'
import { generateTodaySuggestion, type SuggestionSessionSummary } from '@/lib/progression/suggestionEngine'
import { sumXpRollingDays } from '@/lib/progression/progressionSessionComplete'
import { fetchQuickCaptureTodaySummaryForSuggestion } from '@/lib/progression/fetchQuickCaptureTodaySummary'

export const runtime = 'nodejs'

function resolveUserId(req: Request): string | null {
  const h = req.headers.get('x-user-id')?.trim()
  if (h) return h
  const q = new URL(req.url).searchParams.get('userId')?.trim()
  return q || null
}

function resolveTimeZone(req: Request): string {
  return req.headers.get('x-time-zone')?.trim() || 'UTC'
}

function toSuggestionSessions(sessions: { sessionId: string; type: SuggestionSessionSummary['type']; completed: boolean; durationSeconds: number; weaknessesTargeted?: string[]; improvements?: string[]; createdAt: string; turns?: number }[]): SuggestionSessionSummary[] {
  return [...sessions]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 20)
    .map((s) => ({
      sessionId: s.sessionId,
      type: s.type,
      completed: s.completed,
      durationSeconds: s.durationSeconds,
      weaknessesTargeted: s.weaknessesTargeted,
      improvements: s.improvements,
      createdAt: s.createdAt,
      turns: s.turns,
    }))
}

export async function GET(req: Request) {
  const userId = resolveUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Missing user id (x-user-id header or userId query)' }, { status: 400 })
  }

  const timeZone = resolveTimeZone(req)
  const now = new Date()
  const todayYmd = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)

  try {
    const state = await loadProgressionState(userId)
    const xpToday = state.dailyByDate[todayYmd]?.xpEarned ?? 0
    const xpWeek = sumXpRollingDays(state, now, 7, timeZone)
    const fromYourDayHints = await fetchQuickCaptureTodaySummaryForSuggestion(userId, todayYmd)
    const suggestion = generateTodaySuggestion({
      userProgress: state.userProgress,
      recentSessions: toSuggestionSessions(state.sessions),
      activeTrainingLoops: [],
      skillProfile: null,
      now,
      timeZone,
      fromYourDayHints,
      fromYourDayReadyCount: fromYourDayHints?.practiceReadyCount,
    })

    return NextResponse.json({
      suggestion,
      streak: state.userProgress.currentStreak,
      xpToday,
      xpWeek,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
