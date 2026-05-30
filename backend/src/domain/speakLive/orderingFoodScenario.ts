import type {
  ConversationMessage,
  PersonaConfig,
  ScenarioConfig,
  ScenarioDifficultyAdjustments,
  ScenarioRuntimeConfig,
  ScenarioRuntimeGoal,
  ScenarioSelectionOverrides,
} from '../../models/contracts'

import { DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID } from './directionsGettingSomewhereScenario'
import {
  PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID,
  hydratePublicTransportLearnerSituationSummary,
} from './publicTransportScenario'
import {
  BOOKING_RESERVATIONS_SCENARIO_ID,
  hydrateBookingReservationsLearnerSituationSummary,
} from './bookingReservationsScenario'
import { SUPERMARKET_SHOP_SCENARIO_ID, hydrateSupermarketShopLearnerSituationSummary } from './supermarketShopScenario'
import {
  DOCTOR_PHARMACY_SCENARIO_ID,
  hydrateDoctorPharmacyLearnerSituationSummary,
} from './doctorPharmacyScenario'
import {
  STORE_SERVICE_ISSUE_SCENARIO_ID,
  hydrateStoreServiceIssueLearnerSituationSummary,
} from './storeServiceIssueScenario'
import {
  WORK_COLLEAGUE_INTERACTION_SCENARIO_ID,
  hydrateWorkColleagueInteractionLearnerSituationSummary,
} from './workColleagueInteractionScenario'
import { HOUSING_LANDLORD_SCENARIO_ID, hydrateHousingLandlordLearnerSituationSummary } from './housingLandlordScenario'
import { PHONE_CALL_SCENARIO_ID, hydratePhoneCallLearnerSituationSummary } from './phoneCallScenario'
import { SMALL_TALK_SCENARIO_ID, hydrateSmallTalkLearnerSituationSummary } from './smallTalkScenario'
import {
  MEETING_NEW_PEOPLE_SCENARIO_ID,
  hydrateMeetingNewPeopleLearnerSituationSummary,
} from './meetingNewPeopleScenario'
import { PARTY_SOCIAL_SCENARIO_ID, hydratePartySocialLearnerSituationSummary } from './partySocialScenario'
import {
  EXPLAINING_SOMETHING_SCENARIO_ID,
  hydrateExplainingSomethingLearnerSituationSummary,
} from './explainingSomethingScenario'
import { STORYTELLING_SCENARIO_ID, hydrateStorytellingLearnerSituationSummary } from './storytellingScenario'
import {
  OPINIONS_DISCUSSIONS_SCENARIO_ID,
  hydrateOpinionsDiscussionsLearnerSituationSummary,
} from './opinionsDiscussionsScenario'

export const ORDERING_FOOD_SCENARIO_ID = 'ordering_food' as const
/** Dutch for prompts / TTS context — avoids English scene titles that pull in bilingual greetings. */
export const ORDERING_FOOD_TITLE = 'Eten en drinken bestellen' as const
export const ORDERING_FOOD_CATEGORY = 'Eten en drinken' as const

export const ORDERING_FOOD_SUB_TYPES = ['cafe', 'restaurant', 'takeaway'] as const
export const ORDERING_FOOD_VARIATIONS = ['simple_order', 'dietary_request', 'recommendation'] as const
export const ORDERING_FOOD_CORE_SKILLS = ['direct_request', 'politeness', 'clarification'] as const

export type OrderingFoodLevel = 'A1' | 'A2' | 'B1'
export type OrderingFoodSubType = (typeof ORDERING_FOOD_SUB_TYPES)[number]
export type OrderingFoodVariation = (typeof ORDERING_FOOD_VARIATIONS)[number]
export type OrderingFoodCoreSkill = (typeof ORDERING_FOOD_CORE_SKILLS)[number]
export type OrderingFoodVariationInput = OrderingFoodVariation | 'simple' | 'dietary' | 'recommendation'

type BuildOrderingFoodScenarioConfig = {
  level: OrderingFoodLevel
  subType?: OrderingFoodSubType
  variation?: OrderingFoodVariationInput
  random?: () => number
}

const SUB_TYPE_LABEL: Record<OrderingFoodSubType, string> = {
  cafe: 'cafe',
  restaurant: 'restaurant',
  takeaway: 'takeaway counter',
}

