/**
 * Builds reading training sessions from the bank + difficulty preset.
 */
import { READING_TRAINING_BANK } from '@/lib/exam-prep/reading/readingTrainingBank'
import { filterItemsByPreset, type ReadingDifficultyPreset } from '@/lib/exam-prep/reading/readingDifficultyPolicy'
import type { ReadingSkill } from '@/lib/exam-prep/reading/readingSkillClassifier'
import type { ReadingTrainingItem } from '@/lib/schemas/exam/readingTrainingItem.schema'
import { DUO_READING_DURATION_SEC, DUO_READING_MCQ_COUNT, duoExamSeedFromSetId } from '@/lib/exam/duoExamStructure'

export const DEFAULT_READING_SESSION_SIZE = 5

function newSessionId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `rst-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Shuffle with deterministic seed (same approach as listening prep). */
export function shuffleDeterministic<T>(arr: T[], seed: number): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.abs(Math.sin(seed + i * 17) * 10000) % (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

function pickSessionItems(pool: ReadingTrainingItem[], count: number, seed: number): ReadingTrainingItem[] {
  const skills: ReadingSkill[] = ['scanning', 'comprehension']
  const bySkill = new Map<ReadingSkill, ReadingTrainingItem[]>()
  for (const s of skills) {
    bySkill.set(
      s,
      pool.filter((p) => p.readingSkill === s)
    )
  }

  const chosen: ReadingTrainingItem[] = []
  const used = new Set<string>()
  let rot = 0
  let safety = 0

  while (chosen.length < count && safety < count * 20) {
    safety += 1
    const skill = skills[rot % skills.length]!
    rot += 1
    const candidates = (bySkill.get(skill) ?? []).filter((x) => !used.has(x.id))
    if (candidates.length === 0) continue
    const pick = candidates[Math.floor(Math.abs(Math.sin(seed + chosen.length + rot) * 10000) % candidates.length)]!
    chosen.push(pick)
    used.add(pick.id)
  }

  if (chosen.length < count) {
    const rest = shuffleDeterministic(
      pool.filter((p) => !used.has(p.id)),
      seed
    )
    for (const p of rest) {
      if (chosen.length >= count) break
      chosen.push(p)
    }
  }

  return chosen.slice(0, count)
}

export function expandReadingTasksToExamCount(pool: ReadingTrainingItem[], count: number, seed: number): ReadingTrainingItem[] {
  if (pool.length === 0) throw new Error('Reading bank empty')
  const shuffled = shuffleDeterministic(pool, seed + 5)
  return Array.from({ length: count }, (_, i) => shuffled[i % shuffled.length]!)
}

export type ReadingSessionFlowMode = 'training' | 'duo_practice_exam'

export type ReadingTrainingSessionPlan = {
  sessionId: string
  preset: ReadingDifficultyPreset
  taskCount: number
  tasks: ReadingTrainingItem[]
  flowMode?: ReadingSessionFlowMode
  totalTimeLimitSec?: number
}

export function buildReadingTrainingSessionPlan(input: {
  preset: ReadingDifficultyPreset
  taskCount?: number
  seed?: number
}): ReadingTrainingSessionPlan {
  const taskCount = input.taskCount ?? DEFAULT_READING_SESSION_SIZE
  const seed = input.seed ?? Date.now()
  const pool = filterItemsByPreset(READING_TRAINING_BANK, input.preset)
  if (pool.length === 0) {
    throw new Error('No reading items for this difficulty preset')
  }
  const tasks = pickSessionItems(pool, Math.min(taskCount, pool.length), seed)

  return {
    sessionId: newSessionId(),
    preset: input.preset,
    taskCount: tasks.length,
    tasks,
  }
}

export function buildReadingPracticeExamPlanFromIds(taskIds: string[]): ReadingTrainingSessionPlan {
  const tasks = taskIds.map((id) => {
    const t = READING_TRAINING_BANK.find((x) => x.id === id)
    if (!t) throw new Error(`Reading practice exam: unknown task id ${id}`)
    return t
  })
  return {
    sessionId: newSessionId(),
    preset: 'standard',
    taskCount: tasks.length,
    tasks,
  }
}

/** DUO-style oefenexamen: 25 vragen, één globale klok (~65 min). */
export function buildReadingDuoPracticeExamPlan(setId: string): ReadingTrainingSessionPlan {
  const seed = duoExamSeedFromSetId(setId)
  const tasks = expandReadingTasksToExamCount(READING_TRAINING_BANK, DUO_READING_MCQ_COUNT, seed)
  return {
    sessionId: newSessionId(),
    preset: 'standard',
    taskCount: tasks.length,
    tasks,
    flowMode: 'duo_practice_exam',
    totalTimeLimitSec: DUO_READING_DURATION_SEC,
  }
}
