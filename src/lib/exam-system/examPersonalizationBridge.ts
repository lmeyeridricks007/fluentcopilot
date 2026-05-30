/**
 * Maps Fluent Exam sessions into memory tags + practical-ability ids for personalization
 * (progression weaknesses, local weakness signals, mastery touches).
 */

import type { ExamScoringDimension, ExamSessionRecord, ExamTaskType, SimulationExamReport, TrainingExamReport } from './types'

const WEAK_COMPOSITE = 0.52
const WEAK_TASK_TYPE_AVG = 0.55

/** Task-type → practical abilities (opinions → nuance/reasoning surfaces; roleplay → flow, etc.). */
export const EXAM_TASK_TYPE_TO_ABILITY_IDS: Partial<Record<ExamTaskType, string[]>> = {
  give_opinion: ['work_introduction', 'small_talk'],
  justify_reason: ['work_introduction', 'doctor_conversation'],
  compare_options: ['work_introduction', 'small_talk'],
  roleplay: ['small_talk', 'fixing_misunderstandings'],
  follow_up_response: ['small_talk', 'doctor_conversation'],
  storytelling: ['small_talk', 'handling_delays'],
  sequencing: ['small_talk', 'transport_navigation'],
  explain_process: ['doctor_conversation', 'work_introduction'],
  describe_situation: ['doctor_conversation', 'small_talk'],
  practical_request: ['ordering_food', 'asking_for_help'],
  short_response: ['ordering_food', 'small_talk'],
  read_aloud_exam: ['small_talk', 'pharmacy_shopping'],
  listening_response_exam: ['asking_for_help', 'transport_navigation'],
  listening_mcq_exam: ['asking_for_help', 'transport_navigation'],
  writing_task_exam: ['gemeente_appointment', 'ordering_food'],
  knowledge_mcq: ['work_introduction', 'doctor_conversation'],
}

export function dedupeLowerTags(xs: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const x of xs) {
    const t = x.trim()
    if (!t) continue
    const k = t.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  return out
}

function weakTaskTypesFromAttempts(session: ExamSessionRecord): ExamTaskType[] {
  const byType = new Map<ExamTaskType, number[]>()
  for (const a of session.attempts) {
    const tk = session.tasks.find((t) => t.id === a.taskId)
    if (!tk) continue
    const list = byType.get(tk.taskType) ?? []
    list.push(a.composite)
    byType.set(tk.taskType, list)
  }
  const weak: ExamTaskType[] = []
  for (const [tt, scores] of byType) {
    if (scores.length < 1) continue
    const avg = scores.reduce((s, x) => s + x, 0) / scores.length
    if (avg < WEAK_COMPOSITE) weak.push(tt)
  }
  return weak
}

function weakTaskTypesFromSimulationReport(sim: SimulationExamReport): ExamTaskType[] {
  const weak: ExamTaskType[] = []
  for (const [tt, v] of Object.entries(sim.taskTypeAverages)) {
    if (typeof v === 'number' && v < WEAK_TASK_TYPE_AVG) {
      weak.push(tt as ExamTaskType)
    }
  }
  return weak
}

function dimensionTags(dims: Iterable<ExamScoringDimension | string>): string[] {
  const tags: string[] = []
  for (const d of dims) {
    const s = String(d)
    if (s === 'structure') tags.push('exam_structure_weak')
    if (s === 'pronunciation_delivery') tags.push('exam_pronunciation_weak')
    if (s === 'reason' || s === 'stance' || s === 'directness') tags.push('exam_reasoning_weak')
  }
  return tags
}

/**
 * Stable tags consumed by progression `weaknessesTargeted`, suggestion engine `collectWeaknesses`,
 * and client `recordLastPracticeWeakSignals`.
 */
export function buildExamMemoryWeaknessTags(session: ExamSessionRecord): string[] {
  if (session.status !== 'completed' || !session.report) return []

  const tags: string[] = []
  const meta = session.xpMeta
  const timed = Boolean(meta?.timedTraining) || session.mode === 'simulation'

  if (session.mode === 'simulation') {
    tags.push('exam_under_pressure')
  }
  if (timed) {
    tags.push('exam_timed_speaking')
  }

  const weakTypes = new Set<ExamTaskType>([
    ...weakTaskTypesFromAttempts(session),
    ...(session.report.kind === 'simulation' ? weakTaskTypesFromSimulationReport(session.report as SimulationExamReport) : []),
  ])

  for (const tt of weakTypes) {
    tags.push(`exam_task_weak:${tt}`)
    if (tt === 'roleplay') tags.push('exam_roleplay_weak')
    if (tt === 'follow_up_response') tags.push('exam_followup_weak')
    if (['give_opinion', 'justify_reason', 'compare_options'].includes(tt)) tags.push('exam_reasoning_weak')
  }

  const r = session.report
  if (r.kind === 'simulation') {
    const sim = r as SimulationExamReport
    if (sim.mainBlocker) tags.push(...dimensionTags([sim.mainBlocker]))
    if (sim.readinessBand === 'not_ready' || sim.readinessBand === 'borderline') {
      tags.push('exam_simulation_next')
    }
  } else {
    const tr = r as TrainingExamReport
    tags.push(...dimensionTags(tr.blockingDimensions))
  }

  if (
    timed &&
    (tags.includes('exam_pronunciation_weak') ||
      weakTypes.has('read_aloud_exam') ||
      weakTypes.has('listening_response_exam') ||
      weakTypes.has('listening_mcq_exam'))
  ) {
    tags.push('exam_pronunciation_timer')
  }

  return dedupeLowerTags(tags)
}

/** Union of ability ids to nudge in local mastery store after an exam session. */
export function abilityIdsFromExamSession(session: ExamSessionRecord): string[] {
  if (session.status !== 'completed') return []
  const ids = new Set<string>()
  const types = new Set<ExamTaskType>()
  for (const a of session.attempts) {
    const tk = session.tasks.find((t) => t.id === a.taskId)
    if (tk) types.add(tk.taskType)
  }
  for (const tt of types) {
    const mapped = EXAM_TASK_TYPE_TO_ABILITY_IDS[tt]
    if (mapped) for (const id of mapped) ids.add(id)
  }
  /** Always touch oral-exam-linked abilities lightly. */
  ids.add('small_talk')
  ids.add('work_introduction')
  return [...ids]
}

/** 0–1 quality estimate for mastery EMA from exam aggregate. */
export function examSessionCompositeQuality(session: ExamSessionRecord): number | null {
  const r = session.report
  if (!r) return null
  if (r.kind === 'simulation') {
    return Math.max(0, Math.min(1, (r as SimulationExamReport).overallScore01))
  }
  return Math.max(0, Math.min(1, (r as TrainingExamReport).qualityScore01))
}
