/**
 * Fixed-structure speaking exam simulation (A2): one item per question subtype.
 *
 * @see docs/product/exam-prep-architecture.md
 */
import { SPEAKING_TRAINING_BANK } from '@/lib/exam-prep/speaking/speakingTrainingBank'
import {
  buildSpeaking2025QuestionList,
  buildSpeaking2025SectionLabels,
  DUO_SPEAKING_2025_DURATION_SEC,
  speaking2025SectionForIndex,
  type Speaking2025Section,
} from '@/lib/exam-prep/speaking/speakingExam2025PlanBuilder'
import { orderSpeakingItemsForProgression } from '@/lib/exam-prep/speaking/speakingProgressionPolicy'
import type { SpeakingTrainingItem } from '@/lib/schemas/exam/speakingTrainingItem.schema'
import { duoExamSeedFromSetId } from '@/lib/exam/duoExamStructure'

/** Questions in the full DUO-style speaking simulation (2025 product target). */
export const SPEAKING_SIMULATION_QUESTION_COUNT = buildSpeaking2025QuestionList(0).length

export type SpeakingSimulationSessionPlan = {
  sessionId: string
  questionCount: number
  questions: SpeakingTrainingItem[]
  exerciseRefs: string[]
  titleNl: string
  subtitleNl: string
  estimatedMinutes: number
  /** Pooled exam time (seconds) — single global clock. */
  totalDurationSec: number
  /** Maps each question index to a 2025 exam section. */
  speaking2025Sections: Speaking2025Section[]
}

function newSessionId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `sim-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Full DUO-style speaking simulation (2025 structure): 18 prompts, one global timer (~35 min).
 */
export function buildSpeakingSimulationSessionPlan(seed: number = Date.now()): SpeakingSimulationSessionPlan {
  const questions = buildSpeaking2025QuestionList(seed)
  const speaking2025Sections = buildSpeaking2025SectionLabels()

  return {
    sessionId: newSessionId(),
    questionCount: questions.length,
    questions,
    exerciseRefs: questions.map((q) => q.id),
    titleNl: 'Sprekensimulatie (A2 — structuur 2025)',
    subtitleNl:
      'Geen hints tijdens het examen. Video-/afbeelding-/gespreksdelen in één doorlopende sessie; aan het eind één rapport.',
    estimatedMinutes: Math.ceil(DUO_SPEAKING_2025_DURATION_SEC / 60),
    totalDurationSec: DUO_SPEAKING_2025_DURATION_SEC,
    speaking2025Sections,
  }
}

/** Fixed practice exam: same full 2025-length session; `seed` varies per set for item order. */
export function buildSpeakingDuoPracticeExamPlan(input: {
  setId: string
  titleNl: string
  subtitleNl: string
}): SpeakingSimulationSessionPlan {
  const seed = duoExamSeedFromSetId(input.setId)
  const questions = buildSpeaking2025QuestionList(seed + 101)
  const speaking2025Sections = buildSpeaking2025SectionLabels()
  return {
    sessionId: newSessionId(),
    questionCount: questions.length,
    questions,
    exerciseRefs: questions.map((q) => q.id),
    titleNl: input.titleNl,
    subtitleNl: input.subtitleNl,
    estimatedMinutes: Math.ceil(DUO_SPEAKING_2025_DURATION_SEC / 60),
    totalDurationSec: DUO_SPEAKING_2025_DURATION_SEC,
    speaking2025Sections,
  }
}

/** @deprecated Use buildSpeakingDuoPracticeExamPlan — kept for scripts/tests that pin four ids. */
export function buildSpeakingSimulationPlanFromQuestionIds(
  ids: readonly [string, string, string, string],
  titleNl: string,
  subtitleNl: string
): SpeakingSimulationSessionPlan {
  const questions = ids.map((id) => {
    const q = SPEAKING_TRAINING_BANK.find((x) => x.id === id)
    if (!q) throw new Error(`Speaking practice exam: unknown question id ${id}`)
    return q
  })
  const ordered = orderSpeakingItemsForProgression(questions)
  const speaking2025Sections = ordered.map((_, i) => speaking2025SectionForIndex(i))
  return {
    sessionId: newSessionId(),
    questionCount: ordered.length,
    questions: ordered,
    exerciseRefs: ordered.map((q) => q.id),
    titleNl,
    subtitleNl,
    estimatedMinutes: Math.max(10, ordered.length * 3),
    totalDurationSec: ordered.length * 90,
    speaking2025Sections,
  }
}
