import OpenAI from 'openai'
import { z } from 'zod'
import { getOpenAiDirectConfig, getOpenAiEnrichmentModel } from '../ai/config/aiProviderConfig'
import type { TimedSttWord } from './readAloudOpenAiSttWords'
import { normalizeForCompare, tokenizeWords } from './readAloudTextUtils'

type ScopedTimedWord = TimedSttWord & {
  globalIndex: number
}

type HeuristicCandidate = {
  startWordIndex: number | null
  endWordIndex: number | null
  confidence: number
  status: ReadAloudSentenceAlignmentStatus
  notes: string[]
}

type WindowOption = {
  startWordIndex: number
  endWordIndex: number
  confidence: number
  contentMatch01: number
  anchorScore01: number
  density01: number
  notes: string[]
}

type RescueRow = {
  startWordIndex: number | null
  endWordIndex: number | null
  confidence: number
  notes: string[]
  source: ReadAloudSentenceAlignment['source']
  inferredBoundary?: boolean
}

const LlmAlignmentSchema = z.object({
  alignments: z.array(
    z.object({
      sentenceIndex: z.number().int().min(0),
      startWordIndex: z.number().int().min(0).nullable(),
      endWordIndex: z.number().int().min(0).nullable(),
      alignmentConfidence: z.number().min(0).max(1).nullable().optional(),
      alignmentStatus: z.enum(['aligned', 'approximate', 'uncertain', 'missing']).optional(),
      notes: z.array(z.string().min(1).max(240)).max(6).optional(),
    })
  ),
})

export type ReadAloudSentenceAlignmentStatus = 'aligned' | 'approximate' | 'uncertain' | 'missing'

export type ReadAloudSentenceAlignment = {
  sentenceIndex: number
  targetSentence: string
  spokenTextApprox: string
  startMs: number | null
  endMs: number | null
  alignmentConfidence: number
  alignmentStatus: ReadAloudSentenceAlignmentStatus
  notes?: string[]
  startWordIndex: number | null
  endWordIndex: number | null
  source: 'llm' | 'heuristic' | 'llm_repaired'
}

export type ReadAloudSentenceAlignmentSummary = {
  alignedSentenceCount: number
  approximateSentenceCount: number
  uncertainSentenceCount: number
  missingSentenceCount: number
  usableSentenceCount: number
  totalSentenceCount: number
  coverage01: number
  overallConfidence01: number
  weakOverall: boolean
  reasons: string[]
  matchedTranscriptText: string
  usedLlm: boolean
  usedHeuristicFallback: boolean
  llmStructuredOutput: boolean
  interpolatedSentenceCount: number
  sourceCounts: {
    llm: number
    heuristic: number
    llmRepaired: number
  }
}

export type ReadAloudSentenceAlignmentResult = {
  alignments: ReadAloudSentenceAlignment[]
  summary: ReadAloudSentenceAlignmentSummary
}

export type ReadAloudSentenceAlignmentWord = {
  word: string
  startMs: number
  endMs: number
}

export type ReadAloudSentenceAlignmentCandidateWindow = {
  sentenceIndex: number
  startMs: number | null
  endMs: number | null
  confidence?: number
  notes?: string[]
}

export type ReadAloudSentenceAlignmentInput = {
  targetPassage: string
  targetSentences: Array<{ index: number; text: string }>
  transcriptWords: ReadAloudSentenceAlignmentWord[]
  fullTranscriptText: string
  candidateWindows?: ReadAloudSentenceAlignmentCandidateWindow[]
}

export type ReadAloudSentenceAlignmentOutput = {
  sentenceAlignments: Array<{
    sentenceIndex: number
    targetSentence: string
    spokenTextApprox: string
    startMs: number | null
    endMs: number | null
    alignmentConfidence: number
    alignmentStatus: ReadAloudSentenceAlignmentStatus
    notes: string[]
  }>
  overallAlignmentConfidence: number
  notes: string[]
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)))
}

function isAlignmentDebugEnabled(): boolean {
  const raw = process.env.READ_ALOUD_ALIGNMENT_DEBUG?.trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}

function alignmentDebug(label: string, payload: unknown): void {
  if (!isAlignmentDebugEnabled()) return
  try {
    console.debug(`[read-aloud-alignment] ${label}`, JSON.stringify(payload))
  } catch {
    console.debug(`[read-aloud-alignment] ${label}`)
  }
}

function editDistance(a: string, b: string): number {
  const aa = a.trim()
  const bb = b.trim()
  const n = aa.length
  const m = bb.length
  if (n === 0) return m
  if (m === 0) return n
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = 0; i <= n; i++) dp[i]![0] = i
  for (let j = 0; j <= m; j++) dp[0]![j] = j
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = aa[i - 1] === bb[j - 1] ? 0 : 1
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
  const dist = editDistance(a, b)
  let score = 1 - dist / maxLen
  if (a[0] === b[0]) score += 0.06
  return clamp01(score)
}

function weightedFuzzyRecall01(targetTokens: string[], spokenTokens: string[]): number {
  if (!targetTokens.length) return spokenTokens.length ? 0 : 1
  const used = new Set<number>()
  let matched = 0
  let total = 0
  for (const tok of targetTokens) {
    const weight = tok.length >= 6 ? 1.25 : tok.length >= 4 ? 1 : 0.72
    total += weight
    let best = 0
    let bestIdx = -1
    for (let i = 0; i < spokenTokens.length; i++) {
      if (used.has(i)) continue
      const sim = tokenSimilarity01(tok, spokenTokens[i]!)
      if (sim > best) {
        best = sim
        bestIdx = i
      }
    }
    if (best >= 0.62 && bestIdx >= 0) {
      used.add(bestIdx)
      matched += weight * best
    }
  }
  return total > 0 ? clamp01(matched / total) : 0
}

