'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronLeft, CircleHelp, Copy, MoreHorizontal, PhoneOff, RotateCcw, Wifi, X } from 'lucide-react'
import { clsx } from 'clsx'
import { playAppSound } from '@/lib/interaction/appSounds'
import { conversationClient } from '@/lib/api/conversationClient'
import { ApiRequestError } from '@/lib/api/apiErrors'
import type { ApiLiveCoachTurnFeedback } from '@/lib/api/apiTypes'
import { armHtmlAudioElement, configureHtmlAudioElement, toPlayableAudioSrc } from '@/lib/audio/htmlAudioPlayback'
import { stripMarkdownForTts } from '@/lib/speech/stripMarkdownForTts'
import { getSpeakLiveAzureSegmentationSilenceMs, isSpeakLiveBrowserAzureSttEnabled } from '@/lib/api/apiConfig'
import { appTalkThread } from '@/lib/routing/appRoutes'
import { ensureMicStream, micErrorKind, stopMediaStream } from '../call/speakLiveSpeech'
import { startMediaRecordingSession, type ActiveMediaRecording } from '@/lib/speech/mediaRecorderCapture'
import { LiveLatestAssistantCard } from './LiveLatestAssistantCard'
import { LanguageCoachTurnFeedbackCard } from './LanguageCoachTurnFeedbackCard'
import { LiveSpeechPerfOverlay } from './LiveSpeechPerfOverlay'
import { LiveTranscriptThread } from './LiveTranscriptThread'
import { LiveSessionControls, type LiveMicMode } from './LiveSessionControls'
import { EndSessionSheet, type EndSessionChoice } from './EndSessionSheet'
import { LiveSituationCard } from './LiveSituationCard'
import { SpeakLiveTrainStationVisual } from './SpeakLiveTrainStationVisual'
import { SpeakLiveOrderingFoodVisual } from './SpeakLiveOrderingFoodVisual'
import {
  BOOKING_RESERVATIONS_LIVE_CARD_COPY,
  BOOKING_RESERVATIONS_SCENARIO_ID,
  DOCTOR_PHARMACY_LIVE_CARD_COPY,
  DOCTOR_PHARMACY_SCENARIO_ID,
  DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID,
  DIRECTIONS_LIVE_CARD_COPY,
  ORDERING_FOOD_LIVE_CARD_COPY,
  ORDERING_FOOD_SCENARIO_ID,
  PUBLIC_TRANSPORT_LIVE_CARD_COPY,
  STORE_SERVICE_ISSUE_LIVE_CARD_COPY,
  STORE_SERVICE_ISSUE_SCENARIO_ID,
  WORK_COLLEAGUE_INTERACTION_SCENARIO_ID,
  WORK_COLLEAGUE_LIVE_CARD_COPY,
  HOUSING_LANDLORD_SCENARIO_ID,
  HOUSING_LANDLORD_LIVE_CARD_COPY,
  PHONE_CALL_SCENARIO_ID,
  PHONE_CALL_SMART_MIX_CARD_COPY,
  SMALL_TALK_SCENARIO_ID,
  SMALL_TALK_SMART_MIX_CARD_COPY,
  MEETING_NEW_PEOPLE_SCENARIO_ID,
  MEETING_NEW_PEOPLE_SMART_MIX_CARD_COPY,
  PARTY_SOCIAL_SCENARIO_ID,
  PARTY_SOCIAL_SMART_MIX_CARD_COPY,
  EXPLAINING_SOMETHING_SCENARIO_ID,
  EXPLAINING_SOMETHING_SMART_MIX_CARD_COPY,
  STORYTELLING_SCENARIO_ID,
  STORYTELLING_SMART_MIX_CARD_COPY,
  OPINIONS_DISCUSSIONS_SCENARIO_ID,
  OPINIONS_DISCUSSIONS_SMART_MIX_CARD_COPY,
  LANGUAGE_COACH_SCENARIO_ID,
  LANGUAGE_COACH_DEFAULT_HERO_SRC,
  SUPERMARKET_SHOP_LIVE_CARD_COPY,
  SUPERMARKET_SHOP_SCENARIO_ID,
  TRAIN_STATION_SCENARIO_ID,
  TRAIN_STATION_SPEAK_LIVE_HERO_SRC,
  type BookingReservationsScenarioSubtype,
  type DirectionsGettingSomewhereDestination,
  type DoctorPharmacyScenarioSubtype,
  type OrderingFoodScenarioSetting,
  type PublicTransportScenarioSubtype,
  type StoreServiceIssueScenarioSubtype,
  type SupermarketShopScenarioSetting,
  type WorkColleagueScenarioSubtype,
  type HousingLandlordScenarioSubtype,
} from '../speakLiveScenarios'
import { useLiveSpeakStt } from './useLiveSpeakStt'
import {
  prepareAudioForAzurePronunciationAssessment,
  shouldPrepareWebmLikeForServerStt,
} from '@/lib/speech/prepareAudioForAzurePronunciationAssessment'
import {
  logSpeakLivePipelineFailure,
  speakLivePipelineErrorReport,
  type SpeakLivePipelineErrorReport,
} from '@/lib/speech/speakLivePipelineDebug'
import { blobToBase64, maxTranscribeBase64Chars, transcribeSpeechAudio } from '@/lib/speech/speechClient'
import { LiveSpeechTurnTimer, type LiveSpeechLatencyTrace } from './liveSpeechLatencyTrace'
import { useTurnAutoCommit, DEFAULT_AUTO_COMMIT_CONFIG } from './useTurnAutoCommit'
import { useChunkedTtsPlayback } from './useChunkedTtsPlayback'
import { TurnTimeline, type TurnTimelineSnapshot } from './turnTimeline'
import type {
  LiveAssistantMediaPhase,
  LiveSessionBootstrap,
  LiveSessionStatus,
  LiveTurn,
} from './liveSpeakTypes'
import { messagesToLiveTurns } from './liveSpeakTypes'

const CAPTIONS_PREF_KEY = 'fc-speak-live-captions-on'

/** Scenario strip height is intrinsic (slim banner layout). */
const SPEAK_LIVE_VENUE_HERO_LAYOUT = 'w-full shrink-0'

const STT_DECODE_HINT =
  'We did not quite catch that — a slightly longer turn, right after you tap the mic, usually does the trick.'

function safeJsonForDev(value: unknown): string {
  try {
    return JSON.stringify(
      value,
      (_k, v) => {
        if (typeof v === 'bigint') return v.toString()
        return v
      },
      2
    )
  } catch {
    return '[Debug payload could not be serialized — try closing Dev debug or copy from Network tab.]'
  }
}

function transcribeFailureUserMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    const m = err.message
    if (
      /azure speech recognition failed|could not be decoded|byteLength|speech recognition failed|no speech detected/i.test(
        m
      )
    ) {
      return STT_DECODE_HINT
    }
    const base = m?.trim() || 'We could not turn that into text. Try once more.'
    if (process.env.NODE_ENV === 'development') {
      const tail = [err.correlationId ? `correlationId=${err.correlationId}` : '', `code=${err.code}`, `status=${err.status}`]
        .filter(Boolean)
        .join(' ')
      return tail ? `${base}\n\n[dev] ${tail}` : base
    }
    return base
  }
  return err instanceof Error ? err.message : 'Could not transcribe that.'
}

function prepareFailureUserMessage(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err)
  if (/decode|audio|could not|empty|recording too short/i.test(m)) {
    return STT_DECODE_HINT
  }
  return m?.trim() ? m : 'That clip did not go through — try a touch longer, or another browser.'
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Builds the sub-headline shown under the "Small hiccup" banner. When we have a captured
 * pipeline failure report we surface a short hint of WHAT failed (phase + status/code +
 * message) so the learner — and we, when triaging support pings — can see the actual
 * underlying cause instead of a generic "try again". Falls back to the original copy
 * when no report is attached. Trimmed aggressively to fit the single-line UI.
 */
function buildHiccupSubline(report: SpeakLivePipelineErrorReport | null): string {
  const fallback = 'That did not work — try again.'
  if (!report) return fallback
  const phase = report.phase.replace(/_/g, ' ')
  const where = phase ? ` (${phase}` : ''
  const stat = typeof report.status === 'number' ? ` ${report.status}` : ''
  const code = report.code && report.code !== 'STREAM' ? ` ${report.code}` : ''
  const close = where ? `${stat}${code})` : ''
  const msg = (report.message ?? '').trim()
  const truncatedMsg = msg.length > 140 ? `${msg.slice(0, 137)}…` : msg
  const head = truncatedMsg || fallback
  const composed = `${head}${where}${close}`.trim()
  return composed || fallback
}

function shouldConfirmBrowserTranscript(params: {
  transcript: string
  recordingBytes: number
  speechStartToStopMs?: number
  utteranceDurationMs?: number
  finalSegmentCount: number
  usedPartialFallback: boolean
  /** Azure joined finals shorter than last cumulative partial — re-transcribe from audio when possible. */
  usedPartialOverIncompleteFinals?: boolean
}): boolean {
  const words = wordCount(params.transcript)
  if (!params.transcript.trim() || params.recordingBytes < 8_000) return false
  if (params.usedPartialOverIncompleteFinals) return true
  if (params.usedPartialFallback && words <= 4) return true
  const speechMs = params.speechStartToStopMs ?? params.utteranceDurationMs ?? 0
  if (speechMs >= 1500 && words <= 2) return true
  if (speechMs >= 2200 && words <= 4) return true
  if (params.finalSegmentCount === 1 && speechMs >= 1800 && words <= 3) return true
  // Long hold but only one finalized phrase: transcript often truncated vs. what was spoken.
  if (params.finalSegmentCount === 1 && speechMs >= 4000 && words >= 3 && words <= 14) return true
  return false
}

function trainVisualTone(status: LiveSessionStatus): 'idle' | 'listening' | 'processing' | 'speaking' | 'paused' {
  if (status === 'listening') return 'listening'
  if (status === 'transcribing' || status === 'got_it' || status === 'thinking' || status === 'replying') return 'processing'
  if (status === 'speaking') return 'speaking'
  if (status === 'paused') return 'paused'
  return 'idle'
}

const SPEAK_LIVE_REPLY_TTS_TIMEOUT_MS = 28_000
const ASSISTANT_PLAYBACK_VOLUME = 0.88

/** Same endpoint as streaming chunks — with a hard timeout so mobile never spins forever. */
async function fetchSpeakLiveReplyAudio(
  text: string,
  threadId: string,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const cleaned = stripMarkdownForTts(text).slice(0, 1200).trim()
  if (!cleaned) return ''

  const task = conversationClient.speakLiveTtsChunk({
    text: cleaned,
    threadId,
    chunkIndex: 0,
    language: 'nl-NL',
  })

  const timeout = new Promise<never>((_, reject) => {
    const id = window.setTimeout(() => reject(new Error('TTS request timed out')), SPEAK_LIVE_REPLY_TTS_TIMEOUT_MS)
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(id)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })

  const res = await Promise.race([task, timeout])
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  return res.audioUrl?.trim() ?? ''
}

