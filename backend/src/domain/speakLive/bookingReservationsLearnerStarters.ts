/**
 * Learner-facing Dutch starters for Booking / reservations (Speak Live + text via runtime hints).
 * Core lines follow product spec; A1 shortens, B1 extends. Confirming variation also surfaces common confirmations.
 */

import { commonConfirmationsForLevel } from './bookingReservationsVocabularyPools'

export type BookingReservationsLearnerLevel = 'A1' | 'A2' | 'B1'

export type BookingReservationsStarterVariation =
  | 'asking_availability'
  | 'making_booking'
  | 'confirming_details'

export const BOOKING_RESERVATIONS_LEARNER_STARTERS: Record<
  BookingReservationsStarterVariation,
  Record<BookingReservationsLearnerLevel, readonly string[]>
> = {
  asking_availability: {
    A1: [
      'Heeft u plek?',
      'Morgen om zes?',
      'Twee personen?',
      'Iets later?',
    ],
    A2: [
      'Heeft u morgen om zes uur plek?',
      'Is er nog plaats voor twee personen?',
      'Wanneer kan ik langskomen?',
      'Heeft u iets later?',
      'Is er vanavond nog een tafel vrij?',
    ],
    B1: [
      'Heeft u morgen om zes uur plek?',
      'Is er nog plaats voor twee personen?',
      'Wanneer kan ik langskomen?',
      'Heeft u iets later?',
      'Zouden we rond half acht nog terechtkunnen, of iets daarna?',
    ],
  },
  making_booking: {
    A1: [
      'Ik wil reserveren.',
      'Tafel graag.',
      'Voor twee personen.',
      'Knipbeurt graag.',
    ],
    A2: [
      'Ik wil graag een tafel reserveren.',
      'Ik wil graag een afspraak maken.',
      'Voor twee personen.',
      'Voor een knipbeurt.',
      'Voor twee personen, morgen om acht uur, alstublieft.',
    ],
    B1: [
      'Ik wil graag een tafel reserveren.',
      'Ik wil graag een afspraak maken.',
      'Voor twee personen.',
      'Voor een knipbeurt.',
      'Kunnen we buiten reserveren voor vier personen, rond half zeven?',
    ],
  },
  confirming_details: {
    A1: [
      'Ja.',
      'Dus half drie?',
      'Naam Lee.',
      'Alleen knippen.',
    ],
    A2: [
      'Dus vrijdag om half drie?',
      'Onder de naam Lee.',
      'Alleen knippen, alstublieft.',
      'Ja, dat klopt.',
      'Nee, om zeven uur, niet om half zeven.',
    ],
    B1: [
      'Dus vrijdag om half drie?',
      'Onder de naam Lee.',
      'Alleen knippen, alstublieft.',
      'Ja, dat klopt.',
      'Dan bevestig ik: morgen om tien uur, onder de naam Jansen.',
    ],
  },
}

function dedupeHints(lines: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const l of lines) {
    const k = l.trim().toLowerCase()
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(l.trim())
  }
  return out
}

/** Swap a few restaurant-default lines when the scene is salon or balie. */
function adaptMakingHintsForSubtype(subType: string | undefined, hints: string[]): string[] {
  if (!subType) return hints
  if (subType === 'hairdresser_booking') {
    return hints.map((h) => {
      if (h === 'Tafel graag.') return 'Knippen graag.'
      if (h === 'Ik wil graag een tafel reserveren.') return 'Ik wil graag een knipafspraak maken.'
      if (h === 'Kunnen we buiten reserveren voor vier personen, rond half zeven?')
        return 'Kunnen we vrijdag rond half vijf voor knippen en wassen?'
      return h
    })
  }
  if (subType === 'appointment_booking') {
    return hints.map((h) => {
      if (h === 'Tafel graag.') return 'Afspraak graag.'
      if (h === 'Ik wil graag een tafel reserveren.') return 'Ik wil graag een afspraak maken.'
      if (h === 'Voor een knipbeurt.') return 'Voor een consult.'
      if (h === 'Kunnen we buiten reserveren voor vier personen, rond half zeven?')
        return 'Kunnen we volgende week dinsdag om tien uur?'
      return h
    })
  }
  return hints.map((h) => (h === 'Voor een knipbeurt.' ? 'Liefst binnen bij het raam.' : h))
}

export function getBookingReservationsStarterHintsForRuntime(
  level: BookingReservationsLearnerLevel,
  variation?: BookingReservationsStarterVariation,
  subType?: string
): string[] {
  const v = variation ?? 'making_booking'
  const primary = BOOKING_RESERVATIONS_LEARNER_STARTERS[v][level]
  const extra = v === 'confirming_details' ? commonConfirmationsForLevel(level) : []
  let merged = dedupeHints([...primary, ...extra])
  if (v === 'making_booking') merged = adaptMakingHintsForSubtype(subType, merged)
  return merged.slice(0, 5)
}
