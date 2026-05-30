/**
 * Builds structured Azure Speech evaluation artifacts from pronunciation assessment + timing.
 * User audio only; transcript is the reference string passed into Azure PA.
 */
import type { NormalizedPronunciationAssessment, NormalizedWordAssessment } from '../speech/pronunciationAssessmentContracts'
import type { TimingAnalysis } from '../../domain/speaking-assessment/speakingAssessmentCanonical'
import type { AudioScores } from './liveVoiceEvaluationTypes'
import type {
  SpeakLiveAzureSpeechPhonemeIssueV1,
  SpeakLiveAzureSpeechTurnEvaluationV1,
  SpeakLiveAzureSpeechWordTimingV1,
} from './speakLiveAzureSpeechEvaluationArtifact.schema'
import { SpeakLiveAzureSpeechTurnEvaluationV1Schema } from './speakLiveAzureSpeechEvaluationArtifact.schema'

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)))
}

/** Pull Words[] from Azure Speech JSON result (shape varies by endpoint / SDK). */
export function extractAzureWordsArrayFromProviderJson(raw: unknown): unknown[] {
  if (!raw || typeof raw !== 'object') return []
  const o = raw as Record<string, unknown>
  if (Array.isArray(o.Words)) return o.Words
  const nb = o.NBest
  if (Array.isArray(nb) && nb[0] && typeof nb[0] === 'object') {
    const w = (nb[0] as Record<string, unknown>).Words
    if (Array.isArray(w)) return w
  }
  return []
}

export function extractPhonemeIssuesFromAzureProviderJson(raw: unknown, max = 48): SpeakLiveAzureSpeechPhonemeIssueV1[] {
  const words = extractAzureWordsArrayFromProviderJson(raw)
  const out: SpeakLiveAzureSpeechPhonemeIssueV1[] = []
  for (const w of words) {
    if (!w || typeof w !== 'object') continue
    const o = w as Record<string, unknown>
    const word = typeof o.Word === 'string' ? o.Word.trim() : ''
    const phs = o.Phonemes
    if (!Array.isArray(phs) || !word) continue
    for (const p of phs) {
      if (!p || typeof p !== 'object') continue
      const po = p as Record<string, unknown>
      const phoneme =
        (typeof po.Phoneme === 'string' && po.Phoneme) ||
        (typeof po.phoneme === 'string' && po.phoneme) ||
        (typeof po.Grapheme === 'string' && po.Grapheme) ||
        ''
      const pa = po.PronunciationAssessment as { AccuracyScore?: number; ErrorType?: string } | undefined
      const accuracyScore = clamp100(Number(pa?.AccuracyScore ?? 0))
      const et = typeof pa?.ErrorType === 'string' ? pa.ErrorType : undefined
      if (!phoneme) continue
      if (accuracyScore < 78 || (et && et !== 'None')) {
        out.push({
          word: word.slice(0, 200),
          phoneme: phoneme.slice(0, 64),
          accuracyScore,
          errorType: et?.slice(0, 120),
        })
      }
      if (out.length >= max) return out
    }
  }
  return out
}

function partitionOmittedInserted(words: NormalizedWordAssessment[]): { omitted: string[]; inserted: string[] } {
  const omitted: string[] = []
  const inserted: string[] = []
  for (const w of words) {
    const et = (w.errorType ?? '').toLowerCase()
    const token = w.word.trim()
    if (!token) continue
    if (et.includes('omission')) omitted.push(token.slice(0, 120))
    else if (et.includes('insertion')) inserted.push(token.slice(0, 120))
  }
  return {
    omitted: omitted.slice(0, 40),
    inserted: inserted.slice(0, 40),
  }
}

function wordTimingsFromNormalized(words: NormalizedWordAssessment[]): SpeakLiveAzureSpeechWordTimingV1[] {
  return words.slice(0, 200).map((w) => ({
    word: w.word.trim().slice(0, 200),
    accuracyScore: clamp100(w.accuracyScore),
    errorType: w.errorType?.slice(0, 120),
    startMs: w.startMs,
    endMs: w.endMs,
  }))
}

