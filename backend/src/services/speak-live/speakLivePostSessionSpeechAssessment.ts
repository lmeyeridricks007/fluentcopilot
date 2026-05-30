/**
 * Azure Speech post-session lane: pronunciation assessment + timing per **user** turn.
 * Assistant lines are never scored here; they are passed through as LLM context only.
 */
import { tryDownloadConversationBinaryArtifact } from '../storage/blobStorageService'
import {
  getAzureSpeechLocale,
  getPronunciationRuntimeMode,
  isAzurePronunciationConfigured,
} from '../speech/pronunciationAssessmentConfig'
import type { NormalizedWordAssessment } from '../speech/pronunciationAssessmentContracts'
import type { TimingAnalysis } from '../../domain/speaking-assessment/speakingAssessmentCanonical'
import type { AudioScores, TurnEvaluation, AzureSpeechTurnSkippedReason, SpeakLiveAzureMode } from './liveVoiceEvaluationTypes'
import { SPEAK_LIVE_AZURE_REQUIRED_MODE } from './liveVoiceEvaluationTypes'
import type { LiveEvalLlmTurnInput } from './liveSessionEvaluationLlm'
import { VOICE_ANALYSIS_UNAVAILABLE_MESSAGE } from './liveSessionEvaluationTrust'
import { prepareLiveTurnVoicePrep, readLiveTurnVoicePrep } from './liveTurnVoicePrepService'
import { buildSpeakLiveAzureSpeechTurnEvaluationArtifact } from './speakLiveAzureSpeechEvaluationArtifactService'
import type { PostSessionSpeechTurnInput } from './speakLiveNormalizedConversation'
import { computeCombinedScores, defaultLanguageScores, scoreBand } from './speakLivePostSessionScoringUtils'

export type PostSessionSpeechTurnTiming = {
  turnId: string
  turnIndex: number
  totalMs: number
  blobDownloadMs: number
  audioAssessmentMs: number
  timingAnalysisMs: number
  blobBytes: number
  hadAudio: boolean
  assessmentOk: boolean
  /** Present when the turn was not assessed against audio (no clip / no usable audio / Azure off). */
  skippedReason?: AzureSpeechTurnSkippedReason
  /** Machine-oriented reason when `assessmentOk` is false with audio present. */
  errorCode?: string
  /** Short human-facing hint (first caveat or internal error summary). */
  warning?: string
  /**
   * Strict-live marker — Azure speech for this turn ran live (no cache, no precompute, no mock).
   * ALWAYS `'live'` for the FluentCopilot scenario report.
   */
  assessmentSource: SpeakLiveAzureMode
  /** Wall time of the actual Azure provider call for this turn (mirrors {@link audioAssessmentMs}). */
  providerRequestMs: number
}

export type PostSessionSpeechTurnResult = {
  llmFact: LiveEvalLlmTurnInput
  turnEval: TurnEvaluation
  weakWordList: string[]
  audioCtx: { words: NormalizedWordAssessment[]; timing: TimingAnalysis } | null
  turnTiming: PostSessionSpeechTurnTiming
}

/**
 * Decide skip reason + `assessmentOk` for the post-session Azure pronunciation lane.
 * Never returns `skippedReason === 'no_audio'` when usable audio evidence exists (`hasAudio` or ≥32 bytes).
 */