const PERSONA_BY_SUB_TYPE: Record<OrderingFoodSubType, { role: string; displayName: string; openingLine: string }> = {
  cafe: {
    role: 'Barista',
    displayName: 'Barista',
    openingLine: 'Hoi — dag. Waarmee kan ik je helpen?',
  },
  restaurant: {
    role: 'Ober',
    displayName: 'Ober',
    openingLine: 'Goedenavond — welkom. Waarmee kan ik u helpen?',
  },
  takeaway: {
    role: 'Medewerker afhaal',
    displayName: 'Afhaalbalie',
    openingLine: 'Hallo — welkom. Waarmee kan ik u helpen?',
  },
}

/** Hard constraint for prompts: in-character lines to the learner are Dutch only. */
const ASSISTANT_DUTCH_ONLY =
  'Alle zinnen aan de oefenaar zijn uitsluitend Nederlands; geen Engels (ook geen begroeting in het Engels).'

const TONE_VARIANTS = ['friendly', 'neutral', 'slightly rushed'] as const
type OrderingFoodTone = (typeof TONE_VARIANTS)[number]

/** Learner-facing assistant openings — Dutch only (spoken + on-screen). */
const OPENING_LINES: Record<OrderingFoodSubType, Record<'A2' | 'B1', readonly string[]>> = {
  cafe: {
    A2: [
      'Hallo, wat mag het voor u zijn?',
      'Goedemiddag. Wat wilt u bestellen?',
      'Hoi, zegt u het maar — wat mag ik noteren?',
      'Goedendag. Waarmee kan ik u helpen?',
    ],
    B1: [
      'Goedemiddag. Heeft u al iets op het oog, of mag ik u helpen kiezen?',
      'Hallo, wat mag het worden vandaag?',
      'Dag, wat kan ik voor u doen?',
    ],
  },
  restaurant: {
    A2: [
      'Goedenavond — welkom. Waarmee kan ik u helpen?',
      'Welkom — goedenavond. Hoe kan ik u van dienst zijn?',
      'Goedenavond — dag. Waar kan ik u mee helpen — eten of drinken?',
    ],
    B1: [
      'Goedenavond — welkom. Waarmee kan ik u helpen — drinken eerst of meteen eten?',
      'Welkom — goedenavond. Hoe kan ik u van dienst zijn vandaag?',
    ],
  },
  takeaway: {
    A2: [
      'Hallo — goedemiddag. Waarmee kan ik voor u klaarmaken?',
      'Hoi — dag. Wat mag het zijn — kan ik ergens mee helpen?',
      'Goedendag — welkom. Hoe kan ik u van dienst zijn?',
      'Hallo — waarmee kan ik u helpen vandaag?',
    ],
    B1: [
      'Hallo — welkom. Waarmee kan ik u helpen, of mag ik iets voorstellen?',
      'Goedemiddag — dag. Hoe kan ik u van dienst zijn?',
    ],
  },
}

const RECOMMENDATION_STYLE_VARIANTS = [
  'Geef soms eerst een concrete aanbeveling.',
  'Geef soms een iets bredere of vage aanbeveling en laat de oefenaar met één vervolgvraag reageren.',
] as const

const CONTEXT_PARTS: Record<
  OrderingFoodSubType,
  {
    places: string[]
    staffTone: string[]
    paceHints: string[]
  }
> = {
  cafe: {
    places: [
      'in een druk café in Amsterdam',
      'in een rustig buurtcafé',
      'in een klein café aan de gracht',
    ],
    staffTone: ['De barista klinkt vriendelijk.', 'De barista is neutraal maar oplettend.'],
    paceHints: ['Er staat een korte rij achter je.', 'Je hebt even tijd voor een extra vraag.'],
  },
  restaurant: {
    places: ['aan tafel in een restaurant', 'aan een rustige restauranttafel', 'in een licht druk restaurant'],
    staffTone: ['De ober is beleefd en professioneel.', 'De ober klinkt kalm en neutraal.'],
    paceHints: ['Je mag één korte vervolgvraag stellen.', 'De bediening is rustig, niet gehaast.'],
  },
  takeaway: {
    places: ['aan een afhaalbalie', 'aan een drukke snackbalie', 'aan een snelle lunchbalie'],
    staffTone: ['De medewerker is kort maar beleefd.', 'De medewerker is neutraal en wacht op je bestelling.'],
    paceHints: ['Je moet redelijk snel bestellen.', 'Er is lichte tijdsdruk.'],
  },
}

