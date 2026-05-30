import type {
  ExamProfile,
  ExamScoringDimension,
  ExamSessionRecord,
  ExamTaskAttempt,
  ExamTaskInstance,
  ExamTaskType,
  ExamTrainingSupport,
  ReadinessConfidence,
  SimulationExamReport,
  SimulationQuestionBreakdown,
  TrainingExamReport,
} from './types'
import {
  aggregateAttempts,
  aggregateBySection,
  aggregateByTaskType,
  computeRetryLift01,
  computeTrainingQualityScore01,
  dimensionsImprovedFormative,
  mcqSubmissionMatchesCorrect,
} from './scoringEngine'
import { examTaskWithFormFillRubricIfNeeded, writingExamTaskLooksFormFillPrompt } from './writingExamFillInCompose'
import { writingExamRegisterFromTask } from './writingExamRegister'
import {
  writingExamDimensionRationaleLines,
  writingExamPersonalizedFeedbackLines,
  writingExamScoreSummary,
} from './writingFormFillReportFeedback'
import { synthesizeWritingReportExampleForTask } from './a2WritingExamSynthesizedExamples'
import { personalizeWritingFormFillIdealAnswer } from './writingFormFillPersonalizedIdeal'
import {
  isSynthesizableSpeakingTaskType,
  synthesizeSpeakingReportExampleNl,
} from './speakingExamSynthesizedExamples'
import { recommendNextTraining } from './recommendations'
import { buildCorrectedExampleNl } from './trainingCoach'

function nowIso(): string {
  return new Date().toISOString()
}

function pickExtreme(
  avgs: Partial<Record<ExamScoringDimension, number>>,
): { strongest: ExamScoringDimension | null; weakest: ExamScoringDimension | null } {
  const entries = Object.entries(avgs) as [ExamScoringDimension, number][]
  if (!entries.length) return { strongest: null, weakest: null }
  entries.sort((a, b) => b[1] - a[1])
  return { strongest: entries[0][0], weakest: entries[entries.length - 1][0] }
}

export function readinessBandFromScore(
  score01: number,
  profile: ExamProfile,
): SimulationExamReport['readinessBand'] {
  const t = profile.ui.passReadiness
  if (score01 >= t.readyAbove) return 'ready'
  if (score01 >= t.borderlineAbove) return 'borderline'
  return 'not_ready'
}

const readinessFromScore = readinessBandFromScore

export type SimulationReportDisplayStats = {
  /** Exam-equivalent average (unanswered = 0). Use this for the headline number. */
  examEquivalentScore01: number
  /** Average composite across answered tasks only. */
  answeredScore01: number
  /** Tasks the learner submitted an answer for. */
  attemptedCount: number
  /** Total tasks in the simulation. */
  totalTaskCount: number
  /**
   * Pass-readiness band re-derived against the exam-equivalent score so legacy stored
   * reports (which banded on the answered-tasks average) show the corrected band.
   */
  readinessBand: SimulationExamReport['readinessBand']
  /** True when the learner answered every task. */
  isComplete: boolean
}

/**
 * Resolve the four headline numbers (exam-equivalent score, answered-tasks average,
 * attempted count, total task count) from a session + report pair, with backward
 * compatibility for reports stored before the exam-equivalent scoring change.
 *
 * Legacy contract: `overallScore01` was the answered-tasks average. For those reports we
 * derive the exam-equivalent value as `answered_avg * attemptedCount / totalTaskCount`,
 * which exactly equals `sum(composites) / totalTaskCount`.
 */
