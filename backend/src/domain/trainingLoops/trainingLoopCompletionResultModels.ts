/**
 * Structured completion outcomes per {@link TrainingLoopType}.
 * Used for audit, client merge, and gentle feedback into learning + skill systems.
 */
import type { TrainingLoopDifficulty, TrainingLoopType } from './trainingLoopKinds'
import type { TrainingLoopPayloadByType, TrainingLoopPayloadUnion } from './trainingLoopPayloads'

/** Minimal loop shape for completion merge (avoids circular import with trainingLoopTypes). */
export type TrainingLoopCompletionContext = {
  id: string
  loopType: TrainingLoopType
  title: string
  difficulty: TrainingLoopDifficulty
  payload: TrainingLoopPayloadUnion
}

export type WeakWordsLoopCompletionPayload = {
  loopType: 'weak_words'
  wordsAttempted: number
  wordsCompleted: number
}

export type RetrySentenceLoopCompletionPayload = {
  loopType: 'retry_sentence'
  replayCount?: number
  /** Learner or client hint — server defaults optimistic mild bump when absent. */
  selfReportedImprovement?: boolean | null
}

export type MiniScenarioLoopCompletionPayload = {
  loopType: 'mini_scenario'
  turnsCompleted?: number
  objectiveMet?: boolean | null
}

export type ReadAloudFixLoopCompletionPayload = {
  loopType: 'read_aloud_fix'
  passesCompleted?: number
}

export type StructureDrillLoopCompletionPayload = {
  loopType: 'structure_drill'
  promptsCompleted?: number
}

export type QuestionDrillLoopCompletionPayload = {
  loopType: 'question_drill'
  drillsCompleted?: number
}

export type StorytellingDrillLoopCompletionPayload = {
  loopType: 'storytelling_drill'
  stepsCompleted?: number
}

export type PronunciationDrillLoopCompletionPayload = {
  loopType: 'pronunciation_drill'
  itemsAttempted: number
  itemsCompleted: number
}

/** Listening-mode personalized loops — compact completion shape for merge + audit. */
export type ListeningLoopCompletionPayload = {
  loopType:
    | 'listening_burst'
    | 'missed_detail_retry'
    | 'fast_speech_burst'
    | 'listen_and_reply'
    | 'route_detail_drill'
    | 'number_time_drill'
  repsCompleted: number
}

export type TrainingLoopTypedCompletionPayload =
  | WeakWordsLoopCompletionPayload
  | RetrySentenceLoopCompletionPayload
  | MiniScenarioLoopCompletionPayload
  | ReadAloudFixLoopCompletionPayload
  | StructureDrillLoopCompletionPayload
  | QuestionDrillLoopCompletionPayload
  | StorytellingDrillLoopCompletionPayload
  | PronunciationDrillLoopCompletionPayload
  | ListeningLoopCompletionPayload

function clampInt(n: unknown, fallback: number, min: number, max: number): number {
  const x = typeof n === 'number' && Number.isFinite(n) ? Math.floor(n) : fallback
  return Math.min(max, Math.max(min, x))
}

function clampBool(n: unknown): boolean | null {
  if (n === true || n === false) return n
  if (n === null || n === undefined) return null
  return null
}

/** Server-side defaults when the client does not send a typed payload. */
export function buildDefaultTypedCompletionPayload(loop: TrainingLoopCompletionContext): TrainingLoopTypedCompletionPayload {
  switch (loop.loopType) {
    case 'weak_words': {
      const p = loop.payload as TrainingLoopPayloadByType['weak_words']
      const n = Math.max(1, p.words?.length ?? 1)
      return { loopType: 'weak_words', wordsAttempted: n, wordsCompleted: n }
    }
    case 'retry_sentence':
      return { loopType: 'retry_sentence', replayCount: 1, selfReportedImprovement: true }
    case 'mini_scenario': {
      const p = loop.payload as TrainingLoopPayloadByType['mini_scenario']
      return { loopType: 'mini_scenario', turnsCompleted: p.targetTurnCount ?? 2, objectiveMet: null }
    }
    case 'read_aloud_fix':
      return { loopType: 'read_aloud_fix', passesCompleted: 1 }
    case 'structure_drill': {
      const p = loop.payload as TrainingLoopPayloadByType['structure_drill']
      return { loopType: 'structure_drill', promptsCompleted: Math.max(1, p.prompts?.length ?? 1) }
    }
    case 'question_drill': {
      const p = loop.payload as TrainingLoopPayloadByType['question_drill']
      return { loopType: 'question_drill', drillsCompleted: Math.max(1, p.prompts?.length ?? 1) }
    }
    case 'storytelling_drill': {
      const p = loop.payload as TrainingLoopPayloadByType['storytelling_drill']
      return { loopType: 'storytelling_drill', stepsCompleted: Math.max(1, p.expectedSteps?.length ?? 1) }
    }
    case 'pronunciation_drill': {
      const p = loop.payload as TrainingLoopPayloadByType['pronunciation_drill']
      const n = Math.max(1, p.words?.length ?? 1)
      return { loopType: 'pronunciation_drill', itemsAttempted: n, itemsCompleted: n }
    }
    case 'listening_burst':
    case 'missed_detail_retry':
    case 'fast_speech_burst':
    case 'listen_and_reply':
    case 'route_detail_drill':
    case 'number_time_drill':
      return { loopType: loop.loopType, repsCompleted: 1 }
  }
}

