import type {
  ScenarioEvaluationContract,
  ScenarioRuntimeConfig,
  ScenarioRuntimeGoal,
} from '../../models/contracts'
import type { WorkColleagueInteractionVariation } from './workColleagueInteractionScenario'

export const WORK_COLLEAGUE_GOAL_IDS = {
  simple_workplace_conversation: {
    respondToWorkContextClearly: 'respond_to_work_context_clearly',
    keepTaskOrTopicReferenceClear: 'keep_task_or_topic_reference_clear',
    askOrAnswerUsefulFollowUp: 'ask_or_answer_useful_follow_up',
    naturalWorkplaceTone: 'natural_workplace_tone',
  },
  asking_for_help: {
    askForHelpClearly: 'ask_for_help_clearly',
    explainHelpNeeded: 'explain_help_needed',
    keepWorkContextClear: 'keep_work_context_clear',
    respondNaturallyProfessional: 'respond_naturally_professionally',
  },
  clarifying_tasks: {
    clarifyTaskOrExpectation: 'clarify_task_or_expectation',
    askSequenceOrDeadlineClearly: 'ask_sequence_or_deadline_clearly',
    confirmNextStep: 'confirm_next_step',
    naturalProfessionalTone: 'natural_professional_tone',
  },
} as const

const RUBRICS: Record<WorkColleagueInteractionVariation, Record<string, { pass: string; partial: string; fail: string }>> = {
  simple_workplace_conversation: {
    respond_to_work_context_clearly: {
      pass: 'Clear work-related response (status, simple workplace question, or related ask).',
      partial: 'General but weak response.',
      fail: 'No meaningful response.',
    },
    keep_task_or_topic_reference_clear: {
      pass: 'The task/topic remains clear (document, project, meeting, report, task, etc.).',
      partial: 'Vague reference.',
      fail: 'No clear topic.',
    },
    ask_or_answer_useful_follow_up: {
      pass: 'Useful follow-up included (timing, readiness, joint review, etc.).',
      partial: 'Weak follow-up.',
      fail: 'No useful continuation.',
    },
    natural_workplace_tone: {
      pass: 'Natural enough for workplace context.',
      partial: 'Correct but stiff.',
      fail: 'Abrupt or odd tone.',
    },
  },
  asking_for_help: {
    ask_for_help_clearly: {
      pass: 'Clear help request.',
      partial: 'Need implied but weak.',
      fail: 'No meaningful request.',
    },
    explain_help_needed: {
      pass: 'Clear help need explained.',
      partial: 'General confusion only.',
      fail: 'No clear help context.',
    },
    keep_work_context_clear: {
      pass: 'Task/work context is understandable.',
      partial: 'Context vague.',
      fail: 'No usable context.',
    },
    respond_naturally_professionally: {
      pass: 'Tone appropriate.',
      partial: 'Neutral/stiff.',
      fail: 'Abrupt or unnatural.',
    },
  },
  clarifying_tasks: {
    clarify_task_or_expectation: {
      pass: 'Clear clarification question.',
      partial: 'Task confusion implied but weak.',
      fail: 'No meaningful clarification.',
    },
    ask_sequence_or_deadline_clearly: {
      pass: 'Sequence/deadline clear.',
      partial: 'Weak time/order question.',
      fail: 'No useful sequence/deadline ask.',
    },
    confirm_next_step: {
      pass: 'Clear next-step confirmation.',
      partial: 'Weak repeat only.',
      fail: 'No confirmation.',
    },
    natural_professional_tone: {
      pass: 'Appropriate work tone.',
      partial: 'Stiff but acceptable.',
      fail: 'Abrupt/odd.',
    },
  },
}

