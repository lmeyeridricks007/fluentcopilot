'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ArrowRight, BookOpen, MessageCircle, Mic, Sparkles } from 'lucide-react'
import { playAppSound } from '@/lib/interaction/appSounds'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import {
  DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID,
  getComingSoonScenarios,
  getDefaultLiveScenario,
  getSpeakLiveLaunchHref,
  BOOKING_RESERVATIONS_SCENARIO_ID,
  BOOKING_RESERVATIONS_VARIATION_OPTIONS,
  DOCTOR_PHARMACY_SCENARIO_ID,
  DOCTOR_PHARMACY_LAUNCHER_FOCUS_OPTIONS,
  getBookingReservationsSpeakLiveHeroAlt,
  getBookingReservationsSpeakLiveHeroSrc,
  getDoctorPharmacySpeakLiveHeroAlt,
  getDoctorPharmacySpeakLiveHeroSrc,
  getSpeakLiveCatalogItem,
  getLiveScenarios,
  getOrderingFoodSpeakLiveHeroAlt,
  getOrderingFoodSpeakLiveHeroSrc,
  getStoreServiceIssueSpeakLiveHeroAlt,
  getStoreServiceIssueSpeakLiveHeroSrc,
  getSupermarketShopSpeakLiveHeroAlt,
  getSupermarketShopSpeakLiveHeroSrc,
  isSpeakLiveLaunchableItem,
  ORDERING_FOOD_SCENARIO_ID,
  resolvePublicTransportSpeakLiveVisual,
  SPEAK_LIVE_LEVELS,
  STORE_SERVICE_ISSUE_SCENARIO_ID,
  STORE_SERVICE_ISSUE_VARIATION_OPTIONS,
  WORK_COLLEAGUE_INTERACTION_SCENARIO_ID,
  WORK_COLLEAGUE_VARIATION_OPTIONS,
  HOUSING_LANDLORD_SCENARIO_ID,
  HOUSING_LANDLORD_VARIATION_OPTIONS,
  SMALL_TALK_SCENARIO_ID,
  MEETING_NEW_PEOPLE_SCENARIO_ID,
  PARTY_SOCIAL_SCENARIO_ID,
  EXPLAINING_SOMETHING_SCENARIO_ID,
  STORYTELLING_SCENARIO_ID,
  OPINIONS_DISCUSSIONS_SCENARIO_ID,
  getOpinionsDiscussionsSpeakLiveHeroSrc,
  getOpinionsDiscussionsSpeakLiveHeroAlt,
  getExplainingSomethingSpeakLiveHeroAlt,
  getExplainingSomethingSpeakLiveHeroSrc,
  getStorytellingSpeakLiveHeroAlt,
  getStorytellingSpeakLiveHeroSrc,
  getHousingLandlordSpeakLiveHeroAlt,
  getHousingLandlordSpeakLiveHeroSrc,
  getMeetingNewPeopleSpeakLiveHeroAlt,
  getMeetingNewPeopleSpeakLiveHeroSrc,
  getPartySocialSpeakLiveHeroAlt,
  getPartySocialSpeakLiveHeroSrc,
  getSmallTalkSpeakLiveHeroAlt,
  getSmallTalkSpeakLiveHeroSrc,
  getWorkColleagueSpeakLiveHeroAlt,
  getWorkColleagueSpeakLiveHeroSrc,
  SUPERMARKET_SHOP_FOCUS_OPTIONS,
  SUPERMARKET_SHOP_SCENARIO_ID,
  TRAIN_STATION_CLASSIC_SCENARIO_ID,
  TRAIN_STATION_SCENARIO_ID,
  type BookingReservationsScenarioOverrides,
  type DoctorPharmacyScenarioOverrides,
  type OrderingFoodScenarioOverrides,
  type DirectionsGettingSomewhereOverrides,
  type PublicTransportScenarioOverrides,
  type SpeakLiveLaunchOverrides,
  type StoreServiceIssueScenarioOverrides,
  type SupermarketShopScenarioOverrides,
  type WorkColleagueScenarioOverrides,
  type HousingLandlordScenarioOverrides,
} from '../speakLiveScenarios'
import { resolveDirectionsSpeakLiveVisual } from '@/lib/practice/scenarioImageRegistry'
import { APP_LANGUAGE_COACH, APP_READ_ALOUD, speakLiveRunHref } from '@/lib/routing/appRoutes'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { conversationClient } from '@/lib/api/conversationClient'
import { readResumableLiveSession, type ResumableLiveSession } from '@/lib/speak-live/resumableLiveSessionStorage'
import {
  readSpeakLiveLastLaunch,
  writeSpeakLiveLastLaunch,
  type SpeakLiveLastLaunch,
} from '@/lib/speak-live/speakLiveLastLaunchStorage'
import { getSupermarketShopStarterHintsForRuntime } from '@/lib/speak-live/supermarketShopLearnerStarters'
import { getBookingReservationsStarterHintsForRuntime } from '@/lib/speak-live/bookingReservationsLearnerStarters'
import { getStoreServiceIssueStarterHintsForRuntime } from '@/lib/speak-live/storeServiceIssueLearnerStarters'
import { getWorkColleagueInteractionStarterHintsForRuntime } from '@/lib/speak-live/workColleagueInteractionLearnerStarters'
import { getHousingLandlordStarterHintsForRuntime } from '@/lib/speak-live/housingLandlordLearnerStarters'
import { getDoctorPharmacyStarterHintsForRuntime } from '@/lib/speak-live/doctorPharmacyLearnerStarters'
import { BookingReservationsScenarioControls } from './BookingReservationsScenarioControls'
import { StoreServiceIssueScenarioControls } from './StoreServiceIssueScenarioControls'
import { WorkColleagueInteractionScenarioControls } from './WorkColleagueInteractionScenarioControls'
import { HousingLandlordScenarioControls } from './HousingLandlordScenarioControls'
import { DoctorPharmacyScenarioControls } from './DoctorPharmacyScenarioControls'
import { DirectionsScenarioControls } from './DirectionsScenarioControls'
import { OrderingFoodScenarioControls } from './OrderingFoodScenarioControls'
import { PublicTransportScenarioControls } from './PublicTransportScenarioControls'
import { SupermarketShopScenarioControls } from './SupermarketShopScenarioControls'
import { SpeakLiveScenarioCard } from './SpeakLiveScenarioCard'
import { SpeakLiveScenarioSection } from './SpeakLiveScenarioSection'
import { groupHasUniformStandardLevels, groupLiveScenariosForBrowse } from './speakLiveBrowseGrouping'
import { formatSpeakLiveRelativeTimeEn } from './speakLiveRelativeTimeEn'
import { scenarioSetupSkillHint, talkSkillPreviewChips } from '@/features/talk/talkSkillSurfaces'
import { TalkSkillSignalRow } from '@/features/talk/TalkSkillSignalRow'

/**
 * Premium launcher for Speak Live scenarios.
 * Preserves the current live route and run behavior while making the catalog scalable.
 */
