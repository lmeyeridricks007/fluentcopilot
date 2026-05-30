import OpenAI from 'openai'
import { z } from 'zod'
import { getOpenAiDirectConfig, getOpenAiEnrichmentModel } from '../ai/config/aiProviderConfig'
import type { TimedSttWord } from './readAloudOpenAiSttWords'
import { normalizeForCompare, splitSentences, tokenizeWords } from './readAloudTextUtils'

type TargetToken = {
  token: string
  targetIndex: number
  weight: number
  sentenceIndex: number
}

type WordSignal = {
  wordIndex: number
  startSec: number
  endSec: number
  score: number
  targetIndex: number | null
  sentenceIndex: number | null
}

type HeuristicCandidateSpan = {
  startWordIndex: number
  endWordIndex: number
  startMs: number
  endMs: number
  confidence: number
  notes: string[]
  lexicalCoverage01: number
  monotonicity01: number
  density01: number
}

const MainSpanSchema = z.object({
  mainSpan: z.object({
    startWordIndex: z.number().int().min(0).nullable(),
    endWordIndex: z.number().int().min(0).nullable(),
    confidence: z.number().min(0).max(1).nullable().optional(),
    status: z.enum(['strong', 'approximate', 'weak', 'missing']).optional(),
    notes: z.array(z.string().min(1).max(240)).max(6).optional(),
  }),
  candidateSpans: z
    .array(
      z.object({
        startWordIndex: z.number().int().min(0),
        endWordIndex: z.number().int().min(0),
        confidence: z.number().min(0).max(1).nullable().optional(),
        notes: z.array(z.string().min(1).max(240)).max(4).optional(),
      })
    )
    .max(6)
    .optional(),
})

export type ReadAloudMainSpanStatus = 'strong' | 'approximate' | 'weak' | 'missing'

export type ReadAloudCandidateSpan = {
  startMs: number
  endMs: number
  startWordIndex: number
  endWordIndex: number
  confidence: number
  notes: string[]
}

export type ReadAloudMainSpan = {
  startMs: number | null
  endMs: number | null
  startWordIndex: number | null
  endWordIndex: number | null
  confidence: number
  status: ReadAloudMainSpanStatus
  notes: string[]
}

export type ReadAloudMainSpanInferenceResult = {
  mainSpan: ReadAloudMainSpan
  candidateSpans: ReadAloudCandidateSpan[]
  debug: {
    llmStructuredOutput: boolean
    usedHeuristicFallback: boolean
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function tokenWeight(token: string): number {
  if (token.length >= 8) return 1.65
  if (token.length >= 6) return 1.35
  if (token.length >= 4) return 1
  return 0.42
}

function editDistance(a: string, b: string): number {
  const n = a.length
  const m = b.length
  if (n === 0) return m
  if (m === 0) return n
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = 0; i <= n; i++) dp[i]![0] = i
  for (let j = 0; j <= m; j++) dp[0]![j] = j
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost)
    }
  }
  return dp[n]![m]!
}

function tokenSimilarity01(aRaw: string, bRaw: string): number {
  const a = normalizeForCompare(aRaw)
  const b = normalizeForCompare(bRaw)
  if (!a || !b) return 0
  if (a === b) return 1
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return 0.9
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 0
  let score = 1 - editDistance(a, b) / maxLen
  if (a[0] === b[0]) score += 0.05
  return clamp01(score)
}

function isDebugEnabled(): boolean {
  const raw = process.env.READ_ALOUD_ALIGNMENT_DEBUG?.trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}

function debugLog(label: string, payload: unknown): void {
  if (!isDebugEnabled()) return
  try {
    console.debug(`[read-aloud-main-span] ${label}`, JSON.stringify(payload))
  } catch {
    console.debug(`[read-aloud-main-span] ${label}`)
  }
}

function buildTargetTokens(targetPassage: string, targetSentences: string[]): TargetToken[] {
  const sentenceLookup = targetSentences.length ? targetSentences : splitSentences(targetPassage)
  const out: TargetToken[] = []
  let globalIndex = 0
  for (let si = 0; si < sentenceLookup.length; si++) {
    const tokens = tokenizeWords(sentenceLookup[si]!)
    for (const token of tokens) {
      out.push({
        token,
        targetIndex: globalIndex++,
        weight: tokenWeight(token),
        sentenceIndex: si,
      })
    }
  }
  return out
}

