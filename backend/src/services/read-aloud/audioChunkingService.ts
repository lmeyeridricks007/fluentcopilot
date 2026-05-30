import type { TimedSttWord } from './readAloudOpenAiSttWords'

export type AudioChunk = {
  chunkId: string
  startMs: number
  endMs: number
  durationMs: number
  transcript: string
  wordStartIndex: number
  wordEndIndex: number
  pauseBeforeMs: number
  pauseAfterMs: number
}

const TARGET_MIN_MS = 1_000
const TARGET_MAX_MS = 3_000
const HARD_MAX_MS = 3_400
const MIN_CHUNK_MS = 650

function clampMs(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.round(n))
}

function wordsToTranscript(words: TimedSttWord[], startIndex: number, endIndex: number): string {
  return words
    .slice(startIndex, endIndex + 1)
    .map((word) => word.word.trim())
    .filter(Boolean)
    .join(' ')
    .trim()
}

function buildChunk(words: TimedSttWord[], startIndex: number, endIndex: number): AudioChunk | null {
  const start = words[startIndex]
  const end = words[endIndex]
  if (!start || !end) return null
  const startMs = clampMs(start.startSec * 1000)
  const endMs = clampMs(end.endSec * 1000)
  if (endMs <= startMs) return null
  const before = startIndex > 0 ? clampMs((start.startSec - words[startIndex - 1]!.endSec) * 1000) : 0
  const after = endIndex < words.length - 1 ? clampMs((words[endIndex + 1]!.startSec - end.endSec) * 1000) : 0
  return {
    chunkId: `chunk-${startIndex + 1}-${endIndex + 1}`,
    startMs,
    endMs,
    durationMs: clampMs(endMs - startMs),
    transcript: wordsToTranscript(words, startIndex, endIndex),
    wordStartIndex: startIndex,
    wordEndIndex: endIndex,
    pauseBeforeMs: before,
    pauseAfterMs: after,
  }
}

function shouldSplit(input: {
  currentStartIndex: number
  currentStartWord: TimedSttWord
  previousWord: TimedSttWord
  currentWord: TimedSttWord
  currentIndex: number
}): boolean {
  const { currentStartIndex, currentStartWord, previousWord, currentWord, currentIndex } = input
  const gapMs = clampMs((currentWord.startSec - previousWord.endSec) * 1000)
  const currentDurationMs = clampMs((previousWord.endSec - currentStartWord.startSec) * 1000)
  const spanMs = clampMs((currentWord.endSec - currentStartWord.startSec) * 1000)
  const wordCount = currentIndex - currentStartIndex + 1

  if (gapMs >= 700) return true
  if (gapMs >= 400 && currentDurationMs >= TARGET_MIN_MS) return true
  if (spanMs >= HARD_MAX_MS) return true
  if (spanMs >= TARGET_MAX_MS && (gapMs >= 220 || wordCount >= 12)) return true
  return false
}

function initialChunks(words: TimedSttWord[]): AudioChunk[] {
  if (!words.length) return []
  const chunks: AudioChunk[] = []
  let startIndex = 0
  for (let i = 1; i < words.length; i++) {
    const previousWord = words[i - 1]!
    const currentWord = words[i]!
    if (!shouldSplit({ currentStartIndex: startIndex, currentStartWord: words[startIndex]!, previousWord, currentWord, currentIndex: i })) continue
    const chunk = buildChunk(words, startIndex, i - 1)
    if (chunk) chunks.push(chunk)
    startIndex = i
  }
  const finalChunk = buildChunk(words, startIndex, words.length - 1)
  if (finalChunk) chunks.push(finalChunk)
  return chunks
}

function mergeChunks(a: AudioChunk, b: AudioChunk, words: TimedSttWord[]): AudioChunk | null {
  return buildChunk(words, a.wordStartIndex, b.wordEndIndex)
}

function normalizeChunks(words: TimedSttWord[], chunks: AudioChunk[]): AudioChunk[] {
  if (chunks.length <= 1) return chunks
  const normalized: AudioChunk[] = []
  let i = 0
  while (i < chunks.length) {
    const current = chunks[i]!
    const wordCount = current.wordEndIndex - current.wordStartIndex + 1
    const tooSmall = current.durationMs < MIN_CHUNK_MS || wordCount < 2
    if (!tooSmall) {
      normalized.push(current)
      i++
      continue
    }

    const prev = normalized[normalized.length - 1]
    const next = chunks[i + 1]
    if (prev && (!next || prev.durationMs <= next.durationMs)) {
      const merged = mergeChunks(prev, current, words)
      if (merged) normalized[normalized.length - 1] = merged
      i++
      continue
    }
    if (next) {
      const merged = mergeChunks(current, next, words)
      if (merged) {
        normalized.push(merged)
        i += 2
        continue
      }
    }
    normalized.push(current)
    i++
  }
  return normalized
}

export function createAudioChunks(input: {
  audio?: Buffer
  transcriptWords: TimedSttWord[]
  fullTranscriptText?: string
}): AudioChunk[] {
  const words = input.transcriptWords.filter((word) => word.word.trim().length > 0)
  if (!words.length) return []
  const seeded = initialChunks(words)
  const normalized = normalizeChunks(words, seeded)
  return normalized
    .map((chunk) => buildChunk(words, chunk.wordStartIndex, chunk.wordEndIndex))
    .filter((chunk): chunk is AudioChunk => Boolean(chunk))
}
