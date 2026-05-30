import type {
  PersonaConfig,
  ScenarioConfig,
  ScenarioRuntimeConfig,
  ScenarioSelectionOverrides,
} from '../../models/contracts'
import { pickOne } from './bookingReservationsVocabularyPools'
import {
  MEETING_NEW_PEOPLE_SCENARIO_ID,
  buildMeetingNewPeopleEvaluationContract,
  buildMeetingNewPeopleRuntimeGoals,
  type MeetingNewPeopleLevel,
  type MeetingNewPeopleSubtype,
  type MeetingNewPeopleVariation,
} from './meetingNewPeopleEvaluationContract'

export type { MeetingNewPeopleLevel, MeetingNewPeopleSubtype, MeetingNewPeopleVariation } from './meetingNewPeopleEvaluationContract'
export { MEETING_NEW_PEOPLE_SCENARIO_ID } from './meetingNewPeopleEvaluationContract'

export const MEETING_NEW_PEOPLE_TITLE = 'Meeting new people' as const
export const MEETING_NEW_PEOPLE_CATEGORY = 'Social' as const

export const MEETING_NEW_PEOPLE_SUBTYPES = ['social_event', 'work_introduction', 'casual_meeting'] as const
export const MEETING_NEW_PEOPLE_VARIATIONS = ['introductions', 'background', 'follow_up_questions'] as const

const SETTING_KEYS = ['party', 'workplace', 'meetup', 'gym_class', 'cafe'] as const
type MnpSetting = (typeof SETTING_KEYS)[number]

const PERSON_TYPE_KEYS = ['local_dutch', 'expat', 'colleague', 'new_acquaintance'] as const
type MnpPersonType = (typeof PERSON_TYPE_KEYS)[number]

const CONTEXT_KEYS = ['just_moved', 'working_nearby', 'visiting', 'attending_event'] as const
type MnpContext = (typeof CONTEXT_KEYS)[number]

const SETTING_NL: Record<MnpSetting, string> = {
  party: 'Sfeer: feestje of netwerkborrel — wat drukker, korte rondjes.',
  workplace: 'Sfeer: op werk — eerste kennismaking bij koffie of voor een meeting.',
  meetup: 'Sfeer: informele meetup of hobbygroep — open en nieuwsgierig.',
  gym_class: 'Sfeer: sportschool of cursus — praktisch en vriendelijk.',
  cafe: 'Sfeer: rustig café — relaxed tempo, korte zinnen.',
}

const PERSON_NL: Record<MnpPersonType, string> = {
  local_dutch: 'Gesprekspartner: iemand die hier langer woont — typisch licht ingetogen NL-toon.',
  expat: 'Gesprekspartner: expat — herken “nieuw hier”-energie, blijf natuurlijk.',
  colleague: 'Gesprekspartner: collega — professioneel maar warm.',
  new_acquaintance: 'Gesprekspartner: iemand die je net ontmoet — nieuwsgierig, niet te privé.',
}

const CONTEXT_NL: Record<MnpContext, string> = {
  just_moved: 'Context: net verhuisd — mag kort ter sprake komen.',
  working_nearby: 'Context: werkt in de buurt — lichte werkpraat mag.',
  visiting: 'Context: op bezoek in de stad — toeristisch-licht, geen script.',
  attending_event: 'Context: komt van een event — haak daar zacht aan.',
}

const VARIATION_FOCUS: Record<MeetingNewPeopleVariation, string> = {
  introductions:
    'Variatie A — introductions: naam, korte voorstelling, simpele vragen (“Hoe heet je?”, “Waar kom je vandaan?”). Geen sollicitatie.',
  background:
    'Variatie B — background: woonplaats, werk, net verhuisd — korte identiteitszinnen, present tense.',
  follow_up_questions:
    'Variatie C — follow_up_questions: echte nieuwsgierigheid (“Hoe lang woon je hier?”, “Wat doe je precies?”), natuurlijke reacties.',
}

/** Seed openings must match Speak Live portrait + TTS gender (see `buildSpeakLiveSessionMedia`). */
type MeetingNewPeopleOpeningGender = 'female' | 'male'

