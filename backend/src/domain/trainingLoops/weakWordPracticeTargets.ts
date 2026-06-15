import type { LiveSessionEvaluation } from '../../services/speak-live/liveVoiceEvaluationTypes'
import type { TurnEvaluation } from '../../services/speak-live/liveVoiceEvaluationTypes'
import { normalizeWordKey } from '../learningMemory/learningInsightNormalization'
import type { TrainingLoopType } from './trainingLoopKinds'
import type { PronunciationDrillLoopPayload, WeakWordsLoopPayload } from './trainingLoopPayloads'

const NL_WORD = /[\p{L}\p{N}'-]+/gu

function tokenizeNl(text: string): string[] {
  return text.match(NL_WORD) ?? []
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i]![0] = i
  for (let j = 0; j <= n; j++) dp[0]![j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost)
    }
  }
  return dp[m]![n]!
}

function azureWeakWords(turn: TurnEvaluation): string[] {
  const az = turn.azureSpeechEvaluation as { weakWords?: string[] } | undefined
  return Array.isArray(az?.weakWords) ? az.weakWords.filter((w) => typeof w === 'string' && w.trim()) : []
}

function fuzzyMaxDistance(a: string, b: string): number {
  return Math.min(4, Math.ceil(Math.max(a.length, b.length) / 3))
}

/** Infer observed→target from reference Dutch vs what the learner actually said. */
export function buildReferenceTranscriptCorrectionMap(
  evaluation: LiveSessionEvaluation | null | undefined,
): Map<string, string> {
  const map = new Map<string, string>()
  for (const turn of evaluation?.turnEvaluations ?? []) {
    const ref = turn.referenceSentence?.trim()
    const learner = turn.learnerTranscript?.trim()
    if (!ref || !learner) continue

    const refWords = tokenizeNl(ref)
    const learnerWords = tokenizeNl(learner)
    const refLower = new Set(refWords.map((w) => w.toLowerCase()))
    const weakTokens = new Set(azureWeakWords(turn).map((w) => normalizeWordKey(w)))
    for (const ww of turn.wrongWordDetections ?? []) {
      const obs = ww.observedToken?.trim()
      if (obs) weakTokens.add(normalizeWordKey(obs))
    }

    const minLen = Math.min(refWords.length, learnerWords.length)
    for (let i = 0; i < minLen; i++) {
      const lw = learnerWords[i]!
      const rw = refWords[i]!
      if (lw.toLowerCase() === rw.toLowerCase()) continue
      const ll = lw.toLowerCase()
      const rl = rw.toLowerCase()
      if (levenshtein(ll, rl) > fuzzyMaxDistance(ll, rl)) continue
      map.set(normalizeWordKey(lw), rw)
    }

    for (const lw of learnerWords) {
      const ll = lw.toLowerCase()
      if (refLower.has(ll)) continue
      if (!weakTokens.has(normalizeWordKey(lw))) continue

      let best: { word: string; dist: number } | null = null
      for (const rw of refWords) {
        const rl = rw.toLowerCase()
        if (rl === ll || rl.length < 3) continue
        const dist = levenshtein(ll, rl)
        if (dist <= 0 || dist > fuzzyMaxDistance(ll, rl)) continue
        if (!best || dist < best.dist) best = { word: rw, dist }
      }
      if (best) map.set(normalizeWordKey(lw), best.word)
    }
  }
  return map
}

function mergeCorrectionMaps(...maps: Map<string, string>[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const map of maps) {
    for (const [k, v] of map) {
      if (!out.has(k)) out.set(k, v)
    }
  }
  return out
}

