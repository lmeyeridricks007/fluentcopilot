/**
 * FD-08 — mock location prompts and phrases (realistic Dutch).
 */

import type { LocationPrompt, PhraseSuggestion } from '../types'

const CAFE_PHRASES: PhraseSuggestion[] = [
  { dutch: 'Mag ik een cappuccino alstublieft?', translation: 'Can I have a cappuccino please?', formality: 'formal' },
  { dutch: 'Voor hier of om mee te nemen?', translation: 'For here or to go?', formality: 'neutral' },
  { dutch: 'Kan ik met pin betalen?', translation: 'Can I pay by card?', formality: 'neutral' },
  { dutch: 'Heeft u ook sojamelk?', translation: 'Do you have soy milk?', formality: 'formal' },
]
const TRAIN_PHRASES: PhraseSuggestion[] = [
  { dutch: 'Van welk spoor vertrekt de trein?', translation: 'From which platform does the train leave?', formality: 'neutral' },
  { dutch: 'Is dit de trein naar Utrecht?', translation: 'Is this the train to Utrecht?', formality: 'neutral' },
  { dutch: 'Waar kan ik inchecken?', translation: 'Where can I check in?', formality: 'neutral' },
  { dutch: 'Hoeveel kost een enkeltje naar Amsterdam?', translation: 'How much is a single to Amsterdam?', formality: 'neutral' },
]
const SUPERMARKET_PHRASES: PhraseSuggestion[] = [
  { dutch: 'Waar kan ik de melk vinden?', translation: 'Where can I find the milk?', formality: 'neutral' },
  { dutch: 'Heeft u ook volkoren brood?', translation: 'Do you also have wholemeal bread?', formality: 'formal' },
  { dutch: 'Kan ik hier zelf scannen?', translation: 'Can I scan here myself?', formality: 'neutral' },
  { dutch: 'Waar is de kassa?', translation: 'Where is the checkout?', formality: 'neutral' },
]
const PHARMACY_PHRASES: PhraseSuggestion[] = [
  { dutch: 'Ik heb een recept van de huisarts.', translation: "I have a prescription from the doctor.", formality: 'neutral' },
  { dutch: 'Heeft u paracetamol zonder recept?', translation: 'Do you have paracetamol without prescription?', formality: 'formal' },
  { dutch: 'Kan ik hier mijn medicijnen ophalen?', translation: 'Can I pick up my medication here?', formality: 'neutral' },
]
const OFFICE_PHRASES: PhraseSuggestion[] = [
  { dutch: 'Aangenaam, ik ben de nieuwe stagiair.', translation: 'Pleased to meet you, I\'m the new intern.', formality: 'formal' },
  { dutch: 'Waar is de vergaderzaal?', translation: 'Where is the meeting room?', formality: 'neutral' },
  { dutch: 'Kunnen we een afspraak inplannen?', translation: 'Can we schedule a meeting?', formality: 'neutral' },
]
const SCHOOL_PHRASES: PhraseSuggestion[] = [
  { dutch: 'Mijn kind wil graag naar de opvang.', translation: 'My child would like to go to daycare.', formality: 'neutral' },
  { dutch: 'Wanneer kan hij/zij beginnen?', translation: 'When can he/she start?', formality: 'neutral' },
  { dutch: 'Is er nog plek in groep 1?', translation: 'Is there still space in group 1?', formality: 'neutral' },
]
const MUNICIPALITY_PHRASES: PhraseSuggestion[] = [
  { dutch: 'Ik wil me inschrijven bij de gemeente.', translation: 'I want to register with the municipality.', formality: 'neutral' },
  { dutch: 'Welke documenten heb ik nodig?', translation: 'What documents do I need?', formality: 'neutral' },
  { dutch: 'Ik heb een afspraak om 10 uur.', translation: 'I have an appointment at 10 o\'clock.', formality: 'neutral' },
]
const RESTAURANT_PHRASES: PhraseSuggestion[] = [
  { dutch: 'Kunnen we een tafel voor twee reserveren?', translation: 'Can we reserve a table for two?', formality: 'neutral' },
  { dutch: 'Mag ik de menukaart zien?', translation: 'May I see the menu?', formality: 'formal' },
  { dutch: 'De rekening alstublieft.', translation: 'The bill please.', formality: 'formal' },
]

const VENUE_PHRASES: Record<string, PhraseSuggestion[]> = {
  cafe: CAFE_PHRASES,
  restaurant: RESTAURANT_PHRASES,
  supermarket: SUPERMARKET_PHRASES,
  train_station: TRAIN_PHRASES,
  pharmacy: PHARMACY_PHRASES,
  office: OFFICE_PHRASES,
  school_daycare: SCHOOL_PHRASES,
  municipality: MUNICIPALITY_PHRASES,
}

function makePrompt(
  promptId: string,
  venueType: keyof typeof VENUE_PHRASES,
  scenarioTitle: string,
  options: { isPremium?: boolean; isSaved?: boolean; distanceText?: string; sourceType?: LocationPrompt['sourceType'] } = {}
): LocationPrompt {
  const phrases = VENUE_PHRASES[venueType] ?? CAFE_PHRASES
  return {
    promptId,
    venueType: venueType as LocationPrompt['venueType'],
    scenarioId: venueType,
    scenarioTitle,
    cefrLevel: 'A1',
    distanceText: options.distanceText ?? 'Nearby',
    generatedAt: new Date().toISOString(),
    isSaved: options.isSaved ?? false,
    isPremium: options.isPremium ?? false,
    phrases,
    quickPracticeAvailable: true,
    sourceType: options.sourceType ?? 'mocked_location',
  }
}

export const MOCK_LOCATION_PROMPTS: LocationPrompt[] = [
  makePrompt('prompt-cafe-1', 'cafe', 'At a café', { distanceText: '50 m away' }),
  makePrompt('prompt-train-1', 'train_station', 'At the train station', { distanceText: '200 m away', isPremium: true }),
  makePrompt('prompt-super-1', 'supermarket', 'At the supermarket', { isSaved: true }),
  makePrompt('prompt-pharmacy-1', 'pharmacy', 'At the pharmacy', { sourceType: 'recommendation' }),
]

export const MOCK_PROMPT_BY_ID: Record<string, LocationPrompt> = Object.fromEntries(
  MOCK_LOCATION_PROMPTS.map((p) => [p.promptId, p])
)

export function getMockPrompt(id: string): LocationPrompt | null {
  return MOCK_PROMPT_BY_ID[id] ?? null
}

export const VENUE_DISPLAY_NAMES: Record<string, string> = {
  cafe: 'Café',
  restaurant: 'Restaurant',
  supermarket: 'Supermarket',
  train_station: 'Train station',
  pharmacy: 'Pharmacy',
  office: 'Office',
  school_daycare: 'School / daycare',
  municipality: 'Municipality',
}
