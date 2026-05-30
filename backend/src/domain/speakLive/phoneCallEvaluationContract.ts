import type {
  ScenarioEvaluationContract,
  ScenarioRuntimeConfig,
  ScenarioRuntimeGoal,
} from '../../models/contracts'

export const PHONE_CALL_SCENARIO_ID = 'phone_call' as const

export type PhoneCallLevel = 'A1' | 'A2' | 'B1'
export type PhoneCallSubtype = 'appointment_call' | 'service_call' | 'information_call'
export type PhoneCallVariation = 'starting_call' | 'handling_call' | 'repair_misunderstanding'

export const PHONE_CALL_GOAL_IDS = {
  openIntroduce: 'phone_open_introduce_purpose',
  handleDetails: 'phone_handle_questions_details',
  repairClarify: 'phone_repair_or_confirm_misunderstanding',
  closeConfirm: 'phone_close_confirm_next_step',
} as const

const RUBRICS: Record<string, { pass: string; partial: string; fail: string }> = {
  [PHONE_CALL_GOAL_IDS.openIntroduce]: {
    pass: 'Clear Dutch phone opening: who is speaking + why calling.',
    partial: 'Opening present but vague or missing name/purpose.',
    fail: 'No usable opening.',
  },
  [PHONE_CALL_GOAL_IDS.handleDetails]: {
    pass: 'Answers assistant questions with short, relevant Dutch.',
    partial: 'Some answers too thin or off-topic.',
    fail: 'Does not sustain the information exchange.',
  },
  [PHONE_CALL_GOAL_IDS.repairClarify]: {
    pass: 'Uses repair language (repeat, slower, confirm) when needed.',
    partial: 'Minimal repair; mostly guesses.',
    fail: 'No repair or confirmation when audio/line is unclear.',
  },
  [PHONE_CALL_GOAL_IDS.closeConfirm]: {
    pass: 'Confirms a key detail (time, action, name) or closes politely.',
    partial: 'Weak closing or missing confirmation.',
    fail: 'No natural wrap-up.',
  },
}

export function buildPhoneCallRuntimeGoals(): ScenarioRuntimeGoal[] {
  return [
    {
      id: PHONE_CALL_GOAL_IDS.openIntroduce,
      label: 'Open de telefoon: stel jezelf kort voor en zeg waarom je belt.',
      weight: 28,
      required: true,
      skill: 'phone_opening',
    },
    {
      id: PHONE_CALL_GOAL_IDS.handleDetails,
      label: 'Beantwoord vragen kort en duidelijk — blijf bij het doel van het gesprek.',
      weight: 27,
      required: true,
      skill: 'phone_details',
    },
    {
      id: PHONE_CALL_GOAL_IDS.repairClarify,
      label: 'Herstel het gesprek: vraag om herhaling, bevestig wat je hoorde, of vraag om langzamer te praten.',
      weight: 30,
      required: true,
      skill: 'phone_repair',
    },
    {
      id: PHONE_CALL_GOAL_IDS.closeConfirm,
      label: 'Sluit netjes af: bevestig een detail of bedank en hang op.',
      weight: 15,
      required: false,
      skill: 'phone_close',
    },
  ]
}

function requiredPassIdsForLevel(level: PhoneCallLevel): readonly string[] {
  if (level === 'A1') {
    return [PHONE_CALL_GOAL_IDS.openIntroduce, PHONE_CALL_GOAL_IDS.handleDetails]
  }
  if (level === 'A2') {
    return [PHONE_CALL_GOAL_IDS.openIntroduce, PHONE_CALL_GOAL_IDS.handleDetails, PHONE_CALL_GOAL_IDS.closeConfirm]
  }
  return [
    PHONE_CALL_GOAL_IDS.openIntroduce,
    PHONE_CALL_GOAL_IDS.handleDetails,
    PHONE_CALL_GOAL_IDS.repairClarify,
    PHONE_CALL_GOAL_IDS.closeConfirm,
  ]
}

export function buildPhoneCallEvaluationContract(params: {
  level: PhoneCallLevel
  subType: PhoneCallSubtype
  variation: PhoneCallVariation
}): ScenarioEvaluationContract {
  const { level, subType, variation } = params
  const topicNl =
    subType === 'appointment_call'
      ? 'afspraak / reserveren'
      : subType === 'service_call'
        ? 'service of probleem melden'
        : 'informatie opvragen'
  const variationNl =
    variation === 'starting_call'
      ? 'focus: opening en doel noemen'
      : variation === 'handling_call'
        ? 'focus: vragen beantwoorden en details geven'
        : 'focus: misverstand oplossen — herhalen en bevestigen'

  return {
    schemaVersion: 1,
    variationId: `${subType}__${variation}`,
    variationTitle: `Telefoon — ${topicNl} (${variationNl})`,
    userGoalSummary: `Realistische Nederlandse telefoon: ${topicNl}. ${variationNl}.`,
    completionRequiredPassGoalIds: requiredPassIdsForLevel(level),
    recapHooksPositive: [
      'Je bleef in het telefoonregister: korte zinnen, duidelijke klank.',
      'Je gebruikte natuurlijke bevestiging (“dus morgen om tien?” / “mag ik dat even herhalen?”).',
    ],
    recapHooksImprove: [
      'Oefen één vaste openingszin + één herstelzin die je onder druk kunt gebruiken.',
      'Laat de ander even uitpraten; bevestig daarna in eigen woorden wat je begreep.',
    ],
    coachingHooks: [
      'Luister eerst — dan antwoord in één adem (telefoonritme).',
      'Vraag gericht om herhaling (“Kunt u dat nog een keer zeggen?”) in plaats van te raden.',
    ],
    goalRubrics: RUBRICS,
  }
}

