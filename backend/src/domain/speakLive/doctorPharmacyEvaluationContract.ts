import type {
  ScenarioEvaluationContract,
  ScenarioRuntimeConfig,
  ScenarioRuntimeGoal,
} from '../../models/contracts'
import type { DoctorPharmacyVariation } from './doctorPharmacyScenario'

/** Stable ids — must match {@link buildDoctorPharmacyRuntimeGoals} and recap merge heuristics. */
export const DOCTOR_PHARMACY_GOAL_IDS = {
  symptoms: {
    describeSymptomClearly: 'describe_symptom_clearly',
    useRelevantBodyOrProblemWording: 'use_relevant_body_or_problem_wording',
    giveTimeOrSeverityContext: 'give_time_or_severity_context',
    naturalHelpSeekingRegister: 'natural_help_seeking_register',
  },
  asking_for_help: {
    askForHelpClearly: 'ask_for_help_clearly',
    stateTypeOfHelpNeeded: 'state_type_of_help_needed',
    keepSymptomContextClear: 'keep_symptom_context_clear',
    acknowledgeNaturally: 'acknowledge_naturally',
  },
  understanding_instructions: {
    confirmInstructionClearly: 'confirm_instruction_clearly',
    handleTimeOrQuantityLanguage: 'handle_time_or_quantity_language',
    askForClarificationIfNeeded: 'ask_for_clarification_if_needed',
    respondNaturally: 'respond_naturally',
  },
} as const

const RUBRICS: Record<
  DoctorPharmacyVariation,
  Record<string, { pass: string; partial: string; fail: string }>
> = {
  symptoms: {
    describe_symptom_clearly: {
      pass: 'Clear symptom or problem in simple Dutch (e.g. hoofdpijn, misselijk, keel pijn, koorts, hoesten).',
      partial: 'Symptom hinted but vague or underspecified.',
      fail: 'No understandable symptom or problem description.',
    },
    use_relevant_body_or_problem_wording: {
      pass: 'Understandable symptom or body/problem vocabulary (e.g. hoofd, keel, buik, hoesten, misselijk).',
      partial: 'Vague or slightly off wording; listener must infer.',
      fail: 'No useful body/problem vocabulary tied to the complaint.',
    },
    give_time_or_severity_context: {
      pass: 'Basic time or severity cue (e.g. al twee dagen, sinds gisteren, heel erg, een beetje).',
      partial: 'Very weak time cue (“lang”, “even”) or vague intensity only.',
      fail: 'No time or severity context.',
    },
    natural_help_seeking_register: {
      pass: 'Appropriate patient/client tone (e.g. polite short request, “Ik voel me niet goed”).',
      partial: 'Neutral but usable; a bit stiff.',
      fail: 'Abrupt, odd, or off-register for asking for care help.',
    },
  },
  asking_for_help: {
    ask_for_help_clearly: {
      pass: 'Clear help request (e.g. Kunt u mij helpen?, Heeft u iets tegen hoofdpijn?, Kan ik een afspraak maken?).',
      partial: 'Need implied but request weak or indirect.',
      fail: 'No usable help request.',
    },
    state_type_of_help_needed: {
      pass: 'Type of help clear: medicine, appointment, or what to do next / advice.',
      partial: 'General “help” only; type of help fuzzy.',
      fail: 'No clear type of help (medicine / appointment / advice).',
    },
    keep_symptom_context_clear: {
      pass: 'Problem/symptom stays tied to the request so the listener can follow.',
      partial: 'Some context but thin or easy to lose.',
      fail: 'No usable symptom/problem context with the request.',
    },
    acknowledge_naturally: {
      pass: 'Natural short response (Oké, dank u, Ja, graag).',
      partial: 'Minimal acknowledgment.',
      fail: 'Abrupt or missing acknowledgment when a short reply fits.',
    },
  },
  understanding_instructions: {
    confirm_instruction_clearly: {
      pass: 'Clear confirmation or repeat of the instruction (e.g. Twee keer per dag?, Na het eten?, Dus rust nemen?).',
      partial: 'Partial echo only; confirmation unclear.',
      fail: 'No usable confirmation of the instruction.',
    },
    handle_time_or_quantity_language: {
      pass: 'Handles the key time or quantity detail clearly (e.g. twee keer per dag, vanavond, na het eten).',
      partial: 'Weak handling of timing or amount.',
      fail: 'No handling of the important time/quantity part.',
    },
    ask_for_clarification_if_needed: {
      pass: 'Useful clarification question (Nog een keer?, Met water?, Bedoelt u na het ontbijt?).',
      partial: 'Indirect or vague confusion only.',
      fail: 'No clarification when clearly needed.',
    },
    respond_naturally: {
      pass: 'Natural short response (Oké, dank u, Ja, dat snap ik).',
      partial: 'Minimal reply.',
      fail: 'Abrupt or unnatural closure.',
    },
  },
}