export function LiveSpeakEntryScreen() {
  const router = useRouter()
  const scenarioSetupAnchorRef = useRef<HTMLDivElement>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [level, setLevel] = useState<string>('A2')
  const [orderingFoodSmartMode, setOrderingFoodSmartMode] = useState(true)
  const [orderingFoodCustomizeOpen, setOrderingFoodCustomizeOpen] = useState(false)
  const [orderingFoodOverrides, setOrderingFoodOverrides] = useState<OrderingFoodScenarioOverrides>({})
  const [supermarketShopSmartMode, setSupermarketShopSmartMode] = useState(true)
  const [supermarketShopCustomizeOpen, setSupermarketShopCustomizeOpen] = useState(false)
  const [supermarketShopOverrides, setSupermarketShopOverrides] = useState<SupermarketShopScenarioOverrides>({})
  const [directionsSmartMode, setDirectionsSmartMode] = useState(true)
  const [directionsCustomizeOpen, setDirectionsCustomizeOpen] = useState(false)
  const [directionsOverrides, setDirectionsOverrides] = useState<DirectionsGettingSomewhereOverrides>({})
  const [publicTransportSmartMode, setPublicTransportSmartMode] = useState(true)
  const [publicTransportCustomizeOpen, setPublicTransportCustomizeOpen] = useState(false)
  const [publicTransportOverrides, setPublicTransportOverrides] = useState<PublicTransportScenarioOverrides>({})
  const [bookingReservationsSmartMode, setBookingReservationsSmartMode] = useState(true)
  const [bookingReservationsCustomizeOpen, setBookingReservationsCustomizeOpen] = useState(false)
  const [bookingReservationsOverrides, setBookingReservationsOverrides] = useState<BookingReservationsScenarioOverrides>({})
  const [doctorPharmacySmartMode, setDoctorPharmacySmartMode] = useState(true)
  const [doctorPharmacyCustomizeOpen, setDoctorPharmacyCustomizeOpen] = useState(false)
  const [doctorPharmacyOverrides, setDoctorPharmacyOverrides] = useState<DoctorPharmacyScenarioOverrides>({})
  const [storeServiceIssueSmartMode, setStoreServiceIssueSmartMode] = useState(true)
  const [storeServiceIssueCustomizeOpen, setStoreServiceIssueCustomizeOpen] = useState(false)
  const [storeServiceIssueOverrides, setStoreServiceIssueOverrides] = useState<StoreServiceIssueScenarioOverrides>({})
  const [workColleagueSmartMode, setWorkColleagueSmartMode] = useState(true)
  const [workColleagueCustomizeOpen, setWorkColleagueCustomizeOpen] = useState(false)
  const [workColleagueOverrides, setWorkColleagueOverrides] = useState<WorkColleagueScenarioOverrides>({})
  const [housingLandlordSmartMode, setHousingLandlordSmartMode] = useState(true)
  const [housingLandlordCustomizeOpen, setHousingLandlordCustomizeOpen] = useState(false)
  const [housingLandlordOverrides, setHousingLandlordOverrides] = useState<HousingLandlordScenarioOverrides>({})

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return undefined
    return getSpeakLiveCatalogItem(selectedItemId)
  }, [selectedItemId])

  const liveItems = useMemo(() => getLiveScenarios(), [])
  const comingSoonItems = useMemo(() => getComingSoonScenarios(), [])
  const scenarioBrowseGroups = useMemo(() => groupLiveScenariosForBrowse(liveItems), [liveItems])
  const recommendedScenario = useMemo(
    () => liveItems.find((i) => i.id === ORDERING_FOOD_SCENARIO_ID) ?? getDefaultLiveScenario(),
    [liveItems]
  )

  const [resumableSession, setResumableSession] = useState<ResumableLiveSession | null>(null)
  const [lastLaunch, setLastLaunch] = useState<SpeakLiveLastLaunch | null>(null)

  useEffect(() => {
    setLastLaunch(readSpeakLiveLastLaunch())
    if (!isFeature1ChatBackendEnabled()) {
      setResumableSession(null)
      return
    }
    setResumableSession(readResumableLiveSession())
  }, [])

  const profileRecsQuery = useQuery({
    queryKey: ['talk', 'continue'],
    queryFn: () => conversationClient.getContinueConversation(),
    enabled: isFeature1ChatBackendEnabled(),
    staleTime: 15_000,
  })
  const profileScenarioRecs = useMemo(() => {
    const lf = profileRecsQuery.data?.learningFocus
    if (!lf || lf.coldStart) return []
    const list = lf.recommendations ?? []
    return list.filter((r) => r.type === 'speak_live_scenario').slice(0, 2)
  }, [profileRecsQuery.data])

  const skillsPreview = useMemo(() => {
    const lf = profileRecsQuery.data?.learningFocus
    if (!lf || lf.coldStart) return null
    return lf.skillsPreview ?? null
  }, [profileRecsQuery.data])

  const skillsHeroChips = useMemo(() => talkSkillPreviewChips(skillsPreview ?? undefined, 2), [skillsPreview])

  const primeScenarioSelection = useCallback((id: string) => {
    if (id === TRAIN_STATION_CLASSIC_SCENARIO_ID) {
      setPublicTransportSmartMode(false)
      setPublicTransportOverrides({ subType: 'train', variation: 'route_and_platform' })
      setPublicTransportCustomizeOpen(false)
    } else if (id === TRAIN_STATION_SCENARIO_ID) {
      setPublicTransportSmartMode(true)
      setPublicTransportOverrides({})
      setPublicTransportCustomizeOpen(false)
    } else if (id === BOOKING_RESERVATIONS_SCENARIO_ID) {
      setBookingReservationsSmartMode(true)
      setBookingReservationsOverrides({})
      setBookingReservationsCustomizeOpen(false)
    } else if (id === STORE_SERVICE_ISSUE_SCENARIO_ID) {
      setStoreServiceIssueSmartMode(true)
      setStoreServiceIssueOverrides({})
      setStoreServiceIssueCustomizeOpen(false)
    } else if (id === WORK_COLLEAGUE_INTERACTION_SCENARIO_ID) {
      setWorkColleagueSmartMode(true)
      setWorkColleagueOverrides({})
      setWorkColleagueCustomizeOpen(false)
    } else if (id === HOUSING_LANDLORD_SCENARIO_ID) {
      setHousingLandlordSmartMode(true)
      setHousingLandlordOverrides({})
      setHousingLandlordCustomizeOpen(false)
    } else if (id === DOCTOR_PHARMACY_SCENARIO_ID) {
      setDoctorPharmacySmartMode(true)
      setDoctorPharmacyOverrides({})
      setDoctorPharmacyCustomizeOpen(false)
    }
    setSelectedItemId(id)
  }, [])

  const primeFromLastLaunch = useCallback(
    (launch: SpeakLiveLastLaunch) => {
      const lv = launch.level.trim().toUpperCase()
      if ((SPEAK_LIVE_LEVELS as readonly string[]).includes(lv)) {
        setLevel(lv)
      }
      if (launch.launcherItemId && getSpeakLiveCatalogItem(launch.launcherItemId)) {
        primeScenarioSelection(launch.launcherItemId)
        return
      }
      try {
        const u = new URL(launch.href, 'https://invalid.local')
        const sid = u.searchParams.get('scenarioId')?.trim()
        const match = sid ? liveItems.find((i) => (i.launchScenarioId ?? i.id) === sid) : undefined
        if (match) primeScenarioSelection(match.id)
      } catch {
        /* ignore */
      }
    },
    [liveItems, primeScenarioSelection]
  )

  const selectedLiveItem = isSpeakLiveLaunchableItem(selectedItem) ? selectedItem : null

  const selectedScenarioSkillHint = useMemo(() => {
    if (!selectedLiveItem) return null
    const sid = selectedLiveItem.launchScenarioId ?? selectedLiveItem.id
    return scenarioSetupSkillHint(sid, skillsPreview?.focusLabel ?? null)
  }, [selectedLiveItem, skillsPreview?.focusLabel])

  const isOrderingFoodSelected = selectedLiveItem?.id === ORDERING_FOOD_SCENARIO_ID
  const isSupermarketShopSelected = selectedLiveItem?.id === SUPERMARKET_SHOP_SCENARIO_ID
  const isDirectionsSelected = selectedLiveItem?.id === DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID
  const isPublicTransportLauncherSelected =
    selectedLiveItem?.id === TRAIN_STATION_SCENARIO_ID || selectedLiveItem?.id === TRAIN_STATION_CLASSIC_SCENARIO_ID
  const isBookingReservationsSelected = selectedLiveItem?.id === BOOKING_RESERVATIONS_SCENARIO_ID
  const isStoreServiceIssueSelected = selectedLiveItem?.id === STORE_SERVICE_ISSUE_SCENARIO_ID
  const isWorkColleagueInteractionSelected = selectedLiveItem?.id === WORK_COLLEAGUE_INTERACTION_SCENARIO_ID
  const isHousingLandlordSelected = selectedLiveItem?.id === HOUSING_LANDLORD_SCENARIO_ID
  const isDoctorPharmacySelected = selectedLiveItem?.id === DOCTOR_PHARMACY_SCENARIO_ID
  const isClassicTrainStationTile = selectedLiveItem?.id === TRAIN_STATION_CLASSIC_SCENARIO_ID
  const activeOrderingFoodOverrides = useMemo(
    () =>
      isOrderingFoodSelected && !orderingFoodSmartMode
        ? {
            ...(orderingFoodOverrides.subType ? { subType: orderingFoodOverrides.subType } : {}),
            ...(orderingFoodOverrides.variation ? { variation: orderingFoodOverrides.variation } : {}),
          }
        : undefined,
    [isOrderingFoodSelected, orderingFoodOverrides, orderingFoodSmartMode]
  )
  const activeSupermarketShopOverrides = useMemo(
    () =>
      isSupermarketShopSelected && !supermarketShopSmartMode
        ? {
            ...(supermarketShopOverrides.subType ? { subType: supermarketShopOverrides.subType } : {}),
            ...(supermarketShopOverrides.variation ? { variation: supermarketShopOverrides.variation } : {}),
          }
        : undefined,
    [isSupermarketShopSelected, supermarketShopOverrides, supermarketShopSmartMode]
  )
  const activeDirectionsOverrides = useMemo(
    () =>
      isDirectionsSelected && !directionsSmartMode
        ? {
            ...(directionsOverrides.subType ? { subType: directionsOverrides.subType } : {}),
            ...(directionsOverrides.variation ? { variation: directionsOverrides.variation } : {}),
          }
        : undefined,
    [directionsOverrides, directionsSmartMode, isDirectionsSelected]
  )
  const activePublicTransportOverrides = useMemo(() => {
    if (!isPublicTransportLauncherSelected) return undefined
    if (isClassicTrainStationTile) {
      return {
        subType: 'train' as const,
        variation: 'route_and_platform' as const,
        ...(publicTransportOverrides.destination?.trim()
          ? { destination: publicTransportOverrides.destination.trim() }
          : {}),
      }
    }
    if (!publicTransportSmartMode) {
      return {
        ...(publicTransportOverrides.subType ? { subType: publicTransportOverrides.subType } : {}),
        ...(publicTransportOverrides.variation ? { variation: publicTransportOverrides.variation } : {}),
        ...(publicTransportOverrides.destination?.trim()
          ? { destination: publicTransportOverrides.destination.trim() }
          : {}),
      }
    }
    return undefined
  }, [
    isClassicTrainStationTile,
    isPublicTransportLauncherSelected,
    publicTransportOverrides.destination,
    publicTransportOverrides.subType,
    publicTransportOverrides.variation,
    publicTransportSmartMode,
  ])
  const activeBookingReservationsOverrides = useMemo(
    () =>
      isBookingReservationsSelected && !bookingReservationsSmartMode
        ? {
            ...(bookingReservationsOverrides.subType ? { subType: bookingReservationsOverrides.subType } : {}),
            ...(bookingReservationsOverrides.variation ? { variation: bookingReservationsOverrides.variation } : {}),
            ...(bookingReservationsOverrides.detailFocus ? { detailFocus: bookingReservationsOverrides.detailFocus } : {}),
          }
        : undefined,
    [bookingReservationsOverrides, bookingReservationsSmartMode, isBookingReservationsSelected]
  )
  const activeDoctorPharmacyOverrides = useMemo(
    () =>
      isDoctorPharmacySelected && !doctorPharmacySmartMode
        ? {
            ...(doctorPharmacyOverrides.subType ? { subType: doctorPharmacyOverrides.subType } : {}),
            ...(doctorPharmacyOverrides.variation ? { variation: doctorPharmacyOverrides.variation } : {}),
            ...(doctorPharmacyOverrides.detailFocus ? { detailFocus: doctorPharmacyOverrides.detailFocus } : {}),
          }
        : undefined,
    [doctorPharmacyOverrides, doctorPharmacySmartMode, isDoctorPharmacySelected]
  )
  const activeStoreServiceIssueOverrides = useMemo(
    () =>
      isStoreServiceIssueSelected && !storeServiceIssueSmartMode
        ? {
            ...(storeServiceIssueOverrides.subType ? { subType: storeServiceIssueOverrides.subType } : {}),
            ...(storeServiceIssueOverrides.variation ? { variation: storeServiceIssueOverrides.variation } : {}),
            ...(storeServiceIssueOverrides.detailFocus ? { detailFocus: storeServiceIssueOverrides.detailFocus } : {}),
          }
        : undefined,
    [isStoreServiceIssueSelected, storeServiceIssueOverrides, storeServiceIssueSmartMode]
  )
  const activeWorkColleagueOverrides = useMemo(
    () =>
      isWorkColleagueInteractionSelected && !workColleagueSmartMode
        ? {
            ...(workColleagueOverrides.subType ? { subType: workColleagueOverrides.subType } : {}),
            ...(workColleagueOverrides.variation ? { variation: workColleagueOverrides.variation } : {}),
            ...(workColleagueOverrides.detailFocus ? { detailFocus: workColleagueOverrides.detailFocus } : {}),
          }
        : undefined,
    [isWorkColleagueInteractionSelected, workColleagueOverrides, workColleagueSmartMode]
  )
  const activeHousingLandlordOverrides = useMemo(() => {
    if (!isHousingLandlordSelected || housingLandlordSmartMode) return undefined
    const o = {
      ...(housingLandlordOverrides.subType ? { subType: housingLandlordOverrides.subType } : {}),
      ...(housingLandlordOverrides.variation ? { variation: housingLandlordOverrides.variation } : {}),
      ...(housingLandlordOverrides.detailFocus ? { detailFocus: housingLandlordOverrides.detailFocus } : {}),
    }
    return Object.keys(o).length > 0 ? o : undefined
  }, [housingLandlordOverrides, housingLandlordSmartMode, isHousingLandlordSelected])
  const launchOverrides = useMemo<SpeakLiveLaunchOverrides | undefined>(
    () =>
      activeOrderingFoodOverrides ??
      activeSupermarketShopOverrides ??
      activeDirectionsOverrides ??
      activePublicTransportOverrides ??
      activeBookingReservationsOverrides ??
      activeStoreServiceIssueOverrides ??
      activeWorkColleagueOverrides ??
      activeHousingLandlordOverrides ??
      activeDoctorPharmacyOverrides,
    [
      activeBookingReservationsOverrides,
      activeDoctorPharmacyOverrides,
      activeHousingLandlordOverrides,
      activeStoreServiceIssueOverrides,
      activeWorkColleagueOverrides,
      activeDirectionsOverrides,
      activeOrderingFoodOverrides,
      activePublicTransportOverrides,
      activeSupermarketShopOverrides,
    ]
  )
  const href = useMemo(
    () => getSpeakLiveLaunchHref(selectedLiveItem ?? undefined, level, launchOverrides),
    [launchOverrides, level, selectedLiveItem]
  )
  const selectedNonLiveItem = selectedItem && !selectedLiveItem ? selectedItem : null

  useEffect(() => {
    if (selectedItemId == null) return
    const id = window.requestAnimationFrame(() => {
      scenarioSetupAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(id)
  }, [selectedItemId])
  const supermarketShopFocusLabel = useMemo(
    () => SUPERMARKET_SHOP_FOCUS_OPTIONS.find((option) => option.id === supermarketShopOverrides.variation)?.label ?? null,
    [supermarketShopOverrides.variation]
  )
  const bookingReservationsVariationLabel = useMemo(
    () => BOOKING_RESERVATIONS_VARIATION_OPTIONS.find((o) => o.id === bookingReservationsOverrides.variation)?.label ?? null,
    [bookingReservationsOverrides.variation]
  )
  const doctorPharmacyVariationLabel = useMemo(
    () => DOCTOR_PHARMACY_LAUNCHER_FOCUS_OPTIONS.find((o) => o.id === doctorPharmacyOverrides.variation)?.label ?? null,
    [doctorPharmacyOverrides.variation]
  )
  const storeServiceIssueVariationLabel = useMemo(
    () => STORE_SERVICE_ISSUE_VARIATION_OPTIONS.find((o) => o.id === storeServiceIssueOverrides.variation)?.label ?? null,
    [storeServiceIssueOverrides.variation]
  )
  const workColleagueVariationLabel = useMemo(
    () => WORK_COLLEAGUE_VARIATION_OPTIONS.find((o) => o.id === workColleagueOverrides.variation)?.label ?? null,
    [workColleagueOverrides.variation]
  )
  const housingLandlordVariationLabel = useMemo(
    () => HOUSING_LANDLORD_VARIATION_OPTIONS.find((o) => o.id === housingLandlordOverrides.variation)?.label ?? null,
    [housingLandlordOverrides.variation]
  )

  const supermarketPrepPhrases = useMemo(() => {
    if (!isSupermarketShopSelected) return []
    const focus =
      !supermarketShopSmartMode && supermarketShopOverrides.variation ? supermarketShopOverrides.variation : undefined
    return [...getSupermarketShopStarterHintsForRuntime(level, focus)]
  }, [
    isSupermarketShopSelected,
    level,
    supermarketShopOverrides.variation,
    supermarketShopSmartMode,
  ])

  const bookingReservationsPrepPhrases = useMemo(() => {
    if (!isBookingReservationsSelected) return []
    const focus =
      !bookingReservationsSmartMode && bookingReservationsOverrides.variation
        ? bookingReservationsOverrides.variation
        : undefined
    const subTypeForHints =
      !bookingReservationsSmartMode && bookingReservationsOverrides.subType
        ? bookingReservationsOverrides.subType
        : undefined
    return [...getBookingReservationsStarterHintsForRuntime(level as 'A1' | 'A2' | 'B1', focus, subTypeForHints)]
  }, [
    bookingReservationsOverrides.subType,
    bookingReservationsOverrides.variation,
    bookingReservationsSmartMode,
    isBookingReservationsSelected,
    level,
  ])

  const doctorPharmacyPrepPhrases = useMemo(() => {
    if (!isDoctorPharmacySelected) return []
    const focus =
      !doctorPharmacySmartMode && doctorPharmacyOverrides.variation ? doctorPharmacyOverrides.variation : undefined
    return [...getDoctorPharmacyStarterHintsForRuntime(level as 'A1' | 'A2' | 'B1', focus)]
  }, [
    doctorPharmacyOverrides.variation,
    doctorPharmacySmartMode,
    isDoctorPharmacySelected,
    level,
  ])

  const storeServiceIssuePrepPhrases = useMemo(() => {
    if (!isStoreServiceIssueSelected) return []
    const variation =
      !storeServiceIssueSmartMode && storeServiceIssueOverrides.variation
        ? storeServiceIssueOverrides.variation
        : undefined
    const subType =
      !storeServiceIssueSmartMode && storeServiceIssueOverrides.subType
        ? storeServiceIssueOverrides.subType
        : undefined
    return [...getStoreServiceIssueStarterHintsForRuntime(level as 'A1' | 'A2' | 'B1', variation, subType)]
  }, [
    isStoreServiceIssueSelected,
    level,
    storeServiceIssueOverrides.subType,
    storeServiceIssueOverrides.variation,
    storeServiceIssueSmartMode,
  ])

  const workColleaguePrepPhrases = useMemo(() => {
    if (!isWorkColleagueInteractionSelected) return []
    const variation =
      !workColleagueSmartMode && workColleagueOverrides.variation ? workColleagueOverrides.variation : undefined
    const subType =
      !workColleagueSmartMode && workColleagueOverrides.subType ? workColleagueOverrides.subType : undefined
    return [...getWorkColleagueInteractionStarterHintsForRuntime(level as 'A1' | 'A2' | 'B1', variation, subType)]
  }, [
    isWorkColleagueInteractionSelected,
    level,
    workColleagueOverrides.subType,
    workColleagueOverrides.variation,
    workColleagueSmartMode,
  ])

  const housingLandlordPrepPhrases = useMemo(() => {
    if (!isHousingLandlordSelected) return []
    const variation =
      !housingLandlordSmartMode && housingLandlordOverrides.variation
        ? housingLandlordOverrides.variation
        : undefined
    const subType =
      !housingLandlordSmartMode && housingLandlordOverrides.subType ? housingLandlordOverrides.subType : undefined
    const detailFocus =
      !housingLandlordSmartMode && housingLandlordOverrides.detailFocus
        ? housingLandlordOverrides.detailFocus
        : undefined
    return [
      ...getHousingLandlordStarterHintsForRuntime(level as 'A1' | 'A2' | 'B1', variation, subType, detailFocus),
    ]
  }, [
    housingLandlordOverrides.detailFocus,
    housingLandlordOverrides.subType,
    housingLandlordOverrides.variation,
    housingLandlordSmartMode,
    isHousingLandlordSelected,
    level,
  ])

  const launchHero = useMemo(() => {
    if (!selectedLiveItem?.imageSrc) return null
    if (selectedLiveItem.id === ORDERING_FOOD_SCENARIO_ID) {
      return {
        src: getOrderingFoodSpeakLiveHeroSrc({
          smartMode: orderingFoodSmartMode,
          subType: orderingFoodOverrides.subType,
        }),
        alt: getOrderingFoodSpeakLiveHeroAlt({
          smartMode: orderingFoodSmartMode,
          subType: orderingFoodOverrides.subType,
        }),
      }
    }
    if (selectedLiveItem.id === SUPERMARKET_SHOP_SCENARIO_ID) {
      return {
        src: getSupermarketShopSpeakLiveHeroSrc({
          smartMode: supermarketShopSmartMode,
          subType: supermarketShopOverrides.subType,
          variation: supermarketShopOverrides.variation,
        }),
        alt: getSupermarketShopSpeakLiveHeroAlt({
          smartMode: supermarketShopSmartMode,
          subType: supermarketShopOverrides.subType,
          variation: supermarketShopOverrides.variation,
        }),
      }
    }
    if (selectedLiveItem.id === DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID) {
      const v = resolveDirectionsSpeakLiveVisual({
        smartMode: directionsSmartMode,
        subType: directionsOverrides.subType,
      })
      return { src: v.heroSrc, alt: v.altEn }
    }
    if (selectedLiveItem.id === TRAIN_STATION_CLASSIC_SCENARIO_ID) {
      const v = resolvePublicTransportSpeakLiveVisual({
        smartMode: false,
        subType: 'train',
        variation: 'route_and_platform',
      })
      return { src: v.heroSrc, alt: v.altEn }
    }
    if (selectedLiveItem.id === TRAIN_STATION_SCENARIO_ID) {
      const v = resolvePublicTransportSpeakLiveVisual({
        smartMode: publicTransportSmartMode,
        subType: publicTransportOverrides.subType,
        variation: publicTransportOverrides.variation,
      })
      return { src: v.heroSrc, alt: v.altEn }
    }
    if (selectedLiveItem.id === BOOKING_RESERVATIONS_SCENARIO_ID) {
      return {
        src: getBookingReservationsSpeakLiveHeroSrc({
          smartMode: bookingReservationsSmartMode,
          subType: bookingReservationsOverrides.subType,
          variation: bookingReservationsOverrides.variation,
        }),
        alt: getBookingReservationsSpeakLiveHeroAlt({
          smartMode: bookingReservationsSmartMode,
          subType: bookingReservationsOverrides.subType,
          variation: bookingReservationsOverrides.variation,
        }),
      }
    }
    if (selectedLiveItem.id === STORE_SERVICE_ISSUE_SCENARIO_ID) {
      return {
        src: getStoreServiceIssueSpeakLiveHeroSrc({
          smartMode: storeServiceIssueSmartMode,
          subType: storeServiceIssueOverrides.subType,
          variation: storeServiceIssueOverrides.variation,
        }),
        alt: getStoreServiceIssueSpeakLiveHeroAlt({
          smartMode: storeServiceIssueSmartMode,
          subType: storeServiceIssueOverrides.subType,
          variation: storeServiceIssueOverrides.variation,
        }),
      }
    }
    if (selectedLiveItem.id === WORK_COLLEAGUE_INTERACTION_SCENARIO_ID) {
      return {
        src: getWorkColleagueSpeakLiveHeroSrc({
          smartMode: workColleagueSmartMode,
          subType: workColleagueOverrides.subType,
          variation: workColleagueOverrides.variation,
          assistantPresentation: 'female',
        }),
        alt: getWorkColleagueSpeakLiveHeroAlt({
          smartMode: workColleagueSmartMode,
          subType: workColleagueOverrides.subType,
          variation: workColleagueOverrides.variation,
          assistantPresentation: 'female',
        }),
      }
    }
    if (selectedLiveItem.id === HOUSING_LANDLORD_SCENARIO_ID) {
      return {
        src: getHousingLandlordSpeakLiveHeroSrc({
          smartMode: housingLandlordSmartMode,
          subType: housingLandlordOverrides.subType,
          variation: housingLandlordOverrides.variation,
          assistantPresentation: 'female',
        }),
        alt: getHousingLandlordSpeakLiveHeroAlt({
          smartMode: housingLandlordSmartMode,
          subType: housingLandlordOverrides.subType,
          variation: housingLandlordOverrides.variation,
          assistantPresentation: 'female',
        }),
      }
    }
    if (selectedLiveItem.id === DOCTOR_PHARMACY_SCENARIO_ID) {
      return {
        src: getDoctorPharmacySpeakLiveHeroSrc({
          smartMode: doctorPharmacySmartMode,
          subType: doctorPharmacyOverrides.subType,
          variation: doctorPharmacyOverrides.variation,
        }),
        alt: getDoctorPharmacySpeakLiveHeroAlt({
          smartMode: doctorPharmacySmartMode,
          subType: doctorPharmacyOverrides.subType,
          variation: doctorPharmacyOverrides.variation,
        }),
      }
    }
    if (selectedLiveItem.id === SMALL_TALK_SCENARIO_ID) {
      return {
        src: getSmallTalkSpeakLiveHeroSrc({ assistantPresentation: 'female' }),
        alt: getSmallTalkSpeakLiveHeroAlt({ assistantPresentation: 'female' }),
      }
    }
    if (selectedLiveItem.id === MEETING_NEW_PEOPLE_SCENARIO_ID) {
      return {
        src: getMeetingNewPeopleSpeakLiveHeroSrc({ assistantPresentation: 'female' }),
        alt: getMeetingNewPeopleSpeakLiveHeroAlt({ assistantPresentation: 'female' }),
      }
    }
    if (selectedLiveItem.id === PARTY_SOCIAL_SCENARIO_ID) {
      return {
        src: getPartySocialSpeakLiveHeroSrc({ assistantPresentation: 'female' }),
        alt: getPartySocialSpeakLiveHeroAlt({ assistantPresentation: 'female' }),
      }
    }
    if (selectedLiveItem.id === EXPLAINING_SOMETHING_SCENARIO_ID) {
      return {
        src: getExplainingSomethingSpeakLiveHeroSrc({ assistantPresentation: 'female' }),
        alt: getExplainingSomethingSpeakLiveHeroAlt({ assistantPresentation: 'female' }),
      }
    }
    if (selectedLiveItem.id === STORYTELLING_SCENARIO_ID) {
      return {
        src: getStorytellingSpeakLiveHeroSrc({ assistantPresentation: 'female' }),
        alt: getStorytellingSpeakLiveHeroAlt({ assistantPresentation: 'female' }),
      }
    }
    if (selectedLiveItem.id === OPINIONS_DISCUSSIONS_SCENARIO_ID) {
      return {
        src: getOpinionsDiscussionsSpeakLiveHeroSrc({ assistantPresentation: 'female' }),
        alt: getOpinionsDiscussionsSpeakLiveHeroAlt({ assistantPresentation: 'female' }),
      }
    }
    return {
      src: selectedLiveItem.imageSrc,
      alt: selectedLiveItem.imageAlt ?? selectedLiveItem.title,
    }
  }, [
    directionsOverrides.subType,
    directionsSmartMode,
    bookingReservationsOverrides.subType,
    bookingReservationsOverrides.variation,
    bookingReservationsSmartMode,
    storeServiceIssueOverrides.subType,
    storeServiceIssueOverrides.variation,
    storeServiceIssueSmartMode,
    workColleagueOverrides.subType,
    workColleagueOverrides.variation,
    workColleagueSmartMode,
    housingLandlordOverrides.subType,
    housingLandlordOverrides.variation,
    housingLandlordSmartMode,
    doctorPharmacyOverrides.subType,
    doctorPharmacyOverrides.variation,
    doctorPharmacySmartMode,
    orderingFoodOverrides.subType,
    orderingFoodSmartMode,
    publicTransportOverrides.subType,
    publicTransportOverrides.variation,
    publicTransportSmartMode,
    supermarketShopOverrides.subType,
    supermarketShopOverrides.variation,
    supermarketShopSmartMode,
    selectedLiveItem?.id,
    selectedLiveItem?.imageAlt,
    selectedLiveItem?.imageSrc,
    selectedLiveItem?.title,
  ])

  const go = useCallback(() => {
    if (!href || !selectedLiveItem) return
    playAppSound('tap')
    writeSpeakLiveLastLaunch({
      href,
      savedAt: new Date().toISOString(),
      scenarioTitle: selectedLiveItem.title,
      level,
      launcherItemId: selectedLiveItem.id,
    })
    setLastLaunch(readSpeakLiveLastLaunch())
    router.push(href)
  }, [href, router, selectedLiveItem, level])

  const scrollToLiveScenarios = useCallback(() => {
    playAppSound('tap')
    document.getElementById('speak-live-scenarios')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const scrollToSetup = useCallback(() => {
    playAppSound('tap')
    scenarioSetupAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const startSpeakingNow = useCallback(() => {
    playAppSound('tap')
    primeScenarioSelection(recommendedScenario.id)
    document.getElementById('speak-live-scenarios')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.requestAnimationFrame(() => {
      scenarioSetupAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [primeScenarioSelection, recommendedScenario.id])

  const resumableContinueHref = useMemo(() => {
    if (!resumableSession || !isFeature1ChatBackendEnabled()) return null
    return speakLiveRunHref({
      scenarioId: resumableSession.scenarioId,
      level: resumableSession.level,
      threadId: resumableSession.threadId,
    })
  }, [resumableSession])

  return (
    <div className="space-y-10 text-[#0F172A] sm:space-y-12">
      <section
        aria-label="Speak introduction"
        className="relative overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white px-5 py-7 shadow-[0_8px_36px_-24px_rgba(15,23,42,0.07)] sm:px-8 sm:py-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#6d28d9]/[0.04]" aria-hidden />
        <p className="text-xs font-medium tracking-wide text-[#64748B]">Speak</p>
        <h1 className="mt-2 text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-[#0F172A] sm:text-[2rem]">
          Dutch you will use tomorrow
        </h1>
        <p className="mt-2.5 max-w-md text-[15px] leading-snug text-[#475569]">
          Real moments, native pace, feedback you can act on—one session at a time.
        </p>
        {skillsHeroChips.length > 0 ? (
          <div className="mt-3 max-w-md">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Your skills</p>
            <TalkSkillSignalRow chips={skillsHeroChips} className="mt-1.5" />
          </div>
        ) : null}
        <div className="mt-7 flex flex-col gap-2.5 sm:max-w-md">
          {resumableContinueHref ? (
            <Link
              href={resumableContinueHref}
              onClick={() => playAppSound('tap')}
              className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-2xl bg-[#6d28d9] px-4 py-3.5 text-body-sm font-semibold text-white shadow-[0_10px_28px_-14px_rgba(37,99,235,0.35)] transition-colors hover:bg-[#5b21b6] active:bg-[#5b21b6]"
            >
              Resume session
              <ArrowRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            </Link>
          ) : lastLaunch ? (
            <Link
              href={lastLaunch.href}
              onClick={() => playAppSound('tap')}
              className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-2xl bg-[#6d28d9] px-4 py-3.5 text-body-sm font-semibold text-white shadow-[0_10px_28px_-14px_rgba(37,99,235,0.35)] transition-colors hover:bg-[#5b21b6] active:bg-[#5b21b6]"
            >
              Continue speaking
              <ArrowRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            </Link>
          ) : (
            <button
              type="button"
              onClick={startSpeakingNow}
              className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-2xl bg-[#6d28d9] px-4 py-3.5 text-body-sm font-semibold text-white shadow-[0_10px_28px_-14px_rgba(37,99,235,0.35)] transition-colors hover:bg-[#5b21b6] active:bg-[#5b21b6]"
            >
              Start speaking now
              <ArrowRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={scrollToLiveScenarios}
            className="min-h-touch text-center text-body-sm font-medium text-[#6d28d9] hover:text-[#5b21b6] sm:text-left"
          >
            Explore scenarios
          </button>
        </div>
      </section>

      <section aria-label="Continue or recommended" className="scroll-mt-4">
        {resumableContinueHref && resumableSession ? (
          <div className="rounded-3xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-[0_6px_28px_-18px_rgba(15,23,42,0.08)] sm:px-5 sm:py-5">
            <p className="text-xs font-medium text-[#7C3AED]">Session on hold</p>
            <p className="mt-1.5 text-[1.05rem] font-semibold tracking-tight text-[#0F172A]">
              {resumableSession.scenarioTitle}
            </p>
            <p className="mt-1 text-[13px] text-[#64748B]">
              {resumableSession.level} · paused
              {resumableSession.savedAt ? ` · ${formatSpeakLiveRelativeTimeEn(resumableSession.savedAt)}` : null}
            </p>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <Link
                href={resumableContinueHref}
                onClick={() => playAppSound('tap')}
                className="inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-2xl bg-[#7C3AED] px-4 py-3 text-body-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#6D28D9] sm:flex-none"
              >
                Resume session
                <ArrowRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={scrollToLiveScenarios}
                className="min-h-touch rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-body-sm font-medium text-[#475569] hover:bg-slate-50"
              >
                Explore scenarios
              </button>
            </div>
          </div>
        ) : lastLaunch ? (
          <div className="rounded-3xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-[0_6px_28px_-18px_rgba(15,23,42,0.08)] sm:px-5 sm:py-5">
            <p className="text-xs font-medium text-[#64748B]">Your last session</p>
            <p className="mt-1.5 text-[1.05rem] font-semibold tracking-tight text-[#0F172A]">{lastLaunch.scenarioTitle}</p>
            <p className="mt-1 text-[13px] text-[#64748B]">
              {lastLaunch.level} · {formatSpeakLiveRelativeTimeEn(lastLaunch.savedAt)}
            </p>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <Link
                href={lastLaunch.href}
                onClick={() => playAppSound('tap')}
                className="inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-2xl bg-[#6d28d9] px-4 py-3 text-body-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5b21b6] sm:flex-none"
              >
                Continue speaking
                <ArrowRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={() => {
                  primeFromLastLaunch(lastLaunch)
                  scrollToSetup()
                }}
                className="min-h-touch rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-body-sm font-medium text-[#475569] hover:bg-slate-50"
              >
                Refine setup
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-[0_6px_28px_-18px_rgba(15,23,42,0.08)] sm:px-5 sm:py-5">
            <p className="text-xs font-medium text-[#64748B]">Suggested start</p>
            <p className="mt-1.5 text-[1.05rem] font-semibold tracking-tight text-[#0F172A]">{recommendedScenario.title}</p>
            <p className="mt-1 text-[13px] leading-snug text-[#475569]">
              A gentle on-ramp: short dialog, clear stakes, feedback you can use right away.
            </p>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  primeScenarioSelection(recommendedScenario.id)
                  scrollToSetup()
                }}
                className="inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-2xl bg-[#6d28d9] px-4 py-3 text-body-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5b21b6] sm:flex-none"
              >
                Choose level & begin
                <ArrowRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              </button>
              <button
                type="button"
                onClick={scrollToLiveScenarios}
                className="min-h-touch rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-body-sm font-medium text-[#475569] hover:bg-slate-50"
              >
                See all moments
              </button>
            </div>
          </div>
        )}
      </section>

      <section aria-label="Live Scenarios primary mode" className="space-y-3">
        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-[0_6px_30px_-20px_rgba(15,23,42,0.08)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 gap-3.5 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#DCFCE7] text-[#166534] ring-1 ring-[#BBF7D0] sm:h-14 sm:w-14">
                <Mic className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#64748B]">Start here</p>
                <h2 className="mt-0.5 text-[1.2rem] font-semibold tracking-tight text-[#0F172A] sm:text-[1.28rem]">
                  Live Scenarios
                </h2>
                <p className="mt-2 max-w-prose text-[14px] leading-snug text-[#475569]">
                  Build real-life confidence—voice-first practice that meets you where you are.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={scrollToLiveScenarios}
              className="inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-body-sm font-medium text-[#0F172A] hover:bg-slate-50 sm:min-w-[11rem]"
            >
              Explore scenarios
              <ArrowRight className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden />
            </button>
            {selectedLiveItem ? (
              <button
                type="button"
                onClick={scrollToSetup}
                className="inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-body-sm font-medium text-[#1E40AF] hover:bg-[#DBEAFE]/80 sm:min-w-[11rem]"
              >
                Review setup
                <ArrowRight className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden />
              </button>
            ) : null}
            {selectedLiveItem && href ? (
              <button
                type="button"
                onClick={go}
                className="inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-2xl bg-[#6d28d9] px-4 py-3 text-body-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5b21b6] sm:min-w-[11rem]"
              >
                Begin now
                <ArrowRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-[0_4px_24px_-18px_rgba(15,23,42,0.06)] sm:p-5">
            <div className="flex gap-3.5 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6D28D9] ring-1 ring-indigo-100/80">
                <BookOpen className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-body font-semibold tracking-tight text-[#0F172A]">Read Aloud</h3>
                <p className="mt-1 text-[13px] leading-snug text-[#475569]">
                  Sharpen pronunciation, rhythm, and clarity—with a report worth revisiting.
                </p>
              </div>
            </div>
            <Link
              href={APP_READ_ALOUD}
              onClick={() => playAppSound('tap')}
              className="mt-3.5 inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-2xl border border-indigo-200/80 bg-[#EEF2FF]/60 px-4 py-3 text-body-sm font-medium text-[#5B21B6] hover:bg-[#EEF2FF]"
            >
              Open studio
              <ArrowRight className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            </Link>
          </div>

          <div className="flex flex-col rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-[0_4px_24px_-18px_rgba(15,23,42,0.06)] sm:p-5">
            <div className="flex gap-3.5 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#7C3AED] ring-1 ring-violet-100/80">
                <MessageCircle className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-body font-semibold tracking-tight text-[#0F172A]">Language Coach</h3>
                <p className="mt-1 text-[13px] leading-snug text-[#475569]">
                  Think out loud in Dutch. Your coach bends with you—then names what to keep growing.
                </p>
              </div>
            </div>
            <Link
              href={APP_LANGUAGE_COACH}
              onClick={() => playAppSound('tap')}
              className="mt-3.5 inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-2xl bg-[#7C3AED] px-4 py-3 text-body-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#6D28D9]"
            >
              Meet your coach
              <ArrowRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section
        id="speak-live-scenarios"
        aria-label="Live scenario catalog"
        className="scroll-mt-8 space-y-11 sm:space-y-14"
      >
        <div className="space-y-2 px-0.5">
          <p className="text-xs font-medium text-[#64748B]">Choose a moment</p>
          <h2 className="text-[1.2rem] font-semibold tracking-tight text-[#0F172A]">Moments that feel real</h2>
          <p className="max-w-lg text-[14px] leading-snug text-[#475569]">
            Pick a scene, refine it in setup, then speak. One visual highlight per topic—the list below stays easy to
            scan.
          </p>
          <p className="text-[12px] leading-snug text-[#64748B]">
            Most sessions support A1 · A2 · B1—your setup card always shows what applies.
          </p>
        </div>

        {profileScenarioRecs.length > 0 ? (
          <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/35 px-4 py-3.5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-900/80">Suggested next scenes</p>
            <ul className="mt-2 space-y-2.5">
              {profileScenarioRecs.map((r) => (
                <li key={r.targetId} className="text-[13px] leading-snug text-[#0F172A]">
                  <Link
                    href={speakLiveRunHref({ scenarioId: r.targetId, level })}
                    onClick={() => playAppSound('tap')}
                    className="font-semibold text-[#047857] underline-offset-2 hover:underline"
                  >
                    {r.title}
                  </Link>
                  <p className="mt-0.5 text-[12px] font-normal text-[#475569]">{r.subtitle}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {scenarioBrowseGroups.map((group) => {
          const hideLevelsInGroup = groupHasUniformStandardLevels(group.items)
          return (
            <div key={group.key} className="space-y-3">
              <header className="border-b border-[#E5E7EB] pb-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[1.02rem] font-semibold tracking-tight text-[#0F172A]">{group.title}</h3>
                  <span className="shrink-0 tabular-nums text-[12px] font-medium text-[#94A3B8]">
                    {group.items.length}
                  </span>
                </div>
              </header>
              <div className="space-y-1.5">
                {group.items.map((item, index) => (
                  <SpeakLiveScenarioCard
                    key={item.id}
                    item={item}
                    selected={selectedItem?.id === item.id}
                    onSelect={primeScenarioSelection}
                    layout={index === 0 ? 'browseFeatured' : 'browseRow'}
                    browseOptions={{
                      hideCategory: true,
                      hideLiveAvailability: true,
                      hideBrowseLevel: hideLevelsInGroup,
                    }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </section>

      <SpeakLiveScenarioSection
        eyebrow="On the horizon"
        title="More moments arriving soon"
        description="New everyday Dutch scenes are in polish—your start flow stays familiar."
        countLabel={`${comingSoonItems.length} planned`}
        tone="soon"
        quiet
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {comingSoonItems.map((item) => (
            <SpeakLiveScenarioCard
              key={item.id}
              item={item}
              selected={selectedItem?.id === item.id}
              onSelect={setSelectedItemId}
              compact
            />
          ))}
        </div>
      </SpeakLiveScenarioSection>

      <div ref={scenarioSetupAnchorRef} className="scroll-mt-8">
      {selectedLiveItem ? (
        <Card
          variant="outlined"
          className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-[0_6px_28px_-18px_rgba(15,23,42,0.08)] sm:p-5"
        >
          <div className="flex items-start gap-3 border-b border-[#E5E7EB]/80 pb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#166534] ring-1 ring-[#BBF7D0] sm:h-11 sm:w-11 sm:rounded-2xl">
              <Mic className="h-[1.15rem] w-[1.15rem] sm:h-5 sm:w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[1.22rem] font-semibold leading-tight tracking-tight text-[#0F172A] sm:text-[1.3rem]">
                {selectedLiveItem.title}
              </h2>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-[#64748B]">Level</span>
                <div className="flex flex-wrap gap-1.5">
                  {SPEAK_LIVE_LEVELS.map((lv) => (
                    <button
                      key={lv}
                      type="button"
                      onClick={() => {
                        playAppSound('tap')
                        setLevel(lv)
                      }}
                      className={clsx(
                        'min-h-[2.75rem] min-w-[2.75rem] rounded-xl border px-3 py-2 text-body-sm font-semibold transition-colors sm:min-h-touch sm:rounded-2xl sm:px-4',
                        level === lv
                          ? 'border-[#6d28d9] bg-[#EFF6FF] text-[#1E3A8A] shadow-sm ring-1 ring-[#BFDBFE]/80'
                          : 'border-[#E5E7EB] bg-white text-[#475569] hover:border-[#BFDBFE] hover:text-[#0F172A]'
                      )}
                    >
                      {lv}
                    </button>
                  ))}
                </div>
              </div>
              {selectedLiveItem.category?.trim() ? (
                <p className="mt-2 text-xs font-medium tracking-wide text-[#64748B]">{selectedLiveItem.category}</p>
              ) : null}
              <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-[#475569]">{selectedLiveItem.description}</p>
              {selectedScenarioSkillHint ? (
                <p className="mt-2 rounded-xl border border-emerald-200/50 bg-emerald-50/40 px-3 py-2 text-[12px] font-medium leading-snug text-emerald-950/95">
                  {selectedScenarioSkillHint}
                </p>
              ) : null}
              {isHousingLandlordSelected ? (
                <p className="mt-1.5 text-[12px] leading-snug text-[#64748B]">A1–B1 · pick what matches you today.</p>
              ) : null}
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-[#E5E7EB] bg-[#fafaf7]/60 px-3 py-3 sm:px-3.5 sm:py-3.5">
            {isOrderingFoodSelected ? (
              <OrderingFoodScenarioControls
                smartMode={orderingFoodSmartMode}
                overrides={orderingFoodOverrides}
                customizeOpen={orderingFoodCustomizeOpen}
                onSmartModeChange={setOrderingFoodSmartMode}
                onOverridesChange={setOrderingFoodOverrides}
                onCustomizeOpenChange={setOrderingFoodCustomizeOpen}
              />
            ) : null}
            {isSupermarketShopSelected ? (
              <SupermarketShopScenarioControls
                smartMode={supermarketShopSmartMode}
                overrides={supermarketShopOverrides}
                customizeOpen={supermarketShopCustomizeOpen}
                onSmartModeChange={setSupermarketShopSmartMode}
                onOverridesChange={setSupermarketShopOverrides}
                onCustomizeOpenChange={setSupermarketShopCustomizeOpen}
              />
            ) : null}
            {isDirectionsSelected ? (
              <DirectionsScenarioControls
                smartMode={directionsSmartMode}
                overrides={directionsOverrides}
                customizeOpen={directionsCustomizeOpen}
                onSmartModeChange={setDirectionsSmartMode}
                onOverridesChange={setDirectionsOverrides}
                onCustomizeOpenChange={setDirectionsCustomizeOpen}
              />
            ) : null}
            {isPublicTransportLauncherSelected ? (
              <PublicTransportScenarioControls
                smartMode={publicTransportSmartMode}
                overrides={publicTransportOverrides}
                customizeOpen={publicTransportCustomizeOpen}
                presetLocked={isClassicTrainStationTile}
                onSmartModeChange={(next) => {
                  setPublicTransportSmartMode(next)
                  if (next && selectedItemId === TRAIN_STATION_CLASSIC_SCENARIO_ID) {
                    setSelectedItemId(TRAIN_STATION_SCENARIO_ID)
                  }
                }}
                onOverridesChange={setPublicTransportOverrides}
                onCustomizeOpenChange={setPublicTransportCustomizeOpen}
              />
            ) : null}
            {isBookingReservationsSelected ? (
              <BookingReservationsScenarioControls
                smartMode={bookingReservationsSmartMode}
                overrides={bookingReservationsOverrides}
                customizeOpen={bookingReservationsCustomizeOpen}
                onSmartModeChange={setBookingReservationsSmartMode}
                onOverridesChange={setBookingReservationsOverrides}
                onCustomizeOpenChange={setBookingReservationsCustomizeOpen}
              />
            ) : null}
            {isStoreServiceIssueSelected ? (
              <StoreServiceIssueScenarioControls
                smartMode={storeServiceIssueSmartMode}
                overrides={storeServiceIssueOverrides}
                customizeOpen={storeServiceIssueCustomizeOpen}
                onSmartModeChange={setStoreServiceIssueSmartMode}
                onOverridesChange={setStoreServiceIssueOverrides}
                onCustomizeOpenChange={setStoreServiceIssueCustomizeOpen}
              />
            ) : null}
            {isWorkColleagueInteractionSelected ? (
              <WorkColleagueInteractionScenarioControls
                smartMode={workColleagueSmartMode}
                overrides={workColleagueOverrides}
                customizeOpen={workColleagueCustomizeOpen}
                onSmartModeChange={setWorkColleagueSmartMode}
                onOverridesChange={setWorkColleagueOverrides}
                onCustomizeOpenChange={setWorkColleagueCustomizeOpen}
              />
            ) : null}
            {isHousingLandlordSelected ? (
              <HousingLandlordScenarioControls
                smartMode={housingLandlordSmartMode}
                overrides={housingLandlordOverrides}
                customizeOpen={housingLandlordCustomizeOpen}
                onSmartModeChange={setHousingLandlordSmartMode}
                onOverridesChange={setHousingLandlordOverrides}
                onCustomizeOpenChange={setHousingLandlordCustomizeOpen}
              />
            ) : null}
            {isDoctorPharmacySelected ? (
              <DoctorPharmacyScenarioControls
                smartMode={doctorPharmacySmartMode}
                overrides={doctorPharmacyOverrides}
                customizeOpen={doctorPharmacyCustomizeOpen}
                onSmartModeChange={setDoctorPharmacySmartMode}
                onOverridesChange={setDoctorPharmacyOverrides}
                onCustomizeOpenChange={setDoctorPharmacyCustomizeOpen}
              />
            ) : null}

            {isSupermarketShopSelected && supermarketPrepPhrases.length ? (
              <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 sm:px-3.5">
                <p className="text-caption font-semibold text-ink-primary">Warm-up phrases</p>
                <p className="mt-1 text-[11px] leading-snug text-ink-tertiary">
                  Examples for {level}
                  {supermarketShopSmartMode
                    ? ' (session focus varies — these suit “where is it?”).'
                    : supermarketShopFocusLabel
                      ? ` — ${supermarketShopFocusLabel.toLowerCase()}.`
                      : '.'}
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-caption leading-snug text-ink-secondary">
                  {supermarketPrepPhrases.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {isBookingReservationsSelected && bookingReservationsPrepPhrases.length ? (
              <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 sm:px-3.5">
                <p className="text-caption font-semibold text-ink-primary">Warm-up phrases</p>
                <p className="mt-1 text-[11px] leading-snug text-ink-tertiary">
                  Examples for {level}
                  {bookingReservationsSmartMode
                    ? ' (session focus varies — restaurant, salon, or desk).'
                    : bookingReservationsVariationLabel
                      ? ` — ${bookingReservationsVariationLabel.toLowerCase()}.`
                      : '.'}
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-caption leading-snug text-ink-secondary">
                  {bookingReservationsPrepPhrases.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {isStoreServiceIssueSelected && storeServiceIssuePrepPhrases.length ? (
              <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 sm:px-3.5">
                <p className="text-caption font-semibold text-ink-primary">Warm-up phrases</p>
                <p className="mt-1 text-[11px] leading-snug text-ink-tertiary">
                  Examples for {level}
                  {storeServiceIssueSmartMode
                    ? ' (session mixes return, service issue, or product problem).'
                    : storeServiceIssueVariationLabel
                      ? ` — ${storeServiceIssueVariationLabel.toLowerCase()}.`
                      : '.'}
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-caption leading-snug text-ink-secondary">
                  {storeServiceIssuePrepPhrases.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {isWorkColleagueInteractionSelected && workColleaguePrepPhrases.length ? (
              <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 sm:px-3.5">
                <p className="text-caption font-semibold text-ink-primary">Warm-up phrases</p>
                <p className="mt-1 text-[11px] leading-snug text-ink-tertiary">
                  Examples for {level}
                  {workColleagueSmartMode
                    ? ' (work context, task, and conversation goal vary each run).'
                    : workColleagueVariationLabel
                      ? ` — ${workColleagueVariationLabel.toLowerCase()}.`
                      : '.'}
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-caption leading-snug text-ink-secondary">
                  {workColleaguePrepPhrases.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {isHousingLandlordSelected && housingLandlordPrepPhrases.length ? (
              <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 sm:px-3.5">
                <p className="text-caption font-semibold text-ink-primary">Warm-up phrases</p>
                <p className="mt-1 text-[11px] leading-snug text-ink-tertiary">
                  Examples for {level}
                  {housingLandlordSmartMode
                    ? ' (we vary the housing problem or contract topic so practice stays realistic).'
                    : housingLandlordVariationLabel
                      ? ` — ${housingLandlordVariationLabel.toLowerCase()}.`
                      : '.'}
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-caption leading-snug text-ink-secondary">
                  {housingLandlordPrepPhrases.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {isDoctorPharmacySelected && doctorPharmacyPrepPhrases.length ? (
              <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 sm:px-3.5">
                <p className="text-caption font-semibold text-ink-primary">Warm-up phrases</p>
                <p className="mt-1 text-[11px] leading-snug text-ink-tertiary">
                  Examples for {level}
                  {doctorPharmacySmartMode
                    ? ' (setting and focus vary each time — symptoms, help, or instructions).'
                    : doctorPharmacyVariationLabel
                      ? ` — ${doctorPharmacyVariationLabel.toLowerCase()}.`
                      : '.'}
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-caption leading-snug text-ink-secondary">
                  {doctorPharmacyPrepPhrases.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="mt-4 border-t border-[#E5E7EB]/80 pt-4">
            {launchHero ? (
              <div className="relative aspect-video max-h-[11rem] overflow-hidden rounded-2xl border border-[#E5E7EB] bg-slate-100 shadow-sm sm:max-h-[12rem]">
                <Image
                  src={launchHero.src}
                  alt={launchHero.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 32rem"
                  className="object-cover"
                />
              </div>
            ) : null}
            <button
              type="button"
              onClick={go}
              disabled={!href}
              className={clsx(
                'flex min-h-touch w-full items-center justify-center gap-2 rounded-2xl bg-[#6d28d9] px-4 py-3.5 text-body-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5b21b6] disabled:pointer-events-none disabled:opacity-40',
                launchHero ? 'mt-3' : 'mt-2'
              )}
            >
              Start {selectedLiveItem.title}
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </button>
            <p className="mt-1.5 text-center text-[12px] leading-snug text-[#64748B] sm:text-left">
              Recap when you wrap up.
            </p>
          </div>
        </Card>
      ) : selectedNonLiveItem?.type === 'coach_mode' ? (
        <Card
          variant="outlined"
          className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-[0_6px_28px_-18px_rgba(15,23,42,0.08)]"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F3E8FF] text-[#7C3AED] ring-1 ring-violet-100/80">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <span className="inline-flex rounded-full border border-violet-200/70 bg-[#F3E8FF] px-2.5 py-1 text-[11px] font-medium text-[#6D28D9]">
                Available now
              </span>
              <h2 className="mt-3 text-title font-semibold tracking-tight text-[#0F172A]">Language Coach</h2>
              <p className="mt-2 text-body-sm leading-snug text-[#475569]">
                Set your focus and level on the next screen—then speak freely with the same live voice stack you trust in
                scenarios.
              </p>
              <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-[#fafaf7]/50 p-3.5">
                <p className="text-caption font-semibold text-[#0F172A]">What you will feel</p>
                <p className="mt-1 text-caption leading-snug text-[#475569]">
                  Light nudges instead of constant interruption, memory of what you are working on, and a grounded recap
                  when you end the call.
                </p>
              </div>
              <Link
                href={APP_LANGUAGE_COACH}
                onClick={() => playAppSound('tap')}
                className="mt-5 inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-2xl bg-[#7C3AED] px-4 py-3 text-body-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#6D28D9]"
              >
                Continue to coach
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </Card>
      ) : selectedNonLiveItem ? (
        <Card
          variant="outlined"
          className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-[0_6px_28px_-18px_rgba(15,23,42,0.08)]"
        >
          <p className="text-xs font-medium text-[#64748B]">Preview</p>
          <h2 className="mt-1 text-[1.05rem] font-semibold tracking-tight text-[#0F172A]">{selectedNonLiveItem.title}</h2>
          <p className="mt-2 text-body-sm leading-snug text-[#475569]">{selectedNonLiveItem.goalsSummary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedNonLiveItem.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex rounded-full border border-[#E5E7EB] bg-slate-50/90 px-2.5 py-1 text-[11px] font-medium text-[#475569]"
              >
                {tag}
              </span>
            ))}
          </div>
          <button
            type="button"
            disabled
            className="mt-4 min-h-touch w-full rounded-2xl border border-[#E5E7EB] bg-slate-100 px-4 py-3 text-body-sm font-semibold text-[#94A3B8]"
          >
            Begin live conversation
          </button>
          <p className="mt-3 text-caption text-[#64748B]">Almost here—this scenario is still in production.</p>
        </Card>
      ) : null}
      </div>
    </div>
  )
}
