import { NextResponse } from 'next/server'
import { reprocessCompletedSimulationSession } from '@/lib/exam-system/examSimulationLlmBlend'
import { getExamProfile } from '@/lib/exam-system/examProfileRegistry'
import { reprocessCompletedExamReport } from '@/lib/exam-system/sessionLifecycle'
import { getExamSession, upsertExamSession } from '@/lib/exam-system/examSessionStore'
import { resolveExamUserId } from '../../../_shared'

export const runtime = 'nodejs'
export const maxDuration = 180

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = resolveExamUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
    }
    const { id } = await ctx.params
    const prev = await getExamSession(userId, id)
    if (!prev) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (prev.status !== 'completed') {
      return NextResponse.json({ error: 'Only completed sessions can be reprocessed' }, { status: 409 })
    }
    const profile = getExamProfile(prev.profileId)
    const out =
      prev.mode === 'simulation' && profile
        ? await reprocessCompletedSimulationSession(prev, profile)
        : reprocessCompletedExamReport(prev)
    if (!out) return NextResponse.json({ error: 'Could not reprocess session' }, { status: 400 })
    await upsertExamSession(userId, out)
    return NextResponse.json({ session: out })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Report reprocess failed'
    console.error('[reprocess-report]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