/**
 * Merge optional client `typedSummary` (same discriminator as loop type) with server defaults.
 */
export function mergeTypedCompletionPayload(
  loop: TrainingLoopCompletionContext,
  client: unknown,
): TrainingLoopTypedCompletionPayload {
  const base = buildDefaultTypedCompletionPayload(loop)
  if (!client || typeof client !== 'object') return base
  const c = client as Record<string, unknown>
  if (c.loopType && String(c.loopType) !== loop.loopType) return base

  switch (loop.loopType) {
    case 'weak_words': {
      const b = base as WeakWordsLoopCompletionPayload
      const wordsAttempted = clampInt(c.wordsAttempted, b.wordsAttempted, 1, 200)
      const wordsCompleted = Math.min(
        wordsAttempted,
        clampInt(c.wordsCompleted, b.wordsCompleted, 0, 200),
      )
      return { loopType: 'weak_words', wordsAttempted, wordsCompleted }
    }
    case 'retry_sentence': {
      const b = base as RetrySentenceLoopCompletionPayload
      return {
        loopType: 'retry_sentence',
        replayCount: clampInt(c.replayCount, b.replayCount ?? 1, 1, 40),
        selfReportedImprovement: clampBool(c.selfReportedImprovement) ?? b.selfReportedImprovement ?? true,
      }
    }
    case 'mini_scenario': {
      const b = base as MiniScenarioLoopCompletionPayload
      return {
        loopType: 'mini_scenario',
        turnsCompleted: clampInt(c.turnsCompleted, b.turnsCompleted ?? 1, 0, 40),
        objectiveMet: clampBool(c.objectiveMet) ?? b.objectiveMet ?? null,
      }
    }
    case 'read_aloud_fix': {
      const b = base as ReadAloudFixLoopCompletionPayload
      return { loopType: 'read_aloud_fix', passesCompleted: clampInt(c.passesCompleted, b.passesCompleted ?? 1, 1, 20) }
    }
    case 'structure_drill': {
      const b = base as StructureDrillLoopCompletionPayload
      return {
        loopType: 'structure_drill',
        promptsCompleted: clampInt(c.promptsCompleted, b.promptsCompleted ?? 1, 1, 50),
      }
    }
    case 'question_drill': {
      const b = base as QuestionDrillLoopCompletionPayload
      return {
        loopType: 'question_drill',
        drillsCompleted: clampInt(c.drillsCompleted, b.drillsCompleted ?? 1, 1, 50),
      }
    }
    case 'storytelling_drill': {
      const b = base as StorytellingDrillLoopCompletionPayload
      return {
        loopType: 'storytelling_drill',
        stepsCompleted: clampInt(c.stepsCompleted, b.stepsCompleted ?? 1, 1, 40),
      }
    }
    case 'pronunciation_drill': {
      const b = base as PronunciationDrillLoopCompletionPayload
      const itemsAttempted = clampInt(c.itemsAttempted, b.itemsAttempted, 1, 200)
      const itemsCompleted = Math.min(
        itemsAttempted,
        clampInt(c.itemsCompleted, b.itemsCompleted, 0, 200),
      )
      return { loopType: 'pronunciation_drill', itemsAttempted, itemsCompleted }
    }
    case 'listening_burst':
    case 'missed_detail_retry':
    case 'fast_speech_burst':
    case 'listen_and_reply':
    case 'route_detail_drill':
    case 'number_time_drill': {
      const b = base as ListeningLoopCompletionPayload
      return {
        loopType: loop.loopType,
        repsCompleted: clampInt(c.repsCompleted, b.repsCompleted ?? 1, 1, 80),
      }
    }
  }
}

