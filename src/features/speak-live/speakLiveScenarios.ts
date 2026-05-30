import { APP_LANGUAGE_COACH, APP_SPEAK_LIVE_RUN, speakLiveRunHref } from '@/lib/routing/appRoutes'

/** Speak Live / API scenario slug for adaptive free-form coaching. */
export const LANGUAGE_COACH_SCENARIO_ID = 'language_coach' as const

/** Card / catalog hero for Language Coach (female coach in frame; default assistant presentation is female). */
export const LANGUAGE_COACH_DEFAULT_HERO_SRC = '/speak-live/language-coach-f-hero.png' as const

import {
  resolveBookingReservationsSpeakLiveVisual,
  resolveDirectionsSpeakLiveVisual,
  resolveDoctorPharmacySpeakLiveVisual,
  resolveHousingLandlordSpeakLiveVisual,
  resolveStoreServiceIssueSpeakLiveVisual,
  resolveSupermarketShopSpeakLiveVisual,
  resolveWorkColleagueInteractionSpeakLiveVisual,
} from '@/lib/practice/scenarioImageRegistry'

export const SPEAK_LIVE_LEVELS = ['A1', 'A2', 'B1'] as const

export type SpeakLiveLevel = (typeof SPEAK_LIVE_LEVELS)[number]
export type SpeakLiveAvailability = 'live' | 'coming_soon'
export type SpeakLiveCatalogItemType = 'scenario' | 'coach_mode'
export type SpeakLiveScenarioAccent = 'emerald' | 'amber' | 'sky' | 'violet' | 'rose' | 'slate'
export type SpeakLiveScenarioIcon =
  | 'train'
  | 'coffee'
  | 'shopping_cart'
  | 'map'
  | 'calendar'
  | 'stethoscope'
  | 'briefcase'
  | 'home'
  | 'wrench'
  | 'phone'
  | 'message_circle'
  | 'users'
  | 'sparkles'

export const ORDERING_FOOD_SCENARIO_ID = 'ordering_food' as const
export const ORDERING_FOOD_SETTING_OPTIONS = [
  { id: 'cafe', label: 'Café' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'takeaway', label: 'Takeaway' },
] as const
export const ORDERING_FOOD_FOCUS_OPTIONS = [
  { id: 'simple', label: 'Simple order' },
  { id: 'dietary', label: 'Dietary request' },
  { id: 'recommendation', label: 'Ask recommendation' },
] as const

export type OrderingFoodScenarioSetting = (typeof ORDERING_FOOD_SETTING_OPTIONS)[number]['id']
export type OrderingFoodScenarioFocus = (typeof ORDERING_FOOD_FOCUS_OPTIONS)[number]['id']
export type OrderingFoodScenarioOverrides = {
  subType?: OrderingFoodScenarioSetting
  variation?: OrderingFoodScenarioFocus | 'simple_order' | 'dietary_request'
}

export const SUPERMARKET_SHOP_SCENARIO_ID = 'supermarket_shop' as const

export const SUPERMARKET_SHOP_SETTING_OPTIONS = [
  { id: 'supermarket', label: 'Supermarket' },
  { id: 'convenience_store', label: 'Convenience store' },
  { id: 'general_retail', label: 'Shop' },
  { id: 'pharmacy_style', label: 'Pharmacy-style shop' },
] as const

export const SUPERMARKET_SHOP_FOCUS_OPTIONS = [
  { id: 'asking_where_something_is', label: 'Ask where something is' },
  { id: 'paying_checkout', label: 'Paying / checkout talk' },
  { id: 'product_questions', label: 'Product questions' },
] as const

export type SupermarketShopScenarioSetting = (typeof SUPERMARKET_SHOP_SETTING_OPTIONS)[number]['id']
export type SupermarketShopScenarioFocus = (typeof SUPERMARKET_SHOP_FOCUS_OPTIONS)[number]['id']
export type SupermarketShopScenarioOverrides = {
  subType?: SupermarketShopScenarioSetting
  variation?: SupermarketShopScenarioFocus
}

/** Default card / smart-mode hero — same asset as {@link SCENARIO_IMAGE_REGISTRY.supermarket_shop}. */
export const SUPERMARKET_SHOP_DEFAULT_HERO_SRC = resolveSupermarketShopSpeakLiveVisual({ smartMode: true }).heroSrc

export function getSupermarketShopSpeakLiveHeroSrc(options: {
  smartMode?: boolean
  subType?: SupermarketShopScenarioSetting
  variation?: SupermarketShopScenarioFocus
}): string {
  return resolveSupermarketShopSpeakLiveVisual({
    smartMode: options.smartMode,
    subType: options.subType,
    variation: options.variation,
  }).heroSrc
}

export function getSupermarketShopSpeakLiveHeroAlt(options: {
  smartMode?: boolean
  subType?: SupermarketShopScenarioSetting
  variation?: SupermarketShopScenarioFocus
}): string {
  return resolveSupermarketShopSpeakLiveVisual({
    smartMode: options.smartMode,
    subType: options.subType,
    variation: options.variation,
  }).altEn
}

export function inferSupermarketShopSettingFromDutchContext(text: string | null | undefined): SupermarketShopScenarioSetting | null {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return null
  if (/\bapotheek|drogist|medicijn|recept|paracetamol\b/i.test(t)) return 'pharmacy_style'
  if (/\bavondwinkel|buurtwinkel|kleine winkel\b/i.test(t)) return 'convenience_store'
  if (/\bsupermarkt|gangpad|ah\b|jumbo\b|kassa\b/i.test(t)) return 'supermarket'
  if (/\bwinkel\b/i.test(t)) return 'general_retail'
  return null
}

/** Infer task focus from runtime Dutch context when the launch URL has no `variation`. */
export function inferSupermarketShopFocusFromDutchContext(text: string | null | undefined): SupermarketShopScenarioFocus | null {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return null
  if (/\bkassa|bonnetje|pinnen|betalen|totaal|contactloos|statiegeld\b/i.test(t)) return 'paying_checkout'
  if (/\bvegetarisch|zonder suiker|goedkoper|ingrediënten|variant|huismerk|allergie\b/i.test(t)) return 'product_questions'
  if (/\bgangpad|schap|waar (ligt|staat|vind)|zoekt u\b/i.test(t)) return 'asking_where_something_is'
  return null
}

export function resolveSupermarketShopSpeakLiveBackdropSrc(input: {
  subTypeFromUrl?: SupermarketShopScenarioSetting
  variationFromUrl?: SupermarketShopScenarioFocus
  scenarioContext?: string | null
}): string {
  const inferredFocus = inferSupermarketShopFocusFromDutchContext(input.scenarioContext)
  const inferredSetting = inferSupermarketShopSettingFromDutchContext(input.scenarioContext)
  const variation = input.variationFromUrl ?? inferredFocus ?? undefined
  const subType = input.subTypeFromUrl ?? inferredSetting ?? 'supermarket'
  return resolveSupermarketShopSpeakLiveVisual({
    smartMode: false,
    subType,
    variation,
  }).heroSrc
}

export function resolveSupermarketShopSettingForSession(input: {
  subTypeFromUrl?: SupermarketShopScenarioSetting
  scenarioContext?: string | null
}): SupermarketShopScenarioSetting {
  return input.subTypeFromUrl ?? inferSupermarketShopSettingFromDutchContext(input.scenarioContext) ?? 'supermarket'
}

export function resolveSupermarketShopFocusForSession(input: {
  variationFromUrl?: SupermarketShopScenarioFocus
  scenarioContext?: string | null
}): SupermarketShopScenarioFocus | undefined {
  return input.variationFromUrl ?? inferSupermarketShopFocusFromDutchContext(input.scenarioContext) ?? undefined
}

export const SUPERMARKET_SHOP_LIVE_CARD_COPY: Record<
  SupermarketShopScenarioSetting,
  { kicker: string; body: string }
> = {
  supermarket: {
    kicker: 'Supermarkt',
    body: 'Je oefent korte, echte winkelzinnetjes. Gebruik de microfoon hieronder of Ondertiteling om het gesprek te lezen.',
  },
  convenience_store: {
    kicker: 'Buurtwinkel',
    body: 'Korte, duidelijke vragen en antwoorden — alsof je bij de buurtwinkel staat.',
  },
  pharmacy_style: {
    kicker: 'Drogist / apotheek',
    body: 'Rustig en duidelijk formuleren bij de balie. Microfoon of Ondertiteling.',
  },
  general_retail: {
    kicker: 'Winkel',
    body: 'Praktische winkelzinnetjes; spreek rustig in de microfoon of lees mee via Ondertiteling.',
  },
}

export const DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID = 'directions_getting_somewhere' as const

export const DIRECTIONS_DESTINATION_OPTIONS = [
  { id: 'station', label: 'Station' },
  { id: 'bus_stop', label: 'Bus stop' },
  { id: 'tram_stop', label: 'Tram stop' },
  { id: 'platform_exit_entrance', label: 'Platform / exit' },
  { id: 'supermarket', label: 'Supermarket' },
  { id: 'pharmacy', label: 'Pharmacy' },
  { id: 'toilet', label: 'Toilet' },
  { id: 'town_hall', label: 'Town hall (gemeente)' },
  { id: 'office_address', label: 'Office / address' },
  { id: 'city_centre', label: 'City centre' },
  { id: 'museum', label: 'Museum' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'cafe', label: 'Café' },
  { id: 'hotel', label: 'Hotel' },
] as const

export const DIRECTIONS_VARIATION_OPTIONS = [
  { id: 'asking_for_directions', label: 'Ask for directions' },
  { id: 'understanding_instructions', label: 'Follow instructions' },
  { id: 'confirming_route', label: 'Confirm the route' },
] as const

export type DirectionsGettingSomewhereDestination = (typeof DIRECTIONS_DESTINATION_OPTIONS)[number]['id']
export type DirectionsGettingSomewhereVariation = (typeof DIRECTIONS_VARIATION_OPTIONS)[number]['id']
export type DirectionsGettingSomewhereOverrides = {
  subType?: DirectionsGettingSomewhereDestination
  variation?: DirectionsGettingSomewhereVariation
}

export const DIRECTIONS_DEFAULT_HERO_SRC = resolveDirectionsSpeakLiveVisual({ smartMode: true }).heroSrc

export function inferDirectionsDestinationFromDutchContext(text: string | null | undefined): DirectionsGettingSomewhereDestination | null {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return null
  if (/\b(bus|bushalte)\b/i.test(t)) return 'bus_stop'
  if (/\b(tram|tramhalte)\b/i.test(t)) return 'tram_stop'
  if (/\b(supermarkt|ah\b|jumbo)\b/i.test(t)) return 'supermarket'
  /** Specific POIs before generic “centrum” so e.g. “apotheek … in het centrum” maps to pharmacy. */
  if (/\b(apotheek|drogist)\b/i.test(t)) return 'pharmacy'
  if (/\b(wc|toilet)\b/i.test(t)) return 'toilet'
  if (/\b(museum)\b/i.test(t)) return 'museum'
  if (/\b(kantoor|adres)\b/i.test(t)) return 'office_address'
  if (/\b(perrong|uitgang|ingang)\b/i.test(t)) return 'platform_exit_entrance'
  if (/\b(station|trein)\b/i.test(t)) return 'station'
  if (/\b(gemeente|gemeentehuis|stadhuis)\b/i.test(t)) return 'town_hall'
  if (/\b(restaurant)\b/i.test(t)) return 'restaurant'
  if (/\b(café|cafe)\b/i.test(t)) return 'cafe'
  if (/\b(hotel)\b/i.test(t)) return 'hotel'
  if (/\b(centrum|binnenstad)\b/i.test(t)) return 'city_centre'
  return null
}

export function inferDirectionsVariationFromDutchContext(text: string | null | undefined): DirectionsGettingSomewhereVariation | null {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return null
  if (/\b(dus|eerst|dan|klopt dat|bevestig|herhaal even)\b/i.test(t)) return 'confirming_route'
  if (/\b(rechtdoor|links|rechts|stoplicht|tweede straat|minuten)\b/i.test(t) && !/\?/.test(t)) return 'understanding_instructions'
  if (/\b(waar is|hoe kom ik|route|waar kan ik)\b/i.test(t)) return 'asking_for_directions'
  return null
}

export function resolveDirectionsSpeakLiveBackdropSrc(input: {
  subTypeFromUrl?: DirectionsGettingSomewhereDestination
  variationFromUrl?: DirectionsGettingSomewhereVariation
  scenarioContext?: string | null
}): string {
  const inferredDest = inferDirectionsDestinationFromDutchContext(input.scenarioContext)
  const sub = input.subTypeFromUrl ?? inferredDest ?? undefined
  return resolveDirectionsSpeakLiveVisual({
    smartMode: !sub,
    subType: sub,
  }).heroSrc
}

export function resolveDirectionsDestinationForSession(input: {
  subTypeFromUrl?: DirectionsGettingSomewhereDestination
  scenarioContext?: string | null
}): DirectionsGettingSomewhereDestination {
  return input.subTypeFromUrl ?? inferDirectionsDestinationFromDutchContext(input.scenarioContext) ?? 'station'
}

export function resolveDirectionsVariationForSession(input: {
  variationFromUrl?: DirectionsGettingSomewhereVariation
  scenarioContext?: string | null
}): DirectionsGettingSomewhereVariation | undefined {
  return input.variationFromUrl ?? inferDirectionsVariationFromDutchContext(input.scenarioContext) ?? undefined
}

export const DIRECTIONS_LIVE_CARD_COPY: Record<
  DirectionsGettingSomewhereDestination,
  { kicker: string; body: string }
> = {
  station: {
    kicker: 'Station',
    body: 'Vraag de weg of bevestig de route — spreek in de microfoon of gebruik Ondertiteling om mee te lezen.',
  },
  bus_stop: {
    kicker: 'Bushalte',
    body: 'Korte, duidelijke zinnen zoals op straat in Nederland.',
  },
  tram_stop: {
    kicker: 'Tram',
    body: 'Tram en overstap: luister goed en bevestig kort wat je hoort.',
  },
  supermarket: {
    kicker: 'Supermarkt',
    body: 'Je zoekt de weg naar de winkel — hou het gesprek praktisch.',
  },
  city_centre: {
    kicker: 'Centrum',
    body: 'In het centrum: duidelijke bestemming en beleefd vragen.',
  },
  pharmacy: {
    kicker: 'Apotheek',
    body: 'Vraag waar de apotheek is en bevestig de route.',
  },
  toilet: {
    kicker: 'WC',
    body: 'Een korte, directe vraag — typisch in een openbaar gebouw.',
  },
  museum: {
    kicker: 'Museum',
    body: 'Culturele bestemming: vraag en bevestig de looproute.',
  },
  office_address: {
    kicker: 'Kantoor',
    body: 'Adres en ingang: let op straatnamen en oriëntatiepunten.',
  },
  platform_exit_entrance: {
    kicker: 'Perron / uitgang',
    body: 'Stationsgebied: korte bevestiging en duidelijke vervolgvraag.',
  },
  town_hall: {
    kicker: 'Gemeente',
    body: 'Naar het stadhuis of loket: korte, duidelijke vraag en route.',
  },
  restaurant: {
    kicker: 'Restaurant',
    body: 'Eten buiten de deur: vraag de weg en bevestig de hoek of straat.',
  },
  cafe: {
    kicker: 'Café',
    body: 'Korte vraag zoals bij een terras of stadscafé.',
  },
  hotel: {
    kicker: 'Hotel',
    body: 'Adres of ingang: let op straatnamen en herkenningspunten.',
  },
}

export const BOOKING_RESERVATIONS_SCENARIO_ID = 'booking_reservations' as const

export const BOOKING_RESERVATIONS_SUBTYPE_OPTIONS = [
  { id: 'restaurant_booking', label: 'Restaurant' },
  { id: 'hairdresser_booking', label: 'Hairdresser' },
  { id: 'appointment_booking', label: 'Appointment' },
] as const

export const BOOKING_RESERVATIONS_VARIATION_OPTIONS = [
  { id: 'asking_availability', label: 'Ask availability' },
  { id: 'making_booking', label: 'Make booking' },
  { id: 'confirming_details', label: 'Confirm details' },
] as const

