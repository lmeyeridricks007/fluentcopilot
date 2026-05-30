/**
 * Scenario factory — AI practice scenarios (café, doctor, etc.).
 */

import type { DemoScenario } from '../types'

const SEED_SCENARIOS: DemoScenario[] = [
  { id: 'cafe', title: 'At the café', description: 'Order coffee and chat with the barista', category: 'Food & drink', level: 'A1', icon: '☕' },
  { id: 'doctor', title: 'Doctor visit', description: 'Explain symptoms and understand advice', category: 'Health', level: 'A2', icon: '🩺' },
  { id: 'supermarket_shop', title: 'Supermarket / shop', description: 'Find items, checkout, product questions', category: 'Shopping', level: 'A1', icon: '🛒' },
  { id: 'municipality', title: 'Municipality', description: 'Register and get documents', category: 'Administration', level: 'A2', icon: '🏛️' },
  { id: 'work', title: 'Work meeting', description: 'Join a meeting and share your opinion', category: 'Work', level: 'B1', icon: '💼' },
  { id: 'train', title: 'Public transport', description: 'Train, bus, tram, metro — routes, tickets, delays', category: 'Transport', level: 'A1', icon: '🚆' },
  { id: 'housing', title: 'Housing & repairs', description: 'Report issues and arrange fixes with your landlord', category: 'Housing', level: 'A2', icon: '🏠' },
  { id: 'social_plans', title: 'Social plans', description: 'Invite friends and make simple plans in Dutch', category: 'Social', level: 'A2', icon: '💬' },
  { id: 'problem_solving', title: 'Shop mix-up', description: 'Calmly fix a wrong order or misunderstanding', category: 'Shopping', level: 'A2', icon: '🔧' },
]

export function buildScenarioCatalog(): DemoScenario[] {
  return [...SEED_SCENARIOS]
}
