import type { ConversationMessage, ConversationSummary, ScenarioConfig } from '../../models/contracts'
import { ApiError } from '../../shared/errors'
import {
  assertConversationBinaryBlobStorageConfigured,
  uploadConversationBinaryArtifactRequired,
} from '../storage/blobStorageService'
import type { NormalizedWordAssessment } from '../speech/pronunciationAssessmentContracts'
import {
  assertSpeakLiveSessionEvaluationAiReady,
  isReportExpensiveAuditEnabled,
  isReportLegacyTurnEnrichmentEnabled,
  isReportRecommendationVerifyEnabled,
  isSpeakLiveParallelScenarioReportOptimizedEnabled,
} from '../ai/config/aiProviderConfig'
import { computeDerivedScores } from '../speaking-assessment/speakingDerivedScoresService'
import { generateSpeakLiveReferenceSpeechForReport } from './speakLiveTtsGateway'
import {
  buildSpeakLiveCoachingModelMeta,
  type LiveEvalLlmTurnInput,
  type LiveEvalLlmTurn,
  type LiveEvalLlmResult,
} from './liveSessionEvaluationLlm'
import type { TimingAnalysis } from '../../domain/speaking-assessment/speakingAssessmentCanonical'
import type {
  ImprovementAction,
  LanguageScores,
  LiveSessionEvaluation,
  RecommendedFollowUp,
  SessionEvaluationInsights,
  SpeakLiveParallelOrchestrationDiagnosticsV1,
  TurnEvaluation,
  TurnLanguageEvaluation,
  WrongWordDetection,
} from './liveVoiceEvaluationTypes'
import { buildLiveTurnDeepEvaluation } from './liveTurnDeepEvaluationMapper'
import { normalizeSpeakLiveCefrLevel } from '../../domain/speakLive/speakLiveSupportStrategy'
import {
  buildPhoneCallPerformance,
  buildPhoneCallRecommendedDrillActions,
  PHONE_CALL_WEIGHTS_SUMMARY,
} from '../../domain/speakLive/phoneCallSessionEvaluation'
import {
  buildSmallTalkPerformance,
  buildSmallTalkRecommendedDrillActions,
  buildSmallTalkRewriteOptions,
  SMALL_TALK_WEIGHTS_SUMMARY,
} from '../../domain/speakLive/smallTalkSessionEvaluation'
import {
  buildMeetingNewPeoplePerformance,
  buildMeetingNewPeopleRecommendedDrillActions,
  buildMeetingNewPeopleRewriteOptions,
  MEETING_NEW_PEOPLE_WEIGHTS_SUMMARY,
} from '../../domain/speakLive/meetingNewPeopleSessionEvaluation'
import {
  buildPartySocialPerformance,
  buildPartySocialRecommendedDrillActions,
  buildPartySocialRewriteOptions,
  PARTY_SOCIAL_WEIGHTS_SUMMARY,
} from '../../domain/speakLive/partySocialSessionEvaluation'
import {
  buildExplainingSomethingPerformance,
  buildExplainingSomethingRecommendedDrillActions,
  buildExplainingSomethingRewriteOptions,
  EXPLAINING_SOMETHING_WEIGHTS_SUMMARY,
} from '../../domain/speakLive/explainingSomethingSessionEvaluation'
import {
  buildStorytellingPerformance,
  buildStorytellingRecommendedDrillActions,
  buildStorytellingRewriteOptions,
  STORYTELLING_WEIGHTS_SUMMARY,
} from '../../domain/speakLive/storytellingSessionEvaluation'
import {
  buildOpinionsDiscussionsPerformance,
  buildOpinionsDiscussionsRecommendedDrillActions,
  buildOpinionsDiscussionsRewriteOptions,
  OPINIONS_DISCUSSIONS_WEIGHTS_SUMMARY,
} from '../../domain/speakLive/opinionsDiscussionsSessionEvaluation'
import { evaluateTurn as evaluateTurnPremium, evaluateSession as evaluateSessionPremium, type TurnScoringInput } from '../speaking-assessment/speechScoringEngine'
import {
  SESSION_VOICE_ANALYSIS_UNAVAILABLE_MESSAGE,
  buildAudioFeedbackItems,
  buildFluencyIssuesFromTiming,
  buildPronunciationIssuesFromAzure,
  buildTranscriptFeedbackItems,
  filterImprovementActionsForAudioPresence,
  filterKeyProblemsWhenNoAudio,
  filterRecommendedFollowUpsForSessionAudio,
  filterStrengthsWhenNoAudio,
  sanitizeDutchLikenessForTranscriptOnly,
  validateAndFilterFeedbackItems,
} from './liveSessionEvaluationTrust'
import { applyMergedSpeakingReportToLiveSessionEvaluation } from './speakLiveMergedSpeakingReportComposer'
import {
  buildSpeakLiveEvaluationProgressV1,
  type SpeakLiveEvaluationProgressPartialV1,
  type SpeakLiveEvaluationProgressReporter,
  type SpeakLiveEvaluationPipelinePhase,
} from './speakLiveAsyncEvaluationProgress'
import {
  applyRecommendationVerifyPatchesToCoach,
  isSpeakLiveRecommendationVerifyEnabled,
  runSpeakLiveRecommendationVerifyLlm,
  maybeStripCrossPhraseWordPairs,
  type SpeakLiveVerifyTurnInput,
} from './liveSessionRecommendationVerifyLlm'
import {
  applyReportAuditPatchToTurn,
  isSpeakLiveReportAuditLlmEnabled,
  runSpeakLiveReportAuditLlm,
  type ReportAuditTurnInput,
} from './liveSessionReportAuditLlm'
import {
  applyDeterministicLanguageRepair,
  applyWrongWordLanguagePenalty,
  buildTurnScoredDimensions,
  calibrateDisplayScore,
  detectWrongWordsFromReference,
  enrichTurnReportFields,
  inferDeterministicLanguageRepair,
  mergeWrongWordDetections,
  applySingleWrongWordSwapLine,
  filterWrongWordDetectionsGroundedInLearner,
  wrongWordObservedAppearsInLearnerLine,
  sessionCoachHeadline,
  verdictForDisplayScore,
} from './liveSessionReportEnrichment'
import { parseSpeakLiveState } from '../../domain/speakLive/speakLiveFsm'
import { buildLanguageCoachEvaluationRecord } from '../language-coach/languageCoachSessionEvaluation'
import { directionsGoalIsStretchTier } from '../../domain/speakLive/directionsEvaluationContract'
import {
  inferDirectionsGoalLabelsFromUserText,
  reconcileDirectionsGettingSomewhereLiveRecap,
} from '../../domain/speakLive/directionsGettingSomewhereLiveRecap'
import { reconcileOrderingFoodLiveRecap } from '../../domain/speakLive/orderingFoodLiveRecap'
import {
  inferSupermarketShopGoalLabelsFromUserText,
  reconcileSupermarketShopLiveRecap,
} from '../../domain/speakLive/supermarketShopLiveRecap'
import { reconcileBookingReservationsLiveRecap } from '../../domain/speakLive/bookingReservationsLiveRecap'
import { bookingGoalIsStretchTier } from '../../domain/speakLive/bookingReservationsEvaluationContract'
import { reconcileStoreServiceIssueLiveRecap } from '../../domain/speakLive/storeServiceIssueLiveRecap'
import { storeServiceGoalIsStretchTier } from '../../domain/speakLive/storeServiceIssueEvaluationContract'
import { reconcileWorkColleagueInteractionLiveRecap } from '../../domain/speakLive/workColleagueInteractionLiveRecap'
import { workColleagueGoalIsStretchTier } from '../../domain/speakLive/workColleagueInteractionEvaluationContract'
import { reconcileHousingLandlordLiveRecap } from '../../domain/speakLive/housingLandlordLiveRecap'
import { inferPhoneCallGoalLabelsFromUserText, reconcilePhoneCallLiveRecap } from '../../domain/speakLive/phoneCallLiveRecap'
import { reconcileSmallTalkLiveRecap } from '../../domain/speakLive/smallTalkLiveRecap'
import { reconcileMeetingNewPeopleLiveRecap } from '../../domain/speakLive/meetingNewPeopleLiveRecap'
import { reconcilePartySocialLiveRecap } from '../../domain/speakLive/partySocialLiveRecap'
import { reconcileExplainingSomethingLiveRecap } from '../../domain/speakLive/explainingSomethingLiveRecap'
import { reconcileStorytellingLiveRecap } from '../../domain/speakLive/storytellingLiveRecap'
import { reconcileOpinionsDiscussionsLiveRecap } from '../../domain/speakLive/opinionsDiscussionsLiveRecap'
import { housingLandlordGoalIsStretchTier } from '../../domain/speakLive/housingLandlordEvaluationContract'
import {
  inferDoctorPharmacyGoalLabelsFromUserText,
  reconcileDoctorPharmacyLiveRecap,
} from '../../domain/speakLive/doctorPharmacyLiveRecap'
import { doctorPharmacyGoalIsStretchTier } from '../../domain/speakLive/doctorPharmacyEvaluationContract'
import { PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID } from '../../domain/speakLive/publicTransportScenario'
import {
  inferPublicTransportGoalLabelsFromUserText,
  structuredSlotSupportsPublicTransportCompletedGoal,
} from '../../domain/speakLive/publicTransportLiveRecap'
import {
  publicTransportGoalIsStretchTier,
  publicTransportStructuredSlotProjection,
} from '../../domain/speakLive/publicTransportEvaluationContract'
import {
  normalizeGoalPhraseForCoachSummary,
  splitCanonicalScenarioGoal,
  stripGoalIdBracketsFromText,
} from '../../domain/speakLive/speakLiveGoalLabelDisplay'
import { buildScenarioVoiceReportOptimized } from './speakLiveScenarioVoiceReportOptimized'
import {
  mergeDeepEnrichmentIntoEvaluation,
  scheduleDeepEnrichmentBackground,
} from './speakLiveDeepReportEnrichment'
import { evaluateSpeakLiveTranscriptsWithOpenAI } from './speakLiveTranscriptEvaluationService'
import { buildNormalizedSpeakLiveSession, buildPostSessionUserTurnsForSpeechScoring } from './speakLiveNormalizedConversation'
import { runPostSessionParallelSpeechAssessment } from './speakLivePostSessionSpeechAssessment'
import { clamp100, computeCombinedScores } from './speakLivePostSessionScoringUtils'
import type { ScenarioDialogueStructuredOutput } from './speakLiveScenarioDialogueStructured.schema'
import type { AssessUserTurnsSpeechBatchResult } from './speakLiveAssessUserTurnsSpeechBatch'
import { mergeScenarioReportEvaluation } from './speakLiveMergeScenarioReportEvaluation'

/** Counters for reference TTS in scenario reports (one row per synthesis attempt). */
export type SpeakLiveReferenceTtsDiagCounters = {
  referenceTtsRequestedCount: number
  referenceTtsCacheHits: number
  referenceTtsCacheMisses: number
  referenceTtsGeneratedCount: number
}

export function accumulateReferenceTtsDiagFromAttempt(
  acc: SpeakLiveReferenceTtsDiagCounters,
  result: { ok: true; cached: boolean } | { ok: false },
): void {
  acc.referenceTtsRequestedCount += 1
  if (!result.ok) {
    acc.referenceTtsCacheMisses += 1
    return
  }
  if (result.cached) acc.referenceTtsCacheHits += 1
  else {
    acc.referenceTtsCacheMisses += 1
    acc.referenceTtsGeneratedCount += 1
  }
}

function parseThreadSummary(summaryText: string | null | undefined): ConversationSummary | null {
  if (!summaryText?.trim()) return null
  try {
    return JSON.parse(summaryText) as ConversationSummary
  } catch {
    return null
  }
}

function mapTurnLanguageEvaluation(params: {
  raw: LiveEvalLlmTurn['turnLanguageEvaluation']
  languageScores: LanguageScores
  transcript: string
  learnerLevel: string
}): TurnLanguageEvaluation {
  const { raw, languageScores, transcript, learnerLevel } = params
  const tx = transcript.trim()
  if (raw) {
    const whyBetter = raw.whyItIsBetter.trim()
    const whyNatural = raw.whyThisIsMoreNatural?.trim() || whyBetter
    const nextPattern =
      raw.nextPatternToPractice?.trim() ||
      (() => {
        const hit =
          raw.grammarIssues.find((s) => s.trim())?.trim() ||
          raw.sentenceStructureIssues.find((s) => s.trim())?.trim() ||
          raw.wordOrderNotes?.find((s) => s.trim())?.trim()
        return hit ? `Tighten: ${hit.slice(0, 200)}${hit.length > 200 ? '…' : ''}` : undefined
      })()
    return {
      grammarScore: clamp100(raw.grammarScore),
      sentenceConstructionScore: clamp100(raw.sentenceConstructionScore),
      naturalnessScore: clamp100(raw.naturalnessScore),
      levelFitScore: clamp100(raw.levelFitScore),
      whatWorked: raw.whatWorked.map((s) => s.trim()).filter(Boolean).slice(0, 8),
      grammarIssues: raw.grammarIssues.map((s) => s.trim()).filter(Boolean).slice(0, 8),
      sentenceStructureIssues: raw.sentenceStructureIssues.map((s) => s.trim()).filter(Boolean).slice(0, 8),
      wordOrderNotes: raw.wordOrderNotes?.map((s) => s.trim()).filter(Boolean).slice(0, 6),
      questionFormNotes: raw.questionFormNotes?.map((s) => s.trim()).filter(Boolean).slice(0, 4),
      verbTenseNotes: raw.verbTenseNotes?.map((s) => s.trim()).filter(Boolean).slice(0, 4),
      agreementNotes: raw.agreementNotes?.map((s) => s.trim()).filter(Boolean).slice(0, 4),
      improvedVersion: raw.improvedVersion.trim(),
      whyItIsBetter: whyBetter,
      whyThisIsMoreNatural: whyNatural,
      nextPatternToPractice: nextPattern,
      learnerFacingGrammarLine: raw.learnerFacingGrammarLine?.trim() || undefined,
      levelBasedComment: raw.levelBasedComment.trim(),
      nextStepBeyondLevel: raw.nextStepBeyondLevel?.trim() || undefined,
    }
  }
  return {
    grammarScore: clamp100(languageScores.grammaticalStability),
    sentenceConstructionScore: clamp100((languageScores.grammaticalStability + languageScores.contextualFit) / 2),
    naturalnessScore: clamp100(languageScores.naturalness),
    levelFitScore: clamp100(languageScores.registerFit),
    whatWorked: tx ? ['You produced Dutch in this turn.'] : [],
    grammarIssues: [],
    sentenceStructureIssues: [],
    improvedVersion: tx || '…',
    whyItIsBetter: tx ? 'Retry the scenario for a detailed comparison with a more natural Dutch version.' : '',
    whyThisIsMoreNatural: undefined,
    nextPatternToPractice: undefined,
    learnerFacingGrammarLine: undefined,
    levelBasedComment: `Scored against ${learnerLevel} expectations.`,
    nextStepBeyondLevel: undefined,
  }
}

function deriveSessionInsightsFromTurns(turns: TurnEvaluation[]): Pick<
  SessionEvaluationInsights,
  'strongestAreas' | 'weakestAreas'
> {
  const n = Math.max(1, turns.length)
  const avg = (pick: (t: TurnEvaluation) => number) =>
    turns.reduce((s, t) => s + pick(t), 0) / n
  const avgGrammarSentence = avg((t) => {
    const le = t.languageEvaluation
    if (le) return (le.grammarScore + le.sentenceConstructionScore) / 2
    return (t.languageScores.grammaticalStability + t.languageScores.contextualFit) / 2
  })
  const avgNat = avg((t) => t.languageScores.naturalness)
  const avgScene = avg((t) => t.scenarioGoalFit.alignmentScore)
  const audioTurns = turns.filter((t) => t.signalSources.audioMetrics === 'azure_audio')
  const dims: { label: string; v: number }[] = []
  if (audioTurns.length > 0) {
    const avgPron = audioTurns.reduce((s, t) => s + t.audioScores.pronunciation, 0) / audioTurns.length
    const avgFlu = audioTurns.reduce((s, t) => s + t.audioScores.fluency, 0) / audioTurns.length
    dims.push(
      { label: 'Pronunciation and word-level clarity (audio)', v: avgPron },
      { label: 'Fluency and rhythm from audio', v: avgFlu }
    )
  }
  dims.push(
    { label: 'Grammar and sentence construction', v: avgGrammarSentence },
    { label: 'Naturalness in the scene', v: avgNat },
    { label: 'Scenario goal alignment', v: avgScene }
  )
  const sorted = [...dims].sort((a, b) => b.v - a.v)
  const strongestAreas = sorted
    .filter((d) => d.v >= 58)
    .slice(0, 3)
    .map((d) => d.label)
  const weakest = [...dims].sort((a, b) => a.v - b.v)
  const weakestAreas = weakest
    .filter((d) => d.v < 72)
    .slice(0, 3)
    .map((d) => d.label)
  return {
    strongestAreas: strongestAreas.length ? strongestAreas : ['Showing up and producing Dutch in the scenario'],
    weakestAreas: weakestAreas.length ? weakestAreas : ['Keep building consistency across turns'],
  }
}

