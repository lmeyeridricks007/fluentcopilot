/**
 * Canonical payload builders for Personalized Training Loops.
 * Single place for shape, trimming, and defaults so UI + runtimes stay consistent.
 */
import type {
  ListeningPersonalizedLoopPayload,
  MiniScenarioLoopPayload,
  PronunciationDrillLoopPayload,
  QuestionDrillLoopPayload,
  ReadAloudFixLoopPayload,
  RetrySentenceLoopPayload,
  StorytellingDrillLoopPayload,
  StructureDrillLoopPayload,
  WeakWordsLoopPayload,
} from './trainingLoopPayloads'

const MAX_WORD = 48
const MAX_SENTENCE = 220
const MAX_PASSAGE = 420
const MAX_PROMPT = 280

function clip(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1)).trim()}…`
}

function uniqNonEmpty(lines: (string | null | undefined)[], max: number): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of lines) {
    const s = (raw ?? '').trim().replace(/\s+/g, ' ')
    if (s.length < 4) continue
    const k = s.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(clip(s, MAX_SENTENCE))
    if (out.length >= max) break
  }
  return out
}

function uniqWords(words: string[], max: number): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of words) {
    const s = raw.trim().replace(/_/g, ' ').replace(/\s+/g, ' ')
    if (s.length < 2) continue
    const k = s.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(clip(s, MAX_WORD))
    if (out.length >= max) break
  }
  return out
}

/** Derive short context lines from example sentences or word list. */
function defaultContextLines(words: string[], examples: string[]): string[] {
  if (examples.length) {
    return examples.map((e) => {
      const first = e.split(/[.!?]\s/)[0]?.trim() ?? e
      return clip(first.length > 12 ? first : e, 120)
    })
  }
  return words.slice(0, 4).map((w) => `Practice “${clip(w, MAX_WORD)}” in isolation, then in a short line.`)
}

export function buildWeakWordsPayload(params: {
  words: string[]
  targetSkillIds: string[]
  exampleSentences?: string[]
  contextLines?: string[]
  referenceAudioUrls?: string[]
}): WeakWordsLoopPayload {
  const words = uniqWords(params.words, 8)
  const exampleSentences = uniqNonEmpty(params.exampleSentences ?? [], 4)
  const contextLines =
    params.contextLines?.length ? uniqNonEmpty(params.contextLines, 5) : defaultContextLines(words, exampleSentences)
  const referenceAudioUrls = (params.referenceAudioUrls ?? []).filter(Boolean).slice(0, 6)
  return {
    words,
    exampleSentences,
    contextLines,
    referenceAudioUrls,
    targetSkillIds: params.targetSkillIds.filter(Boolean),
  }
}

export function buildRetrySentencePayload(params: {
  learnerOriginal: string
  correctedVersion: string
  explanationShort: string
  referenceAudioUrl?: string | null
  compareAudioUrl?: string | null
}): RetrySentenceLoopPayload {
  const referenceAudioUrl = params.referenceAudioUrl ?? null
  const compareAudioUrl = params.compareAudioUrl ?? null
  const compareReplaySuggested = Boolean(compareAudioUrl && compareAudioUrl.length > 4)
  return {
    learnerOriginal: clip(params.learnerOriginal, 360),
    correctedVersion: clip(params.correctedVersion, 360),
    explanationShort: clip(params.explanationShort, 240) || 'Say it again with this smoother shape.',
    referenceAudioUrl,
    compareAudioUrl,
    compareReplaySuggested,
  }
}

export function buildMiniScenarioPayload(params: {
  scenarioId: string
  objective: string
  openingPrompt: string
  expectedSkillFocus: string[]
  scenarioVariant?: string | null
  targetTurnCount?: number
  supportingPhrase?: string | null
}): MiniScenarioLoopPayload {
  return {
    scenarioId: params.scenarioId,
    scenarioVariant: params.scenarioVariant ?? 'narrow_retry',
    objective: clip(params.objective, MAX_PROMPT),
    openingPrompt: clip(params.openingPrompt, MAX_PROMPT),
    expectedSkillFocus: params.expectedSkillFocus.filter(Boolean),
    targetTurnCount: params.targetTurnCount ?? 4,
    supportingPhrase: params.supportingPhrase?.trim() ? clip(params.supportingPhrase.trim(), 200) : null,
  }
}

export function buildReadAloudFixPayload(params: {
  passageText: string
  focusLabel: string
  targetWords: string[]
  targetSounds: string[]
  referenceAudioUrl?: string | null
  explanationShort?: string | null
}): ReadAloudFixLoopPayload {
  return {
    passageText: clip(params.passageText, MAX_PASSAGE),
    focusLabel: clip(params.focusLabel, 120),
    referenceAudioUrl: params.referenceAudioUrl ?? null,
    targetWords: uniqWords(params.targetWords, 8),
    targetSounds: params.targetSounds
      .map((s) => clip(String(s).trim(), 64))
      .filter((s) => s.length > 0)
      .slice(0, 8),
    explanationShort: params.explanationShort?.trim() ? clip(params.explanationShort.trim(), 240) : null,
  }
}

export function buildStructureDrillPayload(params: {
  prompts: string[]
  modelAnswers?: string[]
  targetPatternId: string | null
  patternLabel?: string | null
  skillFocus?: string[]
}): StructureDrillLoopPayload {
  let prompts = params.prompts.map((p) => clip(p, MAX_PROMPT)).filter(Boolean).slice(0, 3)
  if (prompts.length === 0) {
    prompts = [
      'Say one clear Dutch sentence for this drill.',
      'Say it again with a small upgrade—same meaning, cleaner shape.',
    ]
  } else if (prompts.length === 1) {
    prompts = [...prompts, 'Repeat with a calmer rhythm — fewer fillers.']
  }
  return {
    prompts,
    modelAnswers: uniqNonEmpty(params.modelAnswers ?? [], 4),
    targetPatternId: params.targetPatternId,
    patternLabel: params.patternLabel?.trim() ? clip(params.patternLabel.trim(), 120) : null,
    skillFocus: (params.skillFocus ?? []).filter(Boolean),
  }
}

export function buildQuestionDrillPayload(params: {
  prompts: string[]
  exampleQuestions: string[]
  targetQuestionType: string
  scenarioContext?: string | null
}): QuestionDrillLoopPayload {
  return {
    prompts: params.prompts.map((p) => clip(p, MAX_PROMPT)).filter(Boolean).slice(0, 4),
    exampleQuestions: uniqNonEmpty(params.exampleQuestions, 6).map((q) => clip(q, 120)),
    targetQuestionType: params.targetQuestionType || 'follow_up',
    scenarioContext: params.scenarioContext?.trim() ? clip(params.scenarioContext.trim(), 240) : null,
  }
}

export function buildStorytellingDrillPayload(params: {
  prompt: string
  expectedSteps: string[]
  modelStory: string
  targetSkillFocus: string[]
}): StorytellingDrillLoopPayload {
  return {
    prompt: clip(params.prompt, MAX_PROMPT),
    expectedSteps: params.expectedSteps.map((s) => clip(s, 120)).filter(Boolean).slice(0, 6),
    modelStory: clip(params.modelStory ?? '', 800),
    targetSkillFocus: params.targetSkillFocus.filter(Boolean),
  }
}

export function buildPronunciationDrillPayload(params: {
  words: string[]
  targetSkillIds: string[]
  soundFocus?: string | null
  tips?: string[]
  referenceAudioUrls?: string[]
}): PronunciationDrillLoopPayload {
  const words = uniqWords(
    params.words.map((w) => w.replace(/_/g, ' ')),
    8,
  )
  const tips = params.tips?.length
    ? uniqNonEmpty(params.tips, 3)
    : ['Slow the middle of each word, then snap the ending.']
  return {
    words,
    soundFocus: params.soundFocus?.trim() ? clip(params.soundFocus.trim(), 80) : null,
    tips,
    referenceAudioUrls: (params.referenceAudioUrls ?? []).filter(Boolean).slice(0, 6),
    targetSkillIds: params.targetSkillIds.filter(Boolean),
  }
}

export function buildListeningPersonalizedLoopPayload(params: {
  packId: string
  level: string
  scenarioKey: string | null
  variation?: string | null
  missedClipKeys: string[]
  listeningLoopKind: string
}): ListeningPersonalizedLoopPayload {
  const packId = clip(params.packId.trim() || 'pack-cafe-burst', 64)
  const lv = clip((params.level ?? 'A2').trim().toUpperCase(), 8)
  const level = lv === 'A1' || lv === 'A2' || lv === 'B1' ? lv : 'A2'
  const keys = [...new Set((params.missedClipKeys ?? []).map((k) => clip(k.trim(), 64)).filter(Boolean))].slice(0, 8)
  return {
    packId,
    level,
    scenarioKey: params.scenarioKey?.trim() ? clip(params.scenarioKey.trim(), 64) : null,
    variation: params.variation?.trim() ? clip(params.variation.trim(), 48) : null,
    missedClipKeys: keys,
    listeningLoopKind: clip(params.listeningLoopKind.trim() || 'listening_burst', 48),
  }
}