/** Full set (API / deep links); launcher shows {@link BOOKING_RESERVATIONS_DETAIL_FOCUS_LAUNCHER_OPTIONS} only. */
export const BOOKING_RESERVATIONS_DETAIL_FOCUS_OPTIONS = [
  { id: 'time_day', label: 'Time / day' },
  { id: 'party_size', label: 'Number of people' },
  { id: 'service_type', label: 'Service' },
  { id: 'name', label: 'Name confirmation' },
  { id: 'stylist', label: 'Stylist preference' },
  { id: 'outdoor', label: 'Indoor / outdoor' },
  { id: 'reason', label: 'Reason for visit' },
] as const

/** Speak Live launcher: four high-signal focuses (matches product copy). */
export const BOOKING_RESERVATIONS_DETAIL_FOCUS_LAUNCHER_OPTIONS = [
  { id: 'time_day', label: 'Time / day' },
  { id: 'party_size', label: 'Number of people' },
  { id: 'service_type', label: 'Service' },
  { id: 'name', label: 'Name confirmation' },
] as const

export type BookingReservationsScenarioSubtype = (typeof BOOKING_RESERVATIONS_SUBTYPE_OPTIONS)[number]['id']
export type BookingReservationsScenarioVariation = (typeof BOOKING_RESERVATIONS_VARIATION_OPTIONS)[number]['id']
export type BookingReservationsDetailFocusId = (typeof BOOKING_RESERVATIONS_DETAIL_FOCUS_OPTIONS)[number]['id']

export type BookingReservationsScenarioOverrides = {
  subType?: BookingReservationsScenarioSubtype
  variation?: BookingReservationsScenarioVariation
  detailFocus?: BookingReservationsDetailFocusId
}

export const BOOKING_RESERVATIONS_DEFAULT_HERO_SRC = resolveBookingReservationsSpeakLiveVisual({ smartMode: true }).heroSrc

export function getBookingReservationsSpeakLiveHeroSrc(options: {
  smartMode?: boolean
  subType?: BookingReservationsScenarioSubtype
  variation?: BookingReservationsScenarioVariation
}): string {
  return resolveBookingReservationsSpeakLiveVisual({
    smartMode: options.smartMode,
    subType: options.subType,
    variation: options.variation,
  }).heroSrc
}

export function getBookingReservationsSpeakLiveHeroAlt(options: {
  smartMode?: boolean
  subType?: BookingReservationsScenarioSubtype
  variation?: BookingReservationsScenarioVariation
}): string {
  return resolveBookingReservationsSpeakLiveVisual({
    smartMode: options.smartMode,
    subType: options.subType,
    variation: options.variation,
  }).altEn
}

export function inferBookingReservationsSubtypeFromDutchContext(text: string | null | undefined): BookingReservationsScenarioSubtype | null {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return null
  if (/\b(kapper|kapsalon|knippen|trim|wassen|föhn|knipafspraak)\b/i.test(t)) return 'hairdresser_booking'
  if (/\b(restaurant|tafel|reserveren|terras|diner)\b/i.test(t)) return 'restaurant_booking'
  /** Avoid bare "afspraak" — it appears in generic booking starters for every subtype and misclassified restaurant runs. */
  if (/\b(huisarts|gemeente|balie|consult|bezichtiging|document|intake|balieafspraak)\b/i.test(t)) return 'appointment_booking'
  return null
}

/** Reads `Variatie:` lines from runtime Dutch `scenarioContext` when the launch URL has no `variation`. */
export function inferBookingReservationsVariationFromScenarioContext(
  text: string | null | undefined
): BookingReservationsScenarioVariation | undefined {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return undefined
  if (t.includes('variatie: details bevestigen')) return 'confirming_details'
  if (t.includes('variatie: reservering / afspraak maken')) return 'making_booking'
  if (t.includes('variatie: beschikbaarheid vragen')) return 'asking_availability'
  return undefined
}

export function resolveBookingReservationsSpeakLiveBackdropSrc(input: {
  subTypeFromUrl?: BookingReservationsScenarioSubtype
  variationFromUrl?: BookingReservationsScenarioVariation
  scenarioContext?: string | null
}): string {
  /** When neither is in the launch URL, runtime mixes venue/task each session — use smart hero rules (not `making_booking` default). */
  const urlPinsBookingHero = Boolean(input.subTypeFromUrl || input.variationFromUrl)
  const inferred = inferBookingReservationsSubtypeFromDutchContext(input.scenarioContext)
  const variation =
    input.variationFromUrl ?? inferBookingReservationsVariationFromScenarioContext(input.scenarioContext) ?? undefined
  /** Do not default to restaurant when only `variation` is pinned — keeps hero neutral until subtype is known or inferred. */
  const subForVisual =
    input.subTypeFromUrl ?? (urlPinsBookingHero ? (inferred ?? undefined) : undefined) ?? null
  return resolveBookingReservationsSpeakLiveVisual({
    smartMode: !urlPinsBookingHero,
    subType: subForVisual,
    variation: variation ?? null,
  }).heroSrc
}

export function resolveBookingReservationsSubtypeForSession(input: {
  subTypeFromUrl?: BookingReservationsScenarioSubtype
  scenarioContext?: string | null
}): BookingReservationsScenarioSubtype {
  return input.subTypeFromUrl ?? inferBookingReservationsSubtypeFromDutchContext(input.scenarioContext) ?? 'restaurant_booking'
}

export const BOOKING_RESERVATIONS_LIVE_CARD_COPY: Record<
  BookingReservationsScenarioSubtype,
  { kicker: string; body: string }
> = {
  restaurant_booking: {
    kicker: 'Restaurant',
    body: 'Reserveer een tafel — korte, duidelijke zinnen; microfoon of Ondertiteling.',
  },
  hairdresser_booking: {
    kicker: 'Kapsalon',
    body: 'Afspraak en dienst — spreek rustig in het Nederlands.',
  },
  appointment_booking: {
    kicker: 'Balie / afspraak',
    body: 'Formeler en praktisch: tijd, reden en bevestiging.',
  },
}

/** Hero overlay when launcher did not pin `subType`/`variation` (mixed smart session) — avoids “Restaurant” on a neutral desk photo. */
export const BOOKING_RESERVATIONS_SMART_MIX_CARD_COPY = {
  kicker: 'Reserveren',
  body: 'Beschikbaarheid, tafel of afspraak — korte zinnen; microfoon of Ondertiteling.',
} as const

export const STORE_SERVICE_ISSUE_SCENARIO_ID = 'store_service_issue' as const

export const STORE_SERVICE_ISSUE_SUBTYPE_OPTIONS = [
  { id: 'store_return', label: 'Return' },
  { id: 'service_issue', label: 'Service issue' },
  { id: 'product_problem', label: 'Product problem' },
] as const

export const STORE_SERVICE_ISSUE_VARIATION_OPTIONS = [
  { id: 'returning_item', label: 'Returning item' },
  { id: 'complaint', label: 'Complaint' },
  { id: 'explaining_issue', label: 'Explaining issue' },
] as const

export const STORE_SERVICE_ISSUE_DETAIL_FOCUS_OPTIONS = [
  { id: 'too_small', label: 'Wrong size (too small)' },
  { id: 'too_big', label: 'Wrong size (too big)' },
  { id: 'wrong_color', label: 'Wrong color' },
  { id: 'wrong_item_received', label: 'Wrong item' },
  { id: 'delayed_order', label: 'Late order' },
  { id: 'incomplete_order', label: 'Incomplete order' },
  { id: 'broken', label: 'Broken item' },
  { id: 'damaged', label: 'Damaged product' },
  { id: 'missing_part', label: 'Missing part' },
  { id: 'prefer_exchange', label: 'Refund / exchange' },
] as const

/** Speak Live launcher: optional issue bias (subset of {@link STORE_SERVICE_ISSUE_DETAIL_FOCUS_OPTIONS}). */
export const STORE_SERVICE_ISSUE_DETAIL_FOCUS_LAUNCHER_OPTIONS = [
  { id: 'too_small', label: 'Wrong size' },
  { id: 'wrong_item_received', label: 'Wrong item' },
  { id: 'damaged', label: 'Damaged' },
  { id: 'missing_part', label: 'Missing part' },
  { id: 'delayed_order', label: 'Late order' },
  { id: 'prefer_exchange', label: 'Refund / exchange' },
] as const

export type StoreServiceIssueScenarioSubtype = (typeof STORE_SERVICE_ISSUE_SUBTYPE_OPTIONS)[number]['id']
export type StoreServiceIssueScenarioVariation = (typeof STORE_SERVICE_ISSUE_VARIATION_OPTIONS)[number]['id']
export type StoreServiceIssueDetailFocusId = (typeof STORE_SERVICE_ISSUE_DETAIL_FOCUS_OPTIONS)[number]['id']

export type StoreServiceIssueScenarioOverrides = {
  subType?: StoreServiceIssueScenarioSubtype
  variation?: StoreServiceIssueScenarioVariation
  detailFocus?: StoreServiceIssueDetailFocusId
}

export const STORE_SERVICE_ISSUE_DEFAULT_HERO_SRC = resolveStoreServiceIssueSpeakLiveVisual({
  smartMode: true,
  assistantPresentation: 'female',
}).heroSrc

