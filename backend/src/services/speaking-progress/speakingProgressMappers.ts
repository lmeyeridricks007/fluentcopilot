import { randomUUID } from 'node:crypto'
import type { SpeakingAssessmentResult } from '../../domain/speaking-assessment/speakingAssessmentCanonical'
import type { LiveSessionEvaluation } from '../speak-live/liveVoiceEvaluationTypes'
import type {
  NormalizedPronunciationAssessment,
  PronunciationProgressMeta,
  PronunciationRetryHints,
} from '../speech/pronunciationAssessmentContracts'
import type { SpeakingProgressRecordV1 } from './speakingProgressRecord'
import type { LearnerLevel } from './speakingProgressRecord'

function derivedFromNormalized(a: NormalizedPronunciationAssessment): SpeakingProgressRecordV1['derivedScores'] {
  const rhythm = Math.round(a.fluencyScore * 0.55 + (a.prosodyScore ?? a.fluencyScore) * 0.45)
  const sentenceStress = Math.round(a.pronunciationScore * 0.55 + a.accuracyScore * 0.45)
  const naturalness = Math.round(
    a.pronunciationScore * 0.34 + a.fluencyScore * 0.33 + a.completenessScore * 0.33
  )
  return {
    rhythm,
    sentenceStress,
    naturalness,
    intonation: a.prosodyScore,
  }
}

function verdictFromPronunciation(a: NormalizedPronunciationAssessment): SpeakingProgressRecordV1['verdictLabels'] {
  const o = a.overallScore
  const top =
    o >= 78 ? 'Strong for this clip' : o >= 62 ? 'Understandable learner Dutch' : 'Building clarity on this line'
  return { topLabel: top, clarityLabel: top, naturalnessLabel: top }
}

function weakWordsFromAssessment(a: NormalizedPronunciationAssessment): string[] {
  return [...a.words]
    .sort((x, y) => x.accuracyScore - y.accuracyScore)
    .slice(0, 8)
    .map((w) => w.word.trim().toLowerCase())
    .filter(Boolean)
}

function learnerLevelFromCefrString(raw: string | undefined | null): LearnerLevel {
  const u = (raw ?? '').trim().toUpperCase()
  if (u === 'A1' || u === 'A2' || u === 'B1') return u
  return 'unknown'
}

/** Minimal normalized shape so we can reuse derived/verdict helpers for Speak Live aggregates. */
function syntheticAssessmentFromRawScores(input: {
  pronunciation: number
  fluency: number
  completeness: number
  overall: number
  prosody: number | null
  accuracy: number
}): NormalizedPronunciationAssessment {
  return {
    pronunciationScore: input.pronunciation,
    fluencyScore: input.fluency,
    completenessScore: input.completeness,
    overallScore: input.overall,
    prosodyScore: input.prosody,
    accuracyScore: input.accuracy,
    recognizedText: '',
    referenceTextUsed: '',
    assessmentMode: 'open_response',
    referenceAlignment: 'spoken_text_proxy',
    words: [],
    actionNotes: [],
    caveatNotes: [],
  }
}

/**
 * One “clip” row from a completed Speak Live session report — feeds {@link computeSpeakingProgressSummary}.
 * Returns null when there was no meaningful voice scoring (transcript-only sessions).
 */