export function resolveSimulationReportDisplayStats(
  session: ExamSessionRecord,
  report: SimulationExamReport,
  profile?: ExamProfile,
): SimulationReportDisplayStats {
  const attemptedCount = report.attemptedCount ?? session.attempts.length
  const totalTaskCount = report.totalTaskCount ?? session.tasks.length

  const hasNewFields = report.attemptedCount !== undefined && report.totalTaskCount !== undefined
  let answeredScore01: number
  let examEquivalentScore01: number
  if (hasNewFields) {
    answeredScore01 = report.answeredScore01 ?? report.overallScore01
    examEquivalentScore01 = report.overallScore01
  } else {
    answeredScore01 = report.overallScore01
    examEquivalentScore01 =
      totalTaskCount > 0 ? (answeredScore01 * attemptedCount) / totalTaskCount : 0
  }

  const isComplete = totalTaskCount > 0 && attemptedCount >= totalTaskCount
  const readinessBand = profile
    ? readinessBandFromScore(examEquivalentScore01, profile)
    : report.readinessBand

  return {
    examEquivalentScore01: clamp01(examEquivalentScore01),
    answeredScore01: clamp01(answeredScore01),
    attemptedCount,
    totalTaskCount,
    readinessBand,
    isComplete,
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

function readinessConfidenceFromAttempts(attempts: ExamTaskAttempt[]): ReadinessConfidence {
  if (attempts.length >= 8) return 'high'
  if (attempts.length >= 4) return 'medium'
  return 'limited'
}

function simulationReadinessConfidenceNotes(
  attempts: ExamTaskAttempt[],
  scope: ExamSessionRecord['scope'],
): string[] {
  const n = attempts.length
  const notes: string[] = []
  if (n >= 8) notes.push(`Per-task evidence: ${n} scored responses — high statistical depth for this session.`)
  else if (n >= 4) notes.push(`Per-task evidence: ${n} scored responses — medium depth; borderline outcomes still noisy.`)
  else notes.push(`Per-task evidence: only ${n} scored responses — **limited** depth; treat band as directional.`)
  if (scope === 'section') {
    notes.push('Scope was **section** — full-exam simulation aggregates more task types and usually shifts confidence.')
  } else {
    notes.push('Scope was **full** — aggregates all sections in this profile run.')
  }
  notes.push('Simulation uses stricter dimension scaling than training on the same text (exam-like curve).')
  return notes
}

function trainingSessionEvidenceConfidence(attempts: ExamTaskAttempt[]): ReadinessConfidence {
  if (attempts.length >= 8) return 'high'
  if (attempts.length >= 4) return 'medium'
  return 'limited'
}

function trainingSessionEvidenceNotes(attempts: ExamTaskAttempt[], support: ExamTrainingSupport): string[] {
  const n = attempts.length
  const notes: string[] = [
    `Training support mode **${support.replace(/_/g, ' ')}** — formative scaling (not pass/fail exam law).`,
  ]
  notes.push(
    n >= 6
      ? 'Enough scored attempts for stable formative dimension averages.'
      : 'Few attempts — dimension averages are exploratory; use retries to lift signal.',
  )
  const retries = attempts.filter((a, i, arr) => arr.findIndex((x) => x.taskId === a.taskId) !== i).length
  if (retries) notes.push('Retry ladder detected — retry lift summarizes how much later tries helped per task.')
  return notes
}

function blockedMarksLines(blocking: ExamScoringDimension[]): string[] {
  return blocking.map(
    (d) =>
      `${d.replace(/_/g, ' ')}: averaged below the formative bar (0.55) across this session’s scored attempts — review structure and length on that dimension.`,
  )
}

function promptSummaryNl(prompt: string, maxLen = 140): string {
  const lines = prompt
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  const first = lines[0] ?? prompt.replace(/\s+/g, ' ').trim()
  if (first.length <= maxLen) return first
  return `${first.slice(0, Math.max(1, maxLen - 1))}…`
}

function isWritingFormFillTask(task: ExamTaskInstance): boolean {
  return task.taskType === 'writing_task_exam' && writingExamTaskLooksFormFillPrompt(task)
}

function mergeReportTipsUnique(first: string[], second: string[], max: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of [...first, ...second]) {
    const t = s.trim()
    const k = t.toLowerCase()
    if (!t || seen.has(k)) continue
    seen.add(k)
    out.push(t)
    if (out.length >= max) break
  }
  return out
}

function pickWeakestDimensions(
  scores: Partial<Record<ExamScoringDimension, number>>,
  dims: ExamScoringDimension[],
  n: number,
): ExamScoringDimension[] {
  const keys = (dims.length ? dims : (Object.keys(scores) as ExamScoringDimension[])).filter(
    (d) => typeof scores[d] === 'number',
  )
  if (!keys.length) return []
  return [...keys].sort((a, b) => (scores[a] ?? 0) - (scores[b] ?? 0)).slice(0, n)
}

function dimensionSimulationTip(dim: ExamScoringDimension, task?: ExamTaskInstance): string {
  if (task && isWritingFormFillTask(task)) {
    switch (dim) {
      case 'task_completion':
        return 'Each field should contain believable Dutch content for what was asked (for example a real-looking name and address, plus a clear one-sentence reason where required).'
      case 'completeness':
        return 'Do not skip lines: fill every item the form lists (name, address, motivation, date, etc.) before you submit.'
      case 'structure':
        return 'Keep each answer easy to read — one field per line or directly under the printed label, as on a real form.'
      case 'grammar_control':
        return 'At A2, small spelling slips are fine — re-read names, postcodes (often “1234 AB” with a space), and the motivation line once before you submit.'
      case 'relevance':
        return 'The short “why” should fit the situation (library, sports club, insurance, etc.) and read like real Dutch, not random characters.'
      case 'natural_wording':
        return 'Use simple, natural Dutch in each box — especially the one-sentence motivation.'
      default:
        break
    }
  }
  switch (dim) {
    case 'task_completion':
      return 'Answer every part of the prompt and match the expected length (for example ~30–40 words for a short email or message).'
    case 'natural_wording':
      return 'Use simple everyday words you would use in daily life, and double-check basic spelling.'
    case 'grammar_control':
      return 'Prefer short, correct sentences; keep present tense consistent and use the perfect tense only when you need it.'
    case 'structure':
      return 'Make the message easy to follow: short lines or paragraphs, one main idea per sentence, and clear connectors where needed.'
    case 'politeness':
      if (task && writingExamRegisterFromTask(task) === 'informal_app') {
        return 'Informal app: “Hoi …” and “Groetjes,” fit this task — not “Geachte …” / “Met vriendelijke groet,”.'
      }
      if (task && writingExamRegisterFromTask(task) === 'formal_mail') {
        return 'Formal mail: “Geachte heer/mevrouw,” and “Met vriendelijke groet,” with your name.'
      }
      return 'Match formality: formal mail uses Geachte… / Met vriendelijke groet; informal apps use Hoi… / Groetjes,.'
    case 'pronunciation_delivery':
      return 'Slow down slightly, finish word endings, and record again focusing on the hardest sounds in the prompt.'
    case 'understandability':
    case 'clarity':
      return 'Simplify what you say: shorter units, fewer stacked clauses, and a clear main point in the first sentence.'
    case 'listening_accuracy':
    case 'relevance':
      return 'Listen for keywords in the audio or stem, eliminate distractors, and re-check the question before you submit.'
    case 'directness':
    case 'completion':
      return 'State your request or answer the question directly in the first sentence, then add one supporting detail.'
    case 'stance':
    case 'reason':
      return 'Name your position clearly and add one concrete reason (want/omdat) so the examiner sees your argument.'
    case 'responsiveness':
    case 'continuation':
      return 'React to the last cue: acknowledge it, then add a new piece of information or a follow-up question.'
    case 'sequence':
    case 'tense_flow':
      return 'Signal order (first, then, finally / vroeger, nu) so the listener can follow the timeline.'
    case 'completeness':
      return 'Include each required element from the instructions before you stop — use the checklist in the prompt.'
    default: {
      /**
       * Defensive default for any future {@link ExamScoringDimension} variants. The known cases above
       * narrow `dim` to `never`, so cast through `string` to keep this branch valid at the type level.
       */
      const label = String(dim).replace(/_/g, ' ')
      return `Practice ${label} with similar timed tasks in Exam Train.`
    }
  }
}

function taskTypeContextTip(taskType: ExamTaskType, task?: ExamTaskInstance): string | null {
  if (taskType === 'knowledge_mcq' || taskType === 'listening_mcq_exam') {
    return 'On multiple choice: read every option, rule out wrong answers, then confirm your selection matches the question.'
  }
  if (taskType === 'read_aloud_exam') {
    return 'Read the whole line once silently, then aloud with steady pace and clear stress on content words.'
  }
  if (taskType === 'writing_task_exam') {
    if (task && isWritingFormFillTask(task)) {
      return 'For this form: use Dutch only, fill exactly what each line asks for, and keep each answer clearly separated — no email greeting or closing is required.'
    }
    return 'For writing: address each bullet in the assignment, keep sentences simple, and leave time to check greetings and sign-off.'
  }
  return null
}

function mcqCorrectAnswerSummaryNl(task: ExamTaskInstance): string | undefined {
  const mcq = task.mcq
  if (!mcq?.correctOptionIds?.length || !mcq.options?.length) return undefined
  const labels = mcq.correctOptionIds
    .map((id) => mcq.options.find((o) => o.id === id)?.label)
    .filter(Boolean) as string[]
  if (!labels.length) return undefined
  return `Juiste optie(s): ${labels.join(' · ')}`
}

function resolveModelAnswerNl(
  task: ExamTaskInstance,
  level: ExamSessionRecord['level'],
  userAnswer?: string,
): { text?: string; isScaffold: boolean; personalized?: boolean } {
  if (task.taskType === 'knowledge_mcq' || task.taskType === 'listening_mcq_exam') {
    const line = mcqCorrectAnswerSummaryNl(task)
    if (line) return { text: line, isScaffold: false }
  }
  const ex = task.trainingExampleNl?.trim()
  if (ex) return { text: ex, isScaffold: false }
  if (task.taskType === 'writing_task_exam') {
    if (userAnswer?.trim()) {
      const personalized = personalizeWritingFormFillIdealAnswer(task, userAnswer)
      if (personalized.isPersonalized) {
        return { text: personalized.text, isScaffold: false, personalized: true }
      }
    }
    const syn = synthesizeWritingReportExampleForTask(task)
    return { text: syn.text, isScaffold: syn.isScaffold }
  }
  /**
   * Speaking simulation banks rarely populate `example`, so the report would otherwise show
   * "No reference answer available". Synthesize a task-type-appropriate model line — for follow-up
   * tasks it picks up the quoted statement to make the reply contextual.
   */
  if (isSynthesizableSpeakingTaskType(task.taskType)) {
    const syn = synthesizeSpeakingReportExampleNl({
      taskType: task.taskType,
      promptNl: task.promptNl,
      level,
    })
    return { text: syn.text, isScaffold: syn.isScaffold }
  }
  return { text: undefined, isScaffold: false }
}

function improvementTipsForSimulationQuestion(
  attempt: ExamTaskAttempt | undefined,
  task: ExamTaskInstance,
  weakDims: ExamScoringDimension[],
): string[] {
  const tips: string[] = []
  const seen = new Set<string>()
  const add = (s: string) => {
    const t = s.trim()
    if (!t || seen.has(t)) return
    seen.add(t)
    tips.push(t)
  }

  const isMcqTask =
    Boolean(task.mcq?.options?.length) &&
    (task.taskType === 'knowledge_mcq' || task.taskType === 'listening_mcq_exam')

  /** KNM computer exam items: report shows result + key + English stem only — no coaching bullets. */
  const isKnmComputerExamenMcq =
    task.taskType === 'knowledge_mcq' && task.sectionId === 'a2_knm_examen' && Boolean(task.mcq?.options?.length)

  if (isMcqTask) {
    if (isKnmComputerExamenMcq) {
      return []
    }
    if (!attempt) {
      add('No scored answer for this task — run a short simulation or Exam Train block on the same section.')
      return tips
    }
    const picked = attempt.answerText?.trim() ?? ''
    if (!picked) {
      add('No option was submitted. In the exam, choose your best answer before time runs out.')
      return tips
    }
    const ok = mcqSubmissionMatchesCorrect(task.mcq!.correctOptionIds, picked)
    if (ok) {
      add('This multiple-choice item was scored as correct.')
    } else {
      add('This item was scored as incorrect. Compare your choice to the correct answer and re-read what the question asks.')
    }
    return tips
  }

  if (!attempt) {
    add('No scored answer for this task — run a short simulation or Exam Train block on the same section.')
    return tips
  }

  for (const d of weakDims) {
    add(dimensionSimulationTip(d, task))
  }
  const ctx = taskTypeContextTip(task.taskType, task)
  if (ctx) add(ctx)

  if (attempt.composite >= 0.78 && tips.length < 2) {
    add('Strong on this item — keep checking task instructions and time so performance stays stable under pressure.')
  }
  if (tips.length === 0) {
    add('Redo a similar task with the timer on and compare your answer point-by-point to the prompt checklist.')
  }
  return tips.slice(0, 4)
}

/**
 * Per-question simulation breakdown (task order, scores, tips). Safe to call on completed sessions;
 * use for UI when older stored reports omit `questionBreakdown`.
 */
export function buildSimulationQuestionBreakdown(
  session: ExamSessionRecord,
  profile: ExamProfile,
): SimulationQuestionBreakdown[] {
  const byTaskId = new Map(session.attempts.map((a) => [a.taskId, a]))
  return session.tasks.map((task, i) => {
    const attempt = byTaskId.get(task.id)
    const isMcqTask =
      Boolean(task.mcq?.options?.length) &&
      (task.taskType === 'knowledge_mcq' || task.taskType === 'listening_mcq_exam')
    const taskForWritingScore =
      task.taskType === 'writing_task_exam' ? examTaskWithFormFillRubricIfNeeded(task, attempt?.answerText) : task

    let dims: ExamScoringDimension[] =
      taskForWritingScore.scoringDimensions.length > 0
        ? taskForWritingScore.scoringDimensions
        : (Object.keys(attempt?.scores ?? {}) as ExamScoringDimension[])

    let weakDims: ExamScoringDimension[] =
      attempt && !isMcqTask ? pickWeakestDimensions(attempt.scores, dims, 2) : []
    let score01 = attempt?.composite ?? 0
    let tips = improvementTipsForSimulationQuestion(attempt, taskForWritingScore, weakDims)
    const userAnswerText = attempt?.answerText?.trim() ?? ''
    const model = resolveModelAnswerNl(task, session.level, attempt?.answerText)
    let dimensionScores: Partial<Record<ExamScoringDimension, number>> | undefined =
      !isMcqTask && attempt && Object.keys(attempt.scores).length > 0 ? { ...attempt.scores } : undefined

    if (attempt && task.taskType === 'writing_task_exam' && !isMcqTask) {
      dims = taskForWritingScore.scoringDimensions.length
        ? taskForWritingScore.scoringDimensions
        : (Object.keys(attempt.scores) as ExamScoringDimension[])
      weakDims = pickWeakestDimensions(attempt.scores, dims, 2)
      score01 = attempt.composite
      dimensionScores = Object.fromEntries(
        dims.map((d) => [d, attempt.scores[d]]).filter(([, v]) => typeof v === 'number'),
      ) as Partial<Record<ExamScoringDimension, number>>
      const dimRationales = writingExamDimensionRationaleLines(
        task,
        attempt.answerText,
        attempt.scores,
        session.level,
      )
      const personalized = writingExamPersonalizedFeedbackLines(taskForWritingScore, attempt.answerText)
      const generic = improvementTipsForSimulationQuestion(attempt, taskForWritingScore, weakDims)
      const scoreSummary = writingExamScoreSummary(attempt.composite, attempt.scores, task, attempt.answerText)
      tips = mergeReportTipsUnique([scoreSummary], dimRationales, 8)
      tips = mergeReportTipsUnique(tips, personalized, 8)
      tips = mergeReportTipsUnique(tips, generic, 6)
      if (tips.length === 0 && userAnswerText) {
        tips = writingExamPersonalizedFeedbackLines(taskForWritingScore, attempt.answerText)
      }
    }

    return {
      index1Based: i + 1,
      taskId: task.id,
      sectionId: task.sectionId,
      sectionTitle: profile.supportedSections.find((s) => s.id === task.sectionId)?.title,
      taskType: task.taskType,
      promptSummaryNl: promptSummaryNl(task.promptNl),
      score01,
      userAnswerText,
      modelAnswerNl: model.text,
      modelAnswerIsScaffold: model.isScaffold ? true : undefined,
      modelAnswerPersonalized: model.personalized ? true : undefined,
      dimensionScores,
      weakDimensions: weakDims,
      improvementTips: tips,
    }
  })
}

export function buildSimulationReport(session: ExamSessionRecord, profile: ExamProfile): SimulationExamReport {
  const attempts = session.attempts
  const dimAvg = aggregateAttempts(attempts)
  const taskAvg = aggregateByTaskType(attempts)
  const attemptedCount = attempts.length
  const totalTaskCount = session.tasks.length
  const attemptedSum = attempts.reduce((a, t) => a + t.composite, 0)
  const answeredScore01 = attemptedCount > 0 ? attemptedSum / attemptedCount : 0
  // Exam-equivalent: unanswered tasks contribute 0 to the average. This mirrors how a real
  // exam grader treats blanks and prevents a partial run (e.g. 2 of 12) from showing a
  // misleadingly high headline number derived from only the attempted slice.
  const score01 = totalTaskCount > 0 ? attemptedSum / totalTaskCount : 0
  const { strongest, weakest } = pickExtreme(dimAvg)
  const bySec = aggregateBySection(attempts)
  const sectionScores = Object.entries(bySec).map(([sectionId, agg]) => ({
    sectionId,
    title: profile.supportedSections.find((s) => s.id === sectionId)?.title,
    score01: agg.score01,
    taskCount: agg.count,
  }))
  const readinessConfidence = readinessConfidenceFromAttempts(attempts)
  const readinessConfidenceNotes = simulationReadinessConfidenceNotes(attempts, session.scope)
  const questionBreakdown = buildSimulationQuestionBreakdown(session, profile)

  return {
    kind: 'simulation',
    profileId: session.profileId,
    level: session.level,
    scope: session.scope,
    readinessBand: readinessFromScore(score01, profile),
    readinessConfidence,
    overallScore01: score01,
    readinessScore01: score01,
    answeredScore01,
    attemptedCount,
    totalTaskCount,
    strongestDimension: strongest,
    mainBlocker: weakest,
    dimensionAverages: dimAvg,
    taskTypeAverages: taskAvg,
    sectionScores,
    questionBreakdown,
    readinessConfidenceNotes,
    nextTrainingRecommendation: recommendNextTraining({
      weakestDimension: weakest,
      weakestTaskType:
        (Object.entries(taskAvg) as [ExamTaskType, number][]).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null,
      mode: 'simulation',
    }),
    generatedAt: nowIso(),
  }
}

export function buildTrainingReport(
  session: ExamSessionRecord,
  _profile: ExamProfile,
  support: ExamTrainingSupport,
): TrainingExamReport {
  const attempts = session.attempts
  const dimAvg = aggregateAttempts(attempts)
  const trendImproved = dimensionsImprovedFormative(attempts, 0.04)
  const entries = Object.entries(dimAvg) as [ExamScoringDimension, number][]
  const improvedAbsolute = entries.filter(([, v]) => v >= 0.62).map(([k]) => k as ExamScoringDimension)
  const improved = Array.from(new Set([...improvedAbsolute, ...trendImproved]))
  const blocking = entries.filter(([, v]) => v < 0.55).map(([k]) => k as ExamScoringDimension)
  const { strongest } = pickExtreme(dimAvg)
  const last = attempts[attempts.length - 1]
  const taskAvg = aggregateByTaskType(attempts)
  const weakestTask =
    (Object.entries(taskAvg) as [ExamTaskType, number][]).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null
  const readinessMovementLabel =
    attempts.length >= 6
      ? 'Solid practice volume — book a short simulation to see if exam readiness moves.'
      : attempts.length >= 3
        ? 'Early signal forming — one more focused training block will clarify what improves.'
        : 'Short burst — add another session before expecting a clear readiness shift.'

  const qualityScore01 = computeTrainingQualityScore01(attempts)
  const retryLift01 = computeRetryLift01(attempts)
  const sessionEvidenceConfidence = trainingSessionEvidenceConfidence(attempts)
  const sessionEvidenceNotes = trainingSessionEvidenceNotes(attempts, support)
  const blockedMarksExplainers = blockedMarksLines(blocking.length ? blocking : (['structure'] as ExamScoringDimension[]))
  const bestNext = recommendNextTraining({
    weakestDimension: (blocking.length ? blocking : (['structure'] as ExamScoringDimension[]))[0] ?? null,
    weakestTaskType: weakestTask,
    mode: 'training',
  })

  return {
    kind: 'training',
    profileId: session.profileId,
    level: session.level,
    trainingSupport: support,
    trainingEntryMode: session.xpMeta?.trainingEntryMode,
    qualityScore01,
    improvedDimensions: improved,
    blockingDimensions: blocking.length ? blocking : (['structure'] as ExamScoringDimension[]),
    blockedMarksExplainers,
    strongestDimension: strongest,
    correctedExampleNl: last ? buildCorrectedExampleNl(last.answerText, last.taskType) : undefined,
    retrySuggestions: (blocking.length ? blocking : (['structure'] as ExamScoringDimension[]))
      .slice(0, 3)
      .map((d) => `Short drill: one answer focused on ${d}.`),
    bestNextDrill: bestNext,
    nextBestTrainingAction: bestNext,
    retryLift01,
    sessionEvidenceConfidence,
    sessionEvidenceNotes,
    readinessMovementLabel,
    readinessDelta01: support === 'almost_exam' ? 0.03 : 0.02,
    generatedAt: nowIso(),
  }
}
