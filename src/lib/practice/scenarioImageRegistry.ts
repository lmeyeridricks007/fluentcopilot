/**
 * Production scenario image registry — hero + thumbnail URLs, English UI labels, alt text.
 * Visual fallbacks (gradient + icon) live in ScenarioSceneVisual when src fails or is absent.
 */

import { getScenarioCatalogEntry } from '@/lib/practice/scenarioCatalog'
import type { ScenarioCatalogEntry } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
import type { ScenarioCatalogCategory } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'

export const SCENARIO_IMAGE_DIR = '/images/scenarios' as const

export type ScenarioImageBundle = {
  /** Wide banner / hero (16∶9–2.4∶1 safe centre-weighted) */
  heroSrc: string
  /** Cards & thumbs — v1 same asset; swap to tighter crop when you add `-thumb.webp` */
  thumbnailSrc: string
  /** Short chip in English (product chrome) */
  themeLabelEn: string
  /** Accessible description in English */
  altEn: string
}

const DIR = SCENARIO_IMAGE_DIR

/** Bust CDN/browser cache after replacing booking hero PNGs. */
const BOOKING_HERO_CACHE_BUST = 'v=20260417c' as const

/**
 * First production pack — WebP under `public/images/scenarios/`.
 * Regenerate with prompts in `docs/product/scenario-image-prompts.md`.
 */