export function buildWorkColleagueInteractionRuntimeGoals(
  variation: WorkColleagueInteractionVariation
): ScenarioRuntimeGoal[] {
  if (variation === 'simple_workplace_conversation') {
    const g = WORK_COLLEAGUE_GOAL_IDS.simple_workplace_conversation
    return [
      {
        id: g.respondToWorkContextClearly,
        label: 'Reageer duidelijk op de werkcontext.',
        weight: 35,
        required: true,
        skill: 'work_response',
      },
      {
        id: g.keepTaskOrTopicReferenceClear,
        label: 'Houd de taak of het onderwerp duidelijk.',
        weight: 25,
        required: true,
        skill: 'topic_clarity',
      },
      {
        id: g.askOrAnswerUsefulFollowUp,
        label: 'Stel of beantwoord één nuttige vervolgvraag.',
        weight: 20,
        required: false,
        skill: 'workplace_follow_up',
      },
      {
        id: g.naturalWorkplaceTone,
        label: 'Gebruik een natuurlijke werkplektoon.',
        weight: 20,
        required: false,
        skill: 'professional_tone',
      },
    ]
  }
  if (variation === 'asking_for_help') {
    const g = WORK_COLLEAGUE_GOAL_IDS.asking_for_help
    return [
      {
        id: g.askForHelpClearly,
        label: 'Vraag duidelijk om hulp.',
        weight: 35,
        required: true,
        skill: 'help_request',
      },
      {
        id: g.explainHelpNeeded,
        label: 'Leg kort uit welke hulp je nodig hebt.',
        weight: 30,
        required: true,
        skill: 'workplace_problem_explanation',
      },
      {
        id: g.keepWorkContextClear,
        label: 'Houd de werkcontext helder.',
        weight: 20,
        required: false,
        skill: 'help_context',
      },
      {
        id: g.respondNaturallyProfessional,
        label: 'Reageer natuurlijk en professioneel.',
        weight: 15,
        required: false,
        skill: 'professional_tone',
      },
    ]
  }
  const g = WORK_COLLEAGUE_GOAL_IDS.clarifying_tasks
  return [
    {
      id: g.clarifyTaskOrExpectation,
      label: 'Verduidelijk de taak of verwachting.',
      weight: 35,
      required: true,
      skill: 'task_clarification',
    },
    {
      id: g.askSequenceOrDeadlineClearly,
      label: 'Vraag duidelijk naar volgorde of deadline.',
      weight: 30,
      required: false,
      skill: 'deadline_question',
    },
    {
      id: g.confirmNextStep,
      label: 'Bevestig de volgende stap.',
      weight: 20,
      required: false,
      skill: 'next_step_confirmation',
    },
    {
      id: g.naturalProfessionalTone,
      label: 'Gebruik een natuurlijke professionele toon.',
      weight: 15,
      required: false,
      skill: 'professional_tone',
    },
  ]
}