function orderedSoftCoverage01(targetSentence: string, spokenText: string): number {
  const targetTokens = tokenizeWords(targetSentence)
  const spokenTokens = tokenizeWords(spokenText)
  if (!targetTokens.length) return spokenTokens.length ? 0 : 1
  const fuzzy = weightedFuzzyRecall01(targetTokens, spokenTokens)
  const lengthBalance =
    spokenTokens.length === 0 && targetTokens.length > 0
      ? 0
      : 1 - Math.min(1, Math.abs(targetTokens.length - spokenTokens.length) / Math.max(targetTokens.length, spokenTokens.length, 1))
  let exactInOrder = 0
  let cursor = 0
  for (const tok of targetTokens) {
    for (let i = cursor; i < spokenTokens.length; i++) {
      if (tokenSimilarity01(tok, spokenTokens[i]!) >= 0.88) {
        exactInOrder++
        cursor = i + 1
        break
      }
    }
  }
  const inOrder = targetTokens.length > 0 ? exactInOrder / targetTokens.length : 0
  return clamp01(fuzzy * 0.6 + inOrder * 0.25 + lengthBalance * 0.15)
}

export function approximateSentenceMatch01(targetSentence: string, spokenText: string): number {
  return orderedSoftCoverage01(targetSentence, spokenText)
}

function rangeOverlap01(
  a: { startWordIndex: number | null; endWordIndex: number | null },
  b: { startWordIndex: number | null; endWordIndex: number | null }
): number {
  if (a.startWordIndex == null || a.endWordIndex == null || b.startWordIndex == null || b.endWordIndex == null) return 0
  const lo = Math.max(a.startWordIndex, b.startWordIndex)
  const hi = Math.min(a.endWordIndex, b.endWordIndex)
  if (hi < lo) return 0
  const inter = hi - lo + 1
  const union = Math.max(a.endWordIndex, b.endWordIndex) - Math.min(a.startWordIndex, b.startWordIndex) + 1
  return union > 0 ? clamp01(inter / union) : 0
}

function wordsToJoinedText(words: ScopedTimedWord[], startWordIndex: number | null, endWordIndex: number | null): string {
  if (startWordIndex == null || endWordIndex == null) return ''
  const slice = words.filter((w) => w.globalIndex >= startWordIndex && w.globalIndex <= endWordIndex)
  return slice
    .map((w) => w.word.trim())
    .filter(Boolean)
    .join(' ')
    .trim()
}

function buildSearchWords(
  words: TimedSttWord[],
  passageWindowHint?: { startWordIndex: number; endWordIndex: number } | null
): ScopedTimedWord[] {
  if (!words.length) return []
  const total = words.length
  let start = 0
  let end = total - 1
  if (passageWindowHint) {
    const expand = Math.max(28, Math.round((passageWindowHint.endWordIndex - passageWindowHint.startWordIndex + 1) * 0.18))
    start = Math.max(0, passageWindowHint.startWordIndex - expand)
    end = Math.min(total - 1, passageWindowHint.endWordIndex + expand)
  }
  if (end - start + 1 > 1100) {
    end = Math.min(total - 1, start + 1099)
  }
  return words.slice(start, end + 1).map((w, i) => ({ ...w, globalIndex: start + i }))
}

function proportionalWindows(sentences: string[], searchWords: ScopedTimedWord[]): Array<{ startLocal: number; endLocal: number }> {
  if (!searchWords.length) return sentences.map(() => ({ startLocal: 0, endLocal: 0 }))
  const sentenceWeights = sentences.map((s) => Math.max(1, tokenizeWords(s).length))
  const totalWeight = sentenceWeights.reduce((sum, n) => sum + n, 0) || 1
  let cursor = 0
  return sentences.map((_, i) => {
    if (i === sentences.length - 1) {
      return { startLocal: Math.min(cursor, searchWords.length - 1), endLocal: searchWords.length - 1 }
    }
    const share = Math.max(1, Math.floor((searchWords.length * sentenceWeights[i]!) / totalWeight))
    const endLocal = Math.min(searchWords.length - 1, cursor + share - 1)
    const row = { startLocal: Math.min(cursor, searchWords.length - 1), endLocal: Math.max(cursor, endLocal) }
    cursor = Math.min(searchWords.length - 1, endLocal + 1)
    return row
  })
}

function heuristicStatusFromScore(score: number): ReadAloudSentenceAlignmentStatus {
  if (score >= 0.74) return 'aligned'
  if (score >= 0.48) return 'approximate'
  if (score >= 0.22) return 'uncertain'
  return 'missing'
}