export const SCENARIO_IMAGE_REGISTRY: Record<string, ScenarioImageBundle> = {
  cafe: {
    heroSrc: `${DIR}/cafe.webp`,
    thumbnailSrc: `${DIR}/cafe.webp`,
    themeLabelEn: 'Café',
    altEn: 'Small Dutch café interior with counter, espresso machine and pastries in soft daylight.',
  },
  supermarket_shop: {
    heroSrc: `${DIR}/supermarket.webp`,
    thumbnailSrc: `${DIR}/supermarket.webp`,
    themeLabelEn: 'Supermarket / shop',
    altEn:
      'European supermarket: wide aisle, shelves, and soft overhead light — premium default for shop-floor practice.',
  },
  doctor: {
    heroSrc: `${DIR}/doctor.webp`,
    thumbnailSrc: `${DIR}/doctor.webp`,
    themeLabelEn: 'Doctor',
    altEn: 'Calm doctor visit setting: reception desk and waiting area, no people in focus.',
  },
  municipality: {
    heroSrc: `${DIR}/municipality.webp`,
    thumbnailSrc: `${DIR}/municipality.webp`,
    themeLabelEn: 'Municipality',
    altEn: 'Modern municipal service desk with queue area and documents, civic office interior.',
  },
  work: {
    heroSrc: `${DIR}/work.webp`,
    thumbnailSrc: `${DIR}/work.webp`,
    themeLabelEn: 'Work',
    altEn: 'Contemporary European office meeting table with chairs and laptop, restrained styling.',
  },
  train: {
    heroSrc: `${DIR}/train.webp`,
    thumbnailSrc: `${DIR}/train.webp`,
    themeLabelEn: 'Train station',
    altEn: 'Dutch-style train platform with service counter and departure information display, soft daylight.',
  },
  directions_getting_somewhere: {
    heroSrc: '/speak-live/directions-hero-station-woman.png',
    thumbnailSrc: '/speak-live/directions-hero-station-woman.png',
    themeLabelEn: 'Directions',
    altEn:
      'Photoreal Dutch station setting with a helpful local woman in frame — default hero for Speak Live directions practice.',
  },
  housing: {
    heroSrc: `${DIR}/housing.webp`,
    thumbnailSrc: `${DIR}/housing.webp`,
    themeLabelEn: 'Housing',
    altEn: 'Apartment building entrance with intercom panel, neutral residential context.',
  },
  social_plans: {
    heroSrc: `${DIR}/social_plans.webp`,
    thumbnailSrc: `${DIR}/social_plans.webp`,
    themeLabelEn: 'Social',
    altEn: 'Bright café corner with two chairs and table by a window, inviting conversation.',
  },
  problem_solving: {
    heroSrc: `${DIR}/problem_solving.webp`,
    thumbnailSrc: `${DIR}/problem_solving.webp`,
    themeLabelEn: 'Shop',
    altEn: 'Retail service counter for resolving an order issue, calm European shop interior.',
  },
  restaurant: {
    heroSrc: `${DIR}/restaurant.webp`,
    thumbnailSrc: `${DIR}/restaurant.webp`,
    themeLabelEn: 'Restaurant',
    altEn: 'Calm Dutch restaurant interior with set tables, soft daylight, no logos, no readable menu text.',
  },
  ordering_food: {
    heroSrc: '/speak-live/ordering-food-cafe.png',
    thumbnailSrc: '/speak-live/ordering-food-cafe.png',
    themeLabelEn: 'Ordering food',
    altEn: 'Photoreal Dutch café counter — default hero for ordering food; Speak Live uses café, restaurant, and takeaway variants.',
  },
  pharmacy: {
    heroSrc: `${DIR}/pharmacy.webp`,
    thumbnailSrc: `${DIR}/pharmacy.webp`,
    themeLabelEn: 'Pharmacy',
    altEn: 'European pharmacy counter with shelves of medicine, soft clinical lighting, no brand names readable.',
  },
  school_front_desk: {
    heroSrc: `${DIR}/school_front_desk.webp`,
    thumbnailSrc: `${DIR}/school_front_desk.webp`,
    themeLabelEn: 'School',
    altEn: 'School reception desk with notice board, calm Dutch school entrance, no faces, no logos.',
  },
  phone_appointment: {
    heroSrc: `${DIR}/phone_appointment.webp`,
    thumbnailSrc: `${DIR}/phone_appointment.webp`,
    themeLabelEn: 'Phone',
    altEn: 'Minimal scene suggesting a phone call: handset on desk near calendar, soft daylight, no text on screen.',
  },
  package_pickup: {
    heroSrc: `${DIR}/package_pickup.webp`,
    thumbnailSrc: `${DIR}/package_pickup.webp`,
    themeLabelEn: 'Parcel',
    altEn: 'Parcel pickup counter with shelves of packages, European service point, calm neutral interior.',
  },
  bank_office: {
    heroSrc: `${DIR}/bank_office.webp`,
    thumbnailSrc: `${DIR}/bank_office.webp`,
    themeLabelEn: 'Bank',
    altEn: 'Quiet bank service counter with privacy screen, modern European interior, no logos.',
  },
  weather_plans: {
    heroSrc: `${DIR}/weather_plans.webp`,
    thumbnailSrc: `${DIR}/weather_plans.webp`,
    themeLabelEn: 'Plans',
    altEn: 'Park bench and soft sky suggesting weather chat, calm desaturated tones, uncluttered, no people.',
  },
  booking_reservations: {
    heroSrc: `/speak-live/booking-smart-mix-staff.png?${BOOKING_HERO_CACHE_BUST}`,
    thumbnailSrc: `/speak-live/booking-smart-mix-staff.png?${BOOKING_HERO_CACHE_BUST}`,
    themeLabelEn: 'Booking / reservations',
    altEn:
      'Friendly female reception professional — mixed booking practice in Dutch (restaurant, salon, or desk), aligned with a female assistant voice.',
  },
  doctor_pharmacy: {
    heroSrc: '/speak-live/health-smart-staff-f.png',
    thumbnailSrc: '/speak-live/health-smart-staff-f.png',
    themeLabelEn: 'Doctor / pharmacy',
    altEn: 'Calm Dutch health setting — doctor visit, pharmacy counter, or clinic reception for practical Dutch practice.',
  },
  store_service_issue: {
    heroSrc: '/speak-live/store-smart-staff-f.png',
    thumbnailSrc: '/speak-live/store-smart-staff-f.png',
    themeLabelEn: 'Store / service issue',
    altEn:
      'Photoreal Dutch retail service counter — smart mix preview with a female staff member as the primary person you speak with.',
  },
  work_colleague_interaction: {
    heroSrc: '/speak-live/work-smart-staff-f.png',
    thumbnailSrc: '/speak-live/work-smart-staff-f.png',
    themeLabelEn: 'Work / colleague',
    altEn:
      'Photoreal Dutch office — two colleagues visible; primary person you speak with is a female professional (default preview). Speak Live matches hero to assistant voice gender.',
  },
  housing_landlord: {
    heroSrc: '/speak-live/housing-smart-staff-f.png',
    thumbnailSrc: '/speak-live/housing-smart-staff-f.png',
    themeLabelEn: 'Housing / landlord',
    altEn:
      'Photoreal Dutch housing contact — smart mix preview with a female professional as the primary person you speak with; male colleague also visible. Speak Live matches hero to assistant voice gender.',
  },
  phone_call: {
    heroSrc: '/speak-live/phone-call-starting-f-hero.png',
    thumbnailSrc: '/speak-live/phone-call-starting-f-hero.png',
    themeLabelEn: 'Phone call',
    altEn:
      'Photoreal Dutch phone practice: a professional woman on a headset facing you as if on a video call — planning line, opening the call. Male and female heroes swap with assistant voice; variation changes the scene.',
  },
}

/** Variation-specific Speak Live heroes (each has male + female focal staff assets under `/public/speak-live/`). */
type StoreServiceIssueSpeakLiveVisualId = 'smart' | 'returning_item' | 'complaint' | 'explaining_issue'

function storeServiceIssueStaffHeroPath(visual: StoreServiceIssueSpeakLiveVisualId, gender: 'male' | 'female'): string {
  const g = gender === 'female' ? 'f' : 'm'
  if (visual === 'smart') return `/speak-live/store-smart-staff-${g}.png`
  if (visual === 'returning_item') return `/speak-live/store-returning-staff-${g}.png`
  if (visual === 'complaint') return `/speak-live/store-complaint-staff-${g}.png`
  return `/speak-live/store-explaining-staff-${g}.png`
}