function mergeImprovementActions(params: {
  llm: LiveEvalLlmTurn['improvementActions']
  transcript: string
  referenceSentence: string
  weakWords: string[]
  scenarioTitle: string
  turnIndex: number
}): ImprovementAction[] {
  const seen = new Set<string>()
  const out: ImprovementAction[] = []
  const push = (a: ImprovementAction) => {
    const k = `${a.type}:${a.title}`
    if (seen.has(k)) return
    seen.add(k)
    out.push(a)
  }
  for (const a of params.llm ?? []) {
    push({
      type: a.type,
      title: a.title.trim(),
      detail: a.detail.trim(),
      targetPhrase: a.targetPhrase?.trim() || undefined,
      targetWord: a.targetWord?.trim() || undefined,
    })
  }
  const tw = params.weakWords[0]
  if (tw && !out.some((x) => x.type === 'save_pronunciation_word' && x.targetWord === tw)) {
    push({
      type: 'save_pronunciation_word',
      title: `Drill pronunciation: “${tw}”`,
      detail: `Azure word score flagged “${tw}” on turn ${params.turnIndex + 1} — isolate it in slow reps, then replace it in the full line.`,
      targetWord: tw,
      targetPhrase: params.transcript.trim() || undefined,
    })
  }
  const phrase = (params.referenceSentence.trim() || params.transcript.trim()).slice(0, 120)
  if (phrase && !out.some((x) => x.type === 'save_natural_phrasing')) {
    push({
      type: 'save_natural_phrasing',
      title: `Natural phrasing: “${phrase}${phrase.length >= 120 ? '…' : ''}”`,
      detail: `Compare your line to the reference Dutch for turn ${params.turnIndex + 1} in “${params.scenarioTitle}”.`,
      targetPhrase: params.referenceSentence.trim() || params.transcript.trim(),
    })
  }
  return out.slice(0, 10)
}

async function maybePersistReferenceAudioBlob(params: {
  threadId: string
  userMessageId: string
  audioBase64: string
  mimeType: string
}): Promise<string | null> {
  let buf: Buffer
  try {
    buf = Buffer.from(params.audioBase64, 'base64')
  } catch {
    return null
  }
  if (buf.length < 64) return null
  const ext = params.mimeType.includes('mpeg') ? 'mp3' : 'audio'
  const fileName = `evaluation-reference/${params.userMessageId}.${ext}`
  try {
    return await uploadConversationBinaryArtifactRequired(params.threadId, fileName, buf, params.mimeType)
  } catch (err) {
    const profile = (process.env.APP_PROFILE ?? 'LocalMock').trim()
    const msg = err instanceof Error ? err.message : String(err)
    const azuriteVersionMismatch = /azurite|api version|x-ms-version|not supported by azurite/i.test(msg)
    if (profile !== 'CloudDev' && azuriteVersionMismatch) {
      console.warn(`[eval] reference audio blob upload skipped in local profile: ${msg}`)
      return null
    }
    throw err
  }
}

