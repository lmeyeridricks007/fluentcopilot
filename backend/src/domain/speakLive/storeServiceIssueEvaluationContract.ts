import type {
  ScenarioEvaluationContract,
  ScenarioRuntimeConfig,
  ScenarioRuntimeGoal,
} from '../../models/contracts'
import type { StoreServiceIssueVariation } from './storeServiceIssueScenario'

export const STORE_SERVICE_GOAL_IDS = {
  returning_item: {
    stateReturnIntentClearly: 'state_return_intent_clearly',
    explainReturnReasonClearly: 'explain_return_reason_clearly',
    askForSolution: 'ask_for_solution',
    naturalResponseStyle: 'natural_response_style',
  },
  complaint: {
    describeWhatWentWrong: 'describe_what_went_wrong',
    keepIssueContextSpecific: 'keep_issue_context_specific',
    askForHelpOrResolution: 'ask_for_help_or_resolution',
    respondNaturally: 'respond_naturally',
  },
  explaining_issue: {
    stateIssueClearly: 'state_issue_clearly',
    useProductProblemVocabulary: 'use_product_problem_vocabulary',
    askNextStepOrConfirm: 'ask_next_step_or_confirm',
    acknowledgeNaturally: 'acknowledge_naturally',
  },
} as const

const RUBRICS: Record<StoreServiceIssueVariation, Record<string, { pass: string; partial: string; fail: string }>> = {
  returning_item: {
    state_return_intent_clearly: {
      pass: 'Return intent is clear (e.g. “Ik wil dit graag terugbrengen.”, “Ik wil dit retourneren.”).',
      partial: 'Intent implied but the return request is weak or indirect.',
      fail: 'No meaningful return request.',
    },
    explain_return_reason_clearly: {
      pass: 'Reason clearly stated (e.g. too small, not right, different size) in simple Dutch.',
      partial: 'Reason is vague (“niet goed”) or underspecified.',
      fail: 'No useful reason for the return.',
    },
    ask_for_solution: {
      pass: 'Clear solution request (exchange, refund, or “Wat kan ik doen?”).',
      partial: 'General help only; no clear ask about exchange/refund/next step.',
      fail: 'No next-step or solution ask.',
    },
    natural_response_style: {
      pass: 'Natural response and tone (e.g. “Dank u.”, “Ja, graag.”, “Oké.”).',
      partial: 'Minimal but acceptable.',
      fail: 'Abrupt or unusable tone for the desk.',
    },
  },
  complaint: {
    describe_what_went_wrong: {
      pass: 'Clear complaint/problem statement (wrong item, late order, something went wrong).',
      partial: 'Issue hinted at but weak or very generic.',
      fail: 'No meaningful complaint.',
    },
    keep_issue_context_specific: {
      pass: 'Specific product/order/service context — listener knows what the issue is about.',
      partial: 'General complaint only; little concrete anchor.',
      fail: 'No clear context for the issue.',
    },
    ask_for_help_or_resolution: {
      pass: 'Clear request for help or resolution (e.g. “Kunt u mij helpen?”, “Wat kan ik doen?”).',
      partial: 'Weak or indirect request.',
      fail: 'No request for help or resolution.',
    },
    respond_naturally: {
      pass: 'Natural, calm response style while staying on topic.',
      partial: 'Minimal reaction.',
      fail: 'Abrupt or inappropriate tone.',
    },
  },
  explaining_issue: {
    state_issue_clearly: {
      pass: 'Issue clearly stated (e.g. does not work, scratch, missing part).',
      partial: 'Issue only hinted at.',
      fail: 'No usable issue description.',
    },
    use_product_problem_vocabulary: {
      pass: 'Clear, understandable problem vocabulary (kras, kapot, onderdeel, scherm, werkt niet).',
      partial: 'Vague word choice; little concrete problem language.',
      fail: 'No useful problem vocabulary.',
    },
    ask_next_step_or_confirm: {
      pass: 'Clear next-step question or confirmation (e.g. “Wat kan ik nu doen?”, “Dus ik moet terugkomen?”).',
      partial: 'Weak reaction to next steps.',
      fail: 'No useful next-step handling.',
    },
    acknowledge_naturally: {
      pass: 'Natural acknowledgment (e.g. “Oké, dank u.”, “Prima.”).',
      partial: 'Minimal acknowledgment.',
      fail: 'Abrupt or missing acknowledgment when expected.',
    },
  },
}

