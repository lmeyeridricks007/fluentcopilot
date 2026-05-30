import { NextResponse } from 'next/server'
import { z } from 'zod'
import { appendTaskAttempt } from '@/lib/exam-system/sessionLifecycle'
import { getExamSession, upsertExamSession } from '@/lib/exam-system/examSessionStore'
import { resolveExamUserId } from '../../_shared'

export const runtime = 'nodejs'

const examVoiceSnapshotSchema = z
  .object({
    pronunciation01: z.number().min(0).max(1),
    fluency01: z.number().min(0).max(1),
    accuracy01: z.number().min(0).max(1),
    completeness01: z.number().min(0).max(1),
    prosody01: z.number().min(0).max(1).nullable(),
    overall01: z.number().min(0).max(1),
    clarity01: z.number().min(0).max(1),
    provider: z.enum(['azure', 'off']),
  })
  .strict()

const patchBodySchema = z.object({
  taskId: z.string().min(1),
  answerText: z.string(),
  retriesUsed: z.number().int().min(0).max(5).default(0),
  prepUsedSeconds: z.number().int().min(0).optional(),
  answerUsedSeconds: z.number().int().min(0).optional(),
  appendAsRetry: z.boolean().optional(),
  voice: examVoiceSnapshotSchema.optional(),
})

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = resolveExamUserId(_req)
  if (!userId) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
  }
  const { id } = await ctx.params
  const session = await getExamSession(userId, id)
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ session })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
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
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = patchBodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }
  const next = appendTaskAttempt(prev, parsed.data)
  if (!next) return NextResponse.json({ error: 'Bad task' }, { status: 400 })
  await upsertExamSession(userId, next)
  return NextResponse.json({ session: next })
}
