import type {
  ScenarioEvaluationContract,
  ScenarioRuntimeConfig,
  ScenarioRuntimeGoal,
} from '../../models/contracts'
import type { HousingLandlordVariation } from './housingLandlordScenario'

/** Canonical goal ids (stable for recap / coaching / LLM contract). */
export const HOUSING_LANDLORD_GOAL_IDS = {
  reporting_issue: {
    stateIssueClearly: 'state_housing_issue_clearly',
    homeOrRepairVocabulary: 'use_relevant_home_or_repair_vocabulary',
    askForHelpOrAction: 'ask_for_help_or_action',
    confirmNextStepOrTiming: 'confirm_next_step_or_timing',
  },
  asking_rent_contract: {
    askRentOrContractQuestionClearly: 'ask_rent_or_contract_question_clearly',
    keepHousingContextSpecific: 'keep_housing_context_specific',
    clarifyOrConfirmAnswer: 'clarify_or_confirm_answer',
    naturalPracticalTone: 'natural_practical_tone',
  },
} as const

const RUBRICS: Record<HousingLandlordVariation, Record<string, { pass: string; partial: string; fail: string }>> = {
  reporting_issue: {
    state_housing_issue_clearly: {
      pass: 'Issue clearly stated (what is wrong in the home).',
      partial: 'Problem implied but weak.',
      fail: 'No usable issue statement.',
    },
    use_relevant_home_or_repair_vocabulary: {
      pass: 'Understandable home/problem vocabulary is clear.',
      partial: 'Vague wording.',
      fail: 'No useful issue vocabulary.',
    },
    ask_for_help_or_action: {
      pass: 'Help or action request is clear (e.g. send someone, what to do).',
      partial: 'General concern only.',
      fail: 'No next-step ask.',
    },
    confirm_next_step_or_timing: {
      pass: 'Natural next-step handling (timing, “dus morgen?”, short thanks that closes the move).',
      partial: 'Weak acknowledgment.',
      fail: 'No useful confirmation.',
    },
  },
  asking_rent_contract: {
    ask_rent_or_contract_question_clearly: {
      pass: 'Question clearly asked (rent, contract, notice, deposit, payment).',
      partial: 'Topic present but question weak.',
      fail: 'No usable question.',
    },
    keep_housing_context_specific: {
      pass: 'Clear whether they mean rent, deposit, contract, utilities, etc.',
      partial: 'General housing question only.',
      fail: 'No clear context.',
    },
    clarify_or_confirm_answer: {
      pass: 'Useful clarification or confirmation of the answer.',
      partial: 'Weak acknowledgment.',
      fail: 'No useful follow-up.',
    },
    natural_practical_tone: {
      pass: 'Appropriate practical tone.',
      partial: 'Stiff but usable.',
      fail: 'Abrupt or odd.',
    },
  },
}

export function buildHousingLandlordRuntimeGoals(variation: HousingLandlordVariation): ScenarioRuntimeGoal[] {
  if (variation === 'reporting_issue') {
    const g = HOUSING_LANDLORD_GOAL_IDS.reporting_issue
    return [
      {
        id: g.stateIssueClearly,
        label: 'Zeg duidelijk wat er in de woning mis is.',
        weight: 40,
        required: true,
        skill: 'issue_description',
      },
      {
        id: g.homeOrRepairVocabulary,
        label: 'Gebruik begrijpelijke woorden voor woning of reparatie.',
        weight: 25,
        required: false,
        skill: 'home_repair_vocab',
      },
      {
        id: g.askForHelpOrAction,
        label: 'Vraag om hulp of actie (wat kan er gebeuren?).',
        weight: 20,
        required: true,
        skill: 'help_request',
      },
      {
        id: g.confirmNextStepOrTiming,
        label: 'Bevestig de volgende stap of vraag naar timing.',
        weight: 15,
        required: false,
        skill: 'next_step_confirmation',
      },
    ]
  }
  const g = HOUSING_LANDLORD_GOAL_IDS.asking_rent_contract
  return [
    {
      id: g.askRentOrContractQuestionClearly,
      label: 'Stel je vraag over huur of contract duidelijk.',
      weight: 35,
      required: true,
      skill: 'rent_contract_question',
    },
    {
      id: g.keepHousingContextSpecific,
      label: 'Maak duidelijk waar het over gaat: huur, borg, contract of nutsvoorzieningen.',
      weight: 30,
      required: true,
      skill: 'housing_context',
    },
    {
      id: g.clarifyOrConfirmAnswer,
      label: 'Vraag door of bevestig het antwoord kort.',
      weight: 20,
      required: false,
      skill: 'detail_confirmation',
    },
    {
      id: g.naturalPracticalTone,
      label: 'Gebruik een natuurlijke, praktische toon.',
      weight: 15,
      required: false,
      skill: 'practical_tone',
    },
  ]
}

