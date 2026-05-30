import type {
  PersonaConfig,
  ScenarioConfig,
  ScenarioRuntimeConfig,
  ScenarioSelectionOverrides,
} from '../../models/contracts'

import { getWorkColleagueInteractionStarterHintsForRuntime } from './workColleagueInteractionLearnerStarters'
import {
  buildWorkColleagueInteractionEvaluationContract,
  buildWorkColleagueInteractionRuntimeGoals,
} from './workColleagueInteractionEvaluationContract'
import {
  buildWorkColleagueInteractionAssistantBehavior,
  buildWorkColleagueInteractionRuntimeContext,
  workColleagueInteractionDifficultyAdjustments,
} from './workColleagueInteractionPrompts'
import { pickOne } from './bookingReservationsVocabularyPools'
import { WORK_COLLEAGUE_TASK_TOPIC_POOL } from './workColleagueInteractionVocabularyPools'

export const WORK_COLLEAGUE_INTERACTION_SCENARIO_ID = 'work_colleague_interaction' as const
export const WORK_COLLEAGUE_INTERACTION_TITLE = 'Werk / collega-interactie' as const
export const WORK_COLLEAGUE_INTERACTION_CATEGORY = 'Werk' as const

export const WORK_COLLEAGUE_SUBTYPES = ['colleague_chat', 'team_task', 'manager_or_lead_request'] as const

export const WORK_COLLEAGUE_VARIATIONS = [
  'simple_workplace_conversation',
  'asking_for_help',
  'clarifying_tasks',
] as const

export type WorkColleagueInteractionLevel = 'A1' | 'A2' | 'B1'
export type WorkColleagueInteractionSubtype = (typeof WORK_COLLEAGUE_SUBTYPES)[number]
export type WorkColleagueInteractionVariation = (typeof WORK_COLLEAGUE_VARIATIONS)[number]

/** Randomized “task artifact” + optional launcher bias via `detailFocus`. */
export type WorkColleagueTaskFocus =
  | 'document'
  | 'email'
  | 'presentation'
  | 'meeting_note'
  | 'task_ticket'
  | 'report'
  | 'planning'
  | 'spreadsheet'
  | 'file_folder'
  | 'approval_request'

type BuildParams = {
  level: WorkColleagueInteractionLevel
  subType?: WorkColleagueInteractionSubtype
  variation?: WorkColleagueInteractionVariation | string
  detailFocus?: WorkColleagueTaskFocus | string
  random?: () => number
}

const SUBTYPE_LABEL_NL: Record<WorkColleagueInteractionSubtype, string> = {
  colleague_chat: 'collega — informeel professioneel',
  team_task: 'team — taak en volgende stap',
  manager_or_lead_request: 'leidinggevende — korte afstemming',
}

const PERSONA_BY_SUBTYPE: Record<
  WorkColleagueInteractionSubtype,
  { role: string; displayName: string; openingLine: string }
> = {
  colleague_chat: {
    role: 'Collega',
    displayName: 'Collega',
    openingLine: 'Hoi — dag. Heb je even? Ik wilde kort checken hoe het loopt.',
  },
  team_task: {
    role: 'Teamgenoot',
    displayName: 'Collega',
    openingLine: 'Hé — hallo. Zullen we even afstemmen waar we staan?',
  },
  manager_or_lead_request: {
    role: 'Leidinggevende',
    displayName: 'Leidinggevende',
    openingLine: 'Dag — goedemiddag. Heb je even voor een korte voortgangscheck?',
  },
}

const TASK_FOCUS_POOL: readonly WorkColleagueTaskFocus[] = WORK_COLLEAGUE_TASK_TOPIC_POOL

const WORKPLACE_SITUATION_KEYS = [
  'in_office',
  'before_meeting',
  'after_new_task',
  'checking_progress',
  'where_stored',
  'what_next',
] as const

type WorkplaceSituationKey = (typeof WORKPLACE_SITUATION_KEYS)[number]