function resolveStoreServiceIssueVisualId(params: {
  smartMode?: boolean
  subType?: string | null
  variation?: string | null
}): StoreServiceIssueSpeakLiveVisualId {
  if (params.smartMode) return 'smart'
  const v = (params.variation ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'returning_item' || v === 'return') return 'returning_item'
  if (v === 'complaint') return 'complaint'
  if (v === 'explaining_issue' || v === 'explain') return 'explaining_issue'
  const st = (params.subType ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (st === 'store_return') return 'returning_item'
  if (st === 'service_issue') return 'complaint'
  if (st === 'product_problem') return 'explaining_issue'
  return 'smart'
}

function storeServiceIssueAltFor(visual: StoreServiceIssueSpeakLiveVisualId, gender: 'male' | 'female'): string {
  const who = gender === 'female' ? 'female' : 'male'
  const other = gender === 'female' ? 'male' : 'female'
  const focal = `Photoreal first-person view at a Dutch store or service counter; the primary staff member you speak with is a ${who} professional`
  const pair = `a ${other} colleague is also visible at the desk`
  if (visual === 'smart') {
    return `${focal}; ${pair} — mixed returns, service issues, and product problems. Matches a ${who} assistant voice.`
  }
  if (visual === 'returning_item') {
    return `${focal} at a returns desk with receipt and bag cues; ${pair}. Matches a ${who} assistant voice.`
  }
  if (visual === 'complaint') {
    return `${focal} at a customer-service style counter; ${pair} — polite complaint and order-issue practice. Matches a ${who} assistant voice.`
  }
  return `${focal} discussing a product issue; ${pair} — defect and next-step vocabulary. Matches a ${who} assistant voice.`
}

/**
 * Speak Live hero for store / service issue — **unique photoreal staff image per variation** (returning / complaint /
 * explaining) plus a smart-mix hero; **male vs female focal staff** follows {@link assistantPresentation} so the
 * portrait aligns with TTS voice (see `buildSpeakLiveSessionMedia`).
 */
type WorkColleagueSpeakLiveVisualId = 'smart' | 'simple' | 'help' | 'clarify'

function workColleagueStaffHeroPath(visual: WorkColleagueSpeakLiveVisualId, gender: 'male' | 'female'): string {
  const g = gender === 'female' ? 'f' : 'm'
  if (visual === 'smart') return `/speak-live/work-smart-staff-${g}.png`
  if (visual === 'simple') return `/speak-live/work-simple-staff-${g}.png`
  if (visual === 'help') return `/speak-live/work-help-staff-${g}.png`
  return `/speak-live/work-clarify-staff-${g}.png`
}

function resolveWorkColleagueSpeakLiveVisualId(params: { smartMode?: boolean; variation?: string | null }): WorkColleagueSpeakLiveVisualId {
  if (params.smartMode !== false) return 'smart'
  const v = (params.variation ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'asking_for_help' || v === 'help') return 'help'
  if (v === 'clarifying_tasks' || v === 'clarify') return 'clarify'
  if (v === 'simple_workplace_conversation' || v === 'simple_workplace' || v === 'simple') return 'simple'
  return 'smart'
}

function workColleagueAltFor(visual: WorkColleagueSpeakLiveVisualId, gender: 'male' | 'female'): string {
  const who = gender === 'female' ? 'female' : 'male'
  const other = gender === 'female' ? 'male' : 'female'
  const pair = `Both a ${who} and a ${other} colleague are visible; the primary person you are talking to is the ${who} professional — aligned with a ${who} assistant voice.`
  if (visual === 'smart') {
    return `Photoreal Dutch office collaboration — ${pair} Mixed workplace practice (colleague, team, or lead vibe).`
  }
  if (visual === 'simple') {
    return `Photoreal Dutch office desk conversation — ${pair} Short status or check-in workplace Dutch.`
  }
  if (visual === 'help') {
    return `Photoreal Dutch office — ${pair} Supportive moment asking for or giving help with a task or document.`
  }
  return `Photoreal Dutch office — ${pair} Clarifying deadlines, sequence, and next steps.`
}

/**
 * Speak Live hero for work / colleague interaction — **unique photoreal scene per practice variation** (smart mix,
 * simple talk, asking for help, clarifying tasks) plus **male vs female focal colleague** from {@link assistantPresentation}
 * so the portrait matches TTS voice (see Speak Live session bootstrap).
 */
/** Speak Live housing heroes — unique photoreal scene per variation (smart mix, issue, contract) × voice gender. */
type HousingLandlordSpeakLiveVisualId = 'smart' | 'issue' | 'contract'

function housingLandlordStaffHeroPath(visual: HousingLandlordSpeakLiveVisualId, gender: 'male' | 'female'): string {
  const g = gender === 'female' ? 'f' : 'm'
  return `/speak-live/housing-${visual}-staff-${g}.png`
}

function resolveHousingLandlordSpeakLiveVisualId(params: {
  smartMode?: boolean
  variation?: string | null
}): HousingLandlordSpeakLiveVisualId {
  if (params.smartMode !== false) return 'smart'
  const v = (params.variation ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'asking_rent_contract' || v === 'rent' || v === 'contract' || v === 'huur') return 'contract'
  if (v === 'reporting_issue' || v === 'issue' || v === 'repair' || v === 'report') return 'issue'
  return 'smart'
}

function housingLandlordAltFor(
  visual: HousingLandlordSpeakLiveVisualId,
  gender: 'male' | 'female',
  subType: string | null | undefined
): string {
  const who = gender === 'female' ? 'female' : 'male'
  const other = gender === 'female' ? 'male' : 'female'
  const st = (subType ?? '').trim().toLowerCase().replace(/-/g, '_')
  const setting =
    st === 'rental_agency'
      ? 'rental agency desk setting'
      : st === 'building_manager'
        ? 'building maintenance context'
        : 'landlord or owner contact'
  const pair = `Both a ${who} and a ${other} adult are visible; the primary person you are talking to is the ${who} professional — aligned with a ${who} assistant voice.`
  if (visual === 'smart') {
    return `Photoreal Dutch apartment building / housing contact — ${pair} Mixed practice: repairs, rent, and contract (${setting}).`
  }
  if (visual === 'issue') {
    return `Photoreal Dutch home interior for reporting a maintenance issue — ${pair} Practical repair vocabulary (${setting}).`
  }
  return `Photoreal Dutch rental office for rent or contract questions — ${pair} Calm administrative Dutch (${setting}).`
}

/**
 * Housing / landlord Speak Live — **unique photoreal hero per variation** (smart mix vs issue vs contract) and
 * **male vs female focal staff** from {@link assistantPresentation} so the portrait matches TTS voice
 * (see `buildSpeakLiveSessionMedia`).
 */
export function resolveHousingLandlordSpeakLiveVisual(params: {
  smartMode?: boolean
  subType?: string | null
  variation?: string | null
  assistantPresentation?: 'male' | 'female' | null
}): ScenarioImageBundle {
  const base = SCENARIO_IMAGE_REGISTRY.housing_landlord
  const gender = params.assistantPresentation === 'male' ? 'male' : 'female'
  const visual = resolveHousingLandlordSpeakLiveVisualId({
    smartMode: params.smartMode,
    variation: params.variation,
  })
  const hero = housingLandlordStaffHeroPath(visual, gender)
  return {
    heroSrc: hero,
    thumbnailSrc: hero,
    themeLabelEn: base.themeLabelEn,
    altEn: housingLandlordAltFor(visual, gender, params.subType),
  }
}

export function resolveWorkColleagueInteractionSpeakLiveVisual(params: {
  smartMode?: boolean
  /** Reserved for future subtype-specific art; variation selects the hero pack today. */
  subType?: string | null
  variation?: string | null
  assistantPresentation?: 'male' | 'female' | null
}): ScenarioImageBundle {
  const base = SCENARIO_IMAGE_REGISTRY.work_colleague_interaction
  const gender = params.assistantPresentation === 'male' ? 'male' : 'female'
  const visual = resolveWorkColleagueSpeakLiveVisualId({
    smartMode: params.smartMode,
    variation: params.variation,
  })
  const hero = workColleagueStaffHeroPath(visual, gender)
  return {
    heroSrc: hero,
    thumbnailSrc: hero,
    themeLabelEn: base.themeLabelEn,
    altEn: workColleagueAltFor(visual, gender),
  }
}

export function resolveStoreServiceIssueSpeakLiveVisual(params: {
  smartMode?: boolean
  subType?: string | null
  variation?: string | null
  assistantPresentation?: 'male' | 'female' | null
}): ScenarioImageBundle {
  const base = SCENARIO_IMAGE_REGISTRY.store_service_issue
  const gender = params.assistantPresentation === 'male' ? 'male' : 'female'
  const visual = resolveStoreServiceIssueVisualId(params)
  const hero = storeServiceIssueStaffHeroPath(visual, gender)
  return {
    heroSrc: hero,
    thumbnailSrc: hero,
    themeLabelEn: base.themeLabelEn,
    altEn: storeServiceIssueAltFor(visual, gender),
  }
}

/**
 * Speak Live + browse: stable visual tokens for Supermarket / shop (reuses `SCENARIO_IMAGE_DIR` WebPs).
 * Task hints: aisle/shelf → supermarket; checkout → service counter pack; product → shelf (pharmacy when setting matches).
 */
const DIRECTIONS_HERO_STATION_WOMAN = '/speak-live/directions-hero-station-woman.png' as const
const DIRECTIONS_HERO_STREET_WOMAN = '/speak-live/directions-hero-street-woman.png' as const
const DIRECTIONS_HERO_PHARMACY_WOMAN = '/speak-live/directions-hero-pharmacy-woman.png' as const

function directionsHeroBundle(heroSrc: string, altEn: string): ScenarioImageBundle {
  return {
    heroSrc,
    thumbnailSrc: heroSrc,
    themeLabelEn: 'Directions',
    altEn,
  }
}

/**
 * Speak Live hero for directions — dedicated photoreal heroes (woman in scene) per destination cluster.
 * `subType` is the destination token from runtime / URL.
 */
export function resolveDirectionsSpeakLiveVisual(params: { smartMode?: boolean; subType?: string | null }): ScenarioImageBundle {
  if (params.smartMode) {
    return SCENARIO_IMAGE_REGISTRY.directions_getting_somewhere
  }
  const d = (params.subType ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (!d) return SCENARIO_IMAGE_REGISTRY.directions_getting_somewhere

  if (d === 'pharmacy') {
    return directionsHeroBundle(
      DIRECTIONS_HERO_PHARMACY_WOMAN,
      'Friendly Dutch woman near a pharmacy — wayfinding to pick up medicine or find the counter.'
    )
  }
  if (d === 'station' || d === 'bus_stop' || d === 'tram_stop' || d === 'platform_exit_entrance') {
    return directionsHeroBundle(
      DIRECTIONS_HERO_STATION_WOMAN,
      'Dutch station or transit hub — helpful woman for platform, exit, and transfer directions.'
    )
  }
  if (d === 'supermarket') {
    return directionsHeroBundle(
      DIRECTIONS_HERO_STREET_WOMAN,
      'Dutch shopping street — helpful woman for asking how to reach the supermarket.'
    )
  }
  if (d === 'city_centre' || d === 'museum' || d === 'toilet' || d === 'town_hall' || d === 'restaurant' || d === 'cafe' || d === 'hotel') {
    return directionsHeroBundle(
      DIRECTIONS_HERO_STREET_WOMAN,
      'Dutch city street — approachable woman for centre, museum, WC, hospitality, or civic wayfinding.'
    )
  }
  if (d === 'office_address') {
    return directionsHeroBundle(
      DIRECTIONS_HERO_STREET_WOMAN,
      'Urban Dutch street near offices — woman helping with address and building entrance directions.'
    )
  }
  return SCENARIO_IMAGE_REGISTRY.directions_getting_somewhere
}

export type SupermarketShopFocusVisualId = 'asking_where_something_is' | 'paying_checkout' | 'product_questions'

export type SupermarketShopSettingVisualId =
  | 'supermarket'
  | 'convenience_store'
  | 'pharmacy_style'
  | 'general_retail'

/** Aligns with Speak Live catalog (`accent: sky`, `icon: shopping_cart`) and practice registry entry. */
export const SUPERMARKET_SHOP_VISUAL_THEME = {
  speakLiveAccentToken: 'sky',
  speakLiveIconToken: 'shopping_cart',
  catalogBadgeEn: 'Shopping',
} as const

/** Variation → hero/thumb paths (same WebP pack as the rest of the registry). */
export const SUPERMARKET_SHOP_FOCUS_IMAGE_MAP: Record<
  SupermarketShopFocusVisualId,
  Pick<ScenarioImageBundle, 'heroSrc' | 'thumbnailSrc' | 'altEn'>
> = {
  asking_where_something_is: {
    heroSrc: `${DIR}/supermarket.webp`,
    thumbnailSrc: `${DIR}/supermarket.webp`,
    altEn: 'Supermarket aisle and shelves — “where is it?” errands.',
  },
  paying_checkout: {
    heroSrc: `${DIR}/problem_solving.webp`,
    thumbnailSrc: `${DIR}/problem_solving.webp`,
    altEn: 'Retail service counter — receipt, bag, and card payment talk.',
  },
  product_questions: {
    heroSrc: `${DIR}/supermarket.webp`,
    thumbnailSrc: `${DIR}/supermarket.webp`,
    altEn: 'Store shelf with calm packaging — short product comparison questions.',
  },
}

const SUPERMARKET_SHOP_SETTING_HERO: Record<
  SupermarketShopSettingVisualId,
  Pick<ScenarioImageBundle, 'heroSrc' | 'thumbnailSrc' | 'altEn'>
> = {
  supermarket: {
    heroSrc: `${DIR}/supermarket.webp`,
    thumbnailSrc: `${DIR}/supermarket.webp`,
    altEn:
      'European supermarket: wide aisle, shelves, and soft overhead light — premium default for shop-floor practice.',
  },
  convenience_store: {
    heroSrc: `${DIR}/supermarket.webp`,
    thumbnailSrc: `${DIR}/supermarket.webp`,
    altEn: 'Neighbourhood shop shelves — compact errands and clear questions.',
  },
  pharmacy_style: {
    heroSrc: `${DIR}/pharmacy.webp`,
    thumbnailSrc: `${DIR}/pharmacy.webp`,
    altEn: SCENARIO_IMAGE_REGISTRY.pharmacy.altEn,
  },
  general_retail: {
    heroSrc: `${DIR}/problem_solving.webp`,
    thumbnailSrc: `${DIR}/problem_solving.webp`,
    altEn: 'Retail counter for everyday purchases — polite shop-floor Dutch.',
  },
}

function normalizeSupermarketShopFocusId(raw: string | null | undefined): SupermarketShopFocusVisualId | undefined {
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
      return undefined
  }
}

function normalizeSupermarketShopSettingId(raw: string | null | undefined): SupermarketShopSettingVisualId | undefined {
  const v = (raw ?? '').trim().toLowerCase()
  if (v === 'supermarket' || v === 'convenience_store' || v === 'pharmacy_style' || v === 'general_retail') {
    return v as SupermarketShopSettingVisualId
  }
  return undefined
}

/**
 * Hero + thumb + alt for Speak Live launcher, live intro strip, and deep links.
 * Precedence: smart pack default → explicit task (variation) → venue (subType).
 */
export function resolveSupermarketShopSpeakLiveVisual(params: {
  smartMode?: boolean
  subType?: string | null
  variation?: string | null
}): ScenarioImageBundle {
  if (params.smartMode) {
    return SCENARIO_IMAGE_REGISTRY.supermarket_shop
  }
  const focus = normalizeSupermarketShopFocusId(params.variation ?? undefined)
  const setting = normalizeSupermarketShopSettingId(params.subType ?? undefined) ?? 'supermarket'

  if (focus === 'product_questions' && setting === 'pharmacy_style') {
    const ph = SCENARIO_IMAGE_REGISTRY.pharmacy
    return {
      heroSrc: ph.heroSrc,
      thumbnailSrc: ph.thumbnailSrc,
      themeLabelEn: SCENARIO_IMAGE_REGISTRY.supermarket_shop.themeLabelEn,
      altEn:
        'Pharmacy-style counter with shelves of self-care products — careful, label-oriented product questions.',
    }
  }
  if (focus) {
    const row = SUPERMARKET_SHOP_FOCUS_IMAGE_MAP[focus]
    return {
      heroSrc: row.heroSrc,
      thumbnailSrc: row.thumbnailSrc,
      themeLabelEn: SCENARIO_IMAGE_REGISTRY.supermarket_shop.themeLabelEn,
      altEn: row.altEn,
    }
  }
  const row = SUPERMARKET_SHOP_SETTING_HERO[setting]
  return {
    heroSrc: row.heroSrc,
    thumbnailSrc: row.thumbnailSrc,
    themeLabelEn: SCENARIO_IMAGE_REGISTRY.supermarket_shop.themeLabelEn,
    altEn: row.altEn,
  }
}

export type BookingReservationsSubtypeVisualId =
  | 'restaurant_booking'
  | 'hairdresser_booking'
  | 'appointment_booking'

function normalizeBookingReservationsSubtypeVisual(raw: string | null | undefined): BookingReservationsSubtypeVisualId | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'restaurant' || v === 'restaurant_booking') return 'restaurant_booking'
  if (v === 'hairdresser' || v === 'hair' || v === 'hairdresser_booking' || v === 'salon') return 'hairdresser_booking'
  if (v === 'appointment' || v === 'appointment_booking') return 'appointment_booking'
  return undefined
}

