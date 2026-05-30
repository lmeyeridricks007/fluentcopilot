/**
 * Strongly typed payloads per {@link TrainingLoopType} + safe parse for persisted JSON.
 */
import { z } from 'zod'
import type { TrainingLoopType } from './trainingLoopKinds'

export type WeakWordsLoopPayload = {
  words: string[]
  /** Full example sentences when available (e.g. from session evidence). */
  exampleSentences: string[]
  /** Short context lines for UI / skim (subset or paraphrase of evidence). */
  contextLines?: string[]
  referenceAudioUrls: string[]
  targetSkillIds: string[]
}

export type RetrySentenceLoopPayload = {
  learnerOriginal: string
  correctedVersion: string
  /** Short learner-facing “why” (same as product copy for this slot). */
  explanationShort: string
  referenceAudioUrl: string | null
  /** Learner clip for A/B replay when present. */
  compareAudioUrl?: string | null
  /** UI hint: show side-by-side replay when both URLs exist. */
  compareReplaySuggested?: boolean
}

export type MiniScenarioLoopPayload = {
  scenarioId: string
  scenarioVariant?: string | null
  objective: string
  /** Primary interaction prompt (first turn / how to start). */
  openingPrompt: string
  expectedSkillFocus: string[]
  /** Expected learner turns in the micro-drill (soft target). */
  targetTurnCount?: number
  /** Optional phrase bank or model line to lean on. */
  supportingPhrase?: string | null
}

export type ReadAloudFixLoopPayload = {
  passageText: string
  focusLabel: string
  referenceAudioUrl: string | null
  targetWords: string[]
  targetSounds: string[]
  /** Optional coach-style line explaining the focus. */
  explanationShort?: string | null
}

export type StructureDrillLoopPayload = {
  prompts: string[]
  modelAnswers: string[]
  targetPatternId: string | null
  /** Human-readable pattern name for UI headers. */
  patternLabel?: string | null
  skillFocus?: string[]
}

export type QuestionDrillLoopPayload = {
  prompts: string[]
  exampleQuestions: string[]
  targetQuestionType: string
  /** Free text: scenario title/slug or thread gist when helpful. */
  scenarioContext?: string | null
}

export type StorytellingDrillLoopPayload = {
  prompt: string
  expectedSteps: string[]
  /** Model / reference version of the story (may be empty until filled server-side). */
  modelStory: string
  targetSkillFocus: string[]
}

export type PronunciationDrillLoopPayload = {
  words: string[]
  soundFocus: string | null
  tips: string[]
  referenceAudioUrls: string[]
  targetSkillIds: string[]
}

/** Shared JSON shape for listening personalized loops (`LoopType` selects UX copy). */
export type ListeningPersonalizedLoopPayload = {
  packId: string
  level: string
  scenarioKey: string | null
  variation: string | null
  missedClipKeys: string[]
  listeningLoopKind: string
}

export type TrainingLoopPayloadByType = {
  weak_words: WeakWordsLoopPayload
  retry_sentence: RetrySentenceLoopPayload
  mini_scenario: MiniScenarioLoopPayload
  read_aloud_fix: ReadAloudFixLoopPayload
  structure_drill: StructureDrillLoopPayload
  pronunciation_drill: PronunciationDrillLoopPayload
  question_drill: QuestionDrillLoopPayload
  storytelling_drill: StorytellingDrillLoopPayload
  listening_burst: ListeningPersonalizedLoopPayload
  missed_detail_retry: ListeningPersonalizedLoopPayload
  fast_speech_burst: ListeningPersonalizedLoopPayload
  listen_and_reply: ListeningPersonalizedLoopPayload
  route_detail_drill: ListeningPersonalizedLoopPayload
  number_time_drill: ListeningPersonalizedLoopPayload
}

/** Union of all persisted payload shapes (loopType lives on the row, not inside JSON). */
export type TrainingLoopPayloadUnion = TrainingLoopPayloadByType[TrainingLoopType]

const weakWords = z.object({
  words: z.array(z.string()).default([]),
  exampleSentences: z.array(z.string()).default([]),
  contextLines: z.array(z.string()).optional(),
  referenceAudioUrls: z.array(z.string()).default([]),
  targetSkillIds: z.array(z.string()).default([]),
})

const retrySentence = z.object({
  learnerOriginal: z.string().default(''),
  correctedVersion: z.string().default(''),
  referenceAudioUrl: z.string().nullable().optional(),
  compareAudioUrl: z.string().nullable().optional(),
  explanationShort: z.string().default(''),
  compareReplaySuggested: z.boolean().optional(),
})

