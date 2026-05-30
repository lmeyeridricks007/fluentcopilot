/**
 * Builds listening training sessions from the bank + difficulty preset.
 */
import { LISTENING_TRAINING_BANK } from '@/lib/exam-prep/listening/listeningTrainingBank'
import { filterItemsByPreset, type ListeningDifficultyPreset } from '@/lib/exam-prep/listening/listeningDifficultyPolicy'
import type { ListeningQuestionType } from '@/lib/schemas/exam/listeningTrainingItem.schema'
import type { ListeningTrainingItem } from '@/lib/schemas/exam/listeningTrainingItem.schema'
import { DUO_LISTENING_DURATION_SEC, DUO_LISTENING_MCQ_COUNT, duoExamSeedFromSetId } from '@/lib/exam/duoExamStructure'

export const DEFAULT_LISTENING_SESSION_SIZE = 5

function newSessionId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `lst-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Shuffle with deterministic seed (Fisher–Yates-ish using sin).
 */
export function shuffleDeterministic<T>(arr: T[], seed: number): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.abs(Math.sin(seed + i * 17) * 10000) % (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/**
 * Prefer round-robin question types when enough items exist.
 */
function pickSessionItems(pool: ListeningTrainingItem[], count: number, seed: number): ListeningTrainingItem[] {
  const types: ListeningQuestionType[] = ['gist', 'detail', 'intent']
  const byType = new Map<ListeningQuestionType, ListeningTrainingItem[]>()
  for (const t of types) {
    byType.set(
      t,
      pool.filter((p) => p.questionType === t)
    )
  }

  const chosen: ListeningTrainingItem[] = []
  const used = new Set<string>()
  let rot = 0
  let safety = 0

  while (chosen.length < count && safety < count * 20) {
    safety += 1
    const type = types[rot % types.length]!
    rot += 1
    const candidates = (byType.get(type) ?? []).filter((x) => !used.has(x.id))
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

export function expandListeningTasksToExamCount(pool: ListeningTrainingItem[], count: number, seed: number): ListeningTrainingItem[] {
  if (pool.length === 0) throw new Error('Listening bank empty')
  const shuffled = shuffleDeterministic(pool, seed + 13)
  return Array.from({ length: count }, (_, i) => shuffled[i % shuffled.length]!)
}

export type ListeningSessionFlowMode = 'training' | 'duo_practice_exam'

export type ListeningTrainingSessionPlan = {
  sessionId: string
  preset: ListeningDifficultyPreset
  taskCount: number
  tasks: ListeningTrainingItem[]
  flowMode?: ListeningSessionFlowMode
  totalTimeLimitSec?: number
  maxAudioStartsPerTask?: number
}

export function buildListeningTrainingSessionPlan(input: {
  preset: ListeningDifficultyPreset
  taskCount?: number
  seed?: number
}): ListeningTrainingSessionPlan {
  const taskCount = input.taskCount ?? DEFAULT_LISTENING_SESSION_SIZE
  const seed = input.seed ?? Date.now()
  const pool = filterItemsByPreset(LISTENING_TRAINING_BANK, input.preset)
  if (pool.length === 0) {
    throw new Error('No listening items for this difficulty preset')
  }
  const tasks = pickSessionItems(pool, Math.min(taskCount, pool.length), seed)

  return {
    sessionId: newSessionId(),
    preset: input.preset,
    taskCount: tasks.length,
    tasks,
  }
}

/** Fixed practice exam — standard preset timing; tasks in stable bank order. */
export function buildListeningPracticeExamPlanFromIds(taskIds: string[]): ListeningTrainingSessionPlan {
  const tasks = taskIds.map((id) => {
    const t = LISTENING_TRAINING_BANK.find((x) => x.id === id)
    if (!t) throw new Error(`Listening practice exam: unknown task id ${id}`)
    return t
  })
  return {
    sessionId: newSessionId(),
    preset: 'standard',
    taskCount: tasks.length,
    tasks,
  }
}

/** DUO-style oefenexamen: 25 vragen, ~40 min, max 2 herhalingen per fragment. */
export function buildListeningDuoPracticeExamPlan(setId: string): ListeningTrainingSessionPlan {
  const seed = duoExamSeedFromSetId(setId)
  const pool = filterItemsByPreset(LISTENING_TRAINING_BANK, 'standard')
  const tasks = expandListeningTasksToExamCount(pool, DUO_LISTENING_MCQ_COUNT, seed)
  return {
    sessionId: newSessionId(),
    preset: 'standard',
    taskCount: tasks.length,
    tasks,
    flowMode: 'duo_practice_exam',
    totalTimeLimitSec: DUO_LISTENING_DURATION_SEC,
    maxAudioStartsPerTask: 3,
  }
}