function taskLineNl(focus: WorkColleagueTaskFocus): string {
  const m: Record<WorkColleagueTaskFocus, string> = {
    document: 'Het gaat om een document dat je moet afstemmen of afmaken.',
    email: 'Het gaat om een e-mail of mailtje dat je moet sturen of beantwoorden.',
    presentation: 'Het gaat om een presentatie of slides die klaar moeten.',
    meeting_note: 'Het gaat om notities of actiepunten na een vergadering.',
    task_ticket: 'Het gaat om een taak of ticket in jullie systeem.',
    report: 'Het gaat om een rapport of samenvatting.',
    planning: 'Het gaat om planning of een kleine roadmap.',
    spreadsheet: 'Het gaat om een spreadsheet of cijferoverzicht.',
    file_folder: 'Het gaat om een bestand of map op de drive.',
    approval_request: 'Het gaat om een goedkeuring of akkoord dat nodig is.',
  }
  return m[focus]
}

function situationLineNl(key: WorkplaceSituationKey): string {
  const m: Record<WorkplaceSituationKey, string> = {
    in_office: 'Je bent op kantoor en spreekt elkaar even tussendoor.',
    before_meeting: 'Je spreekt elkaar vlak voor een vergadering.',
    after_new_task: 'Je hebt net een nieuwe taak gekregen en stemt kort af.',
    checking_progress: 'Je checkt kort waar iemand staat met een stuk werk.',
    where_stored: 'Je vraagt waar iets staat of hoe je het terugvindt.',
    what_next: 'Je wilt weten wat de volgende stap is.',
  }
  return m[key]
}

function clampRoll(rng: () => number): number {
  const n = Number(rng())
  if (!Number.isFinite(n)) return Math.random()
  if (n <= 0) return 0
  if (n >= 1) return 0.999_999
  return n
}

export function normalizeWorkColleagueSubtype(raw: string | undefined): WorkColleagueInteractionSubtype | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'colleague' || v === 'chat' || v === 'colleague_chat') return 'colleague_chat'
  if (v === 'team' || v === 'team_task' || v === 'task') return 'team_task'
  if (v === 'manager' || v === 'lead' || v === 'manager_or_lead' || v === 'manager_or_lead_request') {
    return 'manager_or_lead_request'
  }
  return (WORK_COLLEAGUE_SUBTYPES as readonly string[]).includes(v) ? (v as WorkColleagueInteractionSubtype) : undefined
}

export function normalizeWorkColleagueVariation(
  raw: string | undefined
): WorkColleagueInteractionVariation | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'simple' || v === 'chat' || v === 'simple_workplace' || v === 'simple_workplace_conversation') {
    return 'simple_workplace_conversation'
  }
  if (v === 'help' || v === 'asking' || v === 'asking_for_help') return 'asking_for_help'
  if (v === 'clarify' || v === 'task' || v === 'clarifying' || v === 'clarifying_tasks') return 'clarifying_tasks'
  return (WORK_COLLEAGUE_VARIATIONS as readonly string[]).includes(v) ? (v as WorkColleagueInteractionVariation) : undefined
}

export function normalizeWorkColleagueTaskFocus(raw: string | undefined): WorkColleagueTaskFocus | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  const aliases: Record<string, WorkColleagueTaskFocus> = {
    doc: 'document',
    document: 'document',
    mail: 'email',
    email: 'email',
    e_mail: 'email',
    slides: 'presentation',
    presentation: 'presentation',
    meeting: 'meeting_note',
    meeting_notes: 'meeting_note',
    meeting_note: 'meeting_note',
    notes: 'meeting_note',
    ticket: 'task_ticket',
    task: 'task_ticket',
    task_ticket: 'task_ticket',
    report: 'report',
    planning: 'planning',
    plan: 'planning',
    spreadsheet: 'spreadsheet',
    sheet: 'spreadsheet',
    file: 'file_folder',
    folder: 'file_folder',
    file_folder: 'file_folder',
    drive: 'file_folder',
    approval: 'approval_request',
    approval_request: 'approval_request',
    deadline: 'planning',
  }
  const mapped = aliases[v]
  if (mapped) return mapped
  return (WORK_COLLEAGUE_TASK_TOPIC_POOL as readonly string[]).includes(v) ? (v as WorkColleagueTaskFocus) : undefined
}

