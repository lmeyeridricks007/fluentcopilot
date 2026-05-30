import type sql from 'mssql'
import {
  assertProviderConfigReady,
  assertSpeakLiveConversationModelInfrastructureReady,
  getConversationRecentMessagesMax,
  getResolvedAiProviderId,
  isLanguageCoachScenarioSlug,
} from '../ai/config/aiProviderConfig'
import {
  AiConfigurationError,
  AiProviderError,
  AiTimeoutError,
  AiValidationError,
} from '../ai/errors'
import { createConversationAiProvider } from '../ai/factory/createConversationAiProvider'
import { buildReplyOnlyChatMessages } from '../ai/orchestration/TurnPromptBuilder'
import { aiLogError, aiLogInfo } from '../ai/logging/aiRunLogger'
import { fallbackRecapSummary } from '../ai/orchestration/ResponseValidator'
import {
  appendCumulativeSpeakLiveMemoryTurn,
  computeNextSpeakLiveState,
  defaultSpeakLiveState,
  parseSpeakLiveState,
  serializeSpeakLiveState,
  threadCurrentStageFromPhase,
  type SpeakLivePersistedState,
  type SpeakLiveSignals,
} from '../../domain/speakLive/speakLiveFsm'
import type { LanguageCoachStartPayload } from '../../domain/speakLive/languageCoachSessionTypes'

type LanguageCoachStartInput = Partial<LanguageCoachStartPayload> | null | undefined
import {
  applyLanguageCoachAssistantTurnToState,
  applyLanguageCoachUserTurnToState,
  buildLanguageCoachSpeakLiveInit,
  normalizeLanguageCoachStart,
} from '../language-coach/languageCoachSessionState'
import { buildLanguageCoachContextualOpeningLine } from '../language-coach/languageCoachContextualOpener'
import {
  buildLiveCoachTurnFeedback,
  type LiveCoachTurnFeedback,
} from '../language-coach/languageCoachLiveTurnFeedback'
import {
  formatGroundingForPrompt,
  groundSpeakLiveUserTurn,
  mergeSpeakLiveSignalsWithGrounding,
  type GroundedSpeakLivePatch,
} from '../../domain/speakLive/scenarioIntentGrounding'
import {
  legacyConversationModeFromSupportStrategy,
  normalizeSpeakLiveCefrLevel,
  resolveSpeakLiveSupportStrategy,
} from '../../domain/speakLive/speakLiveSupportStrategy'
import {
  formatTrainStationSlotBlock,
  mergeTrainStationScenarioSession,
  trainStationRecapSlotSummary,
} from '../../domain/speakLive/trainStationSlotState'
import { buildLiveScenarioRecapInput, reconcileTrainStationLiveRecap } from '../../domain/speakLive/trainStationLiveRecapInput'
import { reconcileOrderingFoodLiveRecap } from '../../domain/speakLive/orderingFoodLiveRecap'
import { reconcileDirectionsGettingSomewhereLiveRecap } from '../../domain/speakLive/directionsGettingSomewhereLiveRecap'
import { reconcileBookingReservationsLiveRecap } from '../../domain/speakLive/bookingReservationsLiveRecap'
import { reconcileStoreServiceIssueLiveRecap } from '../../domain/speakLive/storeServiceIssueLiveRecap'
import { reconcileWorkColleagueInteractionLiveRecap } from '../../domain/speakLive/workColleagueInteractionLiveRecap'
import { reconcileHousingLandlordLiveRecap } from '../../domain/speakLive/housingLandlordLiveRecap'
import { reconcilePhoneCallLiveRecap } from '../../domain/speakLive/phoneCallLiveRecap'
import { reconcileSmallTalkLiveRecap } from '../../domain/speakLive/smallTalkLiveRecap'
import { reconcileMeetingNewPeopleLiveRecap } from '../../domain/speakLive/meetingNewPeopleLiveRecap'
import { reconcilePartySocialLiveRecap } from '../../domain/speakLive/partySocialLiveRecap'
import { reconcileExplainingSomethingLiveRecap } from '../../domain/speakLive/explainingSomethingLiveRecap'
import { reconcileStorytellingLiveRecap } from '../../domain/speakLive/storytellingLiveRecap'
import { reconcileOpinionsDiscussionsLiveRecap } from '../../domain/speakLive/opinionsDiscussionsLiveRecap'
import {
  dutchPersonaForBookingReservationsIfNeeded,
  hydrateBookingReservationsLearnerSituationSummary,
  maybeBuildBookingReservationsSpeakLiveScenarioRuntime,
  normalizeBookingDetailFocus,
  BOOKING_RESERVATIONS_SCENARIO_ID,
} from '../../domain/speakLive/bookingReservationsScenario'
import {
  STORE_SERVICE_ISSUE_SCENARIO_ID,
  dutchPersonaForStoreServiceIssueIfNeeded,
  hydrateStoreServiceIssueLearnerSituationSummary,
  isStoreServiceIssueSpeakLiveRuntimeOpeningStale,
  maybeBuildStoreServiceIssueSpeakLiveScenarioRuntime,
  normalizeStoreServiceIssueDetailFocus,
} from '../../domain/speakLive/storeServiceIssueScenario'
import {
  WORK_COLLEAGUE_INTERACTION_SCENARIO_ID,
  dutchPersonaForWorkColleagueInteractionIfNeeded,
  hydrateWorkColleagueInteractionLearnerSituationSummary,
  maybeBuildWorkColleagueInteractionSpeakLiveScenarioRuntime,
  normalizeWorkColleagueTaskFocus,
} from '../../domain/speakLive/workColleagueInteractionScenario'
import {
  HOUSING_LANDLORD_SCENARIO_ID,
  dutchPersonaForHousingLandlordIfNeeded,
  hydrateHousingLandlordLearnerSituationSummary,
  maybeBuildHousingLandlordSpeakLiveScenarioRuntime,
  normalizeHousingLandlordDetailFocus,
} from '../../domain/speakLive/housingLandlordScenario'
import {
  PHONE_CALL_SCENARIO_ID,
  dutchPersonaForPhoneCallIfNeeded,
  hydratePhoneCallLearnerSituationSummary,
  maybeBuildPhoneCallSpeakLiveScenarioRuntime,
  normalizePhoneCallSubtype,
  normalizePhoneCallTopic,
  normalizePhoneCallVariation,
} from '../../domain/speakLive/phoneCallScenario'
import {
  SMALL_TALK_SCENARIO_ID,
  dutchPersonaForSmallTalkIfNeeded,
  hydrateSmallTalkLearnerSituationSummary,
  maybeBuildSmallTalkSpeakLiveScenarioRuntime,
  normalizeSmallTalkSubtype,
  normalizeSmallTalkVariation,
} from '../../domain/speakLive/smallTalkScenario'
import {
  MEETING_NEW_PEOPLE_SCENARIO_ID,
  dutchPersonaForMeetingNewPeopleIfNeeded,
  hydrateMeetingNewPeopleLearnerSituationSummary,
  maybeBuildMeetingNewPeopleSpeakLiveScenarioRuntime,
  normalizeMeetingNewPeopleSubtype,
  normalizeMeetingNewPeopleVariation,
} from '../../domain/speakLive/meetingNewPeopleScenario'
import {
  PARTY_SOCIAL_SCENARIO_ID,
  dutchPersonaForPartySocialIfNeeded,
  hydratePartySocialLearnerSituationSummary,
  maybeBuildPartySocialSpeakLiveScenarioRuntime,
  normalizePartySocialSubtype,
  normalizePartySocialVariation,
} from '../../domain/speakLive/partySocialScenario'
import {
  EXPLAINING_SOMETHING_SCENARIO_ID,
  dutchPersonaForExplainingSomethingIfNeeded,
  hydrateExplainingSomethingLearnerSituationSummary,
  maybeBuildExplainingSomethingSpeakLiveScenarioRuntime,
  normalizeExplainingSomethingSubtype,
  normalizeExplainingSomethingVariation,
} from '../../domain/speakLive/explainingSomethingScenario'
import {
  STORYTELLING_SCENARIO_ID,
  dutchPersonaForStorytellingIfNeeded,
  hydrateStorytellingLearnerSituationSummary,
  maybeBuildStorytellingSpeakLiveScenarioRuntime,
  normalizeStorytellingSubtype,
  normalizeStorytellingVariation,
} from '../../domain/speakLive/storytellingScenario'
import {
  OPINIONS_DISCUSSIONS_SCENARIO_ID,
  dutchPersonaForOpinionsDiscussionsIfNeeded,
  hydrateOpinionsDiscussionsLearnerSituationSummary,
  maybeBuildOpinionsDiscussionsSpeakLiveScenarioRuntime,
  normalizeOpinionsDiscussionsSubtype,
  normalizeOpinionsDiscussionsVariation,
} from '../../domain/speakLive/opinionsDiscussionsScenario'
import {
  DOCTOR_PHARMACY_SCENARIO_ID,
  dutchPersonaForDoctorPharmacyIfNeeded,
  hydrateDoctorPharmacyLearnerSituationSummary,
  isDoctorPharmacySpeakLiveRuntimeOpeningStale,
  maybeBuildDoctorPharmacySpeakLiveScenarioRuntime,
  normalizeDoctorPharmacyHealthFocus,
} from '../../domain/speakLive/doctorPharmacyScenario'
import { reconcileDoctorPharmacyLiveRecap } from '../../domain/speakLive/doctorPharmacyLiveRecap'
import { reconcileSupermarketShopLiveRecap } from '../../domain/speakLive/supermarketShopLiveRecap'
import {
  applyScenarioRuntimeConfig,
  dutchPersonaForOrderingFoodIfNeeded,
  maybeBuildSpeakLiveScenarioRuntime,
  sanitizeOrderingFoodAssistantMessages,
  stripLeadingEnglishClauseFromOrderingFoodAssistantLine,
} from '../../domain/speakLive/orderingFoodScenario'
import {
  dutchPersonaForPublicTransportIfNeeded,
  hydratePublicTransportLearnerSituationSummary,
  isPublicTransportSpeakLiveRuntimeOpeningStale,
  maybeBuildPublicTransportSpeakLiveScenarioRuntime,
  normalizePublicTransportVariation,
  PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID,
} from '../../domain/speakLive/publicTransportScenario'
import { reconcilePublicTransportLiveRecap } from '../../domain/speakLive/publicTransportLiveRecap'
import {
  dutchPersonaForDirectionsIfNeeded,
  isDirectionsSpeakLiveRuntimeOpeningStale,
  maybeBuildDirectionsGettingSomewhereSpeakLiveScenarioRuntime,
} from '../../domain/speakLive/directionsGettingSomewhereScenario'
import {
  dutchPersonaForSupermarketShopIfNeeded,
  hydrateSupermarketShopLearnerSituationSummary,
  maybeBuildSupermarketShopSpeakLiveScenarioRuntime,
  SUPERMARKET_SHOP_SCENARIO_ID,
} from '../../domain/speakLive/supermarketShopScenario'
import {
  buildSpeakLiveSessionMedia,
  type SpeakLiveSessionMedia,
} from '../speak-live/speakLiveAssistantPresentation'
import {
  buildSpeakLiveGroundingDebugPayload,
  speakLiveGroundingDebugEnabled,
  speakLiveGroundingDebugLogFields,
} from '../../domain/speakLive/speakLiveGroundingDebug'
import { resolvePersonaIdForScenarioSlug } from '../../domain/scenarios/scenarioDefaults'
import type { AiConversationTurnRequest } from '../ai/contracts/AiConversationTurnRequest'
import type {
  AIResponseEnvelope,
  AssistantReplyEnvelope,
  ConversationMessage,
  ConversationMode,
  ConversationSummary,
  ConversationSurface,
  ConversationThread,
  FeedbackMode,
  PersonaConfig,
  ScenarioConfig,
  ScenarioSelectionOverrides,
} from '../../models/contracts'
import { buildLearningPersonalizationForTurn } from '../../domain/learningMemory/learningPersonalizationBuilders'
import { formatScenarioAdaptiveOneLiner } from '../../domain/learningMemory/scenarioLivePersonalizationPayload'
import {
  buildLanguageCoachSessionSteerPlan,
  formatLanguageCoachSessionFocusChip,
} from '../../domain/learningMemory/languageCoachProfilePersonalizationContext'
import { parseUserLearningProfileDocument } from '../../domain/learningMemory/userLearningProfileDocument'
import { rankWeakestSkillIdsFromProfile, weakSkillScenarioOverlapHits } from '../../domain/skills/scenarioSkillTags'
import { buildPracticeRecommendations } from '../../domain/learningMemory/learningMemoryRecommendationService'
import { SKILL_DEFINITIONS } from '../../domain/skills/skillDefinitions'
import { buildTalkSkillsPreview } from '../../domain/skills/skillPublicSummary'
import { buildSkillSystemDevDebugPayload } from '../../domain/skills/skillSystemDevDebugPayload'
import type { UserSkillProfile } from '../../domain/skills/skillTypes'
import { fireAndForgetLearningIngestion, ingestTextConversationSession } from '../learning-memory/learningMemoryPipeline'
import * as feedbackRepo from '../../repositories/feedbackRepository'
import * as messageRepo from '../../repositories/conversationMessageRepository'
import * as personaRepo from '../../repositories/personaRepository'
import * as scenarioRepo from '../../repositories/scenarioRepository'
import * as savedWordRepo from '../../repositories/savedWordRepository'
import * as threadRepo from '../../repositories/conversationThreadRepository'
import * as userLearningMemoryRepository from '../../repositories/userLearningMemoryRepository'
import * as trainingLoopPersistence from '../training-loops/trainingLoopPersistenceService'
import * as userRepo from '../../repositories/userRepository'
import { ApiError } from '../../shared/errors'
import { createModerationProvider } from '../moderation/createModerationProvider'
import { getSqlPool } from '../sql/sqlPool'
import { publishAppEvent } from '../serviceBus/serviceBusPublisher'
import {
  assertConversationBinaryBlobStorageConfigured,
  tryUploadConversationArtifact,
  uploadConversationBinaryArtifactRequired,
} from '../storage/blobStorageService'
import { getAzureSpeechLocale } from '../speech/pronunciationAssessmentConfig'
import {
  LIVE_CONVERSATION_PIPELINE_ID,
  liveConversationPipelineDiagnostics,
} from '../speak-live/liveConversationService'
import {
  buildLiveSpeechAssistantTurnMetadata,
  buildLiveSpeechLearnerTurnMetadata,
  preprocessLiveSpeechTranscript,
  resolveLearnerCefrForLiveTurn,
  sliceRecentForLiveSpeechTurn,
} from '../speak-live/liveSpeechTurnService'
import { ConversationPerf } from './conversationPerf'
import { getPersonaByIdCached, getScenarioByIdCached } from './scenarioPersonaCache'
import { buildSpeakLiveServerLatencyTrace } from '../speak-live/liveTurnServerLatencyTrace'
import type { LiveTurnLatencyTraceServer } from '../speak-live/liveTurnServerLatencyTrace'
import type { InvocationContext } from '@azure/functions'

function looksLikeGuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
}

function normalizeScenarioSlugForSpeakLive(slug: string): string {
  return slug.trim().toLowerCase().replace(/-/g, '_')
}

function speakLiveLearnerOpensFirst(
  conversationSurface: ConversationSurface,
  scenarioSlug: string,
  speakLiveInit: SpeakLivePersistedState | null | undefined
): boolean {
  if (conversationSurface !== 'speak_live') return false
  const slug = normalizeScenarioSlugForSpeakLive(scenarioSlug)
  if (slug === 'directions_getting_somewhere') {
    return speakLiveInit?.scenarioRuntimeConfig?.directionsLearnerSpeaksFirst === true
  }
  if (slug === 'train_station') {
    const rc = speakLiveInit?.scenarioRuntimeConfig
    return rc?.id === PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID && rc.publicTransportLearnerSpeaksFirst === true
  }
  return false
}

function applySpeakLiveRuntimeScenario(
  scenario: ScenarioConfig,
  speakLiveState: SpeakLivePersistedState | null | undefined
): ScenarioConfig {
  let rc = speakLiveState?.scenarioRuntimeConfig
  const slug = normalizeScenarioSlugForSpeakLive(scenario.slug)
  if (
    slug === SUPERMARKET_SHOP_SCENARIO_ID &&
    rc &&
    rc.context?.trim() &&
    !rc.learnerSituationSummary?.trim()
  ) {
    rc = hydrateSupermarketShopLearnerSituationSummary({ ...rc, id: SUPERMARKET_SHOP_SCENARIO_ID })
  }
  if (slug === BOOKING_RESERVATIONS_SCENARIO_ID && rc && rc.context?.trim() && !rc.learnerSituationSummary?.trim()) {
    rc = hydrateBookingReservationsLearnerSituationSummary({ ...rc, id: BOOKING_RESERVATIONS_SCENARIO_ID })
  }
  if (slug === STORE_SERVICE_ISSUE_SCENARIO_ID && rc && rc.context?.trim() && !rc.learnerSituationSummary?.trim()) {
    rc = hydrateStoreServiceIssueLearnerSituationSummary({ ...rc, id: STORE_SERVICE_ISSUE_SCENARIO_ID })
  }
  if (slug === WORK_COLLEAGUE_INTERACTION_SCENARIO_ID && rc && rc.context?.trim() && !rc.learnerSituationSummary?.trim()) {
    rc = hydrateWorkColleagueInteractionLearnerSituationSummary({ ...rc, id: WORK_COLLEAGUE_INTERACTION_SCENARIO_ID })
  }
  if (slug === HOUSING_LANDLORD_SCENARIO_ID && rc && rc.context?.trim() && !rc.learnerSituationSummary?.trim()) {
    rc = hydrateHousingLandlordLearnerSituationSummary({ ...rc, id: HOUSING_LANDLORD_SCENARIO_ID })
  }
  if (slug === DOCTOR_PHARMACY_SCENARIO_ID && rc && rc.context?.trim() && !rc.learnerSituationSummary?.trim()) {
    rc = hydrateDoctorPharmacyLearnerSituationSummary({ ...rc, id: DOCTOR_PHARMACY_SCENARIO_ID })
  }
  if (slug === PHONE_CALL_SCENARIO_ID && rc && rc.context?.trim() && !rc.learnerSituationSummary?.trim()) {
    rc = hydratePhoneCallLearnerSituationSummary({ ...rc, id: PHONE_CALL_SCENARIO_ID })
  }
  if (slug === SMALL_TALK_SCENARIO_ID && rc && rc.context?.trim() && !rc.learnerSituationSummary?.trim()) {
    rc = hydrateSmallTalkLearnerSituationSummary({ ...rc, id: SMALL_TALK_SCENARIO_ID })
  }
  if (slug === MEETING_NEW_PEOPLE_SCENARIO_ID && rc && rc.context?.trim() && !rc.learnerSituationSummary?.trim()) {
    rc = hydrateMeetingNewPeopleLearnerSituationSummary({ ...rc, id: MEETING_NEW_PEOPLE_SCENARIO_ID })
  }
  if (slug === PARTY_SOCIAL_SCENARIO_ID && rc && rc.context?.trim() && !rc.learnerSituationSummary?.trim()) {
    rc = hydratePartySocialLearnerSituationSummary({ ...rc, id: PARTY_SOCIAL_SCENARIO_ID })
  }
  if (slug === EXPLAINING_SOMETHING_SCENARIO_ID && rc && rc.context?.trim() && !rc.learnerSituationSummary?.trim()) {
    rc = hydrateExplainingSomethingLearnerSituationSummary({ ...rc, id: EXPLAINING_SOMETHING_SCENARIO_ID })
  }
  if (slug === STORYTELLING_SCENARIO_ID && rc && rc.context?.trim() && !rc.learnerSituationSummary?.trim()) {
    rc = hydrateStorytellingLearnerSituationSummary({ ...rc, id: STORYTELLING_SCENARIO_ID })
  }
  if (slug === OPINIONS_DISCUSSIONS_SCENARIO_ID && rc && rc.context?.trim() && !rc.learnerSituationSummary?.trim()) {
    rc = hydrateOpinionsDiscussionsLearnerSituationSummary({ ...rc, id: OPINIONS_DISCUSSIONS_SCENARIO_ID })
  }
  if (slug === 'train_station' && rc?.id === PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID) {
    rc = hydratePublicTransportLearnerSituationSummary(rc)
  }
  return applyScenarioRuntimeConfig(scenario, rc)
}

