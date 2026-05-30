import type { NormalizedPronunciationAssessment, NormalizedWordAssessment } from '../speech/pronunciationAssessmentContracts'
import type {
  CoachingBlock,
  DerivedScores,
  RawScores,
  SpeakingAssessmentResult,
  SpeakingAssessmentViewModel,
  VerdictLabels,
  WordAssessment,
} from '../../domain/speaking-assessment/speakingAssessmentCanonical'
import type { TimingAnalysis } from '../../domain/speaking-assessment/speakingAssessmentCanonical'
import type { SpeakingAssessmentCoachingLlm } from './speakingCoachingFromAssessmentService'
import { computeDerivedScores, emptyDerivedScores } from './speakingDerivedScoresService'
import { extractPhraseTargets } from './phraseTargetExtraction'
import { mapVerdictLabelsFromSignals } from './speakingVerdictLabels'

function normalizeText(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function buildRawScores(a: NormalizedPronunciationAssessment): RawScores {
  return {
    pronunciation: a.pronunciationScore,
    fluency: a.fluencyScore,
    completeness: a.completenessScore,
    overall: a.overallScore,
    prosody: a.prosodyScore,
    accuracy: a.accuracyScore,
  }
}

/** Word rows before LLM runs (weak/strong flags for phrase extraction + coaching input). */
export function mapWordsWithoutCoachingNotes(words: NormalizedWordAssessment[]): WordAssessment[] {
  return words.map((w) => {
    const text = w.word.trim()
    const norm = normalizeText(text)
    const acc = w.accuracyScore
    return {
      text,
      normalizedText: norm,
      accuracyScore: acc,
      errorType: (w.errorType as WordAssessment['errorType']) || 'None',
      startMs: w.startMs ?? null,
      endMs: w.endMs ?? null,
      isStrong: acc >= 85,
      isWeak: acc < 65,
      coachingNote: acc < 65 ? 'Practice this word slowly with clear endings.' : '',
    }
  })
}

function mapWords(
  words: NormalizedWordAssessment[],
  coaching: SpeakingAssessmentCoachingLlm
): WordAssessment[] {
  const tips = new Map(
    coaching.wordCoachingNotes.map((n) => [normalizeText(n.text), n.coachingNote] as const)
  )
  return words.map((w) => {
    const text = w.word.trim()
    const norm = normalizeText(text)
    const acc = w.accuracyScore
    return {
      text,
      normalizedText: norm,
      accuracyScore: acc,
      errorType: (w.errorType as WordAssessment['errorType']) || 'None',
      startMs: w.startMs ?? null,
      endMs: w.endMs ?? null,
      isStrong: acc >= 85,
      isWeak: acc < 65,
      coachingNote: tips.get(norm) ?? (acc < 65 ? 'Practice this word slowly with clear endings.' : ''),
    }
  })
}

function buildCoachingBlock(c: SpeakingAssessmentCoachingLlm): CoachingBlock {
  return {
    shortSummary: c.shortSummary,
    whatWentWell: c.whatWentWell,
    improveNext: c.improveNext,
    retryTarget: c.retryTarget ?? null,
    retryWhy: c.retryWhy ?? null,
    levelAlignedNotes: c.levelAlignedNotes,
    dutchSoundingLabel: c.dutchSoundingLabel,
    confidenceNarrative: c.confidenceNarrative,
  }
}

/** Older persisted assessments may lack new coaching fields — fill for FE stability. */
export function normalizeSpeakingCoachingBlock(c: CoachingBlock): CoachingBlock {
  const dn = c.dutchSoundingLabel?.trim()
  const cn = c.confidenceNarrative?.trim()
  if (dn && cn) return c
  return {
    ...c,
    dutchSoundingLabel: dn || 'Learner Dutch',
    confidenceNarrative: cn || 'Coaching summary may be from an older stored format; trust numeric scores from the assessment when in doubt.',
  }
}

const EMPTY_VERDICTS: VerdictLabels = {
  topLabel: 'no assessment data',
  clarityLabel: 'no assessment data',
  naturalnessLabel: 'no assessment data',
}

export function mapAzureToSpeakingAssessmentResult(input: {
  assessmentId: string
  provider: SpeakingAssessmentResult['provider']
  locale: string
  scenarioId: string
  promptId: string
  expectedText: string
  transcript: string
  userClipDurationMs: number | null
  audioBlobUrl: string | null
  normalized: NormalizedPronunciationAssessment | null
  timing: TimingAnalysis
  coachingLlm: SpeakingAssessmentCoachingLlm
  referenceAudio: SpeakingAssessmentResult['referenceAudio']
  rawProviderPayload: unknown
  caveats: string[]
  /** When set, avoids recomputing derived dimensions (matches coaching payload). */
  precomputedDerived?: DerivedScores
  precomputedVerdicts?: VerdictLabels
}): SpeakingAssessmentResult {
  const transcript = input.transcript.trim()
  const expected = input.expectedText.trim()
  const summary =
    input.caveats.join(' ').trim() ||
    (input.normalized
      ? `Overall ${input.normalized.overallScore}/100 — see coaching for next steps.`
      : 'Assessment incomplete — see caveats.')

  if (!input.normalized) {
    const now = new Date().toISOString()
    return {
      assessmentId: input.assessmentId,
      provider: input.provider,
      locale: input.locale,
      scenarioId: input.scenarioId,
      promptId: input.promptId,
      expectedText: expected,
      transcript,
      transcriptNormalized: normalizeText(transcript),
      audioBlobUrl: input.audioBlobUrl,
      userClipDurationMs: input.userClipDurationMs,
      summary,
      rawScores: {
        pronunciation: 0,
        fluency: 0,
        completeness: 0,
        overall: 0,
        prosody: null,
        accuracy: 0,
      },
      derivedScores: input.precomputedDerived ?? emptyDerivedScores(),
      verdicts: input.precomputedVerdicts ?? EMPTY_VERDICTS,
      timingAnalysis: { ...input.timing },
      wordAssessments: [],
      phraseTargets: [],
      coaching: normalizeSpeakingCoachingBlock(buildCoachingBlock(input.coachingLlm)),
      referenceAudio: input.referenceAudio,
      rawProviderPayload: input.rawProviderPayload,
      generatedCoachingPayload: input.coachingLlm,
      createdAtUtc: now,
    }
  }

  const a = input.normalized
  const raw = buildRawScores(a)
  const derived =
    input.precomputedDerived ?? computeDerivedScores(raw, input.timing)
  const verdicts =
    input.precomputedVerdicts ?? mapVerdictLabelsFromSignals({ raw, derived, timing: input.timing })
  const wordAssessments = mapWords(a.words, input.coachingLlm)
  const phraseTargets = extractPhraseTargets({
    wordAssessments,
    timing: input.timing,
    expectedText: expected,
    transcript,
  })

  return {
    assessmentId: input.assessmentId,
    provider: input.provider,
    locale: input.locale,
    scenarioId: input.scenarioId,
    promptId: input.promptId,
    expectedText: expected,
    transcript,
    transcriptNormalized: normalizeText(transcript),
    audioBlobUrl: input.audioBlobUrl,
    userClipDurationMs: input.userClipDurationMs,
    summary: input.coachingLlm.shortSummary.slice(0, 800) || summary,
    rawScores: raw,
    derivedScores: derived,
    verdicts,
    timingAnalysis: { ...input.timing },
    wordAssessments,
    phraseTargets,
    coaching: normalizeSpeakingCoachingBlock(buildCoachingBlock(input.coachingLlm)),
    referenceAudio: input.referenceAudio,
    rawProviderPayload: input.rawProviderPayload,
    generatedCoachingPayload: input.coachingLlm,
    createdAtUtc: new Date().toISOString(),
  }
}

export function toSpeakingAssessmentViewModel(
  r: SpeakingAssessmentResult,
  caveats: string[],
  opts?: { maxWords?: number }
): SpeakingAssessmentViewModel {
  const max = opts?.maxWords ?? 48
  return {
    assessmentId: r.assessmentId,
    provider: r.provider,
    locale: r.locale,
    scenarioId: r.scenarioId,
    promptId: r.promptId,
    expectedText: r.expectedText,
    transcript: r.transcript,
    transcriptNormalized: r.transcriptNormalized,
    audioBlobUrl: r.audioBlobUrl,
    userClipDurationMs: r.userClipDurationMs,
    summary: r.summary,
    rawScores: r.rawScores,
    derivedScores: r.derivedScores,
    verdicts: r.verdicts,
    timingAnalysis: r.timingAnalysis,
    wordAssessments: r.wordAssessments.slice(0, max),
    phraseTargets: r.phraseTargets.slice(0, 8),
    coaching: normalizeSpeakingCoachingBlock(r.coaching),
    referenceAudio: r.referenceAudio,
    caveats,
    createdAtUtc: r.createdAtUtc,
  }
}