const miniScenario = z.object({
  scenarioId: z.string().default(''),
  scenarioVariant: z.string().nullable().optional(),
  objective: z.string().default(''),
  openingPrompt: z.string().default(''),
  expectedSkillFocus: z.array(z.string()).default([]),
  targetTurnCount: z.number().optional(),
  supportingPhrase: z.string().nullable().optional(),
})

const readAloudFix = z.object({
  passageText: z.string().default(''),
  focusLabel: z.string().default(''),
  referenceAudioUrl: z.string().nullable().optional(),
  targetWords: z.array(z.string()).default([]),
  targetSounds: z.array(z.string()).default([]),
  explanationShort: z.string().nullable().optional(),
})

const structureDrill = z.object({
  prompts: z.array(z.string()).default([]),
  modelAnswers: z.array(z.string()).default([]),
  targetPatternId: z.string().nullable().optional(),
  patternLabel: z.string().nullable().optional(),
  skillFocus: z.array(z.string()).optional(),
})

const questionDrill = z.object({
  prompts: z.array(z.string()).default([]),
  exampleQuestions: z.array(z.string()).default([]),
  targetQuestionType: z.string().default('follow_up'),
  scenarioContext: z.string().nullable().optional(),
})

const storytellingDrill = z.object({
  prompt: z.string().default(''),
  expectedSteps: z.array(z.string()).default([]),
  modelStory: z.string().default(''),
  targetSkillFocus: z.array(z.string()).default([]),
})

const pronunciationDrill = z.object({
  words: z.array(z.string()).default([]),
  soundFocus: z.string().nullable().optional(),
  tips: z.array(z.string()).default([]),
  referenceAudioUrls: z.array(z.string()).default([]),
  targetSkillIds: z.array(z.string()).default([]),
})

const listeningPersonalized = z.object({
  packId: z.string().default(''),
  level: z.string().default('A2'),
  scenarioKey: z.string().nullable().optional(),
  variation: z.string().nullable().optional(),
  missedClipKeys: z.array(z.string()).default([]),
  listeningLoopKind: z.string().default(''),
})

const listeningFallback = (): ListeningPersonalizedLoopPayload => ({
  packId: '',
  level: 'A2',
  scenarioKey: null,
  variation: null,
  missedClipKeys: [],
  listeningLoopKind: '',
})

/**
 * Normalizes DB / API JSON into the correct payload union. Never throws — falls back to empty-safe shapes.
 */
export function parseTrainingLoopPayloadFromStorage(loopType: TrainingLoopType, raw: unknown): TrainingLoopPayloadUnion {
  const base = typeof raw === 'object' && raw !== null ? raw : {}
  const safe = <T>(schema: z.ZodType<T>, fallback: T): T => {
    const r = schema.safeParse(base)
    return r.success ? r.data : fallback
  }
  switch (loopType) {
    case 'weak_words':
      return safe(weakWords, {
        words: [],
        exampleSentences: [],
        referenceAudioUrls: [],
        targetSkillIds: [],
      }) as WeakWordsLoopPayload
    case 'retry_sentence':
      return safe(retrySentence, {
        learnerOriginal: '',
        correctedVersion: '',
        referenceAudioUrl: null,
        compareAudioUrl: null,
        explanationShort: '',
      }) as RetrySentenceLoopPayload
    case 'mini_scenario':
      return safe(miniScenario, {
        scenarioId: '',
        scenarioVariant: null,
        objective: '',
        openingPrompt: '',
        expectedSkillFocus: [],
      }) as MiniScenarioLoopPayload
    case 'read_aloud_fix':
      return safe(readAloudFix, {
        passageText: '',
        focusLabel: '',
        referenceAudioUrl: null,
        targetWords: [],
        targetSounds: [],
      }) as ReadAloudFixLoopPayload
    case 'structure_drill':
      return safe(structureDrill, { prompts: [], modelAnswers: [], targetPatternId: null }) as StructureDrillLoopPayload
    case 'pronunciation_drill':
      return safe(pronunciationDrill, {
        words: [],
        soundFocus: null,
        tips: [],
        referenceAudioUrls: [],
        targetSkillIds: [],
      }) as PronunciationDrillLoopPayload
    case 'question_drill':
      return safe(questionDrill, { prompts: [], exampleQuestions: [], targetQuestionType: 'follow_up' }) as QuestionDrillLoopPayload
    case 'storytelling_drill':
      return safe(storytellingDrill, { prompt: '', expectedSteps: [], modelStory: '', targetSkillFocus: [] }) as StorytellingDrillLoopPayload
    case 'listening_burst':
    case 'missed_detail_retry':
    case 'fast_speech_burst':
    case 'listen_and_reply':
    case 'route_detail_drill':
    case 'number_time_drill':
      return safe(listeningPersonalized, listeningFallback()) as ListeningPersonalizedLoopPayload
  }
}