export function buildDoctorPharmacyRuntimeGoals(variation: DoctorPharmacyVariation): ScenarioRuntimeGoal[] {
  if (variation === 'symptoms') {
    const g = DOCTOR_PHARMACY_GOAL_IDS.symptoms
    return [
      {
        id: g.describeSymptomClearly,
        label: 'Beschrijf het sympteem of probleem duidelijk.',
        weight: 40,
        required: true,
        skill: 'symptom_statement',
      },
      {
        id: g.useRelevantBodyOrProblemWording,
        label: 'Gebruik begrijpelijke symptoom- of lichaamwoorden.',
        weight: 25,
        required: true,
        skill: 'body_vocab',
      },
      {
        id: g.giveTimeOrSeverityContext,
        label: 'Geef korte tijd- of ernstcontext.',
        weight: 20,
        required: false,
        skill: 'duration_expression',
      },
      {
        id: g.naturalHelpSeekingRegister,
        label: 'Gebruik natuurlijke, beleefde hulpzoektoon.',
        weight: 15,
        required: false,
        skill: 'help_seeking_tone',
      },
    ]
  }
  if (variation === 'asking_for_help') {
    const g = DOCTOR_PHARMACY_GOAL_IDS.asking_for_help
    return [
      {
        id: g.askForHelpClearly,
        label: 'Vraag duidelijk om hulp.',
        weight: 35,
        required: true,
        skill: 'help_request',
      },
      {
        id: g.stateTypeOfHelpNeeded,
        label: 'Zeg welk soort hulp u nodig heeft (medicijn, afspraak of advies).',
        weight: 30,
        required: true,
        skill: 'medicine_or_appointment',
      },
      {
        id: g.keepSymptomContextClear,
        label: 'Houd de symptoomcontext bij de vraag begrijpelijk.',
        weight: 20,
        required: false,
        skill: 'symptom_context',
      },
      {
        id: g.acknowledgeNaturally,
        label: 'Reageer natuurlijk (bijv. dank u, oké).',
        weight: 15,
        required: false,
        skill: 'acknowledgment',
      },
    ]
  }
  const g = DOCTOR_PHARMACY_GOAL_IDS.understanding_instructions
  return [
    {
      id: g.confirmInstructionClearly,
      label: 'Bevestig of herhaal de instructie duidelijk.',
      weight: 40,
      required: true,
      skill: 'instruction_confirmation',
    },
    {
      id: g.handleTimeOrQuantityLanguage,
      label: 'Laat zien dat u de tijd of hoeveelheid begrijpt.',
      weight: 25,
      required: true,
      skill: 'time_quantity_language',
    },
    {
      id: g.askForClarificationIfNeeded,
      label: 'Vraag kort om verduidelijking als iets onduidelijk is.',
      weight: 20,
      required: false,
      skill: 'clarification_request',
    },
    {
      id: g.respondNaturally,
      label: 'Reageer natuurlijk en kort.',
      weight: 15,
      required: false,
      skill: 'natural_response',
    },
  ]
}

