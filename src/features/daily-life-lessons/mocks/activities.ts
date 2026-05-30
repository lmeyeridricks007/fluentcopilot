/**
 * FD-09 — mock daily activity events (realistic Dutch-learning context).
 */

import type { DailyActivityEvent } from '../types'

export const MOCK_TODAY_ACTIVITIES: DailyActivityEvent[] = [
  {
    eventId: 'evt-1',
    timestamp: new Date().toISOString(),
    sourceType: 'location',
    venueType: 'cafe',
    title: 'At a café',
    note: 'Stopped for coffee after work',
    hasPhoto: false,
    hasVoice: false,
    confidence: 0.9,
    removable: true,
  },
  {
    eventId: 'evt-2',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    sourceType: 'manual',
    venueType: 'supermarket',
    title: 'Supermarket stop',
    note: 'I wanted to ask for oat milk but didn\'t know how',
    hasPhoto: false,
    hasVoice: false,
    removable: true,
  },
  {
    eventId: 'evt-3',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    sourceType: 'location',
    venueType: 'train_station',
    title: 'Train station',
    note: undefined,
    hasPhoto: false,
    hasVoice: false,
    confidence: 0.95,
    removable: true,
  },
  {
    eventId: 'evt-4',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    sourceType: 'saved_phrase',
    title: 'Saved phrase from Smart Prompts',
    note: 'Coffee ordering phrases',
    hasPhoto: false,
    hasVoice: false,
    removable: true,
  },
  {
    eventId: 'evt-5',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    sourceType: 'manual',
    venueType: 'doctor',
    title: 'Doctor visit',
    note: 'Appointment next week – need to explain symptoms',
    hasPhoto: false,
    hasVoice: false,
    removable: true,
  },
]

export const VENUE_DISPLAY_NAMES: Record<string, string> = {
  cafe: 'Café',
  restaurant: 'Restaurant',
  supermarket: 'Supermarket',
  train_station: 'Train station',
  pharmacy: 'Pharmacy',
  office: 'Office',
  school_daycare: 'School / daycare',
  municipality: 'Municipality',
  doctor: 'Doctor',
  other: 'Other',
}

export const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  manual: 'Manual',
  location: 'Location',
  prompt: 'Smart Prompt',
  saved_phrase: 'Saved phrase',
  note: 'Note',
  photo: 'Photo',
  voice_note: 'Voice note',
}