function normalizeScenarioOverrideVariation(raw: string | null | undefined, scenarioSlug: string): string | null {
  const slug = scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  if (slug === 'directions_getting_somewhere') {
    switch ((raw ?? '').trim().toLowerCase()) {
      case 'ask':
      case 'asking':
      case 'asking_for_directions':
        return 'asking_for_directions'
      case 'understand':
      case 'understanding':
      case 'understanding_instructions':
        return 'understanding_instructions'
      case 'confirm':
      case 'confirming':
      case 'confirming_route':
        return 'confirming_route'
      default:
        return null
    }
  }
  if (slug === 'supermarket_shop') {
    switch ((raw ?? '').trim().toLowerCase()) {
      case 'asking_where':
      case 'asking_where_something_is':
      case 'location':
        return 'asking_where_something_is'
      case 'checkout':
      case 'paying':
      case 'paying_checkout':
        return 'paying_checkout'
      case 'product':
      case 'product_questions':
        return 'product_questions'
      default:
        return null
    }
  }
  if (slug === 'doctor_pharmacy') {
    const x = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
    if (x === 'symptom' || x === 'symptoms') return 'symptoms'
    if (x === 'help' || x === 'asking' || x === 'asking_for_help') return 'asking_for_help'
    if (x === 'instructions' || x === 'understanding' || x === 'understanding_instructions')
      return 'understanding_instructions'
    return null
  }
  if (slug === 'booking_reservations') {
    switch ((raw ?? '').trim().toLowerCase().replace(/-/g, '_')) {
      case 'availability':
      case 'asking_availability':
        return 'asking_availability'
      case 'booking':
      case 'making_booking':
        return 'making_booking'
      case 'confirm':
      case 'confirming':
      case 'confirming_details':
        return 'confirming_details'
      default:
        return null
    }
  }
  if (slug === 'store_service_issue') {
    const x = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
    if (x === 'return' || x === 'returning' || x === 'returning_item' || x === 'retour') return 'returning_item'
    if (x === 'complaint' || x === 'klacht') return 'complaint'
    if (x === 'explain' || x === 'explaining' || x === 'explaining_issue' || x === 'defect' || x === 'problem') {
      return 'explaining_issue'
    }
    return null
  }
  if (slug === 'work_colleague_interaction') {
    const x = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
    if (x === 'simple' || x === 'workplace' || x === 'simple_workplace' || x === 'simple_workplace_conversation') {
      return 'simple_workplace_conversation'
    }
    if (x === 'help' || x === 'asking' || x === 'asking_for_help') return 'asking_for_help'
    if (x === 'clarify' || x === 'clarifying' || x === 'clarifying_tasks' || x === 'tasks') return 'clarifying_tasks'
    return null
  }
  if (slug === 'housing_landlord') {
    const x = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
    if (x === 'report' || x === 'issue' || x === 'reporting' || x === 'reporting_issue' || x === 'repair') {
      return 'reporting_issue'
    }
    if (x === 'rent' || x === 'contract' || x === 'asking_rent_contract' || x === 'huur' || x === 'borg') {
      return 'asking_rent_contract'
    }
    return null
  }
  if (slug === PHONE_CALL_SCENARIO_ID) {
    return normalizePhoneCallVariation(raw ?? undefined) ?? null
  }
  if (slug === SMALL_TALK_SCENARIO_ID) {
    return normalizeSmallTalkVariation(raw ?? undefined) ?? null
  }
  if (slug === MEETING_NEW_PEOPLE_SCENARIO_ID) {
    return normalizeMeetingNewPeopleVariation(raw ?? undefined) ?? null
  }
  if (slug === PARTY_SOCIAL_SCENARIO_ID) {
    return normalizePartySocialVariation(raw ?? undefined) ?? null
  }
  if (slug === EXPLAINING_SOMETHING_SCENARIO_ID) {
    return normalizeExplainingSomethingVariation(raw ?? undefined) ?? null
  }
  if (slug === STORYTELLING_SCENARIO_ID) {
    return normalizeStorytellingVariation(raw ?? undefined) ?? null
  }
  if (slug === OPINIONS_DISCUSSIONS_SCENARIO_ID) {
    return normalizeOpinionsDiscussionsVariation(raw ?? undefined) ?? null
  }
  if (slug === 'train_station') {
    const x = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
    switch (x) {
      case 'route':
      case 'route_and_platform':
      case 'platform':
      case 'perron':
        return 'route_and_platform'
      case 'ticket':
      case 'buying_ticket':
      case 'kaartje':
      case 'tickets':
        return 'buying_ticket'
      case 'delay':
      case 'delays':
      case 'delays_and_disruptions':
      case 'disruption':
      case 'vertraging':
        return 'delays_and_disruptions'
      default:
        return null
    }
  }
  switch ((raw ?? '').trim().toLowerCase()) {
    case 'simple':
    case 'simple_order':
      return 'simple_order'
    case 'dietary':
    case 'dietary_request':
      return 'dietary_request'
    case 'recommendation':
      return 'recommendation'
    default:
      return null
  }
}

function normalizeScenarioOverrideSubType(raw: string | null | undefined, scenarioSlug: string): string | null {
  const slug = scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (slug === 'directions_getting_somewhere') {
    const allowed = new Set([
      'station',
      'bus_stop',
      'tram_stop',
      'supermarket',
      'city_centre',
      'pharmacy',
      'toilet',
      'museum',
      'office_address',
      'platform_exit_entrance',
      'town_hall',
      'restaurant',
      'cafe',
      'hotel',
    ])
    return allowed.has(v) ? v : null
  }
  if (slug === 'supermarket_shop') {
    return v === 'supermarket' || v === 'convenience_store' || v === 'pharmacy_style' || v === 'general_retail'
      ? v
      : null
  }
  if (slug === 'train_station') {
    if (v === 'trein') return 'train'
    if (v === 'train' || v === 'bus' || v === 'tram' || v === 'metro') return v
    return null
  }
  if (slug === 'booking_reservations') {
    if (v === 'restaurant' || v === 'restaurant_booking') return 'restaurant_booking'
    if (v === 'hairdresser' || v === 'hair' || v === 'hairdresser_booking' || v === 'salon') return 'hairdresser_booking'
    if (v === 'appointment' || v === 'appointment_booking' || v === 'desk' || v === 'office') return 'appointment_booking'
    return null
  }
  if (slug === 'doctor_pharmacy') {
    if (v === 'doctor' || v === 'doctor_visit' || v === 'huisarts' || v === 'gp') return 'doctor_visit'
    if (v === 'pharmacy' || v === 'apotheek' || v === 'chemist') return 'pharmacy'
    if (v === 'clinic' || v === 'clinic_reception' || v === 'reception' || v === 'balie') return 'clinic_reception'
    return null
  }
  if (slug === 'store_service_issue') {
    if (v === 'return' || v === 'returns' || v === 'store_return' || v === 'retour') return 'store_return'
    if (v === 'service' || v === 'service_issue' || v === 'service_desk' || v === 'klantenservice') return 'service_issue'
    if (v === 'product' || v === 'product_problem' || v === 'defect') return 'product_problem'
    return null
  }
  if (slug === 'work_colleague_interaction') {
    if (v === 'colleague' || v === 'colleague_chat' || v === 'chat') return 'colleague_chat'
    if (v === 'team' || v === 'team_task') return 'team_task'
    if (v === 'manager' || v === 'lead' || v === 'manager_or_lead_request' || v === 'boss') return 'manager_or_lead_request'
    return null
  }
  if (slug === 'housing_landlord') {
    if (v === 'landlord' || v === 'verhuurder' || v === 'owner') return 'landlord'
    if (v === 'rental_agency' || v === 'agency' || v === 'makelaar' || v === 'verhuurmakelaar') return 'rental_agency'
    if (v === 'building_manager' || v === 'beheer' || v === 'gebouw' || v === 'vve') return 'building_manager'
    return null
  }
  if (slug === PHONE_CALL_SCENARIO_ID) {
    return normalizePhoneCallSubtype(raw ?? undefined) ?? null
  }
  if (slug === SMALL_TALK_SCENARIO_ID) {
    return normalizeSmallTalkSubtype(raw ?? undefined) ?? null
  }
  if (slug === MEETING_NEW_PEOPLE_SCENARIO_ID) {
    return normalizeMeetingNewPeopleSubtype(raw ?? undefined) ?? null
  }
  if (slug === PARTY_SOCIAL_SCENARIO_ID) {
    return normalizePartySocialSubtype(raw ?? undefined) ?? null
  }
  if (slug === EXPLAINING_SOMETHING_SCENARIO_ID) {
    return normalizeExplainingSomethingSubtype(raw ?? undefined) ?? null
  }
  if (slug === STORYTELLING_SCENARIO_ID) {
    return normalizeStorytellingSubtype(raw ?? undefined) ?? null
  }
  if (slug === OPINIONS_DISCUSSIONS_SCENARIO_ID) {
    return normalizeOpinionsDiscussionsSubtype(raw ?? undefined) ?? null
  }
  return v === 'cafe' || v === 'restaurant' || v === 'takeaway' ? v : null
}

function isDutchSpeakLiveServiceScene(slug: string): boolean {
  const n = slug.trim().toLowerCase().replace(/-/g, '_')
  return (
    n === 'ordering_food' ||
    n === 'supermarket_shop' ||
    n === 'booking_reservations' ||
    n === 'store_service_issue' ||
    n === 'work_colleague_interaction' ||
    n === 'housing_landlord' ||
    n === 'doctor_pharmacy' ||
    n === PHONE_CALL_SCENARIO_ID ||
    n === SMALL_TALK_SCENARIO_ID ||
    n === MEETING_NEW_PEOPLE_SCENARIO_ID ||
    n === PARTY_SOCIAL_SCENARIO_ID ||
    n === EXPLAINING_SOMETHING_SCENARIO_ID ||
    n === STORYTELLING_SCENARIO_ID ||
    n === OPINIONS_DISCUSSIONS_SCENARIO_ID
  )
}

