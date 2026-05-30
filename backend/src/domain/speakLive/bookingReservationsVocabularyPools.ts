/**
 * Structured Dutch vocabulary pools for Booking / reservations (details, time/day, services, confirmations).
 * Used by runtime detail bundles and optional prompt/starter wiring.
 */

/** Reusable time / day / negotiation phrasing (all subtypes). */
export const BOOKING_TIME_DAY_LANGUAGE_POOL = [
  'vandaag',
  'morgen',
  'vrijdag',
  'vanavond',
  'morgenochtend',
  'om drie uur',
  'om half zeven',
  'iets later',
  'iets eerder',
] as const

/** Restaurant-specific booking detail fragments. */
export const BOOKING_RESTAURANT_PARTY_POOL = [
  'voor één persoon',
  'voor twee personen',
  'voor vier personen',
] as const

export const BOOKING_RESTAURANT_DAY_POOL = ['vanavond', 'morgen'] as const

export const BOOKING_RESTAURANT_TIME_POOL = ['om zes uur', 'om half acht'] as const

export const BOOKING_RESTAURANT_SEATING_POOL = ['binnen', 'buiten'] as const

/** Hairdresser service + day fragments. */
export const BOOKING_HAIRDRESSER_SERVICE_POOL = [
  'knippen',
  'knippen en wassen',
  'alleen knippen',
  'trimmen',
] as const

export const BOOKING_HAIRDRESSER_DAY_POOL = ['vrijdagmiddag', 'morgenochtend'] as const

/** Appointment kind + day + time fragments. */
export const BOOKING_APPOINTMENT_KIND_POOL = ['afspraak', 'consult', 'gesprek'] as const

export const BOOKING_APPOINTMENT_DAY_POOL = ['dinsdagochtend', 'volgende week'] as const

export const BOOKING_APPOINTMENT_TIME_POOL = ['om tien uur', 'om half drie'] as const

/** Shared name pool (unchanged breadth). */
export const BOOKING_NAME_POOL = ['Lee', 'Jansen', 'de Vries', 'Bakker', 'Smit', 'Van Dijk'] as const

export const BOOKING_STYLIST_HINT_POOL = [
  'geen voorkeur',
  'bij Lisa als dat kan',
  'de eerste vrije stylist',
] as const

/** Longer appointment descriptions (realistic scene variety). */
export const BOOKING_APPOINTMENT_KIND_LONG_POOL = [
  'een kort consult bij de huisarts',
  'een afspraak bij de gemeente',
  'een bezichtiging',
  'een balie-afspraak voor een document',
] as const

/** Common short confirmations / closes (confirming_details + general). */
export const BOOKING_COMMON_CONFIRMATIONS_A1 = [
  'Ja.',
  'Klopt.',
  'Prima.',
  'Dank u.',
  'Dat is goed.',
] as const

export const BOOKING_COMMON_CONFIRMATIONS_A2 = [
  'Ja, dat klopt.',
  'Prima, dank u.',
  'Dat is goed zo.',
  'Akkoord.',
  'Zo is het goed.',
] as const

export const BOOKING_COMMON_CONFIRMATIONS_B1 = [
  'Dan is het zo afgesproken, dank u wel.',
  'Prima, dan laat ik het hierbij.',
  'Dat klopt inderdaad, graag zo vastleggen.',
] as const

export type BookingPoolsLevel = 'A1' | 'A2' | 'B1'

export function commonConfirmationsForLevel(level: BookingPoolsLevel): readonly string[] {
  if (level === 'A1') return BOOKING_COMMON_CONFIRMATIONS_A1
  if (level === 'B1') return BOOKING_COMMON_CONFIRMATIONS_B1
  return BOOKING_COMMON_CONFIRMATIONS_A2
}

function clampRoll(rng: () => number): number {
  const n = Number(rng())
  if (!Number.isFinite(n)) return Math.random()
  if (n <= 0) return 0
  if (n >= 1) return 0.999_999
  return n
}

export function pickOne<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(clampRoll(rng) * items.length)] ?? items[0]!
}

/** Mix subtype-specific days with shared pool for natural variety. */
export function pickRestaurantDayPhrase(rng: () => number): string {
  if (clampRoll(rng) < 0.55) return pickOne(BOOKING_RESTAURANT_DAY_POOL, rng)
  const dayish = ['vrijdag', 'vandaag', 'morgenochtend', 'vanavond'] as const
  return pickOne(dayish, rng)
}

export function pickRestaurantTimePhrase(rng: () => number): string {
  if (clampRoll(rng) < 0.5) return pickOne(BOOKING_RESTAURANT_TIME_POOL, rng)
  return pickOne(['om half zeven', 'om acht uur', 'om drie uur', 'om tien uur'] as const, rng)
}

export function pickHairdresserDayPhrase(rng: () => number): string {
  if (clampRoll(rng) < 0.5) return pickOne(BOOKING_HAIRDRESSER_DAY_POOL, rng)
  return pickOne(['vrijdag', 'morgen', 'vanavond', 'volgende week'] as const, rng)
}

export function pickHairdresserTimePhrase(rng: () => number): string {
  if (clampRoll(rng) < 0.45) return pickOne(['om half zeven', 'om acht uur', 'om tien uur'] as const, rng)
  return pickOne(['om drie uur', 'iets later', "'s middags"] as const, rng)
}

export function pickAppointmentDayPhrase(rng: () => number): string {
  if (clampRoll(rng) < 0.5) return pickOne(BOOKING_APPOINTMENT_DAY_POOL, rng)
  return pickOne(['morgen', 'vrijdagochtend', 'volgende week dinsdag'] as const, rng)
}

export function pickAppointmentTimePhrase(rng: () => number): string {
  if (clampRoll(rng) < 0.5) return pickOne(BOOKING_APPOINTMENT_TIME_POOL, rng)
  return pickOne(['om negen uur', 'om half elf', 'om half drie ’s middags'] as const, rng)
}