export function buildPhoneCallSpeakLiveLlmContract(runtime: ScenarioRuntimeConfig): string {
  const p = runtime.persona && typeof runtime.persona === 'object' ? (runtime.persona as Record<string, string>) : {}
  const topic = typeof p.callTopic === 'string' ? p.callTopic : 'het gesprek'
  return [
    'SPEAK LIVE — TELEFOONSCÈNE (taaloefening):',
    `- Geen visuele context voor de oefenaar: antwoord compact, alsof het een echte telefoonlijn is.`,
    `- Onderwerp van deze run: ${topic}.`,
    `- Gedrag: iets sneller tempo dan een baliegesprek — korte zinnen; maximaal één vraag per beurt.`,
    `- Voeg precies één lichte frictie toe in de sessie: spreek één keer iets té snel of laat een detail even verkeerd klinken; daarna accepteer je hersteltaal van de oefenaar zonder moeilijk te doen.`,
    `- Voeg één bevestigingsmoment toe (“Even checken: bedoelt u …?”) zodat de oefenaar moet bevestigen of corrigeren.`,
    `- Blijft vriendelijk; geen frustratie-stapeling; geen Engels in assistantText.`,
  ].join('\n')
}

const REPAIR_RE =
  /\b(herhalen|herhaal|nog\s*een\s*keer|langzamer|begrijp\s+het\s+niet|begrijp\s+u\s+mij|sorry|pardon|bedoelt\s+u|even\s+checken|klopt\s+het|is\s+het\s+goed\s+zo)\b/i

export function inferPhoneCallGoalLabelsFromUserText(scenarioGoals: string[], userLines: string[]): string[] {
  const t = userLines.map((s) => s.trim()).filter(Boolean).join('\n').toLowerCase()
  if (!t.trim()) return []

  const out = new Set<string>()
  const addIf = (pred: (gl: string) => boolean) => {
    for (const g of scenarioGoals) {
      if (pred(g.toLowerCase())) out.add(g)
    }
  }

  if (
    /\b(goedemiddag|goedenavond|goedendag|dag|hallo|met\s+\w+|ik\s+bel|ik\s+bel\s+even|ik\s+heb\s+een\s+vraag|ik\s+wil\s+graag|afspraak|reserveren|informatie|openingstijden)\b/i.test(
      t
    )
  ) {
    addIf((gl) => gl.includes('open de telefoon') || gl.includes('waarom je belt'))
  }

  if (/\b(ja|nee|dat\s+klopt|voor\s+twee|morgen|vandaag|om\s+\d|half|uur|minuten|naam|adres|nummer)\b/i.test(t)) {
    addIf((gl) => gl.includes('beantwoord vragen') || gl.includes('details'))
  }

  if (REPAIR_RE.test(t)) {
    addIf((gl) => gl.includes('herstel') || gl.includes('herhalen') || gl.includes('langzamer'))
  }

  if (/\b(dank|bedankt|tot\s+ziens|dag\s*[,]|fijne\s+dag|dus\s+dat\s+is|akkoord)\b/i.test(t)) {
    addIf((gl) => gl.includes('sluit') || gl.includes('bevestig'))
  }

  return [...out]
}

function norm(s: string): string {
  return s.trim().toLowerCase()
}

function hasCompletedLabel(completed: Set<string>, goals: ScenarioRuntimeGoal[], id: string): boolean {
  const label = goals.find((g) => g.id === id)?.label
  if (!label) return false
  return completed.has(norm(label))
}

export function phoneCallCompletionContractSatisfied(
  runtime: ScenarioRuntimeConfig | null | undefined,
  completedGoalLabels: string[]
): boolean {
  if (runtime?.id !== PHONE_CALL_SCENARIO_ID) return false
  const goals = runtime.goals ?? []
  if (!goals.length) return false
  const completed = new Set(completedGoalLabels.map(norm))
  const ec = runtime.evaluationContract ?? buildPhoneCallEvaluationContract({
    level: (runtime.level as PhoneCallLevel) ?? 'A2',
    subType: (runtime.subType as PhoneCallSubtype) ?? 'information_call',
    variation: (runtime.variation as PhoneCallVariation) ?? 'handling_call',
  })
  for (const id of ec.completionRequiredPassGoalIds) {
    if (!hasCompletedLabel(completed, goals, id)) return false
  }
  return ec.completionRequiredPassGoalIds.length > 0
}

export function buildPhoneCallRecapHookBundle(params: {
  contractMet: boolean
  completedGoalLabels: string[]
  missedGoalLabels: string[]
}): { positive: string[]; improve: string[]; coachingHooks: string[] } {
  const positive: string[] = []
  const improve: string[] = []
  if (params.contractMet) {
    positive.push('Je voldeed aan het telefooncontract voor deze run (kernpunten gehaald).')
  } else {
    improve.push('Herhaal de call en let extra op herstelzinnen + een duidelijke bevestiging aan het eind.')
  }
  const hadRepairGoal = params.completedGoalLabels.some((g) => /herstel|herhalen|langzamer/i.test(g))
  if (hadRepairGoal) {
    positive.push('Je herstel-/bevestigingsdoel stond bij de afgevinkte doelen — sterk voor echte telefoons.')
  } else if (params.missedGoalLabels.some((g) => /herstel|herhalen|langzamer/i.test(g))) {
    improve.push('Train één vaste repair-zin (“Sorry, kunt u dat herhalen?”) zodat die automatisch komt.')
  }
  return {
    positive,
    improve,
    coachingHooks: [
      'Mini-drill: luister naar de laatste assistentregel zonder tekst; zeg in één zin wat je denkt dat er gezegd werd.',
      'Herhaal hardop: “Goedemiddag, met [naam]. Ik bel over …”',
    ],
  }
}
