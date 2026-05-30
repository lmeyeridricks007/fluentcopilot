import { getAzureSpeechLocale, getPronunciationRuntimeMode } from '../speech/pronunciationAssessmentConfig'
import type { NormalizedPronunciationAssessment } from '../speech/pronunciationAssessmentContracts'
import { runPronunciationAssessment } from '../speech/pronunciationAssessmentGateway'
import { transcribeReadAloudWithWordTimestamps, type TimedSttWord } from './readAloudOpenAiSttWords'
import { extractAudioSegmentToWavPcm16kMono } from './readAloudAudioSegment'
import { timedWordsToText } from './readAloudTimedWordTrim'
import { computeDeadZones, type ReadAloudDeadZone } from './readAloudDeadZones'
import { rollupPronunciationAssessment } from './readAloudRollupPa'
import { splitSentences } from './readAloudTextUtils'
import { diffWords } from './readAloudWordAlign'
import { transcriptHasHallucinationRisk } from './readAloudTranscriptSanitize'
import { buildDimensions } from './readAloudDimensions'
import { buildReadAloudNextActions, buildSentenceReviewsV2, worstSentenceIndex } from './readAloudSentenceReport'
import { generateReadAloudCoaching } from './readAloudCoachingLlm'
import {
  alignReadAloudSentences,
  approximateSentenceMatch01,
  type ReadAloudSentenceAlignment,
  type ReadAloudSentenceAlignmentStatus,
} from './readAloudSentenceAlignmentService'
import { inferReadAloudMainSpan } from './readAloudMainSpanInferenceService'
import {
  deterministicReadAloudReportQa,
  mergeReportQaCaveats,
  readAloudQaCoachingFeedbackLine,
  runReadAloudReportQaLlm,
} from './readAloudReportQa'
import type { ReadAloudEvaluateResult } from './readAloudEvaluateTypes'
import type { ReadAloudNextAction } from './readAloudSentenceReport'

function lightCleanTimedWords(words: TimedSttWord[]): TimedSttWord[] {
  return words
    .map((w) => ({
      ...w,
      word: w.word
        .replace(/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]+/g, ' ')
        .replace(/[\u3040-\u309F\u30A0-\u30FF]+/g, ' ')
        .replace(/[\u4E00-\u9FFF\u3400-\u4DBF]+/g, ' ')
        .trim(),
    }))
    .filter((w) => w.word.length > 0)
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
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker())
  await Promise.all(workers)
  return out
}

function weakWordsFromAssessment(a: NormalizedPronunciationAssessment | null, max: number): string[] {
  if (!a?.words?.length) return []
  return a.words
    .filter((w) => w.accuracyScore < 72 && w.word.trim().length > 1)
    .sort((x, y) => x.accuracyScore - y.accuracyScore)
    .slice(0, max)
    .map((w) => w.word)
}

function weakWordsFromDiff(target: string, spoken: string, max: number): string[] {
  const { ops } = diffWords(target, spoken)
  const w: string[] = []
  for (const o of ops) {
    if (o.kind === 'delete') w.push(o.target)
    if (o.kind === 'substitute') w.push(o.target)
  }
  return [...new Set(w)].slice(0, max)
}