function clampRoll(rng: () => number): number {
  const n = Number(rng())
  if (!Number.isFinite(n)) return Math.random()
  if (n <= 0) return 0
  if (n >= 1) return 0.999_999
  return n
}

function pickOne<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(clampRoll(rng) * items.length)] ?? items[0]
}

function normalizeVariation(
  variation: OrderingFoodVariationInput | undefined
): OrderingFoodVariation | undefined {
  switch ((variation ?? '').trim().toLowerCase()) {
    case 'simple':
    case 'simple_order':
      return 'simple_order'
    case 'dietary':
    case 'dietary_request':
      return 'dietary_request'
    case 'recommendation':
      return 'recommendation'
    default:
      return undefined
  }
}

function buildContext(params: {
  subType: OrderingFoodSubType
  variation: OrderingFoodVariation
  tone: OrderingFoodTone
  rng: () => number
}): string {
  const { subType, variation, tone, rng } = params
  const parts = CONTEXT_PARTS[subType]
  const place = pickOne(parts.places, rng)
  const sentenceOne = `Je bent ${place}.`
  const toneLine =
    tone === 'friendly'
      ? 'De bediening klinkt vriendelijk.'
      : tone === 'slightly rushed'
        ? 'De bediening klinkt licht gehaast.'
        : pickOne(parts.staffTone, rng)
  const sentenceTwoBase = `${toneLine} ${pickOne(parts.paceHints, rng)}`
  const variationTail =
    variation === 'dietary_request'
      ? 'Misschien wil je iets vragen over ingrediënten.'
      : variation === 'recommendation'
        ? 'Je kunt vragen wat ze aanraden.'
        : 'Zeg je bestelling duidelijk.'
  return `${sentenceOne} ${sentenceTwoBase} ${variationTail}`.trim()
}

function buildVariationGoal(subType: OrderingFoodSubType, variation: OrderingFoodVariation): ScenarioRuntimeGoal {
  if (variation === 'dietary_request') {
    return {
      id: 'ask_about_ingredients',
      label: 'Vraag iets over ingrediënten of dieetwensen vóór je bestelt.',
      weight: 20,
      required: true,
      skill: 'clarification',
    }
  }
  if (variation === 'recommendation') {
    return {
      id: 'ask_for_recommendation',
      label: 'Vraag wat de bediening aanraadt en reageer op het voorstel.',
      weight: 20,
      required: true,
      skill: 'clarification',
    }
  }
  return {
    id: 'ask_follow_up',
    label:
      subType === 'restaurant'
        ? 'Stel één korte vervolgvraag over het gerecht of drankje.'
        : 'Stel één korte vervolgvraag over formaat, prijs of beschikbaarheid.',
    weight: 20,
    skill: 'clarification',
  }
}

function buildGoals(subType: OrderingFoodSubType, variation: OrderingFoodVariation): ScenarioRuntimeGoal[] {
  return [
    {
      id: 'make_clear_order',
      label:
        subType === 'restaurant'
          ? 'Plaats een duidelijke bestelling voor eten of drinken.'
          : 'Doe een duidelijk verzoek voor eten of drinken.',
      weight: 40,
      required: true,
      skill: 'direct_request',
    },
    {
      id: 'use_polite_phrasing',
      label: 'Gebruik beleefde formuleringen zoals alstublieft, graag of dank u wel.',
      weight: 20,
      skill: 'politeness',
    },
    buildVariationGoal(subType, variation),
    {
      id: 'clarify_or_confirm',
      label: 'Verduidelijk of bevestig één detail voordat het gesprek eindigt.',
      weight: 20,
      skill: 'clarification',
    },
  ]
}