function polishSpeakLivePersonaForDisplay(
  slug: string,
  persona: PersonaConfig,
  hydratedScenario?: ScenarioConfig | null
): PersonaConfig {
  const withPt = dutchPersonaForPublicTransportIfNeeded(slug, hydratedScenario?.runtimeConfig ?? null, persona)
  return dutchPersonaForOpinionsDiscussionsIfNeeded(
    slug,
    hydratedScenario?.runtimeConfig ?? null,
    dutchPersonaForStorytellingIfNeeded(
    slug,
    hydratedScenario?.runtimeConfig ?? null,
    dutchPersonaForExplainingSomethingIfNeeded(
    slug,
    hydratedScenario?.runtimeConfig ?? null,
    dutchPersonaForPartySocialIfNeeded(
    slug,
    hydratedScenario?.runtimeConfig ?? null,
    dutchPersonaForMeetingNewPeopleIfNeeded(
      slug,
      hydratedScenario?.runtimeConfig ?? null,
      dutchPersonaForSmallTalkIfNeeded(
        slug,
        hydratedScenario?.runtimeConfig ?? null,
        dutchPersonaForPhoneCallIfNeeded(
          slug,
          hydratedScenario?.runtimeConfig ?? null,
          dutchPersonaForDirectionsIfNeeded(
            slug,
            dutchPersonaForSupermarketShopIfNeeded(
              slug,
              dutchPersonaForBookingReservationsIfNeeded(
                slug,
                dutchPersonaForStoreServiceIssueIfNeeded(
                  slug,
                  dutchPersonaForWorkColleagueInteractionIfNeeded(
                    slug,
                    hydratedScenario?.runtimeConfig ?? null,
                    dutchPersonaForHousingLandlordIfNeeded(
                      slug,
                      hydratedScenario?.runtimeConfig ?? null,
                      dutchPersonaForDoctorPharmacyIfNeeded(slug, dutchPersonaForOrderingFoodIfNeeded(slug, withPt)),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  ),
  ),
  ),
  )
}

/** Fire-and-forget Speak Live work that should finish before the session is ended. */
const pendingLiveUploads = new Map<string, Promise<void>[]>()

function trackLiveUpload(threadId: string, p: Promise<void>): void {
  let arr = pendingLiveUploads.get(threadId)
  if (!arr) {
    arr = []
    pendingLiveUploads.set(threadId, arr)
  }
  arr.push(p)
  void p.finally(() => {
    const cur = pendingLiveUploads.get(threadId)
    if (!cur) return
    const idx = cur.indexOf(p)
    if (idx >= 0) cur.splice(idx, 1)
    if (cur.length === 0) pendingLiveUploads.delete(threadId)
  })
}

/**
 * Soft-deadline for {@link drainLiveUploads}.
 *
 * Background per-turn voice prep (Azure Pronunciation Assessment) is an *optimization* — when it
 * is finished by end-of-session, the post-session evaluation lane reuses the cached prep instead
 * of recomputing. If the user clicks End while one or more prep promises are still mid-flight,
 * blocking the HTTP response on `Promise.allSettled([...])` could keep the "Ending session…"
 * spinner up for minutes (one Azure call ≈ 5–30s × N turns). The post-session evaluator already
 * has a clean fallback path (recompute prep on cache miss in `assessPostSessionUserTurn`), so we
 * give the drain a small budget and then move on.
 *
 * Tunable via `LIVE_UPLOAD_DRAIN_TIMEOUT_MS` (defaults to 4000ms — long enough that a healthy
 * prep finishes in time without making the user wait on a stuck Azure call).
 */
const LIVE_UPLOAD_DRAIN_DEFAULT_TIMEOUT_MS = 4000

function liveUploadDrainTimeoutMs(): number {
  const raw = process.env.LIVE_UPLOAD_DRAIN_TIMEOUT_MS
  if (!raw) return LIVE_UPLOAD_DRAIN_DEFAULT_TIMEOUT_MS
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) return LIVE_UPLOAD_DRAIN_DEFAULT_TIMEOUT_MS
  return Math.min(30_000, parsed)
}

async function drainLiveUploads(threadId: string): Promise<void> {
  const arr = pendingLiveUploads.get(threadId)
  if (!arr || arr.length === 0) return
  const drain = Promise.allSettled([...arr]).then(() => undefined)
  const timeoutMs = liveUploadDrainTimeoutMs()
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null
  let timedOut = false
  const timeoutPromise = new Promise<void>((resolve) => {
    timeoutHandle = setTimeout(() => {
      timedOut = true
      resolve()
    }, timeoutMs)
  })
  try {
    await Promise.race([drain, timeoutPromise])
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle)
  }
  if (timedOut) {
    aiLogInfo('live_upload_drain_timeout', { threadId, pendingCount: arr.length, timeoutMs })
  }
  pendingLiveUploads.delete(threadId)
}

async function prepareLiveTurnVoicePrepInBackground(params: {
  pool: sql.ConnectionPool
  threadId: string
  userMessage: ConversationMessage
  audio: Buffer
  mimeType: string
}): Promise<void> {
  const meta = (params.userMessage.metadata ?? {}) as Record<string, unknown>
  const transcriptRaw =
    typeof meta.transcriptRaw === 'string' && meta.transcriptRaw.trim() ? meta.transcriptRaw.trim() : params.userMessage.content.trim()
  const transcriptNormalizedMeta =
    typeof meta.transcriptNormalized === 'string' && meta.transcriptNormalized.trim() ? meta.transcriptNormalized.trim() : null
  const blobPath = typeof meta.learnerAudioBlobPath === 'string' ? meta.learnerAudioBlobPath : null
  const referenceForPa = (transcriptNormalizedMeta ?? transcriptRaw).trim() || params.userMessage.content.trim()
  if (!referenceForPa || params.audio.length < 32) return

  try {
    const { prepareLiveTurnVoicePrep } = await import('../speak-live/liveTurnVoicePrepService')
    const prep = await prepareLiveTurnVoicePrep({
      audio: params.audio,
      mimeType: params.mimeType,
      transcriptRaw,
      transcriptNormalizedMeta,
      referenceForPa,
      blobPath,
      source: 'background_live',
      downloadOk: Boolean(blobPath),
      locale: getAzureSpeechLocale(),
      turnId: params.userMessage.id,
      turnRecordedAtMs: (() => {
        const t = Date.parse(params.userMessage.createdAt)
        return Number.isFinite(t) ? t : null
      })(),
    })
    await messageRepo.updateMessageMetadata(params.pool, params.userMessage.id, {
      liveTurnVoicePrepV1: prep,
    })
  } catch (e) {
    aiLogInfo('speak_live_turn_voice_prep_skipped', {
      threadId: params.threadId,
      userMessageId: params.userMessage.id,
      reason: e instanceof Error ? e.message : String(e),
    })
  }
}

type SpeakLiveLearnerBlobUploadResult = { ok: true } | { ok: false; err: unknown }

function shouldTreatSpeakLiveLearnerBlobUploadAsNonBlocking(err: unknown): boolean {
  const profile = (process.env.APP_PROFILE ?? 'LocalMock').trim()
  if (profile === 'CloudDev') return false
  const msg = err instanceof Error ? err.message : String(err)
  if (!msg) return false
  return /azurite|api version|x-ms-version|not supported by azurite/i.test(msg)
}

function assertSpeakLiveLearnerBlobUploadOk(r: SpeakLiveLearnerBlobUploadResult): asserts r is { ok: true } {
  if (r.ok) return
  if (shouldTreatSpeakLiveLearnerBlobUploadAsNonBlocking(r.err)) {
    const msg = r.err instanceof Error ? r.err.message : String(r.err)
    console.warn(`[speak-live] learner audio upload skipped in local profile: ${msg}`)
    return
  }
  const e = r.err
  if (e instanceof ApiError) throw e
  if (e instanceof Error) throw e
  throw new Error(String(e))
}

function mapAiErrorToApi(e: unknown): never {
  if (e instanceof AiValidationError) {
    throw new ApiError(502, 'LLM_ERROR', 'Model returned invalid structured output')
  }
  if (e instanceof AiProviderError) {
    throw new ApiError(502, 'LLM_ERROR', e.message)
  }
  if (e instanceof AiTimeoutError) {
    throw new ApiError(504, 'LLM_ERROR', e.message)
  }
  if (e instanceof AiConfigurationError) {
    throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', e.message)
  }
  throw e
}

type PreparedAssistantTurn = {
  turnRequest: AiConversationTurnRequest
  isSpeakLive: boolean
  speakLivePrevState: SpeakLivePersistedState | null
  groundingPatch: GroundedSpeakLivePatch | null
  verifiedGroundingBlock: string | null
  threadSummaryForLlm: string | null
}

/** Shared by JSON reply path and NDJSON stream (Speak Live must use reply-only prompts, not plain streaming). */
function prepareAssistantTurnRequest(params: {
  thread: ConversationThread
  scenario: ScenarioConfig
  persona: PersonaConfig
  userMessage: ConversationMessage
  recent: ConversationMessage[]
  userText: string
  /** Speak Live: optional client CEFR hint (`inputMeta.learnerLevelCefr`). */
  learnerLevelCefrHint?: string | null
}): PreparedAssistantTurn {
  const isSpeakLive = params.thread.conversationSurface === 'speak_live'
  const speakLivePrevState = isSpeakLive
    ? parseSpeakLiveState(params.thread.speakLiveStateJson) ?? defaultSpeakLiveState()
    : null

  const recentForLlm = isSpeakLive ? sliceRecentForLiveSpeechTurn(params.recent) : params.recent
  const learnerLevelCefr =
    isSpeakLive && speakLivePrevState
      ? resolveLearnerCefrForLiveTurn({
          threadSummaryText: params.thread.summaryText,
          requestHint: params.learnerLevelCefrHint,
        })
      : null

  const threadSummaryForLlm =
    isSpeakLive && speakLivePrevState
      ? [params.thread.summaryText, speakLivePrevState.rollingSummaryEnglish].filter(Boolean).join('\n---\n').slice(0, 6000) ||
        null
      : params.thread.summaryText

  const groundingPatch = isSpeakLive
    ? groundSpeakLiveUserTurn(params.scenario.slug, params.userText.trim(), params.userMessage.id)
    : null

  const slotPromptPrev =
    isSpeakLive && speakLivePrevState
      ? formatTrainStationSlotBlock(speakLivePrevState.scenarioSessionState ?? null)
      : null

  const groundingFormatted = groundingPatch ? formatGroundingForPrompt(groundingPatch) : null
  const verifiedGroundingBlock =
    isSpeakLive && (groundingFormatted || slotPromptPrev)
      ? [groundingFormatted, slotPromptPrev].filter(Boolean).join('\n\n') || null
      : null

  const turnRequest: AiConversationTurnRequest = {
    threadId: params.thread.id,
    scenario: params.scenario,
    persona: params.persona,
    mode: params.thread.mode,
    feedbackMode: params.thread.feedbackMode,
    threadSummary: threadSummaryForLlm,
    recentMessages: recentForLlm,
    userText: params.userText,
    speakLive:
      isSpeakLive && speakLivePrevState
        ? {
            state: speakLivePrevState,
            goalTitles: params.scenario.goals,
            scenarioTitle: params.scenario.title,
            verifiedGroundingBlock,
            userMessageId: params.userMessage.id,
            learnerLevelCefr,
          }
        : undefined,
  }

  return {
    turnRequest,
    isSpeakLive,
    speakLivePrevState,
    groundingPatch,
    verifiedGroundingBlock,
    threadSummaryForLlm,
  }
}

/**
 * Loads {@link UserLearningProfile} and attaches {@link AiConversationTurnRequest.learningPersonalization}.
 *
 * @remarks **Speak Live structured scenes:** personalization attaches once `totalSessionsObserved >= 2`,
 * except Language Coach which may use memory earlier. **Text surface:** only Language Coach receives
 * cross-session blocks (other text scenarios stay unchanged to avoid prompt drift).
 */
async function maybeAttachLearningPersonalization(params: {
  pool: sql.ConnectionPool
  externalUserId: string
  turnRequest: AiConversationTurnRequest
}): Promise<void> {
  const isLc = isLanguageCoachScenarioSlug(params.turnRequest.scenario.slug)
  if (!params.turnRequest.speakLive && !isLc) return
  const uid = await userRepo.getUserInternalId(params.pool, params.externalUserId)
  if (!uid) return
  const raw = await userLearningMemoryRepository.getUserLearningProfileJson(params.pool, uid)
  const doc = parseUserLearningProfileDocument(raw, uid)
  const slugNorm = params.turnRequest.scenario.slug.trim().toLowerCase().replace(/-/g, '_')
  if (doc.totalSessionsObserved < 2 && !isLc) return
  const p = buildLearningPersonalizationForTurn({
    profile: doc,
    scenarioSlug: slugNorm,
    scenarioId: params.turnRequest.scenario.id,
    isLanguageCoach: isLc,
  })
  params.turnRequest.learningPersonalization = {
    coachBlockEnglish: p.coachPersistentEnglish,
    scenarioBlockEnglish: p.scenarioAdaptationEnglish,
    scenarioMicroHintEnglish: p.scenarioMicroHintEnglish,
    scenarioLivePersonalization: p.scenarioLivePersonalization,
  }
}

async function persistAssistantAndSpeakLiveTurn(params: {
  pool: sql.ConnectionPool
  thread: ConversationThread
  scenario: ScenarioConfig
  userMessage: ConversationMessage
  userTextTrimmed: string
  reply: AssistantReplyEnvelope
  assistantText: string
  mergedSpeakLiveSignals: SpeakLiveSignals | null | undefined
  isSpeakLive: boolean
  speakLivePrevState: SpeakLivePersistedState | null
  nextSpeakLiveState: SpeakLivePersistedState | null
  turnRequest: AiConversationTurnRequest
  verifiedGroundingBlock: string | null
  threadSummaryForLlm: string | null
  recent: ConversationMessage[]
}): Promise<{ assistantMessage: ConversationMessage; updated: ConversationThread }> {
  const { pool, thread, scenario, userMessage, reply, assistantText } = params

  const assistantMetadata: Record<string, unknown> = {
    scenarioProgress: reply.scenarioProgress,
    shouldConversationEnd: reply.shouldConversationEnd,
    ...(params.isSpeakLive
      ? {
          enrichmentPending: false,
          enrichmentComplete: true,
          liveConversationPipeline: LIVE_CONVERSATION_PIPELINE_ID,
          deepEvaluationDeferred: true,
        }
      : { enrichmentPending: true }),
  }
  if (params.nextSpeakLiveState) {
    assistantMetadata.speakLivePhase = params.nextSpeakLiveState.phase
    assistantMetadata.speakLiveSignals = params.mergedSpeakLiveSignals ?? null
    if (reply.trainTurnResponse) {
      assistantMetadata.trainTurnResponse = reply.trainTurnResponse
    }
  }

  const assistantMessage = await messageRepo.insertMessage(pool, {
    threadId: thread.id,
    sender: 'assistant',
    messageType: 'text',
    content: assistantText,
    metadata: assistantMetadata,
  })

  let speakLivePersistedForThread = params.nextSpeakLiveState
  if (
    params.nextSpeakLiveState &&
    params.isSpeakLive &&
    scenario.slug === 'train-station' &&
    params.speakLivePrevState
  ) {
    const mergedSlots = mergeTrainStationScenarioSession({
      prev: params.speakLivePrevState.scenarioSessionState ?? undefined,
      sessionId: thread.id,
      scenarioId: thread.scenarioId,
      locale: 'nl-NL',
      mode: thread.mode,
      status: thread.status,
      userMessageId: userMessage.id,
      userText: params.userTextTrimmed,
      assistantMessageId: assistantMessage.id,
      assistantText,
    })
    speakLivePersistedForThread = { ...params.nextSpeakLiveState, scenarioSessionState: mergedSlots }
  }

  let slToPersist: SpeakLivePersistedState | null = speakLivePersistedForThread
  if (slToPersist && params.isSpeakLive) {
    slToPersist = {
      ...slToPersist,
      rollingSummaryEnglish: appendCumulativeSpeakLiveMemoryTurn({
        scenarioSlug: scenario.slug,
        rollingSummaryEnglish: slToPersist.rollingSummaryEnglish,
        userTextTrimmed: params.userTextTrimmed,
        assistantTextTrimmed: params.assistantText,
      }),
    }
  }
  if (slToPersist && params.isSpeakLive && scenario.slug === 'language_coach') {
    slToPersist = applyLanguageCoachAssistantTurnToState(slToPersist, assistantText)
  }
  if (slToPersist && params.isSpeakLive && speakLiveGroundingDebugEnabled()) {
    try {
      const debugPayload = buildSpeakLiveGroundingDebugPayload({
        turnRequest: params.turnRequest,
        reply,
        mergedSpeakLiveSignals: params.mergedSpeakLiveSignals ?? null,
        rawUserText: params.userTextTrimmed,
        userMessageId: userMessage.id,
        assistantText,
        verifiedGroundingBlock: params.verifiedGroundingBlock,
        threadSummaryForLlmPreview: (params.threadSummaryForLlm ?? '').slice(0, 1600),
        slotStateAfter: slToPersist.scenarioSessionState ?? null,
        scenario,
        recentMessages: params.recent,
      })
      slToPersist = { ...slToPersist, lastGroundingDebug: debugPayload }
      aiLogInfo('speak_live_grounding_debug', {
        threadId: thread.id,
        userMessageId: userMessage.id,
        ...speakLiveGroundingDebugLogFields(debugPayload),
      })
    } catch (e) {
      aiLogError('speak_live_grounding_debug_build_failed', e, { threadId: thread.id })
    }
  } else if (slToPersist) {
    const { lastGroundingDebug: _lg, ...rest } = slToPersist
    void _lg
    slToPersist = rest as SpeakLivePersistedState
  }

  if (slToPersist) {
    const summaryOut = slToPersist.rollingSummaryEnglish.trim() || thread.summaryText || null
    await threadRepo.updateThreadState(pool, thread.id, {
      currentStage: threadCurrentStageFromPhase(slToPersist.phase),
      summaryText: summaryOut,
      speakLiveStateJson: serializeSpeakLiveState(slToPersist),
    })
  } else {
    await threadRepo.updateThreadState(pool, thread.id, {
      currentStage: reply.scenarioProgress?.stage ?? thread.currentStage,
    })
  }

  const updated = (await threadRepo.getThreadById(pool, thread.id))!

  void Promise.all([
    publishAppEvent('ConversationTurnCompleted', {
      threadId: thread.id,
      messageId: assistantMessage.id,
    }),
  ]).catch((e) => aiLogError('conversation_turn_sidefx_failed', e, { threadId: thread.id }))

  return { assistantMessage, updated }
}

async function requirePool(): Promise<sql.ConnectionPool> {
  const pool = await getSqlPool()
  if (!pool) throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'SQL database not configured')
  return pool
}

async function resolveScenario(pool: sql.ConnectionPool, scenarioIdOrSlug: string): Promise<ScenarioConfig> {
  if (looksLikeGuid(scenarioIdOrSlug)) {
    try {
      return await scenarioRepo.getScenarioById(pool, scenarioIdOrSlug)
    } catch {
      /* fall through slug */
    }
  }
  return scenarioRepo.getScenarioBySlug(pool, scenarioIdOrSlug)
}

/** SQL Server duplicate key / unique index violation (e.g. concurrent `startConversation`). */
function isSqlServerUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const n = (err as { number?: number }).number
  if (n === 2627 || n === 2601) return true
  const msg = String((err as Error).message ?? '')
  return /UNIQUE KEY constraint|duplicate key/i.test(msg)
}

async function resolvePersona(
  pool: sql.ConnectionPool,
  scenario: ScenarioConfig
): Promise<PersonaConfig> {
  const mapped = resolvePersonaIdForScenarioSlug(scenario.slug)
  if (mapped) {
    return personaRepo.getPersonaById(pool, mapped)
  }
  throw new ApiError(500, 'INTERNAL', `No default persona mapped for scenario ${scenario.slug}`)
}

function speakLiveClientMediaForThread(thread: ConversationThread): { speakLive: SpeakLiveSessionMedia } | Record<string, never> {
  if (thread.conversationSurface !== 'speak_live') return {}
  return { speakLive: buildSpeakLiveSessionMedia() }
}

export async function startConversation(params: {
  externalUserId: string
  scenarioId: string
  /** Required for `text` threads. For `speak_live`, derived server-side when omitted. */
  mode?: ConversationMode
  feedbackMode: FeedbackMode
  conversationSurface?: ConversationSurface
  /** Optional CEFR hint for Speak Live internal coaching strategy (defaults A2). */
  cefrLevel?: string | null
  /** Optional Speak Live runtime selection overrides for dynamic scenarios. */
  scenarioOverrides?: ScenarioSelectionOverrides | null
  /** `language_coach` only — session knobs (goal, feedback cadence, coach/persona style). */
  languageCoach?: LanguageCoachStartInput
}): Promise<{
  thread: ConversationThread
  messages: ConversationMessage[]
  scenario: ScenarioConfig
  persona: PersonaConfig
  speakLive?: SpeakLiveSessionMedia
}> {
  const pool = await requirePool()
  const userInternalId = await userRepo.ensureUser(pool, params.externalUserId)
  const scenario = await resolveScenario(pool, params.scenarioId)
  const persona = await resolvePersona(pool, scenario)

  const requestedSurface: ConversationSurface = params.conversationSurface ?? 'text'
  const requestedOverrideSubType = normalizeScenarioOverrideSubType(
    params.scenarioOverrides?.subType ?? null,
    scenario.slug
  )
  const requestedOverrideVariation = normalizeScenarioOverrideVariation(
    params.scenarioOverrides?.variation ?? null,
    scenario.slug
  )
  const requestedOverrideDestination =
    typeof params.scenarioOverrides?.destination === 'string' && params.scenarioOverrides.destination.trim()
      ? params.scenarioOverrides.destination.trim().slice(0, 120)
      : null
  const slugForOverrides = normalizeScenarioSlugForSpeakLive(scenario.slug)
  const requestedOverrideBookingDetailFocus =
    slugForOverrides === BOOKING_RESERVATIONS_SCENARIO_ID &&
    typeof params.scenarioOverrides?.detailFocus === 'string' &&
    params.scenarioOverrides.detailFocus.trim()
      ? normalizeBookingDetailFocus(params.scenarioOverrides.detailFocus.trim()) ?? null
      : null
  const requestedOverrideDoctorHealthFocus =
    slugForOverrides === DOCTOR_PHARMACY_SCENARIO_ID &&
    typeof params.scenarioOverrides?.detailFocus === 'string' &&
    params.scenarioOverrides.detailFocus.trim()
      ? normalizeDoctorPharmacyHealthFocus(params.scenarioOverrides.detailFocus.trim()) ?? null
      : null
  const requestedOverrideStoreDetailFocus =
    slugForOverrides === STORE_SERVICE_ISSUE_SCENARIO_ID &&
    typeof params.scenarioOverrides?.detailFocus === 'string' &&
    params.scenarioOverrides.detailFocus.trim()
      ? normalizeStoreServiceIssueDetailFocus(params.scenarioOverrides.detailFocus.trim()) ?? null
      : null
  const requestedOverrideWorkColleagueTaskFocus =
    slugForOverrides === WORK_COLLEAGUE_INTERACTION_SCENARIO_ID &&
    typeof params.scenarioOverrides?.detailFocus === 'string' &&
    params.scenarioOverrides.detailFocus.trim()
      ? normalizeWorkColleagueTaskFocus(params.scenarioOverrides.detailFocus.trim()) ?? null
      : null
  const requestedOverrideHousingLandlordFocus =
    slugForOverrides === HOUSING_LANDLORD_SCENARIO_ID &&
    typeof params.scenarioOverrides?.detailFocus === 'string' &&
    params.scenarioOverrides.detailFocus.trim()
      ? (() => {
          const df = params.scenarioOverrides!.detailFocus!.trim()
          const v = requestedOverrideVariation
          if (v === 'reporting_issue' || v === 'asking_rent_contract') {
            return normalizeHousingLandlordDetailFocus(df, v) ?? null
          }
          return (
            normalizeHousingLandlordDetailFocus(df, 'reporting_issue') ??
            normalizeHousingLandlordDetailFocus(df, 'asking_rent_contract') ??
            null
          )
        })()
      : null
  const requestedOverridePhoneCallTopic =
    slugForOverrides === PHONE_CALL_SCENARIO_ID &&
    typeof params.scenarioOverrides?.detailFocus === 'string' &&
    params.scenarioOverrides.detailFocus.trim()
      ? normalizePhoneCallTopic(params.scenarioOverrides.detailFocus.trim()) ?? null
      : null
  const mergedDetailFocus =
    requestedOverrideBookingDetailFocus ??
    requestedOverrideDoctorHealthFocus ??
    requestedOverrideStoreDetailFocus ??
    requestedOverrideWorkColleagueTaskFocus ??
    requestedOverrideHousingLandlordFocus ??
    requestedOverridePhoneCallTopic
  const mergedScenarioOverrides: ScenarioSelectionOverrides = {
    ...(requestedOverrideSubType ? { subType: requestedOverrideSubType } : {}),
    ...(requestedOverrideVariation ? { variation: requestedOverrideVariation } : {}),
    ...(requestedOverrideDestination ? { destination: requestedOverrideDestination } : {}),
    ...(mergedDetailFocus ? { detailFocus: mergedDetailFocus } : {}),
  }
  const existing = await threadRepo.getActiveThreadForUserScenario(pool, userInternalId, scenario.id)
  if (existing) {
    if (existing.conversationSurface === requestedSurface) {
      const existingSpeakLiveState = parseSpeakLiveState(existing.speakLiveStateJson)
      const slugDyn = normalizeScenarioSlugForSpeakLive(scenario.slug)
      const dynamicOverridesScenario =
        slugDyn === 'ordering_food' ||
        slugDyn === 'supermarket_shop' ||
        slugDyn === 'booking_reservations' ||
        slugDyn === 'store_service_issue' ||
        slugDyn === 'work_colleague_interaction' ||
        slugDyn === 'housing_landlord' ||
        slugDyn === 'doctor_pharmacy' ||
        slugDyn === 'directions_getting_somewhere' ||
        slugDyn === 'train_station' ||
        slugDyn === PHONE_CALL_SCENARIO_ID ||
        slugDyn === SMALL_TALK_SCENARIO_ID ||
        slugDyn === MEETING_NEW_PEOPLE_SCENARIO_ID ||
        slugDyn === PARTY_SOCIAL_SCENARIO_ID ||
        slugDyn === EXPLAINING_SOMETHING_SCENARIO_ID ||
        slugDyn === STORYTELLING_SCENARIO_ID ||
        slugDyn === OPINIONS_DISCUSSIONS_SCENARIO_ID
      const existingBookingDetailFocus =
        slugDyn === 'booking_reservations'
          ? (() => {
              const p = existingSpeakLiveState?.scenarioRuntimeConfig?.persona
              if (!p || typeof p !== 'object') return null
              const v = (p as Record<string, string>).detailFocus
              return typeof v === 'string' && v.trim() ? v.trim().toLowerCase() : null
            })()
          : null
      const existingDoctorHealthFocus =
        slugDyn === 'doctor_pharmacy'
          ? (() => {
              const p = existingSpeakLiveState?.scenarioRuntimeConfig?.persona
              if (!p || typeof p !== 'object') return null
              const v = (p as Record<string, string>).healthFocus
              return typeof v === 'string' && v.trim() ? v.trim().toLowerCase() : null
            })()
          : null
      const existingStoreDetailFocus =
        slugDyn === 'store_service_issue'
          ? (() => {
              const p = existingSpeakLiveState?.scenarioRuntimeConfig?.persona
              if (!p || typeof p !== 'object') return null
              const v = (p as Record<string, string>).detailFocus
              return typeof v === 'string' && v.trim() ? v.trim().toLowerCase() : null
            })()
          : null
      const existingWorkColleagueTaskFocus =
        slugDyn === 'work_colleague_interaction'
          ? (() => {
              const p = existingSpeakLiveState?.scenarioRuntimeConfig?.persona
              if (!p || typeof p !== 'object') return null
              const v = (p as Record<string, string>).detailFocus ?? (p as Record<string, string>).taskFocus
              return typeof v === 'string' && v.trim() ? v.trim().toLowerCase() : null
            })()
          : null
      const existingHousingLandlordFocus =
        slugDyn === 'housing_landlord'
          ? (() => {
              const p = existingSpeakLiveState?.scenarioRuntimeConfig?.persona
              if (!p || typeof p !== 'object') return null
              const v = (p as Record<string, string>).detailFocus
              return typeof v === 'string' && v.trim() ? v.trim().toLowerCase() : null
            })()
          : null
      const existingPhoneCallTopic =
        slugDyn === PHONE_CALL_SCENARIO_ID
          ? (() => {
              const p = existingSpeakLiveState?.scenarioRuntimeConfig?.persona
              if (!p || typeof p !== 'object') return null
              const v = (p as Record<string, string>).callTopic
              return typeof v === 'string' && v.trim() ? v.trim().toLowerCase() : null
            })()
          : null
      /**
       * Language Coach has no `scenarioRuntimeConfig` per-scenario subType/variation — its
       * "framing" lives entirely in the persisted `languageCoach` blob (goal, pinned focus,
       * conversation role). Without this check the active-thread reuse path silently
       * returns the original thread's persisted opener even when the learner explicitly
       * deep-linked back from a report with a NEW pinned focus, or picked a different
       * goal pill on the entry screen — which is exactly the bug being fixed by the
       * `buildLanguageCoachContextualOpeningLine` helper in `insertNewThread()`.
       *
       * We treat the following as override mismatches that force a fresh thread:
       *   - The learner deep-linked in with a non-empty `pinnedFocusEnglish` (always
       *     force fresh — the report CTA's whole purpose is "start a new session anchored
       *     to this focus").
       *   - The requested `conversationGoal` differs from the persisted one (entry-screen
       *     goal pill changed).
       *   - The requested `conversationRole` differs from the persisted one (role change
       *     materially shifts persona tone / correction density).
       */
      const existingLanguageCoachBlob =
        slugDyn === 'language_coach' ? existingSpeakLiveState?.languageCoach ?? null : null
      const requestedLanguageCoachPayload =
        slugDyn === 'language_coach' ? normalizeLanguageCoachStart(params.languageCoach ?? undefined) : null
      const languageCoachOverrideMismatch =
        slugDyn === 'language_coach' &&
        existingLanguageCoachBlob != null &&
        requestedLanguageCoachPayload != null &&
        ((requestedLanguageCoachPayload.pinnedFocusEnglish?.trim()?.length ?? 0) > 0 ||
          requestedLanguageCoachPayload.conversationGoal !== existingLanguageCoachBlob.conversationGoal ||
          requestedLanguageCoachPayload.conversationRole !== existingLanguageCoachBlob.conversationRole)
      const overrideMismatch =
        requestedSurface === 'speak_live' &&
        dynamicOverridesScenario &&
        ((requestedOverrideSubType &&
          existingSpeakLiveState?.scenarioRuntimeConfig?.subType !== requestedOverrideSubType) ||
          (requestedOverrideVariation &&
            existingSpeakLiveState?.scenarioRuntimeConfig?.variation !== requestedOverrideVariation) ||
          (requestedOverrideDestination &&
            (existingSpeakLiveState?.scenarioRuntimeConfig?.destinationDisplay ?? null) !== requestedOverrideDestination) ||
          (slugDyn === 'booking_reservations' &&
            requestedOverrideBookingDetailFocus &&
            existingBookingDetailFocus !== requestedOverrideBookingDetailFocus) ||
          (slugDyn === 'doctor_pharmacy' &&
            requestedOverrideDoctorHealthFocus &&
            existingDoctorHealthFocus !== requestedOverrideDoctorHealthFocus) ||
          (slugDyn === 'store_service_issue' &&
            requestedOverrideStoreDetailFocus &&
            existingStoreDetailFocus !== requestedOverrideStoreDetailFocus) ||
          (slugDyn === 'work_colleague_interaction' &&
            requestedOverrideWorkColleagueTaskFocus &&
            existingWorkColleagueTaskFocus !== requestedOverrideWorkColleagueTaskFocus) ||
          (slugDyn === 'housing_landlord' &&
            requestedOverrideHousingLandlordFocus &&
            existingHousingLandlordFocus !== requestedOverrideHousingLandlordFocus) ||
          (slugDyn === PHONE_CALL_SCENARIO_ID &&
            requestedOverridePhoneCallTopic &&
            existingPhoneCallTopic !== requestedOverridePhoneCallTopic) ||
          (slugDyn === SMALL_TALK_SCENARIO_ID &&
            requestedOverrideSubType &&
            existingSpeakLiveState?.scenarioRuntimeConfig?.subType !== requestedOverrideSubType) ||
          (slugDyn === SMALL_TALK_SCENARIO_ID &&
            requestedOverrideVariation &&
            existingSpeakLiveState?.scenarioRuntimeConfig?.variation !== requestedOverrideVariation) ||
          (slugDyn === MEETING_NEW_PEOPLE_SCENARIO_ID &&
            requestedOverrideSubType &&
            existingSpeakLiveState?.scenarioRuntimeConfig?.subType !== requestedOverrideSubType) ||
          (slugDyn === MEETING_NEW_PEOPLE_SCENARIO_ID &&
            requestedOverrideVariation &&
            existingSpeakLiveState?.scenarioRuntimeConfig?.variation !== requestedOverrideVariation) ||
          (slugDyn === PARTY_SOCIAL_SCENARIO_ID &&
            requestedOverrideSubType &&
            existingSpeakLiveState?.scenarioRuntimeConfig?.subType !== requestedOverrideSubType) ||
          (slugDyn === PARTY_SOCIAL_SCENARIO_ID &&
            requestedOverrideVariation &&
            existingSpeakLiveState?.scenarioRuntimeConfig?.variation !== requestedOverrideVariation) ||
          (slugDyn === EXPLAINING_SOMETHING_SCENARIO_ID &&
            requestedOverrideSubType &&
            existingSpeakLiveState?.scenarioRuntimeConfig?.subType !== requestedOverrideSubType) ||
          (slugDyn === EXPLAINING_SOMETHING_SCENARIO_ID &&
            requestedOverrideVariation &&
            existingSpeakLiveState?.scenarioRuntimeConfig?.variation !== requestedOverrideVariation) ||
          (slugDyn === STORYTELLING_SCENARIO_ID &&
            requestedOverrideSubType &&
            existingSpeakLiveState?.scenarioRuntimeConfig?.subType !== requestedOverrideSubType) ||
          (slugDyn === STORYTELLING_SCENARIO_ID &&
            requestedOverrideVariation &&
            existingSpeakLiveState?.scenarioRuntimeConfig?.variation !== requestedOverrideVariation) ||
          (slugDyn === OPINIONS_DISCUSSIONS_SCENARIO_ID &&
            requestedOverrideSubType &&
            existingSpeakLiveState?.scenarioRuntimeConfig?.subType !== requestedOverrideSubType) ||
          (slugDyn === OPINIONS_DISCUSSIONS_SCENARIO_ID &&
            requestedOverrideVariation &&
            existingSpeakLiveState?.scenarioRuntimeConfig?.variation !== requestedOverrideVariation) ||
          (slugDyn === 'doctor_pharmacy' &&
            isDoctorPharmacySpeakLiveRuntimeOpeningStale(scenario.slug, existingSpeakLiveState)) ||
          (slugDyn === 'store_service_issue' &&
            isStoreServiceIssueSpeakLiveRuntimeOpeningStale(scenario.slug, existingSpeakLiveState)) ||
          (slugDyn === 'directions_getting_somewhere' &&
            isDirectionsSpeakLiveRuntimeOpeningStale(scenario.slug, existingSpeakLiveState)) ||
          (slugDyn === 'train_station' &&
            isPublicTransportSpeakLiveRuntimeOpeningStale(scenario.slug, existingSpeakLiveState)))
      /**
       * Language Coach lives outside the `dynamicOverridesScenario` family above, so its
       * mismatch flag is OR'd in independently rather than nested under
       * `dynamicOverridesScenario && (…)` — keeps the existing scenario logic untouched.
       */
      if (!overrideMismatch && !languageCoachOverrideMismatch) {
        const messages = await messageRepo.listMessagesForThread(pool, existing.id)
        const hydratedExisting = applySpeakLiveRuntimeScenario(scenario, existingSpeakLiveState)
        const personaOut = polishSpeakLivePersonaForDisplay(scenario.slug, persona, hydratedExisting)
        const messagesOut = isDutchSpeakLiveServiceScene(scenario.slug)
          ? sanitizeOrderingFoodAssistantMessages(messages)
          : messages
        return {
          thread: existing,
          messages: messagesOut,
          scenario: hydratedExisting,
          persona: personaOut,
          ...speakLiveClientMediaForThread(existing),
        }
      }
    }
    /**
     * One active row per user+scenario (see UQ_ConversationThreads_UserScenario_Active). If the learner had a
     * text thread open and starts Speak Live (or the reverse), we must not reuse the wrong surface — post-session
     * evaluation and live pipelines key off `conversationSurface === 'speak_live'`.
     */
    await threadRepo.updateThreadState(pool, existing.id, { status: 'paused' })
    aiLogInfo('conversation_start_paused_mismatched_surface', {
      pausedThreadId: existing.id,
      hadSurface: existing.conversationSurface,
      requestedSurface,
      scenarioId: scenario.id,
    })
  }

  const conversationSurface = requestedSurface
  const cefr = normalizeSpeakLiveCefrLevel(params.cefrLevel ?? undefined)
  const runtimeLevel = cefr === 'A1' || cefr === 'B1' ? cefr : 'A2'
  let resolvedMode: ConversationMode
  let speakLiveInit: SpeakLivePersistedState | null = null
  let scenarioForSession = scenario
  if (conversationSurface === 'speak_live') {
    if (scenario.slug === 'language_coach') {
      const lcPayload = normalizeLanguageCoachStart(params.languageCoach ?? undefined)
      let lcInit: SpeakLivePersistedState | null = null
      try {
        const pj = await userLearningMemoryRepository.getUserLearningProfileJson(pool, userInternalId)
        const profileDoc = parseUserLearningProfileDocument(pj, userInternalId)
        const weakest = rankWeakestSkillIdsFromProfile(profileDoc, 6)
        lcInit = buildLanguageCoachSpeakLiveInit(
          cefr,
          lcPayload,
          weakest.length ? { weakestSkillIds: weakest } : undefined,
        )
        const steer = buildLanguageCoachSessionSteerPlan(profileDoc)
        const chip = formatLanguageCoachSessionFocusChip(steer)
        if (chip && lcInit.languageCoach) {
          lcInit = {
            ...lcInit,
            languageCoach: { ...lcInit.languageCoach, sessionFocusChip: chip },
          }
        }
      } catch {
        /* profile optional */
      }
      speakLiveInit = lcInit ?? buildLanguageCoachSpeakLiveInit(cefr, lcPayload)
      resolvedMode = legacyConversationModeFromSupportStrategy(speakLiveInit.supportStrategy!)
      scenarioForSession = scenario
    } else {
      const speakLiveSessionMedia = buildSpeakLiveSessionMedia()
      const scenarioRuntimeConfig =
      maybeBuildSpeakLiveScenarioRuntime({
        scenario,
        level: runtimeLevel,
        overrides: mergedScenarioOverrides,
      }) ??
      maybeBuildSupermarketShopSpeakLiveScenarioRuntime({
        scenario,
        level: runtimeLevel,
        overrides: mergedScenarioOverrides,
      }) ??
      maybeBuildDirectionsGettingSomewhereSpeakLiveScenarioRuntime({
        scenario,
        level: runtimeLevel,
        overrides: mergedScenarioOverrides,
      }) ??
      maybeBuildPublicTransportSpeakLiveScenarioRuntime({
        scenario,
        level: runtimeLevel,
        overrides: mergedScenarioOverrides,
      }) ??
      maybeBuildBookingReservationsSpeakLiveScenarioRuntime({
        scenario,
        level: runtimeLevel,
        overrides: mergedScenarioOverrides,
      }) ??
      maybeBuildStoreServiceIssueSpeakLiveScenarioRuntime({
        scenario,
        level: runtimeLevel,
        overrides: mergedScenarioOverrides,
      }) ??
      maybeBuildWorkColleagueInteractionSpeakLiveScenarioRuntime({
        scenario,
        level: runtimeLevel,
        overrides: mergedScenarioOverrides,
      }) ??
      maybeBuildHousingLandlordSpeakLiveScenarioRuntime({
        scenario,
        level: runtimeLevel,
        overrides: mergedScenarioOverrides,
      }) ??
      maybeBuildDoctorPharmacySpeakLiveScenarioRuntime({
        scenario,
        level: runtimeLevel,
        overrides: mergedScenarioOverrides,
      }) ??
      maybeBuildPhoneCallSpeakLiveScenarioRuntime({
        scenario,
        level: runtimeLevel,
        overrides: mergedScenarioOverrides,
      }) ??
      maybeBuildSmallTalkSpeakLiveScenarioRuntime({
        scenario,
        level: runtimeLevel,
        overrides: mergedScenarioOverrides,
      }) ??
      maybeBuildMeetingNewPeopleSpeakLiveScenarioRuntime({
        scenario,
        level: runtimeLevel,
        overrides: mergedScenarioOverrides,
        assistantPresentation: speakLiveSessionMedia.assistantPresentation,
      }) ??
      maybeBuildPartySocialSpeakLiveScenarioRuntime({
        scenario,
        level: runtimeLevel,
        overrides: mergedScenarioOverrides,
      }) ??
      maybeBuildExplainingSomethingSpeakLiveScenarioRuntime({
        scenario,
        level: runtimeLevel,
        overrides: mergedScenarioOverrides,
      }) ??
      maybeBuildStorytellingSpeakLiveScenarioRuntime({
        scenario,
        level: runtimeLevel,
        overrides: mergedScenarioOverrides,
      }) ??
      maybeBuildOpinionsDiscussionsSpeakLiveScenarioRuntime({
        scenario,
        level: runtimeLevel,
        overrides: mergedScenarioOverrides,
      })
    scenarioForSession = applyScenarioRuntimeConfig(scenario, scenarioRuntimeConfig)
    let weakSkillScenarioOverlap = 0
    try {
      const pj = await userLearningMemoryRepository.getUserLearningProfileJson(pool, userInternalId)
      const profileDoc = parseUserLearningProfileDocument(pj, userInternalId)
      weakSkillScenarioOverlap = weakSkillScenarioOverlapHits(profileDoc, scenarioForSession.slug)
    } catch {
      /* profile optional */
    }
    const supportStrategy = resolveSpeakLiveSupportStrategy({
      cefrLevel: cefr,
      scenarioSlug: scenarioForSession.slug,
      scenarioGoalCount: scenarioForSession.goals.length,
      weakSkillScenarioOverlapHits: weakSkillScenarioOverlap,
    })
    resolvedMode = legacyConversationModeFromSupportStrategy(supportStrategy)
    speakLiveInit = {
      ...defaultSpeakLiveState(),
      supportStrategy,
      ...(scenarioRuntimeConfig ? { scenarioRuntimeConfig } : {}),
    }
    }
  } else {
    if (!params.mode) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'mode is required for text conversations')
    }
    resolvedMode = params.mode
  }

  const lcStartForSummary = normalizeLanguageCoachStart(params.languageCoach ?? undefined)
  const speakLiveThreadSummary =
    scenario.slug === 'language_coach'
      ? `${scenarioForSession.title} · Speak Live · ${params.feedbackMode} · ${cefr} · goal:${lcStartForSummary.conversationGoal} · role:${lcStartForSummary.conversationRole}`
      : `${scenarioForSession.title} · Speak Live · ${params.feedbackMode} · ${cefr}`

  const insertNewThread = async (): Promise<{ thread: ConversationThread; messages: ConversationMessage[] }> => {
    if (speakLiveLearnerOpensFirst(conversationSurface, scenario.slug, speakLiveInit)) {
      const thread = await threadRepo.insertThread(pool, {
        userId: userInternalId,
        scenarioId: scenario.id,
        personaId: persona.id,
        mode: resolvedMode,
        feedbackMode: params.feedbackMode,
        conversationSurface,
        summaryText:
          conversationSurface === 'speak_live'
            ? speakLiveThreadSummary
            : `${scenarioForSession.title} · ${resolvedMode} · ${params.feedbackMode} · ${conversationSurface}`,
        currentStage: speakLiveInit ? threadCurrentStageFromPhase(speakLiveInit.phase) : 'opening',
        speakLiveStateJson: speakLiveInit ? serializeSpeakLiveState(speakLiveInit) : null,
      })
      await threadRepo.pauseOtherActiveThreads(pool, userInternalId, scenario.id, thread.id)
      void Promise.all([
        publishAppEvent('ConversationStarted', { threadId: thread.id, scenarioSlug: scenario.slug }),
        tryUploadConversationArtifact(thread.id, 'opening.json', { learnerSpeaksFirst: true }),
      ]).catch((e) => aiLogError('conversation_start_sidefx_failed', e, { threadId: thread.id }))
      return { thread, messages: [] }
    }

    /**
     * Language Coach contextual opener: when the learner deep-linked in with a pinned focus
     * from the previous report or picked a specific `conversationGoal` in the entry screen,
     * we replace `persona.introLine` (the static DB string "Hoi! Ik ben je coach vandaag —
     * waar zin je het over te hebben?") with a Dutch greeting that already names the focus
     * and offers concrete starting options. See `languageCoachContextualOpener.ts` for the
     * full rationale. Falls back to `null` for true cold-start sessions so the existing
     * intro line behavior is preserved.
     */
    const languageCoachContextualOpener =
      scenario.slug === 'language_coach'
        ? buildLanguageCoachContextualOpeningLine(lcStartForSummary)
        : null

    const openingRaw =
      speakLiveInit?.scenarioRuntimeConfig?.openingLine?.trim() ||
      scenarioForSession.openingMessage?.trim() ||
      languageCoachContextualOpener ||
      persona.introLine
    const opening = isDutchSpeakLiveServiceScene(scenario.slug)
      ? stripLeadingEnglishClauseFromOrderingFoodAssistantLine(openingRaw)
      : openingRaw

    /** Seed Mem with the assistant opening so turn-1 LLM does not “forget” the greeting / first question. */
    let speakLiveStateForInsert = speakLiveInit
    if (conversationSurface === 'speak_live' && speakLiveInit && opening.trim()) {
      /**
       * When we used the contextual opener (not the static persona intro), this seeded
       * assistant message IS the coach's first turn. Bump `coachTurnIndex` to 1 so the
       * system prompt's `buildOpeningTurnDirective` (which fires only when
       * `coachTurnIndex === 0`) does not double-fire on the next LLM-driven reply,
       * which would tell the model "you have NOT spoken yet" and trigger a second
       * opening message. For the static-intro fallback we preserve the legacy
       * `coachTurnIndex: 0` behavior so nothing else changes for cold starts.
       */
      const lcPatch =
        languageCoachContextualOpener && speakLiveInit.languageCoach
          ? {
              languageCoach: {
                ...speakLiveInit.languageCoach,
                coachTurnIndex: Math.max(speakLiveInit.languageCoach.coachTurnIndex ?? 0, 1),
              },
            }
          : {}
      speakLiveStateForInsert = {
        ...speakLiveInit,
        ...lcPatch,
        rollingSummaryEnglish: appendCumulativeSpeakLiveMemoryTurn({
          scenarioSlug: scenario.slug,
          rollingSummaryEnglish: speakLiveInit.rollingSummaryEnglish ?? '',
          userTextTrimmed: '',
          assistantTextTrimmed: opening,
        }),
      }
    }

    const thread = await threadRepo.insertThread(pool, {
      userId: userInternalId,
      scenarioId: scenario.id,
      personaId: persona.id,
      mode: resolvedMode,
      feedbackMode: params.feedbackMode,
      conversationSurface,
      summaryText:
        conversationSurface === 'speak_live'
          ? speakLiveThreadSummary
          : `${scenarioForSession.title} · ${resolvedMode} · ${params.feedbackMode} · ${conversationSurface}`,
      currentStage: speakLiveStateForInsert ? threadCurrentStageFromPhase(speakLiveStateForInsert.phase) : 'opening',
      speakLiveStateJson: speakLiveStateForInsert ? serializeSpeakLiveState(speakLiveStateForInsert) : null,
    })
    await threadRepo.pauseOtherActiveThreads(pool, userInternalId, scenario.id, thread.id)

    const assistantFirst = await messageRepo.insertMessage(pool, {
      threadId: thread.id,
      sender: 'assistant',
      messageType: 'text',
      content: opening,
    })

    void Promise.all([
      publishAppEvent('ConversationStarted', { threadId: thread.id, scenarioSlug: scenario.slug }),
      tryUploadConversationArtifact(thread.id, 'opening.json', { opening }),
    ]).catch((e) => aiLogError('conversation_start_sidefx_failed', e, { threadId: thread.id }))

    return { thread, messages: [assistantFirst] }
  }

  try {
    const inserted = await insertNewThread()
    const personaOut = polishSpeakLivePersonaForDisplay(scenario.slug, persona, scenarioForSession)
    const messagesOut = isDutchSpeakLiveServiceScene(scenario.slug)
      ? sanitizeOrderingFoodAssistantMessages(inserted.messages)
      : inserted.messages
    return {
      ...inserted,
      messages: messagesOut,
      scenario: scenarioForSession,
      persona: personaOut,
      ...speakLiveClientMediaForThread(inserted.thread),
    }
  } catch (e) {
    if (!isSqlServerUniqueViolation(e)) throw e
    /** Winner may still be inserting the opening message — brief wait then re-read. */
    for (let attempt = 0; attempt < 20; attempt++) {
      const recovered = await threadRepo.getActiveThreadForUserScenario(pool, userInternalId, scenario.id)
      if (recovered && recovered.conversationSurface === requestedSurface) {
        const messages = await messageRepo.listMessagesForThread(pool, recovered.id)
        const recoveredSl = parseSpeakLiveState(recovered.speakLiveStateJson)
        const slugRec = normalizeScenarioSlugForSpeakLive(scenario.slug)
        const rcRec = recoveredSl?.scenarioRuntimeConfig
        const learnerFirstReady =
          requestedSurface === 'speak_live' &&
          messages.length === 0 &&
          ((slugRec === 'directions_getting_somewhere' && rcRec?.directionsLearnerSpeaksFirst === true) ||
            (slugRec === 'train_station' &&
              rcRec?.id === PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID &&
              rcRec.publicTransportLearnerSpeaksFirst === true))
        if (messages.length > 0 || learnerFirstReady) {
          const hydratedRecovered = applySpeakLiveRuntimeScenario(scenario, recoveredSl)
          const personaOut = polishSpeakLivePersonaForDisplay(scenario.slug, persona, hydratedRecovered)
          const messagesOut = isDutchSpeakLiveServiceScene(scenario.slug)
            ? sanitizeOrderingFoodAssistantMessages(messages)
            : messages
          return {
            thread: recovered,
            messages: messagesOut,
            scenario: hydratedRecovered,
            persona: personaOut,
            ...speakLiveClientMediaForThread(recovered),
          }
        }
      }
      await new Promise((r) => setTimeout(r, 60))
    }
    throw new ApiError(
      503,
      'DEPENDENCY_UNAVAILABLE',
      'Could not finish starting this conversation (busy). Please try again in a moment.'
    )
  }
}

export async function getConversation(params: {
  externalUserId: string
  threadId: string
}): Promise<{
  thread: ConversationThread
  messages: ConversationMessage[]
  scenario: ScenarioConfig
  persona: PersonaConfig
  feedback: Awaited<ReturnType<typeof feedbackRepo.listFeedbackForThread>>
  speakLive?: SpeakLiveSessionMedia
}> {
  const pool = await requirePool()
  const userInternalId = await userRepo.ensureUser(pool, params.externalUserId)
  const thread = await threadRepo.getThreadById(pool, params.threadId)
  if (!thread) throw new ApiError(404, 'NOT_FOUND', 'Thread not found')
  if (thread.userId !== userInternalId) throw new ApiError(403, 'VALIDATION_ERROR', 'Thread belongs to another user')

  const [scenario, persona, messages, feedback] = await Promise.all([
    scenarioRepo.getScenarioById(pool, thread.scenarioId),
    personaRepo.getPersonaById(pool, thread.personaId),
    messageRepo.listMessagesForThread(pool, thread.id),
    feedbackRepo.listFeedbackForThread(pool, thread.id),
  ])
  const speakLiveState = parseSpeakLiveState(thread.speakLiveStateJson)
  const hydratedScenario = applySpeakLiveRuntimeScenario(scenario, speakLiveState)
  const personaOut = polishSpeakLivePersonaForDisplay(scenario.slug, persona, hydratedScenario)
  const messagesOut = isDutchSpeakLiveServiceScene(scenario.slug)
    ? sanitizeOrderingFoodAssistantMessages(messages)
    : messages
  return {
    thread,
    messages: messagesOut,
    scenario: hydratedScenario,
    persona: personaOut,
    feedback,
    ...speakLiveClientMediaForThread(thread),
  }
}

async function runAssistantReplyLlm(request: AiConversationTurnRequest): Promise<AssistantReplyEnvelope> {
  const provider = createConversationAiProvider()
  try {
    return await provider.generateAssistantReplyOnly(request)
  } catch (e) {
    mapAiErrorToApi(e)
  }
}

export type ConversationUserInputMeta = {
  inputMode?: 'text' | 'speech'
  originalTranscript?: string | null
  /** Verbatim learner line (Speak Live); may match `originalTranscript`. */
  transcriptRaw?: string | null
  /** Light-normalized transcript for LLM + post-session evaluation (Speak Live). */
  normalizedTranscript?: string | null
  /** Optional CEFR from client for live ultra-lean prompt. */
  learnerLevelCefr?: string | null
  audioReference?: string | null
  /** Blob-relative path under `conversations/{threadId}/` when learner clip was stored. */
  learnerAudioBlobPath?: string | null
  learnerAudioMimeType?: string | null
}

/** Single-turn send (Speak Live live loop and others). Must not run post-session evaluation or Azure PA. @see docs/live-evaluation-boundaries.md */
export async function sendConversationMessage(params: {
  externalUserId: string
  threadId: string
  text: string
  inputMeta?: ConversationUserInputMeta | null
  /** When set (Speak Live), raw learner audio is stored for post-session evaluation playback. */
  learnerAudio?: { buffer: Buffer; mimeType: string } | null
}): Promise<{
  userMessage: ConversationMessage
  assistantMessage: ConversationMessage
  feedback: Awaited<ReturnType<typeof feedbackRepo.insertFeedback>> | null
  envelope: AIResponseEnvelope
  thread: ConversationThread
  enrichmentPending: boolean
  perf: Record<string, number>
  /** Speak Live: structured server timings for dev overlay + budgets. */
  liveTurnLatencyTrace?: LiveTurnLatencyTraceServer
  /** Speak Live fast-path diagnostics (not numeric timings). */
  liveTurnDiagnostics?: Record<string, unknown>
  /** Language Coach: per-turn correctness signal for the live UI. */
  liveCoachTurnFeedback?: LiveCoachTurnFeedback
}> {
  const perf = new ConversationPerf()
  perf.mark('handlerStart')
  const pool = await requirePool()
  perf.mark('afterPool')
  const mod = createModerationProvider()
  const userInternalId = await userRepo.ensureUser(pool, params.externalUserId)
  let thread = await threadRepo.getThreadById(pool, params.threadId)
  if (!thread) throw new ApiError(404, 'NOT_FOUND', 'Thread not found')
  if (thread.userId !== userInternalId) throw new ApiError(403, 'VALIDATION_ERROR', 'Forbidden')
  if (thread.status !== 'active') throw new ApiError(409, 'CONFLICT', 'Thread is not active')

  let normalizationMsSend = 0
  let liveTranscript: ReturnType<typeof preprocessLiveSpeechTranscript> | null = null
  if (thread.conversationSurface === 'speak_live') {
    const tNorm = Date.now()
    liveTranscript = preprocessLiveSpeechTranscript(params.text)
    normalizationMsSend = Date.now() - tNorm
    perf.mark('afterNormalize')
  }
  const textForModerationAndLlm = liveTranscript?.transcriptNormalized ?? params.text
  if (thread.conversationSurface === 'speak_live' && !textForModerationAndLlm.trim()) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'No usable transcript after normalization')
  }
  if (thread.conversationSurface === 'speak_live') {
    assertSpeakLiveConversationModelInfrastructureReady()
    assertConversationBinaryBlobStorageConfigured()
  }
  const threadSpeakLiveState = parseSpeakLiveState(thread.speakLiveStateJson)

  const recentWindow = getConversationRecentMessagesMax()
  const [userMod, scenario, persona] = await Promise.all([
    mod.analyzeUserText(textForModerationAndLlm),
    getScenarioByIdCached(pool, thread.scenarioId),
    getPersonaByIdCached(pool, thread.personaId),
  ])
  perf.mark('afterModerationScenario')
  if (!scenario || !persona) {
    throw new ApiError(500, 'DEPENDENCY_UNAVAILABLE', 'Scenario or persona configuration missing')
  }
  const hydratedScenario = applySpeakLiveRuntimeScenario(scenario, threadSpeakLiveState)
  if (userMod.severity === 'block') {
    throw new ApiError(400, 'MODERATION_BLOCKED', userMod.replacementText ?? 'Content blocked by moderation policy')
  }

  const fromInput =
    params.inputMeta &&
    (params.inputMeta.inputMode ||
      params.inputMeta.originalTranscript != null ||
      params.inputMeta.audioReference != null ||
      params.inputMeta.learnerLevelCefr != null)
      ? {
          ...(params.inputMeta.inputMode ? { inputMode: params.inputMeta.inputMode } : {}),
          ...(params.inputMeta.originalTranscript != null
            ? { originalTranscript: params.inputMeta.originalTranscript }
            : {}),
          ...(params.inputMeta.learnerLevelCefr != null
            ? { learnerLevelCefr: params.inputMeta.learnerLevelCefr }
            : {}),
          ...(params.inputMeta.audioReference != null
            ? { audioReference: params.inputMeta.audioReference }
            : {}),
        }
      : ({} as Record<string, unknown>)
  const userMeta =
    thread.conversationSurface === 'speak_live' && liveTranscript
      ? buildLiveSpeechLearnerTurnMetadata({
          sessionId: thread.id,
          transcriptRaw: liveTranscript.transcriptRaw,
          transcriptNormalized: liveTranscript.transcriptNormalized,
          inputMeta: params.inputMeta ?? undefined,
        })
      : Object.keys(fromInput).length > 0
        ? fromInput
        : undefined

  let userMessage = await messageRepo.insertMessage(pool, {
    threadId: thread.id,
    sender: 'user',
    messageType: 'text',
    content: textForModerationAndLlm,
    metadata: userMeta && Object.keys(userMeta).length > 0 ? userMeta : undefined,
  })
  await threadRepo.updateThreadState(pool, thread.id, { lastUserMessageAt: new Date() })
  perf.mark('afterUserPersist')

  if (hydratedScenario.slug === 'language_coach') {
    const prevSl = parseSpeakLiveState(thread.speakLiveStateJson) ?? defaultSpeakLiveState()
    const nextSl = applyLanguageCoachUserTurnToState(prevSl, textForModerationAndLlm, {
      learnerCefr: params.inputMeta?.learnerLevelCefr ?? null,
      inputMode: params.inputMeta?.inputMode,
    })
    const slJson = serializeSpeakLiveState(nextSl)
    await threadRepo.updateThreadState(pool, thread.id, { speakLiveStateJson: slJson })
    thread = { ...thread, speakLiveStateJson: slJson }
  }

  const la = params.learnerAudio
  /** Overlap blob upload with recent-message load + LLM (upload is not needed for model context). */
  const speakLiveLearnerUpload: Promise<SpeakLiveLearnerBlobUploadResult> =
    la && la.buffer.length >= 32 && thread.conversationSurface === 'speak_live'
      ? (async (): Promise<SpeakLiveLearnerBlobUploadResult> => {
          try {
            const ext =
              la.mimeType.includes('webm') ? 'webm' : la.mimeType.includes('wav') ? 'wav' : la.mimeType.includes('mpeg') ? 'mp3' : 'bin'
            const fileName = `learner/${userMessage.id}.${ext}`
            const uploaded = await uploadConversationBinaryArtifactRequired(thread.id, fileName, la.buffer, la.mimeType)
            const patched = await messageRepo.updateMessageMetadata(pool, userMessage.id, {
              learnerAudioBlobPath: uploaded,
              learnerAudioMimeType: la.mimeType,
            })
            if (patched) userMessage = patched
            return { ok: true }
          } catch (err) {
            return { ok: false, err }
          }
        })()
      : Promise.resolve({ ok: true as const })

  /** Do not await blob upload here — it would add storage latency to time-to-first-token. Upload runs from insert time; await before reading `learnerAudioBlobPath`. */
  const recent = await messageRepo.listRecentMessagesForThread(pool, thread.id, recentWindow)

  const prep = prepareAssistantTurnRequest({
    thread,
    scenario: hydratedScenario,
    persona,
    userMessage,
    recent,
    userText: textForModerationAndLlm,
    learnerLevelCefrHint: params.inputMeta?.learnerLevelCefr ?? null,
  })
  await maybeAttachLearningPersonalization({
    pool,
    externalUserId: params.externalUserId,
    turnRequest: prep.turnRequest,
  })
  perf.mark('afterPrepTurnRequest')
  perf.mark('beforeReplyLlm')

  const reply = await runAssistantReplyLlm(prep.turnRequest)
  perf.mark('afterReplyLlm')

  const goalCountForSpeakLiveMerge =
    hydratedScenario.slug === 'language_coach' ? 0 : hydratedScenario.goals.length
  const mergedSpeakLiveSignals =
    prep.isSpeakLive && prep.speakLivePrevState && prep.groundingPatch
      ? mergeSpeakLiveSignalsWithGrounding({
          model: reply.speakLiveSignals,
          patch: prep.groundingPatch,
          scenarioGoalCount: goalCountForSpeakLiveMerge,
          phase: prep.speakLivePrevState.phase,
        })
      : reply.speakLiveSignals

  let assistantText = reply.assistantReply
  if (prep.isSpeakLive && isDutchSpeakLiveServiceScene(hydratedScenario.slug)) {
    assistantText = stripLeadingEnglishClauseFromOrderingFoodAssistantLine(assistantText)
  }
  const asstMod = await mod.analyzeAssistantText(assistantText)
  perf.mark('afterAssistantMod')
  if (asstMod.severity === 'block') {
    assistantText =
      asstMod.replacementText ??
      'Excuses — ik kan dit zo niet beantwoorden. Kunt u uw vraag anders formuleren?'
  }

  const nextSpeakLiveState =
    prep.isSpeakLive && prep.speakLivePrevState
      ? computeNextSpeakLiveState({
          prev: prep.speakLivePrevState,
          scenarioGoalCount: goalCountForSpeakLiveMerge,
          signals: mergedSpeakLiveSignals,
          shouldConversationEnd: reply.shouldConversationEnd,
          userTextTrimmed: textForModerationAndLlm.trim(),
          scenarioSlug: hydratedScenario.slug,
        })
      : null

  const { assistantMessage, updated } = await persistAssistantAndSpeakLiveTurn({
    pool,
    thread,
    scenario: hydratedScenario,
    userMessage,
    userTextTrimmed: textForModerationAndLlm.trim(),
    reply,
    assistantText,
    mergedSpeakLiveSignals,
    isSpeakLive: prep.isSpeakLive,
    speakLivePrevState: prep.speakLivePrevState,
    nextSpeakLiveState,
    turnRequest: prep.turnRequest,
    verifiedGroundingBlock: prep.verifiedGroundingBlock,
    threadSummaryForLlm: prep.threadSummaryForLlm,
    recent,
  })
  perf.mark('afterAssistantPersist')

  const envelope: AIResponseEnvelope = {
    assistantReply: assistantText,
    feedback: null,
    saveWordCandidates: [],
    scenarioProgress: reply.scenarioProgress,
    shouldConversationEnd: reply.shouldConversationEnd,
    updatedSummary: updated.summaryText ?? '',
  }

  const perfSnap = perf.snapshot()
  perf.logDev(undefined, 'sendConversationMessage', { threadId: thread.id })

  let replyPromptCharsEstimateSend = 0
  if (prep.isSpeakLive) {
    try {
      const msgs = buildReplyOnlyChatMessages(prep.turnRequest)
      replyPromptCharsEstimateSend = msgs.reduce(
        (n, m) => n + (typeof m.content === 'string' ? m.content.length : 0),
        0
      )
    } catch {
      replyPromptCharsEstimateSend = 0
    }
  }
  const providerForLabel = createConversationAiProvider()
  const serverLatencyTraceSend = prep.isSpeakLive
    ? buildSpeakLiveServerLatencyTrace({
        perf,
        threadId: thread.id,
        userMessageId: userMessage.id,
        normalizationMs: normalizationMsSend,
        replyPromptCharsEstimate: replyPromptCharsEstimateSend,
        assistantReplyChars: assistantText.length,
        modelLabel: providerForLabel.turnModelLabel,
      })
    : undefined

  if (prep.isSpeakLive) {
    assertSpeakLiveLearnerBlobUploadOk(await speakLiveLearnerUpload)
    try {
      const um = (userMessage.metadata ?? {}) as Record<string, unknown>
      const learnerAudioRef = typeof um.learnerAudioBlobPath === 'string' ? um.learnerAudioBlobPath : null
      await messageRepo.updateMessageMetadata(pool, userMessage.id, {
        turnId: userMessage.id,
        learnerAudioRef,
        liveConversationPipeline: LIVE_CONVERSATION_PIPELINE_ID,
        liveTurnLatencyTrace: serverLatencyTraceSend ?? perfSnap,
        latencyTrace: perfSnap,
        assistantMessageIdForTurn: assistantMessage.id,
      })
      await messageRepo.updateMessageMetadata(
        pool,
        assistantMessage.id,
        buildLiveSpeechAssistantTurnMetadata({
          sessionId: thread.id,
          learnerTurnId: userMessage.id,
          assistantText,
        })
      )
    } catch {
      /* non-fatal */
    }
    if (la && la.buffer.length >= 32) {
      const bgPrep = prepareLiveTurnVoicePrepInBackground({
        pool,
        threadId: thread.id,
        userMessage,
        audio: la.buffer,
        mimeType: la.mimeType,
      })
      trackLiveUpload(thread.id, bgPrep)
    }
  }

  const liveDiag = prep.isSpeakLive ? liveConversationPipelineDiagnostics({}) : undefined
  const liveCoachTurnFeedback = prep.isSpeakLive
    ? buildLiveCoachTurnFeedback({
        thread: updated,
        userText: textForModerationAndLlm.trim(),
        assistantReply: assistantText,
      })
    : null

  return {
    userMessage,
    assistantMessage,
    feedback: null,
    envelope,
    thread: updated,
    enrichmentPending: !prep.isSpeakLive,
    perf: perfSnap,
    ...(serverLatencyTraceSend ? { liveTurnLatencyTrace: serverLatencyTraceSend } : {}),
    ...(liveDiag ? { liveTurnDiagnostics: liveDiag } : {}),
    ...(liveCoachTurnFeedback ? { liveCoachTurnFeedback } : {}),
  }
}

export async function enrichConversationTurn(params: {
  externalUserId: string
  threadId: string
  userMessageId: string
  assistantMessageId: string
}): Promise<{
  feedback: Awaited<ReturnType<typeof feedbackRepo.insertFeedback>> | null
  saveWordCandidates: string[]
  thread: ConversationThread
  assistantMessage: ConversationMessage
  perf: Record<string, number>
}> {
  const perf = new ConversationPerf()
  perf.mark('start')
  const pool = await requirePool()
  const userInternalId = await userRepo.ensureUser(pool, params.externalUserId)
  const thread = await threadRepo.getThreadById(pool, params.threadId)
  if (!thread) throw new ApiError(404, 'NOT_FOUND', 'Thread not found')
  if (thread.userId !== userInternalId) throw new ApiError(403, 'VALIDATION_ERROR', 'Forbidden')
  if (thread.status !== 'active') throw new ApiError(409, 'CONFLICT', 'Thread is not active')

  const userMessage = await messageRepo.getMessageById(pool, params.userMessageId)
  const assistantMessage = await messageRepo.getMessageById(pool, params.assistantMessageId)
  if (!userMessage || !assistantMessage) throw new ApiError(404, 'NOT_FOUND', 'Message not found')
  if (userMessage.threadId !== thread.id || assistantMessage.threadId !== thread.id) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Messages do not belong to this thread')
  }
  if (userMessage.sender !== 'user' || assistantMessage.sender !== 'assistant') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid message roles for enrichment')
  }

  const meta = assistantMessage.metadata
  const existingFb = await feedbackRepo.findFeedbackByLinkedMessageId(pool, thread.id, userMessage.id)

  if (meta?.enrichmentComplete === true) {
    const updated = (await threadRepo.getThreadById(pool, thread.id))!
    const asst = (await messageRepo.getMessageById(pool, assistantMessage.id))!
    perf.mark('cacheHit')
    return {
      feedback: thread.feedbackMode === 'turn' ? existingFb : null,
      saveWordCandidates: Array.isArray(asst.metadata?.saveWordCandidates)
        ? (asst.metadata!.saveWordCandidates as string[]).filter((x) => typeof x === 'string')
        : [],
      thread: updated,
      assistantMessage: asst,
      perf: perf.snapshot(),
    }
  }

  const recentWindow = getConversationRecentMessagesMax()
  const [scenario, persona, recent] = await Promise.all([
    scenarioRepo.getScenarioById(pool, thread.scenarioId),
    personaRepo.getPersonaById(pool, thread.personaId),
    messageRepo.listRecentMessagesForThread(pool, thread.id, recentWindow),
  ])
  perf.mark('afterLoad')
  const hydratedScenario = applySpeakLiveRuntimeScenario(scenario, parseSpeakLiveState(thread.speakLiveStateJson))

  const provider = createConversationAiProvider()
  let enrichment
  try {
    enrichment = await provider.generateTurnEnrichment({
      scenario: hydratedScenario,
      persona,
      mode: thread.mode,
      feedbackMode: thread.feedbackMode,
      threadSummary: thread.summaryText,
      recentMessages: recent,
      userText: userMessage.content,
      assistantReply: assistantMessage.content,
      threadId: thread.id,
    })
  } catch (e) {
    mapAiErrorToApi(e)
  }
  perf.mark('afterEnrichLlm')

  let fbPayload = enrichment.feedback
  if (thread.feedbackMode === 'turn' && !fbPayload && userMessage.content.trim()) {
    const excerpt = userMessage.content.trim().slice(0, 200)
    fbPayload = {
      category: 'clarity',
      originalText: excerpt,
      correctedText: excerpt,
      explanation:
        'Structured coaching was not returned for this turn — your message is fine to build on; keep replying in Dutch for more specific tips.',
      severity: 'info',
    }
  }

  let feedbackRow: Awaited<ReturnType<typeof feedbackRepo.insertFeedback>> | null = null
  if (thread.feedbackMode === 'turn' && fbPayload) {
    feedbackRow = await feedbackRepo.insertFeedback(pool, {
      threadId: thread.id,
      linkedMessageId: userMessage.id,
      category: fbPayload.category,
      originalText: fbPayload.originalText,
      correctedText: fbPayload.correctedText,
      explanation: fbPayload.explanation,
      severity: fbPayload.severity ?? 'info',
    })
  }

  if (thread.conversationSurface === 'speak_live') {
    const sl = parseSpeakLiveState(thread.speakLiveStateJson) ?? defaultSpeakLiveState()
    const nextRolling = enrichment.updatedSummary.trim().slice(0, 4000) || sl.rollingSummaryEnglish
    const mergedSl: typeof sl = { ...sl, rollingSummaryEnglish: nextRolling }
    await threadRepo.updateThreadState(pool, thread.id, {
      summaryText: nextRolling || thread.summaryText,
      speakLiveStateJson: serializeSpeakLiveState(mergedSl),
    })
  } else {
    await threadRepo.updateThreadState(pool, thread.id, {
      summaryText: enrichment.updatedSummary,
      currentStage: enrichment.scenarioProgress?.stage ?? thread.currentStage,
    })
  }

  const mergedAssistant = await messageRepo.updateMessageMetadata(pool, assistantMessage.id, {
    saveWordCandidates: enrichment.saveWordCandidates,
    enrichmentComplete: true,
    evaluation: enrichment.evaluation ?? undefined,
    scenarioProgress: enrichment.scenarioProgress ?? (assistantMessage.metadata?.scenarioProgress as object) ?? undefined,
    shouldConversationEnd:
      typeof assistantMessage.metadata?.shouldConversationEnd === 'boolean'
        ? assistantMessage.metadata.shouldConversationEnd
        : undefined,
  })

  const updated = (await threadRepo.getThreadById(pool, thread.id))!

  void Promise.all([
    tryUploadConversationArtifact(thread.id, `turn-${assistantMessage.id}.json`, {
      saveWordCandidates: enrichment.saveWordCandidates,
    }),
  ]).catch((e) => aiLogError('enrich_artifact_failed', e, { threadId: thread.id }))

  perf.mark('done')
  perf.logDev(undefined, 'enrichConversationTurn', { threadId: thread.id })

  return {
    feedback: thread.feedbackMode === 'turn' ? feedbackRow : null,
    saveWordCandidates: enrichment.saveWordCandidates,
    thread: updated,
    assistantMessage: mergedAssistant ?? assistantMessage,
    perf: perf.snapshot(),
  }
}