export async function buildLiveSessionEvaluationRecord(input: {
  threadId: string
  scenario: ScenarioConfig
  learnerLevel: string
  messages: ConversationMessage[]
  summaryText: string | null | undefined
  /** Used with ordering_food to merge FSM goal indexes + transcript hints into recap goals. */
  speakLiveStateJson?: string | null
  /** Optional — persists progressive pipeline phases for async / polled UX. */
  evaluationProgressReporter?: SpeakLiveEvaluationProgressReporter
}): Promise<LiveSessionEvaluation> {
  const buildStartedAt = Date.now()
  assertConversationBinaryBlobStorageConfigured()
  assertSpeakLiveSessionEvaluationAiReady()
  let parallelOrchestrationV1: SpeakLiveParallelOrchestrationDiagnosticsV1 | undefined
  let optimizedScenarioReportMerge:
    | {
        structuredDialogue?: ScenarioDialogueStructuredOutput
        speechBatch: AssessUserTurnsSpeechBatchResult
      }
    | undefined
  let recommendationVerifyMs = 0
  let reportAuditMs = 0
  let legacyLlmCallsCount = 0
  console.log('[EvalTiming] orchestrator:start', {
    threadId: input.threadId,
    startedAt: new Date(buildStartedAt).toISOString(),
    messageCount: input.messages.length,
  })
  const reportProgress = async (
    phase: SpeakLiveEvaluationPipelinePhase,
    partial?: SpeakLiveEvaluationProgressPartialV1,
  ) => {
    const rep = input.evaluationProgressReporter
    if (!rep) return
    try {
      await rep(buildSpeakLiveEvaluationProgressV1(phase, partial))
    } catch (e) {
      console.warn('[EvalProgress] evaluationProgressReporter failed', { threadId: input.threadId, phase, e })
    }
  }
  let recap = parseThreadSummary(input.summaryText)
  const slugNormEval = input.scenario.slug.trim().toLowerCase().replace(/-/g, '_')
  const speakLivePersistedEarly = parseSpeakLiveState(input.speakLiveStateJson ?? null)
  if (slugNormEval === 'language_coach') {
    await reportProgress('composing_report', { transcriptEvalStage: 'normalized' })
    return buildLanguageCoachEvaluationRecord(input)
  }
  if (
    slugNormEval === 'ordering_food' ||
    slugNormEval === 'supermarket_shop' ||
    slugNormEval === 'booking_reservations' ||
    slugNormEval === 'store_service_issue' ||
    slugNormEval === 'work_colleague_interaction' ||
    slugNormEval === 'housing_landlord' ||
    slugNormEval === 'doctor_pharmacy' ||
    slugNormEval === 'directions_getting_somewhere' ||
    slugNormEval === 'phone_call' ||
    slugNormEval === 'small_talk' ||
    slugNormEval === 'meeting_new_people' ||
    slugNormEval === 'party_social' ||
    slugNormEval === 'explaining_something' ||
    slugNormEval === 'storytelling' ||
    slugNormEval === 'opinions_discussions'
  ) {
    const base: ConversationSummary =
      recap ??
      ({
        threadId: input.threadId,
        whatWentWell: [],
        whatToImprove: [],
        correctedPhrases: [],
        suggestedNextAction: '—',
        saveWordCandidates: [],
      } satisfies ConversationSummary)
    const userMessageTexts = input.messages
      .filter((m) => m.sender === 'user')
      .map((m) => m.content.trim())
      .filter(Boolean)
    const slState = speakLivePersistedEarly
    const merged =
      slugNormEval === 'ordering_food'
        ? reconcileOrderingFoodLiveRecap({
            summary: { ...base, threadId: input.threadId },
            scenarioSlug: input.scenario.slug,
            scenarioGoals: input.scenario.goals,
            slState,
            userMessageTexts,
          })
        : slugNormEval === 'supermarket_shop'
          ? reconcileSupermarketShopLiveRecap({
              summary: { ...base, threadId: input.threadId },
              scenarioSlug: input.scenario.slug,
              scenarioGoals: input.scenario.goals,
              slState,
              userMessageTexts,
            })
          : slugNormEval === 'booking_reservations'
            ? reconcileBookingReservationsLiveRecap({
                summary: { ...base, threadId: input.threadId },
                scenarioSlug: input.scenario.slug,
                scenarioGoals: input.scenario.goals,
                slState,
                userMessageTexts,
              })
            : slugNormEval === 'store_service_issue'
              ? reconcileStoreServiceIssueLiveRecap({
                  summary: { ...base, threadId: input.threadId },
                  scenarioSlug: input.scenario.slug,
                  scenarioGoals: input.scenario.goals,
                  slState,
                  userMessageTexts,
                })
              : slugNormEval === 'work_colleague_interaction'
                ? reconcileWorkColleagueInteractionLiveRecap({
                    summary: { ...base, threadId: input.threadId },
                    scenarioSlug: input.scenario.slug,
                    scenarioGoals: input.scenario.goals,
                    slState,
                    userMessageTexts,
                  })
                : slugNormEval === 'housing_landlord'
                  ? reconcileHousingLandlordLiveRecap({
                      summary: { ...base, threadId: input.threadId },
                      scenarioSlug: input.scenario.slug,
                      scenarioGoals: input.scenario.goals,
                      slState,
                      userMessageTexts,
                    })
                : slugNormEval === 'doctor_pharmacy'
                  ? reconcileDoctorPharmacyLiveRecap({
                      summary: { ...base, threadId: input.threadId },
                      scenarioSlug: input.scenario.slug,
                      scenarioGoals: input.scenario.goals,
                      slState,
                      userMessageTexts,
                    })
                  : slugNormEval === 'phone_call'
                    ? reconcilePhoneCallLiveRecap({
                        summary: { ...base, threadId: input.threadId },
                        scenarioSlug: input.scenario.slug,
                        scenarioGoals: input.scenario.goals,
                        slState,
                        userMessageTexts,
                      })
                    : slugNormEval === 'small_talk'
                      ? reconcileSmallTalkLiveRecap({
                          summary: { ...base, threadId: input.threadId },
                          scenarioSlug: input.scenario.slug,
                          scenarioGoals: input.scenario.goals,
                          slState,
                          userMessageTexts,
                        })
                      : slugNormEval === 'party_social'
                      ? reconcilePartySocialLiveRecap({
                          summary: { ...base, threadId: input.threadId },
                          scenarioSlug: input.scenario.slug,
                          scenarioGoals: input.scenario.goals,
                          slState,
                          userMessageTexts,
                        })
                      : slugNormEval === 'explaining_something'
                        ? reconcileExplainingSomethingLiveRecap({
                            summary: { ...base, threadId: input.threadId },
                            scenarioSlug: input.scenario.slug,
                            scenarioGoals: input.scenario.goals,
                            slState,
                            userMessageTexts,
                          })
                        : slugNormEval === 'storytelling'
                          ? reconcileStorytellingLiveRecap({
                              summary: { ...base, threadId: input.threadId },
                              scenarioSlug: input.scenario.slug,
                              scenarioGoals: input.scenario.goals,
                              slState,
                              userMessageTexts,
                            })
                          : slugNormEval === 'opinions_discussions'
                            ? reconcileOpinionsDiscussionsLiveRecap({
                                summary: { ...base, threadId: input.threadId },
                                scenarioSlug: input.scenario.slug,
                                scenarioGoals: input.scenario.goals,
                                slState,
                                userMessageTexts,
                              })
                            : slugNormEval === 'meeting_new_people'
                              ? reconcileMeetingNewPeopleLiveRecap({
                                  summary: { ...base, threadId: input.threadId },
                                  scenarioSlug: input.scenario.slug,
                                  scenarioGoals: input.scenario.goals,
                                  slState,
                                  userMessageTexts,
                                })
                              : reconcileDirectionsGettingSomewhereLiveRecap({
                                  summary: { ...base, threadId: input.threadId },
                                  scenarioSlug: input.scenario.slug,
                                  scenarioGoals: input.scenario.goals,
                                  slState,
                                  userMessageTexts,
                                })
    recap = { ...base, goalsCompleted: merged.goalsCompleted, goalsMissed: merged.goalsMissed }
  }
  const msgs = input.messages
  const normalizedConversation = buildNormalizedSpeakLiveSession({
    threadId: input.threadId,
    scenario: input.scenario,
    learnerLevel: input.learnerLevel,
    messages: msgs,
  })
  if (process.env.SPEAK_LIVE_EVAL_PIPELINE_DEBUG === '1') {
    console.log('[Orchestrator] normalizedConversation', {
      threadId: normalizedConversation.session.threadId,
      learnerTurns: normalizedConversation.userTurns.length,
    })
  }
  const userTurns = buildPostSessionUserTurnsForSpeechScoring(msgs)

  await reportProgress(
    isSpeakLiveParallelScenarioReportOptimizedEnabled() ? 'evaluating_dialogue' : 'evaluating_transcript',
    {
      learnerTurnCount: userTurns.length,
      normalizedTurnCount: normalizedConversation.userTurns.length,
      transcriptEvalStage: 'normalized',
    },
  )

  const t0 = msgs[0]?.createdAt ? Date.parse(msgs[0].createdAt) : Date.now()
  const t1 = msgs[msgs.length - 1]?.createdAt ? Date.parse(msgs[msgs.length - 1].createdAt) : Date.now()
  const sessionDurationSeconds = Math.max(0, Math.round((t1 - t0) / 1000))

  const goalTotal = Math.max(1, input.scenario.goals.length)
  const done = recap?.goalsCompleted?.length ?? 0
  const scenarioCompletionScore = clamp100((done / goalTotal) * 100)

  const weakWordsByTurnId = new Map<string, string[]>()
  const audioContextByTurn = new Map<string, { words: NormalizedWordAssessment[]; timing: TimingAnalysis }>()
  const turnTimingRows: Array<{
    turnId: string
    turnIndex: number
    totalMs: number
    blobDownloadMs: number
    audioAssessmentMs: number
    timingAnalysisMs: number
    blobBytes: number
    hadAudio: boolean
    assessmentOk: boolean
    skippedReason?: import('./liveVoiceEvaluationTypes').AzureSpeechTurnSkippedReason
  }> = []

  console.log('[EvalTiming] orchestrator:assess_turns:start', {
    threadId: input.threadId,
    turnCount: userTurns.length,
    parallel: isSpeakLiveParallelScenarioReportOptimizedEnabled(),
  })
  await reportProgress('evaluating_speech', {
    learnerTurnCount: userTurns.length,
    sessionDurationSeconds,
  })

  let assessTurnsMs = 0
  let llmMs = 0
  let llmResult: LiveEvalLlmResult
  const llmTurnFacts: LiveEvalLlmTurnInput[] = []
  const turnEvals: TurnEvaluation[] = []

  if (isSpeakLiveParallelScenarioReportOptimizedEnabled()) {
    const opt = await buildScenarioVoiceReportOptimized({
      threadId: input.threadId,
      scenarioTitle: input.scenario.title,
      scenarioSlug: input.scenario.slug,
      scenarioGoals: input.scenario.goals,
      learnerLevel: input.learnerLevel,
      recapGoalsCompleted: recap?.goalsCompleted ?? [],
      recapGoalsMissed: recap?.goalsMissed ?? [],
      recapWhatWentWell: recap?.whatWentWell ?? [],
      recapWhatToImprove: recap?.whatToImprove ?? [],
      userTurns,
      messages: msgs,
      sessionDurationSeconds,
    })
    assessTurnsMs = opt.assessTurnsMs
    llmMs = opt.llmMs
    llmResult = opt.llmResult
    parallelOrchestrationV1 = opt.parallelOrchestrationV1
    optimizedScenarioReportMerge = {
      structuredDialogue: opt.structuredDialogue,
      speechBatch: opt.speechBatch,
    }
    for (const r of opt.turnResults) {
      llmTurnFacts.push(r.llmFact)
      turnEvals.push(r.turnEval)
      turnTimingRows.push(r.turnTiming)
      weakWordsByTurnId.set(r.llmFact.turnId, r.weakWordList)
      if (r.audioCtx) {
        audioContextByTurn.set(r.llmFact.turnId, r.audioCtx)
      }
    }
    console.log('[EvalTiming] orchestrator:parallel_lane:end', {
      threadId: input.threadId,
      parallelWaitMs: opt.parallelOrchestrationV1.parallelWaitMs,
      assessTurnsMs,
      structuredLlmMs: opt.parallelOrchestrationV1.structuredLlmMs,
    })
  } else {
    const { turnResults, assessTurnsMs: azureMs } = await runPostSessionParallelSpeechAssessment({
      threadId: input.threadId,
      scenarioGoals: input.scenario.goals,
      userTurns,
    })
    assessTurnsMs = azureMs
    for (const r of turnResults) {
      llmTurnFacts.push(r.llmFact)
      turnEvals.push(r.turnEval)
      turnTimingRows.push(r.turnTiming)
      weakWordsByTurnId.set(r.llmFact.turnId, r.weakWordList)
      if (r.audioCtx) {
        audioContextByTurn.set(r.llmFact.turnId, r.audioCtx)
      }
    }

    const llmStartedAt = Date.now()
    await reportProgress('evaluating_transcript', {
      transcriptEvalStage: 'openai',
      learnerTurnCount: llmTurnFacts.length,
      sessionDurationSeconds,
    })
    llmResult = await evaluateSpeakLiveTranscriptsWithOpenAI({
      scenarioTitle: input.scenario.title,
      scenarioSlug: input.scenario.slug,
      scenarioGoals: input.scenario.goals,
      learnerLevel: input.learnerLevel,
      recapGoalsCompleted: recap?.goalsCompleted ?? [],
      recapGoalsMissed: recap?.goalsMissed ?? [],
      recapWhatWentWell: recap?.whatWentWell ?? [],
      recapWhatToImprove: recap?.whatToImprove ?? [],
      turns: llmTurnFacts,
    })
    llmMs = Date.now() - llmStartedAt
    console.log('[EvalTiming] orchestrator:llm:end', {
      threadId: input.threadId,
      elapsedMs: llmMs,
      source: llmResult.source,
    })
  }

  console.log('[EvalTiming] orchestrator:assess_turns:end', {
    threadId: input.threadId,
    elapsedMs: assessTurnsMs,
    turnCount: turnEvals.length,
  })

  await reportProgress('evaluating_speech', {
    learnerTurnCount: userTurns.length,
    assessTurnsMs,
    sessionDurationSeconds,
  })

  await reportProgress('evaluating_transcript', {
    transcriptEvalStage: 'openai',
    learnerTurnCount: llmTurnFacts.length,
    sessionDurationSeconds,
    llmMs,
  })

  const sessionHasAnyAudio = llmTurnFacts.some((t) => t.hasLearnerAudio)
  if (!sessionHasAnyAudio) {
    throw new Error(
      'Evaluation not available: no voice recording was captured during this session. ' +
      'Make sure your microphone is working and try the scenario again.'
    )
  }

  if (llmResult.source === 'deterministic') {
    console.warn('[Orchestrator] LLM fell back to deterministic evaluation:', llmResult.reason)
  }

  const coachingLlmSucceeded = llmResult.source === 'llm'
  const allowScenarioSpecificRepairs = !coachingLlmSucceeded

  const llm = llmResult.data
  const insightPreview = [
    llm.overallCoachSummary?.trim().slice(0, 220),
    ...(llm.whatToTryNext ?? [])
      .slice(0, 2)
      .map((s) => String(s).trim().slice(0, 160))
      .filter(Boolean),
  ].filter(Boolean) as string[]
  await reportProgress('composing_report', {
    llmSource: llmResult.source === 'llm' ? 'llm' : 'deterministic',
    llmMs,
    ...(insightPreview.length ? { insightPreview } : {}),
  })
  const byId = new Map(llm.turns.map((t) => [t.turnId, t]))
  let recommendationVerifyApplied = false
  if (coachingLlmSucceeded && isSpeakLiveRecommendationVerifyEnabled()) {
    const factByTurnId = new Map(llmTurnFacts.map((t) => [t.turnId, t]))
    const verifyTurns: SpeakLiveVerifyTurnInput[] = []
    for (const row of turnEvals) {
      const coach = byId.get(row.turnId)
      if (!coach) continue
      const ref = coach.referenceSentence.trim()
      const contextualRepair = inferDeterministicLanguageRepair(
        row,
        input.scenario.title,
        input.scenario.slug,
        allowScenarioSpecificRepairs,
      )
      const proposed = mergeWrongWordDetections(
        coach.wrongWordDetections as import('./liveVoiceEvaluationTypes').WrongWordDetection[] | undefined,
        [
          ...(contextualRepair ? [] : detectWrongWordsFromReference(row.learnerTranscript, ref, row.transcriptConfidence)),
          ...(contextualRepair?.wrongDetections ?? []),
        ],
      )
      const fact = factByTurnId.get(row.turnId)
      verifyTurns.push({
        turnId: row.turnId,
        turnIndex: row.turnIndex,
        learnerTranscript: row.learnerTranscript,
        assistantReply: (fact?.assistantReply ?? '').trim().slice(0, 2000),
        referenceSentence: ref,
        referenceKind: coach.referenceKind,
        referenceSentenceReason: coach.referenceSentenceReason.trim(),
        improvedVersion: coach.turnLanguageEvaluation?.improvedVersion?.trim() ?? null,
        keyProblems: coach.keyProblems.map((s) => s.trim()).filter(Boolean).slice(0, 12),
        proposedWrongWordDetections: proposed,
      })
    }
    if (verifyTurns.length > 0) {
      const verifyStartedAt = Date.now()
      console.log('[EvalTiming] orchestrator:recommendation_verify:start', {
        threadId: input.threadId,
        turnCount: verifyTurns.length,
      })
      const patches = await runSpeakLiveRecommendationVerifyLlm({
        scenarioTitle: input.scenario.title,
        learnerLevel: input.learnerLevel,
        turns: verifyTurns,
      })
      legacyLlmCallsCount += 1
      recommendationVerifyMs = Date.now() - verifyStartedAt
      console.log('[EvalTiming] orchestrator:recommendation_verify:end', {
        threadId: input.threadId,
        elapsedMs: recommendationVerifyMs,
        applied: Boolean(patches && patches.size === verifyTurns.length),
      })
      if (patches && patches.size === verifyTurns.length) {
        let allIdsMatch = true
        for (const vt of verifyTurns) {
          if (!patches.has(vt.turnId)) {
            allIdsMatch = false
            break
          }
        }
        if (allIdsMatch) {
          for (const vt of verifyTurns) {
            const coach = byId.get(vt.turnId)
            const patch = patches.get(vt.turnId)
            if (coach && patch) {
              byId.set(vt.turnId, applyRecommendationVerifyPatchesToCoach(vt.learnerTranscript, coach, patch))
            }
          }
          recommendationVerifyApplied = true
        }
      }
    }
  }
  // Phase 1: Merge LLM coach data into turn evaluations (synchronous, fast)
  const coachMergeStartedAt = Date.now()
  console.log('[EvalTiming] orchestrator:coach_merge:start', {
    threadId: input.threadId,
    turnCount: turnEvals.length,
  })
  for (const row of turnEvals) {
    const coach = byId.get(row.turnId)
    const hasAudio = row.signalSources.audioMetrics === 'azure_audio'

    if (coach) {
      let languageScores: LanguageScores = {
        naturalness: clamp100(coach.languageScores.naturalness),
        contextualFit: clamp100(coach.languageScores.contextualFit),
        registerFit: clamp100(coach.languageScores.registerFit),
        grammaticalStability: clamp100(coach.languageScores.grammaticalStability),
      }

      row.referenceSentence = coach.referenceSentence.trim()
      const contextualRepair = inferDeterministicLanguageRepair(
        row,
        input.scenario.title,
        input.scenario.slug,
        allowScenarioSpecificRepairs,
      )
      const wrongMergedRaw = maybeStripCrossPhraseWordPairs(
        row.learnerTranscript,
        mergeWrongWordDetections(
          coach.wrongWordDetections as import('./liveVoiceEvaluationTypes').WrongWordDetection[] | undefined,
          [
            ...(contextualRepair || recommendationVerifyApplied
              ? []
              : detectWrongWordsFromReference(row.learnerTranscript, row.referenceSentence, row.transcriptConfidence)),
            ...(contextualRepair?.wrongDetections ?? []),
          ],
        ),
      )
      const wrongMergedCoach = filterWrongWordDetectionsGroundedInLearner(row.learnerTranscript, wrongMergedRaw)
      languageScores = applyWrongWordLanguagePenalty(languageScores, wrongMergedCoach)

      row.scenarioGoalFit = {
        summary: coach.scenarioGoalFit.summary.trim(),
        alignmentScore: clamp100(coach.scenarioGoalFit.alignmentScore),
        relevantGoals: coach.scenarioGoalFit.relevantGoals.map((g) => g.trim()).filter(Boolean),
      }
      row.languageScores = languageScores
      row.combinedScores = computeCombinedScores(row.audioScores, languageScores, hasAudio)
      row.keyStrengths = coach.keyStrengths.map((s) => s.trim()).filter(Boolean)
      row.keyProblems = [...new Set([...row.keyProblems, ...coach.keyProblems.map((s) => s.trim()).filter(Boolean)])].slice(0, 12)
      row.referenceSentenceReason = coach.referenceSentenceReason.trim()
      row.referenceKind = coach.referenceKind
      row.chunkingRhythmSuggestion = coach.chunkingRhythmSuggestion.trim()
      row.focusWords = coach.focusWords.map((w) => w.trim()).filter(Boolean).slice(0, 14)
      row.dutchLikenessNarrative = (coach.dutchLikenessNarrative ?? '').trim()

      row.languageEvaluation = mapTurnLanguageEvaluation({
        raw: coach.turnLanguageEvaluation,
        languageScores,
        transcript: row.learnerTranscript,
        learnerLevel: input.learnerLevel,
      })
      if (contextualRepair) {
        applyDeterministicLanguageRepair(row, contextualRepair)
      }
      row.languageScores = {
        naturalness: row.languageEvaluation.naturalnessScore,
        contextualFit: row.languageScores.contextualFit,
        registerFit: row.languageScores.registerFit,
        grammaticalStability: row.languageEvaluation.grammarScore,
      }
      row.combinedScores = computeCombinedScores(row.audioScores, row.languageScores, hasAudio)

      row.improvementActions = filterImprovementActionsForAudioPresence(
        hasAudio,
        mergeImprovementActions({
          llm: coach.improvementActions,
          transcript: row.learnerTranscript,
          referenceSentence: row.referenceSentence,
          weakWords: weakWordsByTurnId.get(row.turnId) ?? [],
          scenarioTitle: input.scenario.title,
          turnIndex: row.turnIndex,
        })
      )

      if (!hasAudio) {
        row.keyProblems = filterKeyProblemsWhenNoAudio(row.keyProblems).slice(0, 12)
        row.keyStrengths = filterStrengthsWhenNoAudio(row.keyStrengths)
        row.chunkingRhythmSuggestion = ''
        row.focusWords = []
        row.dutchLikenessNarrative = sanitizeDutchLikenessForTranscriptOnly(row.dutchLikenessNarrative, input.scenario.title)
      }
    } else {
      const contextualRepair = inferDeterministicLanguageRepair(
        row,
        input.scenario.title,
        input.scenario.slug,
        allowScenarioSpecificRepairs,
      )
      if (contextualRepair) {
        applyDeterministicLanguageRepair(row, contextualRepair)
      }
      row.improvementActions = filterImprovementActionsForAudioPresence(
        hasAudio,
        mergeImprovementActions({
          llm: [],
          transcript: row.learnerTranscript,
          referenceSentence: row.referenceSentence,
          weakWords: weakWordsByTurnId.get(row.turnId) ?? [],
          scenarioTitle: input.scenario.title,
          turnIndex: row.turnIndex,
        })
      )
    }
  }
  const coachMergeMs = Date.now() - coachMergeStartedAt
  console.log('[EvalTiming] orchestrator:coach_merge:end', {
    threadId: input.threadId,
    elapsedMs: coachMergeMs,
  })

  // Phase 2: Generate reference TTS + upload for all turns in parallel
  const referenceTtsStartedAt = Date.now()
  const referenceTtsDiag: SpeakLiveReferenceTtsDiagCounters = {
    referenceTtsRequestedCount: 0,
    referenceTtsCacheHits: 0,
    referenceTtsCacheMisses: 0,
    referenceTtsGeneratedCount: 0,
  }
  console.log('[EvalTiming] orchestrator:reference_tts:start', {
    threadId: input.threadId,
    turnCount: turnEvals.length,
  })
  await Promise.all(turnEvals.map(async (row) => {
    try {
      const tts = await generateSpeakLiveReferenceSpeechForReport({
        text: row.referenceSentence.slice(0, 800),
        threadId: input.threadId,
        messageId: row.turnId,
        language: 'nl',
      })
      row.referenceAudioUrl = tts.audioUrl
      const persisted = await maybePersistReferenceAudioBlob({
        threadId: input.threadId,
        userMessageId: row.turnId,
        audioBase64: tts.audioBase64,
        mimeType: tts.mimeType,
      })
      if (persisted) {
        row.referenceAudioUrl = `speak-live/session/${input.threadId}/reference-audio/${row.turnId}`
      }
      accumulateReferenceTtsDiagFromAttempt(referenceTtsDiag, { ok: true, cached: tts.cached })
    } catch (e) {
      if (e instanceof ApiError && e.code === 'DEPENDENCY_UNAVAILABLE') throw e
      accumulateReferenceTtsDiagFromAttempt(referenceTtsDiag, { ok: false })
      row.referenceAudioUrl = null
    }
  }))
  const referenceTtsMs = Date.now() - referenceTtsStartedAt
  if (parallelOrchestrationV1) {
    parallelOrchestrationV1.referenceTtsMs = referenceTtsMs
    parallelOrchestrationV1.referenceTtsRequestedCount = referenceTtsDiag.referenceTtsRequestedCount
    parallelOrchestrationV1.referenceTtsCacheHits = referenceTtsDiag.referenceTtsCacheHits
    parallelOrchestrationV1.referenceTtsCacheMisses = referenceTtsDiag.referenceTtsCacheMisses
    parallelOrchestrationV1.referenceTtsGeneratedCount = referenceTtsDiag.referenceTtsGeneratedCount
    if (referenceTtsMs > 1500) {
      parallelOrchestrationV1.warnings.push('referenceTtsMs exceeded 1.5s — TTS or blob persist may be slow.')
    }
  }
  console.log('[EvalTiming] orchestrator:reference_tts:end', {
    threadId: input.threadId,
    elapsedMs: referenceTtsMs,
  })

  // Phase 3: Build pronunciation/fluency issues + feedback items (depends on TTS results)
  const feedbackBuildStartedAt = Date.now()
  console.log('[EvalTiming] orchestrator:feedback_build:start', {
    threadId: input.threadId,
    turnCount: turnEvals.length,
  })
  for (const row of turnEvals) {
    const hasAudio = row.signalSources.audioMetrics === 'azure_audio'
    const ctx = audioContextByTurn.get(row.turnId)
    if (hasAudio && ctx) {
      row.pronunciationIssues = buildPronunciationIssuesFromAzure({
        words: ctx.words,
        referenceAudioUrl: row.referenceAudioUrl,
      })
      row.fluencyIssues = buildFluencyIssuesFromTiming({ words: ctx.words, timing: ctx.timing })
    } else {
      row.pronunciationIssues = []
      row.fluencyIssues = []
    }

    const le = row.languageEvaluation
    const transcriptItems = le
      ? buildTranscriptFeedbackItems({
          transcript: row.learnerTranscript,
          grammarIssues: le.grammarIssues,
          sentenceStructureIssues: le.sentenceStructureIssues,
          naturalnessNotes: [],
        })
      : []
    const audioItems = hasAudio
      ? buildAudioFeedbackItems({
          transcript: row.learnerTranscript,
          pronunciationIssues: row.pronunciationIssues ?? [],
          fluencyIssues: row.fluencyIssues ?? [],
        })
      : []
    row.feedbackItems = validateAndFilterFeedbackItems([...transcriptItems, ...audioItems])
  }
  const feedbackBuildMs = Date.now() - feedbackBuildStartedAt
  console.log('[EvalTiming] orchestrator:feedback_build:end', {
    threadId: input.threadId,
    elapsedMs: feedbackBuildMs,
  })

  const legacyTurnEnrichmentEnabled = isReportLegacyTurnEnrichmentEnabled()
  let enrichTurnsMs = 0
  console.log('[EvalTiming] orchestrator:enrich_turns:start', {
    threadId: input.threadId,
    turnCount: turnEvals.length,
    legacyTurnEnrichmentEnabled,
  })
  if (legacyTurnEnrichmentEnabled) {
    const enrichPassStartedAt = Date.now()
    const publicTransportExpectedDestination =
      input.scenario.slug.trim().toLowerCase().replace(/-/g, '_') === 'train_station' &&
      input.scenario.runtimeConfig?.id === PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID
        ? input.scenario.runtimeConfig.destinationDisplay ?? null
        : null
    await Promise.all(
      turnEvals.map((row) => {
        const coach = byId.get(row.turnId)
        const ctx = audioContextByTurn.get(row.turnId)
        enrichTurnReportFields({
          turn: row,
          words: ctx?.words ?? [],
          timing: ctx?.timing ?? null,
          llmWrongWords: coach?.wrongWordDetections as import('./liveVoiceEvaluationTypes').WrongWordDetection[] | undefined,
          scenarioTitle: input.scenario.title,
          scenarioSlug: input.scenario.slug,
          publicTransportExpectedDestination,
          coachingLlmSucceeded,
          skipDeterministicWrongWordsFromReference: coachingLlmSucceeded && recommendationVerifyApplied,
        })
      }),
    )
    enrichTurnsMs += Date.now() - enrichPassStartedAt
  }

  if (coachingLlmSucceeded && isSpeakLiveReportAuditLlmEnabled()) {
    const auditTurns: ReportAuditTurnInput[] = turnEvals.map((row) => ({
      turnId: row.turnId,
      learnerTranscript: row.learnerTranscript,
      wrongWordDetections: (row.wrongWordDetections ?? []) as import('./liveVoiceEvaluationTypes').WrongWordDetection[],
      referenceSentence: row.referenceSentence.trim(),
      referenceKind: row.referenceKind,
      referenceSentenceReason: row.referenceSentenceReason.trim(),
      improvedVersion: row.languageEvaluation?.improvedVersion?.trim() ?? null,
      mainFixLine: (row.mainFixLine ?? '').trim(),
      keyProblems: row.keyProblems.map((s) => s.trim()).filter(Boolean).slice(0, 12),
    }))
    const reportAuditStartedAt = Date.now()
    console.log('[EvalTiming] orchestrator:report_audit:start', {
      threadId: input.threadId,
      turnCount: auditTurns.length,
    })
    const auditPatches = await runSpeakLiveReportAuditLlm({
      scenarioTitle: input.scenario.title,
      learnerLevel: input.learnerLevel,
      turns: auditTurns,
    })
    legacyLlmCallsCount += 1
    reportAuditMs = Date.now() - reportAuditStartedAt
    console.log('[EvalTiming] orchestrator:report_audit:end', {
      threadId: input.threadId,
      elapsedMs: reportAuditMs,
      applied: Boolean(auditPatches),
    })
    if (auditPatches) {
      const refChangedIds = new Set<string>()
      for (const row of turnEvals) {
        const p = auditPatches.get(row.turnId)
        if (!p) continue
        const { referenceChanged } = applyReportAuditPatchToTurn(row, p)
        if (referenceChanged) refChangedIds.add(row.turnId)
      }
      if (refChangedIds.size > 0) {
        await Promise.all(
          turnEvals
            .filter((r) => refChangedIds.has(r.turnId))
            .map(async (row) => {
              try {
                const tts = await generateSpeakLiveReferenceSpeechForReport({
                  text: row.referenceSentence.slice(0, 800),
                  threadId: input.threadId,
                  messageId: row.turnId,
                  language: 'nl',
                })
                row.referenceAudioUrl = tts.audioUrl
                const persisted = await maybePersistReferenceAudioBlob({
                  threadId: input.threadId,
                  userMessageId: row.turnId,
                  audioBase64: tts.audioBase64,
                  mimeType: tts.mimeType,
                })
                if (persisted) {
                  row.referenceAudioUrl = `speak-live/session/${input.threadId}/reference-audio/${row.turnId}`
                }
                accumulateReferenceTtsDiagFromAttempt(referenceTtsDiag, { ok: true, cached: tts.cached })
              } catch (e) {
                if (e instanceof ApiError && e.code === 'DEPENDENCY_UNAVAILABLE') throw e
                accumulateReferenceTtsDiagFromAttempt(referenceTtsDiag, { ok: false })
                row.referenceAudioUrl = null
              }
            }),
        )
      }
      if (legacyTurnEnrichmentEnabled) {
        const enrichPassStartedAt = Date.now()
        const publicTransportExpectedDestination =
          input.scenario.slug.trim().toLowerCase().replace(/-/g, '_') === 'train_station' &&
          input.scenario.runtimeConfig?.id === PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID
            ? input.scenario.runtimeConfig.destinationDisplay ?? null
            : null
        await Promise.all(
          turnEvals.map((row) => {
            const ctx = audioContextByTurn.get(row.turnId)
            enrichTurnReportFields({
              turn: row,
              words: ctx?.words ?? [],
              timing: ctx?.timing ?? null,
              llmWrongWords: row.wrongWordDetections,
              scenarioTitle: input.scenario.title,
              scenarioSlug: input.scenario.slug,
              publicTransportExpectedDestination,
              coachingLlmSucceeded,
              skipDeterministicWrongWordsFromReference: coachingLlmSucceeded && recommendationVerifyApplied,
            })
          }),
        )
        enrichTurnsMs += Date.now() - enrichPassStartedAt
      }
    }
  }

  for (const row of turnEvals) {
    if (!row.languageEvaluation) {
      row.languageEvaluation = mapTurnLanguageEvaluation({
        raw: undefined,
        languageScores: row.languageScores,
        transcript: row.learnerTranscript,
        learnerLevel: input.learnerLevel,
      })
    }
    if (!row.feedbackItems || row.feedbackItems.length === 0) {
      const le = row.languageEvaluation
      row.feedbackItems = le
        ? validateAndFilterFeedbackItems(
            buildTranscriptFeedbackItems({
              transcript: row.learnerTranscript,
              grammarIssues: le.grammarIssues,
              sentenceStructureIssues: le.sentenceStructureIssues,
              naturalnessNotes: [],
            })
          )
        : []
    }
    row.deepEvaluation = buildLiveTurnDeepEvaluation(row)
  }
  console.log('[EvalTiming] orchestrator:enrich_turns:end', {
    threadId: input.threadId,
    elapsedMs: enrichTurnsMs,
  })

  const premiumScoringStartedAt = Date.now()
  console.log('[EvalTiming] orchestrator:premium_scoring:start', {
    threadId: input.threadId,
    turnCount: turnEvals.length,
  })
  const cefrLevel = normalizeSpeakLiveCefrLevel(input.learnerLevel)
  for (const row of turnEvals) {
    const hasAudio = row.signalSources.audioMetrics === 'azure_audio'
    const ctx = audioContextByTurn.get(row.turnId)
    const le = row.languageEvaluation
    const premiumInput: TurnScoringInput = {
      turnId: row.turnId,
      turnIndex: row.turnIndex,
      transcript: row.learnerTranscript,
      transcriptNormalized: row.transcriptNormalized,
      audioUrl: row.learnerAudioUrl,
      hasAudio,
      level: cefrLevel,
      mode: 'live_speak',
      rawScores: hasAudio && ctx ? {
        pronunciation: row.audioScores.pronunciation,
        fluency: row.audioScores.fluency,
        completeness: row.audioScores.completeness,
        overall: row.combinedScores.overallTurnScore,
        prosody: null,
        accuracy: row.audioScores.clarity,
      } : null,
      derivedScores: hasAudio && ctx ? computeDerivedScores({
        pronunciation: row.audioScores.pronunciation,
        fluency: row.audioScores.fluency,
        completeness: row.audioScores.completeness,
        overall: row.combinedScores.overallTurnScore,
        prosody: null,
        accuracy: row.audioScores.clarity,
      }, ctx.timing) : null,
      timing: ctx?.timing ?? null,
      words: ctx?.words ?? [],
      clipDurationMs: null,
      languageScores: {
        naturalness: row.languageScores.naturalness,
        contextualFit: row.languageScores.contextualFit,
        registerFit: row.languageScores.registerFit,
        grammaticalStability: row.languageScores.grammaticalStability,
      },
      grammarIssues: le?.grammarIssues ?? [],
      sentenceStructureIssues: le?.sentenceStructureIssues ?? [],
      improvedVersion: le?.improvedVersion ?? null,
      scenarioAlignmentScore: row.scenarioGoalFit.alignmentScore,
      scenarioGoalSummary: row.scenarioGoalFit.summary,
      referenceAudioUrl: row.referenceAudioUrl,
    }
    row.premiumEvaluation = evaluateTurnPremium(premiumInput)
  }
  const premiumScoringMs = Date.now() - premiumScoringStartedAt
  console.log('[EvalTiming] orchestrator:premium_scoring:end', {
    threadId: input.threadId,
    elapsedMs: premiumScoringMs,
  })

  const sessionAssemblyStartedAt = Date.now()
  console.log('[EvalTiming] orchestrator:session_assembly:start', {
    threadId: input.threadId,
  })
  const overallVoiceScore = turnEvals.length
    ? clamp100(turnEvals.reduce((s, t) => s + t.combinedScores.overallTurnScore, 0) / turnEvals.length)
    : 0

  const audioBackedTurns = turnEvals.filter((t) => t.signalSources.audioMetrics === 'azure_audio')
  const assessedAudioTurns = audioBackedTurns.filter((t) => t.audioDiagnostics?.assessmentOk)
  const noMatchAudioTurns = audioBackedTurns.filter((t) =>
    !t.audioDiagnostics?.assessmentOk &&
    (t.audioDiagnostics?.assessmentCaveats ?? []).some((c) => /\bNoMatch\b/i.test(c))
  )
  const technicalAudioFailureTurns = audioBackedTurns.filter((t) =>
    !t.audioDiagnostics?.assessmentOk &&
    !(t.audioDiagnostics?.assessmentCaveats ?? []).some((c) => /\bNoMatch\b/i.test(c))
  )
  const sessionAudioMetricsAvailable = assessedAudioTurns.length > 0
  const scoredAudioTurns = assessedAudioTurns.filter((t) => t.audioScores.pronunciation > 0 || t.audioScores.fluency > 0)
  const avgScoredAudio = (pick: (t: TurnEvaluation) => number): number | null =>
    scoredAudioTurns.length
      ? clamp100(scoredAudioTurns.reduce((s, t) => s + pick(t), 0) / scoredAudioTurns.length)
      : null
  const applyNoMatchPenalty = (score: number | null, fallback: number): number | null => {
    if (score == null) return null
    if (noMatchAudioTurns.length === 0) return score
    const assessedCount = Math.max(1, scoredAudioTurns.length)
    return clamp100(((score * assessedCount) + fallback * noMatchAudioTurns.length) / (assessedCount + noMatchAudioTurns.length))
  }

  const recommendedFollowUps: RecommendedFollowUp[] = filterRecommendedFollowUpsForSessionAudio(
    sessionAudioMetricsAvailable,
    llm.recommendedFollowUps.map((f) => ({
      type: f.type,
      title: f.title,
      reason: f.reason,
      linkedScenarioIdOptional: f.linkedScenarioIdOptional ?? null,
      linkedPhraseOptional: f.linkedPhraseOptional ?? null,
      linkedWordOptional: f.linkedWordOptional ?? null,
    }))
  )

  const nTurns = Math.max(1, turnEvals.length)
  const overallGrammarSentenceScore = clamp100(
    turnEvals.reduce((s, t) => {
      const le = t.languageEvaluation
      const v = le
        ? (le.grammarScore + le.sentenceConstructionScore) / 2
        : (t.languageScores.grammaticalStability + t.languageScores.contextualFit) / 2
      return s + v
    }, 0) / nTurns
  )
  const overallNaturalnessSession = clamp100(
    turnEvals.reduce((s, t) => s + t.languageScores.naturalness, 0) / nTurns
  )
  const derived = deriveSessionInsightsFromTurns(turnEvals)
  const sessionLabelAudioFilter = (s: string) =>
    !/\bpronunciation\b|\brhythm\b|\bfluency\b|audio|recording|mic\b|pause|hesitat/i.test(s)

  const singleTurnNotice = 'You completed 1 turn. We can give more precise feedback once you complete more turns.'
  const grammarSummaryRaw = llm.grammarConstructionSessionSummary?.trim()
  const grammarConstructionSessionSummary =
    turnEvals.length === 1
      ? [singleTurnNotice, grammarSummaryRaw].filter(Boolean).join('\n\n')
      : grammarSummaryRaw || undefined

  const sessionInsights: SessionEvaluationInsights = {
    overallGrammarSentenceScore,
    overallNaturalness: overallNaturalnessSession,
    strongestAreas: (() => {
      const fromLlm = llm.strongestAreas?.map((x) => x.trim()).filter(Boolean).slice(0, 8) ?? []
      const filtered = sessionAudioMetricsAvailable ? fromLlm : fromLlm.filter(sessionLabelAudioFilter)
      return filtered.length ? filtered : derived.strongestAreas
    })(),
    weakestAreas: (() => {
      const fromLlm = llm.weakestAreas?.map((x) => x.trim()).filter(Boolean).slice(0, 8) ?? []
      const filtered = sessionAudioMetricsAvailable ? fromLlm : fromLlm.filter(sessionLabelAudioFilter)
      return filtered.length ? filtered : derived.weakestAreas
    })(),
    mostImportantNextStep:
      turnEvals.length === 1
        ? singleTurnNotice
        : llm.mostImportantNextStep?.trim() ||
          llm.whatToTryNext[0]?.trim() ||
          (sessionAudioMetricsAvailable
            ? 'Pick one weak turn, play the reference audio, then shadow the line in two smooth chunks.'
            : 'Review the transcript-based grammar notes, then try the same scenario again with audio capture enabled.'),
    savedTrainingRecommendationsSummary:
      llm.savedTrainingRecommendationsSummary?.trim() ||
      (sessionAudioMetricsAvailable
        ? `You have ${recommendedFollowUps.length} follow-up suggestion(s) and per-turn save actions — prioritize one phrase and one pronunciation target from your lowest-scoring turn.`
        : `You have ${recommendedFollowUps.length} follow-up suggestion(s) and per-turn save actions — prioritize one grammar pattern and one natural phrasing line from your notes.`),
  }

  const fluencyRhythmSummary = sessionAudioMetricsAvailable
    ? llm.fluencyRhythmSummary
    : SESSION_VOICE_ANALYSIS_UNAVAILABLE_MESSAGE
  const pronunciationSummary = sessionAudioMetricsAvailable
    ? llm.pronunciationSummary
    : SESSION_VOICE_ANALYSIS_UNAVAILABLE_MESSAGE

  const premiumTurns = turnEvals.map((t) => t.premiumEvaluation).filter(Boolean) as import('../../domain/speaking-assessment/speechScoringModel').SpeechTurnEvaluation[]
  const premiumSessionEvaluation = premiumTurns.length > 0
    ? evaluateSessionPremium({
        sessionId: input.threadId,
        scenarioId: input.scenario.slug,
        scenarioTitle: input.scenario.title,
        level: cefrLevel,
        mode: 'live_speak',
        sessionDurationSeconds,
        turns: premiumTurns,
      })
    : undefined

  const turnsWithBlobPath = turnEvals.filter(t => (t as Record<string, unknown>).audioDiagnostics && ((t as Record<string, unknown>).audioDiagnostics as Record<string, unknown>).blobPath)
  const turnsWithDownloadOk = turnEvals.filter(t => (t as Record<string, unknown>).audioDiagnostics && ((t as Record<string, unknown>).audioDiagnostics as Record<string, unknown>).downloadOk)
  const turnsWithAssessmentOk = turnEvals.filter(t => (t as Record<string, unknown>).audioDiagnostics && ((t as Record<string, unknown>).audioDiagnostics as Record<string, unknown>).assessmentOk)

  console.log(`[Orchestrator] Audio pipeline summary: ${turnsWithBlobPath.length}/${turnEvals.length} have blobPath, ${turnsWithDownloadOk.length} downloaded OK, ${turnsWithAssessmentOk.length} assessed OK, ${audioBackedTurns.length} counted as audio-backed, ${scoredAudioTurns.length} have non-zero scores`)

  const audioPipelineDiagnostics = {
    totalTurns: turnEvals.length,
    turnsWithBlobPath: turnsWithBlobPath.length,
    turnsDownloadedOk: turnsWithDownloadOk.length,
    turnsAssessedOk: turnsWithAssessmentOk.length,
    turnsAudioBacked: audioBackedTurns.length,
    turnsWithScores: scoredAudioTurns.length,
    issues: [] as string[],
  }
  if (turnsWithBlobPath.length === 0 && turnEvals.length > 0) {
    audioPipelineDiagnostics.issues.push('No learnerAudioBlobPath in any message metadata — audio was not uploaded during the session')
  }
  if (turnsWithBlobPath.length > 0 && turnsWithDownloadOk.length === 0) {
    audioPipelineDiagnostics.issues.push('Audio blob paths exist but no downloads succeeded — check blob storage connection (AZURE_STORAGE_CONNECTION_STRING)')
  }
  if (turnsWithDownloadOk.length > 0 && turnsWithAssessmentOk.length === 0) {
    audioPipelineDiagnostics.issues.push('Audio downloaded but Azure Speech Assessment returned no results for any turn — check AZURE_SPEECH_KEY/REGION and audio format')
  }
  if (noMatchAudioTurns.length > 0) {
    audioPipelineDiagnostics.issues.push(`${noMatchAudioTurns.length} clip${noMatchAudioTurns.length === 1 ? '' : 's'} could not be recognized clearly enough for pronunciation scoring`)
  }
  if (technicalAudioFailureTurns.length > 0) {
    audioPipelineDiagnostics.issues.push(`${technicalAudioFailureTurns.length} clip${technicalAudioFailureTurns.length === 1 ? '' : 's'} hit a technical speech-assessment failure, so scores are partial`)
  }

  const evidenceSummary: import('./liveVoiceEvaluationTypes').EvidenceSummary & { audioPipelineDiagnostics?: typeof audioPipelineDiagnostics } = {
    transcriptAvailable: turnEvals.length > 0,
    audioTurnCount: audioBackedTurns.length,
    transcriptTurnCount: turnEvals.length,
    azurePronunciationTurnCount: assessedAudioTurns.length,
    llmLanguageTurnCount: turnEvals.filter(t => byId.has(t.turnId)).length,
    referenceAudioTurnCount: turnEvals.filter(t => t.referenceAudioUrl != null).length,
    totalLearnerTurnCount: turnEvals.length,
    audioPipelineDiagnostics,
  }

  function isTrainStationScenario(slug: string): boolean {
    return slug.trim().toLowerCase().replace(/-/g, '_') === 'train_station'
  }

  // Map structured goal IDs (e.g. ASK_PLATFORM) to scenario goal labels
  // so recap.goalsCompleted (which uses structured IDs) can match
  // input.scenario.goals (which uses human-readable strings).
  const STRUCTURED_TO_LABEL: Record<string, string[]> = {
    ASK_PLATFORM: ['platform', 'perron', 'spoor', 'track'],
    ASK_DEPARTURE_TIME: ['time', 'vertrekt', 'departure', 'wanneer'],
    ASK_DELAY_STATUS: ['delay', 'vertraging', 'op tijd', 'time', 'punctual'],
    ASK_DESTINATION: ['destination', 'bestemming', 'route', 'naar'],
    CONFIRM_DETAIL: ['confirm', 'detail', 'check', 'bevestig'],
    THANK_AND_CLOSE: ['close', 'polite', 'thank', 'dank', 'dag', 'greeting'],
  }

  function isGoalCompletedByRecap(goalLabel: string, recapCompleted: string[]): boolean {
    if (recapCompleted.includes(goalLabel)) return true
    if (!isTrainStationScenario(input.scenario.slug)) return false
    const lower = goalLabel.toLowerCase()
    for (const structuredId of recapCompleted) {
      if (structuredId === goalLabel) continue
      const keywords = STRUCTURED_TO_LABEL[structuredId]
      if (keywords && keywords.some(kw => lower.includes(kw))) return true
    }
    return false
  }

  const recapEvidence = recap?.transcriptEvidence ?? []

  function structuredGoalIdsForLabel(goalLabel: string): string[] {
    if (!isTrainStationScenario(input.scenario.slug)) return []
    const lower = goalLabel.toLowerCase()
    const base = Object.entries(STRUCTURED_TO_LABEL)
      .filter(([, keywords]) => keywords.some((kw) => lower.includes(kw)))
      .map(([id]) => id)
    const rt = input.scenario.runtimeConfig ?? speakLivePersistedEarly?.scenarioRuntimeConfig
    if (rt?.id === PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID) {
      const extra = publicTransportStructuredSlotProjection(goalLabel, rt.variation)
      return [...new Set([...base, ...extra])]
    }
    return base
  }

  function transcriptLooksLikeGreeting(transcript: string | null | undefined): boolean {
    const lower = (transcript ?? '').trim().toLowerCase()
    if (!lower) return false
    return [
      'goedemiddag',
      'hallo',
      'hoi',
      'goedenavond',
      'goedemorgen',
    ].some((token) => lower === token || lower === `${token}.` || lower.startsWith(`${token} `))
  }

  function transcriptLooksLikeClosing(transcript: string | null | undefined): boolean {
    const lower = (transcript ?? '').trim().toLowerCase()
    if (!lower) return false
    return ['dank', 'bedankt', 'tot ziens', 'fijne dag', 'doei']
      .some((token) => lower.includes(token))
  }

  function scoreGoalEvidenceCandidate(
    goalLabel: string,
    turn: typeof turnEvals[number],
    goalStructuredIds: string[],
  ): number {
    if (!turn.scenarioGoalFit.relevantGoals.includes(goalLabel)) return Number.NEGATIVE_INFINITY

    const transcript = (turn.learnerTranscript ?? turn.transcriptNormalized ?? '').trim()
    if (!transcript) return Number.NEGATIVE_INFINITY

    const lowerTranscript = transcript.toLowerCase()
    const lowerSummary = (turn.scenarioGoalFit.summary ?? '').toLowerCase()

    if (lowerSummary.includes('does not address the scenario goals')) {
      return Number.NEGATIVE_INFINITY
    }

    let score = turn.scenarioGoalFit.alignmentScore

    const labelKeywords = new Set(
      [
        ...goalLabel.toLowerCase().split(/[^a-zA-ZÀ-ÿ]+/),
        ...goalStructuredIds.flatMap((id) => STRUCTURED_TO_LABEL[id] ?? []),
      ]
        .map((token) => token.trim())
        .filter((token) => token.length >= 4),
    )

    for (const keyword of labelKeywords) {
      if (lowerTranscript.includes(keyword) || lowerSummary.includes(keyword)) {
        score += 14
      }
    }

    if (transcriptLooksLikeGreeting(transcript)) score -= 60
    if (goalStructuredIds.includes('THANK_AND_CLOSE')) {
      score += transcriptLooksLikeClosing(transcript) ? 22 : -50
    }

    return score
  }

  // Assign weights to goals: distribute evenly among core goals,
  // with an optional stretch pool (last goal gets stretch if ≥4 goals and looks optional).
  const COMPLETION_HINT_MAP: Record<string, string> = {
    ASK_PLATFORM: 'Op welk perron vertrekt de trein?',
    ASK_DEPARTURE_TIME: 'Hoe laat vertrekt de trein naar Amsterdam?',
    ASK_DELAY_STATUS: 'Is de trein op tijd?',
    ASK_DESTINATION: 'Gaat deze trein naar Amsterdam?',
    CONFIRM_DETAIL: 'En vanaf welk perron?',
    THANK_AND_CLOSE: 'Dank u wel!',
  }

  const ORDERING_FOOD_COMPLETION_HINTS: Record<string, string> = {
    'make a clear order': 'Bijvoorbeeld: "Mag ik een koffie met havermelk, alstublieft?"',
    'use polite phrasing': '"Dank je wel" en "Dank u wel" tellen allebei; voeg bij verzoeken ook "alstublieft" of "mag ik" toe.',
    'ask a follow-up question': 'Bijvoorbeeld: "Wat kost dat?" of "Mag ik de rekening?"',
    'clarify or confirm one detail': 'Bijvoorbeeld: "Met melk?" of "Is dat met suiker?"',
  }

  const DIRECTIONS_COMPLETION_HINTS: Record<string, string> = {
    'vraag duidelijk waar het is of hoe u er komt.': 'Bijvoorbeeld: "Waar is het station?" of "Hoe kom ik bij het centrum?"',
    'noem de bestemming concreet genoeg om te antwoorden.': 'Noem concreet: station, apotheek, bushalte, museum, …',
    'gebruik een natuurlijke opening of beleefd naderen.': '"Pardon" / "Mag ik u iets vragen?" werkt goed.',
    'stel een nuttige vervolgvraag of bevestig kort na het antwoord.': 'Bijvoorbeeld: "Is dat ver?" of "Links of rechts?" of "Dank u wel."',
    'laat merken dat u route-instructies begrijpt (richting/taal).': 'Gebruik rechtdoor/links/rechts/stoplicht in uw reactie.',
    'verwerk minstens één route-stap (echo of check).': 'Kort: "Oké" / "Dus eerst links?" / "Bij het stoplicht?"',
    'vraag om herhaling of verduidelijking wanneer nodig.': '"Nog een keer?" / "Kunt u dat herhalen?" / "Bedoelt u bij het station?"',
    'blijf naar dezelfde bestemming verwijzen (in beeld houden).': 'Noem de plek opnieuw als u doorvraagt.',
    'herhaal of bevestig de route helder (bijv. klopt dat?).': '"Dus eerst … en dan …, klopt dat?"',
    'gebruik volgorde in uw zin (eerst, dan, daarna).': 'Gebruik "eerst", "dan", "daarna" in één zin.',
    'maakt u twijfel meteen concreet (bij welk punt?).': '"Links na de winkel?" / "Bij de tweede straat?"',
    'sluit natuurlijk af met een korte bedanking of bevestiging.': '"Oké, dank u" / "Helder, bedankt."',
  }

  const PUBLIC_TRANSPORT_COMPLETION_HINTS: Record<string, string> = {
    ask_route_or_boarding_question:
      'Bijvoorbeeld: “Van welk perron vertrekt de trein?” of “Welke tram moet ik nemen?”',
    identify_destination_or_line_cleary: 'Noem concreet bestemming, lijn of richting (bijv. “naar Utrecht Centraal”).',
    confirm_next_step: 'Bevestig kort: “Dus perron vijf?” / “Dus lijn 12?” / “Oké, hier uitstappen?”',
    natural_transport_politeness: 'Voeg “alstublieft” / “dank u” toe waar het natuurlijk is.',
    ask_for_ticket_cleary: 'Bijvoorbeeld: “Ik wil een kaartje naar Utrecht, alstublieft.”',
    confirm_ticket_detail: 'Vraag of bevestig één detail: enkele reis/retour, prijs, betalen, zone of geldigheid.',
    destination_or_route_reference: 'Houd “naar …” of uw lijn/halte in beeld in dezelfde wissel.',
    close_or_acknowledge_naturally: 'Sluit kort af: “Dank u.” / “Oké, prima.” / “Dan neem ik die.”',
    ask_delay_or_disruption_cleary: 'Bijvoorbeeld: “Heeft de trein vertraging?” of “Rijdt deze bus vandaag?”',
    keep_route_context_clear: 'Noem nog kort uw bestemming of lijn in dezelfde vraag.',
    ask_next_step_or_alternative: 'Vraag wat nu te doen is: “Moet ik overstappen?” / “Is er een andere route?”',
    acknowledge_or_confirm_naturally: 'Reageer kort: “Oké, dank u.” of bevestig het alternatief.',
  }

  const DOCTOR_PHARMACY_COMPLETION_HINTS: Record<string, string> = {
    'beschrijf het sympteem of probleem duidelijk.': 'Bijvoorbeeld: “Ik heb al twee dagen hoofdpijn.”',
    'gebruik begrijpelijke symptoom- of lichaamwoorden.': 'Noem het lichaamsdeel of de klacht (keel, buik, koorts).',
    'geef korte tijd- of ernstcontext.': 'Voeg toe: “sinds gisteren” of “heel erg”.',
    'gebruik natuurlijke, beleefde hulpzoektoon.': 'Korte beleefde zinnen; “alstublieft” helpt.',
    'vraag duidelijk om hulp.': 'Bijvoorbeeld: “Kunt u mij helpen?”',
    'zeg welk soort hulp u nodig heeft (medicijn, afspraak of advies).': 'Noem medicijn, afspraak of advies.',
    'houd de symptoomcontext bij de vraag begrijpelijk.': 'Eén zin met de belangrijkste klacht.',
    'reageer natuurlijk (bijv. dank u, oké).': 'Sluit af met “Dank u” of “Prima”.',
    'bevestig of herhaal de instructie duidelijk.': 'Echo: “Dus twee keer per dag?”',
    'laat zien dat u de tijd of hoeveelheid begrijpt.': 'Noem ochtend/avond of aantal.',
    'vraag kort om verduidelijking als iets onduidelijk is.': 'Één korte vraag: “Bedoelt u voor of na het eten?”',
    'reageer natuurlijk en kort.': 'Korte bevestiging in normaal Nederlands.',
  }

  const SUPERMARKET_SHOP_COMPLETION_HINTS: Record<string, string> = {
    'vraag duidelijk waar een product ligt.': 'Bijvoorbeeld: "Waar vind ik de melk, alstublieft?"',
    'begrijp of bevestig de locatie (gangpad / schap).': 'Kort herhalen: "Dus in gangpad drie, rechts?"',
    'gebruik beleefde formulering (mag / alstublieft / dank u).': 'Voeg "alstublieft" of "dank u wel" toe bij verzoeken.',
    'stel één korte vervolgvraag of verduidelijking.': 'Bijvoorbeeld: "Is dat ver hier vandaan?"',
    'reageer passend bij de kassa (totaal, vraag van de medewerker).': 'Kort antwoorden op totaal of "pinnen?".',
    'bevestig tas, bon, of betaalwijze (pin/contactloos) kort en duidelijk.': 'Bijvoorbeeld: "Een tasje graag" of "Ik pin contactloos."',
    'gebruik korte natuurlijke transactietaal.': 'Houd zinnen kort, zoals bij de kassa in het echt.',
    'sluit beleefd af (bedankt / prettige dag).': '"Dank u wel" of "Prettige dag" werkt goed.',
    'stel een duidelijke vraag over een product (prijs, inhoud, variant).': 'Eén duidelijke vraag in één zin.',
    'bevestig of vergelijk correct (goedkoper / groter / zonder suiker).': 'Vergelijk kort en concreet.',
    'gebruik passende woorden voor het product.': 'Noem het product of de schapafdeling.',
    'vraag verduidelijking als iets onduidelijk is.': '"Bedoelt u deze variant?" is natuurlijk.',
  }

  function completionHintFor(goal: string): string {
    const slug = input.scenario.slug.trim().toLowerCase().replace(/-/g, '_')
    if (slug === 'ordering_food') {
      const key = goal.trim().toLowerCase()
      return ORDERING_FOOD_COMPLETION_HINTS[key] ?? ''
    }
    if (slug === 'supermarket_shop') {
      const key = goal.trim().toLowerCase()
      return SUPERMARKET_SHOP_COMPLETION_HINTS[key] ?? ''
    }
    if (slug === 'doctor_pharmacy') {
      const key = goal.trim().toLowerCase()
      return DOCTOR_PHARMACY_COMPLETION_HINTS[key] ?? ''
    }
    if (slug === 'directions_getting_somewhere') {
      const key = goal.trim().toLowerCase()
      return DIRECTIONS_COMPLETION_HINTS[key] ?? ''
    }
    if (slug === 'train_station' && input.scenario.runtimeConfig?.id === PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID) {
      const m = /\[([A-Z0-9_]+)\]/i.exec(goal)
      const key = (m?.[1] ?? goal).toLowerCase()
      return PUBLIC_TRANSPORT_COMPLETION_HINTS[key] ?? ''
    }
    if (!isTrainStationScenario(input.scenario.slug)) return ''
    for (const [id, keywords] of Object.entries(STRUCTURED_TO_LABEL)) {
      if (keywords.some(kw => goal.toLowerCase().includes(kw)) && COMPLETION_HINT_MAP[id]) {
        return COMPLETION_HINT_MAP[id]
      }
    }
    return ''
  }

  function normalizeFocusLineForCompare(line: string | null | undefined): string {
    return (line ?? '')
      .trim()
      .toLowerCase()
      .replace(/[“”"'.?!,;:()\[\]]+/g, '')
      .replace(/\s+/g, ' ')
  }

  function buildPublicTransportIntentRepairFocus():
    | import('./liveVoiceEvaluationTypes').LiveSessionEvaluation['focusArea']
    | undefined {
    if (input.scenario.slug.trim().toLowerCase().replace(/-/g, '_') !== 'train_station') return undefined
    if (input.scenario.runtimeConfig?.id !== PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID) return undefined

    const transportIntentRe =
      /\b(perron|spoor|halte|lijn|tram|bus|metro|trein|route|uitstappen|instappen|overstappen|richting|naar)\b/i
    const questionIntentRe = /\?|\b(welke|waar|hoe|moet ik|kan ik|gaat|gaat deze|neemt|neem ik|rijdt)\b/i

    const candidates = turnEvals
      .map((turn) => {
        const learnerOriginal = (turn.learnerTranscript ?? turn.transcriptOriginal ?? turn.transcriptNormalized ?? '').trim()
        if (!learnerOriginal) return null
        if (!transportIntentRe.test(learnerOriginal) || !questionIntentRe.test(learnerOriginal)) return null

        const improved = (
          turn.naturalRewrite?.improved ??
          turn.languageEvaluation?.improvedVersion ??
          turn.referenceSentence ??
          ''
        ).trim()
        if (!improved) return null
        if (normalizeFocusLineForCompare(improved) === normalizeFocusLineForCompare(learnerOriginal)) return null

        const languageScore = turn.languageEvaluation
          ? Math.min(
              turn.languageEvaluation.grammarScore,
              turn.languageEvaluation.sentenceConstructionScore,
              turn.languageEvaluation.naturalnessScore,
            )
          : null
        const transportFitBonus = /\b(welke|waar|hoe|lijn|tram|bus|metro|trein|halte|perron|spoor|naar|richting)\b/i.test(improved)
          ? 18
          : 0
        const score =
          (languageScore == null ? 70 : 100 - languageScore) +
          transportFitBonus +
          (turn.scenarioGoalFit.alignmentScore < 75 ? 8 : 0)

        return { turn, learnerOriginal, improved, score }
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate != null)
      .sort((a, b) => b.score - a.score)

    const best = candidates[0]
    if (!best) return undefined

    const languageLine =
      best.turn.languageEvaluation?.learnerFacingGrammarLine?.trim() ||
      best.turn.languageEvaluation?.whyThisIsMoreNatural?.trim() ||
      best.turn.languageEvaluation?.whyItIsBetter?.trim()

    return {
      label: 'Make the transport question match your intent',
      why:
        languageLine ||
        'Your meaning was understandable, but the next practice line should ask the route or line question more clearly.',
      exampleLine: best.improved,
      cta: 'practice_now',
      sourceTurnId: best.turn.turnId,
      learnerOriginalLine: best.learnerOriginal,
    }
  }

  function isStretchGoal(goal: string): boolean {
    const gl = goal.toLowerCase()
    const slug = input.scenario.slug.trim().toLowerCase().replace(/-/g, '_')
    if (slug === 'directions_getting_somewhere') {
      const v = speakLivePersistedEarly?.scenarioRuntimeConfig?.variation
      return directionsGoalIsStretchTier(goal, v)
    }
    if (slug === 'train_station' && input.scenario.runtimeConfig?.id === PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID) {
      return publicTransportGoalIsStretchTier(goal, input.scenario.runtimeConfig.variation)
    }
    if (slug === 'booking_reservations') {
      const v = speakLivePersistedEarly?.scenarioRuntimeConfig?.variation
      return bookingGoalIsStretchTier(goal, v)
    }
    if (slug === 'store_service_issue') {
      const v = speakLivePersistedEarly?.scenarioRuntimeConfig?.variation
      return storeServiceGoalIsStretchTier(goal, v)
    }
    if (slug === 'work_colleague_interaction') {
      const v = speakLivePersistedEarly?.scenarioRuntimeConfig?.variation
      return workColleagueGoalIsStretchTier(goal, v)
    }
    if (slug === 'housing_landlord') {
      const v = speakLivePersistedEarly?.scenarioRuntimeConfig?.variation
      return housingLandlordGoalIsStretchTier(goal, v)
    }
    if (slug === 'doctor_pharmacy') {
      const v = speakLivePersistedEarly?.scenarioRuntimeConfig?.variation
      return doctorPharmacyGoalIsStretchTier(goal, v)
    }
    if (slug === 'phone_call') {
      return false
    }
    if (
      slug === 'small_talk' ||
      slug === 'meeting_new_people' ||
      slug === 'party_social' ||
      slug === 'explaining_something' ||
      slug === 'storytelling' ||
      slug === 'opinions_discussions'
    ) {
      return false
    }
    return (
      gl.includes('polite') ||
      gl.includes('close') ||
      gl.includes('thank') ||
      gl.includes('greeting') ||
      gl.includes('sluit') ||
      gl.includes('vervolgvraag')
    )
  }

  const coreGoals = input.scenario.goals.filter(g => !isStretchGoal(g))
  const stretchGoals = input.scenario.goals.filter(g => isStretchGoal(g))
  const corePool = stretchGoals.length > 0 ? 0.85 : 1.0
  const stretchPool = 1.0 - corePool
  const coreWeight = coreGoals.length > 0 ? corePool / coreGoals.length : 0
  const stretchWeight = stretchGoals.length > 0 ? stretchPool / stretchGoals.length : 0

  const goalEvidenceList = input.scenario.goals.map(goal => {
    const isCompleted = isGoalCompletedByRecap(goal, recap?.goalsCompleted ?? [])
    const goalStructuredIds = structuredGoalIdsForLabel(goal)
    const matchTurn = isCompleted
      ? [...turnEvals]
          .map((turn) => ({
            turn,
            score: scoreGoalEvidenceCandidate(goal, turn, goalStructuredIds),
          }))
          .filter((candidate) => Number.isFinite(candidate.score) && candidate.score >= 65)
          .sort((a, b) => b.score - a.score)[0]?.turn ?? null
      : null

    let evidenceTurn = matchTurn

    let evidenceText = isCompleted
      ? (matchTurn?.learnerTranscript ?? matchTurn?.transcriptNormalized ?? null)
      : null
    if (!evidenceText && isCompleted) {
      const lower = goal.toLowerCase()
      const rt = input.scenario.runtimeConfig ?? speakLivePersistedEarly?.scenarioRuntimeConfig
      const recapMatch = recapEvidence.find((re) => {
        if (re.goalId === goal) return true
        if (!isTrainStationScenario(input.scenario.slug)) return false
        if (
          rt?.id === PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID &&
          Array.isArray(rt.goals) &&
          rt.goals.length > 0 &&
          structuredSlotSupportsPublicTransportCompletedGoal(re.goalId, goal, rt.variation, rt.goals)
        ) {
          return true
        }
        const keywords = STRUCTURED_TO_LABEL[re.goalId]
        return Boolean(keywords && keywords.some((kw) => lower.includes(kw)))
      })
      if (recapMatch?.quote) evidenceText = recapMatch.quote
    }

    // Supermarket / phone / …: recap or FSM can mark goals complete even when per-turn
    // `scenarioGoalFit.relevantGoals` omits the exact Dutch label — infer evidence with the
    // same heuristics as live recap so report QA does not fail on empty quotes.
    if (!evidenceText && isCompleted) {
      const slug = input.scenario.slug.trim().toLowerCase().replace(/-/g, '_')
      if (slug === 'supermarket_shop') {
        const goalNorm = goal.trim().toLowerCase()
        let bestTurn: (typeof turnEvals)[number] | null = null
        let bestRank = Number.NEGATIVE_INFINITY
        for (const turn of turnEvals) {
          const tx = (turn.learnerTranscript ?? turn.transcriptNormalized ?? '').trim()
          if (!tx) continue
          const inferred = inferSupermarketShopGoalLabelsFromUserText(input.scenario.goals, [tx])
          if (!inferred.some((g) => g.toLowerCase() === goalNorm)) continue
          const scored = scoreGoalEvidenceCandidate(goal, turn, goalStructuredIds)
          const rank =
            Number.isFinite(scored) && scored > Number.NEGATIVE_INFINITY ? scored : turn.scenarioGoalFit.alignmentScore
          if (rank > bestRank) {
            bestRank = rank
            bestTurn = turn
          }
        }
        if (bestTurn) {
          evidenceText = bestTurn.learnerTranscript ?? bestTurn.transcriptNormalized ?? null
          evidenceTurn = bestTurn
        }
      }
      if (slug === 'doctor_pharmacy') {
        const goalNorm = goal.trim().toLowerCase()
        let bestTurn: (typeof turnEvals)[number] | null = null
        let bestRank = Number.NEGATIVE_INFINITY
        for (const turn of turnEvals) {
          const tx = (turn.learnerTranscript ?? turn.transcriptNormalized ?? '').trim()
          if (!tx) continue
          const inferred = inferDoctorPharmacyGoalLabelsFromUserText(input.scenario.goals, [tx])
          if (!inferred.some((g) => g.toLowerCase() === goalNorm)) continue
          const scored = scoreGoalEvidenceCandidate(goal, turn, goalStructuredIds)
          const rank =
            Number.isFinite(scored) && scored > Number.NEGATIVE_INFINITY ? scored : turn.scenarioGoalFit.alignmentScore
          if (rank > bestRank) {
            bestRank = rank
            bestTurn = turn
          }
        }
        if (bestTurn) {
          evidenceText = bestTurn.learnerTranscript ?? bestTurn.transcriptNormalized ?? null
          evidenceTurn = bestTurn
        }
      }
      if (slug === 'directions_getting_somewhere') {
        const goalNorm = goal.trim().toLowerCase()
        let bestTurn: (typeof turnEvals)[number] | null = null
        let bestRank = Number.NEGATIVE_INFINITY
        for (const turn of turnEvals) {
          const tx = (turn.learnerTranscript ?? turn.transcriptNormalized ?? '').trim()
          if (!tx) continue
          const inferred = inferDirectionsGoalLabelsFromUserText(input.scenario.goals, [tx])
          if (!inferred.some((g) => g.toLowerCase() === goalNorm)) continue
          const scored = scoreGoalEvidenceCandidate(goal, turn, goalStructuredIds)
          const rank =
            Number.isFinite(scored) && scored > Number.NEGATIVE_INFINITY ? scored : turn.scenarioGoalFit.alignmentScore
          if (rank > bestRank) {
            bestRank = rank
            bestTurn = turn
          }
        }
        if (bestTurn) {
          evidenceText = bestTurn.learnerTranscript ?? bestTurn.transcriptNormalized ?? null
          evidenceTurn = bestTurn
        }
      }
      if (slug === 'train_station' && input.scenario.runtimeConfig?.id === PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID) {
        const goalNorm = goal.trim().toLowerCase()
        let bestTurn: (typeof turnEvals)[number] | null = null
        let bestRank = Number.NEGATIVE_INFINITY
        for (const turn of turnEvals) {
          const tx = (turn.learnerTranscript ?? turn.transcriptNormalized ?? '').trim()
          if (!tx) continue
          const inferred = inferPublicTransportGoalLabelsFromUserText(input.scenario.goals, [tx])
          if (!inferred.some((g) => g.toLowerCase() === goalNorm)) continue
          const scored = scoreGoalEvidenceCandidate(goal, turn, goalStructuredIds)
          const rank =
            Number.isFinite(scored) && scored > Number.NEGATIVE_INFINITY ? scored : turn.scenarioGoalFit.alignmentScore
          if (rank > bestRank) {
            bestRank = rank
            bestTurn = turn
          }
        }
        if (bestTurn) {
          evidenceText = bestTurn.learnerTranscript ?? bestTurn.transcriptNormalized ?? null
          evidenceTurn = bestTurn
        }
      }
      if (slug === 'phone_call') {
        const goalNorm = goal.trim().toLowerCase()
        let bestTurn: (typeof turnEvals)[number] | null = null
        let bestRank = Number.NEGATIVE_INFINITY
        for (const turn of turnEvals) {
          const tx = (turn.learnerTranscript ?? turn.transcriptNormalized ?? '').trim()
          if (!tx) continue
          const inferred = inferPhoneCallGoalLabelsFromUserText(input.scenario.goals, [tx])
          if (!inferred.some((g) => g.toLowerCase() === goalNorm)) continue
          const scored = scoreGoalEvidenceCandidate(goal, turn, goalStructuredIds)
          const rank =
            Number.isFinite(scored) && scored > Number.NEGATIVE_INFINITY ? scored : turn.scenarioGoalFit.alignmentScore
          if (rank > bestRank) {
            bestRank = rank
            bestTurn = turn
          }
        }
        if (bestTurn) {
          evidenceText = bestTurn.learnerTranscript ?? bestTurn.transcriptNormalized ?? null
          evidenceTurn = bestTurn
        }
      }
    }

    let turnId = isCompleted ? (evidenceTurn?.turnId ?? null) : null
    let turnIndex = isCompleted ? (evidenceTurn?.turnIndex ?? null) : null
    if (isCompleted && !turnId && evidenceText) {
      const fallback = turnEvals.find(t =>
        (t.learnerTranscript ?? t.transcriptNormalized ?? '').toLowerCase().includes(
          evidenceText!.slice(0, 40).toLowerCase()
        )
      )
      if (fallback) { turnId = fallback.turnId; turnIndex = fallback.turnIndex }
    }

    const stretch = isStretchGoal(goal)
    const weight = stretch ? stretchWeight : coreWeight
    const hint = isCompleted ? undefined : completionHintFor(goal)
    const { goalId: canonicalGoalId, learnerLabel } = splitCanonicalScenarioGoal(goal)

    return {
      goalId: canonicalGoalId,
      goalLabel: learnerLabel,
      turnId,
      turnIndex,
      evidenceText,
      status: isCompleted ? 'completed' as const : 'missed' as const,
      weight,
      tier: stretch ? 'stretch' as const : 'core' as const,
      completionHint: hint || undefined,
    }
  })

  const goalChecklistPercent = clamp100(Math.round(
    goalEvidenceList
      .filter(g => g.status === 'completed')
      .reduce((sum, g) => sum + (g.weight ?? 0), 0) * 100
  ))

  const wrongWordTurns = turnEvals.filter(t => (t.wrongWordDetections?.length ?? 0) > 0).length
  const avgAlignmentForScenarioOutcome =
    turnEvals.length > 0
      ? clamp100(turnEvals.reduce((s, t) => s + t.scenarioGoalFit.alignmentScore, 0) / turnEvals.length)
      : goalChecklistPercent
  const naturalSessionAvgForScenarioOutcome =
    turnEvals.length > 0
      ? clamp100(turnEvals.reduce((s, t) => s + t.languageScores.naturalness, 0) / turnEvals.length)
      : goalChecklistPercent
  const scenarioExecutionAvg = clamp100(
    Math.round((avgAlignmentForScenarioOutcome + naturalSessionAvgForScenarioOutcome) / 2),
  )
  let learnerFacingScenarioOutcome = clamp100(
    Math.round(goalChecklistPercent * 0.58 + scenarioExecutionAvg * 0.42),
  )
  if (wrongWordTurns > 0) {
    learnerFacingScenarioOutcome = clamp100(learnerFacingScenarioOutcome - Math.min(12, wrongWordTurns * 3))
  }

  const taskOutcome: import('./liveVoiceEvaluationTypes').TaskOutcome = {
    goals: input.scenario.goals,
    completed: recap?.goalsCompleted ?? [],
    missed: recap?.goalsMissed ?? [],
    goalEvidence: goalEvidenceList,
    goalChecklistPercent,
    weightedCompletion: learnerFacingScenarioOutcome,
  }
  const avgAlignment =
    turnEvals.length > 0 ? turnEvals.reduce((s, t) => s + t.scenarioGoalFit.alignmentScore, 0) / turnEvals.length : 0
  const weakWordSessionAvg = assessedAudioTurns.length
    ? assessedAudioTurns.reduce((sum, t) => {
        const w = audioContextByTurn.get(t.turnId)?.words ?? []
        return sum + w.filter(x => x.accuracyScore < 65 && x.word.trim()).length
      }, 0) / assessedAudioTurns.length
    : 0
  const rushedTurns = assessedAudioTurns.filter(t => audioContextByTurn.get(t.turnId)?.timing.rushedEnding).length
  const goalsDoneCount = recap?.goalsCompleted?.length ?? 0
  const goalsTotalCount = Math.max(1, input.scenario.goals.length)

  const coachHeadline = sessionCoachHeadline({
    scenarioTitle: input.scenario.title,
    sessionHasAudio: sessionAudioMetricsAvailable,
    wrongWordTurns,
    avgAlignment,
    goalsDone: goalsDoneCount,
    goalsTotal: goalsTotalCount,
    weakestAreaLabel: sessionInsights.weakestAreas[0] ?? null,
  })

  const keyTakeawayMessage = (() => {
    const nextStep = sessionInsights.mostImportantNextStep
    if (nextStep && nextStep.length > 10) return nextStep
    if (!sessionAudioMetricsAvailable) {
      return `You completed the ${input.scenario.title} scenario. Pronunciation evidence is missing because no learner audio was stored — language coaching below is based on your transcript.`
    }
    return llm.overallCoachSummary.slice(0, 200)
  })()

  const understandRaw = turnEvals.length
    ? clamp100(turnEvals.reduce((s, t) => s + t.combinedScores.clarityScore, 0) / turnEvals.length)
    : null
  const naturalRaw = clamp100(turnEvals.reduce((s, t) => s + t.languageScores.naturalness, 0) / Math.max(1, turnEvals.length))
  const pronRaw = applyNoMatchPenalty(avgScoredAudio((t) => t.audioScores.pronunciation), 28)
  const rhythmRaw = applyNoMatchPenalty(avgScoredAudio((t) => t.audioScores.rhythm), 34)
  const fluencyRaw = applyNoMatchPenalty(avgScoredAudio((t) => t.audioScores.fluency), 38)
  const partialAudioCoverage = audioBackedTurns.length > 0 && assessedAudioTurns.length < audioBackedTurns.length

  const taskCal = calibrateDisplayScore(scenarioCompletionScore, 'task', {
    weakWordCount: wrongWordTurns * 3,
    rushedEnding: rushedTurns > 0,
  })
  const understandCal =
    understandRaw != null
      ? calibrateDisplayScore(understandRaw, 'blended', {
          weakWordCount: Math.round(weakWordSessionAvg * 2 + wrongWordTurns),
          rushedEnding: rushedTurns > turnEvals.length / 2,
        })
      : null
  const naturalCal = calibrateDisplayScore(naturalRaw, 'language', {
    weakWordCount: wrongWordTurns * 3,
    transcriptConfidence: wrongWordTurns > 0 ? 'medium' : 'high',
  })
  const grammarCal = calibrateDisplayScore(overallGrammarSentenceScore, 'language', {
    weakWordCount: wrongWordTurns * 2,
    transcriptConfidence: wrongWordTurns > 0 ? 'medium' : 'high',
  })
  let pronCal = pronRaw != null ? calibrateDisplayScore(pronRaw, 'audio', { weakWordCount: Math.round(weakWordSessionAvg * 2.5), rushedEnding: false }) : null
  let rhythmCal =
    rhythmRaw != null ? calibrateDisplayScore(rhythmRaw, 'audio', { weakWordCount: Math.round(weakWordSessionAvg * 1.2), rushedEnding: rushedTurns > 0 }) : null
  let naturalCal2 = naturalCal
  let understandCal2 = understandCal

  if (wrongWordTurns > 0) {
    naturalCal2 = naturalCal2 != null ? Math.min(naturalCal2, wrongWordTurns >= 2 ? 72 : 76) : naturalCal2
    understandCal2 = understandCal2 != null ? Math.min(understandCal2, 81) : understandCal2
  }
  if (weakWordSessionAvg >= 0.6 && pronCal != null) {
    pronCal = Math.min(pronCal, Math.round(84 - weakWordSessionAvg * 7))
  }
  if (rushedTurns > 0 && rhythmCal != null) {
    rhythmCal = Math.min(rhythmCal, 75)
  }
  if (noMatchAudioTurns.length > 0 && pronCal != null) {
    pronCal = Math.min(pronCal, 74 - Math.min(10, (noMatchAudioTurns.length - 1) * 4))
  }
  if (partialAudioCoverage && rhythmCal != null) {
    rhythmCal = Math.min(rhythmCal, 78)
  }

  const overallDimensions: import('./liveVoiceEvaluationTypes').ScoredDimension[] = [
    {
      id: 'task_success',
      label: 'Task success',
      score: taskCal,
      confidence: wrongWordTurns > 0 ? 'medium' : 'high',
      evidenceType: 'scenario',
      verdict: taskCal >= 80 ? 'Goals completed' : taskCal >= 50 ? 'Partially completed' : 'Goals mostly missed',
      meaning:
        goalsDoneCount >= goalsTotalCount
          ? `You hit ${goalsDoneCount} of ${goalsTotalCount} checklist goals — the scene work matched what we asked for.`
          : `You reached ${goalsDoneCount} of ${goalsTotalCount} goals, so parts of the brief were still open when you stopped.`,
    },
    {
      id: 'understandability',
      label: 'Understandability',
      score: understandCal2,
      confidence: partialAudioCoverage || noMatchAudioTurns.length > 0 ? 'medium' : sessionAudioMetricsAvailable ? (weakWordSessionAvg >= 1.5 ? 'medium' : 'high') : wrongWordTurns > 0 ? 'medium' : 'medium',
      evidenceType: sessionAudioMetricsAvailable ? 'mixed' : 'transcript',
      verdict: '',
      meaning:
        weakWordSessionAvg >= 1.2
          ? 'Most content was followable, but several low-clarity words across sentences asked listeners to work harder.'
          : wrongWordTurns > 0
            ? 'Meaning mostly comes through, yet a wrong key word in Dutch can briefly break trust with a stranger.'
            : 'Listeners could follow your intent without needing many repeats.',
    },
    {
      id: 'natural_dutch',
      label: 'Natural Dutch',
      score: naturalCal2,
      confidence: wrongWordTurns > 0 ? 'medium' : 'medium',
      evidenceType: 'transcript',
      verdict: '',
      meaning:
        wrongWordTurns > 0
          ? 'The intent works, but at least one wording choice pulls the Dutch away from what natives expect in this service moment.'
          : 'Phrasing stayed close to functional Dutch for your level, with room to polish tone and collocations.',
    },
    ...(sessionAudioMetricsAvailable ? [
      {
        id: 'pronunciation',
        label: 'Pronunciation',
        score: pronCal,
        confidence: noMatchAudioTurns.length > 0 ? ('low' as const) : partialAudioCoverage || weakWordSessionAvg >= 1.5 ? ('medium' as const) : ('high' as const),
        evidenceType: 'audio' as const,
        verdict: '',
        meaning:
          noMatchAudioTurns.length > 0
            ? `${noMatchAudioTurns.length} clip${noMatchAudioTurns.length === 1 ? '' : 's'} did not register clearly enough for scoring, so this pronunciation score is held down and should be treated as directional.`
            : weakWordSessionAvg >= 1.2
            ? 'Most words were clear, but a cluster of weaker syllables stood out compared with the rest of your speech.'
            : 'Most words were clear; remaining issues are concentrated in a few sounds rather than the whole line.',
      },
      {
        id: 'rhythm',
        label: 'Rhythm & flow',
        score: rhythmCal,
        confidence: partialAudioCoverage || rushedTurns > 0 ? ('medium' as const) : ('high' as const),
        evidenceType: 'audio' as const,
        verdict: '',
        meaning:
          partialAudioCoverage
            ? `We only got usable rhythm data on ${assessedAudioTurns.length} of ${audioBackedTurns.length} recorded lines, so treat this as a partial read.`
            : rushedTurns > 0
            ? 'Your pacing was mostly steady, but one or more sentence endings sounded rushed compared with the opening.'
            : 'Breath groups and pauses generally stayed even — small polish only.',
      },
    ] : []),
    {
      id: 'grammar',
      label: 'Grammar & sentence control',
      score: grammarCal,
      confidence: wrongWordTurns > 0 ? 'medium' : 'medium',
      evidenceType: 'transcript',
      verdict: '',
      meaning:
        wrongWordTurns > 0
          ? 'Structure mostly held, but word-form or vocabulary slips showed alongside the wording issues above.'
          : 'Sentence structure worked for what you tried; remaining notes are refinements, not rebuilds.',
    },
  ]

  for (const dim of overallDimensions) {
    if (!dim.verdict && dim.score != null) {
      dim.verdict = verdictForDisplayScore(dim.score)
    }
  }

  let phoneCallPerformance: LiveSessionEvaluation['phoneCallPerformance']
  if (slugNormEval === 'phone_call') {
    const phonePerf = buildPhoneCallPerformance({ messages: msgs, turnEvaluations: turnEvals })
    overallDimensions.push(...phonePerf.extraDimensions)
    phoneCallPerformance = {
      modelVersion: 1,
      weightsSummary: PHONE_CALL_WEIGHTS_SUMMARY,
      compositePhoneScore: phonePerf.compositePhoneScore,
      sentenceMoments: phonePerf.sentenceMoments,
    }
  }

  let smallTalkPerformance: LiveSessionEvaluation['smallTalkPerformance']
  if (slugNormEval === 'small_talk') {
    const st = buildSmallTalkPerformance({ messages: msgs, turnEvaluations: turnEvals })
    overallDimensions.push(...st.extraDimensions)
    smallTalkPerformance = {
      modelVersion: 1,
      weightsSummary: SMALL_TALK_WEIGHTS_SUMMARY,
      compositeSmallTalkScore: st.compositeSmallTalkScore,
    }
  }

  let meetingNewPeoplePerformance: LiveSessionEvaluation['meetingNewPeoplePerformance'] | undefined
  if (slugNormEval === 'meeting_new_people') {
    const mnp = buildMeetingNewPeoplePerformance({ messages: msgs, turnEvaluations: turnEvals })
    overallDimensions.push(...mnp.extraDimensions)
    meetingNewPeoplePerformance = {
      modelVersion: 1,
      weightsSummary: MEETING_NEW_PEOPLE_WEIGHTS_SUMMARY,
      compositeMeetingNewPeopleScore: mnp.compositeMeetingNewPeopleScore,
    }
  }

  let partySocialPerformance: LiveSessionEvaluation['partySocialPerformance'] | undefined
  if (slugNormEval === 'party_social') {
    const ps = buildPartySocialPerformance({ messages: msgs, turnEvaluations: turnEvals })
    overallDimensions.push(...ps.extraDimensions)
    partySocialPerformance = {
      modelVersion: 1,
      weightsSummary: PARTY_SOCIAL_WEIGHTS_SUMMARY,
      compositePartySocialScore: ps.compositePartySocialScore,
    }
  }

  let explainingSomethingPerformance: LiveSessionEvaluation['explainingSomethingPerformance'] | undefined
  if (slugNormEval === 'explaining_something') {
    const ex = buildExplainingSomethingPerformance({ messages: msgs, turnEvaluations: turnEvals })
    overallDimensions.push(...ex.extraDimensions)
    explainingSomethingPerformance = {
      modelVersion: 1,
      weightsSummary: EXPLAINING_SOMETHING_WEIGHTS_SUMMARY,
      compositeExplainingSomethingScore: ex.compositeExplainingSomethingScore,
    }
  }

  let storytellingPerformance: LiveSessionEvaluation['storytellingPerformance'] | undefined
  if (slugNormEval === 'storytelling') {
    const st = buildStorytellingPerformance({ messages: msgs, turnEvaluations: turnEvals })
    overallDimensions.push(...st.extraDimensions)
    storytellingPerformance = {
      modelVersion: 1,
      weightsSummary: STORYTELLING_WEIGHTS_SUMMARY,
      compositeStorytellingScore: st.compositeStorytellingScore,
    }
  }

  let opinionsDiscussionsPerformance: LiveSessionEvaluation['opinionsDiscussionsPerformance'] | undefined
  if (slugNormEval === 'opinions_discussions') {
    const od = buildOpinionsDiscussionsPerformance({ messages: msgs, turnEvaluations: turnEvals })
    overallDimensions.push(...od.extraDimensions)
    opinionsDiscussionsPerformance = {
      modelVersion: 1,
      weightsSummary: OPINIONS_DISCUSSIONS_WEIGHTS_SUMMARY,
      compositeOpinionsDiscussionsScore: od.compositeOpinionsDiscussionsScore,
    }
  }

  const recommendedActions: import('./liveVoiceEvaluationTypes').RecommendedAction[] = []
  const followUps = recommendedFollowUps.slice(0, 5)
  for (let i = 0; i < followUps.length; i++) {
    const f = followUps[i]
    recommendedActions.push({
      id: `action-${i}`,
      type: (f.type === 'retry_scenario' ? 'retry_scenario' : f.type === 'pronunciation_drill' ? 'pronunciation_drill' : 'speak_practice') as import('./liveVoiceEvaluationTypes').RecommendedAction['type'],
      title: f.title,
      reason: f.reason,
      priority: i === 0 ? 'primary' : 'secondary',
      linkedScenarioId: f.linkedScenarioIdOptional ?? null,
      linkedPhrase: f.linkedPhraseOptional ?? null,
    })
  }

  if (slugNormEval === 'phone_call') {
    const drills = buildPhoneCallRecommendedDrillActions()
    for (let j = 0; j < drills.length; j++) {
      const d = drills[j]!
      recommendedActions.push({
        id: `phone-drill-${j}`,
        type: 'speak_practice',
        title: d.title,
        reason: d.reason,
        priority: d.priority,
        linkedScenarioId: 'phone_call',
        linkedPhrase: null,
      })
    }
  }

  if (slugNormEval === 'small_talk') {
    const drills = buildSmallTalkRecommendedDrillActions()
    for (let j = 0; j < drills.length; j++) {
      const d = drills[j]!
      recommendedActions.push({
        id: `small-talk-drill-${j}`,
        type: 'speak_practice',
        title: d.title,
        reason: d.reason,
        priority: d.priority,
        linkedScenarioId: 'small_talk',
        linkedPhrase: null,
      })
    }
  }

  if (slugNormEval === 'meeting_new_people') {
    const drills = buildMeetingNewPeopleRecommendedDrillActions()
    for (let j = 0; j < drills.length; j++) {
      const d = drills[j]!
      recommendedActions.push({
        id: `meeting-new-people-drill-${j}`,
        type: 'speak_practice',
        title: d.title,
        reason: d.reason,
        priority: d.priority,
        linkedScenarioId: 'meeting_new_people',
        linkedPhrase: null,
      })
    }
  }

  if (slugNormEval === 'party_social') {
    const drills = buildPartySocialRecommendedDrillActions()
    for (let j = 0; j < drills.length; j++) {
      const d = drills[j]!
      recommendedActions.push({
        id: `party-social-drill-${j}`,
        type: 'speak_practice',
        title: d.title,
        reason: d.reason,
        priority: d.priority,
        linkedScenarioId: 'party_social',
        linkedPhrase: null,
      })
    }
  }

  if (slugNormEval === 'explaining_something') {
    const drills = buildExplainingSomethingRecommendedDrillActions()
    for (let j = 0; j < drills.length; j++) {
      const d = drills[j]!
      recommendedActions.push({
        id: `explaining-something-drill-${j}`,
        type: 'speak_practice',
        title: d.title,
        reason: d.reason,
        priority: d.priority,
        linkedScenarioId: 'explaining_something',
        linkedPhrase: null,
      })
    }
  }

  if (slugNormEval === 'storytelling') {
    const drills = buildStorytellingRecommendedDrillActions()
    for (let j = 0; j < drills.length; j++) {
      const d = drills[j]!
      recommendedActions.push({
        id: `storytelling-drill-${j}`,
        type: 'speak_practice',
        title: d.title,
        reason: d.reason,
        priority: d.priority,
        linkedScenarioId: 'storytelling',
        linkedPhrase: null,
      })
    }
  }

  if (slugNormEval === 'opinions_discussions') {
    const drills = buildOpinionsDiscussionsRecommendedDrillActions()
    for (let j = 0; j < drills.length; j++) {
      const d = drills[j]!
      recommendedActions.push({
        id: `opinions-discussions-drill-${j}`,
        type: 'speak_practice',
        title: d.title,
        reason: d.reason,
        priority: d.priority,
        linkedScenarioId: 'opinions_discussions',
        linkedPhrase: null,
      })
    }
  }

  for (const row of turnEvals) {
    const hasAudio = row.signalSources.audioMetrics === 'azure_audio'
    const le = row.languageEvaluation
    const defaultRewriteOptions = {
      safeForLevel: le?.improvedVersion ? { label: `Good for ${input.learnerLevel}`, text: le.improvedVersion } : null,
      moreNatural: le?.improvedVersion ? { label: 'More natural Dutch', text: le.improvedVersion } : null,
      stretch: le?.nextStepBeyondLevel ? { label: 'Stretch version', text: le.nextStepBeyondLevel } : null,
    } as import('./liveVoiceEvaluationTypes').TranscriptCoaching['rewriteOptions']
    const improvedBase =
      le?.improvedVersion?.trim() ||
      row.sentenceGroundedReview?.nativePhrase?.trim() ||
      row.deepEvaluation?.moreNaturalDutchVersion?.trim() ||
      ''
    const smallTalkRewrite =
      (slugNormEval === 'small_talk' ||
        slugNormEval === 'meeting_new_people' ||
        slugNormEval === 'party_social' ||
        slugNormEval === 'explaining_something' ||
        slugNormEval === 'storytelling' ||
        slugNormEval === 'opinions_discussions') &&
      improvedBase
        ? slugNormEval === 'meeting_new_people'
          ? buildMeetingNewPeopleRewriteOptions({
              improvedVersion: le?.improvedVersion?.trim() || improvedBase,
              nextStepBeyondLevel: le?.nextStepBeyondLevel,
              nativePhrase: row.sentenceGroundedReview?.nativePhrase,
              moreNaturalDutchVersion: row.deepEvaluation?.moreNaturalDutchVersion,
            })
          : slugNormEval === 'party_social'
            ? buildPartySocialRewriteOptions({
                improvedVersion: le?.improvedVersion?.trim() || improvedBase,
                nextStepBeyondLevel: le?.nextStepBeyondLevel,
                nativePhrase: row.sentenceGroundedReview?.nativePhrase,
                moreNaturalDutchVersion: row.deepEvaluation?.moreNaturalDutchVersion,
              })
            : slugNormEval === 'explaining_something'
              ? buildExplainingSomethingRewriteOptions({
                  improvedVersion: le?.improvedVersion?.trim() || improvedBase,
                  nextStepBeyondLevel: le?.nextStepBeyondLevel,
                  nativePhrase: row.sentenceGroundedReview?.nativePhrase,
                  moreNaturalDutchVersion: row.deepEvaluation?.moreNaturalDutchVersion,
                })
              : slugNormEval === 'storytelling'
                ? buildStorytellingRewriteOptions({
                    improvedVersion: le?.improvedVersion?.trim() || improvedBase,
                    nextStepBeyondLevel: le?.nextStepBeyondLevel,
                    nativePhrase: row.sentenceGroundedReview?.nativePhrase,
                    moreNaturalDutchVersion: row.deepEvaluation?.moreNaturalDutchVersion,
                  })
                : slugNormEval === 'opinions_discussions'
                  ? buildOpinionsDiscussionsRewriteOptions({
                      improvedVersion: le?.improvedVersion?.trim() || improvedBase,
                      nextStepBeyondLevel: le?.nextStepBeyondLevel,
                      nativePhrase: row.sentenceGroundedReview?.nativePhrase,
                      moreNaturalDutchVersion: row.deepEvaluation?.moreNaturalDutchVersion,
                    })
              : buildSmallTalkRewriteOptions({
                  improvedVersion: le?.improvedVersion?.trim() || improvedBase,
                  nextStepBeyondLevel: le?.nextStepBeyondLevel,
                  nativePhrase: row.sentenceGroundedReview?.nativePhrase,
                  moreNaturalDutchVersion: row.deepEvaluation?.moreNaturalDutchVersion,
                })
        : null
    row.transcriptCoaching = {
      meaningClarityScore: le ? clamp100((le.grammarScore + le.naturalnessScore) / 2) : null,
      grammarScore: le?.grammarScore ?? null,
      naturalnessScore: le?.naturalnessScore ?? null,
      levelFitScore: le?.levelFitScore ?? null,
      issues: [
        ...(le?.grammarIssues ?? []).map(g => ({ area: 'grammar', issue: g, fix: '' })),
        ...(le?.sentenceStructureIssues ?? []).map(s => ({ area: 'structure', issue: s, fix: '' })),
      ].slice(0, 8),
      strengths: le?.whatWorked ?? [],
      rewriteOptions: smallTalkRewrite ?? defaultRewriteOptions,
      patternToReuse: le?.nextPatternToPractice ?? null,
      explanations: [
        le?.whyThisIsMoreNatural ?? le?.whyItIsBetter ?? '',
        le?.levelBasedComment ?? '',
      ].filter(s => s.trim()),
      evidenceLines: ['transcript', 'scenario_context'],
    }
    if (hasAudio) {
      const ctx = audioContextByTurn.get(row.turnId)
      const words = ctx?.words ?? []
      const lastWord = words[words.length - 1]?.word?.trim() ?? ''
      row.audioCoaching = {
        pronunciationScore: row.audioScores.pronunciation > 0 ? row.audioScores.pronunciation : null,
        rhythmScore: row.audioScores.rhythm > 0 ? row.audioScores.rhythm : null,
        fluencyScore: row.audioScores.fluency > 0 ? row.audioScores.fluency : null,
        pacingScore: null,
        confidence: 'high',
        evidence: {
          strongWords: words.filter(w => w.accuracyScore >= 86).map(w => w.word).slice(0, 8),
          weakWords: words.filter(w => w.accuracyScore < 70 && w.word.trim()).map(w => w.word).slice(0, 6),
          problematicSegments: (row.pronunciationIssues ?? []).map(p => p.word).slice(0, 5),
          pauseIssues: (row.fluencyIssues ?? []).filter(f => f.pauseMs != null && f.pauseMs > 300).map(f => f.segment).slice(0, 4),
          stressIssues: words
            .filter(w => w.accuracyScore < 72 && w.accuracyScore >= 40 && (w.errorType ?? '').toLowerCase().includes('stress'))
            .map(w => w.word.trim())
            .slice(0, 4),
          rushedEndings: ctx?.timing.rushedEnding
            ? lastWord
              ? [`The final word “${lastWord}” was rushed`]
              : ['The sentence ending sounded rushed']
            : [],
        },
        wordAssessments: words.map(w => ({
          word: w.word,
          status: (w.accuracyScore >= 86 ? 'strong' : w.accuracyScore >= 70 ? 'okay' : w.accuracyScore >= 52 ? 'weak' : 'unclear') as import('./liveVoiceEvaluationTypes').WordPronunciationStatus,
          score: w.accuracyScore,
          issueType:
            w.accuracyScore < 70
              ? (w.errorType ?? '').toLowerCase().includes('stress')
                ? 'stress'
                : (w.errorType ?? '').toLowerCase().includes('vowel')
                  ? 'vowel'
                  : (w.errorType ?? '').toLowerCase().includes('consonant')
                    ? 'consonant'
                    : 'pronunciation'
              : null,
          instruction:
            w.accuracyScore < 70
              ? (w.errorType ?? '').toLowerCase().includes('stress')
                ? `Stress sounded flatter on “${w.word.trim()}” than a Dutch speaker would expect — match the reference emphasis.`
                : (w.errorType ?? '').toLowerCase().includes('vowel')
                  ? `Let the vowel in “${w.word.trim()}” carry a little longer, like the reference.`
                  : `The final consonant cluster in “${w.word.trim()}” needs a cleaner release — say it once in slow motion.`
              : null,
          startMs: w.startMs ?? null,
          endMs: w.endMs ?? null,
        })),
        referenceAudioUrl: row.referenceAudioUrl,
        learnerAudioUrl: row.learnerAudioUrl,
        comparisonNotes: row.audioFindings.slice(0, 4),
        recommendedPronunciationDrills: words
          .filter(w => w.accuracyScore < 65 && w.word.trim())
          .slice(0, 3)
          .map(w => `Practice "${w.word}" slowly, focusing on vowel placement`),
      }
    } else {
      row.audioCoaching = null
    }
    const stPrimary = smallTalkRewrite?.moreNatural?.text ?? smallTalkRewrite?.safeForLevel?.text ?? le?.improvedVersion ?? ''
    row.naturalRewrite =
      (slugNormEval === 'small_talk' ||
        slugNormEval === 'meeting_new_people' ||
        slugNormEval === 'party_social' ||
        slugNormEval === 'explaining_something' ||
        slugNormEval === 'storytelling' ||
        slugNormEval === 'opinions_discussions') &&
      stPrimary.trim()
        ? {
            original: row.learnerTranscript,
            improved: stPrimary.trim(),
            whyMoreNatural: le?.whyThisIsMoreNatural ?? le?.whyItIsBetter ?? row.sentenceGroundedReview?.whyBetter ?? '',
          }
        : le?.improvedVersion
          ? {
              original: row.learnerTranscript,
              improved: le.improvedVersion,
              whyMoreNatural: le.whyThisIsMoreNatural ?? le.whyItIsBetter ?? '',
            }
          : null
    row.savedWordCandidates = row.focusWords.slice(0, 6)
    row.recommendedDrills = row.improvementActions.slice(0, 4).map(a => ({
      type: a.type,
      title: a.title,
      detail: a.detail,
      targetText: a.targetPhrase ?? a.targetWord ?? null,
    }))
    const ctxDims = audioContextByTurn.get(row.turnId)
    const wordsForDims = ctxDims?.words ?? []
    const weakCt = wordsForDims.filter(w => w.accuracyScore < 70 && w.word.trim()).length
    const rushed = Boolean(ctxDims?.timing.rushedEnding)
    row.dimensions = buildTurnScoredDimensions(row, weakCt, rushed, wordsForDims)
  }

  const now = new Date().toISOString()

  // Build focusArea: one clear next gain
  const topMissedCore = goalEvidenceList.find(g => g.status === 'missed' && g.tier === 'core')
  const weakestDim = overallDimensions
    .filter(d => d.score != null)
    .sort((a, b) => (a.score ?? 100) - (b.score ?? 100))[0]
  const hasWrongWords = turnEvals.some(t => (t.wrongWordDetections?.length ?? 0) > 0)

  let focusArea: import('./liveVoiceEvaluationTypes').LiveSessionEvaluation['focusArea']
  const publicTransportIntentFocus = buildPublicTransportIntentRepairFocus()
  if (publicTransportIntentFocus) {
    focusArea = publicTransportIntentFocus
  } else if (topMissedCore) {
    const hint = topMissedCore.completionHint || ''
    focusArea = {
      label: stripGoalIdBracketsFromText(topMissedCore.goalLabel),
      why: `This core goal was not covered, costing you ${Math.round((topMissedCore.weight ?? 0) * 100)}% of the scenario score.`,
      exampleLine: hint,
      cta: 'retry_scenario',
    }
  } else if (hasWrongWords) {
    let wrongTurn: TurnEvaluation | undefined
    let firstWrong: WrongWordDetection | undefined
    for (const t of turnEvals) {
      const learnerLine = (t.learnerTranscript ?? t.transcriptOriginal ?? '').trim()
      const w = (t.wrongWordDetections ?? []).find(
        x => Boolean(x.suggestedCorrection?.trim()) && wrongWordObservedAppearsInLearnerLine(learnerLine, x),
      )
      if (w) {
        wrongTurn = t
        firstWrong = w
        break
      }
    }
    if (firstWrong && wrongTurn) {
      const learnerOriginal = (wrongTurn.learnerTranscript ?? wrongTurn.transcriptOriginal ?? '').trim()
      const swapped = applySingleWrongWordSwapLine(learnerOriginal, firstWrong).trim()
      const improved = wrongTurn.languageEvaluation?.improvedVersion?.trim() ?? ''
      const refLine = wrongTurn.referenceSentence?.trim() ?? ''
      const exampleLine =
        swapped && swapped !== learnerOriginal
          ? swapped
          : improved || refLine || firstWrong.suggestedCorrection.trim()
      focusArea = {
        label: `Use "${firstWrong.suggestedCorrection}" instead of "${firstWrong.observedToken}"`,
        why:
          firstWrong.whyItMatters?.trim()
          || 'Correct word choice here keeps your meaning clear for Dutch listeners.',
        exampleLine,
        cta: 'save_phrase',
        sourceTurnId: wrongTurn.turnId,
        learnerOriginalLine: learnerOriginal || undefined,
      }
    } else {
      focusArea = undefined
    }
  } else if (weakestDim && (weakestDim.score ?? 100) < 72) {
    const isVoice = weakestDim.id.includes('pronun') || weakestDim.id.includes('rhythm')
    focusArea = {
      label: `Improve ${weakestDim.label.toLowerCase()}`,
      why: weakestDim.meaning || `Scored ${Math.round(weakestDim.score ?? 0)} — room to grow.`,
      exampleLine: isVoice
        ? (turnEvals[0]?.voiceDrillInstruction ?? turnEvals[0]?.referenceSentence ?? '')
        : (turnEvals[0]?.referenceSentence ?? ''),
      cta: isVoice ? 'practice_now' : 'retry_scenario',
    }
  }

  // Build coachSummaryLine: combines what worked + what's next
  const completedGoalLabels = goalEvidenceList.filter(g => g.status === 'completed').map(g => g.goalLabel)
  const missedGoalLabels = goalEvidenceList.filter(g => g.status === 'missed').map(g => g.goalLabel)
  let coachSummaryLine: string | undefined
  if (completedGoalLabels.length > 0 && missedGoalLabels.length > 0) {
    const doneParts = completedGoalLabels.slice(0, 2).map(normalizeGoalPhraseForCoachSummary)
    const positive =
      doneParts.length === 1
        ? `You covered: ${doneParts[0]}`
        : `You covered: ${doneParts.join('; ')}`
    const missParts = missedGoalLabels.slice(0, 2).map(normalizeGoalPhraseForCoachSummary)
    const negative =
      missParts.length === 1 ? `add the ${missParts[0]} question` : `add ${missParts.join(' and ')}`
    coachSummaryLine = stripGoalIdBracketsFromText(`${positive}; next, ${negative}.`)
  } else if (completedGoalLabels.length > 0) {
    coachSummaryLine = stripGoalIdBracketsFromText(
      `You completed the scenario task; your next gain is ${focusArea?.label.toLowerCase() ?? 'delivery and naturalness'}.`
    )
  } else if (missedGoalLabels.length > 0) {
    coachSummaryLine = stripGoalIdBracketsFromText(
      `Focus on covering the core goals: ${missedGoalLabels.slice(0, 2).map(l => l.toLowerCase()).join(', ')}.`
    )
  }
  const sessionAssemblyMs = Date.now() - sessionAssemblyStartedAt
  if (parallelOrchestrationV1) {
    parallelOrchestrationV1.reportAssemblyMs = sessionAssemblyMs
  }
  console.log('[EvalTiming] orchestrator:session_assembly:end', {
    threadId: input.threadId,
    elapsedMs: sessionAssemblyMs,
  })
  const orchestratorTotalMs = Date.now() - buildStartedAt
  console.log('[EvalTiming] Orchestrator complete', {
    threadId: input.threadId,
    totalMs: orchestratorTotalMs,
    assessTurnsMs,
    llmMs,
    coachMergeMs,
    referenceTtsMs,
    feedbackBuildMs,
    enrichTurnsMs,
    premiumScoringMs,
    sessionAssemblyMs,
    turnCount: turnTimingRows.length,
    slowestTurns: turnTimingRows
      .slice()
      .sort((a, b) => b.totalMs - a.totalMs)
      .slice(0, 3)
      .map((t) => ({
        turnIndex: t.turnIndex,
        totalMs: t.totalMs,
        blobDownloadMs: t.blobDownloadMs,
        audioAssessmentMs: t.audioAssessmentMs,
        assessmentOk: t.assessmentOk,
      })),
  })

  if (parallelOrchestrationV1) {
    parallelOrchestrationV1.legacyLlmCallsCount = legacyLlmCallsCount
    parallelOrchestrationV1.expensiveAuditEnabled = isReportExpensiveAuditEnabled()
    parallelOrchestrationV1.recommendationVerifyEnabled = isReportRecommendationVerifyEnabled()
    parallelOrchestrationV1.legacyTurnEnrichmentEnabled = isReportLegacyTurnEnrichmentEnabled()
  }

  const latencyBudgetWarnings: string[] = []
  if (orchestratorTotalMs > 15_000) {
    latencyBudgetWarnings.push('[latency] orchestrator totalMs exceeded 15s budget.')
  }
  const structuredLaneMs = parallelOrchestrationV1?.structuredLlmMs
  if (structuredLaneMs !== undefined && structuredLaneMs > 8000) {
    latencyBudgetWarnings.push('[latency] structuredLlmMs exceeded 8s budget.')
  }
  const oa = parallelOrchestrationV1?.openaiDiagnostics
  if (oa && oa.providerNetworkMs > 12_000) {
    latencyBudgetWarnings.push('[latency] openaiDiagnostics.providerNetworkMs exceeded 12s — provider call dominates the report.')
  }
  if (parallelOrchestrationV1?.evaluationSchemaName === 'deep') {
    latencyBudgetWarnings.push('[policy] Deep evaluation schema was used in the synchronous report path — deep should be background-only.')
  }
  if (recommendationVerifyMs > 0) {
    latencyBudgetWarnings.push('[latency] synchronous recommendation-verify LLM ran.')
  }
  if (reportAuditMs > 0) {
    latencyBudgetWarnings.push('[latency] synchronous report audit LLM ran.')
  }
  if (enrichTurnsMs > 0) {
    latencyBudgetWarnings.push('[latency] synchronous legacy turn enrichment ran.')
  }
  if (!parallelOrchestrationV1) {
    latencyBudgetWarnings.push('[latency] legacy sequential scenario report path (parallel structured lane off).')
  }
  if (parallelOrchestrationV1) {
    const batch = parallelOrchestrationV1.azureSpeechBatch
    if (batch && batch.azureMode !== 'live') {
      latencyBudgetWarnings.push(
        `[policy] azureSpeechBatch.azureMode='${batch.azureMode}' — FluentCopilot requires 'live' Azure speech analysis.`,
      )
    }
    for (const row of parallelOrchestrationV1.azurePerTurnTimings) {
      const evidence = row.hadAudio || (row.blobBytes ?? 0) >= 32
      if (evidence && row.skippedReason === 'no_audio') {
        latencyBudgetWarnings.push(
          `[latency] Azure diagnostic invariant: turn ${row.turnIndex} has audio evidence but skippedReason=no_audio.`,
        )
      }
      if (
        evidence &&
        parallelOrchestrationV1.azureEnabled &&
        parallelOrchestrationV1.azureConfigPresent &&
        row.skippedReason === 'azure_disabled'
      ) {
        latencyBudgetWarnings.push(
          `[latency] Azure diagnostic: turn ${row.turnIndex} skipped as azure_disabled while Azure is configured.`,
        )
      }
      if (row.assessmentSource && row.assessmentSource !== 'live') {
        latencyBudgetWarnings.push(
          `[policy] Turn ${row.turnIndex}: assessmentSource='${row.assessmentSource}' — FluentCopilot requires 'live'.`,
        )
      }
      if (
        row.assessmentOk &&
        evidence &&
        (!row.providerRequestMs || row.providerRequestMs <= 0) &&
        (!row.audioAssessmentMs || row.audioAssessmentMs <= 0)
      ) {
        latencyBudgetWarnings.push(
          `[policy] Turn ${row.turnIndex}: Azure live timings are zero (providerRequestMs=0, audioAssessmentMs=0).`,
        )
      }
    }
  }
  const latencyWarnings = [...new Set(latencyBudgetWarnings)]

  const sessionEvaluation: LiveSessionEvaluation = {
    sessionId: input.threadId,
    scenarioId: input.scenario.slug,
    scenarioName: input.scenario.title,
    scenarioTitle: input.scenario.title,
    coachingModel: buildSpeakLiveCoachingModelMeta(llmResult),
    mode: 'live_voice' as const,
    targetLevel: input.learnerLevel,
    learnerLevel: input.learnerLevel,
    startedAt: msgs[0]?.createdAt ?? now,
    endedAt: msgs[msgs.length - 1]?.createdAt ?? now,
    sessionDurationSeconds,
    durationSec: sessionDurationSeconds,
    learnerTurnCount: userTurns.length,
    turnsCompleted: userTurns.length,
    evidenceSummary,
    keyTakeaway: {
      message: keyTakeawayMessage,
      evidenceType: sessionAudioMetricsAvailable ? 'mixed' as const : 'transcript' as const,
    },
    coachHeadline,
    coachSummaryLine,
    focusArea,
    taskOutcome,
    overall: {
      dimensions: overallDimensions,
      overallScore: overallVoiceScore,
      overallConfidence: noMatchAudioTurns.length > 0 ? 'low' as const : partialAudioCoverage ? 'medium' as const : sessionAudioMetricsAvailable ? 'high' as const : 'medium' as const,
    },
    recommendedActions,
    sessionAudioMetricsAvailable,
    overallScores: {
      overallVoiceScore,
      pronunciationScore: pronRaw,
      fluencyScore: fluencyRaw,
      rhythmScore: rhythmRaw,
      clarityScore: turnEvals.length
        ? clamp100(turnEvals.reduce((s, t) => s + t.combinedScores.clarityScore, 0) / turnEvals.length)
        : 0,
      naturalnessScore: clamp100(
        turnEvals.reduce((s, t) => s + t.languageScores.naturalness, 0) / Math.max(1, turnEvals.length)
      ),
      scenarioCompletionScore,
      confidenceEstimate: clamp100(
        turnEvals.reduce(
          (s, t) =>
            s +
            (t.signalSources.audioMetrics === 'azure_audio'
              ? (t.audioScores.pronunciation + t.audioScores.fluency) / 2
              : (t.languageScores.contextualFit + t.languageScores.grammaticalStability) / 2),
          0
        ) / Math.max(1, turnEvals.length)
      ),
    },
    overallSummary: {
      coachSummary: llm.overallCoachSummary,
      fluencyRhythmSummary,
      pronunciationSummary,
      whatToTryNext: llm.whatToTryNext,
      grammarConstructionSessionSummary,
    },
    sessionInsights,
    scenarioOutcome: {
      goalsCompleted: recap?.goalsCompleted ?? [],
      goalsMissed: recap?.goalsMissed ?? [],
      whatWentWell: recap?.whatWentWell ?? [],
      whatToImproveNext: recap?.whatToImprove ?? [],
    },
    turnEvaluations: turnEvals,
    recommendedFollowUps,
    premiumSessionEvaluation,
    ...(phoneCallPerformance ? { phoneCallPerformance } : {}),
    ...(smallTalkPerformance ? { smallTalkPerformance } : {}),
    ...(meetingNewPeoplePerformance ? { meetingNewPeoplePerformance } : {}),
    ...(partySocialPerformance ? { partySocialPerformance } : {}),
    ...(explainingSomethingPerformance ? { explainingSomethingPerformance } : {}),
    ...(storytellingPerformance ? { storytellingPerformance } : {}),
    ...(opinionsDiscussionsPerformance ? { opinionsDiscussionsPerformance } : {}),
    generationDiagnostics: {
      startedAt: new Date(buildStartedAt).toISOString(),
      completedAt: new Date().toISOString(),
      totalMs: orchestratorTotalMs,
      ...(latencyWarnings.length ? { latencyWarnings } : {}),
      orchestrator: {
        totalMs: orchestratorTotalMs,
        assessTurnsMs,
        llmMs,
        structuredLlmMs: parallelOrchestrationV1?.structuredLlmMs,
        legacyLlmCallsCount,
        expensiveAuditEnabled: isReportExpensiveAuditEnabled(),
        recommendationVerifyEnabled: isReportRecommendationVerifyEnabled(),
        legacyTurnEnrichmentEnabled: isReportLegacyTurnEnrichmentEnabled(),
        coachMergeMs,
        referenceTtsMs,
        referenceTtsRequestedCount: referenceTtsDiag.referenceTtsRequestedCount,
        referenceTtsCacheHits: referenceTtsDiag.referenceTtsCacheHits,
        referenceTtsCacheMisses: referenceTtsDiag.referenceTtsCacheMisses,
        referenceTtsGeneratedCount: referenceTtsDiag.referenceTtsGeneratedCount,
        feedbackBuildMs,
        enrichTurnsMs,
        premiumScoringMs,
        sessionAssemblyMs,
        recommendationVerifyMs,
        reportAuditMs,
        turnCount: turnTimingRows.length,
        turnTimings: turnTimingRows,
      },
      ...(parallelOrchestrationV1 ? { parallelOrchestrationV1 } : {}),
    },
    generatedAt: new Date().toISOString(),
    status: 'complete',
  }

  applyMergedSpeakingReportToLiveSessionEvaluation(sessionEvaluation)

  if (optimizedScenarioReportMerge) {
    mergeScenarioReportEvaluation({
      normalizedSession: normalizedConversation,
      evaluation: sessionEvaluation,
      structuredDialogue: optimizedScenarioReportMerge.structuredDialogue,
      azureBatch: optimizedScenarioReportMerge.speechBatch,
      referenceTts: {
        ms: parallelOrchestrationV1?.referenceTtsMs ?? 0,
        cacheHits: parallelOrchestrationV1?.referenceTtsCacheHits ?? 0,
        cacheMisses: parallelOrchestrationV1?.referenceTtsCacheMisses ?? 0,
      },
      scenarioMetadata: {
        slug: input.scenario.slug,
        title: input.scenario.title,
        goals: input.scenario.goals,
      },
    })
  }

  /**
   * Optional **deep** enrichment — fires when `REPORT_ENABLE_DEEP_REPORT_ENRICHMENT=true`. Runs in
   * the background and merges into the in-memory evaluation; never blocks the synchronous report
   * being returned. Persistence to the DB row is the responsibility of the caller (app service).
   *
   * The default production path schedules NOTHING (the env flag is off), so the fast schema is the
   * sole driver of report contents.
   */
  scheduleDeepEnrichmentBackground({
    input: {
      threadId: input.threadId,
      scenarioTitle: input.scenario.title,
      scenarioSlug: input.scenario.slug,
      scenarioGoals: input.scenario.goals,
      learnerLevel: input.learnerLevel,
      recapGoalsCompleted: recap?.goalsCompleted ?? [],
      recapGoalsMissed: recap?.goalsMissed ?? [],
      recapWhatWentWell: recap?.whatWentWell ?? [],
      recapWhatToImprove: recap?.whatToImprove ?? [],
      messages: input.messages,
      userTurnInputs: llmTurnFacts,
    },
    persist: async (deep) => {
      mergeDeepEnrichmentIntoEvaluation({ evaluation: sessionEvaluation, deep })
    },
  })

  return sessionEvaluation
}
