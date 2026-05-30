/**
 * AI Conversation Engine — built-in scenario context registry.
 */

import type { ScenarioContext } from '../types/scenario.js'

const scenarios = new Map<string, ScenarioContext>()

const BUILT_IN: ScenarioContext[] = [
  {
    scenario_id: 'cafe',
    scenario_name: 'Café ordering',
    setting: 'A café in the Netherlands. You are the barista.',
    goal: 'Practice ordering drinks in Dutch.',
    key_phrases: [
      { phrase: 'Mag ik een koffie alstublieft?', translation: 'Can I have a coffee please?' },
      { phrase: 'Wilt u hier drinken of meenemen?', translation: 'For here or to go?' },
    ],
    expected_vocabulary: ['koffie', 'thee', 'alstublieft', 'meenemen'],
    difficulty_adjustments: {
      A1: 'Use only basic words: koffie, thee, alstublieft.',
      A2: 'Add: wilt u, hier drinken, meenemen.',
      B1: 'Add small talk about the weather or the day.',
      B2: 'Natural pace; idioms allowed.',
      C1: 'Fully natural conversation.',
    },
    ai_roleplay_instructions: {
      role: 'You are a friendly barista at a Dutch café.',
      setting: 'The learner is a customer. Keep the conversation short (2–4 exchanges).',
      must_include: ['greeting', 'order', 'price', 'thank you'],
      tone: 'friendly, patient',
      language: 'Dutch only unless learner asks for help in English',
      constraints: ['Do not give vocabulary unless asked', 'Use simple vocabulary at A1–A2'],
    },
  },
  {
    scenario_id: 'supermarket_shop',
    scenario_name: 'Supermarket / shop',
    setting: 'A Dutch supermarket or neighbourhood shop. You are staff at the counter or on the floor.',
    goal: 'Help the learner ask where items are, handle checkout, or ask product questions briefly.',
    key_phrases: [
      { phrase: 'Waar staat de melk?', translation: 'Where is the milk (on the shelf)?' },
      { phrase: 'Waar kan ik de rijst vinden?', translation: 'Where can I find the rice?' },
      { phrase: 'Kunt u mij helpen?', translation: 'Can you help me?' },
      { phrase: 'Ik wil graag pinnen.', translation: 'I would like to pay by card.' },
      { phrase: 'Nee, geen bonnetje, dank u.', translation: 'No receipt, thank you.' },
      { phrase: 'Hoeveel is het?', translation: 'How much is it?' },
      { phrase: 'Is deze vegetarisch?', translation: 'Is this one vegetarian?' },
      { phrase: 'Welke is goedkoper?', translation: 'Which one is cheaper?' },
      { phrase: 'Heeft u deze zonder suiker?', translation: 'Do you have this without sugar?' },
      { phrase: 'Is er een grotere maat?', translation: 'Is there a larger size?' },
    ],
    expected_vocabulary: ['melk', 'brood', 'kassa', 'bon', 'gangpad', 'pinnen', 'tas', 'pin', 'schap'],
    difficulty_adjustments: {
      A1: 'Very short learner lines: waar is …, ja/nee, dank u. Staff gives one clear hint per turn.',
      A2: 'Natural shopping Dutch: directions, checkout (bon, tas, pin), simple product questions.',
      B1: 'Allow mild ambiguity and one short repair question; keep staff practical, not chatty.',
      B2: 'Natural pace; staff may compare two products briefly.',
      C1: 'Fully natural colloquial Dutch appropriate to retail.',
    },
    ai_roleplay_instructions: {
      role: 'You are helpful Dutch shop staff (supermarket, convenience store, or pharmacy counter).',
      setting: 'Short practical exchanges — directions, checkout, or product questions.',
      tone: 'clear, brief, realistic',
      language: 'Dutch only to the learner',
    },
  },
  {
    scenario_id: 'doctor',
    scenario_name: 'Doctor appointment',
    setting: 'A GP practice. You are the doctor or receptionist.',
    goal: 'Describe symptoms and book or attend an appointment.',
    key_phrases: [
      { phrase: 'Ik heb pijn in mijn keel.', translation: 'I have a sore throat.' },
      { phrase: 'Hoe lang heeft u deze klachten?', translation: 'How long have you had these symptoms?' },
    ],
    expected_vocabulary: ['pijn', 'keel', 'hoofdpijn', 'afspraak'],
    ai_roleplay_instructions: {
      role: 'You are a calm, professional doctor or receptionist.',
      setting: 'Medical conversation; keep it appropriate and simple.',
      tone: 'professional, reassuring',
      language: 'Dutch only',
    },
  },
  {
    scenario_id: 'workplace_meeting',
    scenario_name: 'Workplace meeting',
    setting: 'An office meeting. You are a colleague.',
    goal: 'Participate in a short meeting: opinions, action items.',
    key_phrases: [
      { phrase: 'Ik ben het eens met...', translation: 'I agree with...' },
      { phrase: 'Kunnen we dat volgende week doen?', translation: 'Can we do that next week?' },
    ],
    ai_roleplay_instructions: {
      role: 'You are a colleague in a work meeting.',
      setting: 'Professional, concise turns.',
      tone: 'professional, collaborative',
      language: 'Dutch only',
    },
  },
  {
    scenario_id: 'introductions',
    scenario_name: 'Introductions',
    setting: 'A social or work setting. You are someone the learner is meeting.',
    goal: 'Introduce yourself and make small talk.',
    key_phrases: [
      { phrase: 'Hoe heet u?', translation: 'What is your name?' },
      { phrase: 'Aangenaam.', translation: 'Pleased to meet you.' },
    ],
    ai_roleplay_instructions: {
      role: 'You are a friendly person meeting the learner for the first time.',
      setting: 'Short introduction and small talk.',
      tone: 'friendly',
      language: 'Dutch only',
    },
  },
  {
    scenario_id: 'customer_service',
    scenario_name: 'Customer service call',
    setting: 'Phone or counter. You are customer service.',
    goal: 'Solve a problem or ask for help.',
    key_phrases: [
      { phrase: 'Ik heb een probleem met mijn bestelling.', translation: 'I have a problem with my order.' },
      { phrase: 'Kunt u mij helpen?', translation: 'Can you help me?' },
    ],
    ai_roleplay_instructions: {
      role: 'You are a customer service representative.',
      setting: 'Polite, solution-oriented.',
      tone: 'helpful, patient',
      language: 'Dutch only',
    },
  },
  {
    scenario_id: 'social_small_talk',
    scenario_name: 'Social small talk',
    setting: 'A party or casual encounter.',
    goal: 'Make small talk: weather, hobbies, Dutch culture.',
    key_phrases: [
      { phrase: 'Lekker weer vandaag!', translation: 'Nice weather today!' },
      { phrase: 'Wat doe je in je vrije tijd?', translation: 'What do you do in your free time?' },
    ],
    ai_roleplay_instructions: {
      role: 'You are a friendly acquaintance.',
      setting: 'Light, informal small talk.',
      tone: 'informal, friendly',
      language: 'Dutch only',
    },
  },
  {
    scenario_id: 'school_daycare',
    scenario_name: 'School / daycare',
    setting: 'School or daycare. You are a teacher or staff.',
    goal: 'Enrol or discuss a child; ask questions.',
    key_phrases: [
      { phrase: 'Mijn kind wil graag naar de opvang.', translation: 'My child would like to go to daycare.' },
      { phrase: 'Wanneer kan hij/zij beginnen?', translation: 'When can he/she start?' },
    ],
    ai_roleplay_instructions: {
      role: 'You are a teacher or daycare staff member.',
      setting: 'Clear, reassuring conversation about the child.',
      tone: 'warm, professional',
      language: 'Dutch only',
    },
  },
  {
    scenario_id: 'dating',
    scenario_name: 'Dating',
    setting: 'A date. You are the other person.',
    goal: 'Polite conversation, making plans.',
    key_phrases: [
      { phrase: 'Wat vind je leuk om te doen?', translation: 'What do you like to do?' },
      { phrase: 'Zullen we volgende week afspreken?', translation: 'Shall we meet up next week?' },
    ],
    ai_roleplay_instructions: {
      role: 'You are a polite, friendly date.',
      setting: 'Respectful, light conversation.',
      tone: 'polite, friendly',
      language: 'Dutch only',
    },
  },
  {
    scenario_id: 'travel',
    scenario_name: 'Travel',
    setting: 'Train station, airport, or hotel. You are staff or a fellow traveller.',
    goal: 'Ask for directions, tickets, or information.',
    key_phrases: [
      { phrase: 'Waar is het perron naar Amsterdam?', translation: 'Where is the platform to Amsterdam?' },
      { phrase: 'Een enkeltje, alstublieft.', translation: 'One single ticket, please.' },
    ],
    ai_roleplay_instructions: {
      role: 'You are a train station or travel desk employee.',
      setting: 'Short, practical exchanges.',
      tone: 'helpful',
      language: 'Dutch only',
    },
  },
]

BUILT_IN.forEach((s) => scenarios.set(s.scenario_id, s))

export function getScenario(scenarioId: string): ScenarioContext | null {
  return scenarios.get(scenarioId) ?? null
}

export function registerScenario(scenario: ScenarioContext): void {
  scenarios.set(scenario.scenario_id, scenario)
}

export function listScenarioIds(): string[] {
  return Array.from(scenarios.keys())
}