type BookingReservationsVariationVisualId = 'asking_availability' | 'making_booking' | 'confirming_details'

const BOOKING_SPEAK_LIVE_SMART_MIX_STAFF = `/speak-live/booking-smart-mix-staff.png?${BOOKING_HERO_CACHE_BUST}` as const

const BOOKING_SPEAK_LIVE_VARIATION_STAFF: Record<
  BookingReservationsVariationVisualId,
  { heroSrc: string; altEn: string }
> = {
  asking_availability: {
    heroSrc: `/speak-live/booking-variation-availability-staff.png?${BOOKING_HERO_CACHE_BUST}`,
    altEn:
      'Female reception professional speaking with you about whether a time or table is still available — matches a female assistant voice.',
  },
  making_booking: {
    heroSrc: `/speak-live/booking-variation-making-staff.png?${BOOKING_HERO_CACHE_BUST}`,
    altEn:
      'Female reception professional helping you place a reservation with the right people, time, and service details.',
  },
  confirming_details: {
    heroSrc: `/speak-live/booking-variation-confirming-staff.png?${BOOKING_HERO_CACHE_BUST}`,
    altEn:
      'Female reception professional double-checking date, time, name, or service details with you at the desk.',
  },
}

function normalizeBookingReservationsVariationVisual(
  raw: string | null | undefined
): BookingReservationsVariationVisualId | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'asking_availability' || v === 'making_booking' || v === 'confirming_details') {
    return v as BookingReservationsVariationVisualId
  }
  return undefined
}