/** NDJSON live stream for Speak Live. Must not call post-session evaluation or Azure pronunciation assessment. @see docs/live-evaluation-boundaries.md */
export async function* streamSendConversationMessageNdjson(params: {
  externalUserId: string
  threadId: string
  text: string
  inputMeta?: ConversationUserInputMeta | null
  /** Same as {@link sendConversationMessage} — optional learner clip for Speak Live evaluation playback. */
  learnerAudio?: { buffer: Buffer; mimeType: string } | null
  ctx?: InvocationContext
}): AsyncGenerator<Record<string, unknown>> {
  const perf = new ConversationPerf()
  perf.mark('handlerStart')
  let normalizationMsStream = 0
  const pool = await requirePool()
  perf.mark('afterPool')
  const mod = createModerationProvider()
  const userInternalId = await userRepo.ensureUser(pool, params.externalUserId)
  let thread = await threadRepo.getThreadById(pool, params.threadId)
  if (!thread) throw new ApiError(404, 'NOT_FOUND', 'Thread not found')
  if (thread.userId !== userInternalId) throw new ApiError(403, 'VALIDATION_ERROR', 'Forbidden')
  if (thread.status !== 'active') throw new ApiError(409, 'CONFLICT', 'Thread is not active')

  let liveTranscriptStream: ReturnType<typeof preprocessLiveSpeechTranscript> | null = null
  if (thread.conversationSurface === 'speak_live') {
    const tNorm = Date.now()
    liveTranscriptStream = preprocessLiveSpeechTranscript(params.text)
    normalizationMsStream = Date.now() - tNorm
    perf.mark('afterNormalize')
  }
  const textForModerationAndLlmStream = liveTranscriptStream?.transcriptNormalized ?? params.text
  if (thread.conversationSurface === 'speak_live' && !textForModerationAndLlmStream.trim()) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'No usable transcript after normalization')
  }
  if (thread.conversationSurface === 'speak_live') {
    assertSpeakLiveConversationModelInfrastructureReady()
    assertConversationBinaryBlobStorageConfigured()
  }
  const threadSpeakLiveStateStream = parseSpeakLiveState(thread.speakLiveStateJson)

  const recentWindow = getConversationRecentMessagesMax()
  const [userMod, scenario, persona] = await Promise.all([
    mod.analyzeUserText(textForModerationAndLlmStream),
    getScenarioByIdCached(pool, thread.scenarioId),
    getPersonaByIdCached(pool, thread.personaId),
  ])
  perf.mark('afterModerationScenario')
  if (!scenario || !persona) {
    throw new ApiError(500, 'DEPENDENCY_UNAVAILABLE', 'Scenario or persona configuration missing')
  }
  const hydratedScenario = applySpeakLiveRuntimeScenario(scenario, threadSpeakLiveStateStream)
  if (userMod.severity === 'block') {
    throw new ApiError(400, 'MODERATION_BLOCKED', userMod.replacementText ?? 'Content blocked by moderation policy')
  }

  const fromInputStream =
    params.inputMeta &&
    (params.inputMeta.inputMode ||
      params.inputMeta.originalTranscript != null ||
      params.inputMeta.audioReference != null ||
      params.inputMeta.learnerLevelCefr != null)
      ? {
          ...(params.inputMeta.inputMode ? { inputMode: params.inputMeta.inputMode } : {}),
          ...(params.inputMeta.originalTranscript != null
            ? { originalTranscript: params.inputMeta.originalTranscript }
            : {}),
          ...(params.inputMeta.learnerLevelCefr != null
            ? { learnerLevelCefr: params.inputMeta.learnerLevelCefr }
            : {}),
          ...(params.inputMeta.audioReference != null
            ? { audioReference: params.inputMeta.audioReference }
            : {}),
        }
      : ({} as Record<string, unknown>)
  const userMetaStream =
    thread.conversationSurface === 'speak_live' && liveTranscriptStream
      ? buildLiveSpeechLearnerTurnMetadata({
          sessionId: thread.id,
          transcriptRaw: liveTranscriptStream.transcriptRaw,
          transcriptNormalized: liveTranscriptStream.transcriptNormalized,
          inputMeta: params.inputMeta ?? undefined,
        })
      : Object.keys(fromInputStream).length > 0
        ? fromInputStream
        : undefined

  let userMessage = await messageRepo.insertMessage(pool, {
    threadId: thread.id,
    sender: 'user',
    messageType: 'text',
    content: textForModerationAndLlmStream,
    metadata: userMetaStream && Object.keys(userMetaStream).length > 0 ? userMetaStream : undefined,
  })
  await threadRepo.updateThreadState(pool, thread.id, { lastUserMessageAt: new Date() })
  perf.mark('afterUserPersist')

  if (hydratedScenario.slug === 'language_coach') {
    const prevSl = parseSpeakLiveState(thread.speakLiveStateJson) ?? defaultSpeakLiveState()
    const nextSl = applyLanguageCoachUserTurnToState(prevSl, textForModerationAndLlmStream, {
      learnerCefr: params.inputMeta?.learnerLevelCefr ?? null,
      inputMode: params.inputMeta?.inputMode,
    })
    const slJson = serializeSpeakLiveState(nextSl)
    await threadRepo.updateThreadState(pool, thread.id, { speakLiveStateJson: slJson })
    thread = { ...thread, speakLiveStateJson: slJson }
  }

  const laStream = params.learnerAudio
  const speakLiveLearnerUploadStream: Promise<SpeakLiveLearnerBlobUploadResult> =
    laStream && laStream.buffer.length >= 32 && thread.conversationSurface === 'speak_live'
      ? (async (): Promise<SpeakLiveLearnerBlobUploadResult> => {
          try {
            const ext =
              laStream.mimeType.includes('webm')
                ? 'webm'
                : laStream.mimeType.includes('wav')
                  ? 'wav'
                  : laStream.mimeType.includes('mpeg')
                    ? 'mp3'
                    : 'bin'
            const fileName = `learner/${userMessage.id}.${ext}`
            const uploaded = await uploadConversationBinaryArtifactRequired(
              thread.id,
              fileName,
              laStream.buffer,
              laStream.mimeType,
            )
            const patched = await messageRepo.updateMessageMetadata(pool, userMessage.id, {
              learnerAudioBlobPath: uploaded,
              learnerAudioMimeType: laStream.mimeType,
            })
            if (patched) userMessage = patched
            return { ok: true }
          } catch (err) {
            return { ok: false, err }
          }
        })()
      : Promise.resolve({ ok: true as const })

  /** Learner clip upload must not block first LLM token — overlap with streaming instead of awaiting with recent fetch. */
  const recent = await messageRepo.listRecentMessagesForThread(pool, thread.id, recentWindow)

  yield {
    type: 'meta',
    userMessage,
    perf: perf.snapshot(),
  }
  perf.mark('firstMetaYield')

  const isSpeakLiveStream = thread.conversationSurface === 'speak_live'
  const provider = createConversationAiProvider()
  let accumulated = ''

  if (isSpeakLiveStream) {
    const prep = prepareAssistantTurnRequest({
      thread,
    scenario: hydratedScenario,
      persona,
      userMessage,
      recent,
      userText: textForModerationAndLlmStream,
      learnerLevelCefrHint: params.inputMeta?.learnerLevelCefr ?? null,
    })
    await maybeAttachLearningPersonalization({
      pool,
      externalUserId: params.externalUserId,
      turnRequest: prep.turnRequest,
    })
    perf.mark('afterPrepTurnRequest')
    perf.mark('beforeReplyStream')
    let replyPromptCharsEstimate = 0
    try {
      const msgs = buildReplyOnlyChatMessages(prep.turnRequest)
      replyPromptCharsEstimate = msgs.reduce((n, m) => n + (typeof m.content === 'string' ? m.content.length : 0), 0)
    } catch {
      replyPromptCharsEstimate = 0
    }
    let reply: AssistantReplyEnvelope | null = null
    let llmStreamMetrics: import('../ai/contracts/ConversationAiProvider').StreamMetrics | undefined
    try {
      for await (const ev of provider.streamAssistantReplyOnly(prep.turnRequest)) {
        if (ev.type === 'delta' && ev.text) {
          yield { type: 'delta', text: ev.text }
        }
        if (ev.type === 'complete') {
          reply = ev.envelope
          llmStreamMetrics = ev.streamMetrics
        }
      }
    } catch (e) {
      mapAiErrorToApi(e)
    }
    perf.mark('afterReplyStream')
    if (!reply) {
      throw new ApiError(502, 'LLM_ERROR', 'Speak Live reply stream ended without completion')
    }

    const goalCountStreamMerge =
      hydratedScenario.slug === 'language_coach' ? 0 : hydratedScenario.goals.length
    const mergedSpeakLiveSignals =
      prep.isSpeakLive && prep.speakLivePrevState && prep.groundingPatch
        ? mergeSpeakLiveSignalsWithGrounding({
            model: reply.speakLiveSignals,
            patch: prep.groundingPatch,
          scenarioGoalCount: goalCountStreamMerge,
            phase: prep.speakLivePrevState.phase,
          })
        : reply.speakLiveSignals

    accumulated = reply.assistantReply
    if (prep.isSpeakLive && isDutchSpeakLiveServiceScene(hydratedScenario.slug)) {
      accumulated = stripLeadingEnglishClauseFromOrderingFoodAssistantLine(accumulated)
    }
    const asstModSl = await mod.analyzeAssistantText(accumulated)
    perf.mark('afterAssistantMod')
    if (asstModSl.severity === 'block') {
      accumulated =
        asstModSl.replacementText ??
        'Excuses — ik kan dit zo niet beantwoorden. Kunt u uw vraag anders formuleren?'
    }

    const nextSpeakLiveState =
      prep.isSpeakLive && prep.speakLivePrevState
        ? computeNextSpeakLiveState({
            prev: prep.speakLivePrevState,
          scenarioGoalCount: goalCountStreamMerge,
            signals: mergedSpeakLiveSignals,
            shouldConversationEnd: reply.shouldConversationEnd,
            userTextTrimmed: textForModerationAndLlmStream.trim(),
            scenarioSlug: hydratedScenario.slug,
          })
        : null

    const persistSl = await persistAssistantAndSpeakLiveTurn({
      pool,
      thread,
    scenario: hydratedScenario,
      userMessage,
      userTextTrimmed: textForModerationAndLlmStream.trim(),
      reply,
      assistantText: accumulated,
      mergedSpeakLiveSignals,
      isSpeakLive: prep.isSpeakLive,
      speakLivePrevState: prep.speakLivePrevState,
      nextSpeakLiveState,
      turnRequest: prep.turnRequest,
      verifiedGroundingBlock: prep.verifiedGroundingBlock,
      threadSummaryForLlm: prep.threadSummaryForLlm,
      recent,
    })
    perf.mark('afterAssistantPersist')

    const streamPerfSnap = perf.snapshot()
    const serverLatencyTraceStream = buildSpeakLiveServerLatencyTrace({
      perf,
      threadId: thread.id,
      userMessageId: userMessage.id,
      normalizationMs: normalizationMsStream,
      replyPromptCharsEstimate,
      assistantReplyChars: accumulated.length,
      modelLabel: provider.turnModelLabel,
    })

    const liveCoachTurnFeedback = buildLiveCoachTurnFeedback({
      thread: persistSl.updated,
      userText: textForModerationAndLlmStream.trim(),
      assistantReply: accumulated.trim(),
    })

    if (prep.isSpeakLive) {
      assertSpeakLiveLearnerBlobUploadOk(await speakLiveLearnerUploadStream)
      const umS = (userMessage.metadata ?? {}) as Record<string, unknown>
      const learnerAudioRefS = typeof umS.learnerAudioBlobPath === 'string' ? umS.learnerAudioBlobPath : null
      try {
        await messageRepo.updateMessageMetadata(pool, userMessage.id, {
          turnId: userMessage.id,
          learnerAudioRef: learnerAudioRefS,
          liveConversationPipeline: LIVE_CONVERSATION_PIPELINE_ID,
          liveTurnLatencyTrace: serverLatencyTraceStream,
          latencyTrace: streamPerfSnap,
          assistantMessageIdForTurn: persistSl.assistantMessage.id,
        })
        await messageRepo.updateMessageMetadata(
          pool,
          persistSl.assistantMessage.id,
          buildLiveSpeechAssistantTurnMetadata({
            sessionId: thread.id,
            learnerTurnId: userMessage.id,
            assistantText: accumulated,
          }),
        )
      } catch {
        /* non-fatal metadata enrichment */
      }
    }

    yield {
      type: 'done',
      userMessage,
      assistantMessage: persistSl.assistantMessage,
      thread: persistSl.updated,
      enrichmentPending: false,
      perf: streamPerfSnap,
      liveTurnLatencyTrace: serverLatencyTraceStream,
      speakLiveStreamMeta: {
        stageAModelLabel: provider.turnModelLabel,
        replyPromptCharsEstimate,
        estimatedInputTokens: llmStreamMetrics?.estimatedInputTokens ?? serverLatencyTraceStream.estimatedInputTokens,
        estimatedOutputTokens: llmStreamMetrics?.estimatedOutputTokens ?? serverLatencyTraceStream.estimatedOutputTokens,
        firstTokenMs: llmStreamMetrics?.firstTokenMs,
        llmTotalMs: llmStreamMetrics?.totalMs,
        responseChars: llmStreamMetrics?.responseChars,
        model: llmStreamMetrics?.model,
        fastPath: true,
      },
      liveTurnDiagnostics: liveConversationPipelineDiagnostics({
        llmMs: serverLatencyTraceStream.llmMs,
        moderationMs: serverLatencyTraceStream.moderationAssistantMs ?? undefined,
      }),
      ...(liveCoachTurnFeedback ? { liveCoachTurnFeedback } : {}),
    }
    perf.logDev(params.ctx, 'streamSendConversationMessageNdjson', { threadId: thread.id })

    if (prep.isSpeakLive && laStream && laStream.buffer.length >= 32) {
      const bgPrepOnly = prepareLiveTurnVoicePrepInBackground({
        pool,
        threadId: thread.id,
        userMessage,
        audio: laStream.buffer,
        mimeType: laStream.mimeType,
      })
      trackLiveUpload(thread.id, bgPrepOnly)
    }
    return
  }

  perf.mark('beforeReplyStream')
  try {
    const prepTextStream = prepareAssistantTurnRequest({
      thread,
      scenario: hydratedScenario,
      persona,
      userMessage,
      recent,
      userText: textForModerationAndLlmStream,
      learnerLevelCefrHint: params.inputMeta?.learnerLevelCefr ?? null,
    })
    await maybeAttachLearningPersonalization({
      pool,
      externalUserId: params.externalUserId,
      turnRequest: prepTextStream.turnRequest,
    })
    for await (const piece of provider.streamAssistantPlainText(prepTextStream.turnRequest)) {
      accumulated += piece
      if (piece) yield { type: 'delta', text: piece }
    }
  } catch (e) {
    mapAiErrorToApi(e)
  }
  perf.mark('afterReplyStream')

  const asstMod = await mod.analyzeAssistantText(accumulated)
  perf.mark('afterAssistantMod')
  if (asstMod.severity === 'block') {
    accumulated =
      asstMod.replacementText ??
      'Excuses — ik kan dit zo niet beantwoorden. Kunt u uw vraag anders formuleren?'
  }

  const assistantMessage = await messageRepo.insertMessage(pool, {
    threadId: thread.id,
    sender: 'assistant',
    messageType: 'text',
    content: accumulated,
    metadata: {
      enrichmentPending: true,
    },
  })
  perf.mark('afterAssistantPersist')

  const updated = (await threadRepo.getThreadById(pool, thread.id))!

  void publishAppEvent('ConversationTurnCompleted', {
    threadId: thread.id,
    messageId: assistantMessage.id,
  }).catch((e) => aiLogError('conversation_turn_sidefx_failed', e, { threadId: thread.id }))

  yield {
    type: 'done',
    userMessage,
    assistantMessage,
    thread: updated,
    enrichmentPending: true,
    perf: perf.snapshot(),
  }
  perf.logDev(params.ctx, 'streamSendConversationMessageNdjson', { threadId: thread.id })
}

