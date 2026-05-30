/**
 * Scenario-linked listening tracks — aligned with Practice catalog categories (FluentCopilot IA).
 * Each track routes to a clip pack; several tracks may share a pack until the clip bank grows.
 */
import { CATALOG_CATEGORY_LABELS, getScenarioCatalogEntry } from '@/lib/practice/scenarioCatalog'
import type { ScenarioCatalogCategory } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
import { estimatePackDurationMinutes } from '@/lib/listening-mode/catalog'

export type ListeningLevelBand = 'A1' | 'A2' | 'B1'

/** Subtype / pacing choice inside a track — switches pack when we have alternates, else copy only. */
export type ScenarioListeningTrackVariation = {
  id: string
  label: string
  packId: string
  /** Shown on setup — what the first drill set will feel like. */
  expectationEn: string
}

export type ScenarioListeningTrack = {
  id: string
  catalogCategory: ScenarioCatalogCategory
  title: string
  subtitle: string
  levelsSupported: readonly ListeningLevelBand[]
  skillFocusTags: readonly string[]
  /** Compact visual — matches hub tone (emoji from catalog patterns). */
  visualEmoji: string
  defaultPackId: string
  variations: readonly ScenarioListeningTrackVariation[]
  /** Primary Practice scenarios for warmup deep-linking. */
  linkedScenarioIds: readonly string[]
}

function catShort(c: ScenarioCatalogCategory): string {
  return CATALOG_CATEGORY_LABELS[c].short
}

const L3: readonly ListeningLevelBand[] = ['A1', 'A2', 'B1']