function bookingReservationsSubtypeAltSnippet(sub: BookingReservationsSubtypeVisualId): string {
  if (sub === 'restaurant_booking') return 'Restaurant-style reception.'
  if (sub === 'hairdresser_booking') return 'Salon-style reception.'
  return 'Balie / appointment desk.'
}

/**
 * Speak Live hero for booking / reservations — photoreal staff per **variation** (availability / booking / confirm);
 * smart mix uses a dedicated neutral-reception hero. Subtype flavours the alt text only.
 */
type DoctorPharmacySubtypeVisualId = 'doctor_visit' | 'pharmacy' | 'clinic_reception'

function normalizeDoctorPharmacySubtypeVisual(raw: string | null | undefined): DoctorPharmacySubtypeVisualId | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'doctor' || v === 'doctor_visit' || v === 'huisarts' || v === 'gp') return 'doctor_visit'
  if (v === 'pharmacy' || v === 'apotheek') return 'pharmacy'
  if (v === 'clinic' || v === 'clinic_reception' || v === 'reception' || v === 'balie') return 'clinic_reception'
  return undefined
}

/** Task focus slugs for Speak Live doctor / pharmacy — each has distinct POV staff imagery. */
type DoctorPharmacyVariationVisualId = 'symptoms' | 'asking_for_help' | 'understanding_instructions'