function buildWordSignals(words: TimedSttWord[], targetTokens: TargetToken[]): WordSignal[] {
  return words.map((word, wordIndex) => {
    const surface = normalizeForCompare(word.word)
    let bestScore = 0
    let bestTargetIndex: number | null = null
    let bestSentenceIndex: number | null = null
    for (const target of targetTokens) {
      const sim = tokenSimilarity01(surface, target.token)
      if (sim < 0.6) continue
      const weighted = sim * target.weight
      if (weighted > bestScore) {
        bestScore = weighted
        bestTargetIndex = target.targetIndex
        bestSentenceIndex = target.sentenceIndex
      }
    }
    return {
      wordIndex,
      startSec: word.startSec,
      endSec: word.endSec,
      score: bestScore,
      targetIndex: bestTargetIndex,
      sentenceIndex: bestSentenceIndex,
    }
  })
}

function buildCandidateBoundaries(signals: WordSignal[]): Array<{ startWordIndex: number; endWordIndex: number }> {
  const positive = signals.filter((s) => s.score >= 0.62)
  if (!positive.length) return []
  const segments: Array<{ startWordIndex: number; endWordIndex: number }> = []
  let currentStart = positive[0]!.wordIndex
  let currentEnd = positive[0]!.wordIndex
  let lastEndSec = positive[0]!.endSec
  for (let i = 1; i < positive.length; i++) {
    const row = positive[i]!
    const gapWords = row.wordIndex - currentEnd
    const gapSec = row.startSec - lastEndSec
    if (gapWords <= 9 && gapSec <= 2.8) {
      currentEnd = row.wordIndex
      lastEndSec = row.endSec
      continue
    }
    segments.push({ startWordIndex: currentStart, endWordIndex: currentEnd })
    currentStart = row.wordIndex
    currentEnd = row.wordIndex
    lastEndSec = row.endSec
  }
  segments.push({ startWordIndex: currentStart, endWordIndex: currentEnd })
  return segments
}

function scoreCandidateSpan(input: {
  span: { startWordIndex: number; endWordIndex: number }
  words: TimedSttWord[]
  signals: WordSignal[]
  targetTokens: TargetToken[]
  targetSentences: string[]
}): HeuristicCandidateSpan | null {
  const { span, words, signals, targetTokens, targetSentences } = input
  const startWord = words[span.startWordIndex]
  const endWord = words[span.endWordIndex]
  if (!startWord || !endWord || endWord.endSec <= startWord.startSec) return null

  const sliceSignals = signals.slice(span.startWordIndex, span.endWordIndex + 1)
  const matchedWeightByTarget = new Map<number, number>()
  const matchedSentenceSet = new Set<number>()
  const matchedTargetPositions: number[] = []
  let matchedWeight = 0
  for (const signal of sliceSignals) {
    if (signal.targetIndex == null || signal.score < 0.62) continue
    matchedWeight += signal.score
    matchedTargetPositions.push(signal.targetIndex)
    matchedSentenceSet.add(signal.sentenceIndex ?? 0)
    const prev = matchedWeightByTarget.get(signal.targetIndex) ?? 0
    if (signal.score > prev) matchedWeightByTarget.set(signal.targetIndex, signal.score)
  }

  const totalTargetWeight = targetTokens.reduce((sum, token) => sum + token.weight, 0) || 1
  let coveredWeight = 0
  for (const token of targetTokens) {
    coveredWeight += Math.min(token.weight, matchedWeightByTarget.get(token.targetIndex) ?? 0)
  }
  const lexicalCoverage01 = clamp01(coveredWeight / totalTargetWeight)

  let monotonicHits = 0
  let monotonicComparisons = 0
  let lastTarget = -1
  for (const targetIndex of matchedTargetPositions) {
    if (lastTarget >= 0) {
      monotonicComparisons++
      if (targetIndex >= lastTarget - 1) monotonicHits++
    }
    lastTarget = targetIndex
  }
  const monotonicity01 = monotonicComparisons > 0 ? monotonicHits / monotonicComparisons : 0.5

  const durationSec = Math.max(0.2, endWord.endSec - startWord.startSec)
  const density01 = clamp01((matchedWeight / durationSec) / 3.2)

  const sentenceCoverage01 =
    targetSentences.length > 0 ? matchedSentenceSet.size / Math.max(1, targetSentences.length) : lexicalCoverage01

  const spanWordCount = span.endWordIndex - span.startWordIndex + 1
  const expectedWordCount = Math.max(1, targetTokens.length)
  const lengthBalance01 = 1 - Math.min(1, Math.abs(spanWordCount - expectedWordCount) / Math.max(spanWordCount, expectedWordCount))

  const confidence = clamp01(
    lexicalCoverage01 * 0.42 +
      monotonicity01 * 0.18 +
      density01 * 0.16 +
      sentenceCoverage01 * 0.16 +
      lengthBalance01 * 0.08
  )

  const notes: string[] = []
  if (sentenceCoverage01 < 0.45) notes.push('matched words cluster into only part of the passage')
  if (density01 < 0.42) notes.push('target-like words are sparse across this span')
  if (monotonicity01 < 0.58) notes.push('target-like words do not stay cleanly in passage order')
  if (durationSec > 0 && lexicalCoverage01 >= 0.28 && density01 >= 0.2 && !notes.length) {
    notes.push('span contains the strongest passage-like sequence in the clip')
  }

  return {
    startWordIndex: span.startWordIndex,
    endWordIndex: span.endWordIndex,
    startMs: Math.round(startWord.startSec * 1000),
    endMs: Math.round(endWord.endSec * 1000),
    confidence,
    notes: notes.slice(0, 4),
    lexicalCoverage01,
    monotonicity01,
    density01,
  }
}

