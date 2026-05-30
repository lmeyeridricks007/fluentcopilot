'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  BOOKING_RESERVATIONS_SCENARIO_ID,
  BOOKING_RESERVATIONS_SMART_MIX_CARD_COPY,
  DOCTOR_PHARMACY_SCENARIO_ID,
  DOCTOR_PHARMACY_SMART_MIX_CARD_COPY,
  DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID,
  ORDERING_FOOD_SCENARIO_ID,
  resolveBookingReservationsSpeakLiveBackdropSrc,
  resolveBookingReservationsSubtypeForSession,
  resolveDirectionsDestinationForSession,
  resolveDirectionsSpeakLiveBackdropSrc,
  resolveDoctorPharmacySpeakLiveBackdropSrc,
  resolveDoctorPharmacySubtypeForSession,
  resolveOrderingFoodSpeakLiveBackdropSrc,
  resolveOrderingFoodVenueForSession,
  resolvePublicTransportSpeakLiveBackdropSrc,
  resolvePublicTransportSubtypeForSession,
  resolveStoreServiceIssueSpeakLiveBackdropSrc,
  resolveStoreServiceIssueSubtypeForSession,
  resolveWorkColleagueSpeakLiveBackdropSrc,
  resolveWorkColleagueSubtypeForSession,
  HOUSING_LANDLORD_SCENARIO_ID,
  HOUSING_LANDLORD_ISSUE_FOCUS_OPTIONS,
  HOUSING_LANDLORD_CONTRACT_FOCUS_OPTIONS,
  PHONE_CALL_SCENARIO_ID,
  PHONE_CALL_LIVE_CARD_COPY,
  PHONE_CALL_SMART_MIX_CARD_COPY,
  PHONE_CALL_TOPIC_OPTIONS,
  SMALL_TALK_SCENARIO_ID,
  SMALL_TALK_LIVE_CARD_COPY,
  SMALL_TALK_SMART_MIX_CARD_COPY,
  MEETING_NEW_PEOPLE_SCENARIO_ID,
  MEETING_NEW_PEOPLE_LIVE_CARD_COPY,
  MEETING_NEW_PEOPLE_SMART_MIX_CARD_COPY,
  PARTY_SOCIAL_SCENARIO_ID,
  PARTY_SOCIAL_LIVE_CARD_COPY,
  PARTY_SOCIAL_SMART_MIX_CARD_COPY,
  EXPLAINING_SOMETHING_SCENARIO_ID,
  EXPLAINING_SOMETHING_LIVE_CARD_COPY,
  EXPLAINING_SOMETHING_SMART_MIX_CARD_COPY,
  STORYTELLING_SCENARIO_ID,
  STORYTELLING_LIVE_CARD_COPY,
  STORYTELLING_SMART_MIX_CARD_COPY,
  OPINIONS_DISCUSSIONS_SCENARIO_ID,
  OPINIONS_DISCUSSIONS_LIVE_CARD_COPY,
  OPINIONS_DISCUSSIONS_SMART_MIX_CARD_COPY,
  LANGUAGE_COACH_SCENARIO_ID,
  inferStorytellingVariationFromScenarioContext,
  inferOpinionsDiscussionsVariationFromScenarioContext,
  inferPartySocialVariationFromScenarioContext,
  inferExplainingSomethingVariationFromScenarioContext,
  inferMeetingNewPeopleVariationFromScenarioContext,
  inferSmallTalkVariationFromScenarioContext,
  resolveExplainingSomethingSpeakLiveBackdropSrc,
  resolveStorytellingSpeakLiveBackdropSrc,
  resolveOpinionsDiscussionsSpeakLiveBackdropSrc,
  resolveMeetingNewPeopleSpeakLiveBackdropSrc,
  resolvePartySocialSpeakLiveBackdropSrc,
  resolvePhoneCallSpeakLiveBackdropSrc,
  resolveSmallTalkSpeakLiveBackdropSrc,
  resolvePhoneCallSubtypeForSession,
  HOUSING_LANDLORD_SMART_MIX_CARD_COPY,
  resolveHousingLandlordSpeakLiveBackdropSrc,
  resolveHousingLandlordSubtypeForSession,
  STORE_SERVICE_ISSUE_DETAIL_FOCUS_OPTIONS,
  STORE_SERVICE_ISSUE_SCENARIO_ID,
  STORE_SERVICE_ISSUE_SMART_MIX_CARD_COPY,
  SUPERMARKET_SHOP_SCENARIO_ID,
  WORK_COLLEAGUE_INTERACTION_SCENARIO_ID,
  WORK_COLLEAGUE_SMART_MIX_CARD_COPY,
  WORK_COLLEAGUE_TASK_FOCUS_OPTIONS,
  TRAIN_STATION_SCENARIO_ID,
  resolveSupermarketShopSpeakLiveBackdropSrc,
  resolveSupermarketShopSettingForSession,
  type BookingReservationsScenarioOverrides,
  type BookingReservationsScenarioSubtype,
  type DirectionsGettingSomewhereOverrides,
  type DoctorPharmacyScenarioOverrides,
  type DoctorPharmacyScenarioSubtype,
  type OrderingFoodScenarioOverrides,
  type PublicTransportScenarioOverrides,
  type PublicTransportScenarioSubtype,
  type PublicTransportScenarioVariation,
  type StoreServiceIssueScenarioOverrides,
  type StoreServiceIssueScenarioSubtype,
  type SupermarketShopScenarioOverrides,
  type WorkColleagueScenarioOverrides,
  type WorkColleagueScenarioSubtype,
  type HousingLandlordScenarioOverrides,
  type HousingLandlordScenarioSubtype,
  type PhoneCallScenarioOverrides,
  type SmallTalkScenarioOverrides,
  type MeetingNewPeopleScenarioOverrides,
  type PartySocialScenarioOverrides,
  type ExplainingSomethingScenarioOverrides,
  type StorytellingScenarioOverrides,
  type OpinionsDiscussionsScenarioOverrides,
} from './speakLiveScenarios'
import { SpeakLiveCallScreen } from './call/SpeakLiveCallScreen'
import { LiveConversationScreen } from './live/LiveConversationScreen'
import type { LiveSessionBootstrap } from './live/liveSpeakTypes'
import { SpeakLiveTrainDebugPanel } from './SpeakLiveTrainDebugPanel'
import { APP_TALK_HUB, appSpeakLiveSessionEvaluation, appSpeakLiveThreadRecap } from '@/lib/routing/appRoutes'
import { playAppSound } from '@/lib/interaction/appSounds'
import { isFeature1ChatBackendEnabled, isSpeakLiveDevUiMockEnabled } from '@/lib/api/apiConfig'
import type { LanguageCoachConversationRole, LanguageCoachStartBody } from '@/lib/api/languageCoachTypes'
import { LANGUAGE_COACH_ROLE_CARDS, parseLanguageCoachRoleParam } from './languageCoachRoleCatalog'
import { conversationClient } from '@/lib/api/conversationClient'
import { ApiRequestError } from '@/lib/api/apiErrors'
import { getApiBaseUrl } from '@/lib/api/apiConfig'
import { mapApiSummaryToRecapView } from '@/lib/api/conversationMappers'
import type { SpeakLiveTurnResponse } from '@/lib/api/apiTypes'
import { clearResumableLiveSession, writeResumableLiveSession } from '@/lib/speak-live/resumableLiveSessionStorage'
import type { FeedbackMode } from '@/features/feature1-chat/types'

const STORAGE_KEY = 'fc-speak-live-saved-sessions'

const LANGUAGE_COACH_GOAL_LABELS: Record<string, string> = {
  general: 'General conversation',
  fluency: 'Fluency',
  pronunciation: 'Pronunciation',
  grammar: 'Grammar',
  confidence: 'Confidence',
  storytelling: 'Storytelling',
  follow_up_questions: 'Follow-up questions',
}

type SavedSession = {
  savedAt: string
  scenarioId: string
  level: string
  note: string
}

function readSaved(): SavedSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as SavedSession[]) : []
  } catch {
    return []
  }
}

function writeSaved(rows: SavedSession[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, 12)))
}

function SpeakLiveBackendRequiredScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-[100dvh] bg-surface text-ink-primary flex flex-col items-center justify-center px-6 text-center gap-4">
      <p className="text-body-sm text-ink-secondary max-w-sm leading-relaxed">
        Speak Live uses your FluentCopilot API for speech, the assistant model, and recap. Set{' '}
        <span className="font-mono text-emerald-800">NEXT_PUBLIC_API_BASE_URL</span> and{' '}
        <span className="font-mono text-emerald-800">NEXT_PUBLIC_FEATURE1_CHAT_SOURCE=backend</span> to enable the
        real-time pipeline.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="min-h-touch rounded-xl border border-slate-200 bg-white px-5 py-3 text-body-sm font-semibold text-ink-primary hover:bg-slate-50 shadow-card"
      >
        Back to Talk
      </button>
    </div>
  )
}