function evaluateWindowScore(input: {
  sentence: string
  windowWords: ScopedTimedWord[]
  baselineMid: number
  startLocal: number
  endLocal: number
}): { score: number; spokenText: string; notes: string[]; contentMatch01: number; anchorScore01: number; density01: number } {
  const spokenText = input.windowWords
    .map((w) => w.word.trim())
    .filter(Boolean)
    .join(' ')
    .trim()
  const sentenceTokens = tokenizeWords(input.sentence)
  const spokenTokens = tokenizeWords(spokenText)
  const content = approximateSentenceMatch01(input.sentence, spokenText)
  const anchorTokens = sentenceTokens.filter((t) => t.length >= 4)
  const firstAnchor = anchorTokens[0]
  const lastAnchor = anchorTokens[anchorTokens.length - 1]
  const anchorStart =
    firstAnchor && spokenTokens.some((t) => tokenSimilarity01(firstAnchor, t) >= 0.74) ? 1 : firstAnchor ? 0 : 0.65
  const anchorEnd =
    lastAnchor && spokenTokens.some((t) => tokenSimilarity01(lastAnchor, t) >= 0.74) ? 1 : lastAnchor ? 0 : 0.65
  const anchorScore = (anchorStart + anchorEnd) / 2
  const windowMid = (input.startLocal + input.endLocal) / 2
  const positionScore = 1 - Math.min(1, Math.abs(windowMid - input.baselineMid) / Math.max(8, Math.abs(input.baselineMid) + 8))
  const durationSec =
    input.windowWords.length > 0
      ? Math.max(0.18, input.windowWords[input.windowWords.length - 1]!.endSec - input.windowWords[0]!.startSec)
      : 0.18
  const density01 = clamp01((spokenTokens.length > 0 ? content * Math.min(spokenTokens.length, 12) : 0) / (durationSec * 5.4))

  const score = clamp01(content * 0.62 + anchorScore * 0.16 + positionScore * 0.12 + density01 * 0.1)
  const notes: string[] = []
  if (spokenTokens.length > sentenceTokens.length * 1.7 && sentenceTokens.length >= 4) {
    notes.push('window may include extra speech from a neighboring sentence or restart')
  } else if (spokenTokens.length < sentenceTokens.length * 0.45 && sentenceTokens.length >= 4) {
    notes.push('ASR likely missed part of this sentence')
  }
  return { score, spokenText, notes, contentMatch01: content, anchorScore01: anchorScore, density01 }
}

function buildSentenceWindowOptions(sentences: string[], searchWords: ScopedTimedWord[]): WindowOption[][] {
  if (!searchWords.length) {
    return sentences.map(() => [])
  }
  const proportional = proportionalWindows(sentences, searchWords)
  const out: WindowOption[][] = []
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]!
    const baseline = proportional[i]!
    const targetTokens = tokenizeWords(sentence)
    const minLen = Math.max(1, Math.floor(targetTokens.length * 0.45))
    const maxLen = Math.min(searchWords.length, Math.max(minLen + 2, Math.ceil(targetTokens.length * 1.8) + 4))
    const searchStart = clampInt(Math.max(0, baseline.startLocal - 22), 0, searchWords.length - 1)
    const searchEnd = clampInt(Math.min(searchWords.length - 1, baseline.endLocal + 30), 0, searchWords.length - 1)

    const candidates: Array<{
      startLocal: number
      endLocal: number
      score: number
      notes: string[]
      contentMatch01: number
      anchorScore01: number
      density01: number
    }> = []
    for (let startLocal = searchStart; startLocal <= searchEnd; startLocal++) {
      const maxEnd = Math.min(searchWords.length - 1, startLocal + maxLen - 1, searchEnd + 18)
      const minEnd = Math.min(maxEnd, Math.max(startLocal, startLocal + minLen - 1))
      for (let endLocal = minEnd; endLocal <= maxEnd; endLocal++) {
        const candidate = evaluateWindowScore({
          sentence,
          windowWords: searchWords.slice(startLocal, endLocal + 1),
          baselineMid: (baseline.startLocal + baseline.endLocal) / 2,
          startLocal,
          endLocal,
        })
        if (candidate.score < 0.14) continue
        candidates.push({
          startLocal,
          endLocal,
          score: candidate.score,
          notes: candidate.notes,
          contentMatch01: candidate.contentMatch01,
          anchorScore01: candidate.anchorScore01,
          density01: candidate.density01,
        })
      }
    }

    const deduped = candidates
      .sort((a, b) => b.score - a.score)
      .filter((row, idx, arr) =>
        arr.findIndex((other) => Math.abs(other.startLocal - row.startLocal) <= 2 && Math.abs(other.endLocal - row.endLocal) <= 2) === idx
      )
      .slice(0, 8)
      .map((row) => ({
        startWordIndex: searchWords[row.startLocal]!.globalIndex,
        endWordIndex: searchWords[row.endLocal]!.globalIndex,
        confidence: clamp01(row.score),
        contentMatch01: row.contentMatch01,
        anchorScore01: row.anchorScore01,
        density01: row.density01,
        notes: row.notes,
      }))
    out.push(deduped)
  }
  return out
}