export function resolveAzureSpeechTurnSkipDiagnostics(input: {
  blobPath: string | null | undefined
  hasAudio: boolean
  blobBytes: number
  downloadOk: boolean
  prepAssessmentOk: boolean
}): { skippedReason?: AzureSpeechTurnSkippedReason; assessmentOk: boolean } {
  const trimmed = typeof input.blobPath === 'string' ? input.blobPath.trim() : ''
  const blobRef = trimmed.length > 0 ? trimmed : null
  const bytes = Math.max(0, input.blobBytes | 0)
  const audioEvidence = input.hasAudio || bytes >= 32
  const azureUsable = getPronunciationRuntimeMode() === 'azure' && isAzurePronunciationConfigured()

  if (!azureUsable) {
    if (!audioEvidence && !blobRef) return { skippedReason: 'no_audio', assessmentOk: false }
    return { skippedReason: 'azure_disabled', assessmentOk: false }
  }

  if (!blobRef && !audioEvidence) {
    return { skippedReason: 'no_audio', assessmentOk: false }
  }

  if (blobRef && !input.downloadOk) {
    return { skippedReason: 'audio_load_failed', assessmentOk: false }
  }

  if (blobRef && input.downloadOk && bytes === 0) {
    return { skippedReason: 'audio_load_failed', assessmentOk: false }
  }

  if (audioEvidence) {
    const ok = Boolean(input.prepAssessmentOk)
    return { assessmentOk: ok }
  }

  if (blobRef) {
    return { skippedReason: 'audio_load_failed', assessmentOk: false }
  }

  return { skippedReason: 'no_audio', assessmentOk: false }
}

/**
 * Text-only / degraded lane when Azure assessment cannot run for a turn (never throws from the happy path).
 * Preserves learner audio **paths** from metadata for UI playback URLs; marks speech metrics unavailable.
 */
export function buildPostSessionSpeechEmergencyResult(params: {
  threadId: string
  scenarioGoals: string[]
  turn: PostSessionSpeechTurnInput
  reason: string
}): PostSessionSpeechTurnResult {
  const { msg, assistant, index } = params.turn
  const meta = msg.metadata as Record<string, unknown> | null | undefined
  const transcriptRaw =
    typeof meta?.transcriptRaw === 'string' && meta.transcriptRaw.trim()
      ? meta.transcriptRaw.trim()
      : msg.content.trim()
  const transcriptNormalizedMeta =
    typeof meta?.transcriptNormalized === 'string' && meta.transcriptNormalized.trim()
      ? meta.transcriptNormalized.trim()
      : null
  const transcriptNormalized = (transcriptNormalizedMeta ?? transcriptRaw).trim() || transcriptRaw
  const blobPath = typeof meta?.learnerAudioBlobPath === 'string' ? meta.learnerAudioBlobPath.trim() : ''
  const learnerAudioPath = blobPath ? `speak-live/session/${params.threadId}/learner-audio/${msg.id}` : null
  const audioDiag = {
    blobPath: blobPath || null,
    downloadOk: false,
    bufSize: 0,
    assessmentOk: false,
    assessmentCaveats: [params.reason.slice(0, 400)],
  }
  const audioScores: AudioScores = { pronunciation: 0, fluency: 0, rhythm: 0, completeness: 0, clarity: 0 }
  const langDefault = defaultLanguageScores()
  const combined = computeCombinedScores(audioScores, langDefault, false)
  const llmFact: LiveEvalLlmTurnInput = {
    turnId: msg.id,
    turnIndex: index,
    learnerTranscript: transcriptRaw,
    learnerTranscriptNormalized: transcriptNormalized,
    assistantReply: (assistant ?? '').trim().slice(0, 1200),
    hasLearnerAudio: Boolean(blobPath),
    sessionGoals: params.scenarioGoals,
    azureSummary: null,
  }
  const turnEval: TurnEvaluation = {
    turnId: msg.id,
    turnIndex: index,
    learnerTranscript: transcriptRaw,
    transcriptOriginal: transcriptRaw,
    transcriptNormalized,
    originalAudioUrl: learnerAudioPath,
    transcriptConfidence: 'medium',
    scenarioGoalTags: [],
    scenarioGoalFit: {
      summary: 'Pending coach merge.',
      alignmentScore: 55,
      relevantGoals: [],
    },
    transcriptCoaching: {
      meaningClarityScore: null,
      grammarScore: null,
      naturalnessScore: null,
      levelFitScore: null,
      issues: [],
      strengths: [],
      rewriteOptions: { safeForLevel: null, moreNatural: null, stretch: null },
      patternToReuse: null,
      explanations: [],
      evidenceLines: [],
    },
    audioCoaching: null,
    naturalRewrite: null,
    savedWordCandidates: [],
    recommendedDrills: [],
    dimensions: [],
    audioScores,
    languageScores: langDefault,
    combinedScores: combined,
    keyProblems: [],
    keyStrengths: [],
    voiceAnalysisUnavailableMessage: VOICE_ANALYSIS_UNAVAILABLE_MESSAGE,
    feedbackItems: [],
    pronunciationIssues: [],
    fluencyIssues: [],
    referenceSentence: transcriptRaw,
    referenceSentenceReason: '',
    referenceKind: 'reference_pronunciation',
    referenceAudioUrl: null,
    learnerAudioUrl: learnerAudioPath,
    improvementActions: [],
    chunkingRhythmSuggestion: '',
    focusWords: [],
    assistantContext: assistant?.trim().slice(0, 2000) ?? null,
    quickLabels: {
      pronunciation: '—',
      rhythm: '—',
      naturalness: scoreBand(langDefault.naturalness),
    },
    signalSources: {
      audioMetrics: 'unavailable',
      languageCoach: 'transcript_language',
      scenarioContext: 'scenario_context',
    },
    audioFindings: [],
    dutchLikenessNarrative: '',
    audioDiagnostics: audioDiag,
  }
  return {
    llmFact,
    turnEval,
    weakWordList: [],
    audioCtx: null,
    turnTiming: (() => {
      const blobRef = blobPath.length > 0 ? blobPath : null
      const em = resolveAzureSpeechTurnSkipDiagnostics({
        blobPath: blobRef,
        hasAudio: false,
        blobBytes: 0,
        downloadOk: false,
        prepAssessmentOk: false,
      })
      return {
        turnId: msg.id,
        turnIndex: index,
        totalMs: 0,
        blobDownloadMs: 0,
        audioAssessmentMs: 0,
        timingAnalysisMs: 0,
        blobBytes: 0,
        hadAudio: Boolean(blobRef),
        assessmentOk: em.assessmentOk,
        skippedReason: em.skippedReason,
        errorCode: 'speech_assessment_emergency',
        warning: params.reason.slice(0, 500),
        assessmentSource: SPEAK_LIVE_AZURE_REQUIRED_MODE,
        providerRequestMs: 0,
      }
    })(),
  }
}