export function buildStoreServiceIssueRuntimeGoals(variation: StoreServiceIssueVariation): ScenarioRuntimeGoal[] {
  if (variation === 'returning_item') {
    const g = STORE_SERVICE_GOAL_IDS.returning_item
    return [
      {
        id: g.stateReturnIntentClearly,
        label: 'Zeg duidelijk dat u iets wilt retourneren.',
        weight: 35,
        required: true,
        skill: 'return_request',
      },
      {
        id: g.explainReturnReasonClearly,
        label: 'Leg de retourreden kort en duidelijk uit.',
        weight: 30,
        required: true,
        skill: 'return_reason',
      },
      {
        id: g.askForSolution,
        label: 'Vraag duidelijk naar een oplossing (ruilen, terugbetaling of wat mogelijk is).',
        weight: 20,
        required: false,
        skill: 'refund_exchange_language',
      },
      {
        id: g.naturalResponseStyle,
        label: 'Reageer natuurlijk (bijv. dank u, ja graag, oké).',
        weight: 15,
        required: false,
        skill: 'natural_reply',
      },
    ]
  }
  if (variation === 'complaint') {
    const g = STORE_SERVICE_GOAL_IDS.complaint
    return [
      {
        id: g.describeWhatWentWrong,
        label: 'Beschrijf duidelijk wat er mis is gegaan.',
        weight: 35,
        required: true,
        skill: 'complaint_opening',
      },
      {
        id: g.keepIssueContextSpecific,
        label: 'Maak concreet duidelijk waar het over gaat (bestelling, product of service).',
        weight: 25,
        required: false,
        skill: 'issue_specificity',
      },
      {
        id: g.askForHelpOrResolution,
        label: 'Vraag om hulp of een duidelijke oplossing.',
        weight: 25,
        required: true,
        skill: 'solution_request',
      },
      {
        id: g.respondNaturally,
        label: 'Blijf rustig en natuurlijk in uw reactie.',
        weight: 15,
        required: false,
        skill: 'calm_tone',
      },
    ]
  }
  const g = STORE_SERVICE_GOAL_IDS.explaining_issue
  return [
    {
      id: g.stateIssueClearly,
      label: 'Formuleer helder wat er mis is met het product of de service.',
      weight: 40,
      required: true,
      skill: 'issue_description',
    },
    {
      id: g.useProductProblemVocabulary,
      label: 'Gebruik begrijpelijke woorden voor het defect (kras, kapot, onderdeel, werkt niet).',
      weight: 25,
      required: true,
      skill: 'defect_vocab',
    },
    {
      id: g.askNextStepOrConfirm,
      label: 'Vraag wat uw volgende stap is of bevestig wat de medewerker voorstelt.',
      weight: 20,
      required: false,
      skill: 'next_step_question',
    },
    {
      id: g.acknowledgeNaturally,
      label: 'Geef een korte natuurlijke reactie (oké, prima, dank u).',
      weight: 15,
      required: false,
      skill: 'acknowledgment',
    },
  ]
}