export function SpeakLiveRunView() {
  const router = useRouter()
  const qc = useQueryClient()
  const searchParams = useSearchParams()
  const scenarioId = searchParams.get('scenarioId')?.trim() || 'train-station'
  const level = searchParams.get('level')?.trim().toUpperCase() || 'A2'
  const resumeThreadId = searchParams.get('threadId')?.trim() || ''
  const subTypeParam = searchParams.get('subType')?.trim().toLowerCase() || ''
  const variationParam = searchParams.get('variation')?.trim().toLowerCase() || ''
  const destinationParam = searchParams.get('destination')?.trim() || ''
  const detailFocusParam = searchParams.get('detailFocus')?.trim().toLowerCase() || ''
  const interactionUiParam = searchParams.get('interactionUi')?.trim().toLowerCase() || ''
  const interactionUi: 'phone' | 'standard' | null =
    interactionUiParam === 'phone'
      ? 'phone'
      : interactionUiParam === 'standard'
        ? 'standard'
        : scenarioId === PHONE_CALL_SCENARIO_ID
          ? 'phone'
          : null
  const lcGoal = searchParams.get('lcGoal')?.trim() ?? ''
  const lcFeedback = searchParams.get('lcFeedback')?.trim() ?? ''
  const lcCoach = searchParams.get('lcCoach')?.trim() ?? ''
  const lcPersona = searchParams.get('lcPersona')?.trim() ?? ''
  const lcRole: LanguageCoachConversationRole = parseLanguageCoachRoleParam(searchParams.get('lcRole'))
  const lcGuideRaw = searchParams.get('lcGuide')?.trim().toLowerCase() ?? ''
  const lcGuideOn = lcGuideRaw === '1' || lcGuideRaw === 'true' || lcGuideRaw === 'yes'
  /**
   * "Plan your next session" deep-link from the previous report. Capped to 320 chars to
   * match the server-side Zod schema; the producer keeps it ≤220.
   */
  const lcPinnedFocus = (() => {
    const raw = searchParams.get('lcPinnedFocus')?.trim() ?? ''
    return raw ? raw.slice(0, 320) : ''
  })()

  const speakLiveFeedbackMode = useMemo((): FeedbackMode => {
    if (scenarioId !== LANGUAGE_COACH_SCENARIO_ID) return 'at_end'
    return lcFeedback === 'every_turn' ? 'after_each' : 'at_end'
  }, [scenarioId, lcFeedback])

  const languageCoachStartBody = useMemo((): LanguageCoachStartBody | undefined => {
    if (scenarioId !== LANGUAGE_COACH_SCENARIO_ID) return undefined
    const goals = new Set([
      'general',
      'fluency',
      'pronunciation',
      'grammar',
      'confidence',
      'storytelling',
      'follow_up_questions',
    ])
    const feedbacks = new Set(['subtle_and_end', 'at_end_only', 'every_turn'])
    const coaches = new Set(['supportive', 'balanced', 'challenging'])
    const personas = new Set(['local', 'coach', 'casual'])
    const out: LanguageCoachStartBody = { conversationRole: lcRole }
    if (goals.has(lcGoal)) {
      out.conversationGoal = lcGoal as NonNullable<LanguageCoachStartBody['conversationGoal']>
    }
    if (feedbacks.has(lcFeedback)) {
      out.feedbackStyle = lcFeedback as NonNullable<LanguageCoachStartBody['feedbackStyle']>
    }
    if (coaches.has(lcCoach)) {
      out.coachStyle = lcCoach as NonNullable<LanguageCoachStartBody['coachStyle']>
    }
    if (personas.has(lcPersona)) {
      out.personaStyle = lcPersona as NonNullable<LanguageCoachStartBody['personaStyle']>
    }
    if (lcRole === 'coach' && lcGuideOn) {
      out.coachGuideWhileSpeaking = true
    }
    /**
     * Backend writes this into `learnerPinnedLessonFocusEnglish`; the coach prompt builder
     * weaves it into every reply. Only forward when non-empty so we don't accidentally
     * clear a prior focus on resume.
     */
    if (lcPinnedFocus) {
      out.pinnedFocusEnglish = lcPinnedFocus
    }
    return out
  }, [scenarioId, lcGoal, lcFeedback, lcCoach, lcPersona, lcRole, lcGuideOn, lcPinnedFocus])

  const scenarioOverrides = useMemo(
    () => {
      if (scenarioId === ORDERING_FOOD_SCENARIO_ID) {
        return {
          ...(subTypeParam === 'cafe' || subTypeParam === 'restaurant' || subTypeParam === 'takeaway'
            ? { subType: subTypeParam as OrderingFoodScenarioOverrides['subType'] }
            : {}),
          ...(variationParam &&
          ['simple', 'simple_order', 'dietary', 'dietary_request', 'recommendation'].includes(variationParam)
            ? {
                variation: variationParam as
                  | 'simple'
                  | 'simple_order'
                  | 'dietary'
                  | 'dietary_request'
                  | 'recommendation',
              }
            : {}),
        }
      }
      if (scenarioId === SUPERMARKET_SHOP_SCENARIO_ID) {
        const st = subTypeParam as SupermarketShopScenarioOverrides['subType'] | undefined
        const validSetting =
          st === 'supermarket' || st === 'convenience_store' || st === 'pharmacy_style' || st === 'general_retail'
            ? st
            : undefined
        const vf = variationParam as SupermarketShopScenarioOverrides['variation'] | undefined
        const validVar =
          vf === 'asking_where_something_is' || vf === 'paying_checkout' || vf === 'product_questions' ? vf : undefined
        return {
          ...(validSetting ? { subType: validSetting } : {}),
          ...(validVar ? { variation: validVar } : {}),
        }
      }
      if (scenarioId === DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID) {
        const dest = subTypeParam as DirectionsGettingSomewhereOverrides['subType'] | undefined
        const validDest =
          dest &&
          [
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
          ].includes(dest)
            ? dest
            : undefined
        const vf = variationParam as DirectionsGettingSomewhereOverrides['variation'] | undefined
        const validVar =
          vf === 'asking_for_directions' || vf === 'understanding_instructions' || vf === 'confirming_route'
            ? vf
            : undefined
        return {
          ...(validDest ? { subType: validDest } : {}),
          ...(validVar ? { variation: validVar } : {}),
        }
      }
      if (scenarioId === TRAIN_STATION_SCENARIO_ID) {
        const rawSub = subTypeParam === 'trein' ? 'train' : subTypeParam
        const validSub: PublicTransportScenarioSubtype | undefined =
          rawSub === 'train' || rawSub === 'bus' || rawSub === 'tram' || rawSub === 'metro' ? rawSub : undefined
        const v = variationParam.replace(/-/g, '_')
        const validVar: PublicTransportScenarioVariation | undefined =
          v === 'route' || v === 'route_and_platform' || v === 'platform' || v === 'perron'
            ? 'route_and_platform'
            : v === 'ticket' || v === 'buying_ticket' || v === 'kaartje' || v === 'tickets'
              ? 'buying_ticket'
              : v === 'delay' ||
                  v === 'delays' ||
                  v === 'delays_and_disruptions' ||
                  v === 'disruption' ||
                  v === 'vertraging'
                ? 'delays_and_disruptions'
                : undefined
        return {
          ...(validSub ? { subType: validSub } : {}),
          ...(validVar ? { variation: validVar } : {}),
          ...(destinationParam ? { destination: destinationParam.slice(0, 120) } : {}),
        }
      }
      if (scenarioId === BOOKING_RESERVATIONS_SCENARIO_ID) {
        const rawSt = subTypeParam.replace(/-/g, '_')
        const validSub: BookingReservationsScenarioSubtype | undefined =
          rawSt === 'restaurant_booking' || rawSt === 'restaurant'
            ? 'restaurant_booking'
            : rawSt === 'hairdresser_booking' || rawSt === 'hairdresser' || rawSt === 'hair' || rawSt === 'salon'
              ? 'hairdresser_booking'
              : rawSt === 'appointment_booking' ||
                  rawSt === 'appointment' ||
                  rawSt === 'desk' ||
                  rawSt === 'office'
                ? 'appointment_booking'
                : undefined
        const vf = variationParam.replace(/-/g, '_')
        const validVar =
          vf === 'asking_availability' || vf === 'making_booking' || vf === 'confirming_details' ? vf : undefined
        const df = detailFocusParam.replace(/-/g, '_')
        const validDf =
          df === 'time_day' ||
          df === 'party_size' ||
          df === 'service_type' ||
          df === 'name' ||
          df === 'stylist' ||
          df === 'outdoor' ||
          df === 'reason'
            ? df
            : undefined
        return {
          ...(validSub ? { subType: validSub } : {}),
          ...(validVar ? { variation: validVar } : {}),
          ...(validDf ? { detailFocus: validDf } : {}),
        }
      }
      if (scenarioId === DOCTOR_PHARMACY_SCENARIO_ID) {
        const rawSt = subTypeParam.replace(/-/g, '_')
        const validSub: DoctorPharmacyScenarioSubtype | undefined =
          rawSt === 'doctor_visit' || rawSt === 'doctor' || rawSt === 'huisarts' || rawSt === 'gp'
            ? 'doctor_visit'
            : rawSt === 'pharmacy' || rawSt === 'apotheek'
              ? 'pharmacy'
              : rawSt === 'clinic_reception' || rawSt === 'clinic' || rawSt === 'reception' || rawSt === 'balie'
                ? 'clinic_reception'
                : undefined
        const vf = variationParam.replace(/-/g, '_')
        const validVar =
          vf === 'symptoms' || vf === 'asking_for_help' || vf === 'understanding_instructions' ? vf : undefined
        const df = detailFocusParam.replace(/-/g, '_')
        const healthFocusAllowed = new Set([
          'headache',
          'cough',
          'sore_throat',
          'fever',
          'stomach_ache',
          'dizziness',
          'allergies',
          'tiredness',
          'medicine_instructions',
          'appointment_request',
        ])
        const validDf = healthFocusAllowed.has(df) ? df : undefined
        return {
          ...(validSub ? { subType: validSub } : {}),
          ...(validVar ? { variation: validVar } : {}),
          ...(validDf ? { detailFocus: validDf } : {}),
        }
      }
      if (scenarioId === STORE_SERVICE_ISSUE_SCENARIO_ID) {
        const rawSt = subTypeParam.replace(/-/g, '_')
        const validSub: StoreServiceIssueScenarioSubtype | undefined =
          rawSt === 'store_return' || rawSt === 'return' || rawSt === 'retour'
            ? 'store_return'
            : rawSt === 'service_issue' || rawSt === 'service'
              ? 'service_issue'
              : rawSt === 'product_problem' || rawSt === 'product'
                ? 'product_problem'
                : undefined
        const vf = variationParam.replace(/-/g, '_')
        const validVar =
          vf === 'returning_item' || vf === 'return'
            ? 'returning_item'
            : vf === 'complaint'
              ? 'complaint'
              : vf === 'explaining_issue' || vf === 'explain'
                ? 'explaining_issue'
                : undefined
        const df = detailFocusParam.replace(/-/g, '_')
        const validDf = STORE_SERVICE_ISSUE_DETAIL_FOCUS_OPTIONS.find((o) => o.id === df)?.id
        return {
          ...(validSub ? { subType: validSub } : {}),
          ...(validVar ? { variation: validVar } : {}),
          ...(validDf ? { detailFocus: validDf } : {}),
        }
      }
      if (scenarioId === WORK_COLLEAGUE_INTERACTION_SCENARIO_ID) {
        const rawSt = subTypeParam.replace(/-/g, '_')
        const validSub: WorkColleagueScenarioSubtype | undefined =
          rawSt === 'colleague_chat' || rawSt === 'colleague' || rawSt === 'chat'
            ? 'colleague_chat'
            : rawSt === 'team_task' || rawSt === 'team'
              ? 'team_task'
              : rawSt === 'manager_or_lead_request' || rawSt === 'manager' || rawSt === 'lead'
                ? 'manager_or_lead_request'
                : undefined
        const vf = variationParam.replace(/-/g, '_')
        const validVar: WorkColleagueScenarioOverrides['variation'] | undefined =
          vf === 'simple_workplace_conversation' || vf === 'simple' || vf === 'workplace'
            ? 'simple_workplace_conversation'
            : vf === 'asking_for_help' || vf === 'help'
              ? 'asking_for_help'
              : vf === 'clarifying_tasks' || vf === 'clarify' || vf === 'tasks'
                ? 'clarifying_tasks'
                : undefined
        const df = detailFocusParam.replace(/-/g, '_')
        const validDf = WORK_COLLEAGUE_TASK_FOCUS_OPTIONS.find((o) => o.id === df)?.id
        return {
          ...(validSub ? { subType: validSub } : {}),
          ...(validVar ? { variation: validVar } : {}),
          ...(validDf ? { detailFocus: validDf } : {}),
        }
      }
      if (scenarioId === HOUSING_LANDLORD_SCENARIO_ID) {
        const rawSt = subTypeParam.replace(/-/g, '_')
        const validSub: HousingLandlordScenarioSubtype | undefined =
          rawSt === 'landlord' || rawSt === 'verhuurder'
            ? 'landlord'
            : rawSt === 'rental_agency' || rawSt === 'agency' || rawSt === 'makelaar'
              ? 'rental_agency'
              : rawSt === 'building_manager' || rawSt === 'beheer' || rawSt === 'gebouw'
                ? 'building_manager'
                : undefined
        const vf = variationParam.replace(/-/g, '_')
        const validVar: HousingLandlordScenarioOverrides['variation'] | undefined =
          vf === 'reporting_issue' || vf === 'report' || vf === 'issue' || vf === 'repair'
            ? 'reporting_issue'
            : vf === 'asking_rent_contract' || vf === 'rent' || vf === 'contract' || vf === 'huur'
              ? 'asking_rent_contract'
              : undefined
        const df = detailFocusParam.replace(/-/g, '_')
        const validDf =
          HOUSING_LANDLORD_ISSUE_FOCUS_OPTIONS.find((o) => o.id === df)?.id ??
          HOUSING_LANDLORD_CONTRACT_FOCUS_OPTIONS.find((o) => o.id === df)?.id
        return {
          ...(validSub ? { subType: validSub } : {}),
          ...(validVar ? { variation: validVar } : {}),
          ...(validDf ? { detailFocus: validDf } : {}),
        }
      }
      if (scenarioId === SMALL_TALK_SCENARIO_ID) {
        const rawSt = subTypeParam.replace(/-/g, '_')
        const validSub: SmallTalkScenarioOverrides['subType'] | undefined =
          rawSt === 'meeting_someone' || rawSt === 'meeting' || rawSt === 'intro'
            ? 'meeting_someone'
            : rawSt === 'casual_chat' || rawSt === 'casual' || rawSt === 'chat'
              ? 'casual_chat'
              : rawSt === 'social_checkin' || rawSt === 'checkin' || rawSt === 'check_in'
                ? 'social_checkin'
                : undefined
        const vf = variationParam.replace(/-/g, '_')
        const validVar: SmallTalkScenarioOverrides['variation'] | undefined =
          vf === 'meeting_someone' || vf === 'meeting' || vf === 'intro'
            ? 'meeting_someone'
            : vf === 'talking_about_weekend' || vf === 'weekend'
              ? 'talking_about_weekend'
              : vf === 'talking_about_weather' || vf === 'weather' || vf === 'weer'
                ? 'talking_about_weather'
                : undefined
        return {
          ...(validSub ? { subType: validSub } : {}),
          ...(validVar ? { variation: validVar } : {}),
        }
      }
      if (scenarioId === MEETING_NEW_PEOPLE_SCENARIO_ID) {
        const rawSt = subTypeParam.replace(/-/g, '_')
        const validSub: MeetingNewPeopleScenarioOverrides['subType'] | undefined =
          rawSt === 'social_event' || rawSt === 'party' || rawSt === 'event'
            ? 'social_event'
            : rawSt === 'work_introduction' || rawSt === 'work' || rawSt === 'office'
              ? 'work_introduction'
              : rawSt === 'casual_meeting' || rawSt === 'casual' || rawSt === 'meetup'
                ? 'casual_meeting'
                : undefined
        const vf = variationParam.replace(/-/g, '_')
        const validVar: MeetingNewPeopleScenarioOverrides['variation'] | undefined =
          vf === 'introductions' || vf === 'intro' || vf === 'a'
            ? 'introductions'
            : vf === 'background' || vf === 'bg' || vf === 'b'
              ? 'background'
              : vf === 'follow_up_questions' || vf === 'followup' || vf === 'follow_up' || vf === 'c'
                ? 'follow_up_questions'
                : undefined
        return {
          ...(validSub ? { subType: validSub } : {}),
          ...(validVar ? { variation: validVar } : {}),
        }
      }
      if (scenarioId === PARTY_SOCIAL_SCENARIO_ID) {
        const rawSt = subTypeParam.replace(/-/g, '_')
        const validSub: PartySocialScenarioOverrides['subType'] | undefined =
          rawSt === 'house_party' || rawSt === 'house' || rawSt === 'home'
            ? 'house_party'
            : rawSt === 'networking_event' || rawSt === 'networking' || rawSt === 'network'
              ? 'networking_event'
              : rawSt === 'casual_gathering' || rawSt === 'casual' || rawSt === 'gathering'
                ? 'casual_gathering'
                : undefined
        const vf = variationParam.replace(/-/g, '_')
        const validVar: PartySocialScenarioOverrides['variation'] | undefined =
          vf === 'keeping_conversation_going' || vf === 'keeping' || vf === 'flow' || vf === 'a'
            ? 'keeping_conversation_going'
            : vf === 'asking_questions' || vf === 'asking' || vf === 'questions' || vf === 'b'
              ? 'asking_questions'
              : undefined
        return {
          ...(validSub ? { subType: validSub } : {}),
          ...(validVar ? { variation: validVar } : {}),
        }
      }
      if (scenarioId === STORYTELLING_SCENARIO_ID) {
        const rawSt = subTypeParam.replace(/-/g, '_')
        const validSub: StorytellingScenarioOverrides['subType'] | undefined =
          rawSt === 'daily_story' || rawSt === 'daily'
            ? 'daily_story'
            : rawSt === 'travel_story' || rawSt === 'travel'
              ? 'travel_story'
              : rawSt === 'personal_experience' || rawSt === 'personal' || rawSt === 'experience'
                ? 'personal_experience'
                : undefined
        const vf = variationParam.replace(/-/g, '_')
        const validVar: StorytellingScenarioOverrides['variation'] | undefined =
          vf === 'what_you_did_yesterday' || vf === 'yesterday' || vf === 'gisteren' || vf === 'a'
            ? 'what_you_did_yesterday'
            : vf === 'travel_story' || vf === 'travel' || vf === 'reis' || vf === 'b'
              ? 'travel_story'
              : undefined
        return {
          ...(validSub ? { subType: validSub } : {}),
          ...(validVar ? { variation: validVar } : {}),
        }
      }
      if (scenarioId === OPINIONS_DISCUSSIONS_SCENARIO_ID) {
        const rawSt = subTypeParam.replace(/-/g, '_')
        const validSub: OpinionsDiscussionsScenarioOverrides['subType'] | undefined =
          rawSt === 'casual_opinion' || rawSt === 'casual'
            ? 'casual_opinion'
            : rawSt === 'work_discussion' || rawSt === 'work' || rawSt === 'werk'
              ? 'work_discussion'
              : rawSt === 'social_debate' || rawSt === 'social' || rawSt === 'debate'
                ? 'social_debate'
                : undefined
        const vf = variationParam.replace(/-/g, '_')
        const validVar: OpinionsDiscussionsScenarioOverrides['variation'] | undefined =
          vf === 'agree_disagree' || vf === 'agree' || vf === 'eens' || vf === 'a'
            ? 'agree_disagree'
            : vf === 'give_reasons' || vf === 'reasons' || vf === 'redenen' || vf === 'b'
              ? 'give_reasons'
              : undefined
        return {
          ...(validSub ? { subType: validSub } : {}),
          ...(validVar ? { variation: validVar } : {}),
        }
      }
      if (scenarioId === EXPLAINING_SOMETHING_SCENARIO_ID) {
        const rawSt = subTypeParam.replace(/-/g, '_')
        const validSub: ExplainingSomethingScenarioOverrides['subType'] | undefined =
          rawSt === 'giving_instructions' || rawSt === 'instructions' || rawSt === 'instruct'
            ? 'giving_instructions'
            : rawSt === 'explaining_process' || rawSt === 'process'
              ? 'explaining_process'
              : rawSt === 'explaining_how_to' || rawSt === 'howto' || rawSt === 'how_to'
                ? 'explaining_how_to'
                : undefined
        const vf = variationParam.replace(/-/g, '_')
        const validVar: ExplainingSomethingScenarioOverrides['variation'] | undefined =
          vf === 'giving_instructions' || vf === 'instructions' || vf === 'a' || vf === 'steps'
            ? 'giving_instructions'
            : vf === 'describing_process' || vf === 'process' || vf === 'b' || vf === 'chronology'
              ? 'describing_process'
              : undefined
        return {
          ...(validSub ? { subType: validSub } : {}),
          ...(validVar ? { variation: validVar } : {}),
        }
      }
      if (scenarioId === PHONE_CALL_SCENARIO_ID) {
        const rawSt = subTypeParam.replace(/-/g, '_')
        const validSub: PhoneCallScenarioOverrides['subType'] | undefined =
          rawSt === 'appointment_call' || rawSt === 'appointment'
            ? 'appointment_call'
            : rawSt === 'service_call' || rawSt === 'service'
              ? 'service_call'
              : rawSt === 'information_call' || rawSt === 'information' || rawSt === 'info'
                ? 'information_call'
                : undefined
        const vf = variationParam.replace(/-/g, '_')
        const validVar: PhoneCallScenarioOverrides['variation'] | undefined =
          vf === 'starting_call' || vf === 'starting'
            ? 'starting_call'
            : vf === 'handling_call' || vf === 'handling'
              ? 'handling_call'
              : vf === 'repair_misunderstanding' || vf === 'repair' || vf === 'misunderstanding'
                ? 'repair_misunderstanding'
                : undefined
        const df = detailFocusParam.replace(/-/g, '_')
        const validDf = PHONE_CALL_TOPIC_OPTIONS.find((o) => o.id === df)?.id
        return {
          ...(validSub ? { subType: validSub } : {}),
          ...(validVar ? { variation: validVar } : {}),
          ...(validDf ? { detailFocus: validDf } : {}),
        }
      }
      return undefined
    },
    [scenarioId, subTypeParam, variationParam, destinationParam, detailFocusParam]
  ) as
    | BookingReservationsScenarioOverrides
    | DirectionsGettingSomewhereOverrides
    | DoctorPharmacyScenarioOverrides
    | OrderingFoodScenarioOverrides
    | StoreServiceIssueScenarioOverrides
    | WorkColleagueScenarioOverrides
    | HousingLandlordScenarioOverrides
    | PhoneCallScenarioOverrides
    | SmallTalkScenarioOverrides
    | MeetingNewPeopleScenarioOverrides
    | PartySocialScenarioOverrides
    | ExplainingSomethingScenarioOverrides
    | StorytellingScenarioOverrides
    | OpinionsDiscussionsScenarioOverrides
    | SupermarketShopScenarioOverrides
    | PublicTransportScenarioOverrides
    | undefined

  const orderingFoodOverridesOnly =
    scenarioId === ORDERING_FOOD_SCENARIO_ID
      ? (scenarioOverrides as OrderingFoodScenarioOverrides | undefined)
      : undefined
  const supermarketShopOverridesOnly =
    scenarioId === SUPERMARKET_SHOP_SCENARIO_ID
      ? (scenarioOverrides as SupermarketShopScenarioOverrides | undefined)
      : undefined
  const directionsOverridesOnly =
    scenarioId === DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID
      ? (scenarioOverrides as DirectionsGettingSomewhereOverrides | undefined)
      : undefined
  const publicTransportOverridesOnly =
    scenarioId === TRAIN_STATION_SCENARIO_ID
      ? (scenarioOverrides as PublicTransportScenarioOverrides | undefined)
      : undefined
  const bookingReservationsOverridesOnly =
    scenarioId === BOOKING_RESERVATIONS_SCENARIO_ID
      ? (scenarioOverrides as BookingReservationsScenarioOverrides | undefined)
      : undefined
  const doctorPharmacyOverridesOnly =
    scenarioId === DOCTOR_PHARMACY_SCENARIO_ID
      ? (scenarioOverrides as DoctorPharmacyScenarioOverrides | undefined)
      : undefined
  const storeServiceIssueOverridesOnly =
    scenarioId === STORE_SERVICE_ISSUE_SCENARIO_ID
      ? (scenarioOverrides as StoreServiceIssueScenarioOverrides | undefined)
      : undefined
  const workColleagueOverridesOnly =
    scenarioId === WORK_COLLEAGUE_INTERACTION_SCENARIO_ID
      ? (scenarioOverrides as WorkColleagueScenarioOverrides | undefined)
      : undefined
  const housingLandlordOverridesOnly =
    scenarioId === HOUSING_LANDLORD_SCENARIO_ID
      ? (scenarioOverrides as HousingLandlordScenarioOverrides | undefined)
      : undefined
  const phoneCallOverridesOnly =
    scenarioId === PHONE_CALL_SCENARIO_ID ? (scenarioOverrides as PhoneCallScenarioOverrides | undefined) : undefined
  const smallTalkOverridesOnly =
    scenarioId === SMALL_TALK_SCENARIO_ID ? (scenarioOverrides as SmallTalkScenarioOverrides | undefined) : undefined
  const meetingNewPeopleOverridesOnly =
    scenarioId === MEETING_NEW_PEOPLE_SCENARIO_ID
      ? (scenarioOverrides as MeetingNewPeopleScenarioOverrides | undefined)
      : undefined
  const partySocialOverridesOnly =
    scenarioId === PARTY_SOCIAL_SCENARIO_ID
      ? (scenarioOverrides as PartySocialScenarioOverrides | undefined)
      : undefined
  const explainingSomethingOverridesOnly =
    scenarioId === EXPLAINING_SOMETHING_SCENARIO_ID
      ? (scenarioOverrides as ExplainingSomethingScenarioOverrides | undefined)
      : undefined
  const storytellingOverridesOnly =
    scenarioId === STORYTELLING_SCENARIO_ID
      ? (scenarioOverrides as StorytellingScenarioOverrides | undefined)
      : undefined
  const opinionsDiscussionsOverridesOnly =
    scenarioId === OPINIONS_DISCUSSIONS_SCENARIO_ID
      ? (scenarioOverrides as OpinionsDiscussionsScenarioOverrides | undefined)
      : undefined

  const bookingReservationsUrlPinsHero = Boolean(
    bookingReservationsOverridesOnly?.subType || bookingReservationsOverridesOnly?.variation
  )
  const doctorPharmacyUrlPinsHero = Boolean(
    doctorPharmacyOverridesOnly?.subType || doctorPharmacyOverridesOnly?.variation
  )
  const storeServiceIssueUrlPinsHero = Boolean(
    storeServiceIssueOverridesOnly?.subType || storeServiceIssueOverridesOnly?.variation
  )
  const workColleagueUrlPinsHero = Boolean(
    workColleagueOverridesOnly?.subType || workColleagueOverridesOnly?.variation
  )
  const housingLandlordUrlPinsHero = Boolean(
    housingLandlordOverridesOnly?.subType ||
      housingLandlordOverridesOnly?.variation ||
      housingLandlordOverridesOnly?.detailFocus
  )
  const phoneCallUrlPinsHero = Boolean(phoneCallOverridesOnly?.subType || phoneCallOverridesOnly?.variation)
  const smallTalkUrlPinsHero = Boolean(smallTalkOverridesOnly?.subType || smallTalkOverridesOnly?.variation)
  const meetingNewPeopleUrlPinsHero = Boolean(
    meetingNewPeopleOverridesOnly?.subType || meetingNewPeopleOverridesOnly?.variation,
  )
  const partySocialUrlPinsHero = Boolean(
    partySocialOverridesOnly?.subType || partySocialOverridesOnly?.variation,
  )
  const explainingSomethingUrlPinsHero = Boolean(
    explainingSomethingOverridesOnly?.subType || explainingSomethingOverridesOnly?.variation,
  )
  const storytellingUrlPinsHero = Boolean(
    storytellingOverridesOnly?.subType || storytellingOverridesOnly?.variation,
  )
  const opinionsDiscussionsUrlPinsHero = Boolean(
    opinionsDiscussionsOverridesOnly?.subType || opinionsDiscussionsOverridesOnly?.variation,
  )

  const [toast, setToast] = useState<string | null>(null)
  const [bootstrap, setBootstrap] = useState<LiveSessionBootstrap | null>(null)
  const [sessionBootError, setSessionBootError] = useState<string | null>(null)
  const [restartingSession, setRestartingSession] = useState(false)
  const [endingCall, setEndingCall] = useState(false)
  const [lastTurnApiDebug, setLastTurnApiDebug] = useState<SpeakLiveTurnResponse['speakLiveDebug'] | null>(null)

  const orderingFoodVenue = useMemo(() => {
    if (scenarioId !== ORDERING_FOOD_SCENARIO_ID) return undefined
    return resolveOrderingFoodVenueForSession({
      subTypeFromUrl: orderingFoodOverridesOnly?.subType,
      scenarioContext: bootstrap?.scenarioContext,
    })
  }, [scenarioId, orderingFoodOverridesOnly?.subType, bootstrap?.scenarioContext])

  const orderingFoodBackdropSrc = useMemo(() => {
    if (scenarioId !== ORDERING_FOOD_SCENARIO_ID) return undefined
    return resolveOrderingFoodSpeakLiveBackdropSrc({
      subTypeFromUrl: orderingFoodOverridesOnly?.subType,
      scenarioContext: bootstrap?.scenarioContext,
    })
  }, [scenarioId, orderingFoodOverridesOnly?.subType, bootstrap?.scenarioContext])

  const supermarketShopSetting = useMemo(() => {
    if (scenarioId !== SUPERMARKET_SHOP_SCENARIO_ID) return undefined
    return resolveSupermarketShopSettingForSession({
      subTypeFromUrl: supermarketShopOverridesOnly?.subType,
      scenarioContext: bootstrap?.scenarioContext,
    })
  }, [scenarioId, supermarketShopOverridesOnly?.subType, bootstrap?.scenarioContext])

  const supermarketShopBackdropSrc = useMemo(() => {
    if (scenarioId !== SUPERMARKET_SHOP_SCENARIO_ID) return undefined
    return resolveSupermarketShopSpeakLiveBackdropSrc({
      subTypeFromUrl: supermarketShopOverridesOnly?.subType,
      variationFromUrl: supermarketShopOverridesOnly?.variation,
      scenarioContext: bootstrap?.scenarioContext,
    })
  }, [
    scenarioId,
    supermarketShopOverridesOnly?.subType,
    supermarketShopOverridesOnly?.variation,
    bootstrap?.scenarioContext,
  ])

  const directionsDestination = useMemo(() => {
    if (scenarioId !== DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID) return undefined
    return resolveDirectionsDestinationForSession({
      subTypeFromUrl: directionsOverridesOnly?.subType,
      scenarioContext: bootstrap?.scenarioContext,
    })
  }, [scenarioId, directionsOverridesOnly?.subType, bootstrap?.scenarioContext])

  const directionsBackdropSrc = useMemo(() => {
    if (scenarioId !== DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID) return undefined
    return resolveDirectionsSpeakLiveBackdropSrc({
      subTypeFromUrl: directionsOverridesOnly?.subType,
      variationFromUrl: directionsOverridesOnly?.variation,
      scenarioContext: bootstrap?.scenarioContext,
    })
  }, [
    scenarioId,
    directionsOverridesOnly?.subType,
    directionsOverridesOnly?.variation,
    bootstrap?.scenarioContext,
  ])

  const publicTransportSubtype = useMemo(() => {
    if (scenarioId !== TRAIN_STATION_SCENARIO_ID) return undefined
    return resolvePublicTransportSubtypeForSession({
      subTypeFromUrl: publicTransportOverridesOnly?.subType,
      scenarioContext: bootstrap?.scenarioContext,
    })
  }, [scenarioId, publicTransportOverridesOnly?.subType, bootstrap?.scenarioContext])

  const publicTransportBackdropSrc = useMemo(() => {
    if (scenarioId !== TRAIN_STATION_SCENARIO_ID) return undefined
    return resolvePublicTransportSpeakLiveBackdropSrc({
      subTypeFromUrl: publicTransportOverridesOnly?.subType,
      variationFromUrl: publicTransportOverridesOnly?.variation,
      scenarioContext: bootstrap?.scenarioContext,
    })
  }, [
    scenarioId,
    publicTransportOverridesOnly?.subType,
    publicTransportOverridesOnly?.variation,
    bootstrap?.scenarioContext,
  ])

  const bookingReservationsBackdropSrc = useMemo(() => {
    if (scenarioId !== BOOKING_RESERVATIONS_SCENARIO_ID) return undefined
    return resolveBookingReservationsSpeakLiveBackdropSrc({
      subTypeFromUrl: bookingReservationsOverridesOnly?.subType,
      variationFromUrl: bookingReservationsOverridesOnly?.variation,
      scenarioContext: bootstrap?.scenarioContext,
    })
  }, [
    scenarioId,
    bookingReservationsOverridesOnly?.subType,
    bookingReservationsOverridesOnly?.variation,
    bootstrap?.scenarioContext,
  ])

  const bookingReservationsSubtype = useMemo(() => {
    if (scenarioId !== BOOKING_RESERVATIONS_SCENARIO_ID) return undefined
    return resolveBookingReservationsSubtypeForSession({
      subTypeFromUrl: bookingReservationsOverridesOnly?.subType,
      scenarioContext: bootstrap?.scenarioContext,
    })
  }, [scenarioId, bookingReservationsOverridesOnly?.subType, bootstrap?.scenarioContext])

  const storeServiceIssueBackdropSrc = useMemo(() => {
    if (scenarioId !== STORE_SERVICE_ISSUE_SCENARIO_ID) return undefined
    return resolveStoreServiceIssueSpeakLiveBackdropSrc({
      subTypeFromUrl: storeServiceIssueOverridesOnly?.subType,
      variationFromUrl: storeServiceIssueOverridesOnly?.variation,
      scenarioContext: bootstrap?.scenarioContext,
      assistantPresentation: bootstrap?.speakLive?.assistantPresentation ?? 'female',
    })
  }, [
    scenarioId,
    storeServiceIssueOverridesOnly?.subType,
    storeServiceIssueOverridesOnly?.variation,
    bootstrap?.scenarioContext,
    bootstrap?.speakLive?.assistantPresentation,
  ])

  const storeServiceIssueSubtype = useMemo(() => {
    if (scenarioId !== STORE_SERVICE_ISSUE_SCENARIO_ID) return undefined
    return resolveStoreServiceIssueSubtypeForSession({
      subTypeFromUrl: storeServiceIssueOverridesOnly?.subType,
      scenarioContext: bootstrap?.scenarioContext,
    })
  }, [scenarioId, storeServiceIssueOverridesOnly?.subType, bootstrap?.scenarioContext])

  const workColleagueBackdropSrc = useMemo(() => {
    if (scenarioId !== WORK_COLLEAGUE_INTERACTION_SCENARIO_ID) return undefined
    return resolveWorkColleagueSpeakLiveBackdropSrc({
      subTypeFromUrl: workColleagueOverridesOnly?.subType,
      variationFromUrl: workColleagueOverridesOnly?.variation,
      scenarioContext: bootstrap?.scenarioContext,
      assistantPresentation: bootstrap?.speakLive?.assistantPresentation ?? 'female',
    })
  }, [
    scenarioId,
    workColleagueOverridesOnly?.subType,
    workColleagueOverridesOnly?.variation,
    bootstrap?.scenarioContext,
    bootstrap?.speakLive?.assistantPresentation,
  ])

  const workColleagueSubtype = useMemo(() => {
    if (scenarioId !== WORK_COLLEAGUE_INTERACTION_SCENARIO_ID) return undefined
    return resolveWorkColleagueSubtypeForSession({
      subTypeFromUrl: workColleagueOverridesOnly?.subType,
      scenarioContext: bootstrap?.scenarioContext,
    })
  }, [scenarioId, workColleagueOverridesOnly?.subType, bootstrap?.scenarioContext])

  const housingLandlordBackdropSrc = useMemo(() => {
    if (scenarioId !== HOUSING_LANDLORD_SCENARIO_ID) return undefined
    return resolveHousingLandlordSpeakLiveBackdropSrc({
      subTypeFromUrl: housingLandlordOverridesOnly?.subType,
      variationFromUrl: housingLandlordOverridesOnly?.variation,
      detailFocusFromUrl: housingLandlordOverridesOnly?.detailFocus,
      scenarioContext: bootstrap?.scenarioContext,
      assistantPresentation: bootstrap?.speakLive?.assistantPresentation ?? 'female',
    })
  }, [
    scenarioId,
    housingLandlordOverridesOnly?.subType,
    housingLandlordOverridesOnly?.variation,
    housingLandlordOverridesOnly?.detailFocus,
    bootstrap?.scenarioContext,
    bootstrap?.speakLive?.assistantPresentation,
  ])

  const housingLandlordSubtype = useMemo(() => {
    if (scenarioId !== HOUSING_LANDLORD_SCENARIO_ID) return undefined
    return resolveHousingLandlordSubtypeForSession({
      subTypeFromUrl: housingLandlordOverridesOnly?.subType,
      scenarioContext: bootstrap?.scenarioContext,
    })
  }, [scenarioId, housingLandlordOverridesOnly?.subType, bootstrap?.scenarioContext])

  const phoneCallBackdropSrc = useMemo(() => {
    if (scenarioId !== PHONE_CALL_SCENARIO_ID) return undefined
    return resolvePhoneCallSpeakLiveBackdropSrc({
      subTypeFromUrl: phoneCallOverridesOnly?.subType,
      variationFromUrl: phoneCallOverridesOnly?.variation,
      scenarioContext: bootstrap?.scenarioContext,
      assistantPresentation: bootstrap?.speakLive?.assistantPresentation ?? 'female',
    })
  }, [
    scenarioId,
    phoneCallOverridesOnly?.subType,
    phoneCallOverridesOnly?.variation,
    bootstrap?.scenarioContext,
    bootstrap?.speakLive?.assistantPresentation,
  ])

  const phoneCallSubtype = useMemo(() => {
    if (scenarioId !== PHONE_CALL_SCENARIO_ID) return undefined
    return resolvePhoneCallSubtypeForSession({
      subTypeFromUrl: phoneCallOverridesOnly?.subType,
      scenarioContext: bootstrap?.scenarioContext,
    })
  }, [scenarioId, phoneCallOverridesOnly?.subType, bootstrap?.scenarioContext])

  const smallTalkVariationResolved = useMemo(() => {
    if (scenarioId !== SMALL_TALK_SCENARIO_ID) return undefined
    return (
      smallTalkOverridesOnly?.variation ??
      inferSmallTalkVariationFromScenarioContext(bootstrap?.scenarioContext) ??
      'talking_about_weekend'
    )
  }, [scenarioId, smallTalkOverridesOnly?.variation, bootstrap?.scenarioContext])

  const smallTalkBackdropSrc = useMemo(() => {
    if (scenarioId !== SMALL_TALK_SCENARIO_ID) return undefined
    return resolveSmallTalkSpeakLiveBackdropSrc({
      variationFromUrl: smallTalkOverridesOnly?.variation,
      scenarioContext: bootstrap?.scenarioContext,
      assistantPresentation: bootstrap?.speakLive?.assistantPresentation ?? 'female',
    })
  }, [
    scenarioId,
    smallTalkOverridesOnly?.variation,
    bootstrap?.scenarioContext,
    bootstrap?.speakLive?.assistantPresentation,
  ])

  const meetingNewPeopleVariationResolved = useMemo(() => {
    if (scenarioId !== MEETING_NEW_PEOPLE_SCENARIO_ID) return undefined
    return (
      meetingNewPeopleOverridesOnly?.variation ??
      inferMeetingNewPeopleVariationFromScenarioContext(bootstrap?.scenarioContext) ??
      'introductions'
    )
  }, [scenarioId, meetingNewPeopleOverridesOnly?.variation, bootstrap?.scenarioContext])

  const meetingNewPeopleBackdropSrc = useMemo(() => {
    if (scenarioId !== MEETING_NEW_PEOPLE_SCENARIO_ID) return undefined
    return resolveMeetingNewPeopleSpeakLiveBackdropSrc({
      variationFromUrl: meetingNewPeopleOverridesOnly?.variation,
      scenarioContext: bootstrap?.scenarioContext,
      assistantPresentation: bootstrap?.speakLive?.assistantPresentation ?? 'female',
    })
  }, [
    scenarioId,
    meetingNewPeopleOverridesOnly?.variation,
    bootstrap?.scenarioContext,
    bootstrap?.speakLive?.assistantPresentation,
  ])

  const partySocialVariationResolved = useMemo(() => {
    if (scenarioId !== PARTY_SOCIAL_SCENARIO_ID) return undefined
    return (
      partySocialOverridesOnly?.variation ??
      inferPartySocialVariationFromScenarioContext(bootstrap?.scenarioContext) ??
      'keeping_conversation_going'
    )
  }, [scenarioId, partySocialOverridesOnly?.variation, bootstrap?.scenarioContext])

  const partySocialBackdropSrc = useMemo(() => {
    if (scenarioId !== PARTY_SOCIAL_SCENARIO_ID) return undefined
    return resolvePartySocialSpeakLiveBackdropSrc({
      variationFromUrl: partySocialOverridesOnly?.variation,
      scenarioContext: bootstrap?.scenarioContext,
      assistantPresentation: bootstrap?.speakLive?.assistantPresentation ?? 'female',
    })
  }, [
    scenarioId,
    partySocialOverridesOnly?.variation,
    bootstrap?.scenarioContext,
    bootstrap?.speakLive?.assistantPresentation,
  ])

  const explainingSomethingVariationResolved = useMemo(() => {
    if (scenarioId !== EXPLAINING_SOMETHING_SCENARIO_ID) return undefined
    return (
      explainingSomethingOverridesOnly?.variation ??
      inferExplainingSomethingVariationFromScenarioContext(bootstrap?.scenarioContext) ??
      'giving_instructions'
    )
  }, [scenarioId, explainingSomethingOverridesOnly?.variation, bootstrap?.scenarioContext])

  const explainingSomethingBackdropSrc = useMemo(() => {
    if (scenarioId !== EXPLAINING_SOMETHING_SCENARIO_ID) return undefined
    return resolveExplainingSomethingSpeakLiveBackdropSrc({
      variationFromUrl: explainingSomethingOverridesOnly?.variation,
      scenarioContext: bootstrap?.scenarioContext,
      assistantPresentation: bootstrap?.speakLive?.assistantPresentation ?? 'female',
    })
  }, [
    scenarioId,
    explainingSomethingOverridesOnly?.variation,
    bootstrap?.scenarioContext,
    bootstrap?.speakLive?.assistantPresentation,
  ])

  const storytellingVariationResolved = useMemo(() => {
    if (scenarioId !== STORYTELLING_SCENARIO_ID) return undefined
    return (
      storytellingOverridesOnly?.variation ??
      inferStorytellingVariationFromScenarioContext(bootstrap?.scenarioContext) ??
      'what_you_did_yesterday'
    )
  }, [scenarioId, storytellingOverridesOnly?.variation, bootstrap?.scenarioContext])

  const storytellingBackdropSrc = useMemo(() => {
    if (scenarioId !== STORYTELLING_SCENARIO_ID) return undefined
    return resolveStorytellingSpeakLiveBackdropSrc({
      variationFromUrl: storytellingOverridesOnly?.variation,
      scenarioContext: bootstrap?.scenarioContext,
      assistantPresentation: bootstrap?.speakLive?.assistantPresentation ?? 'female',
    })
  }, [
    scenarioId,
    storytellingOverridesOnly?.variation,
    bootstrap?.scenarioContext,
    bootstrap?.speakLive?.assistantPresentation,
  ])

  const opinionsDiscussionsVariationResolved = useMemo(() => {
    if (scenarioId !== OPINIONS_DISCUSSIONS_SCENARIO_ID) return undefined
    return (
      opinionsDiscussionsOverridesOnly?.variation ??
      inferOpinionsDiscussionsVariationFromScenarioContext(bootstrap?.scenarioContext) ??
      'agree_disagree'
    )
  }, [scenarioId, opinionsDiscussionsOverridesOnly?.variation, bootstrap?.scenarioContext])

  const opinionsDiscussionsBackdropSrc = useMemo(() => {
    if (scenarioId !== OPINIONS_DISCUSSIONS_SCENARIO_ID) return undefined
    return resolveOpinionsDiscussionsSpeakLiveBackdropSrc({
      variationFromUrl: opinionsDiscussionsOverridesOnly?.variation,
      scenarioContext: bootstrap?.scenarioContext,
      assistantPresentation: bootstrap?.speakLive?.assistantPresentation ?? 'female',
    })
  }, [
    scenarioId,
    opinionsDiscussionsOverridesOnly?.variation,
    bootstrap?.scenarioContext,
    bootstrap?.speakLive?.assistantPresentation,
  ])

  const doctorPharmacyBackdropSrc = useMemo(() => {
    if (scenarioId !== DOCTOR_PHARMACY_SCENARIO_ID) return undefined
    return resolveDoctorPharmacySpeakLiveBackdropSrc({
      subTypeFromUrl: doctorPharmacyOverridesOnly?.subType,
      variationFromUrl: doctorPharmacyOverridesOnly?.variation,
      scenarioContext: bootstrap?.scenarioContext,
      assistantPresentation: bootstrap?.speakLive?.assistantPresentation ?? 'female',
    })
  }, [
    scenarioId,
    doctorPharmacyOverridesOnly?.subType,
    doctorPharmacyOverridesOnly?.variation,
    bootstrap?.scenarioContext,
    bootstrap?.speakLive?.assistantPresentation,
  ])

  const doctorPharmacySubtype = useMemo(() => {
    if (scenarioId !== DOCTOR_PHARMACY_SCENARIO_ID) return undefined
    return resolveDoctorPharmacySubtypeForSession({
      subTypeFromUrl: doctorPharmacyOverridesOnly?.subType,
      scenarioContext: bootstrap?.scenarioContext,
    })
  }, [scenarioId, doctorPharmacyOverridesOnly?.subType, bootstrap?.scenarioContext])

  const scenarioTitle = useMemo(() => {
    if (scenarioId === LANGUAGE_COACH_SCENARIO_ID) return 'Language Coach'
    if (scenarioId === ORDERING_FOOD_SCENARIO_ID) return 'Ordering food / drinks'
    if (scenarioId === SUPERMARKET_SHOP_SCENARIO_ID) return 'Supermarket / shop'
    if (scenarioId === BOOKING_RESERVATIONS_SCENARIO_ID) return 'Booking / reservations'
    if (scenarioId === STORE_SERVICE_ISSUE_SCENARIO_ID) return 'Store / service issue'
    if (scenarioId === WORK_COLLEAGUE_INTERACTION_SCENARIO_ID) return 'Work / colleague interaction'
    if (scenarioId === HOUSING_LANDLORD_SCENARIO_ID) return 'Housing / landlord'
    if (scenarioId === DOCTOR_PHARMACY_SCENARIO_ID) return 'Doctor / pharmacy'
    if (scenarioId === PHONE_CALL_SCENARIO_ID) return 'Phone call'
    if (scenarioId === SMALL_TALK_SCENARIO_ID) return 'Small talk'
    if (scenarioId === MEETING_NEW_PEOPLE_SCENARIO_ID) return 'Meeting new people'
    if (scenarioId === PARTY_SOCIAL_SCENARIO_ID) return 'At a party / social setting'
    if (scenarioId === EXPLAINING_SOMETHING_SCENARIO_ID) return 'Explaining something'
    if (scenarioId === STORYTELLING_SCENARIO_ID) return 'Storytelling'
    if (scenarioId === OPINIONS_DISCUSSIONS_SCENARIO_ID) return 'Opinions & discussions'
    if (scenarioId === DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID) return 'Directions / getting somewhere'
    if (scenarioId === TRAIN_STATION_SCENARIO_ID) return 'Public transport'
    if (scenarioId.toLowerCase().includes('cafe')) return 'Café'
    if (scenarioId.toLowerCase().includes('train')) return 'Public transport'
    return 'Speak Live'
  }, [scenarioId])

  const scenarioSubtitle = useMemo(() => {
    if (scenarioId === LANGUAGE_COACH_SCENARIO_ID) {
      const goalLine = LANGUAGE_COACH_GOAL_LABELS[lcGoal] ?? 'General conversation'
      return `${goalLine} · ${level} · Adaptive Dutch coach`
    }
    return (
      bootstrap?.learnerSituationSummary?.trim() ||
      bootstrap?.scenarioDescription?.trim() ||
      bootstrap?.scenarioContext?.trim() ||
      `${level} · Live voice`
    )
  }, [
    scenarioId,
    lcGoal,
    bootstrap?.learnerSituationSummary,
    bootstrap?.scenarioDescription,
    bootstrap?.scenarioContext,
    level,
  ])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    playAppSound('tap')
    window.setTimeout(() => setToast(null), 2800)
  }, [])

  const exitToTalk = useCallback(() => {
    router.push(APP_TALK_HUB)
  }, [router])

  const backend = isFeature1ChatBackendEnabled()
  const devMock = isSpeakLiveDevUiMockEnabled()

  useEffect(() => {
    if (!backend) return
    const ac = new AbortController()
    void (async () => {
      setSessionBootError(null)
      if (resumeThreadId) {
        try {
          let conv = await conversationClient.getConversation(resumeThreadId, { signal: ac.signal })
          if (ac.signal.aborted) return
          if (conv.thread.conversationSurface !== 'speak_live') {
            setSessionBootError('This thread is not a Speak Live session.')
            return
          }
          if (conv.thread.status === 'paused') {
            await conversationClient.resumeConversation(resumeThreadId)
            conv = await conversationClient.getConversation(resumeThreadId, { signal: ac.signal })
          }
          if (ac.signal.aborted) return
          setBootstrap({
            threadId: conv.thread.id,
            messages: conv.messages,
            personaDisplayName: conv.persona?.displayName ?? null,
            scenarioContext: conv.scenario?.runtimeConfig?.context ?? conv.scenario?.description ?? null,
            scenarioDescription: conv.scenario?.description ?? null,
            learnerSituationSummary: conv.scenario?.runtimeConfig?.learnerSituationSummary ?? null,
            speakLive: conv.speakLive ?? null,
          })
        } catch {
          if (!ac.signal.aborted) setSessionBootError('Could not resume this Speak Live session. Try starting a new one.')
        }
        return
      }
      try {
        const res = await conversationClient.startConversation(
          {
            scenarioId,
            feedbackMode: speakLiveFeedbackMode,
            conversationSurface: 'speak_live',
            cefrLevel: level,
            ...(scenarioOverrides && Object.keys(scenarioOverrides).length > 0 ? { scenarioOverrides } : {}),
            ...(languageCoachStartBody ? { languageCoach: languageCoachStartBody } : {}),
          },
          { signal: ac.signal }
        )
        if (!ac.signal.aborted) {
          setBootstrap({
            threadId: res.thread.id,
            messages: res.messages,
            personaDisplayName: res.persona?.displayName ?? null,
            scenarioContext: res.scenario?.runtimeConfig?.context ?? res.scenario?.description ?? null,
            scenarioDescription: res.scenario?.description ?? null,
            learnerSituationSummary: res.scenario?.runtimeConfig?.learnerSituationSummary ?? null,
            speakLive: res.speakLive ?? null,
          })
        }
      } catch (err) {
        if (ac.signal.aborted) return
        if (err instanceof ApiRequestError) {
          if (err.status === 404 && (err.code === 'NOT_FOUND' || /scenario not found/i.test(err.message))) {
            setSessionBootError(
              `${err.message} Run SQL seeds under backend/database/seed/ (002, 003) or apply migrations 010 (ordering food) / 012 (supermarket_shop) / 014 (directions) / 016 (booking_reservations) / 017 (doctor_pharmacy) / 018 (store_service_issue) / 019 (work_colleague_interaction) / 020 (housing_landlord), then retry.`
            )
            return
          }
          if (err.status === 404) {
            setSessionBootError(
              `Speak Live API returned 404. Confirm the Functions host is running (e.g. npm start in backend/) and NEXT_PUBLIC_API_BASE_URL is the host only (${getApiBaseUrl() || 'http://localhost:7071'} — not …/api).`
            )
            return
          }
          setSessionBootError(err.message || 'Could not start Speak Live session.')
          return
        }
        setSessionBootError('Could not start Speak Live session. Check your connection and API URL.')
      }
    })()
    return () => ac.abort()
  }, [
    scenarioId,
    level,
    backend,
    resumeThreadId,
    scenarioOverrides,
    speakLiveFeedbackMode,
    languageCoachStartBody,
  ])

  const recapHref = useMemo(() => {
    const q = new URLSearchParams({ scenarioId, level })
    if (bootstrap?.threadId && backend) {
      return `${appSpeakLiveThreadRecap(bootstrap.threadId)}?${q.toString()}`
    }
    return `${APP_TALK_HUB}?speakLiveSummary=1`
  }, [bootstrap?.threadId, scenarioId, level, backend])

  const handleEndCall = useCallback(async () => {
    if (!backend || !bootstrap?.threadId) {
      exitToTalk()
      return
    }
    setEndingCall(true)
    try {
      const res = await conversationClient.endConversation(bootstrap.threadId)
      clearResumableLiveSession()
      qc.setQueryData(['speakLive', 'recap', bootstrap.threadId], {
        model: mapApiSummaryToRecapView(res.summary),
        scenarioTitle,
        speakLiveRecapDebug: res.speakLiveRecapDebug ?? null,
      })
      void conversationClient.runLiveSessionEvaluation(bootstrap.threadId).catch(() => {
        /* Evaluation page will POST /evaluation/run on load if still pending */
      })
      const q = new URLSearchParams({ scenarioId, level })
      router.push(`${appSpeakLiveSessionEvaluation(bootstrap.threadId)}?${q.toString()}`)
    } catch {
      setEndingCall(false)
      showToast('Could not end this session. Check your connection and try again.')
    }
  }, [exitToTalk, qc, router, scenarioId, level, bootstrap?.threadId, scenarioTitle, showToast, backend])

  const handleRestartScenario = useCallback(async () => {
    if (!backend) return
    const oldThreadId = bootstrap?.threadId
    if (!oldThreadId) return
    setRestartingSession(true)
    setSessionBootError(null)
    try {
      await conversationClient.pauseConversation(oldThreadId).catch(() => {
        /* still try a fresh thread */
      })
      clearResumableLiveSession()
      setBootstrap(null)
      const res = await conversationClient.startConversation({
        scenarioId,
        feedbackMode: speakLiveFeedbackMode,
        conversationSurface: 'speak_live',
        cefrLevel: level,
        ...(scenarioOverrides && Object.keys(scenarioOverrides).length > 0 ? { scenarioOverrides } : {}),
        ...(languageCoachStartBody ? { languageCoach: languageCoachStartBody } : {}),
      })
      setBootstrap({
        threadId: res.thread.id,
        messages: res.messages,
        personaDisplayName: res.persona?.displayName ?? null,
        scenarioContext: res.scenario?.runtimeConfig?.context ?? res.scenario?.description ?? null,
        scenarioDescription: res.scenario?.description ?? null,
        learnerSituationSummary: res.scenario?.runtimeConfig?.learnerSituationSummary ?? null,
        speakLive: res.speakLive ?? null,
      })
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setSessionBootError(err.message || 'Could not restart this Speak Live session.')
      } else {
        setSessionBootError('Could not restart this Speak Live session. Check your connection and API URL.')
      }
    } finally {
      setRestartingSession(false)
    }
  }, [
    backend,
    bootstrap?.threadId,
    scenarioId,
    level,
    scenarioOverrides,
    speakLiveFeedbackMode,
    languageCoachStartBody,
  ])

  const handleSaveAndExitLater = useCallback(async () => {
    if (!bootstrap?.threadId) {
      exitToTalk()
      return
    }
    try {
      await conversationClient.pauseConversation(bootstrap.threadId)
    } catch {
      /* still offer local resume */
    }
    writeResumableLiveSession({
      threadId: bootstrap.threadId,
      scenarioId,
      level,
      scenarioTitle,
      savedAt: new Date().toISOString(),
    })
    router.push(APP_TALK_HUB)
  }, [bootstrap?.threadId, scenarioId, level, scenarioTitle, router, exitToTalk])

  const saveSession = useCallback(() => {
    const row: SavedSession = {
      savedAt: new Date().toISOString(),
      scenarioId,
      level,
      note: 'Speak Live session',
    }
    writeSaved([row, ...readSaved()])
    showToast('Session saved on this device')
  }, [scenarioId, level, showToast])

  if (!backend && !devMock) {
    return <SpeakLiveBackendRequiredScreen onBack={exitToTalk} />
  }

  if (!backend && devMock) {
    return (
      <>
        <SpeakLiveCallScreen
          scenarioTitle={scenarioTitle}
          scenarioId={scenarioId}
          modeLabel="Dev mock"
          levelLabel={level}
          onExit={exitToTalk}
          onSaveSession={saveSession}
          summaryHref={recapHref}
        />
        {toast ? (
          <div
            className="fixed top-[max(5rem,env(safe-area-inset-top)+4rem)] left-1/2 -translate-x-1/2 z-[60] rounded-full bg-emerald-600 text-white text-caption font-semibold px-4 py-2 shadow-lg"
            role="status"
          >
            {toast}
          </div>
        ) : null}
      </>
    )
  }

  return (
    <>
      {sessionBootError ? (
        <div className="fixed top-[max(5rem,env(safe-area-inset-top)+4rem)] left-1/2 -translate-x-1/2 z-[60] max-w-sm rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-caption px-4 py-3 shadow-elevated text-center">
          {sessionBootError}
        </div>
      ) : null}
      {bootstrap ? (
        <LiveConversationScreen
          bootstrap={bootstrap}
          scenarioTitle={scenarioTitle}
          scenarioSubtitle={scenarioSubtitle}
          scenarioId={scenarioId}
          interactionUi={interactionUi}
          levelLabel={level}
          languageCoachUi={
            scenarioId === LANGUAGE_COACH_SCENARIO_ID
              ? {
                  coachDisplayName: bootstrap.personaDisplayName?.trim() || 'Your coach',
                  goalShortLabel: LANGUAGE_COACH_GOAL_LABELS[lcGoal] ?? 'General conversation',
                  focusPracticeHint:
                    lcGoal === 'follow_up_questions'
                      ? 'Coach is helping you practice follow-up questions.'
                      : null,
                  roleShortLabel: LANGUAGE_COACH_ROLE_CARDS.find((c) => c.id === lcRole)?.title ?? 'Coach',
                  isCoachRole: lcRole === 'coach',
                  liveGuideActive: lcRole === 'coach' && lcGuideOn,
                }
              : undefined
          }
          onExitTalk={exitToTalk}
          onSaveAndExitLater={handleSaveAndExitLater}
          onEndSessionEvaluate={handleEndCall}
          isEndingCall={endingCall}
          onRestartScenario={handleRestartScenario}
          onTurnDebug={(d) => setLastTurnApiDebug(d ?? null)}
          orderingFoodBackdropSrc={orderingFoodBackdropSrc}
          orderingFoodVenue={orderingFoodVenue}
          supermarketShopBackdropSrc={supermarketShopBackdropSrc}
          supermarketShopSetting={supermarketShopSetting}
          directionsBackdropSrc={directionsBackdropSrc}
          directionsDestination={directionsDestination}
          publicTransportBackdropSrc={publicTransportBackdropSrc}
          publicTransportSubtype={publicTransportSubtype}
          bookingReservationsBackdropSrc={bookingReservationsBackdropSrc}
          bookingReservationsHeroCopy={
            scenarioId === BOOKING_RESERVATIONS_SCENARIO_ID && !bookingReservationsUrlPinsHero
              ? BOOKING_RESERVATIONS_SMART_MIX_CARD_COPY
              : undefined
          }
          bookingReservationsSubtype={bookingReservationsSubtype}
          storeServiceIssueBackdropSrc={storeServiceIssueBackdropSrc}
          storeServiceIssueHeroCopy={
            scenarioId === STORE_SERVICE_ISSUE_SCENARIO_ID && !storeServiceIssueUrlPinsHero
              ? STORE_SERVICE_ISSUE_SMART_MIX_CARD_COPY
              : undefined
          }
          storeServiceIssueSubtype={storeServiceIssueSubtype}
          doctorPharmacyBackdropSrc={doctorPharmacyBackdropSrc}
          doctorPharmacyHeroCopy={
            scenarioId === DOCTOR_PHARMACY_SCENARIO_ID && !doctorPharmacyUrlPinsHero
              ? DOCTOR_PHARMACY_SMART_MIX_CARD_COPY
              : undefined
          }
          doctorPharmacySubtype={doctorPharmacySubtype}
          workColleagueBackdropSrc={workColleagueBackdropSrc}
          workColleagueHeroCopy={
            scenarioId === WORK_COLLEAGUE_INTERACTION_SCENARIO_ID && !workColleagueUrlPinsHero
              ? WORK_COLLEAGUE_SMART_MIX_CARD_COPY
              : undefined
          }
          workColleagueSubtype={workColleagueSubtype}
          housingLandlordBackdropSrc={housingLandlordBackdropSrc}
          housingLandlordHeroCopy={
            scenarioId === HOUSING_LANDLORD_SCENARIO_ID && !housingLandlordUrlPinsHero
              ? HOUSING_LANDLORD_SMART_MIX_CARD_COPY
              : undefined
          }
          housingLandlordSubtype={housingLandlordSubtype}
          phoneCallBackdropSrc={phoneCallBackdropSrc}
          phoneCallHeroCopy={
            scenarioId === PHONE_CALL_SCENARIO_ID && !phoneCallUrlPinsHero
              ? PHONE_CALL_SMART_MIX_CARD_COPY
              : scenarioId === PHONE_CALL_SCENARIO_ID && phoneCallSubtype
                ? PHONE_CALL_LIVE_CARD_COPY[phoneCallSubtype]
                : undefined
          }
          smallTalkBackdropSrc={smallTalkBackdropSrc}
          smallTalkHeroCopy={
            scenarioId === SMALL_TALK_SCENARIO_ID && smallTalkVariationResolved
              ? smallTalkUrlPinsHero
                ? SMALL_TALK_LIVE_CARD_COPY[smallTalkVariationResolved]
                : bootstrap?.scenarioContext?.trim()
                  ? SMALL_TALK_LIVE_CARD_COPY[smallTalkVariationResolved]
                  : SMALL_TALK_SMART_MIX_CARD_COPY
              : undefined
          }
          meetingNewPeopleBackdropSrc={meetingNewPeopleBackdropSrc}
          meetingNewPeopleHeroCopy={
            scenarioId === MEETING_NEW_PEOPLE_SCENARIO_ID && meetingNewPeopleVariationResolved
              ? meetingNewPeopleUrlPinsHero
                ? MEETING_NEW_PEOPLE_LIVE_CARD_COPY[meetingNewPeopleVariationResolved]
                : bootstrap?.scenarioContext?.trim()
                  ? MEETING_NEW_PEOPLE_LIVE_CARD_COPY[meetingNewPeopleVariationResolved]
                  : MEETING_NEW_PEOPLE_SMART_MIX_CARD_COPY
              : undefined
          }
          partySocialBackdropSrc={partySocialBackdropSrc}
          partySocialHeroCopy={
            scenarioId === PARTY_SOCIAL_SCENARIO_ID && partySocialVariationResolved
              ? partySocialUrlPinsHero
                ? PARTY_SOCIAL_LIVE_CARD_COPY[partySocialVariationResolved]
                : bootstrap?.scenarioContext?.trim()
                  ? PARTY_SOCIAL_LIVE_CARD_COPY[partySocialVariationResolved]
                  : PARTY_SOCIAL_SMART_MIX_CARD_COPY
              : undefined
          }
          explainingSomethingBackdropSrc={explainingSomethingBackdropSrc}
          explainingSomethingHeroCopy={
            scenarioId === EXPLAINING_SOMETHING_SCENARIO_ID && explainingSomethingVariationResolved
              ? explainingSomethingUrlPinsHero
                ? EXPLAINING_SOMETHING_LIVE_CARD_COPY[explainingSomethingVariationResolved]
                : bootstrap?.scenarioContext?.trim()
                  ? EXPLAINING_SOMETHING_LIVE_CARD_COPY[explainingSomethingVariationResolved]
                  : EXPLAINING_SOMETHING_SMART_MIX_CARD_COPY
              : undefined
          }
          storytellingBackdropSrc={storytellingBackdropSrc}
          storytellingHeroCopy={
            scenarioId === STORYTELLING_SCENARIO_ID && storytellingVariationResolved
              ? storytellingUrlPinsHero
                ? STORYTELLING_LIVE_CARD_COPY[storytellingVariationResolved]
                : bootstrap?.scenarioContext?.trim()
                  ? STORYTELLING_LIVE_CARD_COPY[storytellingVariationResolved]
                  : STORYTELLING_SMART_MIX_CARD_COPY
              : undefined
          }
          opinionsDiscussionsBackdropSrc={opinionsDiscussionsBackdropSrc}
          opinionsDiscussionsHeroCopy={
            scenarioId === OPINIONS_DISCUSSIONS_SCENARIO_ID && opinionsDiscussionsVariationResolved
              ? opinionsDiscussionsUrlPinsHero
                ? OPINIONS_DISCUSSIONS_LIVE_CARD_COPY[opinionsDiscussionsVariationResolved]
                : bootstrap?.scenarioContext?.trim()
                  ? OPINIONS_DISCUSSIONS_LIVE_CARD_COPY[opinionsDiscussionsVariationResolved]
                  : OPINIONS_DISCUSSIONS_SMART_MIX_CARD_COPY
              : undefined
          }
        />
      ) : (
        <div className="min-h-[100dvh] bg-surface text-ink-primary flex flex-col items-center justify-center gap-3">
          <div className="h-9 w-9 rounded-full border-2 border-emerald-200 border-t-primary-500 motion-safe:animate-spin" />
          <p className="text-caption text-ink-secondary">
            {restartingSession
              ? scenarioId === LANGUAGE_COACH_SCENARIO_ID
                ? 'Starting a fresh coach session…'
                : 'Restarting scenario…'
              : resumeThreadId
                ? 'Resuming Speak Live…'
                : scenarioId === LANGUAGE_COACH_SCENARIO_ID
                  ? 'Connecting to your coach…'
                  : 'Starting live session…'}
          </p>
        </div>
      )}
      <SpeakLiveTrainDebugPanel
        scenarioId={scenarioId}
        threadId={bootstrap?.threadId ?? null}
        lastTurnApiDebug={lastTurnApiDebug}
      />
      {toast ? (
        <div
          className="fixed top-[max(5rem,env(safe-area-inset-top)+4rem)] left-1/2 -translate-x-1/2 z-[60] rounded-full bg-emerald-600 text-white text-caption font-semibold px-4 py-2 shadow-lg"
          role="status"
        >
          {toast}
        </div>
      ) : null}
    </>
  )
}