function buildHints(level: OrderingFoodLevel, variation: OrderingFoodVariation): string[] {
  if (level === 'A1') {
    return variation === 'recommendation'
      ? ['Ik wil graag ...', 'Wat raadt u aan?', 'Oké, graag.']
      : variation === 'dietary_request'
        ? ['Ik wil graag ...', 'Zit er melk in?', 'Dank u wel.']
        : ['Ik wil graag ...', 'Een koffie, alstublieft.', 'Dat is alles, dank u wel.']
  }
  if (level === 'B1') {
    return variation === 'recommendation'
      ? ['Wat raadt u aan vandaag?', 'Dan neem ik die graag.', 'Kunt u dat even bevestigen?']
      : variation === 'dietary_request'
        ? ['Ik eet vegetarisch.', 'Zit daar lactose in?', 'Heeft u een ander voorstel?']
        : ['Mag ik ..., alstublieft?', 'Kan ik daar ook ... bij krijgen?', 'Klopt dat zo?']
  }
  return variation === 'recommendation'
    ? ['Wat zou u aanraden?', 'Dat klinkt goed.', 'Kan ik dat zonder ... krijgen?']
    : variation === 'dietary_request'
      ? ['Heeft dit gluten of melk?', 'Ik ben allergisch voor ...', 'Heeft u een andere optie?']
      : ['Ik wil graag ...', 'Kan ik ook ... krijgen?', 'Klopt mijn bestelling zo?']
}

function buildOpeningVariants(subType: OrderingFoodSubType, level: OrderingFoodLevel): string[] {
  if (level === 'A1') {
    return [
      PERSONA_BY_SUB_TYPE[subType].openingLine,
      subType === 'cafe'
        ? 'Hallo, wat wilt u?'
        : subType === 'restaurant'
          ? 'Goedenavond. Wat mag het zijn?'
          : 'Hallo, wat mag ik voor u doen?',
    ]
  }
  const band = level === 'B1' ? 'B1' : 'A2'
  return [...OPENING_LINES[subType][band]]
}

function buildFrictionChance(level: OrderingFoodLevel): string {
  if (level === 'A1') return 'Maximaal 10% van de runs, alleen heel lichte verduidelijking.'
  if (level === 'B1') return 'Ongeveer 18% van de runs; houd wrijving licht en kort.'
  return 'Ongeveer 14% van de runs, alleen lichte verduidelijking.'
}

function buildAssistantBehavior(params: {
  subType: OrderingFoodSubType
  level: OrderingFoodLevel
  tone: OrderingFoodTone
  frictionEnabled: boolean
  recommendationStyle: string
}): ScenarioRuntimeConfig['assistantBehavior'] {
  const { subType, level, tone, frictionEnabled, recommendationStyle } = params
  if (subType === 'cafe') {
    return {
      pace: 'fast-paced',
      register: 'informeel en efficiënt',
      tone,
      responseStyle: [
        ASSISTANT_DUTCH_ONLY,
        'Houd antwoorden kort en natuurlijk in het Nederlands.',
        'Varieer de formulering zodat de opening niet robotachtig klinkt.',
        'Leg niet te veel uit tenzij de oefenaar erom vraagt.',
      ],
      frictionStyle: frictionEnabled
        ? [
            'Bij een onvolledige bestelling: stel één korte verduidelijkingsvraag in het Nederlands (bijv. welke variant, groot of klein).',
            'Laat soms één detail weg zodat de oefenaar het moet bevestigen.',
            'Als de bestelling duidelijk is, antwoord direct zonder onnodige wrijving.',
          ]
        : [
            'Antwoord direct en behulpzaam in het Nederlands.',
            'Verduidelijk alleen als dat nodig is om de bestelling te begrijpen.',
          ],
      openingVariants: buildOpeningVariants(subType, level),
      recommendationStyle,
      frictionChance: buildFrictionChance(level),
      guardrails: [
        'Blokkeer de oefenaar niet op weg naar het doel.',
        'Voor beginners: korte, makkelijk te beantwoorden verduidelijkingen.',
      ],
    }
  }
  if (subType === 'restaurant') {
    return {
      pace: 'steady',
      register: 'licht formeel en beleefd',
      tone,
      responseStyle: [
        ASSISTANT_DUTCH_ONLY,
        'Gebruik rustige, natuurlijke bedieningstaal in het Nederlands.',
        'Laat ruimte voor één vervolgvraag.',
        'Herhaal niet elke run exact dezelfde openingszin.',
      ],
      frictionStyle: frictionEnabled
        ? [
            'Vraag naar één ontbrekend detail als de bestelling onvolledig is.',
            'Houd eventuele menu-wrijving subtiel en kort.',
          ]
        : ['Antwoord duidelijk in het Nederlands en houd het tempo op.', 'Help niet overdreven met formuleringen.'],
      openingVariants: buildOpeningVariants(subType, level),
      recommendationStyle,
      frictionChance: buildFrictionChance(level),
      guardrails: [
        'Houd de oefenaar op koers richting bestellen.',
        'Wrijving moet licht blijven voor A1- en A2-niveau.',
      ],
    }
  }
  return {
    pace: 'quick',
    register: 'zakelijk en direct',
    tone,
    responseStyle: [
      ASSISTANT_DUTCH_ONLY,
      'Houd de uitwisseling kort en natuurlijk in het Nederlands.',
      'Stuur de oefenaar vriendelijk naar een keuze.',
      'Varieer licht in formulering zodat elke run minder scriptmatig voelt.',
    ],
    frictionStyle: frictionEnabled
      ? [
          'Stel één korte vervolgvraag als er een keuze ontbreekt.',
          'Gebruik lichte tijdsdruk, geen verwarring.',
        ]
      : ['Antwoord direct in het Nederlands.', 'Stel alleen verduidelijkingsvragen als de bestelling dat nodig heeft.'],
    openingVariants: buildOpeningVariants(subType, level),
    recommendationStyle,
    frictionChance: buildFrictionChance(level),
    guardrails: [
      'Overweldig de oefenaar niet.',
      'Alleen lichte wrijving; de taak moet haalbaar en scoorbaar blijven.',
    ],
  }
}

