import { analyzeSpeechTiming } from '../speaking-assessment/speechTimingAnalysisService'
import { computeDerivedScores } from '../speaking-assessment/speakingDerivedScoresService'
import type { RawScores, TimingAnalysis } from '../../domain/speaking-assessment/speakingAssessmentCanonical'
import type { AudioScores } from './liveVoiceEvaluationTypes'
import { assessLearnerAudioForPostSession } from './voiceEvaluationService'
import type {
  NormalizedPronunciationAssessment,
  NormalizedWordAssessment,
} from '../speech/pronunciationAssessmentContracts'
import { buildSpeakLiveAzureSpeechTurnEvaluationArtifact } from './speakLiveAzureSpeechEvaluationArtifactService'
import type { SpeakLiveAzureSpeechTurnEvaluationV1 } from './speakLiveAzureSpeechEvaluationArtifact.schema'

export type LiveTurnVoicePrepSource = 'background_live' | 'post_session'

export type LiveTurnVoicePrepV1 = {
  version: 1
  source: LiveTurnVoicePrepSource
  preparedAt: string
  referenceForPa: string
  transcriptNormalized: string
  hasAudio: boolean
  assessment: NormalizedPronunciationAssessment | null
  caveats: string[]
  timing: TimingAnalysis
  audioScores: AudioScores
  azureSummary: string | null
  audioFindings: string[]
  weakWordList: string[]
  rhythmLabel: string | null
  /** Structured Azure Speech artifact (user audio only; transcript as reference). */
  azureSpeechEvaluationV1?: SpeakLiveAzureSpeechTurnEvaluationV1 | null
  audioDiagnostics: {
    blobPath: string | null
    downloadOk: boolean
    bufSize: number
    assessmentOk: boolean
    assessmentCaveats: string[]
  }
  /**
   * Wall-time of the **live** Azure pronunciation provider call that produced this prep.
   *
   * Critical for the FluentCopilot strict-live invariant: the post-session lane reuses this prep
   * (the Azure call already ran live during the conversation as a pre-warm) and surfaces this
   * value as the per-turn `providerRequestMs` so report diagnostics never report 0 ms for an
   * assessment that genuinely happened against the Azure provider.
   *
   * Always present and ≥ 0; will be `0` when no audio was scored (text-only / degraded).
   */
  azureProviderRequestMs: number
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function audioClarityFromRaw(raw: { pronunciation: number; accuracy: number; completeness: number }): number {
  const acc = raw.accuracy > 0 ? raw.accuracy : raw.pronunciation
  return clamp100((raw.pronunciation + acc + raw.completeness) / 3)
}

function buildAudioFindings(params: {
  words: NormalizedWordAssessment[]
  timingPauseCount: number
  hesitationCount: number
  rushedEnding: boolean
  caveats: string[]
}): string[] {
  const out: string[] = []
  const weak = params.words.filter((w) => w.accuracyScore < 72 && w.word.trim().length > 0).slice(0, 5)
  for (const w of weak) {
    const et = (w.errorType ?? '').toLowerCase()
    if (et.includes('stress')) {
      out.push(`Stress on "${w.word.trim()}" sounded flatter than a Dutch speaker would expect; mirror the reference line.`)
    } else if (et.includes('vowel')) {
      out.push(`The vowel in "${w.word.trim()}" was a little tight; give it slightly more airtime like the reference.`)
    } else {
      out.push(`"${w.word.trim()}" was the least clear word here; finish consonants cleanly and slow the syllable slightly.`)
    }
  }
  if (params.hesitationCount > 0) {
    out.push('Try to connect your words more smoothly; some pauses sounded hesitant.')
  } else if (params.timingPauseCount >= 3) {
    out.push('Group your words into smoother chunks; shorter pauses will sound more natural.')
  }
  if (params.rushedEnding) {
    const last = params.words[params.words.length - 1]?.word?.trim()
    out.push(
      last
        ? `The final word "${last}" was rushed; let the vowel last slightly longer before you stop.`
        : 'Give the end of your sentence a bit more space; it sounded rushed.',
    )
  }
  return out.slice(0, 6)
}

export function readLiveTurnVoicePrep(meta: Record<string, unknown> | null | undefined): LiveTurnVoicePrepV1 | null {
  const raw = meta?.liveTurnVoicePrepV1
  if (!raw || typeof raw !== 'object') return null
  const prep = raw as Partial<LiveTurnVoicePrepV1>
  if (prep.version !== 1) return null
  if (!prep.audioDiagnostics || typeof prep.audioDiagnostics !== 'object') return null
  /**
   * Older prep payloads (written before {@link LiveTurnVoicePrepV1.azureProviderRequestMs} was added)
   * are still version 1; synthesize 0 so consumers can rely on the field always being present.
   */
  if (typeof prep.azureProviderRequestMs !== 'number' || !Number.isFinite(prep.azureProviderRequestMs)) {
    ;(prep as LiveTurnVoicePrepV1).azureProviderRequestMs = 0
  }
  return prep as LiveTurnVoicePrepV1
}

export async function prepareLiveTurnVoicePrep(params: {
  audio: Buffer | null
  mimeType: string
  transcriptRaw: string
  transcriptNormalizedMeta?: string | null
  referenceForPa: string
  blobPath: string | null
  source: LiveTurnVoicePrepSource
  downloadOk: boolean
  locale: string
  /** When set, a structured {@link azureSpeechEvaluationV1} is attached for this learner turn. */
  turnId?: string | null
  /** Epoch ms for the user message `createdAt`, when known. */
  turnRecordedAtMs?: number | null
}): Promise<LiveTurnVoicePrepV1> {
  const hasAudio = Boolean(params.audio && params.audio.length >= 32)
  let assessment: NormalizedPronunciationAssessment | null = null
  let caveats: string[] = []
  let providerRawResult: unknown = undefined
  let azureProviderRequestMs = 0
  if (hasAudio && params.audio) {
    const azureStartedAt = Date.now()
    try {
      const pa = await assessLearnerAudioForPostSession({
        audio: params.audio,
        mimeType: params.mimeType,
        transcript: params.referenceForPa,
        locale: params.locale,
      })
      assessment = pa.assessment
      caveats = pa.caveats ?? []
      providerRawResult = pa.providerRawResult
    } finally {
      azureProviderRequestMs = Math.max(0, Date.now() - azureStartedAt)
    }
  }

  const words = assessment?.words ?? []
  const timing = analyzeSpeechTiming({
    words,
    userClipDurationMs: null,
    transcript: params.referenceForPa || assessment?.recognizedText || params.transcriptRaw,
  })

  let audioScores: AudioScores
  let rhythmLabel: string | null = null
  if (assessment) {
    const raw: RawScores = {
      pronunciation: assessment.pronunciationScore,
      accuracy: assessment.accuracyScore,
      fluency: assessment.fluencyScore,
      completeness: assessment.completenessScore,
      overall: assessment.overallScore,
      prosody: assessment.prosodyScore,
    }
    const derived = computeDerivedScores(raw, timing)
    const rhythmScore = clamp100(derived.rhythm.score ?? Math.max(0, raw.fluency - 8))
    rhythmLabel = derived.rhythm.label?.slice(0, 40) || null
    audioScores = {
      pronunciation: clamp100(raw.pronunciation),
      fluency: clamp100(raw.fluency),
      rhythm: rhythmScore,
      completeness: clamp100(raw.completeness),
      clarity: audioClarityFromRaw({
        pronunciation: raw.pronunciation,
        accuracy: raw.accuracy,
        completeness: raw.completeness,
      }),
    }
  } else {
    audioScores = { pronunciation: 0, fluency: 0, rhythm: 0, completeness: 0, clarity: 0 }
  }

  const azureSummary = assessment
    ? JSON.stringify({
        pronunciation: assessment.pronunciationScore,
        fluency: assessment.fluencyScore,
        completeness: assessment.completenessScore,
        weakWords: words
          .filter((w) => w.accuracyScore < 72)
          .slice(0, 6)
          .map((w) => ({ word: w.word, accuracyScore: w.accuracyScore })),
        caveats: caveats.slice(0, 4),
      }).slice(0, 1800)
    : null

  const audioFindings = hasAudio
    ? buildAudioFindings({
        words,
        timingPauseCount: timing.pauseCount,
        hesitationCount: timing.hesitationMoments.length,
        rushedEnding: timing.rushedEnding,
        caveats,
      })
    : []

  const weakWordList = words
    .filter((w) => w.accuracyScore < 72 && w.word.trim().length > 0)
    .map((w) => w.word.trim())
    .slice(0, 6)

  const azureSpeechEvaluationV1 =
    hasAudio && assessment && params.turnId
      ? buildSpeakLiveAzureSpeechTurnEvaluationArtifact({
          turnId: params.turnId,
          transcriptReference: (params.transcriptNormalizedMeta ?? assessment.recognizedText ?? params.transcriptRaw).trim(),
          audioBlobPath: params.blobPath,
          turnRecordedAtMs: params.turnRecordedAtMs ?? undefined,
          assessment,
          timing,
          audioScores,
          providerRawResult,
        })
      : null

  return {
    version: 1,
    source: params.source,
    preparedAt: new Date().toISOString(),
    referenceForPa: params.referenceForPa,
    transcriptNormalized: (params.transcriptNormalizedMeta ?? assessment?.recognizedText ?? params.transcriptRaw).trim(),
    hasAudio,
    assessment,
    caveats,
    timing,
    audioScores,
    azureSummary,
    audioFindings,
    weakWordList,
    rhythmLabel,
    azureSpeechEvaluationV1,
    audioDiagnostics: {
      blobPath: params.blobPath,
      downloadOk: params.downloadOk,
      bufSize: params.audio?.length ?? 0,
      assessmentOk: Boolean(assessment),
      assessmentCaveats: caveats,
    },
    azureProviderRequestMs,
  }
}
