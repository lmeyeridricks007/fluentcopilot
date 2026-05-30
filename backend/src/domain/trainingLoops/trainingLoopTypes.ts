/**
 * Personalized Training Loops — persisted drill rows + generation metadata.
 */
import type { TrainingLoopPayloadUnion } from './trainingLoopPayloads'
import type { TrainingLoopCompletionResult } from './trainingLoopCompletionResultModels'
import type {
  LoopSlot,
  TrainingLoopConfidence,
  TrainingLoopDifficulty,
  TrainingLoopSourceType,
  TrainingLoopStatus,
  TrainingLoopType,
} from './trainingLoopKinds'

export type {
  LoopSlot,
  TrainingLoopConfidence,
  TrainingLoopDifficulty,
  TrainingLoopEventType,
  TrainingLoopSourceType,
  TrainingLoopStatus,
  TrainingLoopType,
} from './trainingLoopKinds'

/** @deprecated Use {@link TrainingLoopConfidence} */
export type LoopConfidence = TrainingLoopConfidence

export type PersonalizedTrainingLoop = {
  id: string
  userId: string
  sourceSessionId: string
  threadId: string | null
  sourceType: TrainingLoopSourceType
  sourceScenarioId: string | null
  loopSlot: LoopSlot
  loopType: TrainingLoopType
  title: string
  subtitle?: string | null
  reason: string
  targetSkills: string[]
  targetWeaknessKeys: string[]
  estimatedMinutes: number
  difficulty: TrainingLoopDifficulty
  payload: TrainingLoopPayloadUnion
  createdAt: string
  updatedAt: string
  expiresAt?: string | null
  status: TrainingLoopStatus
  confidence: TrainingLoopConfidence
  priorityScore: number
  dedupeKey?: string | null
  /** Dev-only when requested; omitted in normal API serialization. */
  generationDebug?: TrainingLoopGenerationDebug | null
  /** Present when status is completed and column exists (migration 036). */
  lastCompletionResult?: TrainingLoopCompletionResult | null
}

/** Pre-persist candidate produced by the generation engine (before id/timestamps/status). */
export type TrainingLoopCandidate = Omit<
  PersonalizedTrainingLoop,
  | 'id'
  | 'userId'
  | 'createdAt'
  | 'updatedAt'
  | 'expiresAt'
  | 'status'
  | 'generationDebug'
  | 'dedupeKey'
  | 'lastCompletionResult'
> & {
  dedupeKey: string
  rankReason: string
}

export type { TrainingLoopCompletionResult } from './trainingLoopCompletionResultModels'

/** Partial update for administrative or future tooling (not all fields are mutable in SQL). */
export type TrainingLoopPatch = Partial<
  Pick<
    PersonalizedTrainingLoop,
    | 'title'
    | 'subtitle'
    | 'reason'
    | 'priorityScore'
    | 'expiresAt'
    | 'confidence'
    | 'estimatedMinutes'
    | 'targetSkills'
    | 'targetWeaknessKeys'
    | 'difficulty'
  >
> & {
  payload?: TrainingLoopPayloadUnion
}

export type TrainingLoopGenerationDebug = {
  candidates: TrainingLoopCandidateSummary[]
  chosenPrimary?: { id: string; loopType: TrainingLoopType } | null
  chosenSecondary?: { id: string; loopType: TrainingLoopType } | null
  chosenStretch?: { id: string; loopType: TrainingLoopType } | null
  suppressedDuplicates: string[]
  rankingNotes: string[]
}

export type TrainingLoopCandidateSummary = {
  loopType: TrainingLoopType
  title: string
  priorityScore: number
  rankReason: string
  dedupeKey: string
}

export type TrainingLoopPracticeNowBundle = {
  primary: PersonalizedTrainingLoop | null
  secondary: PersonalizedTrainingLoop | null
  stretch: PersonalizedTrainingLoop | null
  /** Present for dev tools + local diagnostics only. */
  debug?: TrainingLoopGenerationDebug | null
}

/** Merged into skill-system dev debug (`personalizedTrainingLoops`) when Dev Tools requests the extended payload. */
export type TrainingLoopDevDiagnosticsSnapshot = {
  activeLoopsWithGenerationDebug: Array<{
    loopId: string
    loopSlot: number
    threadId: string | null
    sourceSessionId: string
    loopType: string
    title: string
    status: string
    updatedAt: string
    generationDebug: TrainingLoopGenerationDebug | null
  }>
  recentLifecycleEvents: Array<{
    id: string
    loopId: string
    eventType: string
    createdAt: string
    loopType: string | null
    loopTitle: string | null
    loopSlot: number | null
    resultPreview: string | null
  }>
}
