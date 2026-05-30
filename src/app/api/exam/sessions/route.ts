import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createExamSession } from '@/lib/exam-system/sessionLifecycle'
import { loadExamSessions, upsertExamSession } from '@/lib/exam-system/examSessionStore'
import { resolveExamUserId } from '../_shared'

export const runtime = 'nodejs'

const createBodySchema = z.object({
  profileId: z.string().min(1),
  level: z.enum(['A1', 'A2', 'B1']),
  mode: z.enum(['simulation', 'training']),
  scope: z.enum(['full', 'section']),
  sectionId: z.string().optional(),
  trainingSupport: z.enum(['full_guidance', 'light_guidance', 'almost_exam']).optional(),
  timedTraining: z.boolean().optional(),
  weaknessRepair: z.boolean().optional(),
  trainingEntryMode: z.enum(['adaptive', 'by_task_type', 'by_weakness', 'section', 'full_mix']).optional(),
  focusTaskType: z
    .enum([
      'practical_request',
      'short_response',
      'roleplay',
      'describe_situation',
      'explain_process',
      'give_opinion',
      'justify_reason',
      'follow_up_response',
      'compare_options',
      'storytelling',
      'sequencing',
      'read_aloud_exam',
      'listening_response_exam',
      'listening_mcq_exam',
      'writing_task_exam',
      'knowledge_mcq',
    ])
    .optional(),
})

export async function GET(req: Request) {
  const userId = resolveExamUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
  }
  const url = new URL(req.url)
  const mode = url.searchParams.get('mode') as 'simulation' | 'training' | null
  const level = url.searchParams.get('level') as 'A1' | 'A2' | 'B1' | null
  const profileId = url.searchParams.get('profileId')
  const draft = await loadExamSessions(userId)
  let sessions = [...draft.sessions].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  if (mode === 'simulation' || mode === 'training') sessions = sessions.filter((s) => s.mode === mode)
  if (level === 'A1' || level === 'A2' || level === 'B1') sessions = sessions.filter((s) => s.level === level)
  if (profileId?.trim()) sessions = sessions.filter((s) => s.profileId === profileId.trim())
  const sinceRaw = url.searchParams.get('since')?.trim()
  if (sinceRaw) {
    const t = Date.parse(sinceRaw)
    if (!Number.isNaN(t)) {
      sessions = sessions.filter((s) => Date.parse(s.updatedAt) >= t)
    }
  }
  return NextResponse.json({ sessions: sessions.slice(0, 80) })
}

export async function POST(req: Request) {
  const userId = resolveExamUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
  }
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = createBodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }
  const session = createExamSession({
    userId,
    profileId: parsed.data.profileId,
    level: parsed.data.level,
    mode: parsed.data.mode,
    scope: parsed.data.scope,
    sectionId: parsed.data.sectionId,
    trainingSupport: parsed.data.trainingSupport,
    timedTraining: parsed.data.timedTraining,
    weaknessRepair: parsed.data.weaknessRepair,
    trainingEntryMode: parsed.data.trainingEntryMode,
    focusTaskType: parsed.data.focusTaskType,
  })
  if (!session) {
    return NextResponse.json({ error: 'Unknown profile' }, { status: 404 })
  }
  await upsertExamSession(userId, session)
  return NextResponse.json({ session })
}
