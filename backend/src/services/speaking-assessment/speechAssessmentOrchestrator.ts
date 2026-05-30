import { randomUUID } from 'node:crypto'
import type { SpeakingAssessHttpBody } from '../../domain/speaking-assessment/speakingAssessmentHttpSchemas'
import type { RawScores, SpeakingAssessmentViewModel } from '../../domain/speaking-assessment/speakingAssessmentCanonical'
import { ApiError } from '../../shared/errors'
import { getAzureSpeechLocale } from '../speech/pronunciationAssessmentConfig'
import { runPronunciationAssessment } from '../speech/pronunciationAssessmentGateway'
import { analyzeSpeechTiming } from './speechTimingAnalysisService'
import { ReferenceAudioService } from './referenceAudioService'
import { SpeakingCoachingFromAssessmentService } from './speakingCoachingFromAssessmentService'
import { buildSpeakingCoachingLlmInput } from './speakingCoachingLlmInput'
import { computeDerivedScores, emptyDerivedScores } from './speakingDerivedScoresService'
import { extractPhraseTargets } from './phraseTargetExtraction'
import { mapVerdictLabelsFromSignals } from './speakingVerdictLabels'
import {
  mapAzureToSpeakingAssessmentResult,
  mapWordsWithoutCoachingNotes,
  toSpeakingAssessmentViewModel,
} from './speakingAssessmentMapper'
import { createSpeakingAssessmentRepository } from './speakingAssessmentRepository'
import { appendSpeakingProgressFromSpeakingResult } from '../speaking-progress/speakingProgressAppend'
import {
  getDefaultAzureTtsVoiceForReference,
  getSpeakingCoachingModel,
  isSpeakingCacheEnabled,
  isSpeakingCoachingDebugEnabled,
  shouldSaveRawProviderPayload,
} from './speakingAssessmentConfig'
import { logSpeakingAssessmentStep } from './speakingAssessmentLog'

function maxAudioBytes(): number {
  const mbRaw = process.env.AUDIO_UPLOAD_MAX_MB?.trim()
  const mb = mbRaw ? Number(mbRaw) : 12
  const safe = Number.isFinite(mb) && mb > 0 ? Math.min(mb, 25) : 12
  return Math.floor(safe * 1024 * 1024)
}