function solveMonotonicHeuristicAlignment(sentences: string[], optionsBySentence: WindowOption[][]): HeuristicCandidate[] {
  if (!sentences.length) return []
  type Choice = { optionIndex: number; score: number; prevChoiceIndex: number }
  const missingPenalty = 0.14
  const dp: Choice[][] = []

  for (let i = 0; i < sentences.length; i++) {
    const rows = optionsBySentence[i] ?? []
    const choicesCount = rows.length + 1 // extra missing choice at last index
    dp[i] = Array.from({ length: choicesCount }, () => ({ optionIndex: -1, score: Number.NEGATIVE_INFINITY, prevChoiceIndex: -1 }))
  }

  for (let i = 0; i < sentences.length; i++) {
    const rows = optionsBySentence[i] ?? []
    const currentChoices = rows.length + 1
    for (let choiceIdx = 0; choiceIdx < currentChoices; choiceIdx++) {
      const isMissing = choiceIdx === rows.length
      const current = isMissing ? null : rows[choiceIdx]!
      const baseScore = isMissing
        ? -missingPenalty
        : current != null
          ? current.confidence * 1.05 + current.anchorScore01 * 0.08 + current.density01 * 0.06
          : -missingPenalty
      if (i === 0) {
        dp[i]![choiceIdx] = { optionIndex: choiceIdx, score: baseScore, prevChoiceIndex: -1 }
        continue
      }
      const prevRows = optionsBySentence[i - 1] ?? []
      const prevChoices = prevRows.length + 1
      for (let prevIdx = 0; prevIdx < prevChoices; prevIdx++) {
        const prevState = dp[i - 1]![prevIdx]!
        if (!Number.isFinite(prevState.score)) continue
        const prevMissing = prevIdx === prevRows.length
        const prev = prevMissing ? null : prevRows[prevIdx]!
        let transitionScore = prevState.score + baseScore
        if (prev && current) {
          const overlap = prev.endWordIndex - current.startWordIndex + 1
          if (overlap > 4) continue
          if (overlap > 0) transitionScore -= overlap * 0.09
          const gap = current.startWordIndex - prev.endWordIndex - 1
          if (gap >= 0 && gap <= 12) transitionScore += 0.08
          else if (gap > 12) transitionScore -= Math.min(0.22, (gap - 12) * 0.01)
          if (current.startWordIndex >= prev.startWordIndex) transitionScore += 0.04
        } else if (prev && !current) {
          transitionScore -= 0.03
        } else if (!prev && current) {
          transitionScore += 0.01
        }
        if (transitionScore > dp[i]![choiceIdx]!.score) {
          dp[i]![choiceIdx] = { optionIndex: choiceIdx, score: transitionScore, prevChoiceIndex: prevIdx }
        }
      }
    }
  }

  const out: HeuristicCandidate[] = Array.from({ length: sentences.length }, () => ({
    startWordIndex: null,
    endWordIndex: null,
    confidence: 0,
    status: 'missing',
    notes: ['monotonic heuristic alignment could not find a reliable window'],
  }))

  const lastChoices = dp[sentences.length - 1]!
  let bestLastIdx = 0
  for (let i = 1; i < lastChoices.length; i++) {
    if (lastChoices[i]!.score > lastChoices[bestLastIdx]!.score) bestLastIdx = i
  }

  let currentChoiceIdx = bestLastIdx
  for (let sentenceIndex = sentences.length - 1; sentenceIndex >= 0; sentenceIndex--) {
    const rows = optionsBySentence[sentenceIndex] ?? []
    const state = dp[sentenceIndex]![currentChoiceIdx]!
    if (currentChoiceIdx < rows.length) {
      const row = rows[currentChoiceIdx]!
      out[sentenceIndex] = {
        startWordIndex: row.startWordIndex,
        endWordIndex: row.endWordIndex,
        confidence: clamp01(row.confidence),
        status: heuristicStatusFromScore(row.confidence),
        notes: ['chosen by monotonic whole-passage heuristic', ...row.notes].slice(0, 4),
      }
    } else {
      out[sentenceIndex] = {
        startWordIndex: null,
        endWordIndex: null,
        confidence: 0.12,
        status: 'missing',
        notes: ['left missing by monotonic whole-passage heuristic'],
      }
    }
    currentChoiceIdx = state.prevChoiceIndex
    if (currentChoiceIdx < 0 && sentenceIndex > 0) currentChoiceIdx = (optionsBySentence[sentenceIndex - 1] ?? []).length
  }
  return out
}

function interpolateMissingHeuristicCandidates(
  candidates: HeuristicCandidate[],
  searchWords: ScopedTimedWord[],
  sentences: string[]
): HeuristicCandidate[] {
  const out = candidates.map((row) => ({ ...row, notes: [...row.notes] }))
  for (let i = 0; i < out.length; i++) {
    if (out[i]!.startWordIndex != null && out[i]!.endWordIndex != null) continue
    const prev = [...out.slice(0, i)].reverse().find((row) => row.startWordIndex != null && row.endWordIndex != null)
    const next = out.slice(i + 1).find((row) => row.startWordIndex != null && row.endWordIndex != null)
    if (!prev || !next) continue
    const gapStart = (prev.endWordIndex as number) + 1
    const gapEnd = (next.startWordIndex as number) - 1
    if (gapEnd < gapStart) continue
    const targetLen = Math.max(1, tokenizeWords(sentences[i] ?? '').length)
    const sliceLen = Math.max(1, gapEnd - gapStart + 1)
    const desired = Math.min(sliceLen, Math.max(1, Math.round(targetLen * 1.2)))
    const startWordIndex = gapStart
    const endWordIndex = Math.min(gapEnd, startWordIndex + desired - 1)
    if (!searchWords.some((w) => w.globalIndex === startWordIndex) || !searchWords.some((w) => w.globalIndex === endWordIndex)) continue
    out[i] = {
      startWordIndex,
      endWordIndex,
      confidence: 0.3,
      status: 'uncertain',
      notes: ['window was interpolated between stronger neighboring sentences'],
    }
  }
  return out
}