function rollTaskFocus(requested: WorkColleagueTaskFocus | undefined, rng: () => number): WorkColleagueTaskFocus {
  if (requested && (TASK_FOCUS_POOL as readonly string[]).includes(requested)) return requested
  return pickOne([...TASK_FOCUS_POOL], rng)
}

function rollWorkplaceSituation(rng: () => number): WorkplaceSituationKey {
  return pickOne([...WORKPLACE_SITUATION_KEYS], rng)
}

function buildLearnerSituationSummary(params: {
  subType: WorkColleagueInteractionSubtype
  variation: WorkColleagueInteractionVariation
  taskLine: string
  situationLine: string
}): string {
  const role =
    params.variation === 'simple_workplace_conversation'
      ? 'Je hebt een korte, professionele werkinteractie: status of kleine afstemming.'
      : params.variation === 'asking_for_help'
        ? 'Je vraagt om hulp bij iets werkgerelateers en legt kort uit wat je nodig hebt.'
        : 'Je verduidelijkt een taak: wat precies, wanneer, en wat de volgende stap is.'
  return `${role} Setting: ${SUBTYPE_LABEL_NL[params.subType]}. ${params.taskLine} ${params.situationLine}`.replace(
    /\s+/g,
    ' '
  ).trim()
}

function pickFrictionLine(
  level: WorkColleagueInteractionLevel,
  subType: WorkColleagueInteractionSubtype,
  rng: () => number
): string {
  const pool =
    subType === 'colleague_chat'
      ? [
          'vraag kort welk document ze bedoelen (één vraag)',
          'vraag kort of ze het vandaag nog nodig hebben',
          'zeg iets licht vaags (“dat stuk van gisteren”) zodat de oefenaar mag verduidelijken',
        ]
      : subType === 'team_task'
        ? [
            'vraag kort wie dit normaal oppakt',
            'vraag kort of ze al iets hebben staan in de map',
            'noem een deadline en laat de oefenaar bevestigen',
          ]
        : [
            'vraag kort naar prioriteit (wat eerst)',
            'vraag kort of ze al begonnen zijn',
            'vraag wanneer ze jouw input nodig hebben — één vraag',
          ]
  if (level === 'A1') return pickOne([pool[0]!, 'één korte verduidelijking alleen over tijd óf alleen over bestand.'], rng)
  return pickOne(pool, rng)
}

function collectOpeningVariants(subType: WorkColleagueInteractionSubtype): string[] {
  // Eerste beurt: collegiale begroeting + korte check-in (geen horeca-/balieformules als “van dienst zijn”).
  if (subType === 'colleague_chat') {
    return [
      'Hoi — dag. Heb je even? Ik wilde kort checken hoe het loopt.',
      'Dag — even tussendoor. Waar sta je ongeveer met jouw stuk?',
      'Hoi — heb je een minuutje? Ik moest even horen waar je mee bezig bent.',
      'Hé — hoe gaat het? Zitten we nog een beetje op schema voor vandaag?',
    ]
  }
  if (subType === 'team_task') {
    return [
      'Hé — hallo. Zullen we even afstemmen waar we staan?',
      'Hallo — dag. Waar sta je ongeveer met dit stuk?',
      'Dag — even tussendoor. Heb je even voor een snelle sync?',
      'Hoi — heb je een moment? Ik moest even checken hoe ver je bent.',
    ]
  }
  return [
    'Dag — goedemiddag. Kunnen we even kort de voortgang doornemen?',
    'Goedemiddag — heb je even? Ik wilde checken waar je staat met je taken.',
    'Hallo — even kort. Hoe ziet jouw planning er vandaag uit?',
    'Hallo — goed je te zien. Waar loop je tegenaan met dit stuk?',
  ]
}

function buildOpeningLine(subType: WorkColleagueInteractionSubtype, level: WorkColleagueInteractionLevel, rng: () => number): string {
  const variants = collectOpeningVariants(subType)
  if (level === 'A1') {
    const a1 = variants.slice(0, 3)
    return pickOne(a1.length ? a1 : variants, rng)
  }
  return pickOne(variants, rng)
}