function buildDifficultyAdjustments(level: OrderingFoodLevel): ScenarioDifficultyAdjustments {
  if (level === 'A1') {
    return {
      learnerLevel: 'A1',
      responsePacing: 'Langzamer en vergevingsgezind.',
      vocabularyRange: 'Alleen heel gangbare woorden voor eten en drinken.',
      followUpStyle: 'Stel hoogstens één eenvoudige vervolgvraag tegelijk.',
      misunderstandingLevel: 'Vermijd misverstanden tenzij de oefenaar erg onduidelijk is.',
    }
  }
  if (level === 'B1') {
    return {
      learnerLevel: 'B1',
      responsePacing: 'Natuurlijk tempo.',
      vocabularyRange: 'Meer natuurlijke menu- en ingrediëntenwoorden toestaan.',
      followUpStyle: 'Korte natuurlijke vervolgvragen en optioneel extra detail.',
      misunderstandingLevel: 'Subtiele misverstanden of dubbelzinnige details toestaan.',
    }
  }
  return {
    learnerLevel: 'A2',
    responsePacing: 'Normaal tempo met korte pauzes tussen ideeën.',
    vocabularyRange: 'Gangbare woorden voor eten en drinken in het dagelijks leven.',
    followUpStyle: 'Stel korte vervolgvragen wanneer nodig.',
    misunderstandingLevel: 'Alleen lichte wrijving toestaan.',
  }
}

function buildOpeningLine(subType: OrderingFoodSubType, level: OrderingFoodLevel, rng: () => number): string {
  if (level === 'A1') return PERSONA_BY_SUB_TYPE[subType].openingLine
  const band = level === 'B1' ? 'B1' : 'A2'
  return pickOne(OPENING_LINES[subType][band], rng)
}