function normalizeDoctorPharmacyVariationVisual(raw: string | null | undefined): DoctorPharmacyVariationVisualId | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'symptoms' || v === 'symptom') return 'symptoms'
  if (v === 'asking_for_help' || v === 'help' || v === 'asking') return 'asking_for_help'
  if (v === 'understanding_instructions' || v === 'instructions' || v === 'understanding') return 'understanding_instructions'
  return undefined
}

function variationFallbackFromDoctorPharmacySubtype(st: DoctorPharmacySubtypeVisualId): DoctorPharmacyVariationVisualId {
  if (st === 'pharmacy') return 'asking_for_help'
  if (st === 'clinic_reception') return 'understanding_instructions'
  return 'symptoms'
}

function doctorPharmacyHealthStaffPath(variation: DoctorPharmacyVariationVisualId, gender: 'male' | 'female'): string {
  const g = gender === 'male' ? 'm' : 'f'
  if (variation === 'symptoms') return `/speak-live/health-symptoms-staff-${g}.png`
  if (variation === 'asking_for_help') return `/speak-live/health-help-staff-${g}.png`
  return `/speak-live/health-instructions-staff-${g}.png`
}

function doctorPharmacySmartStaffPath(gender: 'male' | 'female'): string {
  return `/speak-live/health-smart-staff-${gender === 'male' ? 'm' : 'f'}.png`
}