function expandCandidateSpan(
  candidate: HeuristicCandidateSpan,
  words: TimedSttWord[],
  targetWordCount: number
): HeuristicCandidateSpan {
  const expandWords = Math.max(4, Math.min(18, Math.round(targetWordCount * 0.08)))
  const startWordIndex = Math.max(0, candidate.startWordIndex - expandWords)
  const endWordIndex = Math.min(words.length - 1, candidate.endWordIndex + expandWords)
  const startMs = Math.round((words[startWordIndex]?.startSec ?? candidate.startMs / 1000) * 1000)
  const endMs = Math.round((words[endWordIndex]?.endSec ?? candidate.endMs / 1000) * 1000)
  return {
    ...candidate,
    startWordIndex,
    endWordIndex,
    startMs,
    endMs,
  }
}

function buildHeuristicCandidates(input: {
  targetPassage: string
  targetSentences: string[]
  words: TimedSttWord[]
}): HeuristicCandidateSpan[] {
  const targetTokens = buildTargetTokens(input.targetPassage, input.targetSentences)
  const signals = buildWordSignals(input.words, targetTokens)
  const boundaries = buildCandidateBoundaries(signals)
  const scored = boundaries
    .map((span) =>
      scoreCandidateSpan({
        span,
        words: input.words,
        signals,
        targetTokens,
        targetSentences: input.targetSentences,
      })
    )
    .filter(Boolean) as HeuristicCandidateSpan[]

  const expanded = scored
    .map((candidate) => expandCandidateSpan(candidate, input.words, targetTokens.length))
    .sort((a, b) => b.confidence - a.confidence)

  if (expanded.length) return expanded.slice(0, 6)

  if (input.words.length) {
    const fallbackStart = Math.max(0, Math.floor(input.words.length * 0.08))
    const fallbackEnd = Math.min(input.words.length - 1, Math.ceil(input.words.length * 0.92))
    const startMs = Math.round((input.words[fallbackStart]?.startSec ?? 0) * 1000)
    const endMs = Math.round((input.words[fallbackEnd]?.endSec ?? input.words[input.words.length - 1]!.endSec) * 1000)
    return [
      {
        startWordIndex: fallbackStart,
        endWordIndex: fallbackEnd,
        startMs,
        endMs,
        confidence: 0.16,
        notes: ['fallback span covers most of the recording because target-like anchors were sparse'],
        lexicalCoverage01: 0,
        monotonicity01: 0,
        density01: 0,
      },
    ]
  }
  return []
}