export type ReadAloudSegmentedExtra = {
  deadZones: ReadAloudDeadZone[]
  audioCoverage: {
    totalSec: number
    alignedSec: number
    deadSec: number
    deadImpactSec: number
    pauseLikeSec: number
    longUnmatchedSec: number
  }
  usedLlmSentenceAlignment: boolean
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function alignmentWeight(status: ReadAloudSentenceAlignmentStatus): number {
  if (status === 'aligned') return 1
  if (status === 'approximate') return 0.72
  if (status === 'uncertain') return 0.28
  return 0
}

function buildSentenceClipMeta(input: {
  alignments: ReadAloudSentenceAlignment[]
  totalSec: number
}): Array<{
  spoken: string
  startSec: number | null
  endSec: number | null
  weightSec: number
  scoreable: boolean
}> {
  let prevEndSec = 0
  return input.alignments.map((alignment, i) => {
    if (alignment.startMs == null || alignment.endMs == null || alignment.endMs <= alignment.startMs) {
      return { spoken: alignment.spokenTextApprox, startSec: null, endSec: null, weightSec: 0, scoreable: false }
    }
    const padBefore = i === 0 ? 0.24 : alignment.alignmentStatus === 'approximate' ? 0.15 : 0.1
    const padAfter = alignment.alignmentStatus === 'approximate' ? 0.18 : 0.12
    let startSec = Math.max(0, alignment.startMs / 1000 - padBefore)
    let endSec = Math.min(input.totalSec, alignment.endMs / 1000 + padAfter)
    if (startSec < prevEndSec - 0.02) startSec = Math.max(0, prevEndSec)
    if (endSec <= startSec + 0.08) {
      return { spoken: alignment.spokenTextApprox, startSec: null, endSec: null, weightSec: 0, scoreable: false }
    }
    prevEndSec = Math.max(prevEndSec, endSec)
    const scoreable =
      (alignment.alignmentStatus === 'aligned' || alignment.alignmentStatus === 'approximate') &&
      alignment.alignmentConfidence >= 0.46
    return {
      spoken: alignment.spokenTextApprox,
      startSec,
      endSec,
      weightSec: Math.max(0.05, endSec - startSec),
      scoreable,
    }
  })
}

function buildScoringModel(input: {
  alignments: ReadAloudSentenceAlignment[]
  rollup: NormalizedPronunciationAssessment | null
  deadZoneFraction: number
  deadZoneImpactFraction: number
  longUnmatchedFraction: number
}): {
  sentenceCoverage01: number
  readingAccuracy01: number
  smoothReading01: number
  clarity01: number
  alignmentConfidence01: number
} {
  const total = input.alignments.length || 1
  const usable = input.alignments.filter(
    (a) => a.alignmentStatus === 'aligned' || a.alignmentStatus === 'approximate'
  )
  const sentenceCoverage01 = usable.length / total
  const rawAlignmentConfidence01 =
    input.alignments.reduce((sum, a) => sum + a.alignmentConfidence * alignmentWeight(a.alignmentStatus), 0) /
    Math.max(1, input.alignments.reduce((sum, a) => sum + alignmentWeight(a.alignmentStatus), 0))
  const alignmentConfidence01 = clamp01(rawAlignmentConfidence01 - input.deadZoneImpactFraction * 0.12)

  const weightedContentNumerator = input.alignments.reduce((sum, a) => {
    const weight = alignmentWeight(a.alignmentStatus)
    const content = approximateSentenceMatch01(a.targetSentence, a.spokenTextApprox)
    return sum + content * Math.max(0.25, a.alignmentConfidence) * weight
  }, 0)
  const weightedContentDenominator = input.alignments.reduce(
    (sum, a) => sum + Math.max(0.25, a.alignmentConfidence) * alignmentWeight(a.alignmentStatus),
    0
  )
  const contentMatch01 = weightedContentDenominator > 0 ? weightedContentNumerator / weightedContentDenominator : 0
  const readingAccuracy01 = clamp01(sentenceCoverage01 * 0.55 + contentMatch01 * 0.45)

  const clipFlow01 = clamp01(
    1 -
      input.deadZoneImpactFraction * 0.34 -
      input.longUnmatchedFraction * 0.18 -
      Math.max(0, input.deadZoneFraction - 0.45) * 0.08 -
      (1 - sentenceCoverage01) * 0.2 -
      (1 - clamp01(alignmentConfidence01)) * 0.08
  )
  const rollupFluency01 = input.rollup ? input.rollup.fluencyScore / 100 : 0
  const rollupProsody01 = input.rollup ? (input.rollup.prosodyScore ?? input.rollup.fluencyScore) / 100 : 0
  const smoothReading01 = input.rollup
    ? clamp01(rollupFluency01 * 0.6 + rollupProsody01 * 0.15 + clipFlow01 * 0.25)
    : clipFlow01

  const clarity01 = input.rollup
    ? clamp01(
        input.rollup.pronunciationScore / 100 * 0.55 +
          input.rollup.completenessScore / 100 * 0.15 +
          readingAccuracy01 * 0.15 +
          clamp01(alignmentConfidence01) * 0.15
      )
    : clamp01(readingAccuracy01 * 0.6 + clamp01(alignmentConfidence01) * 0.4)

  return {
    sentenceCoverage01,
    readingAccuracy01,
    smoothReading01,
    clarity01,
    alignmentConfidence01,
  }
}

function coachDimensionScore(summary: ReadAloudEvaluateResult['dimensions'][keyof ReadAloudEvaluateResult['dimensions']]): number {
  if (!summary.supported || summary.score01 == null) return -1
  return summary.score01
}

function buildDeterministicCoaching(input: {
  fairness: { mode: 'strong' | 'limited' | 'failure'; canScoreFairly: boolean; reasons: string[] }
  dimensions: ReadAloudEvaluateResult['dimensions']
  deadZoneFraction: number
  weakWords: string[]
}): Pick<ReadAloudEvaluateResult['coaching'], 'summary' | 'focusArea'> {
  if (input.fairness.mode === 'failure') {
    return {
      summary: 'We could only recover a small part of this read with strong confidence, so the feedback below focuses on the clearest matched lines.',
      focusArea: 'Try a steadier, cleaner retake so we can match more of the passage from start to finish.',
    }
  }
  if (input.fairness.mode === 'limited') {
    return {
      summary: 'We matched most of your reading approximately, so the feedback below is based on the clearest aligned sentence clips.',
      focusArea:
        input.weakWords.length > 0
          ? `Use the clearest matched lines to tighten word clarity first: ${input.weakWords.slice(0, 3).join(', ')}.`
          : 'Use the clearest matched lines below to improve pacing and pronunciation without restarting the whole read.',
    }
  }

  const reading = coachDimensionScore(input.dimensions.readingAccuracy)
  const pronunciation = coachDimensionScore(input.dimensions.pronunciation)
  const fluency = coachDimensionScore(input.dimensions.fluency)
  const pacing = coachDimensionScore(input.dimensions.pacing)

  if (reading >= 0.72 && pronunciation >= 0.72) {
    return {
      summary: 'We matched most of your reading to the passage, and the aligned sentence clips also sound clear.',
      focusArea: fluency < 0.68 || pacing < 0.68 ? 'Smooth out pauses and keep the passage moving steadily from sentence to sentence.' : 'Keep the same accuracy, then polish the weakest sentence for even smoother delivery.',
    }
  }
  if (reading >= 0.7 && pronunciation >= 0 && pronunciation < 0.68) {
    return {
      summary: 'We matched most of your reading to the passage, but your word clarity inside those aligned sentence clips still needs work.',
      focusArea: input.weakWords.length ? `Slow down and clean up the weakest words first: ${input.weakWords.slice(0, 3).join(', ')}.` : 'Use the sentence clips to improve word clarity without losing the passage flow.',
    }
  }
  if (reading < 0.62) {
    return {
      summary: 'Some of your reading was clear, but the passage match stayed uneven across sentences, so the main opportunity is steadier text tracking.',
      focusArea: 'Aim to read the printed passage in one continuous run with fewer resets or skipped stretches.',
    }
  }
  if (fluency < 0.64 || pacing < 0.64 || input.deadZoneFraction > 0.24) {
    return {
      summary: 'The sentence matches are usable, but longer pauses, retries, or uneven pacing are dragging the read down more than pronunciation itself.',
      focusArea: 'Keep the passage moving more continuously once you begin, especially through sentence endings and transitions.',
    }
  }
  return {
    summary: 'We could match the passage and score the aligned sentence clips, with the main remaining gains in clarity and consistency.',
    focusArea: 'Use the sentence cards below to tighten the weakest clip without changing the overall rhythm.',
  }
}

export async function tryRunReadAloudSegmentedTimedEvaluation(input: {
  targetText: string
  audio: Buffer
  mimeType: string
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2'
  genre?: string | null
  transcriptionPrompt: string
}): Promise<{ result: ReadAloudEvaluateResult; extra: ReadAloudSegmentedExtra } | null> {
  if (!process.env.OPENAI_API_KEY?.trim()) return null
  if (getPronunciationRuntimeMode() !== 'azure') return null

  const targetText = input.targetText.replace(/\r\n/g, '\n').trim()
  const sents = splitSentences(targetText)
  const stt = await transcribeReadAloudWithWordTimestamps(input.audio, input.mimeType, {
    language: 'nl',
    transcriptionPrompt: input.transcriptionPrompt,
    purpose: 'read_aloud_eval',
  })
  const allWords = lightCleanTimedWords(stt.words)
  const fullAudioTranscript = stt.text.trim() || timedWordsToText(allWords)
  if (!allWords.length) return null

  const totalSec =
    typeof stt.durationSeconds === 'number' && stt.durationSeconds > 0
      ? stt.durationSeconds
      : allWords[allWords.length - 1]!.endSec + 0.1

  const transcriptCaveats: string[] = []
  if (transcriptHasHallucinationRisk(fullAudioTranscript, targetText)) {
    transcriptCaveats.push(
      'The raw transcript is incomplete or noisy, so sentence matching may rely more heavily on timing and context.',
    )
  }

  const mainSpanResult = await inferReadAloudMainSpan({
    targetPassage: targetText,
    targetSentences: sents,
    fullTranscriptText: fullAudioTranscript,
    timedWords: allWords,
    totalAudioDurationSec: totalSec,
  })
  if (mainSpanResult.mainSpan.status === 'weak') {
    transcriptCaveats.push(
      'The app inferred a plausible main reading span even though the full clip includes pauses, retries, or noisy transcript gaps.',
    )
  }
  if (mainSpanResult.mainSpan.status === 'missing') {
    transcriptCaveats.push(
      'The main reading span was hard to isolate, so sentence matching is using the broadest plausible region we could infer.',
    )
  }
  const passageWindow =
    mainSpanResult.mainSpan.startWordIndex != null && mainSpanResult.mainSpan.endWordIndex != null
      ? {
          startWordIndex: mainSpanResult.mainSpan.startWordIndex,
          endWordIndex: mainSpanResult.mainSpan.endWordIndex,
          source:
            mainSpanResult.mainSpan.notes.some((note) => /heuristic/i.test(note)) || mainSpanResult.mainSpan.status === 'weak'
              ? ('main_span_heuristic' as const)
              : ('main_span_llm' as const),
        }
      : null

  const alignmentResult = await alignReadAloudSentences({
    targetText,
    sentences: sents,
    fullTranscript: fullAudioTranscript,
    words: allWords,
    passageWindowHint: passageWindow ?? null,
  })
  const alignmentFromLlm = alignmentResult.summary.usedLlm
  if (alignmentResult.summary.usedHeuristicFallback) {
    transcriptCaveats.push('Some sentence windows used heuristic fallback because model alignment was incomplete.')
  }
  const recognizedText = alignmentResult.summary.matchedTranscriptText || timedWordsToText(allWords)

  const clipMeta = buildSentenceClipMeta({
    alignments: alignmentResult.alignments,
    totalSec,
  })

  const spokenParts = clipMeta.map((c) => c.spoken)

  const paInputs = clipMeta.map((c, i) => ({
    startSec: c.startSec,
    endSec: c.endSec,
    spoken: c.spoken,
    target: sents[i]!,
    weightSec: c.weightSec,
    scoreable: c.scoreable,
  }))

  const segmentResults = await mapWithConcurrency(paInputs, 2, async (row) => {
    if (!row.scoreable || !row.spoken.trim() || row.startSec == null || row.endSec == null || row.endSec <= row.startSec + 0.02) {
      return { pa: null as NormalizedPronunciationAssessment | null, weightSec: row.weightSec }
    }
    try {
      const wav = await extractAudioSegmentToWavPcm16kMono(input.audio, input.mimeType, row.startSec, row.endSec)
      const paRes = await runPronunciationAssessment({
        audio: wav,
        mimeType: 'audio/wav',
        transcript: row.spoken,
        expectedText: row.target,
        locale: getAzureSpeechLocale(),
        assessmentMode: 'reference',
        scenarioHint: 'read_aloud_sentence',
      })
      return { pa: paRes.assessment, weightSec: row.weightSec }
    } catch {
      return { pa: null, weightSec: row.weightSec }
    }
  })

  const rollup = rollupPronunciationAssessment({
    targetText,
    recognizedText,
    segments: segmentResults.map((r, i) => ({
      pa: r.pa,
      weightSec: clipMeta[i]!.weightSec,
    })),
  })

  const deadZones = computeDeadZones({
    totalSec,
    words: allWords,
    sentenceSpans: alignmentResult.alignments
      .filter(
        (a) =>
          a.startWordIndex != null &&
          a.endWordIndex != null &&
          (a.alignmentStatus === 'aligned' || a.alignmentStatus === 'approximate')
      )
      .map((a) => ({ startIdx: a.startWordIndex as number, endIdx: a.endWordIndex as number })),
    spanStartSec: mainSpanResult.mainSpan.startMs != null ? mainSpanResult.mainSpan.startMs / 1000 : undefined,
    spanEndSec: mainSpanResult.mainSpan.endMs != null ? mainSpanResult.mainSpan.endMs / 1000 : undefined,
  })
  const alignedSec = clipMeta.reduce((sum, c) => {
    if (c.startSec == null || c.endSec == null) return sum
    const spanStartSec = mainSpanResult.mainSpan.startMs != null ? mainSpanResult.mainSpan.startMs / 1000 : 0
    const spanEndSec = mainSpanResult.mainSpan.endMs != null ? mainSpanResult.mainSpan.endMs / 1000 : totalSec
    const a = Math.max(spanStartSec, c.startSec)
    const b = Math.min(spanEndSec, c.endSec)
    return sum + Math.max(0, b - a)
  }, 0)
  const deadSec = deadZones.reduce((s, d) => s + Math.max(0, d.endSec - d.startSec), 0)
  const deadImpactSec = deadZones.reduce((s, d) => s + Math.max(0, d.endSec - d.startSec) * d.impactWeight, 0)
  const pauseLikeSec = deadZones.reduce(
    (s, d) => s + (d.kind === 'long_unmatched' ? 0 : Math.max(0, d.endSec - d.startSec)),
    0
  )
  const longUnmatchedSec = deadZones.reduce(
    (s, d) => s + (d.kind === 'long_unmatched' ? Math.max(0, d.endSec - d.startSec) : 0),
    0
  )
  const spanDurationSec =
    mainSpanResult.mainSpan.startMs != null && mainSpanResult.mainSpan.endMs != null
      ? Math.max(0.15, (mainSpanResult.mainSpan.endMs - mainSpanResult.mainSpan.startMs) / 1000)
      : totalSec
  const deadZoneFraction = spanDurationSec > 0.5 ? deadSec / spanDurationSec : 0
  const deadZoneImpactFraction = spanDurationSec > 0.5 ? deadImpactSec / spanDurationSec : 0
  const longUnmatchedFraction = spanDurationSec > 0.5 ? longUnmatchedSec / spanDurationSec : 0
  const scoringModel = buildScoringModel({
    alignments: alignmentResult.alignments,
    rollup,
    deadZoneFraction,
    deadZoneImpactFraction,
    longUnmatchedFraction,
  })
  const acc01 = scoringModel.readingAccuracy01
  const scoredSentenceCount = segmentResults.filter((r) => r.pa != null).length
  const scoreableSentenceCount = clipMeta.filter((c) => c.scoreable).length
  const totalSentences = sents.length
  const usableSentenceCount = alignmentResult.summary.usableSentenceCount
  const enoughForStrong =
    usableSentenceCount >= Math.max(2, Math.ceil(totalSentences * 0.5)) &&
    scoredSentenceCount >= Math.max(2, Math.ceil(totalSentences * 0.4)) &&
    alignmentResult.summary.overallConfidence01 >= 0.44
  const enoughForLimited =
    usableSentenceCount >= Math.max(1, Math.ceil(totalSentences * 0.32)) &&
    scoredSentenceCount >= Math.max(1, Math.ceil(totalSentences * 0.2)) &&
    alignmentResult.summary.overallConfidence01 >= 0.22
  const reportMode: 'strong' | 'limited' | 'failure' = enoughForStrong
    ? 'strong'
    : enoughForLimited || mainSpanResult.mainSpan.status !== 'missing'
      ? 'limited'
      : 'failure'
  const dimensions = buildDimensions({
    pa: rollup,
    readingAccuracy01: scoringModel.readingAccuracy01,
    sentenceCoverage01: scoringModel.sentenceCoverage01,
    smoothReading01: scoringModel.smoothReading01,
    clarity01: scoringModel.clarity01,
    alignmentConfidence01: scoringModel.alignmentConfidence01,
    reportMode,
    cefrLevel: input.cefrLevel,
  })

  const extra: ReadAloudSegmentedExtra = {
    deadZones,
    audioCoverage: {
      totalSec: spanDurationSec,
      alignedSec: Math.min(alignedSec, spanDurationSec),
      deadSec: Math.min(deadSec, spanDurationSec),
      deadImpactSec: Math.min(deadImpactSec, spanDurationSec),
      pauseLikeSec: Math.min(pauseLikeSec, spanDurationSec),
      longUnmatchedSec: Math.min(longUnmatchedSec, spanDurationSec),
    },
    usedLlmSentenceAlignment: alignmentFromLlm,
  }

  const sentences = buildSentenceReviewsV2({
    sentencesTarget: sents,
    spokenParts,
    pa: rollup,
    paPerSentence: segmentResults.map((r) => r.pa),
    clipBoundsOverride: clipMeta.map((c) =>
      c.startSec != null && c.endSec != null && c.endSec > c.startSec + 0.04 ? { startSec: c.startSec, endSec: c.endSec } : null
    ),
    sentenceAlignment: alignmentResult.alignments.map((a) => ({
      alignmentConfidence: a.alignmentConfidence,
      alignmentStatus: a.alignmentStatus,
      notes: a.notes,
    })),
  })

  const weakWords = [
    ...new Set([
      ...weakWordsFromAssessment(rollup, 10),
      ...(reportMode === 'failure' ? [] : weakWordsFromDiff(targetText, recognizedText, 10)),
    ]),
  ].slice(0, 14)

  const dimForCoach: Record<string, number> = {}
  for (const [key, block] of Object.entries(dimensions)) {
    if (block.supported && block.score01 != null) {
      dimForCoach[key] = block.score01
    }
  }

  const sentenceSummaries = sentences.map((s) => ({
    index: s.index,
    targetPreview: s.targetText.slice(0, 140),
    spokenPreview: s.spokenText.slice(0, 140),
    alignmentUncertain: s.alignmentUncertain,
  }))

  const deterministicQaNote = deterministicReadAloudReportQa({ acc01, sentences, deadZoneFraction: deadZoneImpactFraction })

  const [llm, llmQa] = await Promise.all([
    generateReadAloudCoaching({
      targetText,
      recognizedText,
      level: input.cefrLevel,
      dimensions: dimForCoach,
      weakWords,
    }),
    runReadAloudReportQaLlm({
      targetText,
      recognizedText,
      acc01,
      sentenceSummaries,
      deadZoneFraction: deadZoneImpactFraction,
      evaluationMode: 'segmented_timed_llm',
    }),
  ])

  const fallbackCoaching = (): ReadAloudEvaluateResult['coaching'] => ({
    summary: reportMode === 'failure'
      ? 'We could only recover a small part of this read with strong confidence, so the feedback below focuses on the clearest matched lines.'
      : reportMode === 'limited'
        ? 'We matched most of your reading approximately, and the clearest aligned lines still give us useful coaching.'
      : acc01 >= 0.82
        ? 'Strong reading — the sentence matches and pronunciation evidence look consistent.'
        : acc01 >= 0.65
          ? 'Solid effort — most of the passage matched, with a few sentences needing cleaner delivery or steadier pacing.'
          : 'There is usable evidence here, but several sentences need either clearer pronunciation or a steadier retake.',
    focusArea: reportMode === 'failure'
      ? 'Try a quieter, steadier retake so we can align more of the passage from start to finish.'
      : reportMode === 'limited'
        ? 'Use the clearest matched sentence clips below to tighten pronunciation and pacing before retaking the full passage.'
      : rollup
        ? 'Pronunciation clarity and pacing on the weaker sentence clips below.'
        : 'Sentence alignment and reading flow.',
    nextStepDrills: [
      'Read the passage once silently, then again aloud at 80% speed.',
      'Clap the rhythm of each sentence, then speak on the same beat.',
      'Record again and aim for one clean run without restarts.',
    ],
    feedbackLines: rollup
      ? [`Overall rolled-up pronunciation is about ${Math.round(rollup.overallScore)} — see each line for detail.`]
      : [],
  })

  let coaching = llm ?? fallbackCoaching()
  if (reportMode === 'failure') {
    coaching = {
      ...fallbackCoaching(),
      feedbackLines: [
        'We could only recover part of this read with strong confidence.',
        ...alignmentResult.summary.reasons,
      ].slice(0, 6),
    }
  }
  const fairness = {
    mode: reportMode,
    canScoreFairly: reportMode !== 'failure',
    message:
      reportMode === 'failure'
        ? 'We could only recover a small part of this read with strong confidence, so the feedback below focuses on the clearest matched lines.'
        : reportMode === 'limited'
          ? 'We matched most of this read approximately. Pronunciation notes below are based on the sentence clips we could align most clearly.'
          : null,
    reasons:
      reportMode === 'strong'
        ? alignmentResult.summary.reasons.filter((reason) => /approximate|limited/i.test(reason))
        : alignmentResult.summary.reasons,
  }
  const deterministicCoaching = buildDeterministicCoaching({
    fairness,
    dimensions,
    deadZoneFraction: deadZoneImpactFraction,
    weakWords,
  })
  coaching = {
    ...coaching,
    summary: deterministicCoaching.summary,
    focusArea: deterministicCoaching.focusArea,
  }
  const qaFeedbackLine = readAloudQaCoachingFeedbackLine({
    acc01,
    deterministicNote: deterministicQaNote,
    llm: llmQa,
  })
  if (qaFeedbackLine) {
    coaching = {
      ...coaching,
      feedbackLines: [qaFeedbackLine, ...coaching.feedbackLines].slice(0, 10),
    }
  }

  const worstIdx = worstSentenceIndex(sentences)
  const sentenceEvidenceCount = sentences.filter((s) => s.wordEvidence.length > 0 || s.pronunciationNotes.length > 0).length
  const nextActions: ReadAloudNextAction[] = buildReadAloudNextActions({
    weakWords,
    cefrLevel: input.cefrLevel,
    genre: input.genre?.trim() ?? null,
    sentenceCount: sentences.length,
    readingAccuracy01: acc01,
    worstSentenceIndex: worstIdx,
  })

  let caveats = mergeReportQaCaveats({
    existing: [
      'This report first aligned target sentences against the full timed transcript, then scored only the aligned speech clips.',
      'The full transcript is kept for reference, but missing ASR words are not treated as proof that you skipped them.',
    ],
    deterministicNote: deterministicQaNote,
    llm: llmQa,
  })
  for (const c of transcriptCaveats) {
    if (c && !caveats.includes(c)) caveats.unshift(c)
  }
  if (deadZoneImpactFraction > 0.2 || longUnmatchedFraction > 0.12) {
    caveats.unshift(
      `Some parts of the recording could not be cleanly tied to a printed sentence. These gaps often come from pauses, retries, silence, or unmatched speech, and they mostly affect flow rather than the pronunciation evidence inside aligned lines (see Dead zones).`,
    )
  }
  if (reportMode === 'failure') {
    caveats.unshift(fairness.message!)
  } else if (reportMode === 'limited') {
    caveats.unshift(fairness.message!)
  } else {
    caveats.unshift(
      `Sentence matching confidence is about ${Math.round(alignmentResult.summary.overallConfidence01 * 100)}%, with ${alignmentResult.summary.usableSentenceCount}/${alignmentResult.summary.totalSentenceCount} sentences aligned strongly enough to score.`
    )
  }
  if (mainSpanResult.mainSpan.status !== 'missing') {
    caveats.unshift(
      `Main reading span confidence is about ${Math.round(mainSpanResult.mainSpan.confidence * 100)}%; pauses before or after that span are not treated as part of the reading attempt.`
    )
  }

  const summaryFeedback =
    reportMode === 'failure'
      ? fairness.message
      : reportMode === 'limited'
        ? rollup
          ? `We aligned most of this read approximately. Sentence-level pronunciation below comes from the clearest matched clips, with overall pronunciation around ${Math.round(rollup.overallScore)}.`
          : 'We matched part of this read approximately, but only some sentence clips had enough audio evidence for scoring.'
        : rollup
          ? `Sentence-level pronunciation rolled up to about ${Math.round(rollup.overallScore)} — open each sentence for the clip, confidence, and weak words.`
          : 'Some sentence clips could not be scored — try a quieter recording.'

  const sentenceAlignments = alignmentResult.alignments.map((row, i) => {
    const c = clipMeta[i]!
    return {
      sentenceIndex: row.sentenceIndex,
      targetText: row.targetSentence,
      startWordIndex: row.startWordIndex,
      endWordIndex: row.endWordIndex,
      spokenWordsText: c.spoken,
      clipStartSec: c.startSec,
      clipEndSec: c.endSec,
      alignmentConfidence: row.alignmentConfidence,
      alignmentStatus: row.alignmentStatus,
      ...(row.notes?.length ? { notes: row.notes } : {}),
      matchSource: row.source,
    }
  })
  const mainSpanSource: 'llm' | 'heuristic' =
    mainSpanResult.debug.usedHeuristicFallback || passageWindow?.source === 'main_span_heuristic' ? 'heuristic' : 'llm'
  const alignmentDebug = {
    mainSpan: {
      status: mainSpanResult.mainSpan.status,
      confidence: mainSpanResult.mainSpan.confidence,
      source: mainSpanSource,
      startSec: mainSpanResult.mainSpan.startMs != null ? mainSpanResult.mainSpan.startMs / 1000 : null,
      endSec: mainSpanResult.mainSpan.endMs != null ? mainSpanResult.mainSpan.endMs / 1000 : null,
      notes: mainSpanResult.mainSpan.notes,
      candidateCount: mainSpanResult.candidateSpans.length,
      topCandidates: mainSpanResult.candidateSpans.slice(0, 3).map((span) => ({
        startSec: span.startMs / 1000,
        endSec: span.endMs / 1000,
        confidence: span.confidence,
        notes: span.notes,
      })),
      llmStructuredOutput: mainSpanResult.debug.llmStructuredOutput,
    },
    alignment: {
      overallConfidence01: alignmentResult.summary.overallConfidence01,
      strongCount: alignmentResult.summary.alignedSentenceCount,
      approximateCount: alignmentResult.summary.approximateSentenceCount,
      uncertainCount: alignmentResult.summary.uncertainSentenceCount,
      missingCount: alignmentResult.summary.missingSentenceCount,
      usedLlm: alignmentResult.summary.usedLlm,
      llmStructuredOutput: alignmentResult.summary.llmStructuredOutput,
      usedHeuristicFallback: alignmentResult.summary.usedHeuristicFallback,
      interpolatedSentenceCount: alignmentResult.summary.interpolatedSentenceCount,
      sourceCounts: alignmentResult.summary.sourceCounts,
      topReason: fairness.message ?? alignmentResult.summary.reasons[0] ?? null,
    },
    fallback: {
      mainSpanHeuristicUsed: mainSpanResult.debug.usedHeuristicFallback,
      sentenceHeuristicUsed: alignmentResult.summary.usedHeuristicFallback,
      sentenceInterpolationUsed: alignmentResult.summary.interpolatedSentenceCount > 0,
    },
    azureEvidence: {
      scoredSentenceCount,
      scoreableSentenceCount,
      sentenceEvidenceCount,
      totalSentenceCount: totalSentences,
    },
  }

  const result: ReadAloudEvaluateResult = {
    reportKind: 'read_aloud',
    targetText,
    recognizedText,
    fullAudioTranscript,
    passageWindow: passageWindow
      ? {
          startSec:
            mainSpanResult.mainSpan.startMs != null
              ? mainSpanResult.mainSpan.startMs / 1000
              : allWords[passageWindow.startWordIndex]?.startSec ?? 0,
          endSec:
            mainSpanResult.mainSpan.endMs != null
              ? mainSpanResult.mainSpan.endMs / 1000
              : allWords[passageWindow.endWordIndex]?.endSec ?? 0,
          durationSec: Math.max(
            0,
            (mainSpanResult.mainSpan.endMs != null
              ? mainSpanResult.mainSpan.endMs / 1000
              : allWords[passageWindow.endWordIndex]?.endSec ?? 0) -
              (mainSpanResult.mainSpan.startMs != null
                ? mainSpanResult.mainSpan.startMs / 1000
                : allWords[passageWindow.startWordIndex]?.startSec ?? 0)
          ),
          startWordIndex: passageWindow.startWordIndex,
          endWordIndex: passageWindow.endWordIndex,
          source: passageWindow.source,
        }
      : undefined,
    timedWordCount: allWords.length,
    sentenceAlignments,
    pronunciationAssessment: rollup,
    pronunciationApi: {
      summaryFeedback,
      recommendedNextStep: reportMode !== 'failure'
        ? 'Retry the hardest sentence with reference audio, then the full passage once smoothly.'
        : 'Replay the clip, regenerate the report, or try the reading again in one steady take.',
      caveats,
    },
    dimensions,
    sentences,
    weakWords,
    coaching,
    nextActions,
    deadZones: extra.deadZones,
    audioCoverage: extra.audioCoverage,
    evaluationMode: 'segmented_timed_llm',
    alignmentSummary: alignmentResult.summary,
    alignmentDebug,
    fairness,
  }

  return { result, extra }
}