export function buildWorkColleagueInteractionEvaluationContract(
  variation: WorkColleagueInteractionVariation
): ScenarioEvaluationContract {
  if (variation === 'simple_workplace_conversation') {
    const g = WORK_COLLEAGUE_GOAL_IDS.simple_workplace_conversation
    return {
      schemaVersion: 1,
      variationId: 'simple_workplace_conversation',
      variationTitle: 'Simple workplace conversation',
      userGoalSummary:
        'The learner handles a short professional interaction naturally and clearly: responds in the work moment, keeps task/topic reference clear, may add a useful follow-up, and keeps workplace tone natural.',
      completionRequiredPassGoalIds: [g.respondToWorkContextClearly, g.keepTaskOrTopicReferenceClear],
      recapHooksPositive: [
        'responded clearly to the work situation',
        'kept the task/topic specific',
        'added a useful follow-up',
      ],
      recapHooksImprove: [
        'mention the task more clearly',
        'ask a short follow-up question',
        'sound a little more natural in workplace Dutch',
      ],
      coachingHooks: ['work_response', 'topic_clarity', 'workplace_follow_up', 'professional_tone'],
      goalRubrics: RUBRICS.simple_workplace_conversation,
    }
  }
  if (variation === 'asking_for_help') {
    const g = WORK_COLLEAGUE_GOAL_IDS.asking_for_help
    return {
      schemaVersion: 1,
      variationId: 'asking_for_help',
      variationTitle: 'Ask for help',
      userGoalSummary:
        'The learner asks for help clearly, explains what help is needed, keeps work context understandable, and stays professional.',
      completionRequiredPassGoalIds: [g.askForHelpClearly, g.explainHelpNeeded],
      recapHooksPositive: [
        'asked for help directly',
        'explained the problem clearly',
        'kept the work context clear',
      ],
      recapHooksImprove: [
        'ask for help more directly',
        'explain what exactly you need help with',
        'make the task or file clearer',
      ],
      coachingHooks: ['help_request', 'help_context', 'workplace_problem_explanation', 'professional_tone'],
      goalRubrics: RUBRICS.asking_for_help,
    }
  }
  const g = WORK_COLLEAGUE_GOAL_IDS.clarifying_tasks
  return {
    schemaVersion: 1,
    variationId: 'clarifying_tasks',
    variationTitle: 'Clarify tasks',
    userGoalSummary:
      'The learner asks what the task means, confirms expectations, and checks what to do next (including sequence or deadline). Session completes when clarification passes and either a sequence/deadline question or a next-step confirmation passes.',
    completionRequiredPassGoalIds: [g.clarifyTaskOrExpectation],
    recapHooksPositive: [
      'clarified the task directly',
      'asked about deadline/sequence',
      'confirmed what to do next',
    ],
    recapHooksImprove: [
      'ask the task question more directly',
      'confirm the next step clearly',
      'use one strong work phrase to check expectations',
    ],
    coachingHooks: ['task_clarification', 'deadline_question', 'next_step_confirmation', 'professional_tone'],
    goalRubrics: RUBRICS.clarifying_tasks,
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

export function workColleagueCompletionContractSatisfied(
  runtime: ScenarioRuntimeConfig | null | undefined,
  completedGoalLabels: string[]
): boolean {
  if (runtime?.id !== 'work_colleague_interaction') return false
  const variation = (runtime.variation ?? 'simple_workplace_conversation') as WorkColleagueInteractionVariation
  const goals = runtime.goals ?? []
  if (!goals.length) return false
  const completed = new Set(completedGoalLabels.map(norm))

  if (variation === 'clarifying_tasks') {
    const g = WORK_COLLEAGUE_GOAL_IDS.clarifying_tasks
    const clarifyOk = hasCompletedLabel(completed, goals, g.clarifyTaskOrExpectation)
    const sequenceOrDeadlineOk = hasCompletedLabel(completed, goals, g.askSequenceOrDeadlineClearly)
    const confirmOk = hasCompletedLabel(completed, goals, g.confirmNextStep)
    return clarifyOk && (sequenceOrDeadlineOk || confirmOk)
  }

  const ec = runtime.evaluationContract ?? buildWorkColleagueInteractionEvaluationContract(variation)
  for (const id of ec.completionRequiredPassGoalIds) {
    if (!hasCompletedLabel(completed, goals, id)) return false
  }
  return true
}

export type WorkColleagueCoachingHook =
  | 'work_response'
  | 'topic_clarity'
  | 'workplace_follow_up'
  | 'professional_tone'
  | 'help_request'
  | 'help_context'
  | 'workplace_problem_explanation'
  | 'task_clarification'
  | 'deadline_question'
  | 'next_step_confirmation'

const COACHING_BY_GOAL_ID: Record<string, WorkColleagueCoachingHook[]> = {
  respond_to_work_context_clearly: ['work_response'],
  keep_task_or_topic_reference_clear: ['topic_clarity'],
  ask_or_answer_useful_follow_up: ['workplace_follow_up'],
  natural_workplace_tone: ['professional_tone'],
  ask_for_help_clearly: ['help_request'],
  explain_help_needed: ['workplace_problem_explanation'],
  keep_work_context_clear: ['help_context'],
  respond_naturally_professionally: ['professional_tone'],
  clarify_task_or_expectation: ['task_clarification'],
  ask_sequence_or_deadline_clearly: ['deadline_question'],
  confirm_next_step: ['next_step_confirmation'],
  natural_professional_tone: ['professional_tone'],
}

export function coachingHooksForWorkColleagueMissedGoalIds(goalIds: string[]): WorkColleagueCoachingHook[] {
  const out = new Set<WorkColleagueCoachingHook>()
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

export type WorkColleagueRecapHookBundle = {
  positive: string[]
  improve: string[]
  coachingHooks: WorkColleagueCoachingHook[]
}

export function buildWorkColleagueInteractionRecapHookBundle(params: {
  variation: WorkColleagueInteractionVariation | string | undefined
  contractMet: boolean
  completedGoalLabels: string[]
  missedGoalLabels: string[]
  runtime: ScenarioRuntimeConfig | null | undefined
}): WorkColleagueRecapHookBundle {
  const v = (params.variation ?? 'simple_workplace_conversation') as WorkColleagueInteractionVariation
  const goals = params.runtime?.goals ?? []
  const missedNorm = new Set(params.missedGoalLabels.map(norm))
  const completedNorm = new Set(params.completedGoalLabels.map(norm))
  const missedIds = new Set(goals.filter((g) => missedNorm.has(norm(g.label))).map((g) => g.id))
  const coachingHooks = coachingHooksForWorkColleagueMissedGoalIds([...missedIds])
  const ec = params.runtime?.evaluationContract ?? buildWorkColleagueInteractionEvaluationContract(v)

  if (params.contractMet) {
    const positive: string[] = []
    if (v === 'simple_workplace_conversation') {
      if (completedHasFragment(completedNorm, 'werkcontext')) positive.push(ec.recapHooksPositive[0] ?? '')
      if (completedHasFragment(completedNorm, 'taak of het onderwerp'))
        positive.push(ec.recapHooksPositive[1] ?? '')
      if (completedHasFragment(completedNorm, 'vervolgvraag')) positive.push(ec.recapHooksPositive[2] ?? '')
    } else if (v === 'asking_for_help') {
      if (completedHasFragment(completedNorm, 'om hulp')) positive.push(ec.recapHooksPositive[0] ?? '')
      if (completedHasFragment(completedNorm, 'nodig hebt')) positive.push(ec.recapHooksPositive[1] ?? '')
      if (completedHasFragment(completedNorm, 'werkcontext')) positive.push(ec.recapHooksPositive[2] ?? '')
    } else {
      if (completedHasFragment(completedNorm, 'verwachting') || completedHasFragment(completedNorm, 'taak'))
        positive.push(ec.recapHooksPositive[0] ?? '')
      if (completedHasFragment(completedNorm, 'volgorde') || completedHasFragment(completedNorm, 'deadline'))
        positive.push(ec.recapHooksPositive[1] ?? '')
      if (completedHasFragment(completedNorm, 'volgende stap')) positive.push(ec.recapHooksPositive[2] ?? '')
    }
    return { positive: positive.filter(Boolean), improve: [], coachingHooks }
  }

  return {
    positive: [],
    improve: [...ec.recapHooksImprove],
    coachingHooks,
  }
}

export function workColleagueGoalIsStretchTier(
  goalLabel: string,
  variation: WorkColleagueInteractionVariation | string | undefined
): boolean {
  const gl = norm(goalLabel)
  const v = (variation ?? '') as WorkColleagueInteractionVariation
  if (v === 'simple_workplace_conversation') {
    return gl.includes('vervolgvraag') || gl.includes('werkplektoon')
  }
  if (v === 'asking_for_help') {
    return gl.includes('werkcontext') || gl.includes('natuurlijk en professioneel')
  }
  if (v === 'clarifying_tasks') {
    return gl.includes('professionele toon')
  }
  return gl.includes('vervolgvraag') || gl.includes('volgende stap')
}

export function inferWorkColleagueInteractionGoalLabelsFromUserText(
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

  if (/(gaat het|klaar met|op kantoor|project|document|meekijken|even bellen)/i.test(t)) {
    addIf((gl) => gl.includes('werkcontext'))
  }
  if (/(document|e-mail|email|ticket|verslag|presentatie|spreadsheet|map|bestand)/i.test(t)) {
    addIf((gl) => gl.includes('onderwerp') || gl.includes('taak') || gl.includes('werkcontext'))
  }
  if (/(wanneer|deadline|prioriteit|eigenaar|wie doet|volgorde|eerst dit|daarna)/i.test(t)) {
    addIf((gl) => gl.includes('volgorde') || gl.includes('deadline'))
    addIf((gl) => gl.includes('verwachting'))
  }
  if (/(dus ik moet|bedoeling|precies|klopt dat|bevestig)/i.test(t)) {
    addIf((gl) => gl.includes('verwachting'))
    addIf((gl) => gl.includes('volgende stap'))
  }
  if (/(helpen|kun je me|ik snap het niet|ik begrijp|uitleggen|loop vast)/i.test(t)) {
    addIf((gl) => gl.includes('om hulp'))
    addIf((gl) => gl.includes('nodig hebt'))
  }
  if (/(dank|bedank|prima|oké|oke)/i.test(t)) {
    addIf((gl) => gl.includes('professioneel'))
    addIf((gl) => gl.includes('werkplektoon'))
  }

  return [...out]
}

export function buildWorkColleagueInteractionSpeakLiveLlmContract(runtime: ScenarioRuntimeConfig): string {
  if (runtime.id !== 'work_colleague_interaction') return ''
  const v = (runtime.variation ?? 'simple_workplace_conversation') as WorkColleagueInteractionVariation
  const ec = runtime.evaluationContract ?? buildWorkColleagueInteractionEvaluationContract(v)
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

  const completionLine =
    v === 'clarifying_tasks'
      ? `Session complete when these goal ids appear in recap goalsCompleted (by Dutch label match): clarify_task_or_expectation AND (ask_sequence_or_deadline_clearly OR confirm_next_step).`
      : `Session complete when these goal ids appear in recap goalsCompleted (by Dutch label match): ${ec.completionRequiredPassGoalIds.join(' AND ')}.`

  return [
    '--- Work / colleague interaction (Speak Live) · evaluation contract (English meta) ---',
    `Variation: ${ec.variationTitle} (${ec.variationId})`,
    `User goal: ${ec.userGoalSummary}`,
    completionLine,
    `Recap positives: ${ec.recapHooksPositive.join('; ')}`,
    `Recap improve: ${ec.recapHooksImprove.join('; ')}`,
    `Coaching hooks: ${ec.coachingHooks.join(', ')}`,
    goalLines ? `Weighted goals:\n${goalLines}` : '',
    rubricLines ? `Rubric (pass / partial / fail):\n${rubricLines}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