export const SCENARIO_LISTENING_TRACKS: readonly ScenarioListeningTrack[] = [
  {
    id: 'listen_transport',
    catalogCategory: 'transport',
    title: 'Public transport',
    subtitle: 'Platforms, delays, and “where from here” — the compressed Dutch around NS, buses, and trams.',
    levelsSupported: L3,
    skillFocusTags: ['gist', 'route details', 'times'],
    visualEmoji: '🚆',
    defaultPackId: 'pack-train-platform',
    variations: [
      {
        id: 'announcements',
        label: 'Announcements & delays',
        packId: 'pack-train-platform',
        expectationEn:
          'You’ll catch a platform line, a delay gist, then a short “what to do next” script — same pack as our train & tram burst.',
      },
      {
        id: 'connections',
        label: 'Connections & steps',
        packId: 'pack-train-platform',
        expectationEn:
          'Focus on order-of-steps Dutch (exit here, then tram…) — still the travel pack; pacing matches real transfers.',
      },
    ],
    linkedScenarioIds: ['train'],
  },
  {
    id: 'listen_food_order',
    catalogCategory: 'food',
    title: 'Ordering food & drinks',
    subtitle: 'Counter Dutch: what you want, quantities, and a natural reply when staff follow up.',
    levelsSupported: L3,
    skillFocusTags: ['service replies', 'quantities', 'gist'],
    visualEmoji: '☕',
    defaultPackId: 'pack-cafe-burst',
    variations: [
      {
        id: 'cafe_counter',
        label: 'Café counter',
        packId: 'pack-cafe-burst',
        expectationEn: 'Three short clips: gist of the order, a number detail, then picking your next line as the customer.',
      },
      {
        id: 'follow_up',
        label: 'Follow-up questions',
        packId: 'pack-cafe-burst',
        expectationEn: 'Same café pack — mentally weight “what they ask next” before you jump into speaking practice.',
      },
    ],
    linkedScenarioIds: ['cafe', 'restaurant'],
  },
  {
    id: 'listen_supermarket',
    catalogCategory: 'food',
    title: 'Supermarket & shop',
    subtitle: 'Aisle directions and a faster line at the shelf — retail ear training.',
    levelsSupported: L3,
    skillFocusTags: ['route words', 'fast Dutch', 'details'],
    visualEmoji: '🛒',
    defaultPackId: 'pack-shop-fast',
    variations: [
      {
        id: 'aisle_floor',
        label: 'Aisle & floor',
        packId: 'pack-shop-fast',
        expectationEn: 'Where to find something, then a quicker question — two clips, then your profile may add a weak-area rep.',
      },
      {
        id: 'checkout_tone',
        label: 'Checkout tone',
        packId: 'pack-shop-fast',
        expectationEn: 'Same shop-floor pack — tune your ear for short, practical exchanges at the register.',
      },
    ],
    linkedScenarioIds: ['supermarket_shop'],
  },
  {
    id: 'listen_directions',
    catalogCategory: 'transport',
    title: 'Directions & getting somewhere',
    subtitle: 'Turns, landmarks, and “what to do next” — overlaps with travel clips until a dedicated path pack ships.',
    levelsSupported: L3,
    skillFocusTags: ['instructions', 'route details', 'gist'],
    visualEmoji: '🧭',
    defaultPackId: 'pack-train-platform',
    variations: [
      {
        id: 'on_foot',
        label: 'On foot & nearby',
        packId: 'pack-train-platform',
        expectationEn: 'Uses the travel pack’s route-script clip plus platform gist — honest overlap, scenario-first framing.',
      },
      {
        id: 'transit_linked',
        label: 'Linked to transit',
        packId: 'pack-train-platform',
        expectationEn: 'Same audio set — emphasis on chaining steps (exit, then line…), like directions after a ride.',
      },
    ],
    linkedScenarioIds: ['directions_getting_somewhere'],
  },
  {
    id: 'listen_booking',
    catalogCategory: 'appointments',
    title: 'Booking & reservations',
    subtitle: 'Table-ready lines and polite follow-ups — service rhythm for plans and slots.',
    levelsSupported: L3,
    skillFocusTags: ['gist', 'follow-up', 'service tone'],
    visualEmoji: '📅',
    defaultPackId: 'pack-booking-reveal',
    variations: [
      {
        id: 'table_service',
        label: 'Restaurant / table',
        packId: 'pack-booking-reveal',
        expectationEn: 'A replay-style booking clip — gist first, then a careful second listen if you use reveal.',
      },
      {
        id: 'slot_confirm',
        label: 'Slot confirmation',
        packId: 'pack-booking-reveal',
        expectationEn: 'Same pack — listen for confirmation cues you’ll reuse in appointments Dutch.',
      },
    ],
    linkedScenarioIds: ['booking_reservations', 'restaurant', 'phone_appointment'],
  },
  {
    id: 'listen_health_desk',
    catalogCategory: 'health',
    title: 'Doctor & pharmacy',
    subtitle: 'Symptoms in plain Dutch, then careful timing — desk-side health listening.',
    levelsSupported: L3,
    skillFocusTags: ['details', 'instructions', 'calm register'],
    visualEmoji: '🩺',
    defaultPackId: 'pack-clinic-instructions',
    variations: [
      {
        id: 'doctor_visit',
        label: 'Doctor visit',
        packId: 'pack-clinic-instructions',
        expectationEn: 'Gist of the complaint, then a precise instruction — two clinic clips, then optional weak-area rep.',
      },
      {
        id: 'pharmacy_counter',
        label: 'Pharmacy counter',
        packId: 'pack-clinic-instructions',
        expectationEn: 'Same health pack — tuned expectation for short counter exchanges and clear next steps.',
      },
    ],
    linkedScenarioIds: ['doctor', 'pharmacy'],
  },
  {
    id: 'listen_store_problem',
    catalogCategory: 'problem_solving',
    title: 'Problem in a store / service',
    subtitle: 'Busy retail Dutch — useful when something is wrong at checkout or on the floor.',
    levelsSupported: L3,
    skillFocusTags: ['fast Dutch', 'clarification', 'details'],
    visualEmoji: '🔧',
    defaultPackId: 'pack-shop-fast',
    variations: [
      {
        id: 'service_issue',
        label: 'Service issue',
        packId: 'pack-shop-fast',
        expectationEn: 'Shop-floor clips — ear training for tense, quick exchanges before you role-play the fix.',
      },
      {
        id: 'calm_repair',
        label: 'Calm repair tone',
        packId: 'pack-cafe-burst',
        expectationEn: 'Switches to café pack for a slightly softer service tone — still short, practical replies.',
      },
    ],
    linkedScenarioIds: ['problem_solving', 'store_service_issue'],
  },
  {
    id: 'listen_work',
    catalogCategory: 'work',
    title: 'Work & colleague interaction',
    subtitle: 'Service-pace confirmations and next steps — shared clips with booking until workplace audio expands.',
    levelsSupported: L3,
    skillFocusTags: ['next steps', 'gist', 'workplace tone'],
    visualEmoji: '💼',
    defaultPackId: 'pack-booking-reveal',
    variations: [
      {
        id: 'meeting_adjacent',
        label: 'Meeting-adjacent rhythm',
        packId: 'pack-booking-reveal',
        expectationEn: 'Uses the booking-line pack for tight confirm/agree patterns useful at work desks.',
      },
      {
        id: 'colleague_ping',
        label: 'Quick colleague ping',
        packId: 'pack-cafe-burst',
        expectationEn: 'Café pack for shorter, informal back-and-forth — handy before colleague small-talk scenes.',
      },
    ],
    linkedScenarioIds: ['work', 'work_colleague_interaction'],
  },
  {
    id: 'listen_housing',
    catalogCategory: 'housing',
    title: 'Housing & landlord',
    subtitle: 'Calm, precise instruction Dutch — overlaps clinic-style clarity until housing clips land.',
    levelsSupported: L3,
    skillFocusTags: ['instructions', 'details', 'formal-clear'],
    visualEmoji: '🏠',
    defaultPackId: 'pack-clinic-instructions',
    variations: [
      {
        id: 'repairs_instructions',
        label: 'Repairs & instructions',
        packId: 'pack-clinic-instructions',
        expectationEn: 'Health-desk pack for now: slow, explicit instructions — same listening muscle as landlord timelines.',
      },
      {
        id: 'booking_overlap',
        label: 'Scheduling overlap',
        packId: 'pack-booking-reveal',
        expectationEn: 'Booking pack — slot-style Dutch you’ll reuse when arranging visits or access windows.',
      },
    ],
    linkedScenarioIds: ['housing', 'housing_landlord'],
  },
  {
    id: 'listen_phone',
    catalogCategory: 'appointments',
    title: 'Phone call',
    subtitle: 'Appointment-style rhythm and follow-ups — booking pack, scenario-framed for calls.',
    levelsSupported: L3,
    skillFocusTags: ['times', 'gist', 'follow-up'],
    visualEmoji: '📞',
    defaultPackId: 'pack-booking-reveal',
    variations: [
      {
        id: 'appointment_call',
        label: 'Appointment call',
        packId: 'pack-booking-reveal',
        expectationEn: 'Single reveal-style clip in this pack — treat it like hearing a desk on the phone.',
      },
      {
        id: 'confirm_details',
        label: 'Confirm details',
        packId: 'pack-cafe-burst',
        expectationEn: 'Optional: café pack for shorter confirmations — warm-up when calls feel too dense.',
      },
    ],
    linkedScenarioIds: ['phone_appointment', 'package_pickup'],
  },
  {
    id: 'listen_small_talk',
    catalogCategory: 'social',
    title: 'Small talk',
    subtitle: 'Light, friendly service-adjacent lines — natural openers and replies.',
    levelsSupported: L3,
    skillFocusTags: ['natural replies', 'gist', 'tone'],
    visualEmoji: '💬',
    defaultPackId: 'pack-cafe-burst',
    variations: [
      {
        id: 'light_chat',
        label: 'Light chat',
        packId: 'pack-cafe-burst',
        expectationEn: 'Café pack — social micro-moves (order + reply) you’ll feel again in plans and meetups.',
      },
      {
        id: 'weather_plans',
        label: 'Plans & weather',
        packId: 'pack-cafe-burst',
        expectationEn: 'Same clips — frame them as “hearing how Dutch stacks a short plan”.',
      },
    ],
    linkedScenarioIds: ['social_plans', 'weather_plans'],
  },
  {
    id: 'listen_meet_people',
    catalogCategory: 'social',
    title: 'Meeting new people',
    subtitle: 'Polite openings and short answers — café-based until dedicated meetup audio exists.',
    levelsSupported: L3,
    skillFocusTags: ['polite replies', 'gist', 'service phrases'],
    visualEmoji: '👋',
    defaultPackId: 'pack-cafe-burst',
    variations: [
      {
        id: 'first_contact',
        label: 'First contact',
        packId: 'pack-cafe-burst',
        expectationEn: 'Order-and-reply clips — good first-listen habits before introductions in scenarios.',
      },
      {
        id: 'name_exchange',
        label: 'Name exchange tone',
        packId: 'pack-booking-reveal',
        expectationEn: 'Booking clip for formal name/slot rhythm — useful before structured intros.',
      },
    ],
    linkedScenarioIds: ['social_plans', 'school_front_desk'],
  },
  {
    id: 'listen_opinions_light',
    catalogCategory: 'work',
    title: 'Opinions & discussions (light)',
    subtitle: 'Short agree/disagree muscle — starter clips from café + booking until debate audio ships.',
    levelsSupported: L3,
    skillFocusTags: ['stance', 'gist', 'follow-up'],
    visualEmoji: '💭',
    defaultPackId: 'pack-cafe-burst',
    variations: [
      {
        id: 'soft_stance',
        label: 'Soft stance',
        packId: 'pack-cafe-burst',
        expectationEn: 'Café clips — practice catching what someone wants before you answer (light opinion prep).',
      },
      {
        id: 'confirm_agree',
        label: 'Confirm & agree',
        packId: 'pack-booking-reveal',
        expectationEn: 'Booking pack — hear confirmations and gentle pushback patterns.',
      },
    ],
    linkedScenarioIds: ['work', 'bank_office'],
  },
] as const