export function buildSpeakLiveAzureSpeechTurnEvaluationArtifact(params: {
  turnId: string
  transcriptReference: string
  audioBlobPath: string | null
  turnRecordedAtMs?: number | null
  assessment: NormalizedPronunciationAssessment | null
  timing: TimingAnalysis
  audioScores: AudioScores
  providerRawResult?: unknown
}): SpeakLiveAzureSpeechTurnEvaluationV1 | null {
  if (!params.assessment) return null
  const a = params.assessment
  const words = a.words ?? []
  const { omitted, inserted } = partitionOmittedInserted(words)
  const weakWords = words
    .filter((w) => w.accuracyScore < 72 && w.word.trim().length > 0)
    .map((w) => w.word.trim().slice(0, 120))
    .slice(0, 24)

  const phonemeIssues = extractPhonemeIssuesFromAzureProviderJson(params.providerRawResult ?? null, 48)

  const pacingDetail = {
    rhythmScore: clamp100(params.audioScores.rhythm),
    paceProfile: params.timing.paceProfile,
    pauseCount: params.timing.pauseCount,
    avgPauseMs: Math.round(params.timing.avgPauseMs),
    longestPauseMs: Math.round(params.timing.longestPauseMs),
    rushedEnding: params.timing.rushedEnding,
    speakingDurationMs: Math.round(params.timing.speakingDurationMs),
    totalDurationMs: Math.round(params.timing.totalDurationMs),
  }

  const candidate: SpeakLiveAzureSpeechTurnEvaluationV1 = {
    version: 1,
    turnId: params.turnId,
    transcriptReference: params.transcriptReference.slice(0, 8000),
    audioBlobPath: params.audioBlobPath,
    turnRecordedAtMs: params.turnRecordedAtMs != null && Number.isFinite(params.turnRecordedAtMs) ? Math.round(params.turnRecordedAtMs) : undefined,
    clipDurationMs: params.timing.totalDurationMs > 0 ? Math.round(params.timing.totalDurationMs) : undefined,
    pronunciation: clamp100(params.audioScores.pronunciation),
    fluency: clamp100(a.fluencyScore),
    completeness: clamp100(a.completenessScore),
    prosody: a.prosodyScore != null ? clamp100(a.prosodyScore) : null,
    pacing: clamp100(params.audioScores.rhythm),
    pacingDetail,
    hesitationCount: params.timing.hesitationMoments.length,
    speakingRate: Math.round(params.timing.estimatedWpm),
    weakWords,
    phonemeIssues,
    omittedWords: omitted,
    insertedWords: inserted,
    wordTimings: wordTimingsFromNormalized(words),
    assessedAt: new Date().toISOString(),
    provider: 'azure',
  }

  const parsed = SpeakLiveAzureSpeechTurnEvaluationV1Schema.safeParse(candidate)
  if (!parsed.success) {
    console.warn('[AzureSpeechArtifact] Zod validation failed', parsed.error.issues.slice(0, 6))
    return null
  }
  return parsed.data
}

/** Flat summary shape for APIs / logging (matches product contract). */
export function toAzureSpeechTurnEvalSummary(a: SpeakLiveAzureSpeechTurnEvaluationV1): {
  turnId: string
  pronunciation: number
  fluency: number
  prosody: number | null
  pacing: number
  hesitationCount: number
  speakingRate: number
  weakWords: string[]
  phonemeIssues: SpeakLiveAzureSpeechPhonemeIssueV1[]
} {
  return {
    turnId: a.turnId,
    pronunciation: a.pronunciation,
    fluency: a.fluency,
    prosody: a.prosody,
    pacing: a.pacing,
    hesitationCount: a.hesitationCount,
    speakingRate: a.speakingRate,
    weakWords: a.weakWords,
    phonemeIssues: a.phonemeIssues,
  }
}