export async function endConversation(params: {
  externalUserId: string
  threadId: string
}): Promise<{
  summary: ConversationSummary
  thread: ConversationThread
  speakLiveRecapDebug?: Record<string, unknown>
}> {
  const pool = await requirePool()
  const userInternalId = await userRepo.ensureUser(pool, params.externalUserId)
  const thread = await threadRepo.getThreadById(pool, params.threadId)
  if (!thread) throw new ApiError(404, 'NOT_FOUND', 'Thread not found')
  if (thread.userId !== userInternalId) throw new ApiError(403, 'VALIDATION_ERROR', 'Forbidden')

  /**
   * Idempotency: if this thread has already been ended, replay the cached summary instead of
   * re-running the AI summary, draining background uploads, and re-seeding the live evaluation.
   *
   * Without this, a second `endConversation` call (stale tab, retry after a slow first response,
   * or back-button revisit) would produce duplicate work — and the duplicate `seedPendingLiveEvaluation`
   * insert would crash with a `PK_LiveSessionEvaluations` primary key violation.
   */
  if (thread.status === 'completed' && thread.summaryText) {
    try {
      const cachedSummary = JSON.parse(thread.summaryText) as ConversationSummary
      if (cachedSummary && typeof cachedSummary === 'object') {
        return { summary: cachedSummary, thread }
      }
    } catch {
      /* fall through and regenerate when the cached summary is unreadable */
    }
  }

  if (thread.conversationSurface === 'speak_live') {
    await threadRepo.updateThreadState(pool, thread.id, { speakLivePostSessionPhase: 'ending' })
  }

  const messages = await messageRepo.listMessagesForThread(pool, thread.id)
  const feedbackRows = await feedbackRepo.listFeedbackForThread(pool, thread.id)
  const feedbackNotes = feedbackRows.map((f) => `${f.originalText} → ${f.correctedText}`).join('\n')

  const scenario = await scenarioRepo.getScenarioById(pool, thread.scenarioId)
  const slState = parseSpeakLiveState(thread.speakLiveStateJson)
  const hydratedScenario = applySpeakLiveRuntimeScenario(scenario, slState)
  const liveRecapInput =
    hydratedScenario.slug === 'train-station' && thread.conversationSurface === 'speak_live'
      ? buildLiveScenarioRecapInput({
          scenarioId: hydratedScenario.id,
          slotState: slState?.scenarioSessionState ?? null,
          feedbackNotes,
          messages,
        })
      : null
  const recapContext = {
    conversationSurface: thread.conversationSurface,
    scenarioTitle: hydratedScenario.title,
    scenarioGoals: hydratedScenario.goals,
    speakLiveRollingSummary: slState?.rollingSummaryEnglish,
    threadCurrentStage: thread.currentStage,
    speakLiveGoalsCompletedIndexes: slState?.goalsCompleted?.length ? [...slState.goalsCompleted].sort((a, b) => a - b) : undefined,
    trainStationSlotRecapSummary:
      hydratedScenario.slug === 'train-station' ? trainStationRecapSlotSummary(slState?.scenarioSessionState ?? null) : undefined,
    trainStationLiveRecapInputJson: liveRecapInput ? JSON.stringify(liveRecapInput) : null,
  }

  const provider = createConversationAiProvider()
  let summary: ConversationSummary
  try {
    summary = await provider.generateEndSummary({
      threadId: thread.id,
      messages,
      feedbackNotes,
      recapContext,
    })
  } catch (e) {
    aiLogError('end_summary_ai_failed', e, { threadId: thread.id })
    summary = fallbackRecapSummary(thread.id)
  }

  const isPublicTransportTrainStation =
    hydratedScenario.slug === 'train-station' &&
    slState?.scenarioRuntimeConfig?.id === PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID

  if (hydratedScenario.slug === 'train-station' && slState?.scenarioSessionState) {
    summary = reconcileTrainStationLiveRecap({
      summary,
      slotState: slState.scenarioSessionState,
      preserveScenarioGoals: Boolean(isPublicTransportTrainStation),
    })
  }

  if (
    thread.conversationSurface === 'speak_live' &&
    isPublicTransportTrainStation &&
    slState?.scenarioSessionState &&
    slState.scenarioRuntimeConfig?.goals?.length
  ) {
    const variation =
      normalizePublicTransportVariation(slState.scenarioRuntimeConfig.variation) ?? 'route_and_platform'
    summary = reconcilePublicTransportLiveRecap({
      summary,
      slotState: slState.scenarioSessionState,
      variation,
      scenarioGoals: slState.scenarioRuntimeConfig.goals,
      scenarioRuntime: slState.scenarioRuntimeConfig,
      userMessageTexts: messages.filter((m) => m.sender === 'user').map((m) => m.content.trim()).filter(Boolean),
    })
  }

  if (thread.conversationSurface === 'speak_live') {
    const slugNorm = hydratedScenario.slug.trim().toLowerCase().replace(/-/g, '_')
    if (slugNorm === 'ordering_food') {
      summary = reconcileOrderingFoodLiveRecap({
        summary,
        scenarioSlug: hydratedScenario.slug,
        scenarioGoals: hydratedScenario.goals,
        slState,
        userMessageTexts: messages
          .filter((m) => m.sender === 'user')
          .map((m) => m.content.trim())
          .filter(Boolean),
      })
    } else if (slugNorm === 'supermarket_shop') {
      summary = reconcileSupermarketShopLiveRecap({
        summary,
        scenarioSlug: hydratedScenario.slug,
        scenarioGoals: hydratedScenario.goals,
        slState,
        userMessageTexts: messages
          .filter((m) => m.sender === 'user')
          .map((m) => m.content.trim())
          .filter(Boolean),
      })
    } else if (slugNorm === 'directions_getting_somewhere') {
      summary = reconcileDirectionsGettingSomewhereLiveRecap({
        summary,
        scenarioSlug: hydratedScenario.slug,
        scenarioGoals: hydratedScenario.goals,
        slState,
        userMessageTexts: messages
          .filter((m) => m.sender === 'user')
          .map((m) => m.content.trim())
          .filter(Boolean),
      })
    } else if (slugNorm === 'booking_reservations') {
      summary = reconcileBookingReservationsLiveRecap({
        summary,
        scenarioSlug: hydratedScenario.slug,
        scenarioGoals: hydratedScenario.goals,
        slState,
        userMessageTexts: messages
          .filter((m) => m.sender === 'user')
          .map((m) => m.content.trim())
          .filter(Boolean),
      })
    } else if (slugNorm === 'store_service_issue') {
      summary = reconcileStoreServiceIssueLiveRecap({
        summary,
        scenarioSlug: hydratedScenario.slug,
        scenarioGoals: hydratedScenario.goals,
        slState,
        userMessageTexts: messages
          .filter((m) => m.sender === 'user')
          .map((m) => m.content.trim())
          .filter(Boolean),
      })
    } else if (slugNorm === 'work_colleague_interaction') {
      summary = reconcileWorkColleagueInteractionLiveRecap({
        summary,
        scenarioSlug: hydratedScenario.slug,
        scenarioGoals: hydratedScenario.goals,
        slState,
        userMessageTexts: messages
          .filter((m) => m.sender === 'user')
          .map((m) => m.content.trim())
          .filter(Boolean),
      })
    } else if (slugNorm === 'housing_landlord') {
      summary = reconcileHousingLandlordLiveRecap({
        summary,
        scenarioSlug: hydratedScenario.slug,
        scenarioGoals: hydratedScenario.goals,
        slState,
        userMessageTexts: messages
          .filter((m) => m.sender === 'user')
          .map((m) => m.content.trim())
          .filter(Boolean),
      })
    } else if (slugNorm === 'doctor_pharmacy') {
      summary = reconcileDoctorPharmacyLiveRecap({
        summary,
        scenarioSlug: hydratedScenario.slug,
        scenarioGoals: hydratedScenario.goals,
        slState,
        userMessageTexts: messages
          .filter((m) => m.sender === 'user')
          .map((m) => m.content.trim())
          .filter(Boolean),
      })
    } else if (slugNorm === PHONE_CALL_SCENARIO_ID) {
      summary = reconcilePhoneCallLiveRecap({
        summary,
        scenarioSlug: hydratedScenario.slug,
        scenarioGoals: hydratedScenario.goals,
        slState,
        userMessageTexts: messages
          .filter((m) => m.sender === 'user')
          .map((m) => m.content.trim())
          .filter(Boolean),
      })
    } else if (slugNorm === SMALL_TALK_SCENARIO_ID) {
      summary = reconcileSmallTalkLiveRecap({
        summary,
        scenarioSlug: hydratedScenario.slug,
        scenarioGoals: hydratedScenario.goals,
        slState,
        userMessageTexts: messages
          .filter((m) => m.sender === 'user')
          .map((m) => m.content.trim())
          .filter(Boolean),
      })
    } else if (slugNorm === MEETING_NEW_PEOPLE_SCENARIO_ID) {
      summary = reconcileMeetingNewPeopleLiveRecap({
        summary,
        scenarioSlug: hydratedScenario.slug,
        scenarioGoals: hydratedScenario.goals,
        slState,
        userMessageTexts: messages
          .filter((m) => m.sender === 'user')
          .map((m) => m.content.trim())
          .filter(Boolean),
      })
    } else if (slugNorm === EXPLAINING_SOMETHING_SCENARIO_ID) {
      summary = reconcileExplainingSomethingLiveRecap({
        summary,
        scenarioSlug: hydratedScenario.slug,
        scenarioGoals: hydratedScenario.goals,
        slState,
        userMessageTexts: messages
          .filter((m) => m.sender === 'user')
          .map((m) => m.content.trim())
          .filter(Boolean),
      })
    } else if (slugNorm === STORYTELLING_SCENARIO_ID) {
      summary = reconcileStorytellingLiveRecap({
        summary,
        scenarioSlug: hydratedScenario.slug,
        scenarioGoals: hydratedScenario.goals,
        slState,
        userMessageTexts: messages
          .filter((m) => m.sender === 'user')
          .map((m) => m.content.trim())
          .filter(Boolean),
      })
    } else if (slugNorm === OPINIONS_DISCUSSIONS_SCENARIO_ID) {
      summary = reconcileOpinionsDiscussionsLiveRecap({
        summary,
        scenarioSlug: hydratedScenario.slug,
        scenarioGoals: hydratedScenario.goals,
        slState,
        userMessageTexts: messages
          .filter((m) => m.sender === 'user')
          .map((m) => m.content.trim())
          .filter(Boolean),
      })
    } else if (slugNorm === PARTY_SOCIAL_SCENARIO_ID) {
      summary = reconcilePartySocialLiveRecap({
        summary,
        scenarioSlug: hydratedScenario.slug,
        scenarioGoals: hydratedScenario.goals,
        slState,
        userMessageTexts: messages
          .filter((m) => m.sender === 'user')
          .map((m) => m.content.trim())
          .filter(Boolean),
      })
    }
  }

  let speakLiveRecapDebug: Record<string, unknown> | undefined
  if (
    speakLiveGroundingDebugEnabled() &&
    thread.conversationSurface === 'speak_live' &&
    hydratedScenario.slug === 'train-station'
  ) {
    speakLiveRecapDebug = {
      recapInputJson: liveRecapInput ? JSON.stringify(liveRecapInput) : null,
      summaryAfterReconcile: {
        goalsCompleted: summary.goalsCompleted ?? [],
        goalsMissed: summary.goalsMissed ?? [],
        transcriptEvidence: summary.transcriptEvidence ?? [],
        whatWentWell: summary.whatWentWell ?? [],
        whatToImprove: summary.whatToImprove ?? [],
        suggestedNextAction: summary.suggestedNextAction,
        recommendedNextStep: summary.recommendedNextStep ?? null,
      },
    }
    aiLogInfo('speak_live_recap_debug', {
      threadId: thread.id,
      hasRecapInput: Boolean(liveRecapInput),
      goalsCompletedCount: (summary.goalsCompleted ?? []).length,
      goalsMissedCount: (summary.goalsMissed ?? []).length,
    })
  }

  if (thread.conversationSurface === 'speak_live') {
    await drainLiveUploads(thread.id)
  }

  await threadRepo.updateThreadState(pool, thread.id, {
    status: 'completed',
    summaryText: JSON.stringify(summary),
    ...(thread.conversationSurface === 'speak_live' ? { speakLivePostSessionPhase: 'evaluating' } : {}),
  })

  const updated = (await threadRepo.getThreadById(pool, thread.id))!
  await publishAppEvent('ConversationEnded', { threadId: thread.id })
  if (updated.conversationSurface === 'speak_live') {
    await publishAppEvent('speak_live.session.ended', {
      threadId: thread.id,
      conversationSurface: 'speak_live',
    })
    try {
      /**
       * Dynamic import keeps post-session evaluation off the static module graph of this file.
       * Live turn paths (`sendConversationMessage` / stream) must never eagerly load evaluation workers.
       * @see docs/live-evaluation-boundaries.md
       */
      const { seedPendingLiveEvaluation } = await import('../speak-live/liveSessionEvaluationAppService')
      await seedPendingLiveEvaluation({ externalUserId: params.externalUserId, threadId: updated.id })
    } catch (e) {
      aiLogError('live_eval_pending_seed_failed', e, { threadId: updated.id })
    }
  }
  if (updated.conversationSurface === 'text') {
    fireAndForgetLearningIngestion(
      () =>
        ingestTextConversationSession({
          pool,
          userId: userInternalId,
          threadId: updated.id,
          scenarioId: hydratedScenario.id,
          scenarioSlug: hydratedScenario.slug,
          summary,
          feedback: feedbackRows,
        }),
      'text_end_conversation',
    )
  }
  return { summary, thread: updated, ...(speakLiveRecapDebug ? { speakLiveRecapDebug } : {}) }
}