export function buildOrderingFoodScenario(config: BuildOrderingFoodScenarioConfig): ScenarioRuntimeConfig {
  const rng = config.random ?? Math.random
  const subType = config.subType ?? pickOne(ORDERING_FOOD_SUB_TYPES, rng)
  const variation = normalizeVariation(config.variation) ?? pickOne(ORDERING_FOOD_VARIATIONS, rng)
  const tone = pickOne(TONE_VARIANTS, rng)
  const frictionEnabled = clampRoll(rng) < (config.level === 'A1' ? 0.1 : config.level === 'B1' ? 0.18 : 0.14)
  const recommendationStyle = pickOne(RECOMMENDATION_STYLE_VARIANTS, rng)
  const goals = buildGoals(subType, variation)
  const weights = Object.fromEntries(goals.map((goal) => [goal.id, goal.weight]))
  const persona = PERSONA_BY_SUB_TYPE[subType]

  return {
    id: ORDERING_FOOD_SCENARIO_ID,
    title: ORDERING_FOOD_TITLE,
    category: ORDERING_FOOD_CATEGORY,
    level: config.level,
    subType,
    variation,
    context: buildContext({ subType, variation, tone, rng }),
    goals,
    weights,
    assistantBehavior: buildAssistantBehavior({
      subType,
      level: config.level,
      tone,
      frictionEnabled,
      recommendationStyle,
    }),
    difficultyAdjustments: buildDifficultyAdjustments(config.level),
    hints: buildHints(config.level, variation),
    persona: {
      role: persona.role,
      displayName: persona.displayName,
      sceneLabel: SUB_TYPE_LABEL[subType],
      tone,
      frictionEnabled: frictionEnabled ? 'light friction enabled for this run' : 'direct helpful run',
    },
    coreSkills: [...ORDERING_FOOD_CORE_SKILLS],
    openingLine: buildOpeningLine(subType, config.level, rng),
  }
}

export function maybeBuildSpeakLiveScenarioRuntime(params: {
  scenario: ScenarioConfig
  level: OrderingFoodLevel
  overrides?: ScenarioSelectionOverrides | null
}): ScenarioRuntimeConfig | null {
  if (params.scenario.slug !== ORDERING_FOOD_SCENARIO_ID) return null
  const variation = normalizeVariation(params.overrides?.variation as OrderingFoodVariationInput | undefined)
  return buildOrderingFoodScenario({
    level: params.level,
    subType: params.overrides?.subType as OrderingFoodSubType | undefined,
    variation,
  })
}

