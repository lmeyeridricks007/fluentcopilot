import { NextResponse } from 'next/server'
import { buildMomentumLast7Days } from '@/lib/progression/momentumLast7'
import { loadProgressionState } from '@/lib/progression/serverProgressionStore'

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

export async function GET(req: Request) {
  const userId = resolveUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Missing user id (x-user-id header or userId query)' }, { status: 400 })
  }

  const timeZone = resolveTimeZone(req)

  try {
    const state = await loadProgressionState(userId)
    const last7Days = buildMomentumLast7Days(state, new Date(), timeZone)
    const daysPracticedLast7 = last7Days.filter((d) => d.practiced).length
    const recentActivity = [...state.sessions]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 12)
      .map((s) => ({
        sessionId: s.sessionId,
        type: s.type,
        completed: s.completed,
        xpAwarded: s.xpAwarded,
        createdAt: s.createdAt,
      }))

    return NextResponse.json({
      streak: state.userProgress.currentStreak,
      longestStreak: state.userProgress.longestStreak,
      totalXP: state.userProgress.totalXP,
      weeklyXP: state.userProgress.weeklyXP,
      last7Days,
      daysPracticedLast7,
      recentActivity,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