async function refineMainSpanWithLlm(input: {
  targetPassage: string
  targetSentences: string[]
  fullTranscriptText: string
  words: TimedSttWord[]
  candidateSpans: HeuristicCandidateSpan[]
  totalAudioDurationSec: number
}): Promise<{ parsed: z.infer<typeof MainSpanSchema> | null; rawOutput: string | null }> {
  const cfg = getOpenAiDirectConfig()
  if (!cfg.apiKey || !input.words.length) return { parsed: null, rawOutput: null }

  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
    organization: cfg.organization,
    maxRetries: 0,
    timeout: 45_000,
  })

  const model = getOpenAiEnrichmentModel()
  const wordTable = input.words.slice(0, 1400).map((w, i) => ({
    i,
    w: w.word.slice(0, 48),
    sMs: Math.round(w.startSec * 1000),
    eMs: Math.round(w.endSec * 1000),
  }))

  const promptPayload = {
    targetPassage: input.targetPassage.slice(0, 4200),
    targetSentences: input.targetSentences.map((text, index) => ({ index, text: text.slice(0, 220) })),
    fullTranscriptText: input.fullTranscriptText.slice(0, 4200),
    transcriptWords: wordTable,
    candidateSpans: input.candidateSpans.map((span) => ({
      startWordIndex: span.startWordIndex,
      endWordIndex: span.endWordIndex,
      startMs: span.startMs,
      endMs: span.endMs,
      confidence: span.confidence,
      notes: span.notes,
    })),
    totalAudioDurationMs: Math.round(input.totalAudioDurationSec * 1000),
  }
  debugLog('prompt_input_summary', {
    wordCount: input.words.length,
    targetSentenceCount: input.targetSentences.length,
    candidateCount: input.candidateSpans.length,
    transcriptPreview: input.fullTranscriptText.slice(0, 220),
  })

  let completion: Awaited<ReturnType<typeof client.chat.completions.create>>
  try {
    completion = await client.chat.completions.create({
      model,
      temperature: 0.05,
      max_tokens: 1300,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You infer the main reading span in a Dutch learner read-aloud recording. ' +
            'The learner probably attempted to read the target passage in order. ' +
            'ASR can miss words, drop function words, split phrases oddly, or mistranscribe pronunciation. ' +
            'Do NOT require exact transcript equality. ' +
            'Return JSON only in this shape: {"mainSpan":{"startWordIndex":number|null,"endWordIndex":number|null,"confidence":0.0-1.0,"status":"strong|approximate|weak|missing","notes":["..."]},"candidateSpans":[...]}. ' +
            'Pick the most likely contiguous region where the learner is reading the target passage in order, even if there are pauses or minor restarts inside it. ' +
            'Prefer a plausible usable region over missing. Only return missing if the clip is truly unusable. ' +
            'Use candidate spans as hints, not hard limits. Avoid tiny spans that only match one sentence fragment.',
        },
        {
          role: 'user',
          content: JSON.stringify(promptPayload),
        },
      ],
    })
  } catch {
    return { parsed: null, rawOutput: null }
  }

  const raw = completion.choices[0]?.message?.content?.trim() ?? null
  debugLog('raw_model_output', { rawOutput: raw })
  if (!raw) return { parsed: null, rawOutput: null }
  try {
    return { parsed: MainSpanSchema.parse(JSON.parse(raw)), rawOutput: raw }
  } catch {
    return { parsed: null, rawOutput: raw }
  }
}

function statusFromConfidence(confidence: number): ReadAloudMainSpanStatus {
  if (confidence >= 0.76) return 'strong'
  if (confidence >= 0.5) return 'approximate'
  if (confidence >= 0.24) return 'weak'
  return 'missing'
}