export async function runSpeakingAssessmentOrchestration(params: {
  userId: string
  body: SpeakingAssessHttpBody
  audio: Buffer
}): Promise<{ view: SpeakingAssessmentViewModel; assessmentId: string }> {
  const tAll = Date.now()
  const assessmentId = randomUUID()
  const { body, audio, userId } = params

  logSpeakingAssessmentStep({
    step: 'upload_received',
    assessmentId,
    extra: { bytes: audio.length, mode: body.mode, scenarioId: body.scenarioId },
  })

  if (audio.length < 32) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Audio clip too short or empty')
  }
  if (audio.length > maxAudioBytes()) {
    throw new ApiError(400, 'VALIDATION_ERROR', `Audio exceeds maximum size (${Math.round(maxAudioBytes() / (1024 * 1024))} MB)`)
  }

  const locale = body.locale?.trim() || getAzureSpeechLocale()
  const transcript = (body.transcript ?? '').trim() || ''
  const expectedText =
    body.mode === 'reference'
      ? (body.expectedText ?? '').trim()
      : (body.expectedText ?? '').trim() || transcript

  const tAzure = Date.now()
  logSpeakingAssessmentStep({ step: 'azure_assessment_start', assessmentId })
  const pa = await runPronunciationAssessment({
    audio,
    mimeType: body.mimeType,
    transcript: body.mode === 'open_response' ? transcript : undefined,
    expectedText: body.mode === 'reference' ? expectedText : undefined,
    locale,
    scenarioHint: body.scenarioId,
    assessmentMode: body.mode,
  })
  logSpeakingAssessmentStep({
    step: 'azure_assessment_end',
    assessmentId,
    durationMs: Date.now() - tAzure,
    extra: { hasAssessment: Boolean(pa.assessment) },
  })

  const provider =
    pa.provider.mode === 'azure' && pa.provider.id === 'azure' ? ('azure_speech' as const) : ('off' as const)

  const tTiming = Date.now()
  logSpeakingAssessmentStep({ step: 'timing_analysis_start', assessmentId })
  const timing = analyzeSpeechTiming({
    words: pa.assessment?.words ?? [],
    userClipDurationMs: body.userClipDurationMs ?? null,
    transcript: transcript || pa.assessment?.recognizedText || '',
  })
  logSpeakingAssessmentStep({
    step: 'timing_analysis_end',
    assessmentId,
    durationMs: Date.now() - tTiming,
  })

  const referenceSvc = new ReferenceAudioService()
  const tRef = Date.now()
  logSpeakingAssessmentStep({ step: 'reference_audio_start', assessmentId })
  const ref = body.includeReferenceAudio
    ? await referenceSvc.resolveReferenceAudio({
        text: expectedText || transcript,
        locale,
        voice: getDefaultAzureTtsVoiceForReference(),
        cacheEnabled: isSpeakingCacheEnabled(),
      })
    : { normalUrl: null, slowUrl: null, chunkedUrl: null, provider: 'skipped', cacheHit: false }
  logSpeakingAssessmentStep({
    step: 'reference_audio_end',
    assessmentId,
    durationMs: Date.now() - tRef,
    extra: { include: body.includeReferenceAudio, cacheHit: ref.cacheHit },
  })

  const rawScores: RawScores = pa.assessment
    ? {
        pronunciation: pa.assessment.pronunciationScore,
        fluency: pa.assessment.fluencyScore,
        completeness: pa.assessment.completenessScore,
        overall: pa.assessment.overallScore,
        prosody: pa.assessment.prosodyScore,
        accuracy: pa.assessment.accuracyScore,
      }
    : {
        pronunciation: 0,
        fluency: 0,
        completeness: 0,
        overall: 0,
        prosody: null,
        accuracy: 0,
      }

  const derivedScores = pa.assessment ? computeDerivedScores(rawScores, timing) : emptyDerivedScores()
  const verdicts = pa.assessment
    ? mapVerdictLabelsFromSignals({ raw: rawScores, derived: derivedScores, timing })
    : { topLabel: 'no assessment data', clarityLabel: 'no assessment data', naturalnessLabel: 'no assessment data' }

  const scenarioDisplay = body.scenarioName?.trim() || body.scenarioId
  const wordsPre = pa.assessment?.words?.length ? mapWordsWithoutCoachingNotes(pa.assessment.words) : []
  const phraseTargetsPre = extractPhraseTargets({
    wordAssessments: wordsPre,
    timing,
    expectedText: expectedText || transcript,
    transcript: transcript || pa.assessment?.recognizedText || '',
  })
  const coachingInput = buildSpeakingCoachingLlmInput({
    level: body.level,
    locale,
    scenarioName: scenarioDisplay,
    promptId: body.promptId,
    expectedText: expectedText || transcript,
    transcript: transcript || pa.assessment?.recognizedText || '',
    raw: rawScores,
    derived: derivedScores,
    verdicts,
    wordAssessmentsPreLlm: wordsPre,
    phraseTargets: phraseTargetsPre,
    timing,
    azureCaveats: pa.caveats,
  })

  const coachingSvc = new SpeakingCoachingFromAssessmentService()
  const coachingResult = await coachingSvc.generateCoaching({
    assessmentId,
    coachingInput,
  })
  const coachingLlm = coachingResult.coaching

  const rawForCanonical = pa.providerRawResult ?? null

  const canonical = mapAzureToSpeakingAssessmentResult({
    assessmentId,
    provider,
    locale,
    scenarioId: body.scenarioId,
    promptId: body.promptId,
    expectedText: expectedText || transcript,
    transcript: transcript || pa.assessment?.recognizedText || '',
    userClipDurationMs: body.userClipDurationMs ?? null,
    audioBlobUrl: null,
    normalized: pa.assessment,
    timing,
    coachingLlm,
    referenceAudio: {
      normalUrl: ref.normalUrl,
      slowUrl: ref.slowUrl,
      chunkedUrl: ref.chunkedUrl,
    },
    rawProviderPayload: rawForCanonical,
    caveats: pa.caveats,
    precomputedDerived: derivedScores,
    precomputedVerdicts: verdicts,
  })

  const repo = createSpeakingAssessmentRepository()
  await repo.save({
    id: assessmentId,
    userId,
    createdAtUtc: canonical.createdAtUtc,
    caveats: pa.caveats,
    canonical,
    rawProviderPayload: shouldSaveRawProviderPayload() ? rawForCanonical ?? undefined : undefined,
    generatedCoachingPayload: coachingLlm,
    ...(isSpeakingCoachingDebugEnabled() && coachingResult.debug ? { coachingDebug: coachingResult.debug } : {}),
  })

  void appendSpeakingProgressFromSpeakingResult({
    userId,
    canonical,
    learnerLevel: body.level,
    scenarioTitle: body.scenarioName ?? null,
  }).catch(() => undefined)

  const view = toSpeakingAssessmentViewModel(canonical, pa.caveats)

  logSpeakingAssessmentStep({
    step: 'orchestration_complete',
    assessmentId,
    durationMs: Date.now() - tAll,
    extra: { model: getSpeakingCoachingModel() },
  })

  return { view, assessmentId }
}

/** Class boundary for DI / tests — delegates to {@link runSpeakingAssessmentOrchestration}. */
export class SpeechAssessmentOrchestrator {
  run(
    params: Parameters<typeof runSpeakingAssessmentOrchestration>[0]
  ): Promise<Awaited<ReturnType<typeof runSpeakingAssessmentOrchestration>>> {
    return runSpeakingAssessmentOrchestration(params)
  }
}