export async function assessPostSessionUserTurn(params: {
  threadId: string
  scenarioGoals: string[]
  turn: PostSessionSpeechTurnInput
}): Promise<PostSessionSpeechTurnResult> {
  const turnStartedAt = Date.now()
  const { msg, assistant, index } = params.turn
  const meta = msg.metadata as Record<string, unknown> | null | undefined
  const transcriptRaw =
    typeof meta?.transcriptRaw === 'string' && meta.transcriptRaw.trim()
      ? meta.transcriptRaw.trim()
      : msg.content.trim()
  const transcriptNormalizedMeta =
    typeof meta?.transcriptNormalized === 'string' && meta.transcriptNormalized.trim()
      ? meta.transcriptNormalized.trim()
      : null
  const referenceForPa = (transcriptNormalizedMeta ?? transcriptRaw).trim() || msg.content.trim()
  const blobPath = typeof meta?.learnerAudioBlobPath === 'string' ? meta.learnerAudioBlobPath : null
  const mimeType = typeof meta?.learnerAudioMimeType === 'string' ? meta.learnerAudioMimeType : 'audio/webm'
  const cachedPrep = readLiveTurnVoicePrep(meta)
  let audioBuf: Buffer | null = null
  let blobDownloadMs = 0
  let audioAssessmentMs = 0
  let timingAnalysisMs = 0
  let audioDiag: { blobPath: string | null; downloadOk: boolean; bufSize: number; assessmentOk: boolean; assessmentCaveats: string[] } = {
    blobPath,
    downloadOk: false,
    bufSize: 0,
    assessmentOk: false,
    assessmentCaveats: [],
  }
  /**
   * Cache reuse rules:
   *
   * - Reuse the prep stored during the live conversation whenever it points at the same blob and
   *   reference text — Azure already scored the clip, no need to re-run.
   * - **Do not** reuse a cached prep that says `assessmentOk: false` when we still have a blob to
   *   retry against. A stalled or failed Azure call during the live conversation (network glitch,
   *   `Canceled` result, NoMatch on a clip we still have) writes a "failed" prep to message
   *   metadata; reusing it pins the report into `partial`/`unavailable` even after the user clicks
   *   "Re-score voice", because every subsequent post-session run sees the same failed cache and
   *   never calls Azure again. Treating these as cache misses lets the post-session lane download
   *   the audio and re-run the assessment with the (now timeout-bounded) Azure call.
   */
  const cachedPrepBlobMatches = Boolean(
    cachedPrep && cachedPrep.audioDiagnostics?.blobPath === blobPath && cachedPrep.referenceForPa === referenceForPa,
  )
  const cachedPrepHasFailedAssessment = Boolean(
    cachedPrep && cachedPrep.audioDiagnostics && cachedPrep.audioDiagnostics.assessmentOk === false,
  )
  const cachedPrepIsRescorable = cachedPrepHasFailedAssessment && Boolean(blobPath)
  let prepData = cachedPrepBlobMatches && !cachedPrepIsRescorable ? cachedPrep : null
  if (cachedPrepBlobMatches && cachedPrepIsRescorable) {
    console.log(
      `[SpeechEval] Turn ${index}: ignoring cached prep because previous assessment failed (blobPath=${blobPath}); will retry Azure post-session.`,
    )
  }
  /**
   * Strict-live invariant — when the audio was already scored against the live Azure provider
   * during the conversation (the parallel pre-warm), `cachedPrep.azureProviderRequestMs` carries
   * the wall-time of that real call. Surface it here so the post-session diagnostics never report
   * `providerRequestMs = 0` for an assessment that genuinely happened against Azure live.
   */
  if (prepData) {
    const reusedMs = Math.max(0, prepData.azureProviderRequestMs ?? 0)
    if (reusedMs > 0) {
      audioAssessmentMs = reusedMs
    }
  }
  if (!prepData && blobPath) {
    const dlStartedAt = Date.now()
    try {
      const dl = await tryDownloadConversationBinaryArtifact(params.threadId, blobPath)
      if (dl) {
        audioBuf = dl.buffer
        audioDiag.downloadOk = true
        audioDiag.bufSize = dl.buffer.length
      } else {
        console.warn(`[SpeechEval] Turn ${index}: blob download returned null for ${blobPath}`)
      }
    } catch (dlErr) {
      console.error(`[SpeechEval] Turn ${index}: blob download THREW for ${blobPath}:`, dlErr instanceof Error ? dlErr.message : dlErr)
    } finally {
      blobDownloadMs = Date.now() - dlStartedAt
    }
  } else if (!prepData) {
    console.warn(`[SpeechEval] Turn ${index}: no learnerAudioBlobPath in metadata`)
  }
  if (!prepData) {
    const prepStartedAt = Date.now()
    try {
      prepData = await prepareLiveTurnVoicePrep({
        audio: audioBuf,
        mimeType,
        transcriptRaw,
        transcriptNormalizedMeta,
        referenceForPa,
        blobPath,
        source: 'post_session',
        downloadOk: audioDiag.downloadOk,
        locale: getAzureSpeechLocale(),
        turnId: msg.id,
        turnRecordedAtMs: (() => {
          const t = Date.parse(msg.createdAt)
          return Number.isFinite(t) ? t : null
        })(),
      })
    } catch (prepErr) {
      console.error(`[SpeechEval] Turn ${index}: live turn prep THREW:`, prepErr instanceof Error ? prepErr.message : prepErr)
      prepData = await prepareLiveTurnVoicePrep({
        audio: null,
        mimeType,
        transcriptRaw,
        transcriptNormalizedMeta,
        referenceForPa,
        blobPath,
        source: 'post_session',
        downloadOk: audioDiag.downloadOk,
        locale: getAzureSpeechLocale(),
        turnId: msg.id,
        turnRecordedAtMs: (() => {
          const t = Date.parse(msg.createdAt)
          return Number.isFinite(t) ? t : null
        })(),
      })
    } finally {
      const prepElapsed = Date.now() - prepStartedAt
      if (audioBuf?.length) audioAssessmentMs = prepElapsed
      else timingAnalysisMs = prepElapsed
    }
  }
  audioDiag = prepData.audioDiagnostics
  const hasAudio = prepData.hasAudio
  console.log(
    `[SpeechEval] Turn ${index}: blobPath=${blobPath ?? 'NONE'} downloadOk=${audioDiag.downloadOk} bufSize=${audioDiag.bufSize} hasAudio=${hasAudio} mime=${mimeType} cache=${prepData.source}`,
  )

  const words = prepData.assessment?.words ?? []
  const timing = prepData.timing
  const audioScores: AudioScores = prepData.audioScores
  const azureSummary = prepData.azureSummary
  const audioFindings = prepData.audioFindings
  const weakWordList = prepData.weakWordList

  let { skippedReason, assessmentOk: assessmentOkOut } = resolveAzureSpeechTurnSkipDiagnostics({
    blobPath,
    hasAudio,
    blobBytes: audioDiag.bufSize,
    downloadOk: audioDiag.downloadOk,
    prepAssessmentOk: audioDiag.assessmentOk,
  })
  const audioEvidenceForSkip = hasAudio || (audioDiag.bufSize ?? 0) >= 32
  if (audioEvidenceForSkip && skippedReason === 'no_audio') skippedReason = undefined
  if (assessmentOkOut && skippedReason) skippedReason = undefined

  const azureSpeechEvaluation =
    prepData.azureSpeechEvaluationV1 ??
    (prepData.assessment && hasAudio
      ? buildSpeakLiveAzureSpeechTurnEvaluationArtifact({
          turnId: msg.id,
          transcriptReference: (transcriptNormalizedMeta ?? prepData.assessment.recognizedText ?? transcriptRaw).trim(),
          audioBlobPath: blobPath,
          turnRecordedAtMs: (() => {
            const t = Date.parse(msg.createdAt)
            return Number.isFinite(t) ? t : undefined
          })(),
          assessment: prepData.assessment,
          timing: prepData.timing,
          audioScores: prepData.audioScores,
          providerRawResult: undefined,
        })
      : null) ??
    undefined

  const transcriptOriginal = transcriptRaw
  const transcriptNormalized = prepData.transcriptNormalized
  const langDefault = defaultLanguageScores()
  const combined = computeCombinedScores(audioScores, langDefault, hasAudio)

  const llmFact: LiveEvalLlmTurnInput = {
    turnId: msg.id,
    turnIndex: index,
    learnerTranscript: transcriptRaw,
    learnerTranscriptNormalized: transcriptNormalized,
    assistantReply: (assistant ?? '').trim().slice(0, 1200),
    hasLearnerAudio: Boolean(hasAudio || (typeof blobPath === 'string' && blobPath.trim().length > 0)),
    sessionGoals: params.scenarioGoals,
    azureSummary,
  }

  const learnerAudioPath = blobPath ? `speak-live/session/${params.threadId}/learner-audio/${msg.id}` : null

  const turnEval: TurnEvaluation = {
    turnId: msg.id,
    turnIndex: index,
    learnerTranscript: transcriptOriginal,
    transcriptOriginal,
    transcriptNormalized,
    originalAudioUrl: learnerAudioPath,
    transcriptConfidence: hasAudio ? 'high' : 'medium',
    scenarioGoalTags: [],
    scenarioGoalFit: {
      summary: 'Pending coach merge.',
      alignmentScore: 55,
      relevantGoals: [],
    },
    transcriptCoaching: {
      meaningClarityScore: null,
      grammarScore: null,
      naturalnessScore: null,
      levelFitScore: null,
      issues: [],
      strengths: [],
      rewriteOptions: { safeForLevel: null, moreNatural: null, stretch: null },
      patternToReuse: null,
      explanations: [],
      evidenceLines: [],
    },
    audioCoaching: null,
    naturalRewrite: null,
    savedWordCandidates: [],
    recommendedDrills: [],
    dimensions: [],
    audioScores,
    languageScores: langDefault,
    combinedScores: combined,
    keyProblems: hasAudio ? [...audioFindings] : [],
    keyStrengths: [],
    voiceAnalysisUnavailableMessage: hasAudio ? null : VOICE_ANALYSIS_UNAVAILABLE_MESSAGE,
    feedbackItems: [],
    pronunciationIssues: [],
    fluencyIssues: [],
    referenceSentence: transcriptOriginal,
    referenceSentenceReason: '',
    referenceKind: 'reference_pronunciation',
    referenceAudioUrl: null,
    learnerAudioUrl: learnerAudioPath,
    improvementActions: [],
    chunkingRhythmSuggestion: '',
    focusWords: [],
    assistantContext: assistant?.trim().slice(0, 2000) ?? null,
    azureSpeechEvaluation,
    quickLabels: {
      pronunciation: hasAudio && assessmentOkOut ? scoreBand(audioScores.pronunciation) : '—',
      rhythm: hasAudio && assessmentOkOut ? prepData.rhythmLabel || '—' : '—',
      naturalness: scoreBand(langDefault.naturalness),
    },
    signalSources: {
      audioMetrics: assessmentOkOut ? 'azure_audio' : 'unavailable',
      languageCoach: 'transcript_language',
      scenarioContext: 'scenario_context',
    },
    audioFindings,
    dutchLikenessNarrative: '',
    audioDiagnostics: audioDiag,
  }

  const errorCode =
    skippedReason === 'azure_disabled'
      ? 'azure_speech_disabled'
      : hasAudio && !assessmentOkOut
        ? 'azure_assessment_failed'
        : audioDiag.downloadOk === false && blobPath
          ? 'blob_download_failed'
          : undefined
  const warning =
    (audioDiag.assessmentCaveats[0] ?? (errorCode ? 'Speech assessment did not complete for this clip.' : undefined))?.slice(
      0,
      500,
    ) || undefined

  /**
   * Per-turn `providerRequestMs` should reflect ONLY the Azure provider wall time. When a prep
   * was reused from the live conversation pre-warm, prefer `prepData.azureProviderRequestMs`
   * (the genuine Azure call time captured at the moment it ran live). When we ran the prep
   * inline here, fall back to `audioAssessmentMs` which already covers the prep block.
   */
  const providerRequestMs = (() => {
    const fromPrep = Math.max(0, prepData.azureProviderRequestMs ?? 0)
    if (fromPrep > 0) return fromPrep
    if (hasAudio && audioAssessmentMs > 0) return audioAssessmentMs
    return 0
  })()

  return {
    llmFact,
    turnEval,
    weakWordList,
    audioCtx: hasAudio ? { words, timing } : null,
    turnTiming: {
      turnId: msg.id,
      turnIndex: index,
      totalMs: Date.now() - turnStartedAt,
      blobDownloadMs,
      audioAssessmentMs: audioAssessmentMs > 0 ? audioAssessmentMs : providerRequestMs,
      timingAnalysisMs,
      blobBytes: audioDiag.bufSize,
      hadAudio: hasAudio,
      assessmentOk: assessmentOkOut,
      skippedReason,
      errorCode,
      warning,
      assessmentSource: SPEAK_LIVE_AZURE_REQUIRED_MODE,
      providerRequestMs,
    },
  }
}

export async function runPostSessionParallelSpeechAssessment(params: {
  threadId: string
  scenarioGoals: string[]
  userTurns: PostSessionSpeechTurnInput[]
}): Promise<{ turnResults: PostSessionSpeechTurnResult[]; assessTurnsMs: number }> {
  const { assessUserTurnsSpeechBatch } = await import('./speakLiveAssessUserTurnsSpeechBatch')
  const batch = await assessUserTurnsSpeechBatch({
    threadId: params.threadId,
    scenarioGoals: params.scenarioGoals,
    userTurns: params.userTurns,
  })
  return { turnResults: batch.turnResults, assessTurnsMs: batch.batch.azureBatchMs }
}