function buildHeuristicCandidates(sentences: string[], searchWords: ScopedTimedWord[]): HeuristicCandidate[] {
  if (!searchWords.length) {
    return sentences.map(() => ({
      startWordIndex: null,
      endWordIndex: null,
      confidence: 0,
      status: 'missing',
      notes: ['no timed words were available'],
    }))
  }
  const optionsBySentence = buildSentenceWindowOptions(sentences, searchWords)
  const monotonic = solveMonotonicHeuristicAlignment(sentences, optionsBySentence)
  return interpolateMissingHeuristicCandidates(monotonic, searchWords, sentences)
}

async function runLlmAlignment(input: {
  targetText: string
  fullTranscript: string
  sentences: string[]
  searchWords: ScopedTimedWord[]
  heuristicCandidates: HeuristicCandidate[]
}): Promise<{ parsed: z.infer<typeof LlmAlignmentSchema> | null; rawOutput: string | null }> {
  const cfg = getOpenAiDirectConfig()
  if (!cfg.apiKey || !input.searchWords.length) return { parsed: null, rawOutput: null }

  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
    organization: cfg.organization,
    maxRetries: 0,
    timeout: 45_000,
  })

  const model = getOpenAiEnrichmentModel()
  const wordTable = input.searchWords.slice(0, 1100).map((w) => ({
    i: w.globalIndex,
    w: w.word.slice(0, 48),
    sMs: Math.round(w.startSec * 1000),
    eMs: Math.round(w.endSec * 1000),
  }))

  const heuristicRows = input.sentences.map((sentence, sentenceIndex) => {
    const cand = input.heuristicCandidates[sentenceIndex]
    return {
      sentenceIndex,
      sentence: sentence.slice(0, 420),
      heuristicStartWordIndex: cand?.startWordIndex ?? null,
      heuristicEndWordIndex: cand?.endWordIndex ?? null,
      heuristicConfidence: cand?.confidence ?? 0,
      heuristicStatus: cand?.status ?? 'missing',
      heuristicNotes: cand?.notes ?? [],
    }
  })

  const promptPayload = {
    targetText: input.targetText.slice(0, 4000),
    targetSentences: input.sentences.map((sentence, sentenceIndex) => ({ sentenceIndex, sentence })),
    asrTranscript: input.fullTranscript.slice(0, 4000),
    words: wordTable,
    heuristicCandidates: heuristicRows,
  }
  alignmentDebug('prompt_input_summary', {
    sentenceCount: input.sentences.length,
    transcriptWordCount: input.searchWords.length,
    heuristicUsableCount: heuristicRows.filter((row) => row.heuristicStartWordIndex != null && row.heuristicEndWordIndex != null).length,
    targetPreview: input.targetText.slice(0, 280),
    transcriptPreview: input.fullTranscript.slice(0, 280),
  })

  let completion: Awaited<ReturnType<typeof client.chat.completions.create>>
  try {
    completion = await client.chat.completions.create({
      model,
      temperature: 0.05,
      max_tokens: 2_200,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You align a WHOLE Dutch read-aloud passage to a timed ASR word stream. ' +
            'Assume the learner likely attempted to read the printed passage in order unless the evidence strongly says otherwise. ' +
            'The transcript is noisy and may omit words even when the learner read them correctly. ' +
            'Do NOT assume an omitted ASR word means the learner skipped it. ' +
            'Return JSON only: {"alignments":[{"sentenceIndex":0,"startWordIndex":12|null,"endWordIndex":21|null,"alignmentConfidence":0.83,"alignmentStatus":"aligned","notes":["..."]}]}. ' +
            `Return exactly ${input.sentences.length} rows, one for each sentenceIndex 0..${input.sentences.length - 1}. ` +
            'Solve this as one monotonic passage-alignment problem across all target sentences together, not as isolated sentence matches. ' +
            'Map the target sentences onto the timed ASR words in sequence. ' +
            'Allow spelling errors, dropped articles, merged phrases, blurred sentence boundaries, and ASR omissions. ' +
            'Prefer best plausible coverage of the whole passage over exact lexical equality. ' +
            'Sentence windows should be contiguous and monotonic. Mild gaps are allowed. Small overlaps may happen but should be minimized. ' +
            'If two neighboring sentences blur together, still return plausible ranges and mark them "approximate" instead of failing aggressively. ' +
            'If a sentence is likely skipped, use null/null with lower confidence, but keep the rest of the passage alignment going. ' +
            'Choose "aligned" for strong evidence, "approximate" for usable but fuzzy windows, "uncertain" for weak heavily inferred windows, and "missing" only for absent evidence. ' +
            'Lower confidence when anchor words are sparse, ASR is incomplete, or you had to infer boundaries from neighboring context. ' +
            'Notes should be short and factual, for example "ASR likely missed part of the opening", "boundary inferred from neighboring sentences", or "two lines may blur together here".',
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

  const raw = completion.choices[0]?.message?.content?.trim()
  alignmentDebug('raw_model_output', { rawOutput: raw ?? null })
  if (!raw) return { parsed: null, rawOutput: null }
  try {
    return { parsed: LlmAlignmentSchema.parse(JSON.parse(raw)), rawOutput: raw }
  } catch {
    return { parsed: null, rawOutput: raw }
  }
}

function deriveNotes(input: {
  status: ReadAloudSentenceAlignmentStatus
  llmNotes: string[]
  heuristicNotes: string[]
  contentMatch01: number
  agreement01: number
  coherence01?: number
  inferredBoundary?: boolean
}): string[] {
  const notes: string[] = []
  for (const note of [...input.llmNotes, ...input.heuristicNotes]) {
    const t = note.trim()
    if (!t || notes.includes(t)) continue
    notes.push(t)
  }
  if (input.status === 'approximate' && input.contentMatch01 >= 0.58) {
    notes.push('window is usable but some function words were likely missed by ASR')
  }
  if (input.status === 'uncertain' && input.agreement01 < 0.28) {
    notes.push('LLM and heuristic windows disagreed, so this match is low confidence')
  }
  if ((input.coherence01 ?? 1) < 0.45) {
    notes.push('ordering is only loosely supported by neighboring sentence boundaries')
  }
  if (input.inferredBoundary) {
    notes.push('boundary was inferred from neighboring sentence placement')
  }
  return notes.slice(0, 5)
}

function rescueMissingWindows(
  rows: RescueRow[],
  heuristic: HeuristicCandidate[]
): RescueRow[] {
  const out = rows.map((row) => ({ ...row }))
  for (let i = 0; i < out.length; i++) {
    if (out[i]!.startWordIndex != null && out[i]!.endWordIndex != null) continue
    const heuristicRow = heuristic[i]
    if (heuristicRow?.startWordIndex != null && heuristicRow.endWordIndex != null) {
      out[i] = {
        startWordIndex: heuristicRow.startWordIndex,
        endWordIndex: heuristicRow.endWordIndex,
        confidence: clamp01(Math.max(out[i]!.confidence, heuristicRow.confidence * 0.82)),
        notes: ['filled by monotonic heuristic rescue', ...heuristicRow.notes, ...out[i]!.notes].slice(0, 5),
        source: 'heuristic',
      }
      continue
    }
    const prev = [...out.slice(0, i)].reverse().find((row) => row.startWordIndex != null && row.endWordIndex != null)
    const next = out.slice(i + 1).find((row) => row.startWordIndex != null && row.endWordIndex != null)
    if (prev && next && (prev.endWordIndex as number) + 1 <= (next.startWordIndex as number) - 1) {
      const startWordIndex = (prev.endWordIndex as number) + 1
      const endWordIndex = Math.max(startWordIndex, (next.startWordIndex as number) - 1)
      out[i] = {
        startWordIndex,
        endWordIndex,
        confidence: 0.28,
        notes: ['window was interpolated between stronger neighboring sentences'],
        source: 'llm_repaired',
        inferredBoundary: true,
      }
    }
  }
  return out
}

function buildSummary(
  alignments: ReadAloudSentenceAlignment[],
  input?: { llmStructuredOutput?: boolean }
): ReadAloudSentenceAlignmentSummary {
  const usable = alignments.filter(
    (a) => a.startMs != null && a.endMs != null && (a.alignmentStatus === 'aligned' || a.alignmentStatus === 'approximate')
  )
  const strong = alignments.filter((a) => a.alignmentStatus === 'aligned')
  const approximate = alignments.filter((a) => a.alignmentStatus === 'approximate')
  const uncertain = alignments.filter((a) => a.alignmentStatus === 'uncertain')
  const missing = alignments.filter((a) => a.alignmentStatus === 'missing')
  const total = alignments.length
  const coverage01 = total > 0 ? usable.length / total : 0
  const usableWeight = alignments.reduce((sum, a) => {
    const weight = a.alignmentStatus === 'aligned' ? 1 : a.alignmentStatus === 'approximate' ? 0.75 : a.alignmentStatus === 'uncertain' ? 0.3 : 0
    return sum + weight
  }, 0)
  const avgConfidence =
    usableWeight > 0
      ? alignments.reduce((sum, a) => {
          const weight = a.alignmentStatus === 'aligned' ? 1 : a.alignmentStatus === 'approximate' ? 0.75 : a.alignmentStatus === 'uncertain' ? 0.3 : 0
          return sum + clamp01(a.alignmentConfidence) * weight
        }, 0) / usableWeight
      : 0
  const overallConfidence01 = clamp01(avgConfidence * 0.68 + coverage01 * 0.32)
  const reasons: string[] = []
  if (usable.length < Math.max(1, Math.ceil(total * 0.25))) {
    reasons.push('Only a small part of the passage could be matched to usable sentence windows.')
  }
  if (coverage01 < 0.38) {
    reasons.push('Sentence coverage across the passage stayed limited.')
  }
  if (overallConfidence01 < 0.24) {
    reasons.push('Overall sentence alignment confidence is weak.')
  }
  const weakOverall = usable.length < Math.max(1, Math.ceil(total * 0.25)) || overallConfidence01 < 0.24
  return {
    alignedSentenceCount: strong.length,
    approximateSentenceCount: approximate.length,
    uncertainSentenceCount: uncertain.length,
    missingSentenceCount: missing.length,
    usableSentenceCount: usable.length,
    totalSentenceCount: total,
    coverage01,
    overallConfidence01,
    weakOverall,
    reasons,
    matchedTranscriptText: alignments
      .filter((a) => a.spokenTextApprox.trim().length > 0)
      .map((a) => a.spokenTextApprox)
      .join(' ')
      .trim(),
    usedLlm: alignments.some((a) => a.source === 'llm' || a.source === 'llm_repaired'),
    usedHeuristicFallback: alignments.some((a) => a.source === 'heuristic'),
    llmStructuredOutput: Boolean(input?.llmStructuredOutput),
    interpolatedSentenceCount: alignments.filter((a) => a.notes?.some((note) => /interpolated/i.test(note))).length,
    sourceCounts: {
      llm: alignments.filter((a) => a.source === 'llm').length,
      heuristic: alignments.filter((a) => a.source === 'heuristic').length,
      llmRepaired: alignments.filter((a) => a.source === 'llm_repaired').length,
    },
  }
}

export async function alignReadAloudSentences(input: {
  targetText: string
  sentences: string[]
  fullTranscript: string
  words: TimedSttWord[]
  passageWindowHint?: { startWordIndex: number; endWordIndex: number } | null
}): Promise<ReadAloudSentenceAlignmentResult> {
  const sentences = input.sentences.map((s) => s.trim()).filter(Boolean)
  const searchWords = buildSearchWords(input.words, input.passageWindowHint)
  const heuristic = buildHeuristicCandidates(sentences, searchWords)
  const llmRes = await runLlmAlignment({
    targetText: input.targetText,
    fullTranscript: input.fullTranscript,
    sentences,
    searchWords,
    heuristicCandidates: heuristic,
  })
  const llm = llmRes.parsed

  const llmBySentence = new Map<number, z.infer<typeof LlmAlignmentSchema>['alignments'][number]>()
  for (const row of llm?.alignments ?? []) llmBySentence.set(row.sentenceIndex, row)

  let lastEndWordIndex = -1
  const initialRows = sentences.map((targetSentence, sentenceIndex) => {
    const heuristicRow = heuristic[sentenceIndex] ?? {
      startWordIndex: null,
      endWordIndex: null,
      confidence: 0,
      status: 'missing' as const,
      notes: [],
    }
    const llmRow = llmBySentence.get(sentenceIndex)

    let startWordIndex = llmRow?.startWordIndex ?? null
    let endWordIndex = llmRow?.endWordIndex ?? null
    let source: ReadAloudSentenceAlignment['source'] = llmRow ? 'llm' : 'heuristic'
    let llmNotes = llmRow?.notes ?? []

    if (
      startWordIndex == null ||
      endWordIndex == null ||
      endWordIndex < startWordIndex ||
      !searchWords.some((w) => w.globalIndex === startWordIndex) ||
      !searchWords.some((w) => w.globalIndex === endWordIndex)
    ) {
      startWordIndex = heuristicRow.startWordIndex
      endWordIndex = heuristicRow.endWordIndex
      source = 'heuristic'
      llmNotes = llmRow?.notes ?? []
    }

    if (startWordIndex != null && endWordIndex != null && startWordIndex <= lastEndWordIndex) {
      const minStart = lastEndWordIndex + 1
      if (endWordIndex < minStart) {
        startWordIndex = heuristicRow.startWordIndex != null && heuristicRow.startWordIndex >= minStart ? heuristicRow.startWordIndex : null
        endWordIndex = heuristicRow.endWordIndex != null && startWordIndex != null && heuristicRow.endWordIndex >= startWordIndex ? heuristicRow.endWordIndex : null
        source = startWordIndex != null ? 'llm_repaired' : source
      } else {
        startWordIndex = minStart
        source = 'llm_repaired'
      }
      llmNotes = ['window was adjusted to preserve sentence order', ...llmNotes]
    }
    if (endWordIndex != null) lastEndWordIndex = Math.max(lastEndWordIndex, endWordIndex)

    return {
      sentenceIndex,
      startWordIndex,
      endWordIndex,
      llmConfidence: clamp01(llmRow?.alignmentConfidence ?? 0),
      llmStatus: llmRow?.alignmentStatus,
      llmNotes,
      heuristicRow,
      source,
      targetSentence,
    }
  })

  const rescuedRows = rescueMissingWindows(
    initialRows.map((row) => ({
      startWordIndex: row.startWordIndex,
      endWordIndex: row.endWordIndex,
      confidence: row.llmConfidence,
      notes: row.llmNotes,
      source: row.source,
    })),
    heuristic
  )

  const alignments: ReadAloudSentenceAlignment[] = initialRows.map((row, sentenceIndex) => {
    const rescued = rescuedRows[sentenceIndex]!
    let startWordIndex = rescued.startWordIndex
    let endWordIndex = rescued.endWordIndex
    let source = rescued.source
    const heuristicRow = row.heuristicRow
    const spokenTextApprox = wordsToJoinedText(searchWords, startWordIndex, endWordIndex)
    const contentMatch01 = spokenTextApprox ? approximateSentenceMatch01(row.targetSentence, spokenTextApprox) : 0
    const agreement01 = rangeOverlap01(
      { startWordIndex, endWordIndex },
      { startWordIndex: heuristicRow.startWordIndex, endWordIndex: heuristicRow.endWordIndex }
    )
    const neighborPrev = rescuedRows[sentenceIndex - 1]
    const neighborNext = rescuedRows[sentenceIndex + 1]
    let coherence01 = 0.72
    if (startWordIndex != null && endWordIndex != null && neighborPrev?.endWordIndex != null) {
      const gap = startWordIndex - neighborPrev.endWordIndex - 1
      coherence01 = gap >= -2 ? clamp01(1 - Math.max(0, gap - 12) / 24) : clamp01(1 - Math.abs(gap) * 0.16)
    }
    if (startWordIndex != null && endWordIndex != null && neighborNext?.startWordIndex != null) {
      const gap = neighborNext.startWordIndex - endWordIndex - 1
      coherence01 = (coherence01 + (gap >= -2 ? clamp01(1 - Math.max(0, gap - 12) / 24) : clamp01(1 - Math.abs(gap) * 0.16))) / 2
    }

    const anchorBonus = contentMatch01 > 0 ? Math.min(0.18, contentMatch01 * 0.22) : 0
    const baseSupport = Math.max(row.llmConfidence, heuristicRow.confidence)
    let blendedConfidence = row.llmStatus
      ? clamp01(row.llmConfidence * 0.36 + baseSupport * 0.28 + contentMatch01 * 0.2 + agreement01 * 0.08 + coherence01 * 0.08 + anchorBonus)
      : clamp01(baseSupport * 0.46 + contentMatch01 * 0.28 + agreement01 * 0.12 + coherence01 * 0.14 + anchorBonus)
    if (rescued.inferredBoundary) blendedConfidence = clamp01(blendedConfidence * 0.72)
    if (source === 'heuristic' && row.llmStatus == null) blendedConfidence = clamp01(blendedConfidence * 0.9)

    let alignmentStatus: ReadAloudSentenceAlignmentStatus =
      row.llmStatus ?? (startWordIndex != null && endWordIndex != null ? heuristicStatusFromScore(blendedConfidence) : 'missing')
    if (startWordIndex == null || endWordIndex == null || !spokenTextApprox) {
      alignmentStatus = 'missing'
    } else if (blendedConfidence >= 0.76 && contentMatch01 >= 0.34 && coherence01 >= 0.56) {
      alignmentStatus = 'aligned'
    } else if (blendedConfidence >= 0.46 && coherence01 >= 0.34) {
      alignmentStatus = 'approximate'
    } else if (blendedConfidence >= 0.22) {
      alignmentStatus = 'uncertain'
    } else {
      alignmentStatus = 'missing'
      startWordIndex = null
      endWordIndex = null
      source = source === 'llm' ? 'llm_repaired' : source
    }

    const startWord = startWordIndex != null ? searchWords.find((w) => w.globalIndex === startWordIndex) : null
    const endWord = endWordIndex != null ? searchWords.find((w) => w.globalIndex === endWordIndex) : null
    return {
      sentenceIndex,
      targetSentence: row.targetSentence,
      spokenTextApprox,
      startMs: startWord ? Math.round(startWord.startSec * 1000) : null,
      endMs: endWord ? Math.round(endWord.endSec * 1000) : null,
      alignmentConfidence: clamp01(blendedConfidence),
      alignmentStatus,
      notes: deriveNotes({
        status: alignmentStatus,
        llmNotes: row.llmNotes,
        heuristicNotes: [...heuristicRow.notes, ...rescued.notes],
        contentMatch01,
        agreement01,
        coherence01,
        inferredBoundary: rescued.inferredBoundary,
      }),
      startWordIndex,
      endWordIndex,
      source,
    }
  })

  const summary = buildSummary(alignments, { llmStructuredOutput: llm != null })
  alignmentDebug('normalized_output', {
    rawModelOutputPresent: llmRes.rawOutput != null,
    overallAlignmentConfidence: summary.overallConfidence01,
    weakOverall: summary.weakOverall,
    reasons: summary.reasons,
    alignments: alignments.map((row) => ({
      sentenceIndex: row.sentenceIndex,
      startMs: row.startMs,
      endMs: row.endMs,
      alignmentConfidence: row.alignmentConfidence,
      alignmentStatus: row.alignmentStatus,
      source: row.source,
      notes: row.notes ?? [],
    })),
  })

  return { alignments, summary }
}

export async function alignReadAloudSentenceWindows(
  input: ReadAloudSentenceAlignmentInput
): Promise<ReadAloudSentenceAlignmentOutput> {
  const targetSentences = [...input.targetSentences]
    .sort((a, b) => a.index - b.index)
    .map((row) => row.text.trim())
    .filter(Boolean)
  const words: TimedSttWord[] = input.transcriptWords.map((w) => ({
    word: w.word,
    startSec: Math.max(0, w.startMs) / 1000,
    endSec: Math.max(Math.max(0, w.startMs), w.endMs) / 1000,
  }))

  const result = await alignReadAloudSentences({
    targetText: input.targetPassage,
    sentences: targetSentences,
    fullTranscript: input.fullTranscriptText,
    words,
  })

  const notes = [
    ...result.summary.reasons,
    ...(result.summary.usedHeuristicFallback ? ['Heuristic candidate windows helped fill missing model spans.'] : []),
  ]
  alignmentDebug('confidence_notes', {
    overallAlignmentConfidence: result.summary.overallConfidence01,
    notes,
  })

  return {
    sentenceAlignments: result.alignments.map((row) => ({
      sentenceIndex: row.sentenceIndex,
      targetSentence: row.targetSentence,
      spokenTextApprox: row.spokenTextApprox,
      startMs: row.startMs,
      endMs: row.endMs,
      alignmentConfidence: row.alignmentConfidence,
      alignmentStatus: row.alignmentStatus,
      notes: row.notes ?? [],
    })),
    overallAlignmentConfidence: result.summary.overallConfidence01,
    notes,
  }
}

export const alignReadAloudSentencesMonotonic = alignReadAloudSentences