/** Short human-readable line stored on the completion result (and logs). */
export function buildCompletionInsight(
  loop: TrainingLoopCompletionContext,
  typed: TrainingLoopTypedCompletionPayload,
): string {
  switch (typed.loopType) {
    case 'weak_words':
      return `Weak-words rep: ${typed.wordsCompleted}/${typed.wordsAttempted} practiced (${loop.title}).`
    case 'retry_sentence':
      return typed.selfReportedImprovement
        ? `Sentence retry completed with improvement signal (${loop.title}).`
        : `Sentence retry completed (${loop.title}).`
    case 'mini_scenario':
      return `Mini scenario drill completed${typed.turnsCompleted != null ? ` · ~${typed.turnsCompleted} turns` : ''}.`
    case 'read_aloud_fix':
      return `Read-aloud focus pass completed (${loop.title}).`
    case 'structure_drill':
      return `Structure drill completed${typed.promptsCompleted != null ? ` · ${typed.promptsCompleted} prompts` : ''}.`
    case 'question_drill':
      return `Question drill completed${typed.drillsCompleted != null ? ` · ${typed.drillsCompleted} reps` : ''}.`
    case 'storytelling_drill':
      return `Storytelling steps completed${typed.stepsCompleted != null ? ` · ${typed.stepsCompleted} beats` : ''}.`
    case 'pronunciation_drill':
      return `Pronunciation drill: ${typed.itemsCompleted}/${typed.itemsAttempted} items (${loop.title}).`
    case 'listening_burst':
    case 'missed_detail_retry':
    case 'fast_speech_burst':
    case 'listen_and_reply':
    case 'route_detail_drill':
    case 'number_time_drill':
      return `Listening rep completed${typed.repsCompleted != null ? ` · ${typed.repsCompleted} reps` : ''} (${loop.title}).`
    default: {
      const _e: never = typed
      void _e
      return `Training loop completed (${loop.loopType}).`
    }
  }
}

/** Evidence magnitude 0..1 — capped; completion never fully “fixes” a weakness in one shot. */
export function completionEvidenceMagnitude(
  loop: TrainingLoopCompletionContext,
  typed: TrainingLoopTypedCompletionPayload | null | undefined,
): number {
  const base = loop.difficulty === 'stretch' ? 0.22 : 0.17
  if (!typed) return Math.min(0.3, base + 0.03)
  switch (typed.loopType) {
    case 'weak_words': {
      const denom = Math.max(1, typed.wordsAttempted)
      const ratio = Math.min(1, typed.wordsCompleted / denom)
      return Math.min(0.3, base + 0.08 * ratio)
    }
    case 'retry_sentence':
      return Math.min(0.3, base + (typed.selfReportedImprovement ? 0.06 : 0.02))
    case 'mini_scenario':
      return Math.min(0.3, base + (typed.objectiveMet ? 0.07 : 0.03))
    case 'read_aloud_fix':
      return Math.min(0.3, base + 0.04 * Math.min(3, typed.passesCompleted ?? 1))
    case 'structure_drill':
    case 'question_drill':
    case 'storytelling_drill':
      return Math.min(0.3, base + 0.04)
    case 'pronunciation_drill': {
      const denom = Math.max(1, typed.itemsAttempted)
      const ratio = Math.min(1, typed.itemsCompleted / denom)
      return Math.min(0.3, base + 0.07 * ratio)
    }
    case 'listening_burst':
    case 'missed_detail_retry':
    case 'fast_speech_burst':
    case 'listen_and_reply':
    case 'route_detail_drill':
    case 'number_time_drill': {
      const denom = Math.max(1, typed.repsCompleted)
      const ratio = Math.min(1, typed.repsCompleted / denom)
      return Math.min(0.3, base + 0.05 * ratio)
    }
    default:
      return Math.min(0.3, base + 0.03)
  }
}

export function typedPayloadLoopType(t: TrainingLoopTypedCompletionPayload): TrainingLoopType {
  return t.loopType
}

/** Stored on completion (SQL + audit); `typedSummary` is merged server/client. */
export type TrainingLoopCompletionResult = {
  completedAt: string
  profileMergeApplied: boolean
  weaknessKeysTouched: string[]
  skillIdsBumped: string[]
  source: 'server' | 'client'
  clientNote?: string | null
  typedSummary?: TrainingLoopTypedCompletionPayload | null
  completionInsight?: string | null
}
