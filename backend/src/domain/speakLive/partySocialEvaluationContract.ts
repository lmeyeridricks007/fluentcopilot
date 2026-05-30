import type {
  ScenarioEvaluationContract,
  ScenarioRuntimeConfig,
  ScenarioRuntimeGoal,
} from '../../models/contracts'

export const PARTY_SOCIAL_SCENARIO_ID = 'party_social' as const

export type PartySocialLevel = 'A1' | 'A2' | 'B1'
export type PartySocialSubtype = 'house_party' | 'networking_event' | 'casual_gathering'
export type PartySocialVariation = 'keeping_conversation_going' | 'asking_questions'

export const PARTY_SOCIAL_GOAL_IDS = {
  flow: 'ps_party_flow',
  questions: 'ps_party_questions',
  energy: 'ps_party_energy',
} as const

export function buildPartySocialRuntimeGoals(): ScenarioRuntimeGoal[] {
  return [
    {
      id: PARTY_SOCIAL_GOAL_IDS.flow,
      label:
        'Houd het feestgesprek in beweging — korte reacties, mini-opmerkingen, geen lange stilte.',
      weight: 35,
      required: false,
      skill: 'continuity',
    },
    {
      id: PARTY_SOCIAL_GOAL_IDS.questions,
      label: 'Stel natuurlijke feest-/netwerkvragen en toon echte nieuwsgierigheid.',
      weight: 35,
      required: false,
      skill: 'questions',
    },
    {
      id: PARTY_SOCIAL_GOAL_IDS.energy,
      label:
        'Laat het licht springen — na een paar beurten mag het onderwerp licht verschuiven; haak kort op wat net gezegd werd; geen interview.',
      weight: 30,
      required: false,
      skill: 'dynamic_energy',
    },
  ]
}

function rubric(): NonNullable<ScenarioEvaluationContract['goalRubrics']> {
  return {
    [PARTY_SOCIAL_GOAL_IDS.flow]: {
      pass: 'Keeps short exchanges alive with reactions or continuers.',
      partial: 'Very thin replies; little momentum.',
      fail: 'No continuity signals.',
    },
    [PARTY_SOCIAL_GOAL_IDS.questions]: {
      pass: 'Asks natural party-style questions or engaged prompts.',
      partial: 'Only yes/no or one-word probes.',
      fail: 'No question curiosity.',
    },
    [PARTY_SOCIAL_GOAL_IDS.energy]: {
      pass: 'Shows light topic movement or social energy appropriate to level.',
      partial: 'Flat or stuck on one micro-thread only.',
      fail: 'No variety or forward motion.',
    },
  }
}

export function buildPartySocialEvaluationContract(params: {
  level: PartySocialLevel
  subType: PartySocialSubtype
  variation: PartySocialVariation
}): ScenarioEvaluationContract {
  const varNl =
    params.variation === 'keeping_conversation_going'
      ? 'A — doorpraten en stilte opvangen'
      : 'B — vragen stellen en interesse tonen'
  const subNl =
    params.subType === 'house_party'
      ? 'huisfeest'
      : params.subType === 'networking_event'
        ? 'netwerkborrel'
        : 'informele borrel'

  return {
    schemaVersion: 1,
    variationId: `${params.subType}__${params.variation}`,
    variationTitle: `Feest / sociale setting — ${subNl} · ${varNl}`,
    userGoalSummary:
      'Korte, levendige gesprekjes op een feest of sociale setting: reageren, doorvragen, en soms van onderwerp wisselen — minder lineair dan andere scenario’s.',
    completionRequiredPassGoalIds: [PARTY_SOCIAL_GOAL_IDS.flow],
    recapHooksPositive: [
      'Je hield het tempo sociaal — korte bundels en doorvertellen.',
      'Je stuurde met vragen of echte interesse — goed voor een drukke ruimte.',
    ],
    recapHooksImprove: [
      'Voeg een mini-reactie toe vóór je volgende vraag (“Oh nice — …”).',
      'Stel één concrete feestvraag (“Ken je veel mensen hier?”).',
    ],
    coachingHooks: [
      'Oefen 5 fillers: “Oh echt?”, “Leuk!”, “Nice”, “En verder?”, “Ah cool”.',
      'Draai 3 korte “burst”-rondjes van 2–3 beurten met telkens een ander mini-onderwerp.',
    ],
    goalRubrics: rubric(),
  }
}