export function buildHousingLandlordEvaluationContract(variation: HousingLandlordVariation): ScenarioEvaluationContract {
  if (variation === 'reporting_issue') {
    const g = HOUSING_LANDLORD_GOAL_IDS.reporting_issue
    return {
      schemaVersion: 1,
      variationId: 'reporting_issue',
      variationTitle: 'Report a housing issue',
      userGoalSummary:
        'The learner explains what is wrong in the home and asks what can be done.',
      completionRequiredPassGoalIds: [g.stateIssueClearly, g.askForHelpOrAction],
      recapHooksPositive: [
        'described the housing problem clearly',
        'used good home/repair vocabulary',
        'asked for help directly',
      ],
      recapHooksImprove: [
        'say what is wrong more directly',
        'use clearer repair vocabulary',
        'ask what happens next or when someone can come',
      ],
      coachingHooks: ['issue_description', 'home_repair_vocab', 'help_request', 'next_step_confirmation'],
      goalRubrics: RUBRICS.reporting_issue,
    }
  }
  const g = HOUSING_LANDLORD_GOAL_IDS.asking_rent_contract
  return {
    schemaVersion: 1,
    variationId: 'asking_rent_contract',
    variationTitle: 'Ask about rent / contract',
    userGoalSummary:
      'The learner asks a practical housing question about rent, contract, payment, or terms and confirms the answer.',
    completionRequiredPassGoalIds: [g.askRentOrContractQuestionClearly, g.keepHousingContextSpecific],
    recapHooksPositive: [
      'asked the housing question clearly',
      'kept the topic specific',
      'confirmed the answer naturally',
    ],
    recapHooksImprove: [
      'ask the question more directly',
      'specify whether you mean rent, contract, deposit, or utilities',
      'confirm the practical detail more clearly',
    ],
    coachingHooks: ['rent_contract_question', 'housing_context', 'detail_confirmation', 'practical_tone'],
    goalRubrics: RUBRICS.asking_rent_contract,
  }
}

function norm(s: string): string {
  return s.trim().toLowerCase()
}

function hasCompletedLabel(completed: Set<string>, goals: ScenarioRuntimeGoal[], id: string): boolean {
  const label = goals.find((g) => g.id === id)?.label
  if (!label) return false
  return completed.has(norm(label))
}

export function housingLandlordCompletionContractSatisfied(
  runtime: ScenarioRuntimeConfig | null | undefined,
  completedGoalLabels: string[]
): boolean {
  if (runtime?.id !== 'housing_landlord') return false
  const variation = (runtime.variation ?? 'reporting_issue') as HousingLandlordVariation
  const goals = runtime.goals ?? []
  if (!goals.length) return false
  const completed = new Set(completedGoalLabels.map(norm))
  const ec = runtime.evaluationContract ?? buildHousingLandlordEvaluationContract(variation)
  for (const id of ec.completionRequiredPassGoalIds) {
    if (!hasCompletedLabel(completed, goals, id)) return false
  }
  return true
}

export type HousingLandlordCoachingHook =
  | 'issue_description'
  | 'home_repair_vocab'
  | 'help_request'
  | 'next_step_confirmation'
  | 'rent_contract_question'
  | 'housing_context'
  | 'detail_confirmation'
  | 'practical_tone'

const COACHING_BY_GOAL_ID: Record<string, HousingLandlordCoachingHook[]> = {
  state_housing_issue_clearly: ['issue_description'],
  use_relevant_home_or_repair_vocabulary: ['home_repair_vocab'],
  ask_for_help_or_action: ['help_request'],
  confirm_next_step_or_timing: ['next_step_confirmation'],
  ask_rent_or_contract_question_clearly: ['rent_contract_question'],
  keep_housing_context_specific: ['housing_context'],
  clarify_or_confirm_answer: ['detail_confirmation'],
  natural_practical_tone: ['practical_tone'],
}

export function coachingHooksForHousingLandlordMissedGoalIds(goalIds: string[]): HousingLandlordCoachingHook[] {
  const out = new Set<HousingLandlordCoachingHook>()
  for (const id of goalIds) {
    for (const h of COACHING_BY_GOAL_ID[id] ?? []) out.add(h)
  }
  return [...out]
}

function completedHasFragment(completedNorm: Set<string>, fragment: string): boolean {
  const f = fragment.toLowerCase()
  for (const c of completedNorm) {
    if (c.includes(f)) return true
  }
  return false
}

export type HousingLandlordRecapHookBundle = {
  positive: string[]
  improve: string[]
  coachingHooks: HousingLandlordCoachingHook[]
}