export function LiveConversationScreen({
  bootstrap,
  scenarioTitle,
  scenarioSubtitle,
  scenarioId,
  levelLabel,
  onExitTalk,
  onSaveAndExitLater,
  onEndSessionEvaluate,
  isEndingCall,
  onRestartScenario,
  onTurnDebug,
  orderingFoodBackdropSrc,
  orderingFoodVenue,
  supermarketShopBackdropSrc,
  supermarketShopSetting,
  directionsBackdropSrc,
  directionsDestination,
  publicTransportBackdropSrc,
  publicTransportSubtype,
  bookingReservationsBackdropSrc,
  /** When set (unpinned smart booking), overrides subtype-based kicker/body so overlay matches neutral hero. */
  bookingReservationsHeroCopy,
  bookingReservationsSubtype,
  storeServiceIssueBackdropSrc,
  storeServiceIssueHeroCopy,
  storeServiceIssueSubtype,
  workColleagueBackdropSrc,
  workColleagueHeroCopy,
  workColleagueSubtype,
  housingLandlordBackdropSrc,
  housingLandlordHeroCopy,
  housingLandlordSubtype,
  doctorPharmacyBackdropSrc,
  doctorPharmacyHeroCopy,
  doctorPharmacySubtype,
  phoneCallBackdropSrc,
  phoneCallHeroCopy,
  smallTalkBackdropSrc,
  smallTalkHeroCopy,
  meetingNewPeopleBackdropSrc,
  meetingNewPeopleHeroCopy,
  partySocialBackdropSrc,
  partySocialHeroCopy,
  explainingSomethingBackdropSrc,
  explainingSomethingHeroCopy,
  storytellingBackdropSrc,
  storytellingHeroCopy,
  opinionsDiscussionsBackdropSrc,
  opinionsDiscussionsHeroCopy,
  interactionUi = null,
  /** Premium coach-only shell: persona line, goal chip, optional practice hint. */
  languageCoachUi = null,
}: {
  bootstrap: LiveSessionBootstrap | null
  scenarioTitle: string
  scenarioSubtitle: string
  scenarioId: string
  levelLabel: string
  onExitTalk: () => void
  /** Pause server session, persist resumable pointer, leave to Talk (no recap). */
  onSaveAndExitLater: () => Promise<void>
  onEndSessionEvaluate: () => Promise<void>
  isEndingCall: boolean
  /** Pause the current thread and start the same scenario fresh (Speak Live run view). */
  onRestartScenario?: () => Promise<void>
  onTurnDebug?: (payload: Record<string, unknown> | null) => void
  /** Photoreal venue hero for ordering_food (café / restaurant / takeaway — matches runtime context). */
  orderingFoodBackdropSrc?: string
  /** Resolved venue for hero + card copy when {@link orderingFoodBackdropSrc} is set. */
  orderingFoodVenue?: OrderingFoodScenarioSetting
  /** Hero image for supermarket_shop (setting-specific WebP from practice pack). */
  supermarketShopBackdropSrc?: string
  supermarketShopSetting?: SupermarketShopScenarioSetting
  /** Hero for directions_getting_somewhere (registry WebP / reuse). */
  directionsBackdropSrc?: string
  directionsDestination?: DirectionsGettingSomewhereDestination
  /** Alternate hero for train-station public transport (bus/tram/metro / ticket / delay art). */
  publicTransportBackdropSrc?: string
  publicTransportSubtype?: PublicTransportScenarioSubtype
  /** Hero for booking_reservations (subtype-specific WebP from practice pack). */
  bookingReservationsBackdropSrc?: string
  bookingReservationsHeroCopy?: { kicker: string; body: string }
  bookingReservationsSubtype?: BookingReservationsScenarioSubtype
  storeServiceIssueBackdropSrc?: string
  storeServiceIssueHeroCopy?: { kicker: string; body: string }
  storeServiceIssueSubtype?: StoreServiceIssueScenarioSubtype
  workColleagueBackdropSrc?: string
  workColleagueHeroCopy?: { kicker: string; body: string }
  workColleagueSubtype?: WorkColleagueScenarioSubtype
  housingLandlordBackdropSrc?: string
  housingLandlordHeroCopy?: { kicker: string; body: string }
  housingLandlordSubtype?: HousingLandlordScenarioSubtype
  doctorPharmacyBackdropSrc?: string
  doctorPharmacyHeroCopy?: { kicker: string; body: string }
  doctorPharmacySubtype?: DoctorPharmacyScenarioSubtype
  /** Photoreal “person on the line” hero for `phone_call` (variation + voice gender). */
  phoneCallBackdropSrc?: string
  phoneCallHeroCopy?: { kicker: string; body: string }
  /** Relaxed hero for `small_talk` (café-style default). */
  smallTalkBackdropSrc?: string
  smallTalkHeroCopy?: { kicker: string; body: string }
  /** Photoreal hero for `meeting_new_people` (reuses meeting intro pack; voice-gender matched). */
  meetingNewPeopleBackdropSrc?: string
  meetingNewPeopleHeroCopy?: { kicker: string; body: string }
  /** Photoreal hero for `party_social` (`/speak-live/party-social-{keeping|asking}-{m|f}-hero.png`; voice-gender matched). */
  partySocialBackdropSrc?: string
  partySocialHeroCopy?: { kicker: string; body: string }
  /** Photoreal hero for `explaining_something` (`/speak-live/explaining-something-{instructions|process}-{m|f}-hero.png`; voice-gender matched). */
  explainingSomethingBackdropSrc?: string
  explainingSomethingHeroCopy?: { kicker: string; body: string }
  /** Photoreal listener POV for `storytelling` (`/speak-live/storytelling-{daily|travel}-{m|f}-hero.png`; voice-gender matched). */
  storytellingBackdropSrc?: string
  storytellingHeroCopy?: { kicker: string; body: string }
  /** Photoreal POV for `opinions_discussions` (variation + voice-gender matched). */
  opinionsDiscussionsBackdropSrc?: string
  opinionsDiscussionsHeroCopy?: { kicker: string; body: string }
  /** Minimal audio-first layout (`phone`) vs full Speak Live chrome (`standard` / null). */
  interactionUi?: 'phone' | 'standard' | null
  languageCoachUi?: {
    coachDisplayName: string
    goalShortLabel: string
    /** Shown only when useful (e.g. selected conversation goal). */
    focusPracticeHint?: string | null
    /** Role mode label (Friend, Dutch local, …). */
    roleShortLabel?: string
    /** When true, combine role + goal in one compact chip (Coach + focus). */
    isCoachRole?: boolean
    /** Coach + “Guide me while speaking” from entry URL. */
    liveGuideActive?: boolean
  } | null
}) {
  const phoneAssistantMode = interactionUi === 'phone'
  const isLanguageCoachSession = scenarioId === LANGUAGE_COACH_SCENARIO_ID && !phoneAssistantMode
  const lcCoachName = languageCoachUi?.coachDisplayName ?? bootstrap?.personaDisplayName?.trim() ?? 'Your coach'
  const lcGoalChip = languageCoachUi?.goalShortLabel ?? 'General conversation'
  const lcPracticeHint = languageCoachUi?.focusPracticeHint?.trim() || null
  const lcRoleShort = languageCoachUi?.roleShortLabel?.trim() || null
  const lcIsCoachRole = Boolean(languageCoachUi?.isCoachRole)
  const lcLiveGuideActive = Boolean(languageCoachUi?.liveGuideActive)
  const router = useRouter()
  const threadId = bootstrap?.threadId ?? ''
  const assistantLabel = useMemo(() => {
    const raw = bootstrap?.personaDisplayName?.trim()
    if (scenarioId === ORDERING_FOOD_SCENARIO_ID && raw && /^food\s+service\s+staff$/i.test(raw)) {
      return 'Medewerker bediening'
    }
    if (scenarioId === SUPERMARKET_SHOP_SCENARIO_ID && raw && /^shop\s+retail\s+staff$/i.test(raw)) {
      return 'Medewerker'
    }
    if (scenarioId === BOOKING_RESERVATIONS_SCENARIO_ID && raw && /^booking_service_staff$/i.test(raw)) {
      return 'Medewerker'
    }
    if (scenarioId === STORE_SERVICE_ISSUE_SCENARIO_ID && raw && /^retail_service_staff$/i.test(raw)) {
      return 'Medewerker'
    }
    if (scenarioId === DOCTOR_PHARMACY_SCENARIO_ID && raw && /^health_service_staff$/i.test(raw)) {
      return 'Zorgmedewerker'
    }
    if (scenarioId === HOUSING_LANDLORD_SCENARIO_ID && raw && /^housing_contact_staff$/i.test(raw)) {
      return 'Contactpersoon woning'
    }
    if (scenarioId === PHONE_CALL_SCENARIO_ID && raw && /^phone_line_staff$/i.test(raw)) {
      return 'Telefoonlijn'
    }
    if (scenarioId === SMALL_TALK_SCENARIO_ID && raw && /^small_talk_partner$/i.test(raw)) {
      return 'Gesprekspartner'
    }
    if (scenarioId === MEETING_NEW_PEOPLE_SCENARIO_ID && raw && /^meeting_new_people_partner$/i.test(raw)) {
      return 'Nieuwe kennis'
    }
    if (scenarioId === PARTY_SOCIAL_SCENARIO_ID && raw && /^party_social_partner$/i.test(raw)) {
      return 'Iemand op het feest'
    }
    if (scenarioId === EXPLAINING_SOMETHING_SCENARIO_ID && raw && /^explaining_something_listener$/i.test(raw)) {
      return 'Luisteraar'
    }
    if (scenarioId === STORYTELLING_SCENARIO_ID && raw && /^storytelling_listener$/i.test(raw)) {
      return 'Luisteraar'
    }
    if (scenarioId === OPINIONS_DISCUSSIONS_SCENARIO_ID && raw && /^opinions_discussion_partner$/i.test(raw)) {
      return 'Gesprekspartner'
    }
    if (scenarioId === LANGUAGE_COACH_SCENARIO_ID) {
      return raw || 'Your coach'
    }
    return raw || 'NS assistant'
  }, [bootstrap?.personaDisplayName, scenarioId])
  const showOrderingFoodVisual =
    scenarioId === ORDERING_FOOD_SCENARIO_ID && Boolean(orderingFoodBackdropSrc?.trim())
  const showSupermarketShopVisual =
    scenarioId === SUPERMARKET_SHOP_SCENARIO_ID && Boolean(supermarketShopBackdropSrc?.trim())
  const showDirectionsVisual =
    scenarioId === DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID && Boolean(directionsBackdropSrc?.trim())
  const showPublicTransportPhotoVisual =
    scenarioId === TRAIN_STATION_SCENARIO_ID &&
    Boolean(publicTransportBackdropSrc?.trim()) &&
    publicTransportBackdropSrc !== TRAIN_STATION_SPEAK_LIVE_HERO_SRC
  const showBookingReservationsVisual =
    scenarioId === BOOKING_RESERVATIONS_SCENARIO_ID && Boolean(bookingReservationsBackdropSrc?.trim())
  const showStoreServiceIssueVisual =
    scenarioId === STORE_SERVICE_ISSUE_SCENARIO_ID && Boolean(storeServiceIssueBackdropSrc?.trim())
  const showWorkColleagueVisual =
    scenarioId === WORK_COLLEAGUE_INTERACTION_SCENARIO_ID && Boolean(workColleagueBackdropSrc?.trim())
  const showHousingLandlordVisual =
    scenarioId === HOUSING_LANDLORD_SCENARIO_ID && Boolean(housingLandlordBackdropSrc?.trim())
  const showDoctorPharmacyVisual =
    scenarioId === DOCTOR_PHARMACY_SCENARIO_ID && Boolean(doctorPharmacyBackdropSrc?.trim())
  const showMeetingNewPeopleVisual =
    scenarioId === MEETING_NEW_PEOPLE_SCENARIO_ID &&
    Boolean(meetingNewPeopleBackdropSrc?.trim()) &&
    !phoneAssistantMode
  const showPartySocialVisual =
    scenarioId === PARTY_SOCIAL_SCENARIO_ID &&
    Boolean(partySocialBackdropSrc?.trim()) &&
    !phoneAssistantMode
  const showExplainingSomethingVisual =
    scenarioId === EXPLAINING_SOMETHING_SCENARIO_ID &&
    Boolean(explainingSomethingBackdropSrc?.trim()) &&
    !phoneAssistantMode
  const showStorytellingVisual =
    scenarioId === STORYTELLING_SCENARIO_ID &&
    Boolean(storytellingBackdropSrc?.trim()) &&
    !phoneAssistantMode
  const showOpinionsDiscussionsVisual =
    scenarioId === OPINIONS_DISCUSSIONS_SCENARIO_ID &&
    Boolean(opinionsDiscussionsBackdropSrc?.trim()) &&
    !phoneAssistantMode
  const showSmallTalkVisual =
    scenarioId === SMALL_TALK_SCENARIO_ID && Boolean(smallTalkBackdropSrc?.trim()) && !phoneAssistantMode
  const showPhoneCallVisual =
    scenarioId === PHONE_CALL_SCENARIO_ID && Boolean(phoneCallBackdropSrc?.trim()) && !phoneAssistantMode
  const publicTransportCardCopy =
    publicTransportSubtype != null
      ? PUBLIC_TRANSPORT_LIVE_CARD_COPY[publicTransportSubtype]
      : PUBLIC_TRANSPORT_LIVE_CARD_COPY.train
  const orderingFoodCardCopy =
    orderingFoodVenue != null ? ORDERING_FOOD_LIVE_CARD_COPY[orderingFoodVenue] : ORDERING_FOOD_LIVE_CARD_COPY.cafe
  const supermarketShopCardCopy =
    supermarketShopSetting != null
      ? SUPERMARKET_SHOP_LIVE_CARD_COPY[supermarketShopSetting]
      : SUPERMARKET_SHOP_LIVE_CARD_COPY.supermarket
  const directionsCardCopy =
    directionsDestination != null
      ? DIRECTIONS_LIVE_CARD_COPY[directionsDestination]
      : DIRECTIONS_LIVE_CARD_COPY.station
  const bookingReservationsCardCopy =
    bookingReservationsHeroCopy ??
    BOOKING_RESERVATIONS_LIVE_CARD_COPY[bookingReservationsSubtype ?? 'restaurant_booking']
  const storeServiceIssueCardCopy =
    storeServiceIssueHeroCopy ?? STORE_SERVICE_ISSUE_LIVE_CARD_COPY[storeServiceIssueSubtype ?? 'store_return']
  const workColleagueCardCopy =
    workColleagueHeroCopy ?? WORK_COLLEAGUE_LIVE_CARD_COPY[workColleagueSubtype ?? 'colleague_chat']
  const housingLandlordCardCopy =
    housingLandlordHeroCopy ?? HOUSING_LANDLORD_LIVE_CARD_COPY[housingLandlordSubtype ?? 'landlord']
  const doctorPharmacyCardCopy =
    doctorPharmacyHeroCopy ?? DOCTOR_PHARMACY_LIVE_CARD_COPY[doctorPharmacySubtype ?? 'doctor_visit']
  const phoneCallCardCopy = phoneCallHeroCopy ?? PHONE_CALL_SMART_MIX_CARD_COPY
  const smallTalkCardCopy = smallTalkHeroCopy ?? SMALL_TALK_SMART_MIX_CARD_COPY
  const meetingNewPeopleCardCopy = meetingNewPeopleHeroCopy ?? MEETING_NEW_PEOPLE_SMART_MIX_CARD_COPY
  const partySocialCardCopy = partySocialHeroCopy ?? PARTY_SOCIAL_SMART_MIX_CARD_COPY
  const explainingSomethingCardCopy = explainingSomethingHeroCopy ?? EXPLAINING_SOMETHING_SMART_MIX_CARD_COPY
  const storytellingCardCopy = storytellingHeroCopy ?? STORYTELLING_SMART_MIX_CARD_COPY
  const opinionsDiscussionsCardCopy = opinionsDiscussionsHeroCopy ?? OPINIONS_DISCUSSIONS_SMART_MIX_CARD_COPY
  const [turns, setTurns] = useState<LiveTurn[]>(() =>
    bootstrap?.messages?.length ? messagesToLiveTurns(bootstrap.messages) : []
  )
  const [status, setStatus] = useState<LiveSessionStatus>('idle')
  /** Neural TTS lifecycle for the latest assistant line (never blocks text render). */
  const [assistantMediaPhase, setAssistantMediaPhase] = useState<LiveAssistantMediaPhase>('idle')
  const [partialUserText, setPartialUserText] = useState('')
  const partialUserTextRef = useRef('')
  const [micMode, setMicMode] = useState<LiveMicMode>('toggle')
  const [muted, setMuted] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [listenMs, setListenMs] = useState(0)
  const [micError, setMicError] = useState<'mic_denied' | 'audio_failed' | null>(null)
  const [networkSlow, setNetworkSlow] = useState(false)
  const [endSheetOpen, setEndSheetOpen] = useState(false)
  const [phraseHelpOpen, setPhraseHelpOpen] = useState(false)
  const [phraseHelpLoading, setPhraseHelpLoading] = useState(false)
  const [phraseHelpError, setPhraseHelpError] = useState<string | null>(null)
  const [phraseHelpItems, setPhraseHelpItems] = useState<string[]>([])
  const [phraseHelpSource, setPhraseHelpSource] = useState<'llm' | 'fallback' | null>(null)
  const [lastGoalLine, setLastGoalLine] = useState<string | null>(null)
  const [devPanelOpen, setDevPanelOpen] = useState(false)
  const [headerSessionMenuOpen, setHeaderSessionMenuOpen] = useState(false)
  const headerSessionMenuRef = useRef<HTMLDivElement>(null)
  const [lastDebug, setLastDebug] = useState<Record<string, unknown> | null>(null)
  const [lastCoachTurnFeedback, setLastCoachTurnFeedback] = useState<ApiLiveCoachTurnFeedback | null>(null)
  const [lastPerf, setLastPerf] = useState<Record<string, number> | null>(null)
  const [sttWarning, setSttWarning] = useState<string | null>(null)
  /** Last failure in mic → transcribe → turn (Dev debug + console `[Speak Live pipeline]`). */
  const [lastPipelineError, setLastPipelineError] = useState<SpeakLivePipelineErrorReport | null>(null)
  const [lastAssistantAudioUrl, setLastAssistantAudioUrl] = useState<string | null>(null)
  /** True when the latest assistant line has text but server TTS did not return usable audio. */
  const [lastAssistantTtsFailed, setLastAssistantTtsFailed] = useState(false)
  /** Explaining scenario: structure strip starts collapsed to reduce on-screen text. */
  const [explainingStructureHintOpen, setExplainingStructureHintOpen] = useState(false)
  /** `<audio>` could not play returned TTS (decode/CORS/autoplay). Does not block the learner microphone. */
  const [assistantPlaybackFailed, setAssistantPlaybackFailed] = useState(false)
  const [lastLatencyTrace, setLastLatencyTrace] = useState<LiveSpeechLatencyTrace | null>(null)
  /** Last `done.perf` from messages/stream (or bundled speak-live turn perf) for dev overlay. */
  const [lastServerStreamPerf, setLastServerStreamPerf] = useState<Record<string, number> | null>(null)
  /** NDJSON assistant `delta` text while the reply-only model is streaming (transcript turns only). */
  const [assistantStreamDraft, setAssistantStreamDraft] = useState('')
  /** Written thread — off by default (phone-style voice). */
  const [captionsOn, setCaptionsOn] = useState(() => {
    if (typeof window === 'undefined') return false
    if (interactionUi === 'phone') return window.localStorage.getItem('fc-phone-assist-transcript') === '1'
    return window.localStorage.getItem(CAPTIONS_PREF_KEY) === '1'
  })

  const holdingRef = useRef(false)
  /** True while `beginListening` is still opening the mic (token + Azure start). Pointer-up must not stop mid-boot. */
  const micBootRef = useRef(false)
  const listenStartRef = useRef<number | null>(null)
  const listenTickRef = useRef<number | null>(null)
  /** Same short-capture session as Talk dictation (`useStickyVoiceInput` → `startMediaRecordingSession`). */
  const mediaCapRef = useRef<ActiveMediaRecording | null>(null)
  /** Keep the approved mic stream for this session so mobile browsers do not re-prompt every turn. */
  const micStreamRef = useRef<MediaStream | null>(null)
  /**
   * When browser Azure STT is on, we still need a MediaRecorder clip for `learnerAudioBlobPath` (post-session evaluation).
   * Azure SDK uses the mic separately; a second `getUserMedia` often succeeds and runs in parallel.
   */
  const evalCapRef = useRef<ActiveMediaRecording | null>(null)
  /**
   * Set synchronously when mic boot finished and we are capturing; pointer-up uses this because `statusRef`
   * may still be stale for one frame (`statusRef.current === 'listening'` would miss a fast release).
   */
  const listenArmRef = useRef(false)
  /** Prevents overlapping `commitListening` runs (e.g. `pointerup` + `pointercancel` both firing on mobile). */
  const commitInFlightRef = useRef(false)
  /** Dedupes release bursts from the same physical lift within a few hundred ms. */
  const lastPointerReleaseMsRef = useRef(0)
  const statusRef = useRef<LiveSessionStatus>('idle')
  const mutedRef = useRef(false)
  /** Single DOM audio element — reliable mute/replay vs `new Audio()`. */
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const processingWatchRef = useRef<number | null>(null)
  const latencyTimerRef = useRef<LiveSpeechTurnTimer | null>(null)
  const timelineRef = useRef<TurnTimeline | null>(null)
  const [lastTimeline, setLastTimeline] = useState<TurnTimelineSnapshot | null>(null)
  const assistantTtsAbortRef = useRef<AbortController | null>(null)
  /** Opening greeting waits for mic tap on iOS — stored until `armAssistantAudio` runs. */
  const pendingOpeningGreetingUrlRef = useRef<string | null>(null)
  const openingGreetingPlayedRef = useRef(false)
  /** After LLM, schedule one text-paint sample for latency (matches `latestAssistantId`). */
  const textPaintTargetIdRef = useRef<string | null>(null)
  const useAzureRef = useRef(isSpeakLiveBrowserAzureSttEnabled())

  const { startContinuous, stopAndGetTranscript, closeRecognizer } = useLiveSpeakStt('nl-NL')

  /** While true, STT stability/silence timers must not finalize — pauses between sentences look like “done”. */
  const autoCommit = useTurnAutoCommit(DEFAULT_AUTO_COMMIT_CONFIG, holdingRef)

  const playClipRef = useRef<(url: string) => Promise<void>>(async () => {
    throw new Error('Audio player not ready')
  })
  const playAssistantUrlRef = useRef<
    (
      url: string,
      opts?: {
        onPlaybackMark?: () => void
        onEnded?: () => void
        onError?: () => void
        sequentialChunk?: boolean
      },
    ) => void
  >(() => {})

  const chunkedTts = useChunkedTtsPlayback({
    threadId,
    autoplay: false,
    playClip: (url) => playClipRef.current(url),
    onFirstChunkReady: () => {
      latencyTimerRef.current?.markFirstTtsChunkReady()
      timelineRef.current?.mark('firstTtsChunkReady')
    },
    onPlaybackStart: () => {
      latencyTimerRef.current?.markPlaybackStart()
      timelineRef.current?.mark('playbackStarted')
      setAssistantMediaPhase('idle')
      if (statusRef.current !== 'speaking') {
        setStatus('speaking')
      }
    },
    onPlaybackEnd: () => {
      timelineRef.current?.mark('turnCompleted')
      const snap = timelineRef.current?.logSummary() ?? null
      if (snap) setLastTimeline(snap)
      setStatus('idle')
    },
  })

  const chunkedTtsRef = useRef(chunkedTts)
  chunkedTtsRef.current = chunkedTts

  const toggleCaptions = useCallback(() => {
    playAppSound('tap')
    setCaptionsOn((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(CAPTIONS_PREF_KEY, next ? '1' : '0')
        if (phoneAssistantMode) {
          window.localStorage.setItem('fc-phone-assist-transcript', next ? '1' : '0')
        }
      } catch {
        /* ignore */
      }
      return next
    })
  }, [phoneAssistantMode])

  const fetchPhraseHelp = useCallback(async () => {
    if (!threadId) return
    setHeaderSessionMenuOpen(false)
    setPhraseHelpOpen(true)
    setPhraseHelpLoading(true)
    setPhraseHelpError(null)
    try {
      const levelOk = levelLabel === 'A1' || levelLabel === 'A2' || levelLabel === 'B1' ? levelLabel : 'A2'
      const r = await conversationClient.speakLiveStuckHints({ threadId, level: levelOk })
      setPhraseHelpItems(r.suggestions)
      setPhraseHelpSource(r.source)
    } catch (e) {
      setPhraseHelpError(e instanceof ApiRequestError ? e.message : 'Could not load suggestions.')
      setPhraseHelpItems([])
      setPhraseHelpSource(null)
    } finally {
      setPhraseHelpLoading(false)
    }
  }, [threadId, levelLabel])

  useEffect(() => {
    if (!headerSessionMenuOpen) return
    const onDoc = (e: MouseEvent) => {
      const el = headerSessionMenuRef.current
      if (el && !el.contains(e.target as Node)) setHeaderSessionMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [headerSessionMenuOpen])

  statusRef.current = status
  mutedRef.current = muted

  /** True after the learner taps the mic — reset() must not clear this or TTS never plays on mobile. */
  const assistantPlaybackArmedRef = useRef(false)

  const armAssistantAudio = useCallback((opts?: { playPendingGreeting?: boolean }) => {
    const playPendingGreeting = opts?.playPendingGreeting ?? true
    assistantPlaybackArmedRef.current = true
    chunkedTtsRef.current.startPlayback()
    const a = audioRef.current
    if (a) {
      a.volume = mutedRef.current ? 0 : ASSISTANT_PLAYBACK_VOLUME
      armHtmlAudioElement(a)
    }
    const pending = pendingOpeningGreetingUrlRef.current
    if (
      playPendingGreeting &&
      pending &&
      !openingGreetingPlayedRef.current &&
      !mutedRef.current &&
      statusRef.current === 'idle' &&
      !listenArmRef.current
    ) {
      openingGreetingPlayedRef.current = true
      pendingOpeningGreetingUrlRef.current = null
      playAssistantUrlRef.current(pending)
    }
  }, [])

  useEffect(() => {
    if (bootstrap?.messages?.length) {
      setTurns(messagesToLiveTurns(bootstrap.messages))
    }
  }, [bootstrap?.threadId, bootstrap?.messages])

  useEffect(() => {
    setExplainingStructureHintOpen(false)
  }, [scenarioId])

  /** Approximate “text visible” after React commit (double rAF) for `llmToTextRenderMs` / `textToAudioReadyMs`. */
  useEffect(() => {
    const target = textPaintTargetIdRef.current
    if (!target) return
    const last = turns[turns.length - 1]
    if (!last || last.role !== 'assistant' || last.id !== target) return
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        textPaintTargetIdRef.current = null
        latencyTimerRef.current?.markAssistantTextPaintedAfterCommit()
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [turns])

  useEffect(() => {
    const el = audioRef.current
    if (el) configureHtmlAudioElement(el)
  }, [])

  /** Kick playback if TTS finished but audio never started (common after reset cleared the arm flag). */
  useEffect(() => {
    if (status !== 'replying') return undefined
    const kick = window.setTimeout(() => {
      if (statusRef.current !== 'replying') return
      if (assistantPlaybackArmedRef.current) {
        chunkedTtsRef.current.startPlayback()
        const a = audioRef.current
        if (a) {
          a.volume = mutedRef.current ? 0 : ASSISTANT_PLAYBACK_VOLUME
          armHtmlAudioElement(a)
        }
      }
    }, 400)
    const bail = window.setTimeout(() => {
      if (statusRef.current !== 'replying' && statusRef.current !== 'speaking') return
      setAssistantMediaPhase('idle')
      setStatus('idle')
      setSttWarning('Voice is taking longer than usual — read the reply above, or use Replay in the menu.')
    }, 38_000)
    return () => {
      window.clearTimeout(kick)
      window.clearTimeout(bail)
    }
  }, [status])

  useEffect(() => {
    return () => {
      assistantTtsAbortRef.current?.abort()
      assistantTtsAbortRef.current = null
      chunkedTtsRef.current.abort()
      autoCommit.reset()
      void closeRecognizer()
      listenArmRef.current = false
      mediaCapRef.current?.cancel()
      mediaCapRef.current = null
      evalCapRef.current?.cancel()
      evalCapRef.current = null
      stopMediaStream(micStreamRef)
      /** Read the latest audio element at unmount time on purpose — the ref may have changed
       *  since the effect was set up (e.g. multiple chunks played during the session). */
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const au = audioRef.current
      if (au) {
        au.onended = null
        au.onerror = null
        au.pause()
        au.removeAttribute('src')
        void au.load()
      }
      if (listenTickRef.current) window.clearInterval(listenTickRef.current)
      if (processingWatchRef.current) window.clearTimeout(processingWatchRef.current)
    }
    /** Mount-only cleanup. We intentionally don't react to autoCommit identity churn — the only
     *  goal here is to release resources when the screen unmounts. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeRecognizer])

  const stopAssistantAudio = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    a.onended = null
    a.onerror = null
    a.pause()
    a.removeAttribute('src')
    void a.load()
  }, [])

  const playAssistantUrl = useCallback(
    (url: string, opts?: {
      onPlaybackMark?: () => void
      onEnded?: () => void
      onError?: () => void
      /** Chunked TTS: keep `speaking` status until the host signals playback end. */
      sequentialChunk?: boolean
    }) => {
      const a = audioRef.current
      if (!a || !url.trim()) {
        opts?.onError?.()
        return
      }
      stopAssistantAudio()
      setAssistantPlaybackFailed(false)
      if (!opts?.sequentialChunk) {
        setAssistantMediaPhase('idle')
      }
      timelineRef.current?.mark('audioSourceAssigned')
      const { src, revoke } = toPlayableAudioSrc(url)
      a.src = src
      /** Slightly below 1.0 so neural TTS does not feel harsh on first play (especially after silence). */
      a.volume = muted ? 0 : ASSISTANT_PLAYBACK_VOLUME
      a.oncanplay = () => { timelineRef.current?.mark('audioCanPlay') }
      opts?.onPlaybackMark?.()
      timelineRef.current?.mark('playCallFired')
      if (!opts?.sequentialChunk) {
        setStatus('speaking')
      }
      a.onended = () => {
        revoke?.()
        if (!opts?.sequentialChunk) {
          setStatus('idle')
        }
        opts?.onEnded?.()
      }
      a.onerror = () => {
        revoke?.()
        setAssistantPlaybackFailed(true)
        if (!opts?.sequentialChunk) {
          setStatus('idle')
        }
        opts?.onError?.()
      }
      void a.play().catch(() => {
        revoke?.()
        setAssistantPlaybackFailed(true)
        if (!opts?.sequentialChunk) {
          setStatus('idle')
        }
        opts?.onError?.()
      })
    },
    [muted, stopAssistantAudio]
  )

  const playAssistantClipAsync = useCallback(
    (url: string): Promise<void> =>
      new Promise((resolve, reject) => {
        if (mutedRef.current) {
          resolve()
          return
        }
        playAssistantUrl(url, {
          sequentialChunk: true,
          onEnded: () => resolve(),
          onError: () => reject(new Error('Assistant audio playback failed')),
        })
      }),
    [playAssistantUrl],
  )

  playClipRef.current = playAssistantClipAsync

  playAssistantUrlRef.current = playAssistantUrl

  useEffect(() => {
    const a = audioRef.current
    if (a && a.src) {
      a.volume = muted ? 0 : ASSISTANT_PLAYBACK_VOLUME
    }
    chunkedTts.setMuted(muted)
  }, [muted, chunkedTts])

  const replayLastAssistant = useCallback(() => {
    if (!lastAssistantAudioUrl?.trim()) return
    playAssistantUrl(lastAssistantAudioUrl)
  }, [lastAssistantAudioUrl, playAssistantUrl])

  /** Fresh session: greet with voice (same server TTS path as replies), not text-only. */
  const shouldPlayOpeningGreeting = useMemo(() => {
    if (!threadId) return false
    const userTurns = turns.filter((t) => t.role === 'user').length
    return userTurns === 0 && turns.some((t) => t.role === 'assistant')
  }, [threadId, turns])

  const partySocialConversationEnergy = useMemo(() => {
    if (scenarioId !== PARTY_SOCIAL_SCENARIO_ID || phoneAssistantMode) return null
    const userTurns = turns.filter((t) => t.role === 'user' && t.text.trim()).length
    const assistantTurns = turns.filter((t) => t.role === 'assistant' && t.text.trim()).length
    const total = userTurns + assistantTurns
    let level = 1
    let label = 'Getting started'
    if (userTurns >= 5 || total >= 10) {
      level = 3
      label = 'High energy'
    } else if (userTurns >= 2 || total >= 4) {
      level = 2
      label = 'Building flow'
    }
    return { level, label, userTurns }
  }, [scenarioId, phoneAssistantMode, turns])

  const openingAssistant = useMemo(() => {
    if (!shouldPlayOpeningGreeting) return null
    return turns.find((t) => t.role === 'assistant') ?? null
  }, [turns, shouldPlayOpeningGreeting])

  useEffect(() => {
    if (!openingAssistant?.text?.trim() || !threadId) return
    setMicError(null)
    const ac = new AbortController()
    assistantTtsAbortRef.current?.abort()
    assistantTtsAbortRef.current = ac
    void (async () => {
      try {
        const res = await fetchSpeakLiveReplyAudio(openingAssistant.text.trim(), threadId, ac.signal)
        if (ac.signal.aborted) return
        setLastAssistantAudioUrl(res)
        setLastAssistantTtsFailed(!res)
        if (res) {
          if (mutedRef.current) {
            setStatus('idle')
          } else if (
            assistantPlaybackArmedRef.current &&
            statusRef.current === 'idle' &&
            !listenArmRef.current
          ) {
            openingGreetingPlayedRef.current = true
            playAssistantUrlRef.current(res)
          } else {
            pendingOpeningGreetingUrlRef.current = res
          }
        }
      } catch {
        if (ac.signal.aborted) return
        setLastAssistantTtsFailed(true)
        /* Text still visible */
      } finally {
        if (assistantTtsAbortRef.current === ac) assistantTtsAbortRef.current = null
      }
    })()
    return () => {
      ac.abort()
      if (assistantTtsAbortRef.current === ac) assistantTtsAbortRef.current = null
    }
  }, [threadId, openingAssistant?.id, openingAssistant?.text])

  const runTurn = useCallback(
    async (params: {
      transcript?: string
      audioBase64?: string
      mimeType?: string
      latency?: LiveSpeechTurnTimer | null
      /**
       * Internal: when set, this turn is the silent retry of a transient failure
       * (502/504/network blip — typically a dev-server rebuild or a one-shot LLM hiccup).
       * Prevents infinite loops; we only retry once per user turn.
       */
      _retryAttempt?: number
    }) => {
      if (!threadId) return
      const latency = params.latency ?? latencyTimerRef.current
      /** Read the latest TTS controller via ref so we don't depend on the (per-render) hook return value
       *  in this useCallback — keeps `runTurn` identity stable across innocuous re-renders. */
      const chunkedTts = chunkedTtsRef.current
      textPaintTargetIdRef.current = null
      setStatus('thinking')
      setAssistantMediaPhase('idle')
      setLastServerStreamPerf(null)
      setPartialUserText('')
      partialUserTextRef.current = ''
      setAssistantStreamDraft('')
      setSttWarning(null)
      setNetworkSlow(false)
      if (processingWatchRef.current) window.clearTimeout(processingWatchRef.current)
      processingWatchRef.current = window.setTimeout(() => setNetworkSlow(true), 3000)
      try {
        setLastAssistantTtsFailed(false)
        const trimmedTx = params.transcript?.trim()
        if (trimmedTx) {
          setStatus('got_it')
          chunkedTts.reset({ preservePlayback: assistantPlaybackArmedRef.current })
          chunkedTts.startPlayback()
          const tl = timelineRef.current
          const llmClock = Date.now()
          latency?.markLlmRequestStart()
          tl?.mark('requestSent')

          const streamRes = await conversationClient.sendConversationMessageStream(
            threadId,
            trimmedTx,
            {
              inputMeta: {
                inputMode: 'speech',
                originalTranscript: trimmedTx,
                learnerLevelCefr:
                  levelLabel === 'A1' || levelLabel === 'A2' || levelLabel === 'B1' || levelLabel === 'B2'
                    ? levelLabel
                    : 'A2',
              },
              ...(params.audioBase64 && params.mimeType
                ? { learnerAudioBase64: params.audioBase64, learnerAudioMimeType: params.mimeType }
                : {}),
            },
            {
              onFirstStreamDelta: () => {
                latency?.markLlmFirstDelta()
                tl?.mark('firstResponseByte')
                tl?.mark('firstAssistantText')
                setStatus('replying')
                latency?.markTtsStart()
                tl?.mark('firstTtsChunkRequested')
              },
              onDelta: (chunk) => {
                setAssistantStreamDraft((prev) => prev + chunk)
                chunkedTts.feedDelta(chunk)
              },
            }
          )
          if (process.env.NODE_ENV === 'development' && streamRes.liveTurnDiagnostics) {
            console.info('[SpeakLivePipeline]', streamRes.liveTurnDiagnostics)
          }
          const afterLlm = Date.now()
          latency?.markLlmDone()

          chunkedTts.flush()
          chunkedTts.startPlayback()
          chunkedTts.setMuted(mutedRef.current)
          latency?.setTtsChunkCount(chunkedTts.getChunkCount())

          if (streamRes.speakLiveStreamMeta) {
            const meta = streamRes.speakLiveStreamMeta as Record<string, unknown>
            latency?.setSpeakLiveStreamDevHints({
              modelLabel: meta.stageAModelLabel as string | undefined,
              replyPromptCharsEstimate: meta.replyPromptCharsEstimate as number | undefined,
            })
            if (typeof meta.firstTokenMs === 'number') {
              latency?.setServerFirstTokenMs(meta.firstTokenMs)
            }
            if (typeof meta.estimatedInputTokens === 'number') {
              latency?.setEstimatedPromptTokens(meta.estimatedInputTokens)
            }
          }
          if (streamRes.liveTurnLatencyTrace) {
            latency?.setServerLatencyTrace(streamRes.liveTurnLatencyTrace)
          }
          setLastServerStreamPerf(streamRes.perf ?? null)
          const uText = trimmedTx
          const aText = streamRes.assistantMessage.content.trim()
          latency?.setPromptMetrics({ responseTextLength: aText.length })

          if (processingWatchRef.current) {
            window.clearTimeout(processingWatchRef.current)
            processingWatchRef.current = null
          }
          setNetworkSlow(false)
          setAssistantStreamDraft('')
          setAssistantMediaPhase('assistant_text_ready')
          textPaintTargetIdRef.current = streamRes.assistantMessage.id
          setTurns((prev) => [
            ...prev,
            {
              id: streamRes.userMessage.id,
              role: 'user',
              text: uText,
              createdAt: Date.now(),
              partial: false,
            },
            {
              id: streamRes.assistantMessage.id,
              role: 'assistant',
              text: aText,
              createdAt: Date.now(),
              partial: false,
            },
          ])
          const sp = streamRes.scenarioProgress
          if (sp?.notes || sp?.stage) {
            setLastGoalLine(sp.notes ?? sp.stage)
          }
          setLastPerf({
            sttMs: 0,
            llmMs: afterLlm - llmClock,
            ttsMs: 0,
            totalMs: Date.now() - llmClock,
          })
          setLastPipelineError(null)
          setLastDebug(null)
          setLastCoachTurnFeedback(streamRes.liveCoachTurnFeedback ?? null)
          onTurnDebug?.(null)

          if (chunkedTts.getChunkCount() > 0) {
            latency?.markTtsDone()
            const trace = latency?.finish() ?? null
            if (trace) setLastLatencyTrace(trace)
            if (mutedRef.current) {
              setAssistantMediaPhase('idle')
              setStatus('idle')
              tl?.mark('turnCompleted')
              const snap = tl?.logSummary() ?? null
              if (snap) setLastTimeline(snap)
            }
          } else {
            setStatus('replying')
            void (async () => {
              assistantTtsAbortRef.current?.abort()
              const ac = new AbortController()
              assistantTtsAbortRef.current = ac
              setAssistantMediaPhase('assistant_audio_loading')
              if (!latency?.ttsStartMs) latency?.markTtsStart()
              let audioUrl = ''
              try {
                audioUrl = await fetchSpeakLiveReplyAudio(aText, threadId, ac.signal)
                if (ac.signal.aborted) {
                  if (assistantTtsAbortRef.current === ac) assistantTtsAbortRef.current = null
                  setAssistantMediaPhase('idle')
                  return
                }
              } catch (ttsErr) {
                if (ac.signal.aborted) {
                  if (assistantTtsAbortRef.current === ac) assistantTtsAbortRef.current = null
                  setAssistantMediaPhase('idle')
                  return
                }
                const rep = speakLivePipelineErrorReport('tts_after_stream', ttsErr)
                setLastPipelineError(rep)
                logSpeakLivePipelineFailure(rep)
              }
              latency?.markTtsDone()
              tl?.mark('firstTtsChunkReady')
              if (assistantTtsAbortRef.current === ac) assistantTtsAbortRef.current = null
              if (audioUrl) {
                setLastAssistantAudioUrl(audioUrl)
                setLastAssistantTtsFailed(false)
                setAssistantMediaPhase('assistant_audio_ready')
                if (mutedRef.current) {
                  setAssistantMediaPhase('idle')
                  setStatus('idle')
                  tl?.mark('turnCompleted')
                } else {
                  tl?.mark('playbackRequested')
                  playAssistantUrl(audioUrl, {
                    onPlaybackMark: () => {
                      latency?.markPlaybackStart()
                      tl?.mark('playbackStarted')
                      setAssistantMediaPhase('idle')
                    },
                  })
                }
              } else {
                if (!ac.signal.aborted) {
                  setLastAssistantTtsFailed(true)
                  setAssistantMediaPhase('idle')
                  setSttWarning('You have the reply in text — no voice this time. Read it above.')
                  setStatus('idle')
                  tl?.mark('turnCompleted')
                }
              }
              const trace = latency?.finish() ?? null
              if (trace) setLastLatencyTrace(trace)
              const snap = tl?.logSummary() ?? null
              if (snap) setLastTimeline(snap)
            })()
          }
        } else {
          const res = await conversationClient.speakLiveTurn({
            threadId,
            scenarioId,
            level: levelLabel === 'A1' || levelLabel === 'A2' || levelLabel === 'B1' ? levelLabel : 'A2',
            language: 'nl',
            ...(params.audioBase64 && params.mimeType
              ? { audioBase64: params.audioBase64, mimeType: params.mimeType }
              : {}),
          })
          if (processingWatchRef.current) {
            window.clearTimeout(processingWatchRef.current)
            processingWatchRef.current = null
          }
          setNetworkSlow(false)
          const uText = res.transcript.trim()
          const aText = res.assistantReply.trim()
          textPaintTargetIdRef.current = res.assistantMessageId
          setAssistantMediaPhase('assistant_text_ready')
          setTurns((prev) => [
            ...prev,
            { id: res.userMessageId, role: 'user', text: uText, createdAt: Date.now(), partial: false },
            { id: res.assistantMessageId, role: 'assistant', text: aText, createdAt: Date.now(), partial: false },
          ])
          if (res.scenarioProgress?.notes || res.scenarioProgress?.stage) {
            setLastGoalLine(res.scenarioProgress.notes ?? res.scenarioProgress.stage)
          }
          setLastPerf(res.perf ?? null)
          setLastServerStreamPerf(res.perf ?? null)
          setLastPipelineError(null)
          const dbg = res.speakLiveDebug ?? null
          setLastDebug(dbg)
          setLastCoachTurnFeedback(res.liveCoachTurnFeedback ?? null)
          onTurnDebug?.(dbg)
          latency?.applyServerSpeakLivePerf(res.perf ?? {})
          if (res.liveTurnLatencyTrace) {
            latency?.setServerLatencyTrace(res.liveTurnLatencyTrace)
          }
          setLastAssistantTtsFailed(false)
          setStatus('replying')

          const serverAudio = res.audioUrl?.trim() ?? ''

          if (serverAudio) {
            setLastAssistantAudioUrl(serverAudio)
            setAssistantMediaPhase('assistant_audio_ready')
            if (mutedRef.current) {
              setAssistantMediaPhase('idle')
              setStatus('idle')
            } else {
              playAssistantUrl(serverAudio, {
                onPlaybackMark: () => {
                  latency?.markPlaybackStart()
                  setAssistantMediaPhase('idle')
                },
              })
            }
            const traceBundledSync = latency?.finish() ?? null
            if (traceBundledSync) setLastLatencyTrace(traceBundledSync)
          } else {
            void (async () => {
              assistantTtsAbortRef.current?.abort()
              const ac = new AbortController()
              assistantTtsAbortRef.current = ac
              setAssistantMediaPhase('assistant_audio_loading')
              latency?.markTtsStart()
              let audioUrl = ''
              try {
                audioUrl = await fetchSpeakLiveReplyAudio(aText, threadId, ac.signal)
                if (ac.signal.aborted) {
                  if (assistantTtsAbortRef.current === ac) assistantTtsAbortRef.current = null
                  setAssistantMediaPhase('idle')
                  return
                }
              } catch (e) {
                if (ac.signal.aborted) {
                  if (assistantTtsAbortRef.current === ac) assistantTtsAbortRef.current = null
                  setAssistantMediaPhase('idle')
                  return
                }
                const rep = speakLivePipelineErrorReport('tts_after_bundled_turn', e)
                setLastPipelineError(rep)
                logSpeakLivePipelineFailure(rep)
                console.warn('[Speak Live pipeline] tts_after_bundled_turn', e)
              }
              latency?.markTtsDone()
              if (assistantTtsAbortRef.current === ac) assistantTtsAbortRef.current = null
              if (audioUrl) {
                setLastAssistantAudioUrl(audioUrl)
                setLastAssistantTtsFailed(false)
                setAssistantMediaPhase('assistant_audio_ready')
                if (mutedRef.current) {
                  setAssistantMediaPhase('idle')
                  setStatus('idle')
                } else {
                  playAssistantUrl(audioUrl, {
                    onPlaybackMark: () => {
                      latency?.markPlaybackStart()
                      setAssistantMediaPhase('idle')
                    },
                  })
                }
              } else if (!ac.signal.aborted) {
                setLastAssistantTtsFailed(true)
                setAssistantMediaPhase('idle')
                setSttWarning('Reply is on screen without voice — read it here, or replay if you see the option.')
                setStatus('idle')
              }
              const traceBundledAsync = latency?.finish() ?? null
              if (traceBundledAsync) setLastLatencyTrace(traceBundledAsync)
            })()
          }
        }
      } catch (e) {
        /** Stop in-flight clause TTS + main assistant audio so we never stay "speaking" after a failed turn. */
        chunkedTtsRef.current.abort()
        stopAssistantAudio()
        if (processingWatchRef.current) {
          window.clearTimeout(processingWatchRef.current)
          processingWatchRef.current = null
        }
        setNetworkSlow(false)
        setAssistantStreamDraft('')
        setAssistantMediaPhase('idle')
        setLastServerStreamPerf(null)
        const rep = speakLivePipelineErrorReport(
          params.transcript?.trim() ? 'conversation_messages_stream' : 'speak_live_turn',
          e
        )
        setLastPipelineError(rep)
        logSpeakLivePipelineFailure(rep)
        const msg = (e instanceof ApiRequestError ? e.message : '').toLowerCase()
        const speechLike =
          e instanceof ApiRequestError &&
          (e.status === 400 ||
            e.status === 403 ||
            e.status === 409 ||
            e.status === 503 ||
            e.code === 'SPEECH_RECOGNITION_ERROR' ||
            e.code === 'STT_UNAVAILABLE' ||
            e.code === 'VALIDATION_ERROR' ||
            e.code === 'CONFLICT')
        /**
         * Transient backend / network classes that should NOT surface the harsh "Small hiccup"
         * UI. These are typically:
         *   - dev-server rebuild restart bumping a request mid-flight (status 0 / "Failed to fetch")
         *   - upstream model returned non-JSON and our salvage couldn't recover (502 LLM_ERROR)
         *   - gateway / network timeouts (504)
         *   - generic unhandled server errors (500)
         * For these we silently retry once; if the retry also fails we surface a friendly
         * "Quick reconnect" message and keep the mic ready (status='idle') so the learner can
         * just tap and try again instead of seeing the scary error state.
         */
        const isAbortError = e instanceof Error && (e.name === 'AbortError' || /aborted/i.test(e.message))
        const isFetchFailed =
          !(e instanceof ApiRequestError) &&
          e instanceof Error &&
          /failed to fetch|networkerror|network error|load failed|fetch failed/i.test(e.message)
        const isTransient =
          !isAbortError &&
          (isFetchFailed ||
            (e instanceof ApiRequestError &&
              (e.status === 0 || e.status === 500 || e.status === 502 || e.status === 504)))
        const retryAttempt = params._retryAttempt ?? 0
        if (isTransient && retryAttempt < 1) {
          /** Silent first retry — covers the common dev-rebuild restart + one-shot LLM hiccups. */
          window.setTimeout(() => {
            void runTurn({ ...params, _retryAttempt: retryAttempt + 1 })
          }, 600)
          return
        }
        if (isTransient) {
          setSttWarning(
            'Quick reconnect — the server hiccupped for a moment. Tap the mic and try once more; the conversation is still active.'
          )
          setStatus('idle')
          return
        }
        if (speechLike) {
          const conflictInactive =
            e instanceof ApiRequestError &&
            e.status === 409 &&
            /thread is not active|not active/i.test((e as ApiRequestError).message)
          const rawMsg = e instanceof ApiRequestError ? (e as ApiRequestError).message.trim() : ''
          const is503 = e instanceof ApiRequestError && e.status === 503
          const dep =
            e instanceof ApiRequestError &&
            (is503 ||
              e.code === 'DEPENDENCY_UNAVAILABLE' ||
              /blob|storage|azurite|x-ms-version|api version|upload failed|dependency|unavailable/i.test(msg))
          const detail = conflictInactive
            ? 'This session moved on — open Speak Live again from Talk, or refresh the page.'
            : is503 && rawMsg
              ? rawMsg
              : dep
                ? rawMsg ||
                  'Audio could not be saved for this session. Check blob storage (Azurite running and AZURE_STORAGE_CONNECTION_STRING).'
              : msg.includes('speech') ||
                  msg.includes('transcript') ||
                  msg.includes('audio') ||
                  msg.includes('microphone') ||
                  msg.includes('recognition')
                ? (e as ApiRequestError).message
                : 'We could not use that clip. Try a slightly longer turn and check the mic is allowed for this site.'
          const dev =
            process.env.NODE_ENV === 'development' && e instanceof ApiRequestError && e.correlationId
              ? `\n\n[dev] correlationId=${e.correlationId} code=${e.code} status=${e.status}`
              : ''
          setSttWarning(`${detail}${dev}`)
          setStatus('idle')
        } else {
          setStatus('error')
          window.setTimeout(() => setStatus('idle'), 2800)
        }
      }
    },
    [threadId, scenarioId, levelLabel, onTurnDebug, playAssistantUrl, stopAssistantAudio]
  )

  const commitListening = useCallback(async () => {
    if (statusRef.current === 'paused') return
    if (commitInFlightRef.current) return
    commitInFlightRef.current = true
    setLastPipelineError(null)
    const tl = timelineRef.current
    tl?.mark('turnCommitTriggered')
    try {
      const bootDeadline = Date.now() + 10_000
      while (micBootRef.current && Date.now() < bootDeadline) {
        await new Promise<void>((r) => {
          window.setTimeout(r, 20)
        })
      }
      listenArmRef.current = false
      if (listenTickRef.current) {
        window.clearInterval(listenTickRef.current)
        listenTickRef.current = null
      }
      listenStartRef.current = null
      setListenMs(0)

      const committedPartial = partialUserTextRef.current.trim()
      if (committedPartial) {
        setStatus('got_it')
      } else {
        setStatus('transcribing')
      }
      setSttWarning(null)

      let browserTranscript = ''
      let browserTranscriptMeta = {
        usedPartialFallback: false,
        usedPartialOverIncompleteFinals: false,
        finalSegmentCount: 0,
        speechStartToStopMs: undefined as number | undefined,
        utteranceDurationMs: undefined as number | undefined,
      }

      if (useAzureRef.current) {
        try {
          const stopResult = await stopAndGetTranscript()
          browserTranscript = stopResult.text
          browserTranscriptMeta = {
            usedPartialFallback: stopResult.usedPartialFallback,
            usedPartialOverIncompleteFinals: stopResult.usedPartialOverIncompleteFinals,
            finalSegmentCount: stopResult.finalSegmentCount,
            speechStartToStopMs: stopResult.speechStartToStopMs,
            utteranceDurationMs: stopResult.utteranceDurationMs,
          }
        } catch {
          useAzureRef.current = false
          browserTranscript = ''
        }
        if (!browserTranscript && committedPartial) {
          browserTranscript = committedPartial
        }
      } else if (committedPartial) {
        browserTranscript = committedPartial
      }

      let recordingBlob: Blob | null = null
      let recordingMime = 'audio/webm'
      /** Match backend transcribe minimum; tiny WebM headers alone can exceed 32. */
      const minBytes = 32

      if (mediaCapRef.current) {
        const cap = mediaCapRef.current
        mediaCapRef.current = null
        try {
          const stopped = await cap.stop()
          recordingBlob = stopped.blob
          recordingMime = stopped.mimeType || recordingBlob.type || 'audio/webm'
          tl?.mark('audioCaptureStoppedAt')
        } catch {
          /* e.g. stop after cancel / race */
        }
      }
      if ((!recordingBlob || recordingBlob.size < minBytes) && evalCapRef.current) {
        const evCap = evalCapRef.current
        evalCapRef.current = null
        try {
          const stopped = await evCap.stop()
          if (stopped.blob.size >= minBytes) {
            recordingBlob = stopped.blob
            recordingMime = stopped.mimeType || stopped.blob.type || 'audio/webm'
          }
        } catch {
          /* ignore */
        }
      }

      const trimmedBrowser = browserTranscript.trim()
      const lt = latencyTimerRef.current
      let finalTranscript = trimmedBrowser
      if (trimmedBrowser && recordingBlob && recordingBlob.size >= minBytes) {
        const longMonologueScenario =
          scenarioId === EXPLAINING_SOMETHING_SCENARIO_ID || scenarioId === STORYTELLING_SCENARIO_ID
        /**
         * Explaining / storytelling: always re-transcribe the **full** MediaRecorder blob on the server.
         * Browser Azure STT often keeps only the first phrase on stop; heuristics (byte/time/word caps)
         * were skipping Whisper so the LLM only saw the opening.
         */
        const forceServerTranscribe = longMonologueScenario
        const shouldConfirm =
          forceServerTranscribe ||
          shouldConfirmBrowserTranscript({
            transcript: trimmedBrowser,
            recordingBytes: recordingBlob.size,
            speechStartToStopMs: browserTranscriptMeta.speechStartToStopMs,
            utteranceDurationMs: browserTranscriptMeta.utteranceDurationMs,
            finalSegmentCount: browserTranscriptMeta.finalSegmentCount,
            usedPartialFallback: browserTranscriptMeta.usedPartialFallback,
            usedPartialOverIncompleteFinals: browserTranscriptMeta.usedPartialOverIncompleteFinals,
          })
        if (shouldConfirm) {
          try {
            setStatus('transcribing')
            let b64: string
            let transcribeMime = recordingMime
            const prepWall = Date.now()
            tl?.mark('audioEncodeStart')
            if (shouldPrepareWebmLikeForServerStt(recordingMime)) {
              const prep = await prepareAudioForAzurePronunciationAssessment(recordingBlob, recordingMime)
              b64 = prep.audioBase64
              transcribeMime = prep.mimeType
            } else {
              b64 = await blobToBase64(recordingBlob)
            }
            tl?.mark('audioEncodeEnd')
            latencyTimerRef.current?.markPrepareAudio(Date.now() - prepWall)
            const goalHint = lastGoalLine?.trim().slice(0, 400)
            /** STT `prompt` from the scene line biased Whisper toward short “task-shaped” text — skip for open monologues. */
            const transcriptionPromptForTurn = longMonologueScenario ? undefined : goalHint || undefined
            const sttWall = Date.now()
            const tr = await transcribeSpeechAudio(
              {
                audioBase64: b64,
                mimeType: transcribeMime,
                language: 'nl',
                evaluatePronunciation: false,
                cefrLevel: levelLabel === 'B1' ? 'B1' : 'A2',
                scenarioHint: scenarioTitle,
                transcriptionPrompt: transcriptionPromptForTurn,
                threadId,
                scenarioId,
                purpose: 'speak_live_turn',
              },
              undefined,
            )
            latencyTimerRef.current?.markServerTranscribe(Date.now() - sttWall)
            tl?.updateAudioUploadMs(Date.now() - sttWall)
            const confirmed = tr.text.trim()
            if (confirmed) {
              if (longMonologueScenario) {
                finalTranscript = confirmed
              } else {
                const wcB = wordCount(trimmedBrowser)
                const wcC = wordCount(confirmed)
                if (wcC > wcB || confirmed.length > trimmedBrowser.length + 8) {
                  finalTranscript = confirmed
                }
              }
            }
          } catch (inner) {
            console.warn('[Speak Live pipeline] browser transcript confirmation skipped', inner)
          }
        }
      }
      if (finalTranscript) {
        lt?.markFinalTranscript()
        tl?.mark('transcriptReady')
        if (recordingBlob && recordingBlob.size >= minBytes) {
          try {
            tl?.mark('audioEncodeStart')
            const b64User = await blobToBase64(recordingBlob)
            tl?.mark('audioEncodeEnd')
            tl?.setAudioBlobInfo({
              sizeBytes: recordingBlob.size,
              encodeMs: (tl?.get('audioEncodeEnd') ?? 0) - (tl?.get('audioEncodeStart') ?? 0),
              uploadMs: 0,
            })
            await runTurn({
              transcript: finalTranscript,
              audioBase64: b64User,
              mimeType: recordingMime,
              latency: lt,
            })
          } catch (inner) {
            const rep = speakLivePipelineErrorReport('speak_live_turn', inner)
            setLastPipelineError(rep)
            logSpeakLivePipelineFailure(rep)
            console.warn('[Speak Live pipeline] speak_live_turn (with audio)', inner)
            await runTurn({ transcript: finalTranscript, latency: lt })
          }
        } else {
          await runTurn({ transcript: finalTranscript, latency: lt })
        }
        return
      }

      /**
       * Same pipeline as chat dictation: `/speech/transcribe` then Speak Live with text only.
       * Avoids sending raw MediaRecorder WebM to `speak-live/turn` — Node Azure STT is unreliable on WebM without GStreamer
       * (see `prepareAudioForAzurePronunciationAssessment` comment in the codebase).
       */
      if (!recordingBlob || recordingBlob.size < minBytes) {
        setStatus('idle')
        setSttWarning('We did not hear speech — try a little longer, or check the mic is on.')
        return
      }

      try {
        let b64: string
        let transcribeMime = recordingMime
        const prepWall = Date.now()
        tl?.mark('audioEncodeStart')
        try {
          if (shouldPrepareWebmLikeForServerStt(recordingMime)) {
            const prep = await prepareAudioForAzurePronunciationAssessment(recordingBlob, recordingMime)
            b64 = prep.audioBase64
            transcribeMime = prep.mimeType
          } else {
            b64 = await blobToBase64(recordingBlob)
          }
          tl?.mark('audioEncodeEnd')
          latencyTimerRef.current?.markPrepareAudio(Date.now() - prepWall)
        } catch (prepErr) {
          const rep = speakLivePipelineErrorReport('prepare_audio', prepErr)
          setLastPipelineError(rep)
          logSpeakLivePipelineFailure(rep)
          console.warn('[Speak Live pipeline] prepare_audio', prepErr)
          setStatus('idle')
          setSttWarning(prepareFailureUserMessage(prepErr))
          return
        }
        const maxB64 = maxTranscribeBase64Chars()
        if (b64.length > maxB64) {
          setStatus('idle')
          setSttWarning('That take ran long — release the mic a bit sooner and try again.')
          return
        }
        const goalHint = lastGoalLine?.trim().slice(0, 400)
        const longMonoFallback =
          scenarioId === EXPLAINING_SOMETHING_SCENARIO_ID || scenarioId === STORYTELLING_SCENARIO_ID
        const transcriptionPromptFallback = longMonoFallback ? undefined : goalHint || undefined
        const sttWall = Date.now()
        const encMs = (tl?.get('audioEncodeEnd') ?? 0) - (tl?.get('audioEncodeStart') ?? 0)
        tl?.setAudioBlobInfo({ sizeBytes: recordingBlob.size, encodeMs: encMs, uploadMs: 0 })
        const tr = await transcribeSpeechAudio(
          {
            audioBase64: b64,
            mimeType: transcribeMime,
            language: 'nl',
            evaluatePronunciation: false,
            cefrLevel: levelLabel === 'B1' ? 'B1' : 'A2',
            scenarioHint: scenarioTitle,
            transcriptionPrompt: transcriptionPromptFallback,
            threadId,
            scenarioId,
            purpose: 'speak_live_turn',
          },
          undefined
        )
        latencyTimerRef.current?.markServerTranscribe(Date.now() - sttWall)
        tl?.updateAudioUploadMs(Date.now() - sttWall)
        const t = tr.text.trim()
        if (!t) {
          setStatus('idle')
          setSttWarning('We did not hear speech — try a little longer, or check the mic is on.')
          return
        }
        latencyTimerRef.current?.markFinalTranscript()
        tl?.mark('transcriptReady')
        const playbackB64 = await blobToBase64(recordingBlob)
        await runTurn({
          transcript: t,
          audioBase64: playbackB64,
          mimeType: recordingMime,
          latency: latencyTimerRef.current,
        })
      } catch (e) {
        const rep = speakLivePipelineErrorReport('transcribe', e)
        setLastPipelineError(rep)
        logSpeakLivePipelineFailure(rep)
        console.warn('[Speak Live pipeline] transcribe', e)
        setStatus('idle')
        setSttWarning(transcribeFailureUserMessage(e))
      }
    } finally {
      commitInFlightRef.current = false
    }
  }, [runTurn, stopAndGetTranscript, threadId, scenarioId, scenarioTitle, lastGoalLine, levelLabel])

  const beginListening = useCallback(async () => {
    if (statusRef.current === 'paused' || statusRef.current === 'thinking' || statusRef.current === 'transcribing' || statusRef.current === 'got_it') return
    if (statusRef.current === 'replying') {
      assistantTtsAbortRef.current?.abort()
      chunkedTts.abort()
    }
    if (statusRef.current === 'speaking') {
      stopAssistantAudio()
      chunkedTts.abort()
    }
    setMicError(null)
    setAssistantPlaybackFailed(false)
    setPartialUserText('')
    partialUserTextRef.current = ''
    setAssistantMediaPhase('idle')
    listenArmRef.current = false
    autoCommit.reset()

    const tl = new TurnTimeline()
    timelineRef.current = tl
    tl.mark('micPressed')

    micBootRef.current = true
    try {
      mediaCapRef.current?.cancel()
      mediaCapRef.current = null
      evalCapRef.current?.cancel()
      evalCapRef.current = null
      /** Ask for mic access once, then reuse that stream for short capture clips during this session. */
      const micStream = await ensureMicStream(micStreamRef)
      const cap = await startMediaRecordingSession({
        requestDataBeforeStop: true,
        stream: micStream,
        stopTracksOnStop: false,
      })
      if (useAzureRef.current) {
        try {
          await startContinuous(
            (t) => {
              setPartialUserText(t)
              partialUserTextRef.current = t
              autoCommit.onPartialUpdate(t)
            },
            {
              onFirstPartial: () => {
                latencyTimerRef.current?.markFirstPartialTranscript()
                tl.mark('firstPartialTranscript')
                autoCommit.onSpeechStart()
                tl.mark('speechDetected')
              },
              onSpeechEnd: () => {
                autoCommit.onSpeechEnd()
                tl.mark('lastSpeechHeard')
              },
              segmentationSilenceMs: getSpeakLiveAzureSegmentationSilenceMs(),
            }
          )
        } catch {
          useAzureRef.current = false
        }
      }
      if (useAzureRef.current) {
        evalCapRef.current = cap
      } else {
        mediaCapRef.current = cap
      }
      /** Arm before `micBoot` clears so a fast pointer-up never misses capture (see `onMicPointerUp`). */
      listenArmRef.current = true
    } catch (e) {
      mediaCapRef.current?.cancel()
      mediaCapRef.current = null
      evalCapRef.current?.cancel()
      evalCapRef.current = null
      listenArmRef.current = false
      setMicError(micErrorKind(e))
      setStatus('idle')
      return
    } finally {
      micBootRef.current = false
    }
    tl.mark('sttSessionReady')
    const at = Date.now()
    listenStartRef.current = at
    setListenMs(0)
    if (threadId) {
      const lt = new LiveSpeechTurnTimer(threadId)
      latencyTimerRef.current = lt
      lt.markCaptureReady()
    }
    setStatus('listening')
    autoCommit.setCommitCallback(() => {
      if (listenArmRef.current || statusRef.current === 'listening') {
        autoCommit.markManualCommit()
        void commitListening()
      }
    })
    listenTickRef.current = window.setInterval(() => {
      if (listenStartRef.current) setListenMs(Date.now() - listenStartRef.current)
    }, 120)
  }, [startContinuous, stopAssistantAudio, threadId, autoCommit, chunkedTts, commitListening])

  const onMicPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (micMode !== 'hold') return
    if (status === 'paused' || status === 'thinking' || status === 'transcribing' || status === 'got_it') return
    armAssistantAudio({ playPendingGreeting: false })
    if (status === 'replying') {
      assistantTtsAbortRef.current?.abort()
      chunkedTts.abort()
    }
    if (micError) setMicError(null)
    e.preventDefault()
    holdingRef.current = true
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    void beginListening()
  }

  const onMicPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (micMode !== 'hold') return
    if (!holdingRef.current) return
    holdingRef.current = false
    const now = Date.now()
    if (now - lastPointerReleaseMsRef.current < 280) return
    lastPointerReleaseMsRef.current = now
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    autoCommit.markManualCommit()
    armAssistantAudio({ playPendingGreeting: false })
    void (async () => {
      const bootDeadline = Date.now() + 10_000
      while (micBootRef.current && Date.now() < bootDeadline) {
        await new Promise<void>((r) => {
          window.setTimeout(r, 20)
        })
      }
      if (listenArmRef.current || mediaCapRef.current || evalCapRef.current || statusRef.current === 'listening') {
        void commitListening()
      }
    })()
  }

  const onMicClickToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (micMode === 'hold') {
      e.preventDefault()
      return
    }
    if (status === 'paused' || status === 'thinking' || status === 'transcribing' || status === 'got_it') return
    if (micError) setMicError(null)
    armAssistantAudio({ playPendingGreeting: false })
    playAppSound('tap')
    if (status === 'replying') {
      assistantTtsAbortRef.current?.abort()
      void beginListening()
      return
    }
    if (status === 'speaking') {
      stopAssistantAudio()
      void beginListening()
      return
    }
    if (status === 'idle' || status === 'error') {
      void beginListening()
      return
    }
    if (status === 'listening') {
      armAssistantAudio({ playPendingGreeting: false })
      void commitListening()
    }
  }

  const togglePause = () => {
    playAppSound('tap')
    if (status === 'paused') {
      setStatus('idle')
      return
    }
    void closeRecognizer()
    listenArmRef.current = false
    mediaCapRef.current?.cancel()
    mediaCapRef.current = null
    evalCapRef.current?.cancel()
    evalCapRef.current = null
    stopMediaStream(micStreamRef)
    if (listenTickRef.current) {
      window.clearInterval(listenTickRef.current)
      listenTickRef.current = null
    }
    stopAssistantAudio()
    setPartialUserText('')
    partialUserTextRef.current = ''
    setAssistantMediaPhase('idle')
    setStatus('paused')
  }

  const handleEndChoice = async (c: EndSessionChoice) => {
    if (c === 'continue') {
      setEndSheetOpen(false)
      return
    }
    if (c === 'save_exit') {
      setEndSheetOpen(false)
      stopAssistantAudio()
      void closeRecognizer()
      listenArmRef.current = false
      mediaCapRef.current?.cancel()
      mediaCapRef.current = null
      evalCapRef.current?.cancel()
      evalCapRef.current = null
      stopMediaStream(micStreamRef)
      try {
        await onSaveAndExitLater()
      } catch {
        onExitTalk()
      }
      return
    }
    setEndSheetOpen(false)
    stopAssistantAudio()
    void closeRecognizer()
    listenArmRef.current = false
    mediaCapRef.current?.cancel()
    mediaCapRef.current = null
    evalCapRef.current?.cancel()
    evalCapRef.current = null
    stopMediaStream(micStreamRef)
    await onEndSessionEvaluate()
  }

  const micDisabled =
    status === 'paused' ||
    status === 'thinking' ||
    status === 'transcribing' ||
    status === 'got_it' ||
    !threadId ||
    bootstrap === null

  const voiceActor = isLanguageCoachSession ? 'Coach' : 'Assistant'

  const micHint =
    status === 'got_it'
      ? 'Hang on — reply almost here'
      : status === 'transcribing' || status === 'thinking'
        ? 'One moment'
        : status === 'replying'
          ? assistantMediaPhase === 'assistant_text_ready'
            ? 'Reply is on screen — voice loading'
            : assistantMediaPhase === 'assistant_audio_ready'
              ? 'Tap the mic to skip, or wait for the voice'
              : 'Voice loading — tap the mic to skip'
          : micMode === 'hold'
            ? status === 'speaking'
              ? 'Hold to jump in'
              : 'Hold to talk'
            : status === 'listening'
              ? 'Tap again when you are done'
              : status === 'speaking'
                ? 'Tap the mic to jump in'
                : 'Tap the mic to talk'

  const connLine =
    micError === 'mic_denied'
      ? 'Turn on the mic for this site to continue.'
      : micError === 'audio_failed'
        ? 'The mic did not start — check permissions and try again.'
        : assistantPlaybackFailed && status === 'idle'
          ? `${voiceActor}'s voice did not play — replay from the menu, or read the line above.`
          : networkSlow && (status === 'thinking' || status === 'replying' || status === 'got_it')
            ? `A touch slower than usual — ${voiceActor.toLowerCase()} is still on the way.`
            : status === 'listening'
              ? captionsOn && partialUserText.trim()
                ? `Heard: ${partialUserText.trim().slice(0, 72)}${partialUserText.trim().length > 72 ? '…' : ''}`
                : 'Dutch is perfect — take your time.'
              : status === 'transcribing'
                ? 'Sending what we heard…'
                : status === 'got_it'
                  ? partialUserText.trim()
                    ? `“${partialUserText.trim().slice(0, 60)}${partialUserText.trim().length > 60 ? '…' : ''}”`
                    : 'Noted — reply on the way.'
                  : status === 'thinking'
                    ? `${voiceActor} is shaping a reply…`
                    : status === 'replying'
                      ? assistantMediaPhase === 'assistant_text_ready'
                        ? 'You can read ahead while the voice loads.'
                        : assistantMediaPhase === 'assistant_audio_ready'
                          ? 'Tap the mic anytime to skip the voice.'
                          : 'Almost ready to play it out loud…'
                      : status === 'speaking'
                        ? `Listening to ${voiceActor.toLowerCase()} now.`
                        : status === 'paused'
                          ? 'Paused — resume when you like.'
                          : status === 'idle'
                            ? 'Tap the mic when you are ready.'
                            : status === 'error'
                              ? buildHiccupSubline(lastPipelineError)
                              : null

  const speakStateHeadline = useMemo(() => {
    switch (status) {
      case 'paused':
        return 'Paused'
      case 'error':
        return 'Small hiccup'
      case 'listening':
        return 'Listening…'
      case 'transcribing':
        return 'One moment…'
      case 'got_it':
        return 'Got it'
      case 'thinking':
        return 'Shaping a reply…'
      case 'replying':
        return 'Almost there…'
      case 'speaking':
        return `${voiceActor} is speaking`
      default:
        return 'Your turn'
    }
  }, [status, voiceActor])

  const speakStateSublineForUi = useMemo(() => {
    const showRich =
      micError ||
      assistantPlaybackFailed ||
      networkSlow ||
      status === 'listening' ||
      status === 'transcribing' ||
      status === 'got_it' ||
      status === 'thinking' ||
      status === 'replying' ||
      status === 'speaking' ||
      status === 'error'
    if (showRich) {
      if (status === 'listening' && !(captionsOn && partialUserText.trim())) return null
      return connLine
    }
    if (status === 'idle') return 'Tap the mic whenever you are ready.'
    return null
  }, [micError, assistantPlaybackFailed, networkSlow, status, connLine, captionsOn, partialUserText])

  const latestAssistantId = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i].role === 'assistant') return turns[i].id
    }
    return null
  }, [turns])

  const latestAssistantText = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i].role === 'assistant') return turns[i].text
    }
    return ''
  }, [turns])

  /** Explaining scenario: show the exact text sent from the last completed recording (Speak Live). */
  const lastLearnerTranscriptSent = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i].role === 'user' && turns[i].text.trim()) return turns[i].text.trim()
    }
    return ''
  }, [turns])

  const showDevPanel = process.env.NODE_ENV === 'development'

  const restartScenarioDisabled =
    isEndingCall ||
    !threadId ||
    !onRestartScenario ||
    (status !== 'idle' && status !== 'paused')

  const situationSummary = scenarioSubtitle.trim()

  return (
    <div
      className={clsx(
        'flex flex-col min-h-[100dvh] text-[#0F172A]',
        isLanguageCoachSession
          ? 'bg-[#f7f4ff] bg-[radial-gradient(ellipse_120%_70%_at_50%_-15%,rgba(167,139,250,0.14),transparent_55%)]'
          : 'bg-[#fafaf7]',
      )}
    >
      <audio
        ref={audioRef}
        preload="auto"
        playsInline
        className="pointer-events-none fixed left-0 bottom-0 h-px w-px opacity-0"
        aria-hidden
      />

      <header
        className={clsx(
          'shrink-0 z-30 px-4 pt-[max(0.6rem,env(safe-area-inset-top))] pb-3 border-b backdrop-blur-md',
          isLanguageCoachSession
            ? 'border-indigo-100/90 bg-white/78 shadow-[0_1px_0_rgba(255,255,255,0.65)_inset,0_12px_40px_-28px_rgba(91,33,182,0.22)]'
            : 'border-slate-200/90 bg-surface-elevated/95 shadow-card',
        )}
      >
        <div className="flex max-w-lg flex-col gap-2.5 mx-auto w-full">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playAppSound('tap')
                stopAssistantAudio()
                void closeRecognizer()
                listenArmRef.current = false
                mediaCapRef.current?.cancel()
                mediaCapRef.current = null
                evalCapRef.current?.cancel()
                evalCapRef.current = null
                onExitTalk()
              }}
              className={clsx(
                'min-h-touch min-w-touch shrink-0 inline-flex items-center justify-center rounded-xl text-ink-secondary',
                isLanguageCoachSession ? 'hover:bg-violet-50' : 'hover:bg-slate-100',
              )}
              aria-label="Back"
            >
              <ChevronLeft className="w-6 h-6" aria-hidden />
            </button>
            {isLanguageCoachSession ? (
              <div className="min-w-0 flex-1 pr-1 sm:pr-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-800/75">Language Coach</p>
                <h1 className="mt-0.5 text-[17px] font-semibold leading-snug tracking-tight text-indigo-950 sm:text-[19px]">
                  {lcCoachName}
                </h1>
              </div>
            ) : (
              <h1 className="min-w-0 flex-1 text-body font-bold leading-snug text-ink-primary pr-1 sm:pr-2">
                <span className="line-clamp-2 sm:line-clamp-1 sm:truncate">{scenarioTitle}</span>
              </h1>
            )}
            <div className="flex shrink-0 items-center justify-end gap-1.5">
              {!phoneAssistantMode ? (
                <div className="relative shrink-0" ref={headerSessionMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      playAppSound('tap')
                      setHeaderSessionMenuOpen((o) => !o)
                    }}
                    className={clsx(
                      'inline-flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm transition-colors',
                      isLanguageCoachSession
                        ? 'border-violet-200/90 bg-white/90 text-violet-950 hover:bg-violet-50/90'
                        : 'border-slate-200 bg-white text-ink-secondary hover:bg-slate-50',
                      headerSessionMenuOpen && (isLanguageCoachSession ? 'ring-2 ring-violet-300/50' : 'ring-2 ring-slate-300/50'),
                    )}
                    aria-expanded={headerSessionMenuOpen}
                    aria-haspopup="menu"
                    aria-label="Session options"
                  >
                    <MoreHorizontal className="h-5 w-5" aria-hidden />
                  </button>
                  {headerSessionMenuOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 top-full z-50 mt-1 w-[min(15.5rem,calc(100vw-2rem))] rounded-2xl border border-[#E5E7EB] bg-white py-1.5 shadow-lg"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        disabled={!threadId || phraseHelpLoading || bootstrap === null}
                        onClick={() => {
                          playAppSound('tap')
                          void fetchPhraseHelp()
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-medium text-[#0F172A] hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                      >
                        <CircleHelp className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden />
                        What to say
                      </button>
                      {onRestartScenario ? (
                        <button
                          type="button"
                          role="menuitem"
                          disabled={restartScenarioDisabled}
                          onClick={() => {
                            playAppSound('tap')
                            setHeaderSessionMenuOpen(false)
                            const msg = isLanguageCoachSession
                              ? 'Start a fresh coach session? We pause the one you have open.'
                              : 'Start this scenario from scratch? We pause the session you have now.'
                            if (!window.confirm(msg)) {
                              return
                            }
                            void onRestartScenario()
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-medium text-[#0F172A] hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                        >
                          <RotateCcw className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden />
                          {isLanguageCoachSession ? 'New session' : 'Restart scenario'}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <button
                type="button"
                disabled={isEndingCall || !threadId}
                onClick={() => {
                  playAppSound('tap')
                  setEndSheetOpen(true)
                }}
                className={clsx(
                  'h-11 shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-2.5 text-left disabled:opacity-40 disabled:pointer-events-none',
                  isLanguageCoachSession
                    ? 'border-indigo-300/90 bg-indigo-50/90 text-indigo-950 hover:bg-indigo-100/80'
                    : 'border-[#FCA5A5] bg-[#FFF1F2] hover:bg-rose-100/90',
                )}
                aria-haspopup="dialog"
                aria-label={
                  isLanguageCoachSession ? 'End call and open coach debrief' : 'End call and open your feedback'
                }
              >
                <PhoneOff
                  className={clsx('w-4 h-4 shrink-0', isLanguageCoachSession ? 'text-indigo-800' : 'text-[#BE123C]')}
                  aria-hidden
                />
                <span className="flex flex-col justify-center leading-[1.05]">
                  <span
                    className={clsx(
                      'text-[9px] font-semibold uppercase tracking-wide',
                      isLanguageCoachSession ? 'text-indigo-900' : 'text-[#BE123C]',
                    )}
                  >
                    Finish
                  </span>
                  <span
                    className={clsx(
                      'text-[10px] font-semibold leading-tight',
                      isLanguageCoachSession ? 'text-indigo-800' : 'text-[#BE123C]',
                    )}
                  >
                    {isLanguageCoachSession ? '& debrief' : '& feedback'}
                  </span>
                </span>
              </button>
            </div>
          </div>

          {isLanguageCoachSession ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {lcIsCoachRole ? (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-indigo-200/90 bg-gradient-to-r from-indigo-50/95 to-violet-50/90 px-2.5 py-1 text-[11px] text-indigo-950 shadow-sm">
                  <span className="font-semibold">Coach</span>
                  <span className="text-indigo-400" aria-hidden>
                    ·
                  </span>
                  <span className="truncate font-medium">Focus: {lcGoalChip}</span>
                </span>
              ) : lcRoleShort ? (
                <span className="inline-flex items-center rounded-full border border-indigo-200/90 bg-indigo-50/90 px-2.5 py-1 text-[11px] font-semibold text-indigo-950 shadow-sm">
                  {lcRoleShort}
                </span>
              ) : null}
              {lcIsCoachRole && lcLiveGuideActive ? (
                <span className="inline-flex items-center rounded-full border border-violet-300/70 bg-violet-600/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-900">
                  Guide on
                </span>
              ) : null}
              <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                {levelLabel}
              </span>
            </div>
          ) : null}
          {isLanguageCoachSession && lcPracticeHint ? (
            <p className="text-[12px] leading-relaxed text-indigo-900/72">{lcPracticeHint}</p>
          ) : null}

          {situationSummary && !phoneAssistantMode && !isLanguageCoachSession ? (
            <LiveSituationCard
              summary={situationSummary}
              expectation={
                scenarioId === EXPLAINING_SOMETHING_SCENARIO_ID || scenarioId === STORYTELLING_SCENARIO_ID
                  ? 'none'
                  : 'compact'
              }
            />
          ) : null}
          {scenarioId === SMALL_TALK_SCENARIO_ID && !phoneAssistantMode ? (
            <p className="rounded-xl border border-violet-200/80 bg-violet-50/90 px-3 py-2 text-[12px] leading-relaxed text-sky-950/90">
              <span className="font-semibold">Keep it flowing:</span> korte reacties zijn prima — voeg af en toe een
              mini-vraag toe. In het rapport zie je “natuurlijker zeggen”-suggesties per zin.
            </p>
          ) : null}
          {scenarioId === MEETING_NEW_PEOPLE_SCENARIO_ID && !phoneAssistantMode ? (
            <p className="rounded-xl border border-violet-200/80 bg-violet-50/90 px-3 py-2 text-[12px] leading-relaxed text-violet-950/90">
              <span className="font-semibold">Keep it going:</span> wissel kort — intro, één feitje over jezelf, dan
              een echte vervolgvraag. Sterkere vervolgvragen en replay + mimic staan in het rapport per zin.
            </p>
          ) : null}
          {scenarioId === EXPLAINING_SOMETHING_SCENARIO_ID && !phoneAssistantMode ? (
            <div className="rounded-lg border border-violet-200/60 bg-violet-50/70 px-2.5 py-1.5 text-violet-950/90 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  playAppSound('tap')
                  setExplainingStructureHintOpen((o) => !o)
                }}
                className="flex w-full min-h-touch items-center justify-between gap-2 rounded-md text-left hover:bg-violet-100/50 -mx-0.5 px-0.5"
                aria-expanded={explainingStructureHintOpen}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-violet-900/75">Structuur</span>
                  {!explainingStructureHintOpen ? (
                    <p className="mt-0.5 text-[11px] leading-snug text-violet-950/88">
                      2–5 korte zinnen · <span className="font-medium">eerst → daarna → slot</span> · max. één
                      tussenvraag
                    </p>
                  ) : null}
                </div>
                <ChevronDown
                  className={clsx(
                    'h-4 w-4 shrink-0 text-violet-700 transition-transform duration-200',
                    explainingStructureHintOpen && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>
              {explainingStructureHintOpen ? (
                <p className="mt-1.5 border-t border-violet-200/60 pt-1.5 text-[11px] leading-relaxed text-violet-950/92">
                  Zeg wat <span className="font-medium">eerst</span> gebeurt, dan de volgende stappen (
                  <span className="font-medium">dan / daarna / uiteindelijk</span>), en sluit af met het{' '}
                  <span className="font-medium">resultaat</span>. De ander stelt hoogstens één verduidelijkingsvraag —
                  antwoord kort zonder je volgorde te verliezen.
                </p>
              ) : null}
            </div>
          ) : null}
          {scenarioId === STORYTELLING_SCENARIO_ID && !phoneAssistantMode ? (
            <div className="rounded-xl border border-violet-200/80 bg-violet-50/90 px-3 py-2.5 space-y-2.5 text-violet-950/90">
              <p className="text-[11px] font-bold uppercase tracking-wide">Story arc</p>
              <p className="text-[12px] leading-relaxed">
                <span className="font-semibold">Vertel in het verleden:</span> begin met{' '}
                <span className="font-medium">wanneer/waar</span>, midden met{' '}
                <span className="font-medium">2–4 momenten</span> (<span className="font-medium">toen / daarna</span>),
                slot met <span className="font-medium">gevoel of gevolg</span>. De ander reageert kort en stelt max. één
                vervolgvraag — jij blijft de verteller.
              </p>
            </div>
          ) : null}
          {scenarioId === OPINIONS_DISCUSSIONS_SCENARIO_ID && !phoneAssistantMode ? (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 space-y-2.5 text-amber-950/90">
              <p className="text-[11px] font-bold uppercase tracking-wide">Discussion flow</p>
              <p className="text-[12px] leading-relaxed">
                <span className="font-semibold">Reageer eerst:</span> eens / oneens / genuanceerd — daarna{' '}
                <span className="font-medium">omdat / want</span> met één korte reden. De ander mag licht tegenspreken;
                blijf respectvol. Rapport: standpunt, redenering, zachtere nuance.
              </p>
            </div>
          ) : null}
          {scenarioId === PARTY_SOCIAL_SCENARIO_ID && !phoneAssistantMode ? (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 space-y-2.5 text-amber-950/90">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide">Conversation energy</span>
                {partySocialConversationEnergy ? (
                  <span className="text-[12px] font-semibold tabular-nums">{partySocialConversationEnergy.label}</span>
                ) : null}
              </div>
              {partySocialConversationEnergy ? (
                <div
                  className="flex h-1.5 gap-1"
                  role="img"
                  aria-label={`Conversation energy: ${partySocialConversationEnergy.label}`}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={clsx(
                        'h-full min-w-0 flex-1 rounded-full transition-colors',
                        i < partySocialConversationEnergy.level ? 'bg-amber-500' : 'bg-amber-200/70',
                      )}
                    />
                  ))}
                </div>
              ) : null}
              <p className="text-[12px] leading-relaxed">
                <span className="font-semibold">Party mode:</span> korte beurten, soms een nieuw onderwerp — blijf
                doorpraten. <span className="font-medium">Ask something:</span> mini-vraag elke paar turns.{' '}
                <span className="font-medium">React more naturally:</span> “Oh nice”, “Leuk!” i.p.v. alleen “ok/ja”.
                Rapport: sterkere reacties en vervolgvragen per zin.
              </p>
            </div>
          ) : null}
        </div>
      </header>

      {sttWarning ? (
        <div className="shrink-0 px-4 pt-2 max-w-lg mx-auto w-full">
          <div
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 flex gap-2 items-start"
            role="status"
          >
            <p className="text-caption text-amber-950 leading-snug flex-1 whitespace-pre-wrap">{sttWarning}</p>
            <button
              type="button"
              onClick={() => setSttWarning(null)}
              className="shrink-0 text-caption font-bold text-amber-800 underline-offset-2 hover:underline"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex-1 flex flex-col min-h-0 px-4 pt-2 pb-1 max-w-lg mx-auto w-full gap-2">
        {lastGoalLine && !phoneAssistantMode && !isLanguageCoachSession ? (
          <div className="shrink-0 flex flex-wrap gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-tertiary w-full">Scene</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-ink-primary border border-slate-200">
              {lastGoalLine}
            </span>
          </div>
        ) : null}
        {(!phoneAssistantMode || captionsOn) ? (
          <LiveLatestAssistantCard
            captionsOn={captionsOn}
            assistantStreamDraft={assistantStreamDraft}
            assistantThinking={(status === 'thinking' || status === 'got_it') && !assistantStreamDraft.trim()}
            status={status}
            latestAssistantText={latestAssistantText}
            voiceLoading={status === 'replying'}
            voicePlaying={status === 'speaking'}
            ttsFailed={lastAssistantTtsFailed}
          />
        ) : null}
        {(scenarioId === EXPLAINING_SOMETHING_SCENARIO_ID || scenarioId === STORYTELLING_SCENARIO_ID) &&
        !phoneAssistantMode ? (
          <div
            className="shrink-0 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2.5 shadow-sm"
            aria-live="polite"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-tertiary">Your last turn, as text</p>
            <p className="text-[11px] text-ink-secondary mt-0.5 leading-snug">
              What we sent along after your last finished turn in this scenario.
            </p>
            {status === 'listening' && partialUserText.trim() ? (
              <div className="mt-2 rounded-lg border border-dashed border-violet-300/80 bg-white/80 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-800/90">Preview</p>
                <p className="mt-1 text-caption text-ink-primary whitespace-pre-wrap leading-relaxed">{partialUserText}</p>
              </div>
            ) : null}
            {(status === 'transcribing' || status === 'got_it' || status === 'thinking' || status === 'replying') &&
            !partialUserText.trim() ? (
              <p className="mt-2 text-caption text-violet-900/80 font-medium">
                {status === 'transcribing' ? 'Saving your clip…' : 'Sending — hang tight…'}
              </p>
            ) : null}
            {lastLearnerTranscriptSent ? (
              <div className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">Last turn sent</p>
                <p className="mt-1 text-body text-ink-primary whitespace-pre-wrap leading-relaxed">{lastLearnerTranscriptSent}</p>
              </div>
            ) : !partialUserText.trim() &&
              status !== 'listening' &&
              status !== 'transcribing' &&
              status !== 'got_it' &&
              status !== 'thinking' &&
              status !== 'replying' ? (
              <p className="mt-2 text-caption text-ink-tertiary italic">
                After your next turn, the text we pass along will appear here.
              </p>
            ) : null}
          </div>
        ) : null}
        {isLanguageCoachSession ? <LanguageCoachTurnFeedbackCard feedback={lastCoachTurnFeedback} /> : null}
        {captionsOn ? (
          <LiveTranscriptThread
            turns={turns}
            partialUserText={partialUserText}
            assistantDraft={assistantStreamDraft}
            assistantThinking={(status === 'thinking' || status === 'got_it') && !assistantStreamDraft.trim()}
            status={status}
            latestAssistantId={latestAssistantId}
          />
        ) : phoneAssistantMode && phoneCallBackdropSrc && scenarioId === PHONE_CALL_SCENARIO_ID ? (
          <SpeakLiveOrderingFoodVisual
            imageSrc={phoneCallBackdropSrc}
            tone={trainVisualTone(status)}
            kicker={phoneCallHeroCopy?.kicker ?? 'Telefoon'}
            title={assistantLabel}
            body={
              phoneCallHeroCopy?.body ??
              'You are on with the person you see — mic below, replay lives in More.'
            }
            className={SPEAK_LIVE_VENUE_HERO_LAYOUT}
            imageObjectClassName="object-cover object-[50%_28%] sm:object-[48%_26%]"
            captionReadable
          />
        ) : phoneAssistantMode ? (
          <div className="flex-1 flex flex-col min-h-[12rem] items-center justify-center gap-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/90 to-white px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600/15 ring-2 ring-emerald-500/35">
              <Wifi className="h-8 w-8 text-emerald-800" aria-hidden />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-900/80">Call view</p>
              <p className="mt-2 text-body font-semibold text-ink-primary">Voice-led call</p>
              <p className="mt-2 text-caption text-ink-secondary max-w-[280px] leading-relaxed">
                No scene image here — use the mic; replay is under More.
              </p>
            </div>
          </div>
        ) : isLanguageCoachSession ? (
          <SpeakLiveOrderingFoodVisual
            imageSrc={LANGUAGE_COACH_DEFAULT_HERO_SRC}
            tone={trainVisualTone(status)}
            kicker="Free conversation"
            title={assistantLabel}
            body="Stay in Dutch together — gentle nudges toward how people really say it."
            className={SPEAK_LIVE_VENUE_HERO_LAYOUT}
            imageObjectClassName="object-cover object-[68%_center] sm:object-[72%_center]"
            captionReadable
          />
        ) : (
          showPartySocialVisual ? (
            <SpeakLiveOrderingFoodVisual
              imageSrc={partySocialBackdropSrc!}
              tone={trainVisualTone(status)}
              kicker={partySocialCardCopy.kicker}
              title={assistantLabel}
              body={partySocialCardCopy.body}
              className={SPEAK_LIVE_VENUE_HERO_LAYOUT}
              imageObjectClassName="object-cover object-[50%_35%] sm:object-[48%_32%]"
              captionReadable
            />
          ) : showOpinionsDiscussionsVisual ? (
            <SpeakLiveOrderingFoodVisual
              imageSrc={opinionsDiscussionsBackdropSrc!}
              tone={trainVisualTone(status)}
              kicker={opinionsDiscussionsCardCopy.kicker}
              title={assistantLabel}
              body={opinionsDiscussionsCardCopy.body}
              className={SPEAK_LIVE_VENUE_HERO_LAYOUT}
              imageObjectClassName="object-cover object-[50%_35%] sm:object-[48%_32%]"
              captionReadable
            />
          ) : showStorytellingVisual ? (
            <SpeakLiveOrderingFoodVisual
              imageSrc={storytellingBackdropSrc!}
              tone={trainVisualTone(status)}
              kicker={storytellingCardCopy.kicker}
              title={assistantLabel}
              body={storytellingCardCopy.body}
              className={SPEAK_LIVE_VENUE_HERO_LAYOUT}
              imageObjectClassName="object-cover object-[50%_35%] sm:object-[48%_32%]"
              captionReadable
            />
          ) : showExplainingSomethingVisual ? (
            <SpeakLiveOrderingFoodVisual
              imageSrc={explainingSomethingBackdropSrc!}
              tone={trainVisualTone(status)}
              kicker={explainingSomethingCardCopy.kicker}
              title={assistantLabel}
              body={explainingSomethingCardCopy.body}
              className={SPEAK_LIVE_VENUE_HERO_LAYOUT}
              imageObjectClassName="object-cover object-[50%_35%] sm:object-[48%_32%]"
              captionReadable
            />
          ) : showMeetingNewPeopleVisual ? (
            <SpeakLiveOrderingFoodVisual
              imageSrc={meetingNewPeopleBackdropSrc!}
              tone={trainVisualTone(status)}
              kicker={meetingNewPeopleCardCopy.kicker}
              title={assistantLabel}
              body={meetingNewPeopleCardCopy.body}
              className={SPEAK_LIVE_VENUE_HERO_LAYOUT}
              imageObjectClassName="object-cover object-[50%_35%] sm:object-[48%_32%]"
              captionReadable
            />
          ) : showSmallTalkVisual ? (
            <SpeakLiveOrderingFoodVisual
              imageSrc={smallTalkBackdropSrc!}
              tone={trainVisualTone(status)}
              kicker={smallTalkCardCopy.kicker}
              title={assistantLabel}
              body={smallTalkCardCopy.body}
              className={SPEAK_LIVE_VENUE_HERO_LAYOUT}
              imageObjectClassName="object-cover object-[50%_35%] sm:object-[48%_32%]"
              captionReadable
            />
          ) : showPhoneCallVisual ? (
            <SpeakLiveOrderingFoodVisual
              imageSrc={phoneCallBackdropSrc!}
              tone={trainVisualTone(status)}
              kicker={phoneCallCardCopy.kicker}
              title={assistantLabel}
              body={phoneCallCardCopy.body}
              className={SPEAK_LIVE_VENUE_HERO_LAYOUT}
              imageObjectClassName="object-cover object-[50%_28%] sm:object-[48%_26%]"
              captionReadable
            />
          ) : showPublicTransportPhotoVisual ? (
            <SpeakLiveOrderingFoodVisual
              imageSrc={publicTransportBackdropSrc!}
              tone={trainVisualTone(status)}
              kicker={publicTransportCardCopy.kicker}
              title={assistantLabel}
              body={publicTransportCardCopy.body}
              className={SPEAK_LIVE_VENUE_HERO_LAYOUT}
              imageObjectClassName="object-cover object-[50%_32%] sm:object-[48%_30%]"
              captionReadable
            />
          ) : scenarioId.toLowerCase().includes('train') ? (
            <SpeakLiveTrainStationVisual
              scenarioId={scenarioId}
              tone={trainVisualTone(status)}
              title={assistantLabel}
              body="Picture the desk at a Dutch station. Mic below — More has the written thread if you want it."
              className={SPEAK_LIVE_VENUE_HERO_LAYOUT}
              conductorPresentingGender="male"
            />
          ) : showOrderingFoodVisual ? (
            <SpeakLiveOrderingFoodVisual
              imageSrc={orderingFoodBackdropSrc!}
              tone={trainVisualTone(status)}
              kicker={orderingFoodCardCopy.kicker}
              title={assistantLabel}
              body={orderingFoodCardCopy.body}
              className={SPEAK_LIVE_VENUE_HERO_LAYOUT}
            />
          ) : showSupermarketShopVisual ? (
            <SpeakLiveOrderingFoodVisual
              imageSrc={supermarketShopBackdropSrc!}
              tone={trainVisualTone(status)}
              kicker={supermarketShopCardCopy.kicker}
              title={assistantLabel}
              body={supermarketShopCardCopy.body}
              className={SPEAK_LIVE_VENUE_HERO_LAYOUT}
              imageObjectClassName="object-cover object-[56%_32%] sm:object-[54%_30%]"
            />
          ) : showDirectionsVisual ? (
            <SpeakLiveOrderingFoodVisual
              imageSrc={directionsBackdropSrc!}
              tone={trainVisualTone(status)}
              kicker={directionsCardCopy.kicker}
              title={assistantLabel}
              body={directionsCardCopy.body}
              className={SPEAK_LIVE_VENUE_HERO_LAYOUT}
              imageObjectClassName="object-cover object-[50%_30%] sm:object-[48%_28%]"
              captionReadable
            />
          ) : showBookingReservationsVisual ? (
            <SpeakLiveOrderingFoodVisual
              imageSrc={bookingReservationsBackdropSrc!}
              tone={trainVisualTone(status)}
              kicker={bookingReservationsCardCopy.kicker}
              title={assistantLabel}
              body={bookingReservationsCardCopy.body}
              className={SPEAK_LIVE_VENUE_HERO_LAYOUT}
              imageObjectClassName="object-cover object-[50%_32%] sm:object-[48%_30%]"
              captionReadable
            />
          ) : showStoreServiceIssueVisual ? (
            <SpeakLiveOrderingFoodVisual
              imageSrc={storeServiceIssueBackdropSrc!}
              tone={trainVisualTone(status)}
              kicker={storeServiceIssueCardCopy.kicker}
              title={assistantLabel}
              body={storeServiceIssueCardCopy.body}
              className={SPEAK_LIVE_VENUE_HERO_LAYOUT}
              imageObjectClassName="object-cover object-[50%_34%] sm:object-[48%_32%]"
              captionReadable
            />
          ) : showWorkColleagueVisual ? (
            <SpeakLiveOrderingFoodVisual
              imageSrc={workColleagueBackdropSrc!}
              tone={trainVisualTone(status)}
              kicker={workColleagueCardCopy.kicker}
              title={assistantLabel}
              body={workColleagueCardCopy.body}
              className={SPEAK_LIVE_VENUE_HERO_LAYOUT}
              imageObjectClassName="object-cover object-[50%_32%] sm:object-[48%_30%]"
              captionReadable
            />
          ) : showHousingLandlordVisual ? (
            <SpeakLiveOrderingFoodVisual
              imageSrc={housingLandlordBackdropSrc!}
              tone={trainVisualTone(status)}
              kicker={housingLandlordCardCopy.kicker}
              title={assistantLabel}
              body={housingLandlordCardCopy.body}
              className={SPEAK_LIVE_VENUE_HERO_LAYOUT}
              imageObjectClassName="object-cover object-[50%_34%] sm:object-[48%_32%]"
              captionReadable
            />
          ) : showDoctorPharmacyVisual ? (
            <SpeakLiveOrderingFoodVisual
              imageSrc={doctorPharmacyBackdropSrc!}
              tone={trainVisualTone(status)}
              kicker={doctorPharmacyCardCopy.kicker}
              title={assistantLabel}
              body={doctorPharmacyCardCopy.body}
              className={SPEAK_LIVE_VENUE_HERO_LAYOUT}
              imageObjectClassName="object-cover object-[50%_30%] sm:object-[48%_28%]"
              captionReadable
            />
          ) : (
            <div className="flex flex-col min-h-[9rem] max-h-[min(28vh,11rem)] shrink-0 justify-center items-center rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white px-5 py-6 text-center shadow-card">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-tertiary">Voice</p>
              <p className="mt-3 text-lg font-semibold text-ink-primary tracking-tight">Live call mode</p>
              <p className="mt-2 text-caption text-ink-secondary max-w-[280px] leading-relaxed">
                Two-way audio, like a call. Mic below — the written thread is in <span className="text-ink-primary font-semibold">More</span>.
              </p>
            </div>
          )
        )}
      </div>

      {showDevPanel && devPanelOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[63] bg-slate-900/25"
            aria-label="Close debug panel"
            onClick={() => setDevPanelOpen(false)}
          />
          <div className="pointer-events-auto fixed inset-x-3 bottom-[max(5.5rem,env(safe-area-inset-bottom)+4.5rem)] z-[64] mx-auto max-h-[50vh] max-w-lg overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Debug (dev)</p>
              <button
                type="button"
                onClick={() => setDevPanelOpen(false)}
                className="rounded-lg px-2 py-1 text-[12px] font-medium text-[#6d28d9] hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="max-h-[min(42vh,22rem)] overflow-auto p-2">
              <pre className="text-[10px] text-emerald-900 whitespace-pre-wrap break-all">
                {safeJsonForDev({
                  partialUserText,
                  lastPerf,
                  lastLatencyTrace,
                  lastDebug,
                  lastPipelineError,
                  debugHint:
                    'If something failed: (1) Console filter `[Speak Live pipeline]`. (2) Network tab — `x-correlation-id`. (3) Functions host logs.',
                })}
              </pre>
              {lastLatencyTrace ? (
                <div className="mt-2 rounded-lg border border-[#E5E7EB] bg-[#fafaf7] px-2 py-1.5 text-[10px] text-[#475569] space-y-0.5">
                  <p className="font-semibold text-[#64748B]">Latency (last turn)</p>
                  <p>
                    Bottleneck: <span className="font-semibold text-amber-900">{lastLatencyTrace.bottleneck ?? '—'}</span>
                  </p>
                  <p className="tabular-nums">
                    partial→final:{' '}
                    {lastLatencyTrace.firstPartialTranscriptMs != null ? `${Math.round(lastLatencyTrace.firstPartialTranscriptMs)}→` : ''}
                    {lastLatencyTrace.finalTranscriptMs != null ? `${Math.round(lastLatencyTrace.finalTranscriptMs)}` : '—'} ms · LLM:{' '}
                    {lastLatencyTrace.llmMs != null ? `${Math.round(lastLatencyTrace.llmMs)}` : '—'} ms · TTS:{' '}
                    {lastLatencyTrace.ttsMs != null ? `${Math.round(lastLatencyTrace.ttsMs)}` : '—'} ms · total:{' '}
                    {lastLatencyTrace.totalMs != null ? `${Math.round(lastLatencyTrace.totalMs)}` : '—'} ms
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      <footer className="shrink-0 z-30 border-t border-slate-200 bg-surface-elevated/98 backdrop-blur-md px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_14px_-6px_rgb(0_0_0/0.06)]">
        <div className="max-w-lg mx-auto w-full flex flex-col items-center gap-3">
          <LiveSessionControls
            status={status}
            micMode={micMode}
            listenMs={listenMs}
            muted={muted}
            settingsOpen={settingsOpen}
            micDisabled={micDisabled}
            micHint={micHint}
            stateHeadline={speakStateHeadline}
            stateSubline={speakStateSublineForUi}
            onMicPointerDown={onMicPointerDown}
            onMicPointerUp={onMicPointerUp}
            onMicClickToggle={onMicClickToggle}
            onTogglePause={togglePause}
            onToggleMute={() => {
              playAppSound('tap')
              setMuted((m) => {
                const next = !m
                if (!next) armAssistantAudio()
                return next
              })
            }}
            onToggleSettings={() => setSettingsOpen((s) => !s)}
            onSetMicMode={(m) => {
              setMicMode(m)
              setSettingsOpen(false)
            }}
            onSwitchToText={() => {
              playAppSound('tap')
              if (threadId) router.push(appTalkThread(threadId))
            }}
            canReplayAssistant={Boolean(lastAssistantAudioUrl?.trim())}
            replayDisabled={lastAssistantTtsFailed}
            replayDisabledReason="No voice for this reply."
            onReplayAssistant={() => {
              playAppSound('tap')
              armAssistantAudio()
              replayLastAssistant()
            }}
            captionsOn={captionsOn}
            onToggleCaptions={toggleCaptions}
            assistTranscriptAvailable={phoneAssistantMode}
            assistTranscriptOn={captionsOn}
            onToggleAssistTranscript={() => {
              playAppSound('tap')
              toggleCaptions()
            }}
            showDevDebugEntry={showDevPanel}
            onOpenDevDebug={() => {
              playAppSound('tap')
              setDevPanelOpen(true)
            }}
          />

          {micError ? (
            <div className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-center">
              <p className="text-caption text-rose-900">
                {micError === 'mic_denied'
                  ? 'Allow the microphone in your browser to keep talking here.'
                  : 'The mic could not start. Close other apps using it, check permissions, and try again.'}
              </p>
              <button
                type="button"
                onClick={() => setMicError(null)}
                className="mt-2 text-caption font-bold text-primary-700 underline-offset-2 hover:underline"
              >
                Dismiss
              </button>
            </div>
          ) : null}

          <p className="max-w-sm px-1 text-center text-[12px] leading-relaxed text-[#64748B]">
            {isLanguageCoachSession ? (
              <>
                When it feels right, <span className="font-medium text-[#475569]">Finish &amp; debrief</span> opens your coach recap.
              </>
            ) : (
              <>
                <span className="font-medium text-[#475569]">Finish &amp; feedback</span> saves the call and your voice notes.
              </>
            )}
          </p>
        </div>
      </footer>

      {phraseHelpOpen ? (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            aria-label="Close phrase ideas"
            onClick={() => {
              playAppSound('tap')
              setPhraseHelpOpen(false)
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="phrase-help-title"
            className="relative z-[61] mx-auto w-full max-w-lg rounded-t-2xl border border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_50px_-20px_rgba(15,23,42,0.35)] max-h-[min(78dvh,32rem)] flex flex-col"
          >
            <div className="flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h2 id="phrase-help-title" className="text-body font-bold text-ink-primary">
                  What you could say
                </h2>
                <p className="mt-1 text-caption text-ink-secondary leading-snug">
                  Short Dutch lines for this beat — copy, then make them yours out loud.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  playAppSound('tap')
                  setPhraseHelpOpen(false)
                }}
                className="min-h-touch min-w-touch shrink-0 rounded-xl text-ink-secondary hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" aria-hidden />
              </button>
            </div>
            {phraseHelpSource === 'fallback' ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-caption text-amber-950">
                Showing built-in examples (phrase coach offline or unavailable). With the API configured, suggestions are
                tailored to your last assistant line.
              </p>
            ) : null}
            {phraseHelpError ? (
              <p className="mt-2 text-caption text-rose-800">{phraseHelpError}</p>
            ) : null}
            <div className="mt-3 flex-1 min-h-0 overflow-y-auto">
              {phraseHelpLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10">
                  <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-primary-500 motion-safe:animate-spin" />
                  <p className="text-caption text-ink-secondary">Finding ideas…</p>
                </div>
              ) : phraseHelpItems.length ? (
                <ul className="space-y-2 pb-2">
                  {phraseHelpItems.map((line, idx) => (
                    <li
                      key={`${idx}-${line.slice(0, 24)}`}
                      className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2.5"
                    >
                      <p className="flex-1 min-w-0 text-body-sm font-medium text-ink-primary leading-relaxed">{line}</p>
                      <button
                        type="button"
                        onClick={() => {
                          playAppSound('tap')
                          void navigator.clipboard?.writeText(line).catch(() => undefined)
                        }}
                        className="shrink-0 self-start rounded-lg border border-slate-200 bg-white p-2 text-ink-secondary hover:bg-slate-100"
                        aria-label="Copy phrase"
                        title="Copy"
                      >
                        <Copy className="w-4 h-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : phraseHelpError ? null : (
                <p className="py-8 text-center text-caption text-ink-secondary">No suggestions yet.</p>
              )}
            </div>
            <div className="shrink-0 pt-2 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                disabled={!threadId || phraseHelpLoading}
                onClick={() => {
                  playAppSound('tap')
                  void fetchPhraseHelp()
                }}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-caption font-semibold text-ink-primary hover:bg-slate-50 disabled:opacity-40"
              >
                Refresh ideas
              </button>
              <button
                type="button"
                onClick={() => {
                  playAppSound('tap')
                  setPhraseHelpOpen(false)
                }}
                className="flex-1 rounded-xl bg-slate-900 py-2.5 text-caption font-semibold text-white hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <EndSessionSheet
        open={endSheetOpen}
        busy={isEndingCall}
        onClose={() => (isEndingCall ? null : setEndSheetOpen(false))}
        onChoose={(c) => void handleEndChoice(c)}
      />

      {isEndingCall ? (
        <div
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-slate-950/55 px-6 backdrop-blur-sm"
          role="alertdialog"
          aria-busy="true"
          aria-live="polite"
          aria-label="Ending session"
        >
          <div className="h-11 w-11 rounded-full border-2 border-white/30 border-t-white motion-safe:animate-spin" />
          <p className="mt-5 text-body-sm font-semibold text-white text-center">Ending session…</p>
          <p className="mt-2 max-w-sm text-center text-caption leading-relaxed text-white/85">
            We are closing the live call on the server and preparing your voice evaluation. You will move to the
            feedback screen automatically — stay on this page.
          </p>
        </div>
      ) : null}

      <LiveSpeechPerfOverlay
        trace={lastLatencyTrace}
        serverStreamPerf={lastServerStreamPerf}
        turnDebug={lastDebug}
        timeline={lastTimeline}
      />
    </div>
  )
}
