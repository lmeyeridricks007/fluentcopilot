/**
 * Builds multi-question Speaking training sessions (client-side runtime).
 * Aligns with `examSessionSchema.exerciseRefs` as question ids.
 */
import { SPEAKING_TRAINING_BANK } from '@/lib/exam-prep/speaking/speakingTrainingBank'
import { orderSpeakingItemsForProgression } from '@/lib/exam-prep/speaking/speakingProgressionPolicy'
import {
  listEligibleSpeakingScenarioGroups,
  SPEAKING_SCENARIO_GROUP_LABELS,
} from '@/lib/exam-prep/speaking/speakingScenarioGrouping'
import type { SpeakingScenarioGroupId } from '@/lib/schemas/exam/speakingTrainingItem.schema'
import type { SpeakingTrainingItem } from '@/lib/schemas/exam/speakingTrainingItem.schema'

export const DEFAULT_SPEAKING_TRAINING_SESSION_SIZE = 3

export type SpeakingTrainingSessionPlan = {
  /** Client runtime id */
  sessionId: string
  scenarioGroupId: SpeakingScenarioGroupId
  topicTitleNl: string
  topicSubtitleNl: string
  questionCount: number
  /** Ordered for progression */
  questions: SpeakingTrainingItem[]
  /** Ids in order — mirrors `ExamSession.exerciseRefs` */
  exerciseRefs: string[]
  estimatedMinutes: number
}

function newSessionId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Pick `count` items from one group; prefer distinct difficulty bands when possible.
 */
export function pickSpeakingItemsForGroup(
  groupId: SpeakingScenarioGroupId,
  count: number,
  seed: number
): SpeakingTrainingItem[] {
  const pool = SPEAKING_TRAINING_BANK.filter((q) => q.scenarioGroupId === groupId)
  if (pool.length < count) {
    throw new Error(`Group ${groupId} has only ${pool.length} items; need ${count}`)
  }

  const byBand = new Map<number, SpeakingTrainingItem[]>()
  for (const q of pool) {
    const arr = byBand.get(q.difficultyBand) ?? []
    arr.push(q)
    byBand.set(q.difficultyBand, arr)
  }

  const bands = [...byBand.keys()].sort((a, b) => a - b)
  const chosen: SpeakingTrainingItem[] = []
  const used = new Set<string>()

  const takeFromBand = (band: number) => {
    const arr = (byBand.get(band) ?? []).filter((q) => !used.has(q.id))
    if (arr.length === 0) return
    const idx = Math.abs((Math.sin(seed + band * 17 + chosen.length) * 10000) % 1)
    const pick = arr[Math.floor(idx * arr.length) % arr.length]!
    chosen.push(pick)
    used.add(pick.id)
  }

  for (const b of bands) {
    if (chosen.length >= count) break
    takeFromBand(b)
  }

  let rot = 0
  while (chosen.length < count) {
    const rest = pool.filter((q) => !used.has(q.id))
    if (rest.length === 0) break
    const pick = rest[rot % rest.length]!
    chosen.push(pick)
    used.add(pick.id)
    rot += 1
  }

  return orderSpeakingItemsForProgression(chosen.slice(0, count))
}

export function buildSpeakingTrainingSessionPlan(input: {
  scenarioGroupId: SpeakingScenarioGroupId
  questionCount?: number
  seed?: number
}): SpeakingTrainingSessionPlan {
  const questionCount = input.questionCount ?? DEFAULT_SPEAKING_TRAINING_SESSION_SIZE
  const seed = input.seed ?? Date.now()
  const questions = pickSpeakingItemsForGroup(input.scenarioGroupId, questionCount, seed)
  const meta = SPEAKING_SCENARIO_GROUP_LABELS[input.scenarioGroupId]

  return {
    sessionId: newSessionId(),
    scenarioGroupId: input.scenarioGroupId,
    topicTitleNl: meta.titleNl,
    topicSubtitleNl: meta.subtitleNl,
    questionCount: questions.length,
    questions,
    exerciseRefs: questions.map((q) => q.id),
    estimatedMinutes: Math.max(6, questions.length * 4),
  }
}

export function defaultSpeakingTrainingScenarioOptions(
  questionCount: number = DEFAULT_SPEAKING_TRAINING_SESSION_SIZE
): SpeakingScenarioGroupId[] {
  return listEligibleSpeakingScenarioGroups(questionCount)
}