export function buildHousingLandlordRecapHookBundle(params: {
  variation: HousingLandlordVariation | string | undefined
  contractMet: boolean
  completedGoalLabels: string[]
  missedGoalLabels: string[]
  runtime: ScenarioRuntimeConfig | null | undefined
}): HousingLandlordRecapHookBundle {
  const v = (params.variation ?? 'reporting_issue') as HousingLandlordVariation
  const goals = params.runtime?.goals ?? []
  const missedNorm = new Set(params.missedGoalLabels.map(norm))
  const completedNorm = new Set(params.completedGoalLabels.map(norm))
  const missedIds = new Set(goals.filter((g) => missedNorm.has(norm(g.label))).map((g) => g.id))
  const coachingHooks = coachingHooksForHousingLandlordMissedGoalIds([...missedIds])
  const ec = params.runtime?.evaluationContract ?? buildHousingLandlordEvaluationContract(v)

  if (params.contractMet) {
    const positive: string[] = []
    if (v === 'reporting_issue') {
      if (completedHasFragment(completedNorm, 'mis is')) positive.push(ec.recapHooksPositive[0] ?? '')
      if (completedHasFragment(completedNorm, 'woorden voor woning') || completedHasFragment(completedNorm, 'reparatie'))
        positive.push(ec.recapHooksPositive[1] ?? '')
      if (completedHasFragment(completedNorm, 'hulp of actie')) positive.push(ec.recapHooksPositive[2] ?? '')
    } else {
      if (completedHasFragment(completedNorm, 'huur of contract')) positive.push(ec.recapHooksPositive[0] ?? '')
      if (completedHasFragment(completedNorm, 'borg, contract') || completedHasFragment(completedNorm, 'nutsvoorzieningen'))
        positive.push(ec.recapHooksPositive[1] ?? '')
      if (completedHasFragment(completedNorm, 'bevestig') || completedHasFragment(completedNorm, 'vraag door'))
        positive.push(ec.recapHooksPositive[2] ?? '')
    }
    return { positive: positive.filter(Boolean), improve: [], coachingHooks }
  }

  return {
    positive: [],
    improve: [...ec.recapHooksImprove],
    coachingHooks,
  }
}

export function housingLandlordGoalIsStretchTier(
  goalLabel: string,
  variation: HousingLandlordVariation | string | undefined
): boolean {
  const gl = norm(goalLabel)
  const v = (variation ?? '') as HousingLandlordVariation
  if (v === 'reporting_issue') {
    return (
      gl.includes('woorden voor woning') ||
      gl.includes('reparatie.') ||
      gl.includes('timing') ||
      gl.includes('volgende stap')
    )
  }
  if (v === 'asking_rent_contract') {
    return gl.includes('vraag door') || gl.includes('praktische toon')
  }
  return false
}

export function inferHousingLandlordGoalLabelsFromUserText(
  scenarioGoals: string[],
  userMessageTexts: string[]
): string[] {
  const t = userMessageTexts.map((s) => s.trim()).filter(Boolean).join('\n').toLowerCase()
  if (!t.trim()) return []

  const out = new Set<string>()
  const addIf = (pred: (gl: string) => boolean) => {
    for (const g of scenarioGoals) {
      if (pred(g.toLowerCase())) out.add(g)
    }
  }

  if (/(lek|kapot|verwarming|douche|raam|wasmachine|water|storing|monteur|reparatie|werkt niet|schimmel|vocht)/i.test(t)) {
    addIf((gl) => gl.includes('mis is'))
    addIf((gl) => gl.includes('woorden voor woning') || gl.includes('reparatie'))
    addIf((gl) => gl.includes('hulp of actie'))
  }
  if (/(stuur|helpen|wat kan|monteur|actie)/i.test(t)) {
    addIf((gl) => gl.includes('hulp of actie'))
  }
  if (/(huur|borg|contract|opzeg|betaling|inclusief|opzegtermijn|maand)/i.test(t)) {
    addIf((gl) => gl.includes('huur of contract'))
    addIf((gl) => gl.includes('borg, contract') || gl.includes('nutsvoorzieningen'))
  }
  if (/(dus|klopt|begrijp|bevestig|samenvat)/i.test(t)) {
    addIf((gl) => gl.includes('vraag door') || gl.includes('volgende stap'))
  }
  return [...out]
}

export function buildHousingLandlordSpeakLiveLlmContract(runtime: ScenarioRuntimeConfig): string {
  if (runtime.id !== 'housing_landlord') return ''
  const v = (runtime.variation ?? 'reporting_issue') as HousingLandlordVariation
  const ec = runtime.evaluationContract ?? buildHousingLandlordEvaluationContract(v)
  const goalLines =
    runtime.goals?.map((g) => `- ${g.label} (id=${g.id}, weight ${g.weight}%, skill=${g.skill})`).join('\n') ?? ''
  const rubricLines = ec.goalRubrics
    ? runtime.goals
        ?.map((g) => {
          const r = ec.goalRubrics?.[g.id]
          if (!r) return ''
          return `- ${g.id}: pass=${r.pass}; partial=${r.partial}; fail=${r.fail}`
        })
        .filter(Boolean)
        .join('\n') ?? ''
    : ''
  return [
    '--- Housing / landlord (Speak Live) · evaluation contract (English meta) ---',
    `Variation: ${ec.variationTitle} (${ec.variationId})`,
    `User goal: ${ec.userGoalSummary}`,
    `Session complete when these goal ids appear in recap goalsCompleted (by Dutch label match): ${ec.completionRequiredPassGoalIds.join(' AND ')}.`,
    `Recap positives: ${ec.recapHooksPositive.join('; ')}`,
    `Recap improve: ${ec.recapHooksImprove.join('; ')}`,
    `Coaching hooks: ${ec.coachingHooks.join(', ')}`,
    goalLines ? `Weighted goals:\n${goalLines}` : '',
    rubricLines ? `Rubric (pass / partial / fail):\n${rubricLines}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
