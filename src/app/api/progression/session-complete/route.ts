import { NextResponse } from 'next/server'
import { sessionSummaryBodySchema } from '@/lib/progression/progressionApiSchemas'
import { applySessionComplete, formatProgressionYmd } from '@/lib/progression/progressionSessionComplete'
import { fetchQuickCaptureTodaySummaryForSuggestion } from '@/lib/progression/fetchQuickCaptureTodaySummary'

export const runtime = 'nodejs'

function resolveTimeZone(req: Request): string {
  return req.headers.get('x-time-zone')?.trim() || 'UTC'
}

export async function POST(req: Request) {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = sessionSummaryBodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  const headerUser = req.headers.get('x-user-id')?.trim()
  if (headerUser && headerUser !== parsed.data.userId) {
    return NextResponse.json({ error: 'userId mismatch with x-user-id' }, { status: 403 })
  }

  const timeZone = resolveTimeZone(req)
  const todayYmd = formatProgressionYmd(new Date(parsed.data.createdAt), timeZone)
  let fromYourDayHints = null
  try {
    fromYourDayHints = await fetchQuickCaptureTodaySummaryForSuggestion(parsed.data.userId, todayYmd)
  } catch {
    fromYourDayHints = null
  }

  try {
    const result = await applySessionComplete(parsed.data, { timeZone, fromYourDayHints })
    return NextResponse.json({
      xpAwarded: result.xpAwarded,
      newStreak: result.newStreak,
      streakChanged: result.streakChanged,
      suggestion: result.suggestion,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