function coreSkillsFor(variation: WorkColleagueInteractionVariation): string[] {
  if (variation === 'simple_workplace_conversation') {
    return ['short_professional_chat', 'status_language', 'workplace_register', 'light_follow_up']
  }
  if (variation === 'asking_for_help') {
    return ['help_seeking', 'polite_request', 'workplace_humility', 'clarity_not_abrupt']
  }
  return ['clarification', 'sequencing', 'deadline_priority_language', 'confirm_expectations']
}

function parseTaskAndSituationFromContext(context: string): { task: string | null; situation: string | null } {
  const m = /Kern van deze run:\s*(.+?)\s*Situatie:\s*(.+?)(?:\.|$)/i.exec(context.replace(/\s+/g, ' ').trim())
  if (!m) return { task: null, situation: null }
  return { task: m[1]?.trim() ?? null, situation: m[2]?.trim() ?? null }
}

function inferTaskFocusFromContext(context: string, rng: () => number): WorkColleagueTaskFocus {
  const t = context.toLowerCase()
  if (/\b(e-mail|email|mailtje)\b/i.test(t)) return 'email'
  if (/\b(presentatie|slides)\b/i.test(t)) return 'presentation'
  if (/\bvergader|notul|meeting\b/i.test(t)) return 'meeting_note'
  if (/\b(ticket|jira|asana)\b/i.test(t)) return 'task_ticket'
  if (/\b(rapport|verslag)\b/i.test(t)) return 'report'
  if (/\b(planning|roadmap)\b/i.test(t)) return 'planning'
  if (/\b(spreadsheet|excel|sheet)\b/i.test(t)) return 'spreadsheet'
  if (/\b(map|drive|bestand)\b/i.test(t)) return 'file_folder'
  if (/\b(goedkeuring|akkoord)\b/i.test(t)) return 'approval_request'
  if (/\bdocument\b/i.test(t)) return 'document'
  return pickOne([...TASK_FOCUS_POOL], rng)
}

export function hydrateWorkColleagueInteractionLearnerSituationSummary(
  runtime: ScenarioRuntimeConfig
): ScenarioRuntimeConfig {
  const normalizedId = runtime.id?.trim().toLowerCase().replace(/-/g, '_')
  if (normalizedId !== WORK_COLLEAGUE_INTERACTION_SCENARIO_ID) return runtime
  if (runtime.learnerSituationSummary?.trim()) return runtime
  const subType = normalizeWorkColleagueSubtype(runtime.subType) ?? 'colleague_chat'
  const variation = normalizeWorkColleagueVariation(runtime.variation) ?? 'simple_workplace_conversation'
  const parsed = parseTaskAndSituationFromContext(runtime.context ?? '')
  const taskLine = parsed.task ?? taskLineNl(inferTaskFocusFromContext(runtime.context ?? '', Math.random))
  const situationLine = parsed.situation ?? situationLineNl('in_office')
  return {
    ...runtime,
    learnerSituationSummary: buildLearnerSituationSummary({ subType, variation, taskLine, situationLine }),
  }
}