export async function getTalkContinue(params: { externalUserId: string }): Promise<{
  activeThread: ConversationThread | null
  scenario: ScenarioConfig | null
  persona: PersonaConfig | null
  trainPausedThreads: ConversationThread[]
  trainRecentCompleted: ConversationThread[]
  nextTrainingLoop: {
    id: string
    loopType: string
    title: string
    subtitle: string | null
    reason: string
    estimatedMinutes: number
    difficulty: string
    status: string
    targetSkills: string[]
    threadId: string | null
    sourceSessionId: string
    sourceType: string
    loopSlot: number
  } | null
  activeTrainingLoops: Array<{
    id: string
    loopType: string
    title: string
    subtitle: string | null
    reason: string
    estimatedMinutes: number
    difficulty: string
    status: string
    targetSkills: string[]
    threadId: string | null
    sourceSessionId: string
    sourceType: string
    loopSlot: number
  }>
  /** Recent completed / dismissed / stale loops for Activity + dedupe context (non-blocking). */
  trainingLoopHistory: Array<{
    id: string
    loopType: string
    title: string
    status: string
    updatedAt: string
    loopSlot: number
    completionInsight: string | null
  }>
  learningFocus: {
    workingOnChip: string | null
    bestNextStep: string | null
    recommendedScenarioSlug: string | null
    recommendedReadAloudProfile: string | null
    recommendedBecause: string | null
    coldStart: boolean
    /** Optional one-liner for recommended next scene (Talk hub; non-clutter). */
    scenarioPersonalizationLine: string | null
    recommendations: Array<{
      type: string
      targetId: string
      title: string
      subtitle: string
      reason: string
      confidence: number
      priorityScore: number
    }>
    skillsPreview: ReturnType<typeof buildTalkSkillsPreview>
  } | null
}> {
  const pool = await requirePool()
  const uid = await userRepo.getUserInternalId(pool, params.externalUserId)
  if (!uid) {
    return {
      activeThread: null,
      scenario: null,
      persona: null,
      trainPausedThreads: [],
      trainRecentCompleted: [],
      nextTrainingLoop: null,
      activeTrainingLoops: [],
      trainingLoopHistory: [],
      learningFocus: null,
    }
  }
  const activeThread = await threadRepo.getLatestActiveThreadForUser(pool, uid)
  const [scenario, persona] = activeThread
    ? await Promise.all([
        scenarioRepo.getScenarioById(pool, activeThread.scenarioId),
        personaRepo.getPersonaById(pool, activeThread.personaId),
      ])
    : [null, null]
  const hydratedScenario = activeThread && scenario ? applySpeakLiveRuntimeScenario(scenario, parseSpeakLiveState(activeThread.speakLiveStateJson)) : null

  let trainPausedThreads: ConversationThread[] = []
  let trainRecentCompleted: ConversationThread[] = []
  try {
    const trainScenario = await scenarioRepo.getScenarioBySlug(pool, 'train-station')
    trainPausedThreads = await threadRepo.listThreadsByUserScenarioAndStatus(pool, uid, trainScenario.id, 'paused', 5)
    trainRecentCompleted = await threadRepo.listThreadsByUserScenarioAndStatus(
      pool,
      uid,
      trainScenario.id,
      'completed',
      3
    )
  } catch {
    /* train scenario not seeded — omit lists */
  }

  let learningFocus: {
    workingOnChip: string | null
    bestNextStep: string | null
    recommendedScenarioSlug: string | null
    recommendedReadAloudProfile: string | null
    recommendedBecause: string | null
    coldStart: boolean
    scenarioPersonalizationLine: string | null
    recommendations: Array<{
      type: string
      targetId: string
      title: string
      subtitle: string
      reason: string
      confidence: number
      priorityScore: number
    }>
    skillsPreview: ReturnType<typeof buildTalkSkillsPreview>
  } | null = null
  try {
    const pj = await userLearningMemoryRepository.getUserLearningProfileJson(pool, uid)
    const doc = parseUserLearningProfileDocument(pj, uid)
    const rec = buildPracticeRecommendations(doc)
    const recSlug = rec.recommendedNextScenarioSlug?.trim()
    const scenarioPersonalizationLine = recSlug
      ? formatScenarioAdaptiveOneLiner(doc, recSlug.toLowerCase().replace(/-/g, '_'))
      : null
    learningFocus = {
      workingOnChip: rec.workingOnChip,
      bestNextStep: rec.bestNextStep,
      recommendedScenarioSlug: rec.recommendedNextScenarioSlug,
      recommendedReadAloudProfile: rec.recommendedReadAloudProfile,
      recommendedBecause: rec.recommendedNextScenarioBecause ?? rec.recommendedReadAloudBecause,
      coldStart: rec.coldStart,
      scenarioPersonalizationLine,
      recommendations: rec.recommendations,
      skillsPreview: buildTalkSkillsPreview(doc),
    }
  } catch {
    learningFocus = null
  }

  let nextTrainingLoop: {
    id: string
    loopType: string
    title: string
    subtitle: string | null
    reason: string
    estimatedMinutes: number
    difficulty: string
    status: string
    targetSkills: string[]
    threadId: string | null
    sourceSessionId: string
    sourceType: string
    loopSlot: number
  } | null = null
  let activeTrainingLoops: Array<{
    id: string
    loopType: string
    title: string
    subtitle: string | null
    reason: string
    estimatedMinutes: number
    difficulty: string
    status: string
    targetSkills: string[]
    threadId: string | null
    sourceSessionId: string
    sourceType: string
    loopSlot: number
  }> = []
  try {
    const loops = await trainingLoopPersistence.getActiveTrainingLoops(pool, uid, 8)
    const compact = loops.map((L) => ({
      id: L.id,
      loopType: L.loopType,
      title: L.title,
      subtitle: L.subtitle ?? null,
      reason: L.reason,
      estimatedMinutes: L.estimatedMinutes,
      difficulty: L.difficulty,
      status: L.status,
      targetSkills: L.targetSkills,
      threadId: L.threadId,
      sourceSessionId: L.sourceSessionId,
      sourceType: L.sourceType,
      loopSlot: L.loopSlot,
    }))
    activeTrainingLoops = compact
    nextTrainingLoop = compact[0] ?? null
  } catch {
    nextTrainingLoop = null
    activeTrainingLoops = []
  }

  let trainingLoopHistory: Array<{
    id: string
    loopType: string
    title: string
    status: string
    updatedAt: string
    loopSlot: number
    completionInsight: string | null
  }> = []
  try {
    const hist = await trainingLoopPersistence.listTrainingLoopHistory(pool, uid, 8)
    trainingLoopHistory = hist.map((L) => ({
      id: L.id,
      loopType: L.loopType,
      title: L.title,
      status:
        L.status === 'completed' || L.status === 'dismissed' || L.status === 'stale'
          ? L.status
          : ('stale' as const),
      updatedAt: L.updatedAt,
      loopSlot: L.loopSlot,
      completionInsight: L.lastCompletionResult?.completionInsight?.trim() ?? null,
    }))
  } catch {
    trainingLoopHistory = []
  }

  return {
    activeThread,
    scenario: hydratedScenario,
    persona,
    trainPausedThreads,
    trainRecentCompleted,
    learningFocus,
    nextTrainingLoop,
    activeTrainingLoops,
    trainingLoopHistory,
  }
}