function normalizeMainSpan(input: {
  parsed: z.infer<typeof MainSpanSchema> | null
  heuristicCandidates: HeuristicCandidateSpan[]
  words: TimedSttWord[]
  totalAudioDurationSec: number
}): ReadAloudMainSpanInferenceResult {
  const heuristicTop = input.heuristicCandidates[0] ?? null
  const llmMain = input.parsed?.mainSpan
  const candidateLookup = input.heuristicCandidates
  let startWordIndex: number | null = llmMain?.startWordIndex ?? heuristicTop?.startWordIndex ?? null
  let endWordIndex: number | null = llmMain?.endWordIndex ?? heuristicTop?.endWordIndex ?? null
  let confidence = clamp01(llmMain?.confidence ?? heuristicTop?.confidence ?? 0)
  let notes = [...(llmMain?.notes ?? []), ...(heuristicTop?.notes ?? [])]

  if (
    startWordIndex == null ||
    endWordIndex == null ||
    endWordIndex < startWordIndex ||
    startWordIndex < 0 ||
    endWordIndex >= input.words.length
  ) {
    startWordIndex = heuristicTop?.startWordIndex ?? null
    endWordIndex = heuristicTop?.endWordIndex ?? null
    confidence = clamp01((heuristicTop?.confidence ?? 0) * 0.92)
    notes = ['main span fell back to heuristics', ...notes]
  }

  if (startWordIndex != null && endWordIndex != null) {
    const startIdx = startWordIndex
    const endIdx = endWordIndex
    const nearestHeuristic = candidateLookup
      .map((row) => ({
        row,
        distance: Math.abs(row.startWordIndex - startIdx) + Math.abs(row.endWordIndex - endIdx),
      }))
      .sort((a, b) => a.distance - b.distance)[0]?.row
    if (nearestHeuristic) {
      const agreementStart = Math.abs(nearestHeuristic.startWordIndex - startIdx)
      const agreementEnd = Math.abs(nearestHeuristic.endWordIndex - endIdx)
      const repairPenalty = Math.min(0.18, (agreementStart + agreementEnd) / Math.max(80, input.words.length))
      confidence = clamp01(
        confidence * 0.62 +
          nearestHeuristic.confidence * 0.38 -
          repairPenalty
      )
      if (agreementStart + agreementEnd > 24) {
        notes.unshift('LLM and heuristic main-span estimates were fairly far apart')
      }
    }
  }

  let status = llmMain?.status ?? statusFromConfidence(confidence)
  if (startWordIndex == null || endWordIndex == null) status = 'missing'

  const startSec = startWordIndex != null ? input.words[startWordIndex]?.startSec ?? null : null
  const endSec = endWordIndex != null ? input.words[endWordIndex]?.endSec ?? null : null
  if (startSec == null || endSec == null || endSec <= startSec + 0.12) {
    status = 'missing'
    confidence = clamp01(confidence * 0.4)
    startWordIndex = null
    endWordIndex = null
  }

  const mainSpan: ReadAloudMainSpan = {
    startMs: startWordIndex != null ? Math.round((input.words[startWordIndex]?.startSec ?? 0) * 1000) : null,
    endMs: endWordIndex != null ? Math.round((input.words[endWordIndex]?.endSec ?? 0) * 1000) : null,
    startWordIndex,
    endWordIndex,
    confidence,
    status,
    notes: [...new Set(notes.map((note) => note.trim()).filter(Boolean))].slice(0, 6),
  }

  if (mainSpan.status === 'missing' && heuristicTop && heuristicTop.confidence >= 0.18) {
    mainSpan.startMs = heuristicTop.startMs
    mainSpan.endMs = heuristicTop.endMs
    mainSpan.startWordIndex = heuristicTop.startWordIndex
    mainSpan.endWordIndex = heuristicTop.endWordIndex
    mainSpan.confidence = clamp01(heuristicTop.confidence * 0.88)
    mainSpan.status = statusFromConfidence(mainSpan.confidence)
    mainSpan.notes = ['using the most plausible heuristic reading span to avoid dropping a valid read', ...heuristicTop.notes].slice(0, 6)
  }

  const candidateSpans: ReadAloudCandidateSpan[] = input.heuristicCandidates.map((candidate) => ({
    startMs: candidate.startMs,
    endMs: candidate.endMs,
    startWordIndex: candidate.startWordIndex,
    endWordIndex: candidate.endWordIndex,
    confidence: candidate.confidence,
    notes: candidate.notes,
  }))

  debugLog('normalized_output', {
    mainSpan,
    candidateSpans,
  })

  return {
    mainSpan,
    candidateSpans,
    debug: {
      llmStructuredOutput: false,
      usedHeuristicFallback: mainSpan.notes.some((note) => /heuristic/i.test(note)),
    },
  }
}

export async function inferReadAloudMainSpan(input: {
  targetPassage: string
  targetSentences: string[]
  fullTranscriptText: string
  timedWords: TimedSttWord[]
  totalAudioDurationSec: number
}): Promise<ReadAloudMainSpanInferenceResult> {
  if (!input.timedWords.length) {
    return {
      mainSpan: {
        startMs: null,
        endMs: null,
        startWordIndex: null,
        endWordIndex: null,
        confidence: 0,
        status: 'missing',
        notes: ['no timed ASR words were available'],
      },
      candidateSpans: [],
      debug: {
        llmStructuredOutput: false,
        usedHeuristicFallback: false,
      },
    }
  }

  const heuristicCandidates = buildHeuristicCandidates({
    targetPassage: input.targetPassage,
    targetSentences: input.targetSentences,
    words: input.timedWords,
  })
  const llm = await refineMainSpanWithLlm({
    targetPassage: input.targetPassage,
    targetSentences: input.targetSentences,
    fullTranscriptText: input.fullTranscriptText,
    words: input.timedWords,
    candidateSpans: heuristicCandidates,
    totalAudioDurationSec: input.totalAudioDurationSec,
  })

  const normalized = normalizeMainSpan({
    parsed: llm.parsed,
    heuristicCandidates,
    words: input.timedWords,
    totalAudioDurationSec: input.totalAudioDurationSec,
  })

  if (normalized.mainSpan.status === 'weak' && normalized.mainSpan.confidence >= 0.28) {
    normalized.mainSpan.notes = [
      'span is weak but still plausible enough to continue sentence alignment',
      ...normalized.mainSpan.notes,
    ].slice(0, 6)
  }

  return {
    ...normalized,
    debug: {
      llmStructuredOutput: llm.parsed != null,
      usedHeuristicFallback:
        normalized.mainSpan.notes.some((note) => /heuristic/i.test(note)) || (llm.parsed == null && heuristicCandidates.length > 0),
    },
  }
}