export function buildDoctorPharmacyEvaluationContract(variation: DoctorPharmacyVariation): ScenarioEvaluationContract {
  if (variation === 'symptoms') {
    const g = DOCTOR_PHARMACY_GOAL_IDS.symptoms
    return {
      schemaVersion: 1,
      variationId: 'symptoms',
      variationTitle: 'Describe symptoms',
      userGoalSummary:
        'The learner explains a simple health problem clearly enough for the other person to understand.',
      completionRequiredPassGoalIds: [g.describeSymptomClearly, g.useRelevantBodyOrProblemWording],
      recapHooksPositive: [
        'described symptom clearly',
        'used useful symptom vocabulary',
        'added time/severity context',
      ],
      recapHooksImprove: [
        'say the symptom more directly',
        'use clearer body/problem words',
        'add how long it has been happening',
      ],
      coachingHooks: ['symptom_statement', 'body_vocab', 'duration_expression', 'help_seeking_tone'],
      goalRubrics: RUBRICS.symptoms,
    }
  }
  if (variation === 'asking_for_help') {
    const g = DOCTOR_PHARMACY_GOAL_IDS.asking_for_help
    return {
      schemaVersion: 1,
      variationId: 'asking_for_help',
      variationTitle: 'Ask for help',
      userGoalSummary: 'The learner asks clearly for the kind of help they need.',
      completionRequiredPassGoalIds: [g.askForHelpClearly, g.stateTypeOfHelpNeeded],
      recapHooksPositive: [
        'asked for help directly',
        'made the type of help clear',
        'kept the symptom context grounded',
      ],
      recapHooksImprove: [
        'ask for the help more directly',
        'say whether you need medicine, appointment, or advice',
        'keep the symptom connected to the request',
      ],
      coachingHooks: ['help_request', 'medicine_or_appointment', 'symptom_context', 'acknowledgment'],
      goalRubrics: RUBRICS.asking_for_help,
    }
  }
  const g = DOCTOR_PHARMACY_GOAL_IDS.understanding_instructions
  return {
    schemaVersion: 1,
    variationId: 'understanding_instructions',
    variationTitle: 'Understand instructions',
    userGoalSummary:
      'The learner understands a basic health/pharmacy instruction and confirms or clarifies it.',
    completionRequiredPassGoalIds: [g.confirmInstructionClearly, g.handleTimeOrQuantityLanguage],
    recapHooksPositive: [
      'repeated the instruction clearly',
      'handled time/quantity language well',
      'asked for clarification when needed',
    ],
    recapHooksImprove: [
      'repeat the instruction more directly',
      'focus on the key time/quantity detail',
      'ask for repetition sooner when unsure',
    ],
    coachingHooks: [
      'instruction_confirmation',
      'time_quantity_language',
      'clarification_request',
      'natural_response',
    ],
    goalRubrics: RUBRICS.understanding_instructions,
  }
}

export function doctorPharmacyGoalIsStretchTier(goalLabel: string, variation: string | undefined): boolean {
  const v = (variation ?? '').trim().toLowerCase().replace(/-/g, '_')
  const gl = goalLabel.toLowerCase()
  if (v === 'symptoms') {
    return gl.includes('tijd- of ernst') || gl.includes('hulpzoektoon')
  }
  if (v === 'asking_for_help') {
    return gl.includes('symptoomcontext') || gl.includes('reageer natuurlijk')
  }
  if (v === 'understanding_instructions') {
    return gl.includes('verduidelijking') || (gl.includes('reageer natuurlijk') && gl.includes('kort'))
  }
  return gl.includes('verduidelijk') || gl.includes('hulpzoektoon')
}

export function buildDoctorPharmacySpeakLiveLlmContract(runtime: ScenarioRuntimeConfig): string {
  const ec = runtime.evaluationContract ?? buildDoctorPharmacyEvaluationContract(runtime.variation as DoctorPharmacyVariation)
  const rubric = ec.goalRubrics
    ? Object.entries(ec.goalRubrics)
        .map(([id, r]) => `${id}: pass=${r.pass} | partial=${r.partial} | fail=${r.fail}`)
        .join('\n')
    : ''
  return [
    'Doctor/pharmacy Speak Live contract (taaloefening — geen echte medische diagnose):',
    `Variation: ${ec.variationTitle} (${ec.variationId}).`,
    `User goal: ${ec.userGoalSummary}`,
    `Required recap pass goal ids: ${ec.completionRequiredPassGoalIds.join(', ')}.`,
    rubric ? `Goal rubrics:\n${rubric}` : '',
    'Safety: blijf in-scène (arts/apotheker/balie); korte praktische taal; bij ernstige signalen: kalm doorverwijzen naar echte hulp (huisarts/112) in één zin — geen gedetailleerd medisch advies.',
  ]
    .filter(Boolean)
    .join('\n')
}

export function doctorPharmacyCompletionContractSatisfied(
  runtime: ScenarioRuntimeConfig | null | undefined,
  completedGoalLabels: string[]
): boolean {
  if (runtime?.id !== 'doctor_pharmacy') return false
  const variation = (runtime.variation ?? 'symptoms') as DoctorPharmacyVariation
  const goals = runtime.goals ?? []
  if (!goals.length) return false
  const completed = new Set(completedGoalLabels.map((s) => s.trim().toLowerCase()))
  const ec = runtime.evaluationContract ?? buildDoctorPharmacyEvaluationContract(variation)
  for (const id of ec.completionRequiredPassGoalIds) {
    const label = goals.find((g) => g.id === id)?.label
    if (!label || !completed.has(label.trim().toLowerCase())) return false
  }
  return true
}