export function getScenarioListeningTrack(trackId: string): ScenarioListeningTrack | undefined {
  return SCENARIO_LISTENING_TRACKS.find((t) => t.id === trackId)
}

export function getAllScenarioListeningTracks(): readonly ScenarioListeningTrack[] {
  return SCENARIO_LISTENING_TRACKS
}

export function pickVariation(
  track: ScenarioListeningTrack,
  variationId: string | null | undefined,
): ScenarioListeningTrackVariation {
  if (variationId) {
    const v = track.variations.find((x) => x.id === variationId)
    if (v) return v
  }
  return track.variations[0]!
}

export function trackCategoryLine(track: ScenarioListeningTrack): string {
  return `${catShort(track.catalogCategory)} · ${CATALOG_CATEGORY_LABELS[track.catalogCategory].title}`
}

export function trackEstimatedMinutes(track: ScenarioListeningTrack, variationId?: string | null): number {
  const v = pickVariation(track, variationId)
  return estimatePackDurationMinutes(v.packId)
}

/** Map Practice scenario → best listening track (warmup + cross-link). */
const SCENARIO_TO_TRACK: Record<string, string> = {
  cafe: 'listen_food_order',
  restaurant: 'listen_food_order',
  supermarket_shop: 'listen_supermarket',
  train: 'listen_transport',
  directions_getting_somewhere: 'listen_directions',
  booking_reservations: 'listen_booking',
  doctor: 'listen_health_desk',
  pharmacy: 'listen_health_desk',
  problem_solving: 'listen_store_problem',
  store_service_issue: 'listen_store_problem',
  work: 'listen_work',
  work_colleague_interaction: 'listen_work',
  housing: 'listen_housing',
  housing_landlord: 'listen_housing',
  phone_appointment: 'listen_phone',
  social_plans: 'listen_small_talk',
  weather_plans: 'listen_small_talk',
  municipality: 'listen_booking',
  school_front_desk: 'listen_meet_people',
  package_pickup: 'listen_phone',
  bank_office: 'listen_booking',
}

const DEFAULT_TRACK_BY_CATEGORY: Partial<Record<ScenarioCatalogCategory, string>> = {
  transport: 'listen_transport',
  food: 'listen_food_order',
  health: 'listen_health_desk',
  appointments: 'listen_booking',
  problem_solving: 'listen_store_problem',
  work: 'listen_work',
  housing: 'listen_housing',
  social: 'listen_small_talk',
  municipality: 'listen_booking',
}

export function resolveListeningTrackForScenario(scenarioId: string): ScenarioListeningTrack | null {
  const mapped = SCENARIO_TO_TRACK[scenarioId]
  if (mapped) {
    return getScenarioListeningTrack(mapped) ?? null
  }
  const entry = getScenarioCatalogEntry(scenarioId)
  if (!entry) return null
  const fallbackId = DEFAULT_TRACK_BY_CATEGORY[entry.category]
  if (fallbackId) return getScenarioListeningTrack(fallbackId) ?? null
  return SCENARIO_LISTENING_TRACKS[0] ?? null
}