export function buildStoreServiceIssueEvaluationContract(
  variation: StoreServiceIssueVariation
): ScenarioEvaluationContract {
  if (variation === 'returning_item') {
    const g = STORE_SERVICE_GOAL_IDS.returning_item
    return {
      schemaVersion: 1,
      variationId: 'returning_item',
      variationTitle: 'Return an item',
      userGoalSummary:
        'The learner states they want to return something, explains why, and asks for the next step (exchange, refund, or options).',
      completionRequiredPassGoalIds: [g.stateReturnIntentClearly, g.explainReturnReasonClearly],
      recapHooksPositive: [
        'clearly said you wanted to return the item',
        'gave a clear reason',
        'asked what the solution could be',
      ],
      recapHooksImprove: [
        'say the return intent more directly',
        'explain the reason more clearly',
        'ask whether you can exchange or get a refund',
      ],
      coachingHooks: ['return_request', 'return_reason', 'refund_exchange_language', 'natural_reply'],
      goalRubrics: RUBRICS.returning_item,
    }
  }
  if (variation === 'complaint') {
    const g = STORE_SERVICE_GOAL_IDS.complaint
    return {
      schemaVersion: 1,
      variationId: 'complaint',
      variationTitle: 'Make a complaint',
      userGoalSummary:
        'The learner explains what went wrong and asks for help or a resolution; specificity strengthens the complaint but is not required to complete.',
      completionRequiredPassGoalIds: [g.describeWhatWentWrong, g.askForHelpOrResolution],
      recapHooksPositive: [
        'explained the complaint clearly',
        'kept the issue specific',
        'asked for help directly',
      ],
      recapHooksImprove: [
        'state the issue more directly',
        'explain exactly what went wrong',
        'ask for a solution clearly',
      ],
      coachingHooks: ['complaint_opening', 'issue_specificity', 'solution_request', 'calm_tone'],
      goalRubrics: RUBRICS.complaint,
    }
  }
  const g = STORE_SERVICE_GOAL_IDS.explaining_issue
  return {
    schemaVersion: 1,
    variationId: 'explaining_issue',
    variationTitle: 'Explain the issue',
    userGoalSummary:
      'The learner describes what is wrong with an item or service using clear problem words, and may confirm or ask what happens next.',
    completionRequiredPassGoalIds: [g.stateIssueClearly, g.useProductProblemVocabulary],
    recapHooksPositive: [
      'explained the issue clearly',
      'used useful problem vocabulary',
      'asked what happens next',
    ],
    recapHooksImprove: [
      'describe the defect more directly',
      'use a clearer issue word',
      'ask for the next step more clearly',
    ],
    coachingHooks: ['issue_description', 'defect_vocab', 'next_step_question', 'acknowledgment'],
    goalRubrics: RUBRICS.explaining_issue,
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

export function storeServiceCompletionContractSatisfied(
  runtime: ScenarioRuntimeConfig | null | undefined,
  completedGoalLabels: string[]
): boolean {
  if (runtime?.id !== 'store_service_issue') return false
  const variation = (runtime.variation ?? 'returning_item') as StoreServiceIssueVariation
  const goals = runtime.goals ?? []
  if (!goals.length) return false
  const completed = new Set(completedGoalLabels.map(norm))
  const ec = runtime.evaluationContract ?? buildStoreServiceIssueEvaluationContract(variation)
  for (const id of ec.completionRequiredPassGoalIds) {
    if (!hasCompletedLabel(completed, goals, id)) return false
  }
  return true
}

export type StoreServiceCoachingHook =
  | 'return_request'
  | 'return_reason'
  | 'refund_exchange_language'
  | 'natural_reply'
  | 'complaint_opening'
  | 'issue_specificity'
  | 'solution_request'
  | 'calm_tone'
  | 'issue_description'
  | 'defect_vocab'
  | 'next_step_question'
  | 'acknowledgment'

const COACHING_BY_GOAL_ID: Record<string, StoreServiceCoachingHook[]> = {
  state_return_intent_clearly: ['return_request'],
  explain_return_reason_clearly: ['return_reason'],
  ask_for_solution: ['refund_exchange_language'],
  natural_response_style: ['natural_reply'],
  describe_what_went_wrong: ['complaint_opening'],
  keep_issue_context_specific: ['issue_specificity'],
  ask_for_help_or_resolution: ['solution_request'],
  respond_naturally: ['calm_tone'],
  state_issue_clearly: ['issue_description'],
  use_product_problem_vocabulary: ['defect_vocab'],
  ask_next_step_or_confirm: ['next_step_question'],
  acknowledge_naturally: ['acknowledgment'],
}

export function coachingHooksForStoreServiceMissedGoalIds(goalIds: string[]): StoreServiceCoachingHook[] {
  const out = new Set<StoreServiceCoachingHook>()
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

export type StoreServiceRecapHookBundle = {
  positive: string[]
  improve: string[]
  coachingHooks: StoreServiceCoachingHook[]
}

export function buildStoreServiceIssueRecapHookBundle(params: {
  variation: StoreServiceIssueVariation | string | undefined
  contractMet: boolean
  completedGoalLabels: string[]
  missedGoalLabels: string[]
  runtime: ScenarioRuntimeConfig | null | undefined
}): StoreServiceRecapHookBundle {
  const v = (params.variation ?? 'returning_item') as StoreServiceIssueVariation
  const goals = params.runtime?.goals ?? []
  const missedNorm = new Set(params.missedGoalLabels.map(norm))
  const completedNorm = new Set(params.completedGoalLabels.map(norm))
  const missedIds = new Set(goals.filter((g) => missedNorm.has(norm(g.label))).map((g) => g.id))
  const coachingHooks = coachingHooksForStoreServiceMissedGoalIds([...missedIds])
  const ec = params.runtime?.evaluationContract ?? buildStoreServiceIssueEvaluationContract(v)

  if (params.contractMet) {
    const positive: string[] = []
    if (v === 'returning_item') {
      if (completedHasFragment(completedNorm, 'retourneren') || completedHasFragment(completedNorm, 'terugbrengen'))
        positive.push(ec.recapHooksPositive[0] ?? 'clearly said you wanted to return the item')
      if (completedHasFragment(completedNorm, 'retourreden') || completedHasFragment(completedNorm, 'reden'))
        positive.push(ec.recapHooksPositive[1] ?? 'gave a clear reason')
      if (completedHasFragment(completedNorm, 'oplossing') || completedHasFragment(completedNorm, 'ruilen'))
        positive.push(ec.recapHooksPositive[2] ?? 'asked what the solution could be')
    } else if (v === 'complaint') {
      if (completedHasFragment(completedNorm, 'mis is gegaan') || completedHasFragment(completedNorm, 'wat er mis'))
        positive.push(ec.recapHooksPositive[0] ?? 'explained the complaint clearly')
      if (completedHasFragment(completedNorm, 'waar het over') || completedHasFragment(completedNorm, 'concreet'))
        positive.push(ec.recapHooksPositive[1] ?? 'kept the issue specific')
      if (completedHasFragment(completedNorm, 'hulp') || completedHasFragment(completedNorm, 'oplossing'))
        positive.push(ec.recapHooksPositive[2] ?? 'asked for help directly')
    } else {
      if (completedHasFragment(completedNorm, 'helder wat er mis') || completedHasFragment(completedNorm, 'probleem'))
        positive.push(ec.recapHooksPositive[0] ?? 'explained the issue clearly')
      if (completedHasFragment(completedNorm, 'woorden voor het defect') || completedHasFragment(completedNorm, 'defect'))
        positive.push(ec.recapHooksPositive[1] ?? 'used useful problem vocabulary')
      if (completedHasFragment(completedNorm, 'volgende stap') || completedHasFragment(completedNorm, 'bevestig'))
        positive.push(ec.recapHooksPositive[2] ?? 'asked what happens next')
    }
    return { positive, improve: [], coachingHooks }
  }

  return {
    positive: [],
    improve: [...ec.recapHooksImprove],
    coachingHooks,
  }
}

export function storeServiceGoalIsStretchTier(
  goalLabel: string,
  variation: StoreServiceIssueVariation | string | undefined
): boolean {
  const gl = norm(goalLabel)
  const v = (variation ?? '') as StoreServiceIssueVariation
  if (v === 'returning_item') {
    return gl.includes('oplossing') || gl.includes('natuurlijk')
  }
  if (v === 'complaint') {
    return gl.includes('waar het over') || gl.includes('rustig en natuurlijk')
  }
  if (v === 'explaining_issue') {
    return gl.includes('volgende stap') || gl.includes('korte natuurlijke')
  }
  return gl.includes('oplossing') || gl.includes('volgende stap')
}

export function inferStoreServiceIssueGoalLabelsFromUserText(
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

  if (/(retour|terugbrengen|ruilen|bon|geld terug|omruilen|retourneren)/i.test(t)) {
    addIf((gl) => gl.includes('retourneren'))
  }
  if (/(te klein|te groot|kleur|past niet|niet wat ik|verkeerde maat|niet goed|andere maat)/i.test(t)) {
    addIf((gl) => gl.includes('retourreden'))
  }
  if (/(kan ik|mag ik|geld terug|ruilen|wat kan ik|oplossing|terugbetaling)/i.test(t)) {
    addIf((gl) => gl.includes('oplossing'))
  }
  if (/(dank|bedank|alstublieft|graag|oké|oke)/i.test(t)) {
    addIf((gl) => gl.includes('reageer natuurlijk'))
  }

  if (/(misgegaan|klacht|verkeerde|te laat|bestelling|niet gekregen|klopt niet)/i.test(t)) {
    addIf((gl) => gl.includes('wat er mis is gegaan'))
  }
  if (/(bestelnummer|afhalen|levering|pakket|service|pickup)/i.test(t)) {
    addIf((gl) => gl.includes('waar het over gaat'))
  }
  if (/(helpen|wat kunnen we|wat nu|oplossen)/i.test(t)) {
    addIf((gl) => gl.includes('hulp') && gl.includes('oplossing'))
  }

  if (/(werkt niet|kapot|kras|onderdeel|scherm|defect|beschadigd)/i.test(t)) {
    addIf((gl) => gl.includes('helder wat er mis'))
    addIf((gl) => gl.includes('woorden voor het defect'))
  }
  if (/(sinds|welk deel|precies niet)/i.test(t)) {
    addIf((gl) => gl.includes('woorden voor het defect'))
  }
  if (/(wat kan ik nu|volgende stap|dus omruilen|bevestig)/i.test(t)) {
    addIf((gl) => gl.includes('volgende stap'))
  }
  if (/(ja, dat klopt|begrepen|oké|prima)/i.test(t)) {
    addIf((gl) => gl.includes('natuurlijke reactie'))
  }

  return [...out]
}

export function buildStoreServiceIssueSpeakLiveLlmContract(runtime: ScenarioRuntimeConfig): string {
  if (runtime.id !== 'store_service_issue') return ''
  const v = (runtime.variation ?? 'returning_item') as StoreServiceIssueVariation
  const ec = runtime.evaluationContract ?? buildStoreServiceIssueEvaluationContract(v)
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
    '--- Store / service issue (Speak Live) · evaluation contract (English meta) ---',
    'Conversation: do not ask again for receipt/bon/reason/refund-vs-exchange/defect details already stated in Mem or recent turns—paraphrase briefly then advance.',
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