export function applyScenarioRuntimeConfig(
  scenario: ScenarioConfig,
  runtimeConfig: ScenarioRuntimeConfig | null | undefined
): ScenarioConfig {
  if (!runtimeConfig) return scenario
  const isSpeakLiveDynamic =
    runtimeConfig.id === ORDERING_FOOD_SCENARIO_ID ||
    runtimeConfig.id === SUPERMARKET_SHOP_SCENARIO_ID ||
    runtimeConfig.id === BOOKING_RESERVATIONS_SCENARIO_ID ||
    runtimeConfig.id === STORE_SERVICE_ISSUE_SCENARIO_ID ||
    runtimeConfig.id === WORK_COLLEAGUE_INTERACTION_SCENARIO_ID ||
    runtimeConfig.id === HOUSING_LANDLORD_SCENARIO_ID ||
    runtimeConfig.id === DOCTOR_PHARMACY_SCENARIO_ID ||
    runtimeConfig.id === DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID ||
    runtimeConfig.id === PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID ||
    runtimeConfig.id === PHONE_CALL_SCENARIO_ID ||
    runtimeConfig.id === SMALL_TALK_SCENARIO_ID ||
    runtimeConfig.id === MEETING_NEW_PEOPLE_SCENARIO_ID ||
    runtimeConfig.id === PARTY_SOCIAL_SCENARIO_ID ||
    runtimeConfig.id === EXPLAINING_SOMETHING_SCENARIO_ID ||
    runtimeConfig.id === STORYTELLING_SCENARIO_ID ||
    runtimeConfig.id === OPINIONS_DISCUSSIONS_SCENARIO_ID
  if (!isSpeakLiveDynamic) return scenario
  const rc =
    runtimeConfig.id === SUPERMARKET_SHOP_SCENARIO_ID
      ? hydrateSupermarketShopLearnerSituationSummary(runtimeConfig)
      : runtimeConfig.id === BOOKING_RESERVATIONS_SCENARIO_ID
        ? hydrateBookingReservationsLearnerSituationSummary(runtimeConfig)
        : runtimeConfig.id === STORE_SERVICE_ISSUE_SCENARIO_ID
          ? hydrateStoreServiceIssueLearnerSituationSummary(runtimeConfig)
          : runtimeConfig.id === WORK_COLLEAGUE_INTERACTION_SCENARIO_ID
            ? hydrateWorkColleagueInteractionLearnerSituationSummary(runtimeConfig)
            : runtimeConfig.id === HOUSING_LANDLORD_SCENARIO_ID
            ? hydrateHousingLandlordLearnerSituationSummary(runtimeConfig)
            : runtimeConfig.id === DOCTOR_PHARMACY_SCENARIO_ID
              ? hydrateDoctorPharmacyLearnerSituationSummary(runtimeConfig)
              : runtimeConfig.id === PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID
                ? hydratePublicTransportLearnerSituationSummary(runtimeConfig)
                : runtimeConfig.id === PHONE_CALL_SCENARIO_ID
                  ? hydratePhoneCallLearnerSituationSummary(runtimeConfig)
                  : runtimeConfig.id === SMALL_TALK_SCENARIO_ID
                  ? hydrateSmallTalkLearnerSituationSummary(runtimeConfig)
                  : runtimeConfig.id === MEETING_NEW_PEOPLE_SCENARIO_ID
                    ? hydrateMeetingNewPeopleLearnerSituationSummary(runtimeConfig)
                    : runtimeConfig.id === PARTY_SOCIAL_SCENARIO_ID
                      ? hydratePartySocialLearnerSituationSummary(runtimeConfig)
                      : runtimeConfig.id === EXPLAINING_SOMETHING_SCENARIO_ID
                        ? hydrateExplainingSomethingLearnerSituationSummary(runtimeConfig)
                        : runtimeConfig.id === STORYTELLING_SCENARIO_ID
                          ? hydrateStorytellingLearnerSituationSummary(runtimeConfig)
                          : runtimeConfig.id === OPINIONS_DISCUSSIONS_SCENARIO_ID
                            ? hydrateOpinionsDiscussionsLearnerSituationSummary(runtimeConfig)
                            : runtimeConfig
  const descriptionForUi =
    rc.id === SUPERMARKET_SHOP_SCENARIO_ID ||
    rc.id === BOOKING_RESERVATIONS_SCENARIO_ID ||
    rc.id === STORE_SERVICE_ISSUE_SCENARIO_ID ||
    rc.id === WORK_COLLEAGUE_INTERACTION_SCENARIO_ID ||
    rc.id === HOUSING_LANDLORD_SCENARIO_ID ||
    rc.id === DOCTOR_PHARMACY_SCENARIO_ID ||
    rc.id === DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID ||
    rc.id === PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID ||
    rc.id === PHONE_CALL_SCENARIO_ID ||
    rc.id === SMALL_TALK_SCENARIO_ID ||
    rc.id === MEETING_NEW_PEOPLE_SCENARIO_ID ||
    rc.id === PARTY_SOCIAL_SCENARIO_ID ||
    rc.id === EXPLAINING_SOMETHING_SCENARIO_ID ||
    rc.id === STORYTELLING_SCENARIO_ID ||
    rc.id === OPINIONS_DISCUSSIONS_SCENARIO_ID
      ? (rc.learnerSituationSummary?.trim() || rc.context).trim()
      : rc.context
  return {
    ...scenario,
    title: rc.title ?? scenario.title,
    description: descriptionForUi,
    goals: rc.goals.map((goal) => goal.label),
    starterSuggestions: rc.hints ?? scenario.starterSuggestions,
    difficultyBand: rc.level,
    openingMessage:
      rc.id === DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID && rc.directionsLearnerSpeaksFirst === true
        ? null
        : rc.id === PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID && rc.publicTransportLearnerSpeaksFirst === true
          ? null
          : rc.openingLine ?? scenario.openingMessage,
    userRole:
      rc.id === DOCTOR_PHARMACY_SCENARIO_ID
        ? 'Patiënt'
        : rc.id === ORDERING_FOOD_SCENARIO_ID ||
            rc.id === SUPERMARKET_SHOP_SCENARIO_ID ||
            rc.id === BOOKING_RESERVATIONS_SCENARIO_ID ||
            rc.id === STORE_SERVICE_ISSUE_SCENARIO_ID
          ? 'Klant'
          : rc.id === WORK_COLLEAGUE_INTERACTION_SCENARIO_ID
            ? 'Collega'
            : rc.id === HOUSING_LANDLORD_SCENARIO_ID
              ? 'Huurder'
              : rc.id === PHONE_CALL_SCENARIO_ID
                ? 'Beller'
                : rc.id === SMALL_TALK_SCENARIO_ID ||
                    rc.id === MEETING_NEW_PEOPLE_SCENARIO_ID ||
                    rc.id === PARTY_SOCIAL_SCENARIO_ID ||
                    rc.id === EXPLAINING_SOMETHING_SCENARIO_ID ||
                    rc.id === STORYTELLING_SCENARIO_ID ||
                    rc.id === OPINIONS_DISCUSSIONS_SCENARIO_ID
                  ? 'Jezelf'
                  : scenario.userRole,
    runtimeConfig: rc,
  }
}