const SUBTYPE_OPENING_BY_GENDER: Record<MeetingNewPeopleSubtype, Record<MeetingNewPeopleOpeningGender, string[]>> = {
  social_event: {
    female: [
      'Hoi, ik ben Noor — we hebben elkaar denk ik nog niet gesproken. Ik ben hier ook voor het event. Hoe heet jij?',
      'Hé, ik ben Emma — leuk dat je er bent. Ik ben even in de buurt van de borrel. Hoe heet je?',
    ],
    male: [
      'Hoi, ik ben Thijs — we hebben elkaar denk ik nog niet gesproken. Ik ben hier ook voor het event. Hoe heet jij?',
      'Hé, ik ben Lars — leuk dat je er bent. Ik ben even in de buurt van de borrel. Hoe heet je?',
    ],
  },
  work_introduction: {
    female: [
      'Hoi, ik ben Fatima — we hebben elkaar op de mail gezet, maar nog niet live gesproken. Hoe is je start hier?',
      'Dag, ik ben Sophie — fijn je te ontmoeten. Waar werk je meestal, hier op de vloer of vaker thuis?',
    ],
    male: [
      'Hoi, ik ben Tom — we hebben elkaar op de mail gezet, maar nog niet live gesproken. Hoe is je start hier?',
      'Dag, ik ben Mark — fijn je te ontmoeten. Waar werk je meestal, hier op de vloer of vaker thuis?',
    ],
  },
  casual_meeting: {
    female: [
      'Hoi, ik ben Sam — ik zag dat we dezelfde meetup hadden. Ben je vaker hier?',
      'Hé, ik ben Eva — rustig hè? Ik zat hier ook. Waar kom je vandaan?',
    ],
    male: [
      'Hoi, ik ben Sam — ik zag dat we dezelfde meetup hadden. Ben je vaker hier?',
      'Hé, ik ben Milan — rustig hè? Ik zat hier ook. Waar kom je vandaan?',
    ],
  },
}

function clampRoll(rng: () => number): number {
  const n = Number(rng())
  if (!Number.isFinite(n)) return Math.random()
  if (n <= 0) return 0
  if (n >= 1) return 0.999_999
  return n
}

export function normalizeMeetingNewPeopleSubtype(raw: string | undefined): MeetingNewPeopleSubtype | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'party' || v === 'event' || v === 'social' || v === 'social_event') return 'social_event'
  if (v === 'work' || v === 'office' || v === 'work_introduction' || v === 'colleague_intro') return 'work_introduction'
  if (v === 'casual' || v === 'meet' || v === 'casual_meeting') return 'casual_meeting'
  return (MEETING_NEW_PEOPLE_SUBTYPES as readonly string[]).includes(v) ? (v as MeetingNewPeopleSubtype) : undefined
}

export function normalizeMeetingNewPeopleVariation(raw: string | undefined): MeetingNewPeopleVariation | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'intro' || v === 'introduction' || v === 'introductions' || v === 'a') return 'introductions'
  if (v === 'background' || v === 'bg' || v === 'b') return 'background'
  if (v === 'follow_up' || v === 'followup' || v === 'follow_up_questions' || v === 'c') return 'follow_up_questions'
  return (MEETING_NEW_PEOPLE_VARIATIONS as readonly string[]).includes(v) ? (v as MeetingNewPeopleVariation) : undefined
}

function levelBlock(level: MeetingNewPeopleLevel): string {
  if (level === 'A1') {
    return 'Niveau A1: heel korte zinnen; naam + 1 feit; max één vraag per beurt; 6–8 wisselingen in gedachten.'
  }
  if (level === 'B1') {
    return 'Niveau B1: vlottere kennismaking; meerdere vervolgvragen oké; lichte topic-shifts; 8–10 wisselingen max.'
  }
  return 'Niveau A2: natuurlijke intro + korte achtergrond; 1–2 vervolgvragen; ongeveer 7–9 wisselingen.'
}

function buildContext(params: {
  subType: MeetingNewPeopleSubtype
  variation: MeetingNewPeopleVariation
  level: MeetingNewPeopleLevel
  setting: MnpSetting
  personType: MnpPersonType
  contextHint: MnpContext
}): string {
  return [
    'SPEAK LIVE — NIEUWE MENSEN ONTMOETEN (tussen small talk en transactioneel):',
    VARIATION_FOCUS[params.variation],
    SETTING_NL[params.setting],
    PERSON_NL[params.personType],
    CONTEXT_NL[params.contextHint],
    levelBlock(params.level),
    'Je bent geen docent: geen grammaticauitleg, geen vocabulaire-lijsten. Nederlands naar de oefenaar.',
    'Doel: realistische eerste kennismaking — identiteit uitwisselen, kort achtergrond, doorvragen.',
    'Assistent-model: in je eerste (of vroege) beurt stel je jezelf kort voor met je voornaam — zoals een echte kennismaking — vóór je diep doorvraagt over route of achtergrond.',
  ].join(' ')
}

