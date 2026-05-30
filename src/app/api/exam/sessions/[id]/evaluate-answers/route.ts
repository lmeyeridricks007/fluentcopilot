import { NextResponse } from 'next/server'
import { evaluateAllExamTaskAnswers } from '@/lib/exam-system/examAnswerEvaluation'
import { evaluateSimulationPromptFit } from '@/lib/exam-system/examSimulationLlmBlend'
import { buildTrainingReport } from '@/lib/exam-system/reportBuilder'
import { rescoreExamSessionAttempts } from '@/lib/exam-system/sessionLifecycle'
import type { ExamSessionRecord } from '@/lib/exam-system/types'
import { getExamSession, upsertExamSession } from '@/lib/exam-system/examSessionStore'
import { resolveExamUserId } from '../../../_shared'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = resolveExamUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
    }
    const { id } = await ctx.params
    const session = await getExamSession(userId, id)
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (session.status !== 'completed') {
      return NextResponse.json({ error: 'Only completed sessions can be evaluated' }, { status: 409 })
    }

    const latestByTask = new Map(session.attempts.map((a) => [a.taskId, a]))
    const tasksWithAttempts = session.tasks.filter((t) => latestByTask.has(t.id))
    if (!tasksWithAttempts.length) {
      return NextResponse.json({ error: 'No scored attempts to evaluate' }, { status: 400 })
    }

    const rescored = rescoreExamSessionAttempts(session)
    if (!rescored) {
      return NextResponse.json({ error: 'Could not rescore session' }, { status: 400 })
    }
    const { next, profile } = rescored

    let merged: ExamSessionRecord
    if (next.mode === 'simulation') {
      merged = await evaluateSimulationPromptFit(next, profile)
    } else {
      const evaluations = await evaluateAllExamTaskAnswers({
        tasks: next.tasks,
        attempts: next.attempts,
        level: next.level,
      })
      const withEval: ExamSessionRecord = {
        ...next,
        llmAnswerEvaluations: evaluations,
        updatedAt: new Date().toISOString(),
      }
      merged = {
        ...withEval,
        report: buildTrainingReport(withEval, profile, withEval.trainingSupport ?? 'light_guidance'),
      }
    }

    await upsertExamSession(userId, merged)
    return NextResponse.json({ session: merged })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Prompt-fit evaluation failed'
    console.error('[evaluate-answers]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
