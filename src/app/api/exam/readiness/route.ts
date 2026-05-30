import { NextResponse } from 'next/server'
import { getExamProfile } from '@/lib/exam-system/examProfileRegistry'
import { computeReadiness } from '@/lib/exam-system/readinessEngine'
import { loadExamSessions } from '@/lib/exam-system/examSessionStore'
import { resolveExamUserId } from '../_shared'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const userId = resolveExamUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
  }
  const url = new URL(req.url)
  const profileId = url.searchParams.get('profileId')?.trim() || 'inburgering_speaking_A2'
  const profile = getExamProfile(profileId)
  if (!profile) {
    return NextResponse.json({ error: 'Unknown profile' }, { status: 404 })
  }
  const { sessions } = await loadExamSessions(userId)
  const relevant = sessions.filter((s) => s.profileId === profileId)
  const snapshot = computeReadiness(profile, relevant)
  return NextResponse.json({ profileId, snapshot })
}