export function getStoreServiceIssueSpeakLiveHeroSrc(options: {
  smartMode?: boolean
  subType?: StoreServiceIssueScenarioSubtype
  variation?: StoreServiceIssueScenarioVariation
  /** Aligns hero focal staff with Speak Live TTS voice; launcher defaults to female preview. */
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolveStoreServiceIssueSpeakLiveVisual({
    smartMode: options.smartMode,
    subType: options.subType,
    variation: options.variation,
    assistantPresentation: options.assistantPresentation ?? 'female',
  }).heroSrc
}

export function getStoreServiceIssueSpeakLiveHeroAlt(options: {
  smartMode?: boolean
  subType?: StoreServiceIssueScenarioSubtype
  variation?: StoreServiceIssueScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolveStoreServiceIssueSpeakLiveVisual({
    smartMode: options.smartMode,
    subType: options.subType,
    variation: options.variation,
    assistantPresentation: options.assistantPresentation ?? 'female',
  }).altEn
}

export const STORE_SERVICE_ISSUE_LIVE_CARD_COPY: Record<
  StoreServiceIssueScenarioSubtype,
  { kicker: string; body: string }
> = {
  store_return: {
    kicker: 'Retour',
    body: 'Bon, reden, ruilen of terug — korte zinnen; microfoon of Ondertiteling.',
  },
  service_issue: {
    kicker: 'Service',
    body: 'Bestelling of afhalen — rustig uitleggen wat misging.',
  },
  product_problem: {
    kicker: 'Product',
    body: 'Defect of schade — duidelijk beschrijven wat er mis is.',
  },
}

export const STORE_SERVICE_ISSUE_SMART_MIX_CARD_COPY = {
  kicker: 'Winkel / service',
  body: 'Retour, klacht of defect — willekeurige mix per sessie.',
} as const

export const WORK_COLLEAGUE_INTERACTION_SCENARIO_ID = 'work_colleague_interaction' as const

export const WORK_COLLEAGUE_SUBTYPE_OPTIONS = [
  { id: 'colleague_chat', label: 'Colleague chat' },
  { id: 'team_task', label: 'Team task' },
  { id: 'manager_or_lead_request', label: 'Manager / lead' },
] as const

export const WORK_COLLEAGUE_VARIATION_OPTIONS = [
  { id: 'simple_workplace_conversation', label: 'Simple workplace conversation' },
  { id: 'asking_for_help', label: 'Asking for help' },
  { id: 'clarifying_tasks', label: 'Clarifying tasks' },
] as const

export const WORK_COLLEAGUE_TASK_FOCUS_OPTIONS = [
  { id: 'document', label: 'Document' },
  { id: 'email', label: 'Email' },
  { id: 'presentation', label: 'Presentation' },
  { id: 'meeting_note', label: 'Meeting notes' },
  { id: 'task_ticket', label: 'Task / ticket' },
  { id: 'report', label: 'Report' },
  { id: 'planning', label: 'Planning' },
  { id: 'spreadsheet', label: 'Spreadsheet' },
  { id: 'file_folder', label: 'File / folder' },
  { id: 'approval_request', label: 'Approval' },
] as const

/** Launcher-only subset: maps to `detailFocus` ids (deadline → `planning` in runtime). */
export const WORK_COLLEAGUE_TASK_FOCUS_LAUNCHER_OPTIONS = [
  { id: 'document', label: 'Document' },
  { id: 'email', label: 'Email' },
  { id: 'meeting_note', label: 'Meeting' },
  { id: 'report', label: 'Report' },
  { id: 'planning', label: 'Deadline' },
  { id: 'presentation', label: 'Presentation' },
  { id: 'file_folder', label: 'File / folder' },
] as const

export type WorkColleagueScenarioSubtype = (typeof WORK_COLLEAGUE_SUBTYPE_OPTIONS)[number]['id']
export type WorkColleagueScenarioVariation = (typeof WORK_COLLEAGUE_VARIATION_OPTIONS)[number]['id']
export type WorkColleagueTaskFocusId = (typeof WORK_COLLEAGUE_TASK_FOCUS_OPTIONS)[number]['id']

export type WorkColleagueScenarioOverrides = {
  subType?: WorkColleagueScenarioSubtype
  variation?: WorkColleagueScenarioVariation
  detailFocus?: WorkColleagueTaskFocusId
}

export const WORK_COLLEAGUE_DEFAULT_HERO_SRC = resolveWorkColleagueInteractionSpeakLiveVisual({
  smartMode: true,
  assistantPresentation: 'female',
}).heroSrc

export function getWorkColleagueSpeakLiveHeroSrc(options: {
  smartMode?: boolean
  subType?: WorkColleagueScenarioSubtype
  variation?: WorkColleagueScenarioVariation
  /** Aligns focal colleague with Speak Live TTS voice; launcher preview defaults to female. */
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolveWorkColleagueInteractionSpeakLiveVisual({
    smartMode: options.smartMode,
    subType: options.subType,
    variation: options.variation,
    assistantPresentation: options.assistantPresentation ?? 'female',
  }).heroSrc
}

export function getWorkColleagueSpeakLiveHeroAlt(options: {
  smartMode?: boolean
  subType?: WorkColleagueScenarioSubtype
  variation?: WorkColleagueScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolveWorkColleagueInteractionSpeakLiveVisual({
    smartMode: options.smartMode,
    subType: options.subType,
    variation: options.variation,
    assistantPresentation: options.assistantPresentation ?? 'female',
  }).altEn
}

export const WORK_COLLEAGUE_LIVE_CARD_COPY: Record<WorkColleagueScenarioSubtype, { kicker: string; body: string }> = {
  colleague_chat: {
    kicker: 'Collega',
    body: 'Korte, informele maar professionele werkpraat — microfoon of Ondertiteling.',
  },
  team_task: {
    kicker: 'Team',
    body: 'Taak en volgende stap — duidelijk en kort in het Nederlands.',
  },
  manager_or_lead_request: {
    kicker: 'Leiding',
    body: 'Rustige afstemming met je leidinggevende — geen drama, wel duidelijkheid.',
  },
}

export const WORK_COLLEAGUE_SMART_MIX_CARD_COPY = {
  kicker: 'Werk',
  body: 'Collega, team of lead — willekeurige mix per sessie.',
} as const

export const HOUSING_LANDLORD_SCENARIO_ID = 'housing_landlord' as const

export const HOUSING_LANDLORD_SUBTYPE_OPTIONS = [
  { id: 'landlord', label: 'Landlord' },
  { id: 'rental_agency', label: 'Rental agency' },
  { id: 'building_manager', label: 'Building manager' },
] as const

export const HOUSING_LANDLORD_VARIATION_OPTIONS = [
  { id: 'reporting_issue', label: 'Reporting issue' },
  { id: 'asking_rent_contract', label: 'Asking about rent / contract' },
] as const

/** Curated launcher topics (maps to backend `detailFocus` + `variation`). */
export const HOUSING_LANDLORD_LAUNCH_TOPIC_OPTIONS = [
  { id: 'heating', label: 'Heating', variation: 'reporting_issue' as const },
  { id: 'leak', label: 'Leak', variation: 'reporting_issue' as const },
  { id: 'broken_shower', label: 'Shower', variation: 'reporting_issue' as const },
  { id: 'rent_due_date', label: 'Rent', variation: 'asking_rent_contract' as const },
  { id: 'deposit_borg', label: 'Deposit', variation: 'asking_rent_contract' as const },
  { id: 'contract_duration', label: 'Contract', variation: 'asking_rent_contract' as const },
  { id: 'notice_period', label: 'Notice period', variation: 'asking_rent_contract' as const },
  { id: 'maintenance_responsibility', label: 'Maintenance', variation: 'asking_rent_contract' as const },
] as const

export const HOUSING_LANDLORD_ISSUE_FOCUS_OPTIONS = [
  { id: 'heating', label: 'Heating / warm water' },
  { id: 'leak', label: 'Leak' },
  { id: 'broken_shower', label: 'Shower' },
  { id: 'electricity_light', label: 'Lights / power' },
  { id: 'window_door', label: 'Window / door' },
  { id: 'washing_machine', label: 'Washing machine' },
  { id: 'mold_moisture', label: 'Mold / moisture' },
  { id: 'noise_building_simple', label: 'Building noise' },
  { id: 'internet_simple', label: 'Internet / wifi' },
] as const

export const HOUSING_LANDLORD_CONTRACT_FOCUS_OPTIONS = [
  { id: 'rent_due_date', label: 'Rent due date' },
  { id: 'deposit_borg', label: 'Deposit (borg)' },
  { id: 'notice_period', label: 'Notice period' },
  { id: 'contract_duration', label: 'Contract length' },
  { id: 'utilities_included', label: 'What’s included' },
  { id: 'maintenance_responsibility', label: 'Who fixes what' },
  { id: 'payment_method', label: 'Payment method' },
  { id: 'rent_change_simple', label: 'Rent change (simple)' },
] as const

export type HousingLandlordScenarioSubtype = (typeof HOUSING_LANDLORD_SUBTYPE_OPTIONS)[number]['id']
export type HousingLandlordScenarioVariation = (typeof HOUSING_LANDLORD_VARIATION_OPTIONS)[number]['id']
export type HousingLandlordDetailFocusId =
  | (typeof HOUSING_LANDLORD_ISSUE_FOCUS_OPTIONS)[number]['id']
  | (typeof HOUSING_LANDLORD_CONTRACT_FOCUS_OPTIONS)[number]['id']

export type HousingLandlordScenarioOverrides = {
  subType?: HousingLandlordScenarioSubtype
  variation?: HousingLandlordScenarioVariation
  detailFocus?: HousingLandlordDetailFocusId
}

export const PHONE_CALL_SCENARIO_ID = 'phone_call' as const

export const SMALL_TALK_SCENARIO_ID = 'small_talk' as const

export const SMALL_TALK_SUBTYPE_OPTIONS = [
  { id: 'meeting_someone', label: 'Meeting someone' },
  { id: 'casual_chat', label: 'Casual chat' },
  { id: 'social_checkin', label: 'Social check-in' },
] as const

export const SMALL_TALK_VARIATION_OPTIONS = [
  { id: 'meeting_someone', label: 'Introductions' },
  { id: 'talking_about_weekend', label: 'Weekend' },
  { id: 'talking_about_weather', label: 'Weather' },
] as const

export type SmallTalkScenarioSubtype = (typeof SMALL_TALK_SUBTYPE_OPTIONS)[number]['id']
export type SmallTalkScenarioVariation = (typeof SMALL_TALK_VARIATION_OPTIONS)[number]['id']

export type SmallTalkScenarioOverrides = {
  subType?: SmallTalkScenarioSubtype
  variation?: SmallTalkScenarioVariation
}

export const SMALL_TALK_SMART_MIX_CARD_COPY = {
  kicker: 'Small talk',
  body:
    'Laagdruk: kort praten, natuurlijk doorvragen, en foutjes mogen. Tip: houd het gesprek levend met een mini-reactie plus een kleine vraag.',
} as const

export const SMALL_TALK_LIVE_CARD_COPY: Record<SmallTalkScenarioVariation, { kicker: string; body: string }> = {
  meeting_someone: {
    kicker: 'Ontmoeting',
    body: 'Je oefent een eerste kennismaking — korte vragen, even nadenken hardop, en een natuurlijke reactie terug.',
  },
  talking_about_weekend: {
    kicker: 'Weekend',
    body: 'Terugblik of plannen — blijf menselijk: mini-reactie, kleine vraag, geen interview.',
  },
  talking_about_weather: {
    kicker: 'Weer',
    body: 'Klassieke opener, dan zacht door naar iets persoonlijks — kort en gezellig.',
  },
}

/** Filename slug under `/public/speak-live/small-talk-{id}-{m|f}-hero.png`. */
export type SmallTalkSpeakLiveVisualId = 'meeting' | 'weekend' | 'weather'

function smallTalkVisualIdFromVariation(variation: SmallTalkScenarioVariation | undefined): SmallTalkSpeakLiveVisualId {
  if (variation === 'talking_about_weather') return 'weather'
  if (variation === 'talking_about_weekend') return 'weekend'
  return 'meeting'
}

/**
 * Reads runtime scenario context (Dutch “Variatie A/B/C …” lines) to recover the practice variation for heroes.
 */
export function inferSmallTalkVariationFromScenarioContext(text: string | null | undefined): SmallTalkScenarioVariation | undefined {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return undefined
  if (t.includes('variatie c') || t.includes('talking_about_weather') || t.includes('weer als opener')) {
    return 'talking_about_weather'
  }
  if (t.includes('variatie b') || t.includes('talking_about_weekend') || t.includes('weekend plannen')) {
    return 'talking_about_weekend'
  }
  if (t.includes('variatie a') || t.includes('meeting_someone') || t.includes('iemand ontmoeten')) {
    return 'meeting_someone'
  }
  return undefined
}

/**
 * Photoreal “you’re talking with someone” heroes: each practice variation has male + female assets,
 * selected from {@link assistantPresentation} so the portrait matches TTS voice gender.
 */
export function resolveSmallTalkSpeakLiveVisual(options: {
  variation?: SmallTalkScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): { heroSrc: string; altEn: string } {
  const vid = smallTalkVisualIdFromVariation(options.variation)
  const gender = options.assistantPresentation === 'male' ? 'm' : 'f'
  const heroSrc = `/speak-live/small-talk-${vid}-${gender}-hero.png`
  const scene =
    vid === 'meeting'
      ? 'a relaxed first-meeting chat in a bright Dutch indoor setting'
      : vid === 'weekend'
        ? 'weekend small talk at a Dutch café terrace'
        : 'outdoor Dutch street small talk on a mild day'
  const who = gender === 'f' ? 'woman' : 'man'
  return {
    heroSrc,
    altEn: `Photoreal Dutch small-talk practice: a friendly ${who} facing you as if in a face-to-face conversation — ${scene}. Matches a ${who === 'woman' ? 'female' : 'male'} assistant voice.`,
  }
}

export function resolveSmallTalkSpeakLiveBackdropSrc(input: {
  variationFromUrl?: SmallTalkScenarioVariation
  scenarioContext?: string | null
  assistantPresentation?: 'male' | 'female'
}): string {
  const variation: SmallTalkScenarioVariation =
    input.variationFromUrl ??
    inferSmallTalkVariationFromScenarioContext(input.scenarioContext) ??
    'talking_about_weekend'
  return resolveSmallTalkSpeakLiveVisual({
    variation,
    assistantPresentation: input.assistantPresentation ?? 'female',
  }).heroSrc
}

/** Launcher / catalog default (female + weekend) — aligns with typical Dutch TTS default. */
export function getSmallTalkSpeakLiveHeroSrc(options: {
  variation?: SmallTalkScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolveSmallTalkSpeakLiveVisual({
    variation: options.variation ?? 'talking_about_weekend',
    assistantPresentation: options.assistantPresentation ?? 'female',
  }).heroSrc
}

export function getSmallTalkSpeakLiveHeroAlt(options: {
  variation?: SmallTalkScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolveSmallTalkSpeakLiveVisual({
    variation: options.variation ?? 'talking_about_weekend',
    assistantPresentation: options.assistantPresentation ?? 'female',
  }).altEn
}

export const SMALL_TALK_DEFAULT_HERO_SRC = getSmallTalkSpeakLiveHeroSrc({})

export const MEETING_NEW_PEOPLE_SCENARIO_ID = 'meeting_new_people' as const

export const MEETING_NEW_PEOPLE_SUBTYPE_OPTIONS = [
  { id: 'social_event', label: 'Social event' },
  { id: 'work_introduction', label: 'Work introduction' },
  { id: 'casual_meeting', label: 'Casual meeting' },
] as const

export const MEETING_NEW_PEOPLE_VARIATION_OPTIONS = [
  { id: 'introductions', label: 'Introductions' },
  { id: 'background', label: 'Background' },
  { id: 'follow_up_questions', label: 'Follow-up questions' },
] as const

export type MeetingNewPeopleScenarioSubtype = (typeof MEETING_NEW_PEOPLE_SUBTYPE_OPTIONS)[number]['id']
export type MeetingNewPeopleScenarioVariation = (typeof MEETING_NEW_PEOPLE_VARIATION_OPTIONS)[number]['id']

export type MeetingNewPeopleScenarioOverrides = {
  subType?: MeetingNewPeopleScenarioSubtype
  variation?: MeetingNewPeopleScenarioVariation
}

export const MEETING_NEW_PEOPLE_SMART_MIX_CARD_COPY = {
  kicker: 'Meeting people',
  body:
    'Houd het gesprek in balans: stel jezelf kort voor, zeg iets over jezelf, en stel een echte vervolgvraag. In het rapport: betere intro’s, natuurlijker achtergrond-Nederlands, en sterkere vervolgvragen — gebruik replay + mimic.',
} as const

export const MEETING_NEW_PEOPLE_LIVE_CARD_COPY: Record<
  MeetingNewPeopleScenarioVariation,
  { kicker: string; body: string }
> = {
  introductions: {
    kicker: 'Intro',
    body: 'Focus: naam, korte voorstelling, simpele basisvragen — geen sollicitatie.',
  },
  background: {
    kicker: 'Achtergrond',
    body: 'Focus: waar je woont/werkt of net verhuisd — korte, duidelijke zinnen.',
  },
  follow_up_questions: {
    kicker: 'Vervolg',
    body: 'Focus: doorvragen met echte nieuwsgierigheid — één gerichte vraag per beurt.',
  },
}

/** Filename stem under `/speak-live/` — introductions | background | follow_up_questions. */
export type MeetingNewPeopleSpeakLiveHeroId = 'intro' | 'background' | 'followup'

export function meetingNewPeopleHeroIdFromVariation(
  variation: MeetingNewPeopleScenarioVariation | undefined,
): MeetingNewPeopleSpeakLiveHeroId {
  if (variation === 'background') return 'background'
  if (variation === 'follow_up_questions') return 'followup'
  return 'intro'
}

/**
 * Photoreal POV heroes: one asset pair (f/m) per practice variation, matched to assistant TTS gender.
 * Files: `/speak-live/meeting-new-people-{intro|background|followup}-{f|m}-hero.png`
 */
export function resolveMeetingNewPeopleSpeakLiveVisual(options: {
  variation?: MeetingNewPeopleScenarioVariation
  variationFromUrl?: MeetingNewPeopleScenarioVariation
  scenarioContext?: string | null
  assistantPresentation?: 'male' | 'female'
}): { heroSrc: string; altEn: string } {
  const variationResolved =
    options.variation ??
    options.variationFromUrl ??
    inferMeetingNewPeopleVariationFromScenarioContext(options.scenarioContext) ??
    'introductions'
  const heroId = meetingNewPeopleHeroIdFromVariation(variationResolved)
  const gender = options.assistantPresentation === 'male' ? 'm' : 'f'
  const heroSrc = `/speak-live/meeting-new-people-${heroId}-${gender}-hero.png`
  const who = gender === 'f' ? 'woman' : 'man'
  const scene =
    heroId === 'intro'
      ? 'a first introduction at a bright Dutch indoor social gathering — facing you as in a face-to-face chat'
      : heroId === 'background'
        ? 'a relaxed café-style table conversation in the Netherlands — getting to know someone'
        : 'a curious follow-up moment on a Dutch city terrace or bright lobby — engaged listening'
  return {
    heroSrc,
    altEn: `Photoreal Dutch “meeting new people” practice (${variationResolved}): a friendly ${who} facing you — ${scene}. Matches a ${who === 'woman' ? 'female' : 'male'} assistant voice.`,
  }
}

export function resolveMeetingNewPeopleSpeakLiveBackdropSrc(input: {
  variationFromUrl?: MeetingNewPeopleScenarioVariation
  scenarioContext?: string | null
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolveMeetingNewPeopleSpeakLiveVisual({
    variationFromUrl: input.variationFromUrl,
    scenarioContext: input.scenarioContext,
    assistantPresentation: input.assistantPresentation ?? 'female',
  }).heroSrc
}

export function inferMeetingNewPeopleVariationFromScenarioContext(
  text: string | null | undefined
): MeetingNewPeopleScenarioVariation | undefined {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return undefined
  if (t.includes('variatie c') || t.includes('follow_up_questions') || t.includes('vervolgvrag')) {
    return 'follow_up_questions'
  }
  if (t.includes('variatie b') || t.includes('background') || t.includes('achtergrond')) {
    return 'background'
  }
  if (t.includes('variatie a') || t.includes('introductions') || t.includes('voorstel')) {
    return 'introductions'
  }
  return undefined
}

export const MEETING_NEW_PEOPLE_DEFAULT_HERO_SRC = resolveMeetingNewPeopleSpeakLiveBackdropSrc({
  variationFromUrl: 'introductions',
  assistantPresentation: 'female',
})

/** Launcher / catalog hero — default variation `introductions`; voice gender matched. */
export function getMeetingNewPeopleSpeakLiveHeroSrc(options?: {
  variation?: MeetingNewPeopleScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolveMeetingNewPeopleSpeakLiveVisual({
    variation: options?.variation ?? 'introductions',
    assistantPresentation: options?.assistantPresentation ?? 'female',
  }).heroSrc
}

export function getMeetingNewPeopleSpeakLiveHeroAlt(options?: {
  variation?: MeetingNewPeopleScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolveMeetingNewPeopleSpeakLiveVisual({
    variation: options?.variation ?? 'introductions',
    assistantPresentation: options?.assistantPresentation ?? 'female',
  }).altEn
}

export const PARTY_SOCIAL_SCENARIO_ID = 'party_social' as const

export const PARTY_SOCIAL_SUBTYPE_OPTIONS = [
  { id: 'house_party', label: 'House party' },
  { id: 'networking_event', label: 'Networking event' },
  { id: 'casual_gathering', label: 'Casual gathering' },
] as const

export const PARTY_SOCIAL_VARIATION_OPTIONS = [
  { id: 'keeping_conversation_going', label: 'Keeping conversation going' },
  { id: 'asking_questions', label: 'Asking questions' },
] as const

export type PartySocialScenarioSubtype = (typeof PARTY_SOCIAL_SUBTYPE_OPTIONS)[number]['id']
export type PartySocialScenarioVariation = (typeof PARTY_SOCIAL_VARIATION_OPTIONS)[number]['id']

export type PartySocialScenarioOverrides = {
  subType?: PartySocialScenarioSubtype
  variation?: PartySocialScenarioVariation
}

/** Filename slug under `/public/speak-live/party-social-{id}-{m|f}-hero.png` — matches TTS gender. */
export type PartySocialSpeakLiveVisualId = 'keeping' | 'asking'

function partySocialVisualIdFromVariation(
  variation: PartySocialScenarioVariation | undefined,
): PartySocialSpeakLiveVisualId {
  if (variation === 'asking_questions') return 'asking'
  return 'keeping'
}

/**
 * Photoreal “you’re talking with someone at a mingle” heroes: each practice variation has male + female assets,
 * selected from {@link assistantPresentation} so the portrait matches TTS voice gender.
 */
export function resolvePartySocialSpeakLiveVisual(options: {
  variation?: PartySocialScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): { heroSrc: string; altEn: string } {
  const vid = partySocialVisualIdFromVariation(options.variation)
  const gender = options.assistantPresentation === 'male' ? 'm' : 'f'
  const heroSrc = `/speak-live/party-social-${vid}-${gender}-hero.png`
  const scene =
    vid === 'asking'
      ? 'a friendly Dutch networking or party mingle — face-to-face as if you just joined the conversation'
      : 'a relaxed Dutch house party or casual gathering — warm lighting, face-to-face chat energy'
  const who = gender === 'f' ? 'woman' : 'man'
  return {
    heroSrc,
    altEn: `Photoreal Dutch party or social mingle practice: a friendly ${who} facing you as if in a direct conversation — ${scene}. Matches a ${who === 'woman' ? 'female' : 'male'} assistant voice.`,
  }
}

export const PARTY_SOCIAL_SMART_MIX_CARD_COPY = {
  kicker: 'Party energy',
  body:
    'Korte bursts: reageer, stel een vraag, laat soms het onderwerp springen. Tip: “Conversation energy” hoog houden met mini-reacties + echte feestvragen — in het rapport: sterkere fillers en vervolgvragen; replay + mimic.',
} as const

export const PARTY_SOCIAL_LIVE_CARD_COPY: Record<
  PartySocialScenarioVariation,
  { kicker: string; body: string }
> = {
  keeping_conversation_going: {
    kicker: 'Doorpraten',
    body: 'Focus: korte reacties, doorzetten, stilte opvangen — geen monoloog.',
  },
  asking_questions: {
    kicker: 'Vragen',
    body: 'Focus: natuurlijke feestvragen en interesse — niet als sollicitatie.',
  },
}

export function resolvePartySocialSpeakLiveBackdropSrc(input: {
  variationFromUrl?: PartySocialScenarioVariation
  scenarioContext?: string | null
  assistantPresentation?: 'male' | 'female'
}): string {
  const variationResolved =
    input.variationFromUrl ??
    inferPartySocialVariationFromScenarioContext(input.scenarioContext) ??
    'keeping_conversation_going'
  return resolvePartySocialSpeakLiveVisual({
    variation: variationResolved,
    assistantPresentation: input.assistantPresentation ?? 'female',
  }).heroSrc
}

export function inferPartySocialVariationFromScenarioContext(
  text: string | null | undefined,
): PartySocialScenarioVariation | undefined {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return undefined
  if (t.includes('variatie b') || t.includes('asking_questions') || t.includes('vragen stellen')) {
    return 'asking_questions'
  }
  if (t.includes('variatie a') || t.includes('keeping_conversation_going') || t.includes('doorpraten')) {
    return 'keeping_conversation_going'
  }
  return undefined
}

export const PARTY_SOCIAL_DEFAULT_HERO_SRC = resolvePartySocialSpeakLiveBackdropSrc({
  variationFromUrl: 'keeping_conversation_going',
  assistantPresentation: 'female',
})

export function getPartySocialSpeakLiveHeroSrc(options?: {
  variation?: PartySocialScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolvePartySocialSpeakLiveBackdropSrc({
    variationFromUrl: options?.variation ?? 'keeping_conversation_going',
    assistantPresentation: options?.assistantPresentation ?? 'female',
  })
}

export function getPartySocialSpeakLiveHeroAlt(options?: {
  variation?: PartySocialScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolvePartySocialSpeakLiveVisual({
    variation: options?.variation ?? 'keeping_conversation_going',
    assistantPresentation: options?.assistantPresentation ?? 'female',
  }).altEn
}

export const EXPLAINING_SOMETHING_SCENARIO_ID = 'explaining_something' as const

export const EXPLAINING_SOMETHING_SUBTYPE_OPTIONS = [
  { id: 'giving_instructions', label: 'Giving instructions' },
  { id: 'explaining_process', label: 'Explaining a process' },
  { id: 'explaining_how_to', label: 'How-to explanation' },
] as const

export const EXPLAINING_SOMETHING_VARIATION_OPTIONS = [
  { id: 'giving_instructions', label: 'Variation A — instructions' },
  { id: 'describing_process', label: 'Variation B — process' },
] as const

export type ExplainingSomethingScenarioSubtype = (typeof EXPLAINING_SOMETHING_SUBTYPE_OPTIONS)[number]['id']
export type ExplainingSomethingScenarioVariation = (typeof EXPLAINING_SOMETHING_VARIATION_OPTIONS)[number]['id']

export type ExplainingSomethingScenarioOverrides = {
  subType?: ExplainingSomethingScenarioSubtype
  variation?: ExplainingSomethingScenarioVariation
}

/** Filename slug under `/public/speak-live/explaining-something-{id}-{m|f}-hero.png` — matches TTS gender. */
export type ExplainingSomethingSpeakLiveVisualId = 'instructions' | 'process'

function explainingSomethingVisualIdFromVariation(
  variation: ExplainingSomethingScenarioVariation | undefined,
): ExplainingSomethingSpeakLiveVisualId {
  if (variation === 'describing_process') return 'process'
  return 'instructions'
}

/**
 * Photoreal POV “you’re explaining to someone listening” heroes: two practice moods × male + female,
 * selected from {@link assistantPresentation} so the portrait matches assistant TTS gender.
 */
export function resolveExplainingSomethingSpeakLiveVisual(options: {
  variation?: ExplainingSomethingScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): { heroSrc: string; altEn: string } {
  const vid = explainingSomethingVisualIdFromVariation(options.variation)
  const gender = options.assistantPresentation === 'male' ? 'm' : 'f'
  const heroSrc = `/speak-live/explaining-something-${vid}-${gender}-hero.png`
  const scene =
    vid === 'process'
      ? 'a calm café table in the Netherlands — you describe a process while someone listens face-to-face'
      : 'a bright kitchen-style setting — you give clear instructions while someone listens across from you'
  const who = gender === 'f' ? 'woman' : 'man'
  return {
    heroSrc,
    altEn: `Photoreal Dutch “explaining something” practice (${vid}): a friendly ${who} facing you in a direct conversation — ${scene}. Matches a ${who === 'woman' ? 'female' : 'male'} assistant voice.`,
  }
}

export function inferExplainingSomethingVariationFromScenarioContext(
  text: string | null | undefined,
): ExplainingSomethingScenarioVariation | undefined {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return undefined
  if (
    t.includes('variatie b') ||
    t.includes('describing_process') ||
    t.includes('proces beschrij') ||
    t.includes('chronolog')
  ) {
    return 'describing_process'
  }
  if (
    t.includes('variatie a') ||
    t.includes('giving_instructions') ||
    t.includes('instructies geven') ||
    t.includes('imperatief')
  ) {
    return 'giving_instructions'
  }
  return undefined
}

export const EXPLAINING_SOMETHING_SMART_MIX_CARD_COPY = {
  kicker: 'Explain',
  body: '2–5 zinnen op rij; de ander luistert en vraagt hoogstens één keer iets na.',
} as const

export const EXPLAINING_SOMETHING_LIVE_CARD_COPY: Record<
  ExplainingSomethingScenarioVariation,
  { kicker: string; body: string }
> = {
  giving_instructions: {
    kicker: 'Instructies',
    body: 'Korte stappen in volgorde — geen ping-pong.',
  },
  describing_process: {
    kicker: 'Proces',
    body: 'Chronologie: eerst — daarna — slot.',
  },
}

export function resolveExplainingSomethingSpeakLiveBackdropSrc(input: {
  variationFromUrl?: ExplainingSomethingScenarioVariation
  scenarioContext?: string | null
  assistantPresentation?: 'male' | 'female'
}): string {
  const variationResolved =
    input.variationFromUrl ??
    inferExplainingSomethingVariationFromScenarioContext(input.scenarioContext) ??
    'giving_instructions'
  return resolveExplainingSomethingSpeakLiveVisual({
    variation: variationResolved,
    assistantPresentation: input.assistantPresentation ?? 'female',
  }).heroSrc
}

export const EXPLAINING_SOMETHING_DEFAULT_HERO_SRC = resolveExplainingSomethingSpeakLiveBackdropSrc({
  variationFromUrl: 'giving_instructions',
  assistantPresentation: 'female',
})

export function getExplainingSomethingSpeakLiveHeroSrc(options?: {
  variation?: ExplainingSomethingScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolveExplainingSomethingSpeakLiveBackdropSrc({
    variationFromUrl: options?.variation ?? 'giving_instructions',
    assistantPresentation: options?.assistantPresentation ?? 'female',
  })
}

export function getExplainingSomethingSpeakLiveHeroAlt(options?: {
  variation?: ExplainingSomethingScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolveExplainingSomethingSpeakLiveVisual({
    variation: options?.variation ?? 'giving_instructions',
    assistantPresentation: options?.assistantPresentation ?? 'female',
  }).altEn
}

export const STORYTELLING_SCENARIO_ID = 'storytelling' as const

export const STORYTELLING_SUBTYPE_OPTIONS = [
  { id: 'daily_story', label: 'Daily story' },
  { id: 'travel_story', label: 'Travel story' },
  { id: 'personal_experience', label: 'Personal experience' },
] as const

export const STORYTELLING_VARIATION_OPTIONS = [
  { id: 'what_you_did_yesterday', label: 'Yesterday / daily past' },
  { id: 'travel_story', label: 'Travel & trip' },
] as const

export type StorytellingScenarioSubtype = (typeof STORYTELLING_SUBTYPE_OPTIONS)[number]['id']
export type StorytellingScenarioVariation = (typeof STORYTELLING_VARIATION_OPTIONS)[number]['id']

export type StorytellingScenarioOverrides = {
  subType?: StorytellingScenarioSubtype
  variation?: StorytellingScenarioVariation
}

/**
 * Photoreal hero filenames under `/public/speak-live/storytelling-{daily|travel}-{m|f}-hero.png`.
 * Gender matches assistant TTS (`assistantPresentation`). v1 assets are listener-POV photoreal PNGs
 * (bootstrapped from the explaining-something pack); replace with bespoke storytelling art when ready
 * — see `docs/product/scenario-image-prompts.md` (Speak Live storytelling).
 */
export type StorytellingSpeakLiveVisualId = 'daily' | 'travel'

function storytellingVisualIdFromVariation(
  variation: StorytellingScenarioVariation | undefined,
): StorytellingSpeakLiveVisualId {
  if (variation === 'travel_story') return 'travel'
  return 'daily'
}

export function resolveStorytellingSpeakLiveVisual(options: {
  variation?: StorytellingScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): { heroSrc: string; altEn: string } {
  const vid = storytellingVisualIdFromVariation(options.variation)
  const gender = options.assistantPresentation === 'male' ? 'm' : 'f'
  const heroSrc = `/speak-live/storytelling-${vid}-${gender}-hero.png`
  const who = gender === 'f' ? 'woman' : 'man'
  const scene =
    vid === 'travel'
      ? 'relaxed travel-day feel — you recount a trip while someone listens across from you, Dutch everyday setting'
      : 'warm casual interior — you tell a past-day story while someone listens face-to-face'
  return {
    heroSrc,
    altEn: `Photoreal Dutch storytelling practice (${vid}): a friendly ${who} facing you in conversation — ${scene}. Matches a ${who === 'woman' ? 'female' : 'male'} assistant voice.`,
  }
}

export function inferStorytellingVariationFromScenarioContext(
  text: string | null | undefined,
): StorytellingScenarioVariation | undefined {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return undefined
  if (
    t.includes('travel_story') ||
    t.includes('variatie b') ||
    /\b(reis|vakantie|itali|spanje|vlucht|hotel|wandeling|hike|stedentrip)\b/i.test(t)
  ) {
    return 'travel_story'
  }
  if (
    t.includes('what_you_did_yesterday') ||
    t.includes('variatie a') ||
    /\bgisteren|weekend|avond\b/i.test(t)
  ) {
    return 'what_you_did_yesterday'
  }
  return undefined
}

export function resolveStorytellingSpeakLiveBackdropSrc(input: {
  variationFromUrl?: StorytellingScenarioVariation
  scenarioContext?: string | null
  assistantPresentation?: 'male' | 'female'
}): string {
  const variationResolved =
    input.variationFromUrl ??
    inferStorytellingVariationFromScenarioContext(input.scenarioContext) ??
    'what_you_did_yesterday'
  return resolveStorytellingSpeakLiveVisual({
    variation: variationResolved,
    assistantPresentation: input.assistantPresentation ?? 'female',
  }).heroSrc
}

export const STORYTELLING_SMART_MIX_CARD_COPY = {
  kicker: 'Story',
  body:
    'Langere beurt: begin (wanneer/waar), midden (2–4 momenten), slot (gevoel of gevolg). Luisteraar: max. één vervolgvraag — rapport: structuur, volgorde, detail, flow.',
} as const

export const STORYTELLING_LIVE_CARD_COPY: Record<
  StorytellingScenarioVariation,
  { kicker: string; body: string }
> = {
  what_you_did_yesterday: {
    kicker: 'Gisteren',
    body: 'Vertel in het verleden met duidelijke volgorde — microfoon of ondertiteling; de ander luistert en vraagt door.',
  },
  travel_story: {
    kicker: 'Reis',
    body: 'Meer sfeer en detail; voeg emotie toe (“het was …”); begin–midden–slot houden.',
  },
}

export const STORYTELLING_DEFAULT_HERO_SRC = resolveStorytellingSpeakLiveBackdropSrc({
  variationFromUrl: 'what_you_did_yesterday',
  assistantPresentation: 'female',
})

export function getStorytellingSpeakLiveHeroSrc(options?: {
  variation?: StorytellingScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolveStorytellingSpeakLiveBackdropSrc({
    variationFromUrl: options?.variation ?? 'what_you_did_yesterday',
    assistantPresentation: options?.assistantPresentation ?? 'female',
  })
}

export function getStorytellingSpeakLiveHeroAlt(options?: {
  variation?: StorytellingScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolveStorytellingSpeakLiveVisual({
    variation: options?.variation ?? 'what_you_did_yesterday',
    assistantPresentation: options?.assistantPresentation ?? 'female',
  }).altEn
}

export const OPINIONS_DISCUSSIONS_SCENARIO_ID = 'opinions_discussions' as const

export const OPINIONS_DISCUSSIONS_SUBTYPE_OPTIONS = [
  { id: 'casual_opinion', label: 'Casual topic' },
  { id: 'work_discussion', label: 'Work discussion' },
  { id: 'social_debate', label: 'Social / lifestyle' },
] as const

export const OPINIONS_DISCUSSIONS_VARIATION_OPTIONS = [
  { id: 'agree_disagree', label: 'Agree / disagree' },
  { id: 'give_reasons', label: 'Give reasons' },
] as const

export type OpinionsDiscussionsScenarioSubtype = (typeof OPINIONS_DISCUSSIONS_SUBTYPE_OPTIONS)[number]['id']
export type OpinionsDiscussionsScenarioVariation = (typeof OPINIONS_DISCUSSIONS_VARIATION_OPTIONS)[number]['id']

export type OpinionsDiscussionsScenarioOverrides = {
  subType?: OpinionsDiscussionsScenarioSubtype
  variation?: OpinionsDiscussionsScenarioVariation
}

export type OpinionsDiscussionsSpeakLiveVisualId = 'agree' | 'reasons'

function opinionsVisualIdFromVariation(variation: OpinionsDiscussionsScenarioVariation | undefined): OpinionsDiscussionsSpeakLiveVisualId {
  if (variation === 'give_reasons') return 'reasons'
  return 'agree'
}

export function inferOpinionsDiscussionsVariationFromScenarioContext(
  text: string | null | undefined,
): OpinionsDiscussionsScenarioVariation | undefined {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return undefined
  if (t.includes('give_reasons') || t.includes('variatie b') || /\breden|omdat|onderbouwing\b/i.test(t)) {
    return 'give_reasons'
  }
  if (t.includes('agree_disagree') || t.includes('variatie a') || /\beens|oneens\b/i.test(t)) {
    return 'agree_disagree'
  }
  return undefined
}

export function resolveOpinionsDiscussionsSpeakLiveVisual(options: {
  variation?: OpinionsDiscussionsScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): { heroSrc: string; altEn: string } {
  const vid = opinionsVisualIdFromVariation(options.variation)
  const gender = options.assistantPresentation === 'male' ? 'm' : 'f'
  const heroSrc = `/speak-live/opinions-discussions-${vid}-${gender}-hero.webp`
  const who = gender === 'f' ? 'woman' : 'man'
  const scene =
    vid === 'reasons'
      ? 'you explain why you think something while your partner listens'
      : 'you react agree or disagree while facing your conversation partner'
  return {
    heroSrc,
    altEn: `Photoreal Dutch opinions practice (${vid}): a friendly ${who} facing you — ${scene}. Matches a ${who === 'woman' ? 'female' : 'male'} assistant voice.`,
  }
}

export function resolveOpinionsDiscussionsSpeakLiveBackdropSrc(input: {
  variationFromUrl?: OpinionsDiscussionsScenarioVariation
  scenarioContext?: string | null
  assistantPresentation?: 'male' | 'female'
}): string {
  const variationResolved =
    input.variationFromUrl ??
    inferOpinionsDiscussionsVariationFromScenarioContext(input.scenarioContext) ??
    'agree_disagree'
  return resolveOpinionsDiscussionsSpeakLiveVisual({
    variation: variationResolved,
    assistantPresentation: input.assistantPresentation ?? 'female',
  }).heroSrc
}

export const OPINIONS_DISCUSSIONS_SMART_MIX_CARD_COPY = {
  kicker: 'Opinions',
  body:
    'De ander zet een mening neer — jij reageert (eens/oneens) en geeft een korte reden. Licht tegenspraak; rapport: standpunt, redenering, toon.',
} as const

export const OPINIONS_DISCUSSIONS_LIVE_CARD_COPY: Record<
  OpinionsDiscussionsScenarioVariation,
  { kicker: string; body: string }
> = {
  agree_disagree: {
    kicker: 'Eens / oneens',
    body: 'Focus: duidelijke positie en zachte nuance — microfoon of ondertiteling.',
  },
  give_reasons: {
    kicker: 'Redenen',
    body: 'Focus: “omdat/want” en korte argumentatie — blijf respectvol.',
  },
}

export const OPINIONS_DISCUSSIONS_DEFAULT_HERO_SRC = resolveOpinionsDiscussionsSpeakLiveBackdropSrc({
  variationFromUrl: 'agree_disagree',
  assistantPresentation: 'female',
})

export function getOpinionsDiscussionsSpeakLiveHeroSrc(options?: {
  variation?: OpinionsDiscussionsScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolveOpinionsDiscussionsSpeakLiveBackdropSrc({
    variationFromUrl: options?.variation ?? 'agree_disagree',
    assistantPresentation: options?.assistantPresentation ?? 'female',
  })
}

export function getOpinionsDiscussionsSpeakLiveHeroAlt(options?: {
  variation?: OpinionsDiscussionsScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolveOpinionsDiscussionsSpeakLiveVisual({
    variation: options?.variation ?? 'agree_disagree',
    assistantPresentation: options?.assistantPresentation ?? 'female',
  }).altEn
}

export const PHONE_CALL_SUBTYPE_OPTIONS = [
  { id: 'appointment_call', label: 'Appointment call' },
  { id: 'service_call', label: 'Service call' },
  { id: 'information_call', label: 'Information call' },
] as const

export const PHONE_CALL_VARIATION_OPTIONS = [
  { id: 'starting_call', label: 'Starting the call' },
  { id: 'handling_call', label: 'Handling the call' },
  { id: 'repair_misunderstanding', label: 'Repair / misunderstanding' },
] as const

export const PHONE_CALL_TOPIC_OPTIONS = [
  { id: 'opening_hours', label: 'Opening hours' },
  { id: 'appointment_slot', label: 'Appointment slot' },
  { id: 'issue_report', label: 'Report an issue' },
  { id: 'availability_question', label: 'Availability' },
] as const

export type PhoneCallScenarioSubtype = (typeof PHONE_CALL_SUBTYPE_OPTIONS)[number]['id']
export type PhoneCallScenarioVariation = (typeof PHONE_CALL_VARIATION_OPTIONS)[number]['id']
export type PhoneCallScenarioTopicId = (typeof PHONE_CALL_TOPIC_OPTIONS)[number]['id']

export type PhoneCallScenarioOverrides = {
  subType?: PhoneCallScenarioSubtype
  variation?: PhoneCallScenarioVariation
  detailFocus?: PhoneCallScenarioTopicId
  /** Phone layout is default for this scenario; set `standard` for classic Speak Live chrome. */
  interactionUi?: 'phone' | 'standard'
}

/** Visual slug for hero filenames under `/public/speak-live/`. */
export type PhoneCallSpeakLiveVisualId = 'starting' | 'handling' | 'repair'

function phoneCallVisualIdFromVariation(
  variation: PhoneCallScenarioVariation | undefined
): PhoneCallSpeakLiveVisualId {
  if (variation === 'handling_call') return 'handling'
  if (variation === 'repair_misunderstanding') return 'repair'
  return 'starting'
}

export function inferPhoneCallVariationFromScenarioContext(
  text: string | null | undefined
): PhoneCallScenarioVariation | undefined {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return undefined
  if (t.includes('variatie b') || t.includes('handling_call')) return 'handling_call'
  if (t.includes('variatie c') || t.includes('repair_misunderstanding')) return 'repair_misunderstanding'
  if (t.includes('variatie a') || t.includes('starting_call')) return 'starting_call'
  return undefined
}

export function inferPhoneCallSubtypeFromScenarioContext(text: string | null | undefined): PhoneCallScenarioSubtype | null {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return null
  if (/\b(planning|afspraak|reserveren)\b/i.test(t) && /subtype|telefoonlijn/i.test(t)) return 'appointment_call'
  if (/\b(klantenservice|service of melding)\b/i.test(t)) return 'service_call'
  if (/\b(receptie|informatie opvragen)\b/i.test(t)) return 'information_call'
  if (t.includes('afspraak of reservering per telefoon')) return 'appointment_call'
  if (t.includes('service of melding per telefoon')) return 'service_call'
  if (t.includes('informatie opvragen per telefoon')) return 'information_call'
  return null
}

/**
 * Photoreal “person on the line” heroes: each practice variation has male + female assets,
 * selected from {@link assistantPresentation} so the portrait matches TTS voice gender.
 */
export function resolvePhoneCallSpeakLiveVisual(options: {
  variation?: PhoneCallScenarioVariation
  assistantPresentation?: 'male' | 'female'
  subType?: PhoneCallScenarioSubtype
}): { heroSrc: string; altEn: string } {
  const vid = phoneCallVisualIdFromVariation(options.variation)
  const gender = options.assistantPresentation === 'male' ? 'm' : 'f'
  const heroSrc = `/speak-live/phone-call-${vid}-${gender}-hero.png`
  const topic =
    options.subType === 'service_call'
      ? 'customer service line'
      : options.subType === 'information_call'
        ? 'reception / information desk'
        : 'planning or appointments desk'
  const scene =
    vid === 'starting'
      ? 'opening the call with purpose'
      : vid === 'handling'
        ? 'handling questions and details mid-call'
        : 'repairing a misunderstanding with patience'
  const who = gender === 'f' ? 'woman' : 'man'
  return {
    heroSrc,
    altEn: `Photoreal Dutch phone practice: a professional ${who} on a headset facing you as if on a video call — ${topic}, ${scene}. Matches a ${who === 'woman' ? 'female' : 'male'} assistant voice.`,
  }
}

export function resolvePhoneCallSpeakLiveBackdropSrc(input: {
  subTypeFromUrl?: PhoneCallScenarioSubtype
  variationFromUrl?: PhoneCallScenarioVariation
  scenarioContext?: string | null
  assistantPresentation?: 'male' | 'female'
}): string {
  const variation: PhoneCallScenarioVariation =
    input.variationFromUrl ??
    inferPhoneCallVariationFromScenarioContext(input.scenarioContext) ??
    'starting_call'
  const sub = input.subTypeFromUrl ?? inferPhoneCallSubtypeFromScenarioContext(input.scenarioContext) ?? undefined
  return resolvePhoneCallSpeakLiveVisual({
    variation,
    assistantPresentation: input.assistantPresentation ?? 'female',
    subType: sub,
  }).heroSrc
}

export function resolvePhoneCallSubtypeForSession(input: {
  subTypeFromUrl?: PhoneCallScenarioSubtype
  scenarioContext?: string | null
}): PhoneCallScenarioSubtype {
  return input.subTypeFromUrl ?? inferPhoneCallSubtypeFromScenarioContext(input.scenarioContext) ?? 'appointment_call'
}

export const PHONE_CALL_LIVE_CARD_COPY: Record<PhoneCallScenarioSubtype, { kicker: string; body: string }> = {
  appointment_call: {
    kicker: 'Planning',
    body: 'Je belt over een afspraak of reservering — korte zinnen, helder doel, alsof je echt aan de lijn bent.',
  },
  service_call: {
    kicker: 'Klantenservice',
    body: 'Service of melding — blijf rustig formuleren terwijl de medewerker vragen stelt.',
  },
  information_call: {
    kicker: 'Receptie',
    body: 'Informatie opvragen — luister goed en bevestig wat je denkt te horen.',
  },
}

export const PHONE_CALL_SMART_MIX_CARD_COPY = {
  kicker: 'Telefoonlijn',
  body: 'Audio-first: een Nederlandse professional aan de lijn — subtype en oefenfocus wisselen per sessie.',
} as const

export const PHONE_CALL_DEFAULT_HERO_SRC = resolvePhoneCallSpeakLiveVisual({
  variation: 'starting_call',
  assistantPresentation: 'female',
  subType: 'appointment_call',
}).heroSrc

export const HOUSING_LANDLORD_DEFAULT_HERO_SRC = resolveHousingLandlordSpeakLiveVisual({
  smartMode: true,
  assistantPresentation: 'female',
}).heroSrc

export function getHousingLandlordSpeakLiveHeroSrc(options: {
  smartMode?: boolean
  subType?: HousingLandlordScenarioSubtype
  variation?: HousingLandlordScenarioVariation
  /** Aligns focal housing contact with Speak Live TTS voice; launcher preview defaults to female. */
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolveHousingLandlordSpeakLiveVisual({
    smartMode: options.smartMode,
    subType: options.subType,
    variation: options.variation,
    assistantPresentation: options.assistantPresentation ?? 'female',
  }).heroSrc
}

export function getHousingLandlordSpeakLiveHeroAlt(options: {
  smartMode?: boolean
  subType?: HousingLandlordScenarioSubtype
  variation?: HousingLandlordScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolveHousingLandlordSpeakLiveVisual({
    smartMode: options.smartMode,
    subType: options.subType,
    variation: options.variation,
    assistantPresentation: options.assistantPresentation ?? 'female',
  }).altEn
}

export const HOUSING_LANDLORD_LIVE_CARD_COPY: Record<HousingLandlordScenarioSubtype, { kicker: string; body: string }> = {
  landlord: {
    kicker: 'Verhuurder',
    body: 'Korte, directe afstemming over je woning — microfoon of Ondertiteling.',
  },
  rental_agency: {
    kicker: 'Makelaar',
    body: 'Iets formeler: huur, borg en contract — rustig formuleren.',
  },
  building_manager: {
    kicker: 'Gebouwbeheer',
    body: 'Onderhoud en toegang — praktische melding in het Nederlands.',
  },
}

export const HOUSING_LANDLORD_SMART_MIX_CARD_COPY = {
  kicker: 'Woning',
  body: 'Verhuurder, makelaar of beheer — willekeurige mix per sessie.',
} as const

export function inferHousingLandlordSubtypeFromDutchContext(text: string | null | undefined): HousingLandlordScenarioSubtype | null {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return null
  if (/\b(makelaar|makelaardij|verhuurmakelaar)\b/i.test(t)) return 'rental_agency'
  if (/\b(vve|gebouwbeheer|beheerder|technische dienst)\b/i.test(t)) return 'building_manager'
  if (/\b(verhuurder|eigenaar)\b/i.test(t)) return 'landlord'
  return null
}

export function inferHousingLandlordVariationFromScenarioContext(
  text: string | null | undefined
): HousingLandlordScenarioVariation | undefined {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return undefined
  if (t.includes('variatie: asking_rent_contract') || t.includes('huur- of contractvraag')) return 'asking_rent_contract'
  if (t.includes('variatie: reporting_issue') || t.includes('meldt een praktisch probleem')) return 'reporting_issue'
  if (/\b(borg|opzegtermijn|contractduur|huurdatum|inclusief)\b/i.test(t)) return 'asking_rent_contract'
  if (/\b(lek|kapot|reparatie|monteur|storing)\b/i.test(t)) return 'reporting_issue'
  return undefined
}

function inferHousingLandlordVariationFromDetailFocus(
  detailFocus: HousingLandlordDetailFocusId | undefined
): HousingLandlordScenarioVariation | undefined {
  if (!detailFocus) return undefined
  const fromLauncher = HOUSING_LANDLORD_LAUNCH_TOPIC_OPTIONS.find((o) => o.id === detailFocus)
  if (fromLauncher) return fromLauncher.variation
  if ((HOUSING_LANDLORD_ISSUE_FOCUS_OPTIONS as readonly { id: string }[]).some((o) => o.id === detailFocus)) {
    return 'reporting_issue'
  }
  if ((HOUSING_LANDLORD_CONTRACT_FOCUS_OPTIONS as readonly { id: string }[]).some((o) => o.id === detailFocus)) {
    return 'asking_rent_contract'
  }
  return undefined
}

export function resolveHousingLandlordSpeakLiveBackdropSrc(input: {
  subTypeFromUrl?: HousingLandlordScenarioSubtype
  variationFromUrl?: HousingLandlordScenarioVariation
  detailFocusFromUrl?: HousingLandlordDetailFocusId
  scenarioContext?: string | null
  assistantPresentation?: 'male' | 'female'
}): string {
  const urlPins = Boolean(input.subTypeFromUrl || input.variationFromUrl || input.detailFocusFromUrl)
  const inferredSub = inferHousingLandlordSubtypeFromDutchContext(input.scenarioContext)
  const variation =
    input.variationFromUrl ??
    inferHousingLandlordVariationFromScenarioContext(input.scenarioContext) ??
    inferHousingLandlordVariationFromDetailFocus(input.detailFocusFromUrl)
  const subForVisual = input.subTypeFromUrl ?? (urlPins ? (inferredSub ?? undefined) : undefined) ?? null
  return getHousingLandlordSpeakLiveHeroSrc({
    smartMode: !urlPins,
    subType: subForVisual ?? undefined,
    variation: variation ?? undefined,
    assistantPresentation: input.assistantPresentation ?? 'female',
  })
}

export function resolveHousingLandlordSubtypeForSession(input: {
  subTypeFromUrl?: HousingLandlordScenarioSubtype
  scenarioContext?: string | null
}): HousingLandlordScenarioSubtype {
  return input.subTypeFromUrl ?? inferHousingLandlordSubtypeFromDutchContext(input.scenarioContext) ?? 'landlord'
}

export function inferWorkColleagueSubtypeFromDutchContext(text: string | null | undefined): WorkColleagueScenarioSubtype | null {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return null
  if (/\b(leidinggevende|manager|baas|chef)\b/i.test(t)) return 'manager_or_lead_request'
  if (/\b(team|sprint|ticket|eigenaar|wie pakt)\b/i.test(t)) return 'team_task'
  if (/\b(collega|even iets|hoe gaat het met)\b/i.test(t)) return 'colleague_chat'
  return null
}

export function inferWorkColleagueVariationFromScenarioContext(text: string | null | undefined): WorkColleagueScenarioVariation | undefined {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return undefined
  if (t.includes('variatie: hulp') || t.includes('asking_for_help')) return 'asking_for_help'
  if (t.includes('variatie: verduidelijk') || t.includes('clarifying_tasks')) return 'clarifying_tasks'
  if (t.includes('variatie: werkpraat') || t.includes('simple_workplace')) return 'simple_workplace_conversation'
  return undefined
}

export function resolveWorkColleagueSpeakLiveBackdropSrc(input: {
  subTypeFromUrl?: WorkColleagueScenarioSubtype
  variationFromUrl?: WorkColleagueScenarioVariation
  scenarioContext?: string | null
  assistantPresentation?: 'male' | 'female'
}): string {
  const urlPins = Boolean(input.subTypeFromUrl || input.variationFromUrl)
  const inferredSub = inferWorkColleagueSubtypeFromDutchContext(input.scenarioContext)
  const variation =
    input.variationFromUrl ?? inferWorkColleagueVariationFromScenarioContext(input.scenarioContext) ?? undefined
  const subForVisual = input.subTypeFromUrl ?? (urlPins ? (inferredSub ?? undefined) : undefined) ?? null
  return getWorkColleagueSpeakLiveHeroSrc({
    smartMode: !urlPins,
    subType: subForVisual ?? undefined,
    variation: variation ?? undefined,
    assistantPresentation: input.assistantPresentation ?? 'female',
  })
}

export function resolveWorkColleagueSubtypeForSession(input: {
  subTypeFromUrl?: WorkColleagueScenarioSubtype
  scenarioContext?: string | null
}): WorkColleagueScenarioSubtype {
  return input.subTypeFromUrl ?? inferWorkColleagueSubtypeFromDutchContext(input.scenarioContext) ?? 'colleague_chat'
}

export function inferStoreServiceIssueSubtypeFromDutchContext(text: string | null | undefined): StoreServiceIssueScenarioSubtype | null {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return null
  if (/\b(retour|terugbrengen|bon|ruilen|winkel|pasje|maat)\b/i.test(t)) return 'store_return'
  if (/\b(bestelling|levering|afhalen|pakket|service|klantenservice|te laat)\b/i.test(t)) return 'service_issue'
  if (/\b(kapot|defect|scherm|onderdeel|werk(t)? niet|kras|beschadigd)\b/i.test(t)) return 'product_problem'
  return null
}

export function inferStoreServiceIssueVariationFromScenarioContext(
  text: string | null | undefined
): StoreServiceIssueScenarioVariation | undefined {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return undefined
  if (t.includes('variatie: klacht')) return 'complaint'
  if (t.includes('variatie: defect')) return 'explaining_issue'
  if (t.includes('variatie: retour')) return 'returning_item'
  return undefined
}

export function resolveStoreServiceIssueSpeakLiveBackdropSrc(input: {
  subTypeFromUrl?: StoreServiceIssueScenarioSubtype
  variationFromUrl?: StoreServiceIssueScenarioVariation
  scenarioContext?: string | null
  assistantPresentation?: 'male' | 'female'
}): string {
  const urlPins = Boolean(input.subTypeFromUrl || input.variationFromUrl)
  const inferredSub = inferStoreServiceIssueSubtypeFromDutchContext(input.scenarioContext)
  const variation =
    input.variationFromUrl ?? inferStoreServiceIssueVariationFromScenarioContext(input.scenarioContext) ?? undefined
  const subForVisual = input.subTypeFromUrl ?? (urlPins ? (inferredSub ?? undefined) : undefined) ?? null
  return getStoreServiceIssueSpeakLiveHeroSrc({
    smartMode: !urlPins,
    subType: subForVisual ?? undefined,
    variation: variation ?? undefined,
    assistantPresentation: input.assistantPresentation ?? 'female',
  })
}

export function resolveStoreServiceIssueSubtypeForSession(input: {
  subTypeFromUrl?: StoreServiceIssueScenarioSubtype
  scenarioContext?: string | null
}): StoreServiceIssueScenarioSubtype {
  return input.subTypeFromUrl ?? inferStoreServiceIssueSubtypeFromDutchContext(input.scenarioContext) ?? 'store_return'
}

export const DOCTOR_PHARMACY_SCENARIO_ID = 'doctor_pharmacy' as const

export const DOCTOR_PHARMACY_SUBTYPE_OPTIONS = [
  { id: 'doctor_visit', label: 'Doctor visit' },
  { id: 'pharmacy', label: 'Pharmacy' },
  { id: 'clinic_reception', label: 'Clinic reception' },
] as const

export const DOCTOR_PHARMACY_VARIATION_OPTIONS = [
  { id: 'symptoms', label: 'Symptoms' },
  { id: 'asking_for_help', label: 'Asking for help' },
  { id: 'understanding_instructions', label: 'Understanding instructions' },
] as const

/** Optional symptom / focus bias — passed as `detailFocus` in launch URL and API overrides. */
export const DOCTOR_PHARMACY_HEALTH_FOCUS_OPTIONS = [
  { id: 'headache', label: 'Headache' },
  { id: 'cough', label: 'Cough' },
  { id: 'sore_throat', label: 'Sore throat' },
  { id: 'fever', label: 'Fever' },
  { id: 'stomach_ache', label: 'Stomach ache' },
  { id: 'dizziness', label: 'Dizziness' },
  { id: 'allergies', label: 'Allergies' },
  { id: 'tiredness', label: 'Tiredness' },
  { id: 'medicine_instructions', label: 'Medicine instructions' },
  { id: 'appointment_request', label: 'Appointment request' },
] as const

/** Speak Live launcher — short setting labels (ids match {@link DOCTOR_PHARMACY_SUBTYPE_OPTIONS}). */
export const DOCTOR_PHARMACY_LAUNCHER_SETTING_OPTIONS = [
  { id: 'doctor_visit', label: 'Doctor' },
  { id: 'pharmacy', label: 'Pharmacy' },
  { id: 'clinic_reception', label: 'Clinic reception' },
] as const

/** Speak Live launcher — task focus labels (ids match variation slugs). */
export const DOCTOR_PHARMACY_LAUNCHER_FOCUS_OPTIONS = [
  { id: 'symptoms', label: 'Describe symptoms' },
  { id: 'asking_for_help', label: 'Ask for help' },
  { id: 'understanding_instructions', label: 'Understand instructions' },
] as const

/** Speak Live launcher — optional topic chips (subset of health focus; passed as `detailFocus`). */
export const DOCTOR_PHARMACY_LAUNCHER_TOPIC_OPTIONS = [
  { id: 'headache', label: 'Headache' },
  { id: 'cough', label: 'Cough' },
  { id: 'sore_throat', label: 'Sore throat' },
  { id: 'fever', label: 'Fever' },
  { id: 'appointment_request', label: 'Appointment' },
  { id: 'medicine_instructions', label: 'Medicine instructions' },
] as const

export type DoctorPharmacyScenarioSubtype = (typeof DOCTOR_PHARMACY_SUBTYPE_OPTIONS)[number]['id']
export type DoctorPharmacyScenarioVariation = (typeof DOCTOR_PHARMACY_VARIATION_OPTIONS)[number]['id']
export type DoctorPharmacyHealthFocusId = (typeof DOCTOR_PHARMACY_HEALTH_FOCUS_OPTIONS)[number]['id']

export type DoctorPharmacyScenarioOverrides = {
  subType?: DoctorPharmacyScenarioSubtype
  variation?: DoctorPharmacyScenarioVariation
  /** Health focus — API field name is `detailFocus` for compatibility with {@link ScenarioSelectionOverrides}. */
  detailFocus?: DoctorPharmacyHealthFocusId
}

export const DOCTOR_PHARMACY_DEFAULT_HERO_SRC = resolveDoctorPharmacySpeakLiveVisual({
  smartMode: true,
  assistantPresentation: 'female',
}).heroSrc

export function getDoctorPharmacySpeakLiveHeroSrc(options: {
  smartMode?: boolean
  subType?: DoctorPharmacyScenarioSubtype
  variation?: DoctorPharmacyScenarioVariation
  /** Launcher has no session — default female matches typical Dutch TTS default. */
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolveDoctorPharmacySpeakLiveVisual({
    smartMode: options.smartMode,
    subType: options.subType,
    variation: options.variation,
    assistantPresentation: options.assistantPresentation ?? 'female',
  }).heroSrc
}

export function getDoctorPharmacySpeakLiveHeroAlt(options: {
  smartMode?: boolean
  subType?: DoctorPharmacyScenarioSubtype
  variation?: DoctorPharmacyScenarioVariation
  assistantPresentation?: 'male' | 'female'
}): string {
  return resolveDoctorPharmacySpeakLiveVisual({
    smartMode: options.smartMode,
    subType: options.subType,
    variation: options.variation,
    assistantPresentation: options.assistantPresentation ?? 'female',
  }).altEn
}

export function inferDoctorPharmacySubtypeFromDutchContext(text: string | null | undefined): DoctorPharmacyScenarioSubtype | null {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return null
  if (/\b(apotheek|medicijn|tablet|siroop|recept|drogist)\b/i.test(t)) return 'pharmacy'
  if (/\b(balie|receptie|afspraak maken|inschrijven|praktijk)\b/i.test(t)) return 'clinic_reception'
  if (/\b(arts|dokter|huisarts|consult|spreekuur|onderzoek)\b/i.test(t)) return 'doctor_visit'
  return null
}

export function inferDoctorPharmacyVariationFromScenarioContext(
  text: string | null | undefined
): DoctorPharmacyScenarioVariation | undefined {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return undefined
  if (t.includes('variatie: instructies begrijpen')) return 'understanding_instructions'
  if (t.includes('variatie: om hulp vragen')) return 'asking_for_help'
  if (t.includes('variatie: symptomen beschrijven')) return 'symptoms'
  return undefined
}

export function resolveDoctorPharmacySpeakLiveBackdropSrc(input: {
  subTypeFromUrl?: DoctorPharmacyScenarioSubtype
  variationFromUrl?: DoctorPharmacyScenarioVariation
  scenarioContext?: string | null
  assistantPresentation?: 'male' | 'female'
}): string {
  const urlPinsHero = Boolean(input.subTypeFromUrl || input.variationFromUrl)
  const inferred = inferDoctorPharmacySubtypeFromDutchContext(input.scenarioContext)
  const variation =
    input.variationFromUrl ?? inferDoctorPharmacyVariationFromScenarioContext(input.scenarioContext) ?? undefined
  const subForVisual = input.subTypeFromUrl ?? (urlPinsHero ? (inferred ?? undefined) : undefined) ?? null
  return resolveDoctorPharmacySpeakLiveVisual({
    smartMode: !urlPinsHero,
    subType: subForVisual,
    variation: variation ?? null,
    assistantPresentation: input.assistantPresentation ?? 'female',
  }).heroSrc
}

export function resolveDoctorPharmacySubtypeForSession(input: {
  subTypeFromUrl?: DoctorPharmacyScenarioSubtype
  scenarioContext?: string | null
}): DoctorPharmacyScenarioSubtype {
  return input.subTypeFromUrl ?? inferDoctorPharmacySubtypeFromDutchContext(input.scenarioContext) ?? 'doctor_visit'
}

export const DOCTOR_PHARMACY_LIVE_CARD_COPY: Record<
  DoctorPharmacyScenarioSubtype,
  { kicker: string; body: string }
> = {
  doctor_visit: {
    kicker: 'Consult',
    body: 'Symptoom kort, vragen beantwoorden, vervolg begrijpen — microfoon of Ondertiteling.',
  },
  pharmacy: {
    kicker: 'Apotheek',
    body: 'Medicijn of advies — duidelijke korte zinnen; microfoon of Ondertiteling.',
  },
  clinic_reception: {
    kicker: 'Balie',
    body: 'Afspraak of praktische stap — rustig en duidelijk Nederlands.',
  },
}

export const DOCTOR_PHARMACY_SMART_MIX_CARD_COPY = {
  kicker: 'Gezondheid',
  body: 'Symptoom, hulp of instructie — korte zinnen; microfoon of Ondertiteling.',
} as const

export const TRAIN_STATION_SCENARIO_ID = 'train-station' as const

export const PUBLIC_TRANSPORT_SUBTYPE_OPTIONS = [
  { id: 'train', label: 'Train' },
  { id: 'bus', label: 'Bus' },
  { id: 'tram', label: 'Tram' },
  { id: 'metro', label: 'Metro' },
] as const

export const PUBLIC_TRANSPORT_VARIATION_OPTIONS = [
  { id: 'route_and_platform', label: 'Route / platform' },
  { id: 'buying_ticket', label: 'Buying a ticket' },
  { id: 'delays_and_disruptions', label: 'Delays / route changes' },
] as const

/** Launcher destination chips → Dutch strings passed as `destination` override (backend pools). */
export const PUBLIC_TRANSPORT_DESTINATION_PRESETS = [
  { id: 'station', label: 'Station', destination: 'station' },
  { id: 'centre', label: 'Centre', destination: 'centrum' },
  { id: 'museum', label: 'Museum', destination: 'museum' },
  { id: 'supermarket', label: 'Supermarket', destination: 'supermarkt' },
  { id: 'office', label: 'Office', destination: 'kantoor' },
  { id: 'hotel', label: 'Hotel', destination: 'hotel' },
] as const

export type PublicTransportDestinationPresetId = (typeof PUBLIC_TRANSPORT_DESTINATION_PRESETS)[number]['id']

export type PublicTransportScenarioSubtype = (typeof PUBLIC_TRANSPORT_SUBTYPE_OPTIONS)[number]['id']
export type PublicTransportScenarioVariation = (typeof PUBLIC_TRANSPORT_VARIATION_OPTIONS)[number]['id']

export type PublicTransportScenarioOverrides = {
  subType?: PublicTransportScenarioSubtype
  variation?: PublicTransportScenarioVariation
  destination?: string
}

/** Photoreal female Dutch transit staff — matches female TTS; used for all OV Speak Live heroes. */
export const PUBLIC_TRANSPORT_SPEAK_LIVE_WOMAN_HERO_SRC = '/speak-live/ov-pt-staff-woman-hero.png' as const

/** Smart launcher / mixed OV default — same female staff hero as other OV tiles. */
export const PUBLIC_TRANSPORT_SPEAK_LIVE_SMART_HERO_SRC = PUBLIC_TRANSPORT_SPEAK_LIVE_WOMAN_HERO_SRC

export function inferPublicTransportSubtypeFromDutchContext(text: string | null | undefined): PublicTransportScenarioSubtype | null {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return null
  if (/\b(metro|underground)\b/i.test(t)) return 'metro'
  if (/\btram\b/i.test(t)) return 'tram'
  if (/\b(bus|bushalte|chauffeur)\b/i.test(t)) return 'bus'
  if (/\b(trein|perron|spoor|ns\b|station)\b/i.test(t)) return 'train'
  return null
}

export function inferPublicTransportVariationFromDutchContext(text: string | null | undefined): PublicTransportScenarioVariation | null {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return null
  if (/\b(kaartje|ticket|retour|enkele\s+reis|pinnen|prijs|geldig)\b/i.test(t)) return 'buying_ticket'
  if (/\b(vertraging|vertraagd|op\s+tijd|uitval|omleiding|storing|rijdt\s+niet)\b/i.test(t)) return 'delays_and_disruptions'
  if (/\b(perron|halte|lijn|uitstappen|instappen|spoor|welke\s+tram|welke\s+bus)\b/i.test(t)) return 'route_and_platform'
  return null
}

/**
 * Photoreal heroes for public transport — female staff member you are speaking with (aligned with female voice).
 * One shared hero asset; alt text reflects mode (train, bus, tram, metro) and task.
 */
export function resolvePublicTransportSpeakLiveVisual(params: {
  smartMode?: boolean
  subType?: PublicTransportScenarioSubtype | null
  variation?: PublicTransportScenarioVariation | null
}): { heroSrc: string; altEn: string } {
  const variation: PublicTransportScenarioVariation = params.variation ?? 'route_and_platform'
  const subType = params.subType ?? 'train'
  const modeWord = subType === 'bus' ? 'bus' : subType === 'tram' ? 'tram' : subType === 'metro' ? 'metro' : 'train'
  const focus =
    variation === 'route_and_platform'
      ? 'lines, direction, stops, and where to change'
      : variation === 'buying_ticket'
        ? 'tickets and paying'
        : 'delays, diversions, and service changes'

  if (params.smartMode) {
    return {
      heroSrc: PUBLIC_TRANSPORT_SPEAK_LIVE_SMART_HERO_SRC,
      altEn:
        'Female Dutch transit professional facing you at a busy hub — answering questions about trains, trams, buses, the metro, tickets, and delays.',
    }
  }

  return {
    heroSrc: PUBLIC_TRANSPORT_SPEAK_LIVE_WOMAN_HERO_SRC,
    altEn: `Female Dutch ${modeWord} staff member facing you as if in conversation about ${focus}.`,
  }
}

export function resolvePublicTransportSpeakLiveBackdropSrc(input: {
  subTypeFromUrl?: PublicTransportScenarioSubtype
  variationFromUrl?: PublicTransportScenarioVariation
  scenarioContext?: string | null
}): string {
  const inferredVar = inferPublicTransportVariationFromDutchContext(input.scenarioContext)
  const inferredSub = inferPublicTransportSubtypeFromDutchContext(input.scenarioContext)
  const sub = input.subTypeFromUrl ?? inferredSub ?? 'train'
  const variation = input.variationFromUrl ?? inferredVar ?? 'route_and_platform'
  const smartMode = !input.subTypeFromUrl && !input.variationFromUrl && !inferredSub && !inferredVar
  return resolvePublicTransportSpeakLiveVisual({
    smartMode,
    subType: sub,
    variation,
  }).heroSrc
}

export function resolvePublicTransportSubtypeForSession(input: {
  subTypeFromUrl?: PublicTransportScenarioSubtype
  scenarioContext?: string | null
}): PublicTransportScenarioSubtype {
  return input.subTypeFromUrl ?? inferPublicTransportSubtypeFromDutchContext(input.scenarioContext) ?? 'train'
}

export function resolvePublicTransportVariationForSession(input: {
  variationFromUrl?: PublicTransportScenarioVariation
  scenarioContext?: string | null
}): PublicTransportScenarioVariation | undefined {
  return input.variationFromUrl ?? inferPublicTransportVariationFromDutchContext(input.scenarioContext) ?? undefined
}

export const PUBLIC_TRANSPORT_LIVE_CARD_COPY: Record<
  PublicTransportScenarioSubtype,
  { kicker: string; body: string }
> = {
  train: {
    kicker: 'Trein',
    body: 'Perron, vertrek en vertraging — spreek in de microfoon of gebruik Ondertiteling.',
  },
  bus: {
    kicker: 'Bus',
    body: 'Halte, lijn en kaartje: korte praktische zinnen.',
  },
  tram: {
    kicker: 'Tram',
    body: 'Tramhalte en overstappen: duidelijke vragen in het Nederlands.',
  },
  metro: {
    kicker: 'Metro',
    body: 'Metrostation en lijn: luister en bevestig kort.',
  },
}

export type SpeakLiveLaunchOverrides =
  | OrderingFoodScenarioOverrides
  | SupermarketShopScenarioOverrides
  | DirectionsGettingSomewhereOverrides
  | PublicTransportScenarioOverrides
  | BookingReservationsScenarioOverrides
  | StoreServiceIssueScenarioOverrides
  | WorkColleagueScenarioOverrides
  | HousingLandlordScenarioOverrides
  | DoctorPharmacyScenarioOverrides
  | PhoneCallScenarioOverrides
  | SmallTalkScenarioOverrides
  | MeetingNewPeopleScenarioOverrides
  | PartySocialScenarioOverrides
  | ExplainingSomethingScenarioOverrides
  | StorytellingScenarioOverrides
  | OpinionsDiscussionsScenarioOverrides

/** Station backdrop layer inside `SpeakLiveTrainStationVisual` when that layout is used. OV train + route/platform uses {@link PUBLIC_TRANSPORT_SPEAK_LIVE_WOMAN_HERO_SRC}. */
export const TRAIN_STATION_SPEAK_LIVE_HERO_SRC = '/speak-live/dutch-station-bg.png' as const

/** Photoreal Speak Live heroes (same asset family as train under `/speak-live/`). */
export const ORDERING_FOOD_HERO_BY_SUBTYPE: Record<OrderingFoodScenarioSetting, string> = {
  cafe: '/speak-live/ordering-food-cafe.png',
  restaurant: '/speak-live/ordering-food-restaurant.png',
  takeaway: '/speak-live/ordering-food-takeaway.png',
}

/** In-call portrait of the assistant (matches TTS gender heuristics). Catalog still uses {@link ORDERING_FOOD_HERO_BY_SUBTYPE}. */
export const ORDERING_FOOD_ASSISTANT_PORTRAIT_SRC: Record<'male' | 'female', string> = {
  male: '/speak-live/ordering-food-assistant-m.png',
  female: '/speak-live/ordering-food-assistant-f.png',
}

export function getOrderingFoodAssistantPortraitSrc(presentation: 'male' | 'female'): string {
  return ORDERING_FOOD_ASSISTANT_PORTRAIT_SRC[presentation]
}

const ORDERING_FOOD_DEFAULT_HERO_SRC = ORDERING_FOOD_HERO_BY_SUBTYPE.cafe

/**
 * Hero image for ordering food in Speak Live launcher and live chrome.
 * Smart mode (launcher) always uses the default café scene; custom setting picks the matching venue.
 */
export function getOrderingFoodSpeakLiveHeroSrc(options: { smartMode?: boolean; subType?: OrderingFoodScenarioSetting }): string {
  if (options.smartMode) return ORDERING_FOOD_DEFAULT_HERO_SRC
  if (options.subType) return ORDERING_FOOD_HERO_BY_SUBTYPE[options.subType]
  return ORDERING_FOOD_DEFAULT_HERO_SRC
}

/**
 * Infer ordering-food venue from runtime Dutch `context` when the launch URL has no `subType`.
 * Keeps the hero image aligned with “afhaalbalie”, restaurant, or café copy from the server.
 */
export function inferOrderingFoodVenueFromDutchContext(text: string | null | undefined): OrderingFoodScenarioSetting | null {
  const t = (text ?? '').toLowerCase()
  if (!t.trim()) return null
  if (/\bafhaal|take\s*[- ]?away|meeneem|snackbar|broodjes\s*zaak|afhaalbalie\b/i.test(t)) return 'takeaway'
  if (/\brestaurant|diner|ober|à\s*la\s*carte|a\s*la\s*carte|menukaart|aan\s*tafel\b/i.test(t)) return 'restaurant'
  if (/\bcafé|\bcafe\b|espresso|koffiebar|barista|koffiehuis\b/i.test(t)) return 'cafe'
  return null
}

export function resolveOrderingFoodSpeakLiveBackdropSrc(input: {
  subTypeFromUrl?: OrderingFoodScenarioSetting
  scenarioContext?: string | null
}): string {
  const inferred = inferOrderingFoodVenueFromDutchContext(input.scenarioContext)
  const sub: OrderingFoodScenarioSetting = input.subTypeFromUrl ?? inferred ?? 'cafe'
  return getOrderingFoodSpeakLiveHeroSrc({ smartMode: false, subType: sub })
}

export function resolveOrderingFoodVenueForSession(input: {
  subTypeFromUrl?: OrderingFoodScenarioSetting
  scenarioContext?: string | null
}): OrderingFoodScenarioSetting {
  return input.subTypeFromUrl ?? inferOrderingFoodVenueFromDutchContext(input.scenarioContext) ?? 'cafe'
}

/** In-call hero card: short labels that match the venue image (Dutch UI). */
export const ORDERING_FOOD_LIVE_CARD_COPY: Record<
  OrderingFoodScenarioSetting,
  { kicker: string; body: string }
> = {
  cafe: {
    kicker: 'Café',
    body: 'Spreek duidelijk in de microfoon hieronder, of open Ondertiteling om het gesprek te lezen — alsof je aan de koffiebar staat.',
  },
  restaurant: {
    kicker: 'Restaurant',
    body: 'Spreek rustig en duidelijk; de ober wacht op je bestelling. Gebruik de microfoon hieronder of Ondertiteling voor de tekst.',
  },
  takeaway: {
    kicker: 'Afhaal',
    body: 'Je staat aan een afhaalbalie: kort en duidelijk bestellen. Microfoon hieronder, of Ondertiteling om alles te lezen.',
  },
}

export function getOrderingFoodSpeakLiveHeroAlt(options: { smartMode?: boolean; subType?: OrderingFoodScenarioSetting }): string {
  if (options.smartMode) {
    return 'Photoreal Dutch café counter — smart mode mixes café, restaurant, and takeaway each session.'
  }
  if (options.subType === 'restaurant') return 'Photoreal Dutch restaurant interior with tables and soft daylight.'
  if (options.subType === 'takeaway') return 'Photoreal Dutch takeaway counter with display case and practical lighting.'
  return 'Photoreal Dutch café counter with espresso machine and pastries in soft daylight.'
}

export type SpeakLiveCatalogItem = {
  id: string
  /** When set, Speak Live run URL uses this as `scenarioId` (backend slug) instead of `id`. */
  launchScenarioId?: string
  type: SpeakLiveCatalogItemType
  title: string
  shortTitle: string
  category: string
  description: string
  goalsSummary: string
  levelSupport: readonly string[]
  availability: SpeakLiveAvailability
  icon: SpeakLiveScenarioIcon
  tags: readonly string[]
  sortOrder: number
  accent?: SpeakLiveScenarioAccent
  launchRoute?: string
  comingSoonLabel?: string
  estimatedMinutes?: number
  specialLabel?: string
  imageSrc?: string
  imageAlt?: string
}

export type SpeakLiveLiveScenario = SpeakLiveCatalogItem & {
  availability: 'live'
  launchRoute: string
}

export type SpeakLiveComingSoonItem = SpeakLiveCatalogItem & {
  availability: 'coming_soon'
}

/**
 * Local Speak Live catalog for the launcher UI.
 * Keeps the page scalable without changing the launch contract for live scenarios.
 *
 * `train-station-classic` is an extra launcher tile: same backend `train-station` slug with fixed train + route/platform.
 */
export const TRAIN_STATION_CLASSIC_SCENARIO_ID = 'train-station-classic' as const

export const SPEAK_LIVE_CATALOG: readonly SpeakLiveCatalogItem[] = [
  {
    id: TRAIN_STATION_CLASSIC_SCENARIO_ID,
    launchScenarioId: TRAIN_STATION_SCENARIO_ID,
    type: 'scenario',
    title: 'Train (station)',
    shortTitle: 'Train',
    category: 'Transport',
    description: 'Platforms, departures, and timing—in confident Dutch.',
    goalsSummary: 'Station vocabulary that still feels natural on a busy concourse.',
    levelSupport: ['A1', 'A2', 'B1'],
    availability: 'live',
    icon: 'train',
    tags: ['Live now', 'Station', 'NS-style'],
    sortOrder: 11,
    accent: 'emerald',
    launchRoute: APP_SPEAK_LIVE_RUN,
    estimatedMinutes: 6,
    /** Station plate — visually distinct from the mixed-OV smart card (tram/street staff hero). */
    imageSrc: TRAIN_STATION_SPEAK_LIVE_HERO_SRC,
    imageAlt:
      'Dutch train station concourse and platforms — classic train practice for routes, departures, and platform talk.',
  },
  {
    id: 'train-station',
    type: 'scenario',
    title: 'Public transport',
    shortTitle: 'OV',
    category: 'Transport',
    description: 'Tickets, routes, delays—spoken like you belong on the network.',
    goalsSummary: 'Stay composed through transfers, detours, and desk questions.',
    levelSupport: ['A1', 'A2', 'B1'],
    availability: 'live',
    icon: 'train',
    tags: ['Live now', 'Practical', 'Travel'],
    sortOrder: 10,
    accent: 'emerald',
    launchRoute: APP_SPEAK_LIVE_RUN,
    estimatedMinutes: 6,
    imageSrc: PUBLIC_TRANSPORT_SPEAK_LIVE_SMART_HERO_SRC,
    imageAlt:
      'Female Dutch transit professional at a hub — default card art for public transport (train, bus, tram, metro).',
  },
  {
    id: 'ordering_food',
    type: 'scenario',
    title: 'Ordering food / drinks',
    shortTitle: 'Food',
    category: 'Food & drink',
    description: 'From counter to table—orders that sound effortless.',
    goalsSummary: 'Navigate menus, tweaks, and questions without losing the thread.',
    levelSupport: ['A1', 'A2', 'B1'],
    availability: 'live',
    icon: 'coffee',
    tags: ['Live now', 'Ordering', 'Everyday'],
    sortOrder: 20,
    accent: 'amber',
    launchRoute: APP_SPEAK_LIVE_RUN,
    estimatedMinutes: 5,
    imageSrc: ORDERING_FOOD_DEFAULT_HERO_SRC,
    imageAlt: 'Photoreal Dutch café counter — default card art for ordering food / drinks.',
  },
  {
    id: 'supermarket_shop',
    type: 'scenario',
    title: 'Supermarket / shop',
    shortTitle: 'Supermarket',
    category: 'Shopping',
    description: 'Aisles, checkout, quick questions in the moment.',
    goalsSummary: 'Ask where things live, handle payment, leave without second-guessing.',
    levelSupport: ['A1', 'A2', 'B1'],
    availability: 'live',
    icon: 'shopping_cart',
    tags: ['Live now', 'Errands', 'Everyday'],
    sortOrder: 30,
    accent: 'sky',
    launchRoute: APP_SPEAK_LIVE_RUN,
    estimatedMinutes: 6,
    imageSrc: SUPERMARKET_SHOP_DEFAULT_HERO_SRC,
    imageAlt: resolveSupermarketShopSpeakLiveVisual({ smartMode: true }).altEn,
  },
  {
    id: 'directions_getting_somewhere',
    type: 'scenario',
    title: 'Directions / getting somewhere',
    shortTitle: 'Directions',
    category: 'Getting around',
    description: 'Ask once, follow twice, confirm you are headed the right way.',
    goalsSummary: 'Decode route cues and lock in the next move before you walk.',
    levelSupport: ['A1', 'A2', 'B1'],
    availability: 'live',
    icon: 'map',
    tags: ['Live now', 'Navigation', 'Street Dutch'],
    sortOrder: 40,
    accent: 'violet',
    launchRoute: APP_SPEAK_LIVE_RUN,
    estimatedMinutes: 6,
    imageSrc: DIRECTIONS_DEFAULT_HERO_SRC,
    imageAlt: resolveDirectionsSpeakLiveVisual({ smartMode: true }).altEn,
  },
  {
    id: 'booking_reservations',
    type: 'scenario',
    title: 'Booking / reservations',
    shortTitle: 'Booking',
    category: 'Appointments',
    description: 'Tables, appointments, slots—hold the details without sounding lost.',
    goalsSummary: 'Sound polite, precise, and sure when you seal the plan.',
    levelSupport: ['A1', 'A2', 'B1'],
    availability: 'live',
    icon: 'calendar',
    tags: ['Live now', 'Planning', 'Everyday'],
    sortOrder: 50,
    accent: 'rose',
    launchRoute: APP_SPEAK_LIVE_RUN,
    estimatedMinutes: 7,
    imageSrc: BOOKING_RESERVATIONS_DEFAULT_HERO_SRC,
    imageAlt: resolveBookingReservationsSpeakLiveVisual({ smartMode: true }).altEn,
  },
  {
    id: 'store_service_issue',
    type: 'scenario',
    title: 'Problem in a store / service issue',
    shortTitle: 'Store / service',
    category: 'Friction',
    description: 'Say what broke, ask for help, stay steady in Dutch.',
    goalsSummary: 'Move from problem to next step without losing your cool.',
    levelSupport: ['A1', 'A2', 'B1'],
    availability: 'live',
    icon: 'shopping_cart',
    tags: ['Live now', 'Errands', 'Everyday'],
    sortOrder: 55,
    accent: 'amber',
    launchRoute: APP_SPEAK_LIVE_RUN,
    estimatedMinutes: 7,
    imageSrc: STORE_SERVICE_ISSUE_DEFAULT_HERO_SRC,
    imageAlt: resolveStoreServiceIssueSpeakLiveVisual({ smartMode: true, assistantPresentation: 'female' }).altEn,
  },
  {
    id: 'doctor_pharmacy',
    type: 'scenario',
    title: 'Doctor / pharmacy',
    shortTitle: 'Doctor / pharmacy',
    category: 'Health',
    description: 'Symptoms, instructions, next steps—without the jargon spiral.',
    goalsSummary: 'Say what you feel, catch what matters, leave knowing what to do.',
    levelSupport: ['A1', 'A2', 'B1'],
    availability: 'live',
    icon: 'stethoscope',
    tags: ['Live now', 'Health', 'Everyday'],
    sortOrder: 60,
    accent: 'rose',
    launchRoute: APP_SPEAK_LIVE_RUN,
    estimatedMinutes: 7,
    imageSrc: DOCTOR_PHARMACY_DEFAULT_HERO_SRC,
    imageAlt: resolveDoctorPharmacySpeakLiveVisual({ smartMode: true, assistantPresentation: 'female' }).altEn,
  },
  {
    id: WORK_COLLEAGUE_INTERACTION_SCENARIO_ID,
    type: 'scenario',
    title: 'Work / colleague interaction',
    shortTitle: 'Work',
    category: 'Work',
    description: 'Quick desk talk—status, help, and what happens next.',
    goalsSummary: 'Sound steady in short exchanges that still need polish.',
    levelSupport: ['A1', 'A2', 'B1'],
    availability: 'live',
    icon: 'briefcase',
    tags: ['Live now', 'Professional', 'Office Dutch'],
    sortOrder: 70,
    accent: 'slate',
    launchRoute: APP_SPEAK_LIVE_RUN,
    estimatedMinutes: 7,
    imageSrc: WORK_COLLEAGUE_DEFAULT_HERO_SRC,
    imageAlt: resolveWorkColleagueInteractionSpeakLiveVisual({ smartMode: true, assistantPresentation: 'female' }).altEn,
  },
  {
    id: HOUSING_LANDLORD_SCENARIO_ID,
    type: 'scenario',
    title: 'Housing / landlord',
    shortTitle: 'Housing',
    category: 'Housing',
    description: 'Repairs, rent, paperwork—plain Dutch that moves things forward.',
    goalsSummary: 'Describe issues, ask for timelines, confirm what was agreed.',
    levelSupport: ['A1', 'A2', 'B1'],
    availability: 'live',
    icon: 'home',
    tags: ['Live now', 'Housing', 'Everyday'],
    sortOrder: 72,
    accent: 'amber',
    launchRoute: APP_SPEAK_LIVE_RUN,
    estimatedMinutes: 7,
    imageSrc: HOUSING_LANDLORD_DEFAULT_HERO_SRC,
    imageAlt: resolveHousingLandlordSpeakLiveVisual({ smartMode: true, assistantPresentation: 'female' }).altEn,
  },
  {
    id: PHONE_CALL_SCENARIO_ID,
    type: 'scenario',
    title: 'Phone call',
    shortTitle: 'Phone',
    category: 'Advanced',
    description: 'Audio-first Dutch—pace, pauses, and recoveries that feel human.',
    goalsSummary: 'Repair misses, keep rhythm, close the loop without sounding rushed.',
    levelSupport: ['A1', 'A2', 'B1'],
    availability: 'live',
    icon: 'phone',
    tags: ['Live now', 'Listening', 'Repair', 'Phone Dutch'],
    sortOrder: 73,
    accent: 'violet',
    launchRoute: APP_SPEAK_LIVE_RUN,
    estimatedMinutes: 6,
    imageSrc: PHONE_CALL_DEFAULT_HERO_SRC,
    imageAlt: resolvePhoneCallSpeakLiveVisual({
      variation: 'starting_call',
      assistantPresentation: 'female',
      subType: 'appointment_call',
    }).altEn,
  },
  {
    id: SMALL_TALK_SCENARIO_ID,
    type: 'scenario',
    title: 'Small talk',
    shortTitle: 'Small talk',
    category: 'Social',
    description: 'Weather, weekend plans, the light glue between people.',
    goalsSummary: 'React in real time, pass the ball back, keep things easy.',
    levelSupport: ['A1', 'A2', 'B1'],
    availability: 'live',
    icon: 'message_circle',
    tags: ['Live now', 'Social', 'Everyday', 'Confidence'],
    sortOrder: 74,
    accent: 'sky',
    launchRoute: APP_SPEAK_LIVE_RUN,
    estimatedMinutes: 6,
    imageSrc: SMALL_TALK_DEFAULT_HERO_SRC,
    imageAlt: getSmallTalkSpeakLiveHeroAlt({}),
  },
  {
    id: MEETING_NEW_PEOPLE_SCENARIO_ID,
    type: 'scenario',
    title: 'Meeting new people',
    shortTitle: 'Meeting people',
    category: 'Social',
    description: 'Introductions that feel curious—not rehearsed.',
    goalsSummary: 'Trade basics, ask sharper follow-ups, keep the exchange even.',
    levelSupport: ['A1', 'A2', 'B1'],
    availability: 'live',
    icon: 'users',
    tags: ['Live now', 'Social', 'Introductions', 'Networking'],
    sortOrder: 75,
    accent: 'violet',
    launchRoute: APP_SPEAK_LIVE_RUN,
    estimatedMinutes: 7,
    imageSrc: MEETING_NEW_PEOPLE_DEFAULT_HERO_SRC,
    imageAlt: getMeetingNewPeopleSpeakLiveHeroAlt({ variation: 'introductions' }),
  },
  {
    id: PARTY_SOCIAL_SCENARIO_ID,
    type: 'scenario',
    title: 'At a party / social setting',
    shortTitle: 'Party',
    category: 'Social',
    description: 'Short bursts, quick pivots, energy that matches the room.',
    goalsSummary: 'Jump topics gracefully and keep the tone warm.',
    levelSupport: ['A1', 'A2', 'B1'],
    availability: 'live',
    icon: 'sparkles',
    tags: ['Live now', 'Social', 'Party', 'Networking'],
    sortOrder: 76,
    accent: 'amber',
    launchRoute: APP_SPEAK_LIVE_RUN,
    estimatedMinutes: 6,
    imageSrc: PARTY_SOCIAL_DEFAULT_HERO_SRC,
    imageAlt: getPartySocialSpeakLiveHeroAlt({ variation: 'keeping_conversation_going' }),
  },
  {
    id: EXPLAINING_SOMETHING_SCENARIO_ID,
    type: 'scenario',
    title: 'Explaining something',
    shortTitle: 'Explain',
    category: 'Advanced',
    description: 'Steps, order, and clarity when someone is listening closely.',
    goalsSummary: 'Hold a thread, signal turns, sound intentional—not rushed.',
    levelSupport: ['A1', 'A2', 'B1'],
    availability: 'live',
    icon: 'sparkles',
    tags: ['Live now', 'Advanced', 'Structure', 'Monologue'],
    sortOrder: 77,
    accent: 'violet',
    launchRoute: APP_SPEAK_LIVE_RUN,
    estimatedMinutes: 7,
    imageSrc: EXPLAINING_SOMETHING_DEFAULT_HERO_SRC,
    imageAlt: getExplainingSomethingSpeakLiveHeroAlt({ variation: 'giving_instructions' }),
  },
  {
    id: STORYTELLING_SCENARIO_ID,
    type: 'scenario',
    title: 'Storytelling',
    shortTitle: 'Story',
    category: 'Advanced',
    description: 'Past moments with shape: setup, hinge, landing.',
    goalsSummary: 'Stretch detail without losing the listener in the middle.',
    levelSupport: ['A1', 'A2', 'B1'],
    availability: 'live',
    icon: 'sparkles',
    tags: ['Live now', 'Advanced', 'Narrative', 'Past tense'],
    sortOrder: 78,
    accent: 'violet',
    launchRoute: APP_SPEAK_LIVE_RUN,
    estimatedMinutes: 8,
    imageSrc: STORYTELLING_DEFAULT_HERO_SRC,
    imageAlt: getStorytellingSpeakLiveHeroAlt({ variation: 'what_you_did_yesterday' }),
  },
  {
    id: OPINIONS_DISCUSSIONS_SCENARIO_ID,
    type: 'scenario',
    title: 'Opinions & discussions',
    shortTitle: 'Opinions',
    category: 'Advanced',
    description: 'Stance, evidence, tone that stays respectful.',
    goalsSummary: 'Say what you mean—and why—with calm structure.',
    levelSupport: ['A1', 'A2', 'B1'],
    availability: 'live',
    icon: 'sparkles',
    tags: ['Live now', 'Advanced', 'Opinion', 'Debate'],
    sortOrder: 79,
    accent: 'amber',
    launchRoute: APP_SPEAK_LIVE_RUN,
    estimatedMinutes: 7,
    imageSrc: OPINIONS_DISCUSSIONS_DEFAULT_HERO_SRC,
    imageAlt: getOpinionsDiscussionsSpeakLiveHeroAlt({ variation: 'agree_disagree' }),
  },
  {
    id: 'service-problem-complaint',
    type: 'scenario',
    title: 'Service problem / complaint',
    shortTitle: 'Complaint',
    category: 'Friction',
    description: 'From issue to resolution—without theatrics.',
    goalsSummary: 'Name the gap, ask for action, confirm the fix.',
    levelSupport: ['A2', 'B1'],
    availability: 'coming_soon',
    icon: 'wrench',
    tags: ['Problem solving', 'Repair'],
    sortOrder: 90,
    accent: 'rose',
    comingSoonLabel: 'Coming soon',
    estimatedMinutes: 7,
  },
  {
    id: 'introductions',
    type: 'scenario',
    title: 'Introductions',
    shortTitle: 'Intro',
    category: 'Social',
    description: 'Names, context, and the next inviting question.',
    goalsSummary: 'Open warmly, listen back, keep momentum.',
    levelSupport: ['A1', 'A2', 'B1'],
    availability: 'coming_soon',
    icon: 'users',
    tags: ['Confidence', 'Social'],
    sortOrder: 120,
    accent: 'sky',
    comingSoonLabel: 'Coming soon',
    estimatedMinutes: 5,
  },
  {
    id: 'language-coach',
    type: 'coach_mode',
    title: 'Language Coach',
    shortTitle: 'Coach',
    category: 'Coach',
    description: 'Adaptive Dutch coaching with room to wander.',
    goalsSummary: 'Free-form reps plus a recap you can build on.',
    levelSupport: ['A1', 'A2', 'B1', 'B2'],
    availability: 'live',
    icon: 'sparkles',
    tags: ['Premium', 'Adaptive', 'Free form'],
    sortOrder: 200,
    accent: 'violet',
    launchRoute: APP_LANGUAGE_COACH,
    launchScenarioId: LANGUAGE_COACH_SCENARIO_ID,
    specialLabel: 'Adaptive',
    imageSrc: LANGUAGE_COACH_DEFAULT_HERO_SRC,
    imageAlt:
      'Photoreal Dutch language coach: a friendly professional woman faces you at a desk, ready for adaptive conversation practice.',
  },
] as const

function sortSpeakLiveCatalog(items: readonly SpeakLiveCatalogItem[]): SpeakLiveCatalogItem[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getLiveScenarios(): SpeakLiveLiveScenario[] {
  return sortSpeakLiveCatalog(SPEAK_LIVE_CATALOG).filter(isSpeakLiveLaunchableItem)
}

export function getComingSoonScenarios(): SpeakLiveComingSoonItem[] {
  return sortSpeakLiveCatalog(SPEAK_LIVE_CATALOG).filter(
    (item): item is SpeakLiveComingSoonItem => item.type === 'scenario' && item.availability === 'coming_soon'
  )
}

export function getCoachModeItems(): SpeakLiveCatalogItem[] {
  return sortSpeakLiveCatalog(SPEAK_LIVE_CATALOG).filter((item) => item.type === 'coach_mode')
}

export function getDefaultLiveScenario(): SpeakLiveLiveScenario {
  return getLiveScenarios()[0] ?? ({
    id: 'train-station',
    type: 'scenario',
    title: 'Public transport',
    shortTitle: 'OV',
    category: 'Transport',
    description: 'Tickets, routes, delays—spoken like you belong on the network.',
    goalsSummary: 'Stay composed through transfers, detours, and desk questions.',
    levelSupport: ['A1', 'A2', 'B1'],
    availability: 'live',
    icon: 'train',
    tags: ['Live now', 'Practical', 'Travel'],
    sortOrder: 0,
    accent: 'emerald',
    launchRoute: APP_SPEAK_LIVE_RUN,
    estimatedMinutes: 6,
  } satisfies SpeakLiveLiveScenario)
}

export const SPEAK_LIVE_DEFAULT_SCENARIO_ID = getDefaultLiveScenario().id

/** Backwards-compatible lightweight list for older selector consumers. */
export const SPEAK_LIVE_SCENARIOS = SPEAK_LIVE_CATALOG.map((item) => ({
  scenarioId: item.launchScenarioId ?? item.id,
  label: item.title,
  description: item.description,
}))

/**
 * API threads sometimes carry `ScenarioDefinitions.Id` (SQL seed GUID) instead of catalog slugs.
 * Map those stable ids to catalog keys (`item.id` or `item.launchScenarioId`).
 */
const SPEAK_LIVE_SCENARIO_DB_ID_TO_CATALOG_KEY: Readonly<Record<string, string>> = {
  'c3d4e5f6-a7b8-4001-8010-000000000001': TRAIN_STATION_SCENARIO_ID,
  'c3d4e5f6-a7b8-4001-8010-000000000004': ORDERING_FOOD_SCENARIO_ID,
  'c3d4e5f6-a7b8-4001-8010-000000000005': SUPERMARKET_SHOP_SCENARIO_ID,
  'c3d4e5f6-a7b8-4001-8010-000000000008': DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID,
  'c3d4e5f6-a7b8-4001-8010-00000000000a': BOOKING_RESERVATIONS_SCENARIO_ID,
  'c3d4e5f6-a7b8-4001-8010-00000000000c': DOCTOR_PHARMACY_SCENARIO_ID,
  'c3d4e5f6-a7b8-4001-8010-00000000000e': STORE_SERVICE_ISSUE_SCENARIO_ID,
  'c3d4e5f6-a7b8-4001-8010-000000000010': WORK_COLLEAGUE_INTERACTION_SCENARIO_ID,
  'c3d4e5f6-a7b8-4001-8010-000000000012': HOUSING_LANDLORD_SCENARIO_ID,
  'c3d4e5f6-a7b8-4001-8010-000000000014': PHONE_CALL_SCENARIO_ID,
  'c3d4e5f6-a7b8-4001-8010-000000000016': SMALL_TALK_SCENARIO_ID,
  'c3d4e5f6-a7b8-4001-8010-000000000018': MEETING_NEW_PEOPLE_SCENARIO_ID,
  'c3d4e5f6-a7b8-4001-8010-000000000020': PARTY_SOCIAL_SCENARIO_ID,
  'c3d4e5f6-a7b8-4001-8010-000000000022': EXPLAINING_SOMETHING_SCENARIO_ID,
  'c3d4e5f6-a7b8-4001-8010-000000000024': STORYTELLING_SCENARIO_ID,
  'c3d4e5f6-a7b8-4001-8010-000000000026': OPINIONS_DISCUSSIONS_SCENARIO_ID,
  'c3d4e5f6-a7b8-4001-8010-000000000028': LANGUAGE_COACH_SCENARIO_ID,
}

export function getSpeakLiveCatalogItem(id: string): SpeakLiveCatalogItem | undefined {
  const t = id.trim()
  if (!t) return undefined
  const byId = SPEAK_LIVE_CATALOG.find((item) => item.id === t)
  if (byId) return byId
  const byLaunch = SPEAK_LIVE_CATALOG.find((item) => item.launchScenarioId === t)
  if (byLaunch) return byLaunch
  const mapped = SPEAK_LIVE_SCENARIO_DB_ID_TO_CATALOG_KEY[t.toLowerCase()]
  if (!mapped) return undefined
  return (
    SPEAK_LIVE_CATALOG.find((item) => item.id === mapped) ||
    SPEAK_LIVE_CATALOG.find((item) => item.launchScenarioId === mapped)
  )
}

export function isSpeakLiveLaunchableItem(
  item: SpeakLiveCatalogItem | undefined
): item is SpeakLiveLiveScenario {
  return Boolean(
    item &&
      item.availability === 'live' &&
      item.launchRoute &&
      /** Language Coach uses the dedicated entry flow, not the generic run launcher. */
      item.type !== 'coach_mode'
  )
}

export function getSpeakLiveLaunchHref(
  item: SpeakLiveCatalogItem | undefined,
  level: string,
  overrides?: SpeakLiveLaunchOverrides
): string | null {
  if (!isSpeakLiveLaunchableItem(item)) return null
  if (item.launchRoute === APP_LANGUAGE_COACH) {
    return APP_LANGUAGE_COACH
  }
  if (item.launchRoute === APP_SPEAK_LIVE_RUN) {
    const dest =
      overrides && 'destination' in overrides && typeof overrides.destination === 'string'
        ? overrides.destination.trim()
        : ''
    const detailFocusRaw =
      overrides && typeof (overrides as { detailFocus?: string }).detailFocus === 'string'
        ? (overrides as { detailFocus?: string }).detailFocus!.trim().slice(0, 64)
        : ''
    const phoneOverrides = overrides as PhoneCallScenarioOverrides | undefined
    const interactionUi =
      (item.launchScenarioId ?? item.id) === PHONE_CALL_SCENARIO_ID
        ? phoneOverrides?.interactionUi === 'standard'
          ? undefined
          : ('phone' as const)
        : undefined
    return speakLiveRunHref({
      scenarioId: item.launchScenarioId ?? item.id,
      level,
      ...(overrides?.subType ? { subType: overrides.subType } : {}),
      ...(overrides?.variation ? { variation: overrides.variation } : {}),
      ...(dest ? { destination: dest } : {}),
      ...(detailFocusRaw ? { detailFocus: detailFocusRaw } : {}),
      ...(interactionUi ? { interactionUi } : {}),
    })
  }
  const q = new URLSearchParams({ scenarioId: item.id, level })
  return `${item.launchRoute}?${q.toString()}`
}
