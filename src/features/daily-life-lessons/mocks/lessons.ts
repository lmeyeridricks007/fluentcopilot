/**
 * FD-09 — mock generated daily lessons (realistic Dutch content).
 */

import type { GeneratedDailyLesson } from '../types'
import { MOCK_TODAY_ACTIVITIES } from './activities'

const TODAY = new Date().toISOString().slice(0, 10)

export const MOCK_GENERATED_LESSON: GeneratedDailyLesson = {
  lessonId: 'dl-today-1',
  date: TODAY,
  title: 'Your Dutch lesson from today',
  sourceEvents: MOCK_TODAY_ACTIVITIES,
  scenarios: [
    { scenarioId: 'cafe', title: 'Ordering coffee', venueType: 'cafe' },
    { scenarioId: 'supermarket_shop', title: 'Shopping for groceries', venueType: 'supermarket' },
    { scenarioId: 'train_station', title: 'At the train station', venueType: 'train_station' },
  ],
  modules: [
    { moduleId: 'm1', type: 'phrases', title: 'Key phrases from your day', itemCount: 6 },
    { moduleId: 'm2', type: 'vocabulary', title: 'Vocabulary to practice', itemCount: 8 },
    { moduleId: 'm3', type: 'quiz', title: 'Quick quiz', description: 'Check what you remember' },
    { moduleId: 'm4', type: 'scenario_recap', title: 'Scenario recap', description: 'Ordering coffee, shopping, trains' },
    { moduleId: 'm5', type: 'pronunciation', title: 'Pronunciation practice', description: 'Tricky Dutch sounds' },
    { moduleId: 'm6', type: 'practice', title: 'Practice with AI tutor', description: 'Roleplay today\'s situations' },
  ],
  phrases: [
    { dutch: 'Mag ik een cappuccino met havermelk?', translation: 'Can I have a cappuccino with oat milk?' },
    { dutch: 'Heeft u havermelk?', translation: 'Do you have oat milk?' },
    { dutch: 'Waar kan ik de havermelk vinden?', translation: 'Where can I find the oat milk?' },
    { dutch: 'Van welk spoor vertrekt de trein?', translation: 'From which platform does the train leave?' },
    { dutch: 'Is dit de trein naar Utrecht?', translation: 'Is this the train to Utrecht?' },
    { dutch: 'Ik heb een afspraak bij de huisarts.', translation: 'I have an appointment with the doctor.' },
  ],
  vocabulary: [
    { dutch: 'havermelk', translation: 'oat milk' },
    { dutch: 'spoor', translation: 'platform' },
    { dutch: 'vertrekken', translation: 'to depart' },
    { dutch: 'afspraak', translation: 'appointment' },
    { dutch: 'huisarts', translation: 'general practitioner' },
    { dutch: 'klacht', translation: 'complaint / symptom' },
    { dutch: 'scannen', translation: 'to scan' },
    { dutch: 'kassa', translation: 'checkout' },
  ],
  completionStatus: 'in_progress',
  premiumRequired: true,
  generationStatus: { status: 'ready' },
}

export const MOCK_LESSON_HISTORY: GeneratedDailyLesson[] = [
  MOCK_GENERATED_LESSON,
  {
    ...MOCK_GENERATED_LESSON,
    lessonId: 'dl-yesterday-1',
    date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    title: 'Your Dutch lesson from yesterday',
    completionStatus: 'completed',
    sourceEvents: [],
    scenarios: [
      { scenarioId: 'pharmacy', title: 'At the pharmacy', venueType: 'pharmacy' },
      { scenarioId: 'office', title: 'Office introduction', venueType: 'office' },
    ],
    modules: [
      { moduleId: 'm1', type: 'phrases', title: 'Key phrases', itemCount: 4 },
      { moduleId: 'm2', type: 'vocabulary', title: 'Vocabulary', itemCount: 5 },
      { moduleId: 'm3', type: 'quiz', title: 'Quick quiz' },
    ],
    phrases: [
      { dutch: 'Ik heb een recept van de huisarts.', translation: 'I have a prescription from the doctor.' },
      { dutch: 'Aangenaam, ik ben de nieuwe stagiair.', translation: 'Pleased to meet you, I\'m the new intern.' },
    ],
    vocabulary: [
      { dutch: 'recept', translation: 'prescription' },
      { dutch: 'stagiair', translation: 'intern' },
    ],
    generationStatus: { status: 'ready' },
  },
]

export function getMockLessonById(lessonId: string): GeneratedDailyLesson | null {
  return MOCK_LESSON_HISTORY.find((l) => l.lessonId === lessonId) ?? null
}
