import { NextResponse } from 'next/server'
import type { SessionCompleteResult } from '@/lib/progression/progressionSessionComplete'
import { applySessionComplete } from '@/lib/progression/progressionSessionComplete'
import { toProgressionSessionComplete } from '@/lib/exam-system/examProgressionBridge'
import { getExamProfile } from '@/lib/exam-system/examProfileRegistry'
import { computeReadiness } from '@/lib/exam-system/readinessEngine'
import { augmentSimulationSessionWithLlmScoring } from '@/lib/exam-system/examSimulationLlmBlend'
import { finalizeExamSession } from '@/lib/exam-system/sessionLifecycle'
import { getExamSession, loadExamSessions, upsertExamSession } from '@/lib/exam-system/examSessionStore'
import { resolveExamUserId, resolveTimeZone } from '../../../_shared'

export const runtime = 'nodejs'
export const maxDuration = 180

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = resolveExamUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
  }
  const { id } = await ctx.params
  const prev = await getExamSession(userId, id)
  if (!prev) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (prev.status !== 'in_progress') {
    return NextResponse.json({ error: 'Session is not in progress' }, { status: 409 })
  }
  const finalized = finalizeExamSession(prev)
  if (!finalized) {
    return NextResponse.json({ error: 'Finalize failed' }, { status: 500 })
  }

  let sessionStored: typeof finalized = finalized
  if (finalized.mode === 'simulation') {
    const profile = getExamProfile(finalized.profileId)
    if (profile) {
      sessionStored = await augmentSimulationSessionWithLlmScoring(finalized, profile)
    }
  }
  await upsertExamSession(userId, sessionStored)

  let sessionOut = sessionStored
  if (sessionStored.mode === 'simulation') {
    const profile = getExamProfile(sessionStored.profileId)
    if (profile) {
      const { sessions } = await loadExamSessions(userId)
      const relevant = sessions.filter((s) => s.profileId === sessionStored.profileId)
      const readinessSnapshot = computeReadiness(profile, relevant)
      sessionOut = { ...sessionStored, readinessSnapshot }
      await upsertExamSession(userId, sessionOut)
    }
  }

  const timeZone = resolveTimeZone(req)
  const progressionBody = toProgressionSessionComplete(sessionOut, sessionOut.profileId)
  let xpAwarded = 0
  let newStreak = 0
  let streakChanged = false
  let suggestion: SessionCompleteResult['suggestion'] | null = null

  if (progressionBody) {
    const headerUser = req.headers.get('x-user-id')?.trim()
    if (headerUser && headerUser !== progressionBody.userId) {
      return NextResponse.json({ error: 'userId mismatch' }, { status: 403 })
    }
    const result = await applySessionComplete(progressionBody, { timeZone })
    xpAwarded = result.xpAwarded
    newStreak = result.newStreak
    streakChanged = result.streakChanged
    suggestion = result.suggestion
  }

  let sessionResponse = sessionOut
  if (progressionBody && xpAwarded > 0) {
    sessionResponse = { ...sessionOut, progressionXpAwarded: xpAwarded }
    await upsertExamSession(userId, sessionResponse)
  }

  return NextResponse.json({
    session: sessionResponse,
    progression: progressionBody
      ? { xpAwarded, newStreak, streakChanged, suggestion: suggestion ?? undefined }
      : null,
  })
}