/** Extra LLM contract block appended to scenario context for Speak Live. */
export function buildPartySocialSpeakLiveLlmContract(runtime: ScenarioRuntimeConfig): string {
  const p = runtime.persona && typeof runtime.persona === 'object' ? (runtime.persona as Record<string, string>) : {}
  const setting = typeof p.setting === 'string' ? p.setting : 'party'
  const personType = typeof p.personType === 'string' ? p.personType : 'neutral'
  const topicSeed = typeof p.topicSeed === 'string' ? p.topicSeed : 'mixed'
  const variation = typeof p.variation === 'string' ? p.variation : 'keeping_conversation_going'
  return [
    'SPEAK LIVE — FEEST / SOCIALE SETTING (Nederlands, taaloefening):',
    `- Geen docent: geen grammaticauitleg in assistantText; geen woordenlijsten.`,
    `- Structuur: NIET lineair — 3–6 korte “bursts” (2–4 beurten). Binnen één burst: blijf op hetzelfde mini-haakje.`,
    `- Topic-switch: na ongeveer 2–3 beurten (user+assistant) op hetzelfde onderwerp MAG je een lichte shift — nieuwe hoek (weekend, werk, “hoe ken je …”, hobby), geen harde reset en geen verhoor.`,
    `- Kort geheugen (Mem + Recent): houd het laatste mini-topic en 1 feit van de oefenaar bij. Laat dat 1× kort terugkomen (“Dus je kende hier niemand — …”, “Je zei net iets over werk — …”) vóór je doorschuift; daarna max. één nieuwe vraag of hook.`,
    `- Vraag-frequentie: gemiddeld elke 1–2 assistent-beurten een echte vraag of duidelijke uitnodiging om door te praten (tenzij de oefenaar net een vraag stelde — eerst kort en menselijk antwoorden, daarna weer een vraag).`,
    `- Lengte-variatie: meestal 1 korte zin; af en toe 2 korte zinnen (max. ~2 regels) voor warmte of lichte “haha”-reactie — niet monoloog.`,
    `- Variatie-focus (intern): ${variation} — “keeping” = meer doorreacties en doorzetten; “asking” = meer gerichte feestvragen.`,
    `- Setting / persoon / topic (intern): ${setting} · ${personType} · ${topicSeed} — subtiel; niet als script voorlezen.`,
    `- Energie: iets hoger tempo dan kennismaking; wissel kort/lang licht af zoals hierboven.`,
    `- Onvoorspelbaarheid: af en toe een kleine topic jump of kort “awkward” moment is oké — daarna vriendelijk door.`,
    `- Mem + recent: herhaal geen exact dezelfde feestvraag; varieer hooks (“weekend”, “werk”, “waarom ben je hier”).`,
    `- Niveau: A1 heel kort; A2 natuurlijke mini-wissels; B1 vlottere switches en sterkere reacties.`,
  ].join('\n')
}

function norm(s: string): string {
  return s.trim().toLowerCase()
}

function hasCompletedLabel(completed: Set<string>, goals: ScenarioRuntimeGoal[], id: string): boolean {
  const label = goals.find((g) => g.id === id)?.label
  if (!label) return false
  const n = norm(label)
  return [...completed].some((d) => d === n || d.includes(n.slice(0, 22)) || n.includes(d.slice(0, 22)))
}

export function partySocialCompletionContractSatisfied(
  runtime: ScenarioRuntimeConfig | null | undefined,
  completedGoalLabels: string[],
): boolean {
  if (runtime?.id !== PARTY_SOCIAL_SCENARIO_ID) return false
  const goals = runtime.goals ?? []
  const completed = new Set(completedGoalLabels.map(norm))
  const req = runtime.evaluationContract?.completionRequiredPassGoalIds ?? []
  for (const id of req) {
    if (!hasCompletedLabel(completed, goals, id)) return false
  }
  return true
}

export function inferPartySocialGoalLabelsFromUserText(scenarioGoals: string[], userLines: string[]): string[] {
  const joined = userLines.join(' ').toLowerCase()
  const out = new Set<string>()
  for (const g of scenarioGoals) {
    const gl = g.toLowerCase()
    if (gl.includes('beweging') || gl.includes('stilte') || gl.includes('doorpraten')) {
      if (
        /\b(leuk|nice|cool|echt|ja|oh|wow|interessant|oké|goed|vet|grappig|spannend|herken|snap)\b/i.test(joined) ||
        joined.length > 40
      ) {
        out.add(g)
      }
    }
    if (gl.includes('feest') || gl.includes('netwerk') || gl.includes('nieuwsgierig')) {
      if (/\?/.test(joined) || /\b(hoe|wat|waar|ken je|kom je|doe je|werk je|host|feest)\b/i.test(joined)) out.add(g)
    }
    if (gl.includes('springen') || gl.includes('onderwerp')) {
      if (
        /\b(weekend|werk|reis|hobby|feest|hier|daar|vroeger|straks|andere|verder|eigenlijk)\b/i.test(joined) &&
        userLines.length >= 2
      ) {
        out.add(g)
      }
    }
  }
  return [...out]
}

export function buildPartySocialRecapHookBundle(params: {
  contractMet: boolean
  completedGoalLabels: string[]
  missedGoalLabels: string[]
}): { positive: string[]; improve: string[]; coachingHooks: string[] } {
  const positive: string[] = []
  const improve: string[] = []
  if (params.contractMet) {
    positive.push('Je hield het sociaal tempo erin — korte bundels zoals op een echte borrel.')
  } else {
    improve.push('Probeer minstens twee korte reacties of doorvertellers achter elkaar — dan voelt het minder stok.')
  }
  if (params.completedGoalLabels.some((g) => g.toLowerCase().includes('nieuwsgierig'))) {
    positive.push('Je stuurde met een feest- of netwerkvraag — precies wat je hier oefent.')
  } else {
    improve.push('Stel een lichte feestvraag (“Wat doe je hier vanavond?”).')
  }
  if (params.completedGoalLabels.some((g) => g.toLowerCase().includes('onderwerp'))) {
    positive.push('Je liet het gesprek een beetje bewegen — minder saai voor jezelf en de ander.')
  } else {
    improve.push('Haak kort op iets randoms (“En verder?” / “Wat nog meer?”) om energie te geven.')
  }
  const coachingHooks = [
    'Burst-drill: 3 beurten — reactie → mini-vraag → reactie.',
    'Noteer 4 natuurlijke fillers en gebruik er één per beurt in je volgende sessie.',
  ]
  return { positive, improve, coachingHooks }
}