/** Completed conversation threads (all scenarios), newest first — for History and Talk Activity. */
export async function getTalkSessionHistory(params: { externalUserId: string }): Promise<{
  threads: ConversationThread[]
}> {
  const pool = await requirePool()
  const uid = await userRepo.getUserInternalId(pool, params.externalUserId)
  if (!uid) return { threads: [] }
  const threads = await threadRepo.listRecentCompletedThreadsForUser(pool, uid, 48)
  return { threads }
}

export async function getTalkSkillProfile(params: {
  externalUserId: string
  /** When true, caller must be dev-gated (header + non-production); attaches `skillSystemDebug`. */
  devToolsSkillDebug?: boolean
}): Promise<{
  coldStart: boolean
  activeTrainingLoops: Array<{
    id: string
    loopType: string
    title: string
    subtitle: string | null
    reason: string
    estimatedMinutes: number
    difficulty: string
    status: string
    targetSkills: string[]
    threadId: string | null
    sourceSessionId: string
  }>
  profile: UserSkillProfile | null
  definitions: Array<{
    id: string
    group: string
    label: string
    shortDescription: string
    longDescription: string
    displayOrder: number
    whyItMatters: string
    iconToken: string
    relatedScenarioSlugs: string[]
    relatedReadAloudProfiles: string[]
    relatedCoachGoals: string[]
  }>
  skillSystemDebug?: ReturnType<typeof buildSkillSystemDevDebugPayload>
}> {
  const pool = await requirePool()
  const uid = await userRepo.getUserInternalId(pool, params.externalUserId)
  const definitions = SKILL_DEFINITIONS.map((d) => ({
    id: d.id,
    group: d.group,
    label: d.label,
    shortDescription: d.shortDescription,
    longDescription: d.longDescription,
    displayOrder: d.displayOrder,
    whyItMatters: d.whyItMatters,
    iconToken: d.iconToken,
    relatedScenarioSlugs: d.relatedScenarioSlugs,
    relatedReadAloudProfiles: d.relatedReadAloudProfiles,
    relatedCoachGoals: d.relatedCoachGoals,
  }))
  if (!uid) {
    return { coldStart: true, activeTrainingLoops: [], profile: null, definitions }
  }
  let activeTrainingLoops: Array<{
    id: string
    loopType: string
    title: string
    subtitle: string | null
    reason: string
    estimatedMinutes: number
    difficulty: string
    status: string
    targetSkills: string[]
    threadId: string | null
    sourceSessionId: string
    sourceType: string
    loopSlot: number
  }> = []
  try {
    const loops = await trainingLoopPersistence.getActiveTrainingLoops(pool, uid, 12)
    activeTrainingLoops = loops.map((L) => ({
      id: L.id,
      loopType: L.loopType,
      title: L.title,
      subtitle: L.subtitle ?? null,
      reason: L.reason,
      estimatedMinutes: L.estimatedMinutes,
      difficulty: L.difficulty,
      status: L.status,
      targetSkills: L.targetSkills,
      threadId: L.threadId,
      sourceSessionId: L.sourceSessionId,
      sourceType: L.sourceType,
      loopSlot: L.loopSlot,
    }))
  } catch {
    activeTrainingLoops = []
  }
  const pj = await userLearningMemoryRepository.getUserLearningProfileJson(pool, uid)
  const doc = parseUserLearningProfileDocument(pj, uid)
  const base = {
    coldStart: doc.totalSessionsObserved < 2,
    activeTrainingLoops,
    profile: doc.userSkillProfile ?? null,
    definitions,
  }
  if (params.devToolsSkillDebug) {
    const loopDiag = await trainingLoopPersistence.getTrainingLoopDevDiagnosticsSnapshot(pool, uid).catch(() => ({
      activeLoopsWithGenerationDebug: [],
      recentLifecycleEvents: [],
    }))
    return {
      ...base,
      skillSystemDebug: { ...buildSkillSystemDevDebugPayload(doc), personalizedTrainingLoops: loopDiag },
    }
  }
  return base
}