function assistantBehavior(level: MeetingNewPeopleLevel): ScenarioRuntimeConfig['assistantBehavior'] {
  return {
    pace: level === 'A1' ? 'Rustig, duidelijke bundels.' : level === 'B1' ? 'Vlot sociaal tempo.' : 'Normaal sociaal tempo.',
    register: 'Informeel maar netjes — eerste kennismaking in Nederland.',
    tone: 'Vriendelijk, licht ingetogen (NL-realistisch); niet overdreven enthousiast.',
    responseStyle: [
      'Open met je voornaam wanneer je iemand net ontmoet (tenzij Mem+recent je naam al noemde)',
      'Als de oefenaar jou iets vraagt: eerst kort en natuurlijk antwoorden in de rol — niet overslaan om meteen weer te interviewen',
      'Stel soms een vervolgvraag — niet elke beurt; max één gerichte vraag tegelijk',
      'Reageer met korte tussenstukjes (“oh leuk”, “ah nice”)',
      'Laat ruimte voor de ander — geen monoloog',
    ],
    frictionStyle: ['Soms iets kort of neutraal', 'Mini-pauze mag', 'Geen harde correcties'],
    openingVariants: [],
    recommendationStyle: 'Geen lesplannen; max één zachte alternatieve formulering als het past.',
    frictionChance: level === 'B1' ? 'medium' : 'light',
    guardrails: ['Geen docent-gedrag', 'Geen privé-medische details', 'Blijf PG en respectvol'],
  }
}

function difficulty(level: MeetingNewPeopleLevel): ScenarioRuntimeConfig['difficultyAdjustments'] {
  if (level === 'A1') {
    return {
      learnerLevel: 'A1',
      responsePacing: 'slow_social',
      vocabularyRange: 'minimal',
      followUpStyle: 'single_simple_followup',
      misunderstandingLevel: 'single_light',
    }
  }
  if (level === 'B1') {
    return {
      learnerLevel: 'B1',
      responsePacing: 'natural_social',
      vocabularyRange: 'wider',
      followUpStyle: 'varied_followups',
      misunderstandingLevel: 'light_realism',
    }
  }
  return {
    learnerLevel: 'A2',
    responsePacing: 'normal_social',
    vocabularyRange: 'simple_variation',
    followUpStyle: 'brief_checks',
    misunderstandingLevel: 'one_possible',
  }
}

function starterHints(level: MeetingNewPeopleLevel, variation: MeetingNewPeopleVariation): string[] {
  const intro = ['Hoi, ik ben …', 'Leuk je te ontmoeten.', 'Hoe heet je?', 'Waar kom je vandaan?']
  const bg = ['Ik woon in …', 'Ik werk in …', 'Ik kom uit …', 'Ik ben net verhuisd.']
  const fu = ['Hoe lang woon je hier al?', 'Wat doe je precies?', 'Werk je hier in de buurt?', 'Hoe bevalt het hier?']
  if (variation === 'introductions') return [...intro, 'Mag ik me even voorstellen?']
  if (variation === 'background') return [...bg, ...intro.slice(0, 2)]
  if (variation === 'follow_up_questions') return [...fu, ...intro.slice(0, 2)]
  return level === 'A1' ? intro.slice(0, 4) : [...intro, ...bg.slice(0, 2)]
}