export function buildWorkColleagueInteractionScenario(config: BuildParams): ScenarioRuntimeConfig {
  const rng = config.random ?? Math.random
  const subType = normalizeWorkColleagueSubtype(config.subType) ?? pickOne(WORK_COLLEAGUE_SUBTYPES, rng)
  const variation =
    normalizeWorkColleagueVariation(config.variation as string | undefined) ??
    pickOne(WORK_COLLEAGUE_VARIATIONS, rng)
  const taskFocus = rollTaskFocus(normalizeWorkColleagueTaskFocus(config.detailFocus as string | undefined), rng)
  const workplaceSituation = rollWorkplaceSituation(rng)
  const frictionEnabled = clampRoll(rng) < (config.level === 'A1' ? 0.12 : config.level === 'B1' ? 0.22 : 0.18)
  const taskLine = taskLineNl(taskFocus)
  const situationLine = situationLineNl(workplaceSituation)
  const frictionLine = frictionEnabled ? pickFrictionLine(config.level, subType, rng) : 'geen extra wrijving in deze run'
  const goals = buildWorkColleagueInteractionRuntimeGoals(variation)
  const weights = Object.fromEntries(goals.map((g) => [g.id, g.weight]))
  const persona = PERSONA_BY_SUBTYPE[subType]
  const openingVariants = collectOpeningVariants(subType)

  return {
    id: WORK_COLLEAGUE_INTERACTION_SCENARIO_ID,
    scenarioFamily: WORK_COLLEAGUE_INTERACTION_SCENARIO_ID,
    title: WORK_COLLEAGUE_INTERACTION_TITLE,
    category: WORK_COLLEAGUE_INTERACTION_CATEGORY,
    level: config.level,
    subType,
    variation,
    context: buildWorkColleagueInteractionRuntimeContext({
      subType,
      variation,
      level: config.level,
      taskLine,
      situationLine,
      frictionLine,
      frictionEnabled,
      taskFocus,
      vocabularyRng: rng,
    }),
    learnerSituationSummary: buildLearnerSituationSummary({ subType, variation, taskLine, situationLine }),
    goals,
    weights,
    assistantBehavior: buildWorkColleagueInteractionAssistantBehavior({
      subType,
      variation,
      level: config.level,
      frictionEnabled,
      openingVariants,
    }),
    difficultyAdjustments: workColleagueInteractionDifficultyAdjustments(config.level),
    hints: [...getWorkColleagueInteractionStarterHintsForRuntime(config.level, variation, subType)],
    persona: {
      role: persona.role,
      displayName: persona.displayName,
      sceneLabel: SUBTYPE_LABEL_NL[subType],
      subType,
      variation,
      taskFocus,
      workplaceSituation,
      ...(normalizeWorkColleagueTaskFocus(config.detailFocus as string | undefined)
        ? { detailFocus: normalizeWorkColleagueTaskFocus(config.detailFocus as string | undefined) }
        : {}),
      frictionEnabled: frictionEnabled ? 'light friction enabled for this run' : 'direct helpful run',
    },
    coreSkills: coreSkillsFor(variation),
    openingLine: buildOpeningLine(subType, config.level, rng),
    evaluationContract: buildWorkColleagueInteractionEvaluationContract(variation),
  }
}

export function maybeBuildWorkColleagueInteractionSpeakLiveScenarioRuntime(params: {
  scenario: ScenarioConfig
  level: WorkColleagueInteractionLevel
  overrides?: ScenarioSelectionOverrides | null
}): ScenarioRuntimeConfig | null {
  if (params.scenario.slug !== WORK_COLLEAGUE_INTERACTION_SCENARIO_ID) return null
  const variation = normalizeWorkColleagueVariation(params.overrides?.variation as string | undefined)
  const subType = normalizeWorkColleagueSubtype(params.overrides?.subType)
  const detailFocus = normalizeWorkColleagueTaskFocus(params.overrides?.detailFocus as string | undefined)
  return buildWorkColleagueInteractionScenario({
    level: params.level,
    subType: subType ?? undefined,
    variation: variation ?? undefined,
    detailFocus: detailFocus ?? undefined,
  })
}

export function parseWorkColleagueInteractionScenarioRuntimeConfig(raw: unknown): ScenarioRuntimeConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const candidate = raw as Partial<ScenarioRuntimeConfig>
  if (candidate.id !== WORK_COLLEAGUE_INTERACTION_SCENARIO_ID) return null
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
  return hydrateWorkColleagueInteractionLearnerSituationSummary(candidate as ScenarioRuntimeConfig)
}

export function dutchPersonaForWorkColleagueInteractionIfNeeded(
  scenarioSlug: string,
  runtime: ScenarioRuntimeConfig | null | undefined,
  persona: PersonaConfig
): PersonaConfig {
  const slug = scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  if (slug !== WORK_COLLEAGUE_INTERACTION_SCENARIO_ID) return persona
  if (persona.slug !== 'workplace_colleague_staff') return persona
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
