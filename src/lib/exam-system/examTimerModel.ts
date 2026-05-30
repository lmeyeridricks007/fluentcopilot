import type { ExamProfile, ExamSectionBlueprint, ExamTaskInstance } from './types'

export function formatExamClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

export function getSectionsForRun(profile: ExamProfile, mode: 'simulation' | 'training'): ExamSectionBlueprint[] {
  return mode === 'simulation' ? profile.simulationBlueprint.sections : profile.trainingBlueprint.sections
}

export function findSectionBlueprint(
  sections: ExamSectionBlueprint[],
  sectionId: string,
): ExamSectionBlueprint | undefined {
  return sections.find((sec) => sec.id === sectionId)
}

/**
 * When both profile rule and section blueprint define a cap, use the tighter budget.
 */
export function resolveSectionWallBudgetSeconds(ruleSeconds: number, blueprintSectionSeconds?: number): number | null {
  const r = ruleSeconds > 0 ? ruleSeconds : null
  const b = typeof blueprintSectionSeconds === 'number' && blueprintSectionSeconds > 0 ? blueprintSectionSeconds : null
  if (r != null && b != null) return Math.min(r, b)
  return r ?? b ?? null
}

/** Sum prep+answer for contiguous tasks in the same section starting at `fromIdx`. */
export function sumRestOfSectionTaskSeconds(
  tasks: Pick<ExamTaskInstance, 'sectionId' | 'prepSeconds' | 'answerSeconds'>[],
  fromIdx: number,
): number {
  const t = tasks[fromIdx]
  if (!t) return 0
  const sid = t.sectionId
  let sum = 0
  for (let i = fromIdx; i < tasks.length; i++) {
    if (tasks[i].sectionId !== sid) break
    sum += tasks[i].prepSeconds + tasks[i].answerSeconds
  }
  return sum
}

/** Remaining wall clock for tasks still to run in the current section (from this task onward). */
export function sectionPaceRemainingSeconds(
  tasks: Pick<ExamTaskInstance, 'sectionId' | 'prepSeconds' | 'answerSeconds'>[],
  taskIndex: number,
  phase: 'prep' | 'answer',
  remainingInPhase: number,
): number {
  const t = tasks[taskIndex]
  if (!t) return 0
  const sid = t.sectionId
  let sum = Math.max(0, remainingInPhase)
  if (phase === 'prep') {
    sum += t.answerSeconds
  }
  for (let i = taskIndex + 1; i < tasks.length; i++) {
    if (tasks[i].sectionId !== sid) break
    sum += tasks[i].prepSeconds + tasks[i].answerSeconds
  }
  return sum
}

/** Session wall-clock remaining (intro/prep/answer aware; training has no intro). */
export function computeSessionWallClockRemaining(params: {
  tasks: Pick<ExamTaskInstance, 'prepSeconds' | 'answerSeconds'>[]
  taskIndex: number
  isSim: boolean
  simPhase: 'intro' | 'prep' | 'answer'
  trainPhase: 'prep' | 'answer' | 'reflect'
  remainingCurrentPhaseSec: number
}): number {
  const { tasks, taskIndex, isSim, simPhase, trainPhase, remainingCurrentPhaseSec } = params
  const t = tasks[taskIndex]
  if (!t) return 0
  if (trainPhase === 'reflect') return 0

  let rest = Math.max(0, remainingCurrentPhaseSec)

  if (isSim) {
    if (simPhase === 'intro') {
      rest += t.prepSeconds + t.answerSeconds
      for (let i = taskIndex + 1; i < tasks.length; i++) {
        rest += tasks[i].prepSeconds + tasks[i].answerSeconds
      }
    } else if (simPhase === 'prep') {
      rest += t.answerSeconds
      for (let i = taskIndex + 1; i < tasks.length; i++) {
        rest += tasks[i].prepSeconds + tasks[i].answerSeconds
      }
    } else {
      for (let i = taskIndex + 1; i < tasks.length; i++) {
        rest += tasks[i].prepSeconds + tasks[i].answerSeconds
      }
    }
  } else if (trainPhase === 'prep') {
    rest += t.answerSeconds
    for (let i = taskIndex + 1; i < tasks.length; i++) {
      rest += tasks[i].prepSeconds + tasks[i].answerSeconds
    }
  } else if (trainPhase === 'answer') {
    for (let i = taskIndex + 1; i < tasks.length; i++) {
      rest += tasks[i].prepSeconds + tasks[i].answerSeconds
    }
  }

  return rest
}

export function resolveTotalEstimateDisplaySeconds(profile: ExamProfile): number | null {
  const fromBlueprint = profile.simulationBlueprint.totalEstimateSeconds
  if (typeof fromBlueprint === 'number' && fromBlueprint > 0) return fromBlueprint
  const rule = profile.timers.simulation.find((r) => r.kind === 'total_estimate')
  if (rule && rule.seconds > 0) return rule.seconds
  return null
}

/** Wall-clock seconds left for the full simulation budget (ticks down while the run page is open). */
export function computeFullExamWallRemaining(params: {
  totalEstimateSec: number
  startedAtMs: number
  nowMs: number
}): number {
  const elapsed = Math.max(0, Math.floor((params.nowMs - params.startedAtMs) / 1000))
  return Math.max(0, params.totalEstimateSec - elapsed)
}

export function sumSessionTasksSeconds(tasks: Pick<ExamTaskInstance, 'prepSeconds' | 'answerSeconds'>[]): number {
  return tasks.reduce((acc, x) => acc + x.prepSeconds + x.answerSeconds, 0)
}