export function buildWrongWordCorrectionMap(
  evaluation: LiveSessionEvaluation | null | undefined,
): Map<string, string> {
  const fromDetections = new Map<string, string>()
  for (const t of evaluation?.turnEvaluations ?? []) {
    for (const ww of t.wrongWordDetections ?? []) {
      const observed = ww.observedToken?.trim()
      const suggested = ww.suggestedCorrection?.trim()
      if (!observed || !suggested) continue
      if (observed.toLowerCase() === suggested.toLowerCase()) continue
      fromDetections.set(normalizeWordKey(observed), suggested)
    }
  }

  const fromGaps = new Map<string, string>()
  const gaps = evaluation?.mergedSpeakingReportV1?.adaptiveLearningSignalsV1?.vocabularyGaps ?? []
  for (const gap of gaps) {
    const parsed = parseVocabularyGapPracticeToken(gap)
    if (!parsed) continue
    fromGaps.set(normalizeWordKey(parsed.observed), parsed.practice)
  }

  return mergeCorrectionMaps(
    fromDetections,
    fromGaps,
    buildReferenceTranscriptCorrectionMap(evaluation),
  )
}

export function practiceWordForObserved(word: string, correctionMap: Map<string, string>): string {
  const trimmed = word.trim()
  if (!trimmed) return trimmed
  return correctionMap.get(normalizeWordKey(trimmed)) ?? trimmed
}

export type ResolvedWordPracticeTarget = {
  word: string
  practiceHint: string | null
}

/**
 * Map session weak-word tokens to what the learner should **say** (correction target),
 * not what they mistakenly said.
 */
export function resolveWordPracticeTargets(
  rawWords: string[],
  correctionMap: Map<string, string>,
): ResolvedWordPracticeTarget[] {
  const seen = new Set<string>()
  const out: ResolvedWordPracticeTarget[] = []
  for (const raw of rawWords) {
    const observed = raw.trim()
    if (!observed) continue
    const practice = practiceWordForObserved(observed, correctionMap)
    const key = normalizeWordKey(practice)
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      word: practice,
      practiceHint:
        observed.toLowerCase() !== practice.toLowerCase()
          ? `You said “${observed}” — practice “${practice}”.`
          : null,
    })
    if (out.length >= 8) break
  }
  return out
}

export function parseVocabularyGapPracticeToken(gap: string): { observed: string; practice: string } | null {
  const arrow = gap.includes('→') ? gap.split('→') : gap.includes('->') ? gap.split('->') : null
  if (!arrow || arrow.length < 2) return null
  const observed = arrow[0]?.trim() ?? ''
  const practice = arrow.slice(1).join('→').trim()
  if (!observed || !practice) return null
  return { observed, practice }
}

export function hydrateWeakWordsLoopPayload(
  payload: WeakWordsLoopPayload,
  evaluation: LiveSessionEvaluation | null | undefined,
): WeakWordsLoopPayload {
  const correctionMap = buildWrongWordCorrectionMap(evaluation)
  const resolved = resolveWordPracticeTargets(payload.words, correctionMap)
  if (!resolved.length) return payload
  const words = resolved.map((r) => r.word)
  const practiceHints = resolved.map((r) => r.practiceHint ?? '')
  const changed =
    words.length !== payload.words.length ||
    words.some((w, i) => w !== payload.words[i]) ||
    practiceHints.some((h) => h.length > 0)
  if (!changed) return payload
  return {
    ...payload,
    words,
    practiceHints,
  }
}

export function hydratePronunciationDrillLoopPayload(
  payload: PronunciationDrillLoopPayload,
  evaluation: LiveSessionEvaluation | null | undefined,
): PronunciationDrillLoopPayload {
  const correctionMap = buildWrongWordCorrectionMap(evaluation)
  const resolved = resolveWordPracticeTargets(payload.words, correctionMap)
  if (!resolved.length) return payload
  const words = resolved.map((r) => r.word)
  const changed = words.some((w, i) => w !== payload.words[i])
  if (!changed) return payload
  return { ...payload, words }
}

export function hydratePracticeWordLoopPayload(
  loopType: TrainingLoopType,
  payload: unknown,
  evaluation: LiveSessionEvaluation | null | undefined,
): unknown {
  if (loopType === 'weak_words') {
    return hydrateWeakWordsLoopPayload(payload as WeakWordsLoopPayload, evaluation)
  }
  if (loopType === 'pronunciation_drill') {
    return hydratePronunciationDrillLoopPayload(payload as PronunciationDrillLoopPayload, evaluation)
  }
  return payload
}