/**
 * Speak Live hero for doctor / pharmacy — photoreal POV staff per **variation** (symptoms / help / instructions);
 * smart mix uses a dedicated neutral-clinic hero. Gender matches {@link assistantPresentation} for TTS alignment.
 */
export function resolveDoctorPharmacySpeakLiveVisual(params: {
  smartMode?: boolean
  subType?: string | null
  variation?: string | null
  assistantPresentation?: 'male' | 'female' | null
}): ScenarioImageBundle {
  const base = SCENARIO_IMAGE_REGISTRY.doctor_pharmacy
  const gender = params.assistantPresentation === 'male' ? 'male' : 'female'
  const st = normalizeDoctorPharmacySubtypeVisual(params.subType ?? undefined)
  let varNorm = normalizeDoctorPharmacyVariationVisual(params.variation ?? undefined)
  if (!params.smartMode && !varNorm && st) {
    varNorm = variationFallbackFromDoctorPharmacySubtype(st)
  }

  if (params.smartMode || !varNorm) {
    const hero = doctorPharmacySmartStaffPath(gender)
    return {
      heroSrc: hero,
      thumbnailSrc: hero,
      themeLabelEn: base.themeLabelEn,
      altEn:
        gender === 'female'
          ? 'Photoreal first-person view facing a Dutch female health professional in a mixed clinic setting — symptoms, pharmacy-style help, and follow-up instructions. Matches a female assistant voice.'
          : 'Photoreal first-person view facing a Dutch male health professional in a mixed clinic setting — symptoms, pharmacy-style help, and follow-up instructions. Matches a male assistant voice.',
    }
  }

  const hero = doctorPharmacyHealthStaffPath(varNorm, gender)
  const sceneSnippet =
    varNorm === 'symptoms'
      ? 'symptom conversation at a consultation-style desk.'
      : varNorm === 'asking_for_help'
        ? 'pharmacy-style counter asking for advice or medicine.'
        : 'instructions or next steps at a reception-style desk.'
  return {
    heroSrc: hero,
    thumbnailSrc: hero,
    themeLabelEn: base.themeLabelEn,
    altEn: `Photoreal first-person view talking with a Dutch ${gender === 'female' ? 'female' : 'male'} professional — ${sceneSnippet} Matches ${gender === 'female' ? 'a female' : 'a male'} assistant voice.`,
  }
}

export function resolveBookingReservationsSpeakLiveVisual(params: {
  smartMode?: boolean
  subType?: string | null
  /** `asking_availability` | `making_booking` | `confirming_details` — drives unique staff imagery. */
  variation?: string | null
}): ScenarioImageBundle {
  const base = SCENARIO_IMAGE_REGISTRY.booking_reservations
  const sub = normalizeBookingReservationsSubtypeVisual(params.subType ?? undefined) ?? 'restaurant_booking'
  const varNorm = normalizeBookingReservationsVariationVisual(params.variation ?? undefined)

  if (params.smartMode) {
    const pack = varNorm ? BOOKING_SPEAK_LIVE_VARIATION_STAFF[varNorm] : { heroSrc: BOOKING_SPEAK_LIVE_SMART_MIX_STAFF, altEn: base.altEn }
    return {
      heroSrc: pack.heroSrc,
      thumbnailSrc: pack.heroSrc,
      themeLabelEn: base.themeLabelEn,
      altEn: `${pack.altEn} ${bookingReservationsSubtypeAltSnippet(sub)}`.replace(/\s+/g, ' ').trim(),
    }
  }

  const pack = varNorm ? BOOKING_SPEAK_LIVE_VARIATION_STAFF[varNorm] : BOOKING_SPEAK_LIVE_VARIATION_STAFF.making_booking
  return {
    heroSrc: pack.heroSrc,
    thumbnailSrc: pack.heroSrc,
    themeLabelEn: base.themeLabelEn,
    altEn: `${pack.altEn} ${bookingReservationsSubtypeAltSnippet(sub)}`.replace(/\s+/g, ' ').trim(),
  }
}