export function buildMeetingNewPeopleScenario(config: {
  level: MeetingNewPeopleLevel
  subType?: MeetingNewPeopleSubtype
  variation?: MeetingNewPeopleVariation
  /** When omitted, defaults to `female` (same default as `inferSpeakLiveAssistantPresentation`). */
  assistantPresentation?: MeetingNewPeopleOpeningGender
  random?: () => number
}): ScenarioRuntimeConfig {
  const rng = config.random ?? Math.random
  const subType = config.subType ?? pickOne([...MEETING_NEW_PEOPLE_SUBTYPES], rng)
  const variation = config.variation ?? pickOne([...MEETING_NEW_PEOPLE_VARIATIONS], rng)
  const setting = pickOne([...SETTING_KEYS], rng)
  const personType = pickOne([...PERSON_TYPE_KEYS], rng)
  const contextHint = pickOne([...CONTEXT_KEYS], rng)
  const goals = buildMeetingNewPeopleRuntimeGoals()
  const openingGender: MeetingNewPeopleOpeningGender = config.assistantPresentation === 'male' ? 'male' : 'female'
  const openingPool = SUBTYPE_OPENING_BY_GENDER[subType][openingGender]
  const openingLine = openingPool[Math.floor(clampRoll(rng) * openingPool.length)]!

  return {
    id: MEETING_NEW_PEOPLE_SCENARIO_ID,
    scenarioFamily: MEETING_NEW_PEOPLE_SCENARIO_ID,
    title: MEETING_NEW_PEOPLE_TITLE,
    category: MEETING_NEW_PEOPLE_CATEGORY,
    level: config.level,
    subType,
    variation,
    context: buildContext({ subType, variation, level: config.level, setting, personType, contextHint }),
    learnerSituationSummary: `Iemand nieuw ontmoeten — ${SETTING_NL[setting].replace(/^Sfeer:\s*/, '')}`.replace(/\s+/g, ' ').trim(),
    goals,
    weights: Object.fromEntries(goals.map((g) => [g.id, g.weight])),
    assistantBehavior: assistantBehavior(config.level),
    difficultyAdjustments: difficulty(config.level),
    hints: starterHints(config.level, variation),
    persona: {
      role: 'Nieuwe kennis',
      displayName: 'Iemand die je net ontmoet',
      sceneLabel: 'meeting_new_people',
      subType,
      variation,
      setting,
      personType,
      contextHint,
    },
    coreSkills: ['Intro', 'Identiteit', 'Vervolgvraag', 'Balans', 'Natuurlijke flow'],
    openingLine,
    evaluationContract: buildMeetingNewPeopleEvaluationContract({ level: config.level, subType, variation }),
  }
}

export function maybeBuildMeetingNewPeopleSpeakLiveScenarioRuntime(params: {
  scenario: ScenarioConfig
  level: MeetingNewPeopleLevel
  overrides?: ScenarioSelectionOverrides | null
  assistantPresentation?: MeetingNewPeopleOpeningGender
}): ScenarioRuntimeConfig | null {
  if (params.scenario.slug !== MEETING_NEW_PEOPLE_SCENARIO_ID) return null
  const subType = normalizeMeetingNewPeopleSubtype(params.overrides?.subType as string | undefined)
  const variation = normalizeMeetingNewPeopleVariation(params.overrides?.variation as string | undefined)
  return buildMeetingNewPeopleScenario({
    level: params.level,
    subType: subType ?? undefined,
    variation: variation ?? undefined,
    assistantPresentation: params.assistantPresentation,
  })
}

export function parseMeetingNewPeopleScenarioRuntimeConfig(raw: unknown): ScenarioRuntimeConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const candidate = raw as Partial<ScenarioRuntimeConfig>
  if (candidate.id !== MEETING_NEW_PEOPLE_SCENARIO_ID) return null
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

export function hydrateMeetingNewPeopleLearnerSituationSummary(runtime: ScenarioRuntimeConfig): ScenarioRuntimeConfig {
  if (runtime.id?.trim().toLowerCase().replace(/-/g, '_') !== MEETING_NEW_PEOPLE_SCENARIO_ID) return runtime
  if (runtime.learnerSituationSummary?.trim()) return runtime
  return {
    ...runtime,
    learnerSituationSummary:
      'Je oefent een eerste kennismaking in het Nederlands — voorstellen, kort over jezelf, en natuurlijk doorvragen.',
  }
}

export function dutchPersonaForMeetingNewPeopleIfNeeded(
  scenarioSlug: string,
  runtime: ScenarioRuntimeConfig | null | undefined,
  persona: PersonaConfig,
): PersonaConfig {
  const slug = scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  if (slug !== MEETING_NEW_PEOPLE_SCENARIO_ID) return persona
  if (persona.slug !== 'meeting_new_people_partner') return persona
  const rp = runtime?.persona
  const display =
    rp && typeof rp === 'object' && typeof (rp as { displayName?: string }).displayName === 'string'
      ? (rp as { displayName: string }).displayName.trim() || persona.displayName
      : persona.displayName
  const role =
    rp && typeof rp === 'object' && typeof (rp as { role?: string }).role === 'string'
      ? (rp as { role: string }).role.trim() || persona.role
      : persona.role
  return { ...persona, displayName: display, role }
}