/**
 * Models sometimes prefix an English café line before Dutch; learner-facing text must stay Dutch-only.
 */
export function stripLeadingEnglishClauseFromOrderingFoodAssistantLine(text: string): string {
  let t = text.trim()
  if (!t) return t
  /** Exact café-English prefixes the model often adds before Dutch. */
  t = t.replace(/^(Hi|Hello|Hey)[,!\s]+what\s+can\s+i\s+get\s+you\?\s*/i, '')
  t = t.replace(/^(Hi|Hello|Hey)[,!\s]+how\s+can\s+i\s+help\??\s*/i, '')
  t = t.trim()
  if (!t) return t
  if (/\bwhat\s+can\s+i\s+get\s+you\b/i.test(t) || /\bhow\s+can\s+i\s+help\b/i.test(t) || /\bcan\s+i\s+get\s+you\b/i.test(t)) {
    const hit = /\b(Hallo|Hoi|Goedemiddag|Goedenavond|Goedendag|Dag|Welkom|Wat\s+mag|Mag\s+ik|Wat\s+wilt|Zegt\s+u|Dat)\b/i.exec(t)
    if (hit && hit.index != null && hit.index > 0) return t.slice(hit.index).trim()
  }
  const anchor = /\b(Hallo|Hoi|Goedemiddag|Goedenavond|Goedendag|Dag|Welkom|Mag\s+ik|Wat\s+mag|Wat\s+wilt|Zegt\s+u)\b/i.exec(t)
  if (!anchor || anchor.index === undefined || anchor.index === 0) return t
  const prefix = t.slice(0, anchor.index).trim()
  if (!prefix) return t
  const englishy =
    /^(Hi|Hello|Hey|Good\s+(morning|afternoon|evening)),?\b/i.test(prefix) ||
    /\b(sure|okay|ok|yes|thanks|thank\s+you)\b/i.test(prefix.toLowerCase())
  if (englishy) return t.slice(anchor.index).trim()
  return t
}

/** API read path: fix assistant lines already stored with English prefixes (older sessions / hosts). */
export function sanitizeOrderingFoodAssistantMessages(messages: ConversationMessage[]): ConversationMessage[] {
  return messages.map((m) => {
    if (m.sender !== 'assistant') return m
    const prev = (m.content ?? '').trim()
    const next = stripLeadingEnglishClauseFromOrderingFoodAssistantLine(prev)
    return next === prev ? m : { ...m, content: next }
  })
}

/** DB may still have English display name until migrations run — normalize for API + UI. */
export function dutchPersonaForOrderingFoodIfNeeded(scenarioSlug: string, persona: PersonaConfig): PersonaConfig {
  if (scenarioSlug !== ORDERING_FOOD_SCENARIO_ID) return persona
  if (persona.slug !== 'food_service_staff') return persona
  if (!/food\s+service\s+staff/i.test(persona.displayName?.trim() ?? '')) return persona
  return { ...persona, displayName: 'Medewerker bediening' }
}

export function parseOrderingFoodScenarioRuntimeConfig(raw: unknown): ScenarioRuntimeConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const candidate = raw as Partial<ScenarioRuntimeConfig>
  if (candidate.id !== ORDERING_FOOD_SCENARIO_ID) return null
  if (
    typeof candidate.title !== 'string' ||
    typeof candidate.category !== 'string' ||
    typeof candidate.level !== 'string' ||
    typeof candidate.subType !== 'string' ||
    typeof candidate.variation !== 'string' ||
    typeof candidate.context !== 'string'
  ) {
    return null
  }
  return candidate as ScenarioRuntimeConfig
}