/** Representative scenario id per taxonomy category — drives category card imagery. */
export const CATEGORY_REPRESENTATIVE_SCENARIO_ID: Record<ScenarioCatalogCategory, string> = {
  food: 'cafe',
  work: 'work',
  health: 'doctor',
  municipality: 'municipality',
  housing: 'housing',
  transport: 'train',
  social: 'social_plans',
  problem_solving: 'problem_solving',
  appointments: 'booking_reservations',
}

export const CATEGORY_SCENE_GRADIENT: Record<ScenarioCatalogCategory, string> = {
  food: 'bg-gradient-to-br from-slate-200/90 via-amber-50/40 to-violet-100/50',
  work: 'bg-gradient-to-br from-slate-300/70 via-slate-100 to-blue-100/45',
  health: 'bg-gradient-to-br from-violet-100/70 via-white to-emerald-50/35',
  municipality: 'bg-gradient-to-br from-slate-300/80 via-slate-100 to-slate-200/70',
  housing: 'bg-gradient-to-br from-stone-200/60 via-amber-50/30 to-slate-200/55',
  transport: 'bg-gradient-to-br from-slate-200 via-blue-100/35 to-slate-300/45',
  social: 'bg-gradient-to-br from-violet-100/25 via-slate-100 to-violet-50/40',
  problem_solving: 'bg-gradient-to-br from-amber-100/45 via-orange-50/25 to-slate-200/50',
  appointments: 'bg-gradient-to-br from-rose-100/40 via-white to-slate-100/55',
}

export type ResolvedScenarioVisual = {
  scenarioId: string
  category: ScenarioCatalogCategory
  /** @deprecated use themeLabelEn */
  sceneLabel: string
  themeLabelEn: string
  alt: string
  heroSrc: string
  thumbnailSrc: string
  /** Primary URL for next/image (thumbnail in cards, hero on launch — caller picks) */
  imageSrc: string | null
  gradientClass: string
}

export function resolveScenarioVisual(entry: ScenarioCatalogEntry): ResolvedScenarioVisual {
  const bundle = SCENARIO_IMAGE_REGISTRY[entry.id]
  const gradientClass = CATEGORY_SCENE_GRADIENT[entry.category]
  if (bundle) {
    return {
      scenarioId: entry.id,
      category: entry.category,
      sceneLabel: bundle.themeLabelEn,
      themeLabelEn: bundle.themeLabelEn,
      alt: bundle.altEn,
      heroSrc: bundle.heroSrc,
      thumbnailSrc: bundle.thumbnailSrc,
      imageSrc: bundle.thumbnailSrc,
      gradientClass,
    }
  }
  return {
    scenarioId: entry.id,
    category: entry.category,
    sceneLabel: entry.title.length > 28 ? `${entry.title.slice(0, 26)}…` : entry.title,
    themeLabelEn: entry.title.length > 28 ? `${entry.title.slice(0, 26)}…` : entry.title,
    alt: `${entry.title}. ${entry.summary}`,
    heroSrc: '',
    thumbnailSrc: '',
    imageSrc: null,
    gradientClass,
  }
}

export type ResolvedCategoryVisual = {
  category: ScenarioCatalogCategory
  sceneLabel: string
  themeLabelEn: string
  alt: string
  gradientClass: string
  /** Populated when a representative scene asset exists */
  heroSrc?: string
  thumbnailSrc?: string
  imageSrc: string | null
}

export function resolveCategoryVisual(category: ScenarioCatalogCategory, titleShort: string): ResolvedCategoryVisual {
  const repId = CATEGORY_REPRESENTATIVE_SCENARIO_ID[category]
  const bundle = repId ? SCENARIO_IMAGE_REGISTRY[repId] : undefined
  const gradientClass = CATEGORY_SCENE_GRADIENT[category]
  if (bundle) {
    return {
      category,
      sceneLabel: titleShort,
      themeLabelEn: titleShort,
      alt: bundle.altEn,
      gradientClass,
      heroSrc: bundle.heroSrc,
      thumbnailSrc: bundle.thumbnailSrc,
      imageSrc: bundle.thumbnailSrc,
    }
  }
  return {
    category,
    sceneLabel: titleShort,
    themeLabelEn: titleShort,
    alt: `${titleShort} — browse Dutch practice scenarios in this theme.`,
    gradientClass,
    imageSrc: null,
  }
}

export function tryResolveScenarioVisual(scenarioId: string): ResolvedScenarioVisual | null {
  const entry = getScenarioCatalogEntry(scenarioId)
  return entry ? resolveScenarioVisual(entry) : null
}

/** Use hero asset for launch/prep; thumb for cards/square */
export function pickScenarioImageSrc(visual: ResolvedScenarioVisual, role: 'hero' | 'thumbnail'): string | null {
  if (!visual.imageSrc && !visual.heroSrc) return null
  if (role === 'hero') return visual.heroSrc || visual.imageSrc
  return visual.thumbnailSrc || visual.imageSrc
}
