import type { ApiPersonalizedTrainingLoop } from '@/lib/api/apiTypes'

type WeakWordsPayload = {
  words?: string[]
  practiceHints?: string[]
  referenceAudioUrls?: string[]
}

type PronunciationDrillPayload = {
  words?: string[]
  referenceAudioUrls?: string[]
}

type RetrySentencePayload = {
  learnerOriginal?: string
  correctedVersion?: string
  explanationShort?: string
  referenceAudioUrl?: string | null
  compareAudioUrl?: string | null
}

type ReadAloudFixPayload = {
  passageText?: string
  focusLabel?: string
  referenceAudioUrl?: string | null
  targetWords?: string[]
}

type PromptListPayload = {
  prompts?: string[]
  exampleQuestions?: string[]
  prompt?: string
  openingPrompt?: string
  supportingPhrase?: string
}

function asRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
}

export function weakWordsLines(
  loop: ApiPersonalizedTrainingLoop,
): { text: string; referenceAudioUrl: string | null; practiceHint: string | null }[] {
  const p = asRecord(loop.payload) as WeakWordsPayload
  const words = Array.isArray(p.words) ? p.words.filter((w) => typeof w === 'string' && w.trim()) : []
  const refs = Array.isArray(p.referenceAudioUrls) ? p.referenceAudioUrls : []
  const hints = Array.isArray(p.practiceHints) ? p.practiceHints : []
  return words.map((w, i) => ({
    text: w.trim(),
    referenceAudioUrl: typeof refs[i] === 'string' ? refs[i]! : null,
    practiceHint: typeof hints[i] === 'string' && hints[i]!.trim() ? hints[i]!.trim() : null,
  }))
}

export function pronunciationDrillLines(loop: ApiPersonalizedTrainingLoop): { text: string; referenceAudioUrl: string | null }[] {
  const p = asRecord(loop.payload) as PronunciationDrillPayload
  const words = Array.isArray(p.words) ? p.words.filter((w) => typeof w === 'string' && w.trim()) : []
  const refs = Array.isArray(p.referenceAudioUrls) ? p.referenceAudioUrls : []
  return words.map((w, i) => ({
    text: w.trim(),
    referenceAudioUrl: typeof refs[i] === 'string' ? refs[i]! : null,
  }))
}

export function retrySentencePractice(loop: ApiPersonalizedTrainingLoop): RetrySentencePayload {
  const p = asRecord(loop.payload) as RetrySentencePayload
  return {
    learnerOriginal: typeof p.learnerOriginal === 'string' ? p.learnerOriginal : undefined,
    correctedVersion: typeof p.correctedVersion === 'string' ? p.correctedVersion : undefined,
    explanationShort: typeof p.explanationShort === 'string' ? p.explanationShort : undefined,
    referenceAudioUrl: typeof p.referenceAudioUrl === 'string' ? p.referenceAudioUrl : null,
    compareAudioUrl: typeof p.compareAudioUrl === 'string' ? p.compareAudioUrl : null,
  }
}

export function readAloudFixPractice(loop: ApiPersonalizedTrainingLoop): ReadAloudFixPayload {
  const p = asRecord(loop.payload) as ReadAloudFixPayload
  return {
    passageText: typeof p.passageText === 'string' ? p.passageText : undefined,
    focusLabel: typeof p.focusLabel === 'string' ? p.focusLabel : undefined,
    referenceAudioUrl: typeof p.referenceAudioUrl === 'string' ? p.referenceAudioUrl : null,
    targetWords: Array.isArray(p.targetWords) ? p.targetWords.filter((w) => typeof w === 'string') : [],
  }
}

/** First speakable prompt for open-ended drills. */
export function firstSpeakPrompt(loop: ApiPersonalizedTrainingLoop): string | null {
  const p = asRecord(loop.payload) as PromptListPayload
  const candidates = [
    ...(Array.isArray(p.prompts) ? p.prompts : []),
    ...(Array.isArray(p.exampleQuestions) ? p.exampleQuestions : []),
    p.openingPrompt,
    p.supportingPhrase,
    p.prompt,
  ]
  for (const raw of candidates) {
    if (typeof raw === 'string' && raw.trim().length >= 4) return raw.trim()
  }
  return null
}
