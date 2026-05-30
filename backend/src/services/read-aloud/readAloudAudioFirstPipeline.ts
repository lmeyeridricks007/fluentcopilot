import { getAzureSpeechLocale } from '../speech/pronunciationAssessmentConfig'
import type { NormalizedPronunciationAssessment } from '../speech/pronunciationAssessmentContracts'
import { runPronunciationAssessment } from '../speech/pronunciationAssessmentGateway'
import { transcribeReadAloudWithWordTimestamps } from './readAloudOpenAiSttWords'
import { extractAudioSegmentToWavPcm16kMono } from './readAloudAudioSegment'
import { createAudioChunks, type AudioChunk } from './audioChunkingService'
import { interpretAudioChunksWithLlm } from './audioCoachingLlmService'
import { rollupPronunciationAssessment } from './readAloudRollupPa'
import { buildAudioFirstDimensions } from './readAloudDimensions'
import { buildReadAloudNextActions } from './readAloudSentenceReport'
import { sanitizeReadAloudTranscript, transcriptHasHallucinationRisk } from './readAloudTranscriptSanitize'
import type { ReadAloudEvaluateResult } from './readAloudEvaluateTypes'

type ScoredChunk = AudioChunk & {
  pronunciationScore: number | null
  fluencyScore: number | null
  completenessScore: number | null
  prosodyScore: number | null
  confidence: number
  overallQuality01: number
  pa: NormalizedPronunciationAssessment | null
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  async function worker(): Promise<void> {
    while (true) {
      const idx = i++
      if (idx >= items.length) return
      out[idx] = await fn(items[idx]!, idx)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return out
}

function weakWordsFromAssessment(a: NormalizedPronunciationAssessment | null, max: number): string[] {
  if (!a?.words?.length) return []
  return a.words
    .filter((word) => word.accuracyScore < 72 && word.word.trim().length > 1)
    .sort((aWord, bWord) => aWord.accuracyScore - bWord.accuracyScore)
    .slice(0, max)
    .map((word) => word.word)
}

function pronunciationTipForWord(word: { word: string; accuracyScore: number; errorType?: string }): string {
  const error = (word.errorType ?? '').toLowerCase()
  if (error.includes('omission')) return `Finish “${word.word}” fully instead of dropping part of it.`
  if (error.includes('insertion')) return `Keep “${word.word}” cleaner so extra sounds do not slip in.`
  if (error.includes('mispronunciation')) return `Slow “${word.word}” down and make each sound clearer.`
  return word.accuracyScore < 60
    ? `“${word.word}” needs a slower, clearer pronunciation.`
    : `Give “${word.word}” a little more space so it sounds cleaner.`
}

function pronunciationTargetsFromAssessment(
  pa: NormalizedPronunciationAssessment | null,
  max: number,
  chunkStartMs = 0,
  chunkEndMs?: number
): Array<{
  word: string
  accuracyScore: number
  tip: string
  referenceAudioText: string
  clipStartSec: number | null
  clipEndSec: number | null
}> {
  if (!pa?.words?.length) return []
  const seen = new Set<string>()
  return pa.words
    .filter((word) => word.accuracyScore < 82 && word.word.trim().length > 1)
    .sort((a, b) => a.accuracyScore - b.accuracyScore)
    .filter((word) => {
      const key = word.word.trim().toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, max)
    .map((word) => ({
      word: word.word,
      accuracyScore: Math.round(word.accuracyScore),
      tip: pronunciationTipForWord(word),
      referenceAudioText: word.word,
      clipStartSec:
        word.startMs != null
          ? Math.max(0, (chunkStartMs + word.startMs - 80) / 1000)
          : null,
      clipEndSec:
        word.endMs != null
          ? Math.max(
              word.startMs != null ? Math.max(0, (chunkStartMs + word.startMs - 80) / 1000 + 0.18) : 0,
              Math.min(chunkEndMs ?? chunkStartMs + word.endMs + 120, chunkStartMs + word.endMs + 120) / 1000
            )
          : null,
    }))
}

function mergePronunciationTargets(
  chunks: ScoredChunk[],
  chunkIds: string[]
): Array<{
  word: string
  accuracyScore: number
  tip: string
  referenceAudioText: string
  clipStartSec: number | null
  clipEndSec: number | null
}> {
  const items = chunks.flatMap((chunk) =>
    chunkIds.includes(chunk.chunkId) ? pronunciationTargetsFromAssessment(chunk.pa, 3, chunk.startMs, chunk.endMs) : []
  )
  const best = new Map<
    string,
    {
      word: string
      accuracyScore: number
      tip: string
      referenceAudioText: string
      clipStartSec: number | null
      clipEndSec: number | null
    }
  >()
  for (const item of items) {
    const key = item.word.trim().toLowerCase()
    const prev = best.get(key)
    if (!prev || item.accuracyScore < prev.accuracyScore) best.set(key, item)
  }
  return [...best.values()].sort((a, b) => a.accuracyScore - b.accuracyScore).slice(0, 4)
}

function buildPauseGuidance(chunks: ScoredChunk[], chunkIds: string[]): string | null {
  const matches = chunks.filter((chunk) => chunkIds.includes(chunk.chunkId))
  if (!matches.length) return null
  const avgBefore = matches.reduce((sum, chunk) => sum + chunk.pauseBeforeMs, 0) / matches.length
  const avgAfter = matches.reduce((sum, chunk) => sum + chunk.pauseAfterMs, 0) / matches.length
  const avgFluency = matches.reduce((sum, chunk) => sum + (chunk.fluencyScore ?? 65), 0) / matches.length
  if (avgFluency < 66 && avgAfter < 220) {
    return 'Add a short pause after this phrase instead of running straight into the next idea.'
  }
  if (avgBefore > 900) {
    return 'Start this phrase a little sooner after the previous pause so it does not lose momentum.'
  }
  if (avgAfter > 1_050) {
    return 'The pause after this phrase was longer than needed; keep the next phrase moving a bit sooner.'
  }
  if (avgFluency < 72) {
    return 'Keep one small pause at the phrase boundary, then let the rest of the words stay connected.'
  }
  return null
}

function buildNaturalnessNote(chunks: ScoredChunk[], chunkIds: string[]): string | null {
  const matches = chunks.filter((chunk) => chunkIds.includes(chunk.chunkId))
  if (!matches.length) return null
  const avgProsody = matches.reduce((sum, chunk) => sum + (chunk.prosodyScore ?? chunk.fluencyScore ?? 65), 0) / matches.length
  if (avgProsody >= 76) return 'This part already sounded fairly natural in Dutch rhythm.'
  if (avgProsody >= 62) return 'This part was understandable, but the rhythm still sounded a bit careful rather than natural Dutch.'
  return 'This part sounded less Dutch-like because the rhythm or word stress stayed flat, clipped, or rushed.'
}

function buildWhyItStoodOut(chunk: ScoredChunk): string {
  if (chunk.pronunciationScore != null && chunk.fluencyScore != null && chunk.pronunciationScore < 66 && chunk.fluencyScore < 66) {
    return 'Both the sounds and the rhythm weakened here, so the phrase became harder to follow.'
  }
  if (chunk.pronunciationScore != null && chunk.pronunciationScore < 66) {
    return 'The main problem here was word clarity: a few sounds were too blurred or clipped.'
  }
  if (chunk.fluencyScore != null && chunk.fluencyScore < 66) {
    return 'The words likely came out too quickly or unevenly, so the phrase lost its shape.'
  }
  if (chunk.completenessScore != null && chunk.completenessScore < 70) {
    return 'Part of the phrase seems incomplete, so the idea did not land cleanly.'
  }
  return 'This chunk stood out because it sounded less clear and less steady than the surrounding speech.'
}

function chunkConfidence(chunk: AudioChunk, pa: NormalizedPronunciationAssessment | null): number {
  const durationFit01 = 1 - Math.min(1, Math.abs(chunk.durationMs - 1_800) / 2_400)
  const transcriptTokens = chunk.transcript.split(/\s+/).filter(Boolean).length
  const transcriptSupport01 = Math.min(1, transcriptTokens / 5)
  const paSupport01 = pa ? Math.min(1, (pa.words.length > 0 ? 0.72 : 0.56) + pa.overallScore / 250) : 0.28
  return clamp01(durationFit01 * 0.25 + transcriptSupport01 * 0.25 + paSupport01 * 0.5)
}

function chunkQuality(pa: NormalizedPronunciationAssessment | null, confidence: number): number {
  if (!pa) return clamp01(confidence * 0.45)
  const pron01 = pa.pronunciationScore / 100
  const flu01 = pa.fluencyScore / 100
  const comp01 = pa.completenessScore / 100
  const prosody01 = (pa.prosodyScore ?? pa.fluencyScore) / 100
  return clamp01(pron01 * 0.42 + flu01 * 0.26 + comp01 * 0.12 + prosody01 * 0.1 + confidence * 0.1)
}

function mergeChunkRange(chunks: ScoredChunk[], chunkIds: string[]) {
  const matches = chunks.filter((chunk) => chunkIds.includes(chunk.chunkId))
  if (!matches.length) return null
  return {
    startMs: Math.min(...matches.map((chunk) => chunk.startMs)),
    endMs: Math.max(...matches.map((chunk) => chunk.endMs)),
    transcript: matches.map((chunk) => chunk.transcript).filter(Boolean).join(' ').trim(),
    confidence: clamp01(matches.reduce((sum, chunk) => sum + chunk.confidence, 0) / matches.length),
  }
}

function fallbackWeakSegments(chunks: ScoredChunk[]): NonNullable<ReadAloudEvaluateResult['weakSegments']> {
  return [...chunks]
    .sort((a, b) => a.overallQuality01 - b.overallQuality01)
    .slice(0, Math.min(4, chunks.length))
    .map((chunk, index) => ({
      id: `weak-${index + 1}`,
      chunkIds: [chunk.chunkId],
      startSec: chunk.startMs / 1000,
      endSec: chunk.endMs / 1000,
      transcript: chunk.transcript,
      issue:
        chunk.fluencyScore != null && chunk.pronunciationScore != null && chunk.fluencyScore > chunk.pronunciationScore + 8
          ? 'Sounds understandable overall, but a few words were unclear.'
          : chunk.fluencyScore != null && chunk.fluencyScore < 68
            ? 'Speech sounded rushed or uneven.'
            : 'This part of the read sounded less clear than the rest.',
      likelyIntendedPhrase: chunk.transcript || 'Short unclear phrase',
      whyItStoodOut: buildWhyItStoodOut(chunk),
      suggestion:
        chunk.fluencyScore != null && chunk.fluencyScore < 68
          ? 'Slow down slightly and finish the chunk on a steadier rhythm.'
          : 'Repeat this short phrase more slowly and open the vowels more clearly.',
      pauseGuidance: buildPauseGuidance([chunk], [chunk.chunkId]),
      naturalnessNote: buildNaturalnessNote([chunk], [chunk.chunkId]),
      referenceAudioText: chunk.transcript || 'Probeer deze zin rustiger opnieuw',
      confidence: chunk.confidence,
      wordHints: chunk.pa
        ? weakWordsFromAssessment(chunk.pa, 3)
        : [],
      pronunciationTargets: pronunciationTargetsFromAssessment(chunk.pa, 3, chunk.startMs, chunk.endMs),
    }))
}

function buildCoachingFallback(input: {
  weakSegments: NonNullable<ReadAloudEvaluateResult['weakSegments']>
  overallScore01: number
  speakingQuality01: number
  smoothReading01: number
}): ReadAloudEvaluateResult['coaching'] {
  const weakest = input.weakSegments[0]
  return {
    summary:
      input.overallScore01 >= 0.8
        ? 'The recording sounds strong overall, with a few short stretches that still need cleaner Dutch sounds.'
        : input.overallScore01 >= 0.64
          ? 'The read is understandable overall, but a few short chunks sound rushed or unclear.'
          : 'Several short parts of the recording sound unclear, but we could still identify the main places to improve.',
    focusArea: weakest?.suggestion ?? 'Focus on one short weak segment at a time and keep the rhythm steady.',
    nextStepDrills: [
      'Replay one weak segment and repeat it twice at 80% speed.',
      'Keep the vowel long enough to hear it clearly before speeding up again.',
      input.smoothReading01 < 0.68
        ? 'Practice linking short chunks smoothly without rushing the last word.'
        : 'Compare your clip with the model phrase, then record the full passage once more.',
    ],
    feedbackLines: input.weakSegments.slice(0, 4).map((segment) => `${segment.issue} ${segment.suggestion}`),
  }
}

function buildAudioFirstDeadZones(chunks: ScoredChunk[]): NonNullable<ReadAloudEvaluateResult['deadZones']> {
  return chunks
    .filter((chunk) => chunk.confidence < 0.52 || chunk.overallQuality01 < 0.55)
    .slice(0, 8)
    .map((chunk) => ({
      startSec: chunk.startMs / 1000,
      endSec: chunk.endMs / 1000,
      kind: chunk.overallQuality01 < 0.42 ? 'long_unmatched' as const : 'transition_pause' as const,
      impactWeight: chunk.overallQuality01 < 0.42 ? 0.72 : 0.42,
      label: 'Unclear or low-confidence speech segment',
    }))
}

export async function evaluateReadAloudAudioFirst(input: {
  targetText: string
  audio: Buffer
  mimeType: string
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2'
  genre?: string | null
  transcriptionPrompt: string
}): Promise<ReadAloudEvaluateResult> {
  const stt = await transcribeReadAloudWithWordTimestamps(input.audio, input.mimeType, {
    language: 'nl',
    transcriptionPrompt: input.transcriptionPrompt,
    purpose: 'read_aloud_eval',
  })

  const sanitized = sanitizeReadAloudTranscript(stt.text, input.targetText)
  const fullTranscript = sanitized.text || stt.text.trim()
  const chunks = createAudioChunks({
    audio: input.audio,
    transcriptWords: stt.words,
    fullTranscriptText: fullTranscript,
  })

  const scoredChunks = await mapWithConcurrency(chunks, 2, async (chunk): Promise<ScoredChunk> => {
    const audio = await extractAudioSegmentToWavPcm16kMono(input.audio, input.mimeType, chunk.startMs / 1000, chunk.endMs / 1000)
    const paRes = await runPronunciationAssessment({
      audio,
      mimeType: 'audio/wav',
      transcript: chunk.transcript,
      locale: getAzureSpeechLocale(),
      assessmentMode: 'open_response',
      scenarioHint: 'read_aloud_chunk',
    })
    const confidence = chunkConfidence(chunk, paRes.assessment)
    return {
      ...chunk,
      pronunciationScore: paRes.assessment?.pronunciationScore ?? null,
      fluencyScore: paRes.assessment?.fluencyScore ?? null,
      completenessScore: paRes.assessment?.completenessScore ?? null,
      prosodyScore: paRes.assessment?.prosodyScore ?? null,
      confidence,
      overallQuality01: chunkQuality(paRes.assessment, confidence),
      pa: paRes.assessment,
    }
  })

  const rollup = rollupPronunciationAssessment({
    targetText: input.targetText,
    recognizedText: fullTranscript,
    segments: scoredChunks.map((chunk) => ({ pa: chunk.pa, weightSec: Math.max(0.2, chunk.durationMs / 1000) })),
  })

  const llm = await interpretAudioChunksWithLlm({
    chunks: scoredChunks.map((chunk) => ({
      chunkId: chunk.chunkId,
      startMs: chunk.startMs,
      endMs: chunk.endMs,
      transcript: chunk.transcript,
      pronunciationScore: chunk.pronunciationScore,
      fluencyScore: chunk.fluencyScore,
      completenessScore: chunk.completenessScore,
      prosodyScore: chunk.prosodyScore,
      confidence: chunk.confidence,
    })),
    fullTranscript,
    referenceText: input.targetText,
  })

  const weakSegments = llm?.weakSegments.length
    ? llm.weakSegments
        .map((segment, index) => {
          const merged = mergeChunkRange(scoredChunks, segment.chunkIds)
          if (!merged) return null
          const chunkMatches = scoredChunks.filter((chunk) => segment.chunkIds.includes(chunk.chunkId))
          const weakestChunk = [...chunkMatches].sort((a, b) => a.overallQuality01 - b.overallQuality01)[0] ?? null
          return {
            id: `weak-${index + 1}`,
            chunkIds: segment.chunkIds,
            startSec: merged.startMs / 1000,
            endSec: merged.endMs / 1000,
            transcript: merged.transcript,
            issue: segment.issue,
            whyItStoodOut: segment.whyItStoodOut?.trim() || (weakestChunk ? buildWhyItStoodOut(weakestChunk) : null),
            likelyIntendedPhrase: segment.likelyIntendedPhrase,
            suggestion: segment.coachingTip,
            pauseGuidance: segment.pauseGuidance?.trim() || buildPauseGuidance(scoredChunks, segment.chunkIds),
            naturalnessNote: segment.naturalnessNote?.trim() || buildNaturalnessNote(scoredChunks, segment.chunkIds),
            referenceAudioText: segment.referenceAudioText,
            confidence: clamp01(segment.confidence),
            wordHints: segment.highlightedWords ?? [],
            pronunciationTargets: mergePronunciationTargets(scoredChunks, segment.chunkIds),
          }
        })
        .filter((segment): segment is NonNullable<typeof segment> => Boolean(segment))
    : fallbackWeakSegments(scoredChunks)

  const averageChunkQuality01 =
    scoredChunks.length > 0 ? scoredChunks.reduce((sum, chunk) => sum + chunk.overallQuality01, 0) / scoredChunks.length : 0
  const averageChunkConfidence01 =
    scoredChunks.length > 0 ? scoredChunks.reduce((sum, chunk) => sum + chunk.confidence, 0) / scoredChunks.length : 0
  const llmConfidence01 = llm?.overallConfidence ?? averageChunkConfidence01
  const speakingQuality01 = clamp01((rollup?.overallScore ?? averageChunkQuality01 * 100) / 100 * 0.72 + llmConfidence01 * 0.28)
  const smoothReading01 = clamp01((rollup?.fluencyScore ?? averageChunkQuality01 * 100) / 100 * 0.7 + averageChunkConfidence01 * 0.15 + (rollup?.prosodyScore ?? rollup?.fluencyScore ?? 68) / 100 * 0.15)
  const clarity01 = clamp01((rollup?.pronunciationScore ?? averageChunkQuality01 * 100) / 100 * 0.68 + llmConfidence01 * 0.32)
  const overallScore01 = clamp01((rollup?.overallScore ?? averageChunkQuality01 * 100) / 100 * 0.62 + llmConfidence01 * 0.18 + smoothReading01 * 0.2)

  const dimensions = buildAudioFirstDimensions({
    pa: rollup,
    overallScore01,
    speakingQuality01,
    smoothReading01,
    clarity01,
    llmConfidence01,
    cefrLevel: input.cefrLevel,
  })

  const totalSec = stt.durationSeconds ?? (scoredChunks.length ? scoredChunks[scoredChunks.length - 1]!.endMs / 1000 : 0)
  const weakSec = weakSegments.reduce((sum, segment) => sum + Math.max(0, segment.endSec - segment.startSec), 0)
  const deadZones = buildAudioFirstDeadZones(scoredChunks)
  const weakWords = weakWordsFromAssessment(rollup, 14)
  const coaching =
    llm != null
      ? {
          summary: llm.summary,
          focusArea: llm.focusArea,
          nextStepDrills: llm.nextStepDrills,
          feedbackLines: llm.feedbackLines,
        }
      : buildCoachingFallback({
          weakSegments,
          overallScore01,
          speakingQuality01,
          smoothReading01,
        })

  const reportMode: 'strong' | 'limited' | 'failure' =
    scoredChunks.length >= 3 && llmConfidence01 >= 0.55 ? 'strong' : scoredChunks.length >= 1 ? 'limited' : 'failure'
  const fairness = {
    mode: reportMode,
    canScoreFairly: reportMode !== 'failure',
    message:
      reportMode === 'limited'
        ? 'We evaluated the recording by short spoken chunks, so the feedback below focuses on the clearest weak sections rather than strict text matching.'
        : reportMode === 'failure'
          ? 'We could only recover a very small amount of scoreable speech from this recording.'
          : null,
    reasons: transcriptHasHallucinationRisk(fullTranscript, input.targetText)
      ? ['The transcript was noisy, so the report leaned more on chunk-level audio quality than on exact wording.']
      : [],
  }

  const nextActions = buildReadAloudNextActions({
    weakWords,
    cefrLevel: input.cefrLevel,
    genre: input.genre?.trim() ?? null,
    sentenceCount: 0,
    readingAccuracy01: overallScore01,
    worstSentenceIndex: null,
  }).filter((action) => action.id !== 'retry_sentence')

  return {
    reportKind: 'read_aloud',
    targetText: input.targetText,
    recognizedText: fullTranscript,
    pronunciationAssessment: rollup,
    pronunciationApi: {
      summaryFeedback:
        rollup != null
          ? `Pronunciation averaged about ${Math.round(rollup.overallScore)}, fluency about ${Math.round(rollup.fluencyScore)}, and natural delivery about ${Math.round(((rollup.prosodyScore ?? rollup.fluencyScore) * 0.55 + smoothReading01 * 100 * 0.45))}. The sections below show where clarity, pauses, or word stress need the most work.`
          : 'We could still interpret the recording, but pronunciation scoring was only partial for this take.',
      recommendedNextStep: weakSegments[0]?.suggestion ?? 'Replay the weakest clip, then retry the full passage once more.',
      caveats: [
        'This report scores short spoken chunks first, then uses the passage only as context for coaching.',
        'Transcript errors do not automatically count as reading mistakes.',
        ...(fairness.message ? [fairness.message] : []),
      ],
    },
    dimensions,
    sentences: [],
    weakSegments,
    weakWords,
    coaching,
    nextActions,
    deadZones,
    audioCoverage: {
      totalSec,
      alignedSec: Math.max(0, totalSec - weakSec),
      deadSec: weakSec,
      deadImpactSec: weakSec,
      pauseLikeSec: 0,
      longUnmatchedSec: weakSec,
    },
    evaluationMode: 'audio_first_chunks',
    fullAudioTranscript: fullTranscript,
    timedWordCount: stt.words.length,
    audioChunks: scoredChunks.map((chunk) => ({
      chunkId: chunk.chunkId,
      startSec: chunk.startMs / 1000,
      endSec: chunk.endMs / 1000,
      durationSec: chunk.durationMs / 1000,
      transcript: chunk.transcript,
      pronunciationScore: chunk.pronunciationScore,
      fluencyScore: chunk.fluencyScore,
      completenessScore: chunk.completenessScore,
      prosodyScore: chunk.prosodyScore,
      confidence: chunk.confidence,
    })),
    audioChunkDebug: {
      chunkCount: scoredChunks.length,
      scoreableChunkCount: scoredChunks.filter((chunk) => chunk.pa != null).length,
      weakChunkCount: weakSegments.length,
      llmUsed: llm != null,
      llmConfidence01,
      topFailureReason: fairness.reasons[0] ?? null,
    },
    fairness,
  }
}
