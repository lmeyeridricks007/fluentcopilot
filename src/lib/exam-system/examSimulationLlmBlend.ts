import { evaluateAllExamTaskAnswers } from './examAnswerEvaluation'
import { attachSampleAnswerWordGlossesToSession } from './examReportWordGloss'
import { buildSimulationReport } from './reportBuilder'
import { mcqSubmissionMatchesCorrect } from './scoringEngine'
import {
  effectiveWritingFormBullets,
  formFillLayoutScore01,
  writingExamTaskLooksFormFill,
} from './writingExamFillInCompose'
import { reprocessCompletedExamReport, upgradeExamWritingTasksFromAttempts } from './sessionLifecycle'
import type { ExamLlmAnswerEvaluation, ExamLlmAnswerFit, ExamProfile, ExamScoringDimension, ExamSessionRecord, ExamTaskAttempt } from './types'

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

/** Maps prompt-fit verdict to a 0–1 target for blending with heuristic composite. */
export function answerFitToScore01(fit: ExamLlmAnswerFit): number {
  switch (fit) {
    case 'yes':
      return 0.96
    case 'mostly':
      return 0.82
    case 'partial':
      return 0.5
    case 'no':
    default:
      return 0.16
  }
}

/**
 * Blend rubric composite with answer-fit judgment.
 * Higher `confidence01` moves the result closer to the fit target (LLM or heuristic self-report).
 */
export function blendHeuristicCompositeWithAnswerFit(
  heuristic01: number,
  fit: ExamLlmAnswerFit,
  confidence01: number,
): number {
  const h = clamp01(heuristic01)
  const target = answerFitToScore01(fit)
  const w = clamp01(0.32 + 0.5 * confidence01)
  return clamp01(h * (1 - w) + target * w)
}

/** Apply stored answer evaluations to attempts (expects heuristic composites on input). */
export function applyLlmAnswerEvaluationsToAttempts(
  session: ExamSessionRecord,
  evaluations: Record<string, ExamLlmAnswerEvaluation>,
): ExamTaskAttempt[] {
  return session.attempts.map((a) => {
    const ev = evaluations[a.taskId]
    if (!ev) return a
    const task = session.tasks.find((t) => t.id === a.taskId)
    if (
      task?.mcq &&
      (task.taskType === 'knowledge_mcq' || task.taskType === 'listening_mcq_exam') &&
      mcqSubmissionMatchesCorrect(task.mcq.correctOptionIds, a.answerText) &&
      ev.fit === 'yes'
    ) {
      const scores = { ...a.scores }
      for (const k of Object.keys(scores)) {
        scores[k as ExamScoringDimension] = 1
      }
      return { ...a, composite: 1, scores }
    }
    const h = clamp01(a.composite)
    const blended = blendHeuristicCompositeWithAnswerFit(h, ev.fit, ev.confidence01)
    const scale = h > 0.008 ? blended / h : blended
    const scores = { ...a.scores }
    for (const k of Object.keys(scores)) {
      const dim = k as ExamScoringDimension
      const v = scores[dim]
      if (typeof v === 'number') scores[dim] = clamp01(v * scale)
    }
    if (task?.taskType === 'writing_task_exam' && writingExamTaskLooksFormFill(task, a.answerText)) {
      const bullets = effectiveWritingFormBullets(task, a.answerText ?? '')
      const layout01 = formFillLayoutScore01(a.answerText ?? '', bullets)
      if (layout01 != null && typeof scores.structure === 'number') {
        scores.structure = Math.max(scores.structure, layout01)
      }
    }
    return { ...a, composite: blended, scores }
  })
}

export function mergeEvaluationsGlossesAndReport(
  session: ExamSessionRecord,
  evaluations: Record<string, ExamLlmAnswerEvaluation>,
  sampleAnswerWordGlosses: ExamSessionRecord['sampleAnswerWordGlosses'],
  profile: ExamProfile,
): ExamSessionRecord {
  const attempts = applyLlmAnswerEvaluationsToAttempts(session, evaluations)
  const next: ExamSessionRecord = {
    ...session,
    attempts,
    llmAnswerEvaluations: evaluations,
    sampleAnswerWordGlosses,
    updatedAt: new Date().toISOString(),
  }
  const report = buildSimulationReport(next, profile)
  return { ...next, report }
}

async function attachSampleAnswerWordGlossesSafe(
  session: ExamSessionRecord,
  profile: ExamProfile,
): Promise<ExamSessionRecord> {
  try {
    return await attachSampleAnswerWordGlossesToSession(session, profile)
  } catch (e) {
    console.warn('[examSimulationLlmBlend] sample-answer gloss attach failed', e)
    return session
  }
}

/**
 * Prompt-fit + blended scores only (no gloss regeneration). Use for “Re-run AI prompt check”.
 */
export async function evaluateSimulationPromptFit(
  session: ExamSessionRecord,
  profile: ExamProfile,
): Promise<ExamSessionRecord> {
  const base = upgradeExamWritingTasksFromAttempts(session)
  const evaluations = await evaluateAllExamTaskAnswers({
    tasks: base.tasks,
    attempts: base.attempts,
    level: base.level,
  })
  const report = buildSimulationReport(base, profile)
  return mergeEvaluationsGlossesAndReport(
    { ...base, report },
    evaluations,
    session.sampleAnswerWordGlosses,
    profile,
  )
}

/** Merge evaluations, blend scores, rebuild report, and regenerate sample-answer glosses. */
export async function applyAnswerEvaluationsToSimulationSession(
  session: ExamSessionRecord,
  evaluations: Record<string, ExamLlmAnswerEvaluation>,
  profile: ExamProfile,
): Promise<ExamSessionRecord> {
  const report = buildSimulationReport(session, profile)
  const withReport = { ...session, report }
  const glossed = await attachSampleAnswerWordGlossesSafe(withReport, profile)
  return mergeEvaluationsGlossesAndReport(
    withReport,
    evaluations,
    glossed.sampleAnswerWordGlosses,
    profile,
  )
}

/**
 * Run answer-fit evaluation (LLM when configured), blend into per-task scores, rebuild report,
 * and regenerate sample-answer word glosses (LLM, in parallel with answer-fit when possible).
 */
export async function augmentSimulationSessionWithLlmScoring(
  session: ExamSessionRecord,
  profile: ExamProfile,
): Promise<ExamSessionRecord> {
  const base = upgradeExamWritingTasksFromAttempts(session)
  const report = buildSimulationReport(base, profile)
  const withReport = { ...base, report }
  const [evaluations, glossed] = await Promise.all([
    evaluateAllExamTaskAnswers({
      tasks: base.tasks,
      attempts: base.attempts,
      level: base.level,
    }),
    attachSampleAnswerWordGlossesSafe(withReport, profile),
  ])
  return mergeEvaluationsGlossesAndReport(
    withReport,
    evaluations,
    glossed.sampleAnswerWordGlosses,
    profile,
  )
}

/**
 * Full simulation reprocess: heuristic rescore + report rebuild + LLM answer-fit + sample-answer glosses.
 */
export async function reprocessCompletedSimulationSession(
  session: ExamSessionRecord,
  profile: ExamProfile,
): Promise<ExamSessionRecord | null> {
  const rescored = reprocessCompletedExamReport(session)
  if (!rescored) return null
  return augmentSimulationSessionWithLlmScoring(rescored, profile)
}