export async function pauseConversationThread(params: {
  externalUserId: string
  threadId: string
}): Promise<{ thread: ConversationThread }> {
  const pool = await requirePool()
  const userInternalId = await userRepo.ensureUser(pool, params.externalUserId)
  const thread = await threadRepo.getThreadById(pool, params.threadId)
  if (!thread) throw new ApiError(404, 'NOT_FOUND', 'Thread not found')
  if (thread.userId !== userInternalId) throw new ApiError(403, 'VALIDATION_ERROR', 'Forbidden')
  if (thread.status === 'completed') throw new ApiError(409, 'CONFLICT', 'Thread is already completed')
  if (thread.status === 'paused') {
    return { thread }
  }
  await threadRepo.updateThreadState(pool, thread.id, { status: 'paused' })
  const updated = (await threadRepo.getThreadById(pool, thread.id))!
  void publishAppEvent('ConversationPaused', { threadId: thread.id }).catch((e) =>
    aiLogError('conversation_pause_event_failed', e, { threadId: thread.id })
  )
  return { thread: updated }
}

export async function resumeConversationThread(params: {
  externalUserId: string
  threadId: string
}): Promise<{ thread: ConversationThread }> {
  const pool = await requirePool()
  const userInternalId = await userRepo.ensureUser(pool, params.externalUserId)
  const thread = await threadRepo.getThreadById(pool, params.threadId)
  if (!thread) throw new ApiError(404, 'NOT_FOUND', 'Thread not found')
  if (thread.userId !== userInternalId) throw new ApiError(403, 'VALIDATION_ERROR', 'Forbidden')
  if (thread.status === 'completed') throw new ApiError(409, 'CONFLICT', 'Thread is completed — start a new chat instead')
  if (thread.status === 'active') {
    return { thread }
  }
  await threadRepo.updateThreadState(pool, thread.id, { status: 'active' })
  await threadRepo.pauseOtherActiveThreads(pool, userInternalId, thread.scenarioId, thread.id)
  const updated = (await threadRepo.getThreadById(pool, thread.id))!
  void publishAppEvent('ConversationResumed', { threadId: thread.id }).catch((e) =>
    aiLogError('conversation_resume_event_failed', e, { threadId: thread.id })
  )
  return { thread: updated }
}

export async function saveWord(params: {
  externalUserId: string
  text: string
  meaning?: string | null
  sourceThreadId?: string | null
  sourceMessageId?: string | null
  sourceScenarioId?: string | null
  sourceType: string
}): Promise<{ item: Awaited<ReturnType<typeof savedWordRepo.insertSavedWord>> }> {
  const pool = await requirePool()
  const userInternalId = await userRepo.ensureUser(pool, params.externalUserId)
  const item = await savedWordRepo.insertSavedWord(pool, {
    userInternalId,
    text: params.text,
    meaning: params.meaning,
    sourceType: params.sourceType,
    sourceThreadId: params.sourceThreadId,
    sourceMessageId: params.sourceMessageId,
    sourceScenarioId: params.sourceScenarioId,
  })
  return { item }
}

export async function healthCheck(): Promise<{
  status: 'ok' | 'degraded'
  sql: 'up' | 'down' | 'skipped'
  profile: string
  aiProvider: string
  aiProviderConfigOk: boolean
  aiProviderConfigDetail?: string
}> {
  const profile = process.env.APP_PROFILE ?? 'LocalMock'
  const aiProvider = getResolvedAiProviderId()
  let aiProviderConfigOk = true
  let aiProviderConfigDetail: string | undefined
  try {
    assertProviderConfigReady(aiProvider)
  } catch (e) {
    aiProviderConfigOk = false
    aiProviderConfigDetail = e instanceof Error ? e.message : String(e)
  }

  const pool = await getSqlPool()
  if (!pool) {
    return {
      status: 'degraded',
      sql: 'skipped',
      profile,
      aiProvider,
      aiProviderConfigOk,
      aiProviderConfigDetail,
    }
  }
  try {
    await pool.request().query('SELECT 1 AS ok')
    return {
      status: aiProviderConfigOk ? 'ok' : 'degraded',
      sql: 'up',
      profile,
      aiProvider,
      aiProviderConfigOk,
      aiProviderConfigDetail,
    }
  } catch {
    return {
      status: 'degraded',
      sql: 'down',
      profile,
      aiProvider,
      aiProviderConfigOk,
      aiProviderConfigDetail,
    }
  }
}
