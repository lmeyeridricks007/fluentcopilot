import { getScenario, registerScenario } from '@/ai-conversation-engine/config/scenarios'
import type { ScenarioContext } from '@/ai-conversation-engine/types/scenario'

let ensured = false

function regIfMissing(id: string, ctx: ScenarioContext): void {
  if (getScenario(id)) return
  registerScenario(ctx)
}

/**
 * Maps catalog `scenarioId` values to AI-engine scenario contexts for prompts + mocks.
 * Call before any open/semi conversation turn.
 */
export function ensureCatalogScenariosRegistered(): void {
  if (ensured) return
  ensured = true

  const travel = getScenario('travel')
  if (travel) {
    regIfMissing('train', {
      ...travel,
      scenario_id: 'train',
      scenario_name: 'Train station',
      setting: 'Service desk at a Dutch station. You are staff.',
      goal: 'Help the traveller with platform, tickets, or delays.',
    })
  }

  const doctor = getScenario('doctor')
  if (doctor) {
    regIfMissing('municipality', {
      ...doctor,
      scenario_id: 'municipality',
      scenario_name: 'Gemeente counter',
      setting: 'Front desk at a Dutch gemeente. You are a clerk.',
      goal: 'Help with registration, documents, or appointments — formal, calm Dutch.',
      key_phrases: [
        { phrase: 'Welke documenten heb ik nodig?', translation: 'Which documents do I need?' },
        { phrase: 'Ik wil een afspraak maken.', translation: 'I would like to make an appointment.' },
      ],
      ai_roleplay_instructions: {
        role: 'You are a polite gemeente clerk.',
        setting: 'Short, formal exchanges.',
        tone: 'neutral, clear',
        language: 'Dutch only; use u-forms when natural',
      },
    })
  }

  const workplace = getScenario('workplace_meeting')
  if (workplace) {
    regIfMissing('work', {
      ...workplace,
      scenario_id: 'work',
      scenario_name: 'Work meeting',
      setting: 'Short meeting in a Dutch office. You are a colleague.',
    })
    regIfMissing('work_colleague_interaction', {
      ...workplace,
      scenario_id: 'work_colleague_interaction',
      scenario_name: 'Work / colleague interaction',
      setting: 'Short Dutch workplace talk at a desk or in the hallway. You are a colleague, teammate, or calm lead.',
      goal: 'Small talk, ask for help, or clarify tasks — polite, short Dutch.',
      key_phrases: [
        { phrase: 'Kun je mij even helpen?', translation: 'Can you help me for a moment?' },
        { phrase: 'Wat moet ik precies doen?', translation: 'What exactly should I do?' },
        { phrase: 'Wanneer moet dit klaar zijn?', translation: 'When does this need to be ready?' },
      ],
    })
  }

  const csBase = getScenario('customer_service')
  if (csBase) {
    regIfMissing('housing_landlord', {
      ...csBase,
      scenario_id: 'housing_landlord',
      scenario_name: 'Housing / landlord',
      setting: 'Phone or short visit about a Dutch rental — landlord, agency, or building manager.',
      goal: 'Report a practical home issue or ask about rent, deposit, or contract — calm, clear Dutch.',
      key_phrases: [
        { phrase: 'De verwarming werkt niet.', translation: 'The heating is not working.' },
        { phrase: 'Wanneer moet ik de huur betalen?', translation: 'When should I pay the rent?' },
        { phrase: 'Kunt u iemand sturen?', translation: 'Can you send someone?' },
      ],
    })
    regIfMissing('housing', {
      ...csBase,
      scenario_id: 'housing',
      scenario_name: 'Housing & repairs',
      setting: 'Phone or message about a home problem. You are the landlord or service.',
      goal: 'Report a problem and arrange a simple fix.',
      key_phrases: [
        { phrase: 'Er is lekkage in de badkamer.', translation: 'There is a leak in the bathroom.' },
        { phrase: 'Kunt u iemand sturen?', translation: 'Can you send someone?' },
      ],
    })
  }

  const social = getScenario('social_small_talk')
  if (social) {
    regIfMissing('social_plans', {
      ...social,
      scenario_id: 'social_plans',
      scenario_name: 'Social plans',
      setting: 'Casual chat about meeting up. You are a friend or acquaintance.',
      goal: 'Invite, accept/decline, fix a time.',
    })
  }

  if (csBase) {
    regIfMissing('problem_solving', {
      ...csBase,
      scenario_id: 'problem_solving',
      scenario_name: 'Shop mix-up',
      setting: 'Shop or service desk. Something went wrong with an order.',
      goal: 'Explain the problem calmly and find a solution.',
    })
  }

  const cafeBase = getScenario('cafe')
  if (cafeBase) {
    regIfMissing('restaurant', {
      ...cafeBase,
      scenario_id: 'restaurant',
      scenario_name: 'Restaurant',
      setting: 'Table-service restaurant in the Netherlands. You are staff.',
      goal: 'Reserve a table, order politely, and pay.',
      key_phrases: [
        { phrase: 'Mag ik de kaart, alstublieft?', translation: 'May I have the menu, please?' },
        { phrase: 'Ik wil graag betalen.', translation: 'I would like to pay.' },
      ],
    })
  }

  if (doctor) {
    regIfMissing('pharmacy', {
      ...doctor,
      scenario_id: 'pharmacy',
      scenario_name: 'Pharmacy',
      setting: 'Dutch pharmacy counter. You are the pharmacist.',
      goal: 'Request medicine and understand simple dosage instructions.',
      key_phrases: [
        { phrase: 'Ik heb iets tegen hoofdpijn nodig.', translation: 'I need something for a headache.' },
        { phrase: 'Hoe vaak per dag?', translation: 'How many times a day?' },
      ],
    })
    regIfMissing('phone_appointment', {
      ...doctor,
      scenario_id: 'phone_appointment',
      scenario_name: 'Phone appointment',
      setting: 'Phone call to a Dutch GP reception. You are reception.',
      goal: 'Make or change an appointment briefly and politely.',
      key_phrases: [
        { phrase: 'Ik wil graag een afspraak maken.', translation: 'I would like to make an appointment.' },
        { phrase: 'Heeft u volgende week nog tijd?', translation: 'Do you have time next week?' },
      ],
    })
    regIfMissing('booking_reservations', {
      ...doctor,
      scenario_id: 'booking_reservations',
      scenario_name: 'Booking / reservations',
      setting: 'Dutch restaurant host, salon reception, or service desk. You are staff.',
      goal: 'Ask availability, take a booking, confirm time and details — short, natural Dutch.',
      key_phrases: [
        { phrase: 'Ik wil graag een tafel reserveren.', translation: 'I would like to book a table.' },
        { phrase: 'Heeft u morgenavond nog plek?', translation: 'Do you still have space tomorrow evening?' },
      ],
    })
    regIfMissing('store_service_issue', {
      ...csBase,
      scenario_id: 'store_service_issue',
      scenario_name: 'Problem in a store / service issue',
      setting: 'Return desk, customer service counter, or product support in the Netherlands. You are staff.',
      goal: 'Help with a return, a service complaint, or a defective product — short, practical Dutch.',
      key_phrases: [
        { phrase: 'Ik wil dit graag terugbrengen.', translation: 'I would like to return this.' },
        { phrase: 'Er is iets misgegaan met mijn bestelling.', translation: 'Something went wrong with my order.' },
        { phrase: 'Wat kan ik nu doen?', translation: 'What can I do now?' },
      ],
    })
  }

  const school = getScenario('school_daycare')
  if (school) {
    regIfMissing('school_front_desk', {
      ...school,
      scenario_id: 'school_front_desk',
      scenario_name: 'School front desk',
      setting: 'Reception at a Dutch school. You are staff.',
      goal: 'Ask about enrolment, schedules, or a first day.',
    })
  }

  if (travel) {
    regIfMissing('package_pickup', {
      ...travel,
      scenario_id: 'package_pickup',
      scenario_name: 'Package pickup',
      setting: 'Parcel service point in the Netherlands. You are desk staff.',
      goal: 'Pick up a parcel with ID or pickup code.',
      key_phrases: [
        { phrase: 'Ik kom een pakketje ophalen.', translation: 'I am here to pick up a parcel.' },
        { phrase: 'Mag ik uw identiteitsbewijs zien?', translation: 'May I see your ID?' },
      ],
    })
  }

  const gemeente = getScenario('municipality')
  if (gemeente) {
    regIfMissing('bank_office', {
      ...gemeente,
      scenario_id: 'bank_office',
      scenario_name: 'Bank / admin office',
      setting: 'Bank service desk in the Netherlands. You are counter staff.',
      goal: 'Help with a simple account or form question — formal, calm Dutch.',
    })
  }

  const shop = getScenario('supermarket_shop')
  if (shop) {
    regIfMissing('supermarket_shop', {
      ...shop,
      scenario_id: 'supermarket_shop',
      scenario_name: 'Supermarket / shop',
      setting: shop.setting,
      goal: shop.goal,
    })
  }

  if (social) {
    regIfMissing('weather_plans', {
      ...social,
      scenario_id: 'weather_plans',
      scenario_name: 'Weather and plans',
      setting: 'Casual chat in the Netherlands. You are a friend or colleague.',
      goal: 'Comment on the weather and agree on a simple plan.',
      key_phrases: [
        { phrase: 'Het wordt mooi weer dit weekend.', translation: 'The weather will be nice this weekend.' },
        { phrase: 'Zullen we zaterdag afspreken?', translation: 'Shall we meet on Saturday?' },
      ],
    })
  }
}