export function mapSpeakLiveEvaluationToProgressRecord(params: {
  userId: string
  threadId: string
  evaluation: LiveSessionEvaluation
}): SpeakingProgressRecordV1 | null {
  const ev = params.evaluation
  const azureTurns = ev.evidenceSummary?.azurePronunciationTurnCount ?? 0
  const hasAudioSignal = Boolean(ev.sessionAudioMetricsAvailable || azureTurns > 0)
  if (!hasAudioSignal) return null

  const os = ev.overallScores
  const hasNumericVoice =
    typeof os.pronunciationScore === 'number' ||
    typeof os.fluencyScore === 'number' ||
    typeof os.rhythmScore === 'number' ||
    azureTurns > 0
  if (!hasNumericVoice) return null

  const pronunciation = Math.round(
    os.pronunciationScore ?? os.fluencyScore ?? os.rhythmScore ?? os.naturalnessScore * 0.92,
  )
  const fluency = Math.round(os.fluencyScore ?? os.rhythmScore ?? pronunciation)
  const completeness = Math.round(os.scenarioCompletionScore ?? os.clarityScore ?? 60)
  const overall = Math.round(os.overallVoiceScore ?? (pronunciation + fluency + os.naturalnessScore) / 3)
  const prosody = typeof os.rhythmScore === 'number' ? os.rhythmScore : fluency
  const accuracy = Math.round(os.clarityScore ?? pronunciation)

  const synthetic = syntheticAssessmentFromRawScores({
    pronunciation,
    fluency,
    completeness,
    overall,
    prosody,
    accuracy,
  })

  const weakCounts = new Map<string, number>()
  for (const t of ev.turnEvaluations ?? []) {
    for (const word of t.audioCoaching?.evidence.weakWords ?? []) {
      const k = word.trim().toLowerCase()
      if (!k) continue
      weakCounts.set(k, (weakCounts.get(k) ?? 0) + 1)
    }
  }
  const weakWordsTop = [...weakCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w)

  const phraseBits: string[] = []
  for (const t of ev.turnEvaluations ?? []) {
    for (const s of t.audioCoaching?.evidence.problematicSegments ?? []) {
      const x = s.trim()
      if (x.length >= 2) phraseBits.push(x.slice(0, 120))
    }
    for (const d of t.recommendedDrills ?? []) {
      const x = d.targetText?.trim()
      if (x && x.length >= 2) phraseBits.push(x.slice(0, 120))
    }
  }
  const phraseSnippets = [...new Set(phraseBits)].slice(0, 5)

  const dutchHint =
    ev.overallSummary?.pronunciationSummary?.trim() || ev.coachHeadline?.trim() || ev.coachSummaryLine?.trim() || null

  return {
    schemaVersion: 1,
    id: randomUUID(),
    userId: params.userId,
    createdAtUtc: new Date().toISOString(),
    source: 'speak_live_session',
    scenarioId: ev.scenarioId?.trim() ?? null,
    scenarioTitle: (ev.scenarioTitle ?? ev.scenarioName)?.trim() || null,
    threadId: params.threadId.trim(),
    level: learnerLevelFromCefrString(ev.targetLevel ?? ev.learnerLevel),
    rawScores: {
      pronunciation,
      fluency,
      completeness,
      overall,
      prosody,
      accuracy,
    },
    derivedScores: derivedFromNormalized(synthetic),
    verdictLabels: verdictFromPronunciation(synthetic),
    retryTarget: null,
    weakWordsTop,
    phraseSnippets,
    dutchSoundingLabel: dutchHint ? dutchHint.slice(0, 200) : null,
  }
}

export function mapPronunciationToProgressRecord(params: {
  userId: string
  assessment: NormalizedPronunciationAssessment
  retryHints: PronunciationRetryHints | null | undefined
  meta?: PronunciationProgressMeta | null
}): SpeakingProgressRecordV1 {
  const { userId, assessment: a, retryHints, meta } = params
  const level: LearnerLevel = meta?.level ?? 'unknown'
  const phraseSnippets = (retryHints?.phraseTargets ?? []).slice(0, 5).map((p) => p.text.trim()).filter(Boolean)
  return {
    schemaVersion: 1,
    id: randomUUID(),
    userId,
    createdAtUtc: new Date().toISOString(),
    source: 'pronunciation_assessment',
    scenarioId: meta?.scenarioId?.trim() ?? null,
    scenarioTitle: meta?.scenarioTitle?.trim() ?? null,
    threadId: meta?.threadId?.trim() ?? null,
    level,
    rawScores: {
      pronunciation: a.pronunciationScore,
      fluency: a.fluencyScore,
      completeness: a.completenessScore,
      overall: a.overallScore,
      prosody: a.prosodyScore,
      accuracy: a.accuracyScore,
    },
    derivedScores: derivedFromNormalized(a),
    verdictLabels: verdictFromPronunciation(a),
    retryTarget: retryHints?.coaching?.retryTarget?.trim() ?? null,
    weakWordsTop: weakWordsFromAssessment(a),
    phraseSnippets,
    dutchSoundingLabel: null,
  }
}

export function mapSpeakingAssessmentToProgressRecord(params: {
  userId: string
  canonical: SpeakingAssessmentResult
}): SpeakingProgressRecordV1 {
  const { userId, canonical: c } = params
  const weakWordsTop = [...c.wordAssessments]
    .filter((w) => w.isWeak)
    .sort((x, y) => x.accuracyScore - y.accuracyScore)
    .slice(0, 8)
    .map((w) => w.text.trim().toLowerCase())
    .filter(Boolean)

  const phraseSnippets = c.phraseTargets.slice(0, 5).map((p) => p.text.trim()).filter(Boolean)

  const level: LearnerLevel = 'unknown'

  return {
    schemaVersion: 1,
    id: randomUUID(),
    userId,
    createdAtUtc: c.createdAtUtc,
    source: 'speaking_assessment',
    scenarioId: c.scenarioId?.trim() ?? null,
    scenarioTitle: null,
    threadId: null,
    level,
    rawScores: { ...c.rawScores },
    derivedScores: {
      rhythm: c.derivedScores.rhythm.score,
      sentenceStress: c.derivedScores.sentenceStress.score,
      naturalness: c.derivedScores.naturalness.score,
      intonation: c.derivedScores.intonationGuidance?.score ?? null,
    },
    verdictLabels: {
      topLabel: c.verdicts.topLabel,
      clarityLabel: c.verdicts.clarityLabel,
      naturalnessLabel: c.verdicts.naturalnessLabel,
    },
    retryTarget: c.coaching.retryTarget,
    weakWordsTop,
    phraseSnippets,
    dutchSoundingLabel: c.coaching.dutchSoundingLabel?.trim() || null,
  }
}
