import type {
  ScenarioEvaluationContract,
  ScenarioRuntimeConfig,
  ScenarioRuntimeGoal,
} from '../../models/contracts'

export const EXPLAINING_SOMETHING_SCENARIO_ID = 'explaining_something' as const

export type ExplainingSomethingLevel = 'A1' | 'A2' | 'B1'
export type ExplainingSomethingSubtype = 'giving_instructions' | 'explaining_process' | 'explaining_how_to'
export type ExplainingSomethingVariation = 'giving_instructions' | 'describing_process'

export const EXPLAINING_SOMETHING_GOAL_IDS = {
  structure: 'es_explain_structure',
  completeness: 'es_explain_completeness',
  listener: 'es_explain_listener',
} as const

export function buildExplainingSomethingRuntimeGoals(): ScenarioRuntimeGoal[] {
  return [
    {
      id: EXPLAINING_SOMETHING_GOAL_IDS.structure,
      label: 'Leg uit met een duidelijke volgorde — stappen en logische volgorde.',
      weight: 35,
      required: false,
      skill: 'structure',
    },
    {
      id: EXPLAINING_SOMETHING_GOAL_IDS.completeness,
      label: 'Noem genoeg relevante stappen — niet te kort, niet eindeloos.',
      weight: 35,
      required: false,
      skill: 'completeness',
    },
    {
      id: EXPLAINING_SOMETHING_GOAL_IDS.listener,
      label: 'Reageer ook op verduidelijkingsvragen — blijf helder en rustig.',
      weight: 30,
      required: false,
      skill: 'listener',
    },
  ]
}

function rubric(): NonNullable<ScenarioEvaluationContract['goalRubrics']> {
  return {
    [EXPLAINING_SOMETHING_GOAL_IDS.structure]: {
      pass: 'Clear order (eerst / dan / daarna / tenslotte) or imperative sequence.',
      partial: 'Some order but gaps or jumps.',
      fail: 'No clear sequence.',
    },
    [EXPLAINING_SOMETHING_GOAL_IDS.completeness]: {
      pass: 'Enough steps for the task at this level.',
      partial: 'Too thin or missing key step.',
      fail: 'Far too short or off-task.',
    },
    [EXPLAINING_SOMETHING_GOAL_IDS.listener]: {
      pass: 'Answers clarification without collapsing structure.',
      partial: 'Short or vague follow-up replies.',
      fail: 'Ignores clarification or derails.',
    },
  }
}

export function buildExplainingSomethingEvaluationContract(params: {
  level: ExplainingSomethingLevel
  subType: ExplainingSomethingSubtype
  variation: ExplainingSomethingVariation
}): ScenarioEvaluationContract {
  const varNl =
    params.variation === 'giving_instructions'
      ? 'A — instructies geven (imperatief, stappen)'
      : 'B — een proces beschrijven (chronologie, verbindingswoorden)'
  const subNl =
    params.subType === 'giving_instructions'
      ? 'instructies geven'
      : params.subType === 'explaining_process'
        ? 'proces uitleggen'
        : 'how-to uitleggen'

  return {
    schemaVersion: 1,
    variationId: `${params.subType}__${params.variation}`,
    variationTitle: `Iets uitleggen — ${subNl} · ${varNl}`,
    userGoalSummary:
      'Duidelijk uitleggen in het Nederlands: gestructureerde stappen, verbindingswoorden, en rustig reageren op verduidelijkingsvragen — minder snelle ping-pong dan andere scenario’s.',
    completionRequiredPassGoalIds: [EXPLAINING_SOMETHING_GOAL_IDS.structure],
    recapHooksPositive: [
      'Je gaf een herkenbare volgorde met stappen — goed voor uitleg in het echt.',
      'Je antwoordde rustig op een verduidelijkingsvraag zonder de draad kwijt te raken.',
    ],
    recapHooksImprove: [
      'Noem expliciet wat eerst gebeurt, daarna wat volgt — één zin per stap helpt.',
      'Voeg verbindingswoorden toe: “eerst”, “dan”, “daarna”, “uiteindelijk”.',
    ],
    coachingHooks: [
      'Oefen hardop 4 zinnen met alleen verbindingswoorden + werkwoorden in de juiste tijd.',
      'Schrijf 3 stappen op papier, zeg ze daarna in één vloeiende monoloog van ~20–40 seconden.',
    ],
    goalRubrics: rubric(),
  }
}

/** Extra LLM contract block appended to scenario context for Speak Live. */
export function buildExplainingSomethingSpeakLiveLlmContract(runtime: ScenarioRuntimeConfig): string {
  const p = runtime.persona && typeof runtime.persona === 'object' ? (runtime.persona as Record<string, string>) : {}
  const topicCategory = typeof p.topicCategory === 'string' ? p.topicCategory : 'daily'
  const taskNl = typeof p.taskNl === 'string' ? p.taskNl : 'Leg iets duidelijk uit in het Nederlands.'
  const variation = typeof p.variation === 'string' ? p.variation : 'giving_instructions'
  const subType = typeof p.subType === 'string' ? p.subType : 'explaining_how_to'
  return [
    'SPEAK LIVE — IETS UITLEGGEN (Nederlands, taaloefening):',
    `- Dit is GEEN normaal snel gesprek: de oefenaar mag LANGER antwoorden (2–5 zinnen, soms meer op B1).`,
    `- Jij bent vooral LUISTERAAR: reageer gestructureerd maar blijf compact; geen lange monoloog.`,
    `- Verplichte toon na een uitleg-beurt (in assistantText, Nederlands) — **geen “verbeterde handleiding”** die klinkt alsof jij de uitleg opnieuw schrijft in perfecte taal terwijl je hun formulering negeert.`,
    `  ① Één korte zin: ze zijn gehoord (“Oké”, “Ik hoor …”, “Helder”).`,
    `  ② **Trouwe parafrase:** vat hun stappen samen met **hun woorden / hun volgorde** waar dat kan; geen ideale OV-/wasmachine-tekst produceren als dat niet is wat ze letterlijk zeiden. Niets weglaten wat zij als stap bedoelden; geen extra stappen verzinnen.`,
    `  ③ **Informatieve feedback (compact, geen lange les):** noem concreet wat nog mist voor deze opdracht (max. 1–2 ontbrekende schakels) óf één lichte tip over **formulering/verbindingswoorden** — kort, vriendelijk, niet betuttelend.`,
    `  ④ Sluit af met hoogstens **één** vervolgvraag (of geen vraag als ③ al duidelijk genoeg is / proces klaar).`,
    `- Rondes: jij geeft een opdracht → de oefenaar legt uit → jij volgt ①–④ hierboven → daarna volgende beurt voor de oefenaar.`,
    `- Variatie (intern): ${variation} — “giving_instructions” = imperatief / “je moet eerst…”; “describing_process” = “eerst gebeurt … / dan …”.`,
    `- Subtype (intern): ${subType} — beïnvloelt toon licht; blijf bij de opdracht.`,
    `- Topic (intern): ${topicCategory} — concrete opdracht: ${taskNl}`,
    `- KRITIEK — geen “negeren”: de laatste uitleg van de oefenaar kan meerdere zinnen bevatten — lees en verwerk het HELE blok; reageer niet alleen op de openingszin.`,
    `- Als er al meerdere zinnen/stappen staan (incl. woorden als eerst, dan, daarna, vervolgens, tot slot) of de eerste stap al genoemd is: zeg dat kort (“Oké, dus …”) en stel NIET opnieuw “wat is de eerste stap?” / “wat gebeurt er eerst?” — dat voelt alsof je niet luisterde.`,
    `- Vooruit-vragen (voorbeelden, kies wat past; niet allemaal): “En wat doe je daarna?”, “Tot waar ben je dan in het proces?”, “Hoe rond je af?”, “Wat gebeurt er na [hun laatste stap]?”. Dat is géén herhaling van “wat is de eerste stap?” zodra stap 1 al genoemd is.`,
    `- Wrijving: als de uitleg nog dun is: één schakelvraag. Als er al volgorde is maar het proces waarschijnlijk nog niet af is: parafrase + één vooruit-vraag. Alleen zonder vraag als het echt af is.`,
    `- Geen docent: geen lange grammaticale uitleg of woordenlijsten; wél mag één zin met **concrete** taal-/structuurfeedback (zoals hierboven).`,
    `- Nederlands alleen in assistantText; max. één vraag per beurt na een uitleg van de oefenaar (en die vraag mag niet inhoudelijk hetzelfde zijn als wat ze net beantwoordden).`,
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

export function explainingSomethingCompletionContractSatisfied(
  runtime: ScenarioRuntimeConfig | null | undefined,
  completedGoalLabels: string[],
): boolean {
  if (runtime?.id !== EXPLAINING_SOMETHING_SCENARIO_ID) return false
  const goals = runtime.goals ?? []
  const completed = new Set(completedGoalLabels.map(norm))
  const req = runtime.evaluationContract?.completionRequiredPassGoalIds ?? []
  for (const id of req) {
    if (!hasCompletedLabel(completed, goals, id)) return false
  }
  return true
}

export function inferExplainingSomethingGoalLabelsFromUserText(scenarioGoals: string[], userLines: string[]): string[] {
  const joined = userLines.join(' ').toLowerCase()
  const out = new Set<string>()
  for (const g of scenarioGoals) {
    const gl = g.toLowerCase()
    if (gl.includes('volgorde') || gl.includes('structuur')) {
      if (
        /\b(eerst|daarna|dan|vervolgens|tot slot|tenslotte|stap|stappen|volgorde)\b/i.test(joined) ||
        joined.length > 80
      ) {
        out.add(g)
      }
    }
    if (gl.includes('genoeg') || gl.includes('stappen')) {
      if (userLines.some((l) => l.trim().split(/\s+/).length >= 6) || /\b(en|daarna|dan)\b/i.test(joined)) out.add(g)
    }
    if (gl.includes('verduidelijk') || gl.includes('luister')) {
      if (userLines.length >= 2 && joined.length > 40) out.add(g)
    }
  }
  return [...out]
}

export function buildExplainingSomethingRecapHookBundle(params: {
  contractMet: boolean
  completedGoalLabels: string[]
  missedGoalLabels: string[]
}): { positive: string[]; improve: string[]; coachingHooks: string[] } {
  const positive: string[] = []
  const improve: string[] = []
  if (params.contractMet) {
    positive.push('Je structuur was in de recap herkenbaar — precies wat dit scenario oefent.')
  } else {
    improve.push('Begin met “eerst …”, dan “daarna …” — ook als je maar twee stappen hebt.')
  }
  if (params.completedGoalLabels.some((g) => g.toLowerCase().includes('genoeg'))) {
    positive.push('Je noemde genoeg stappen voor een korte uitleg.')
  } else {
    improve.push('Voeg nog één concrete stap toe (wat je precies doet of klikt).')
  }
  if (params.completedGoalLabels.some((g) => g.toLowerCase().includes('verduidelijk'))) {
    positive.push('Je bleef helder na een verduidelijkingsvraag — goed voor echte gesprekken.')
  } else {
    improve.push('Als de ander vraagt “en daarna?”: antwoord in één korte zin met de volgende stap.')
  }
  const coachingHooks = [
    'Structuur-hint: Eerst → Dan → Daarna → (Uiteindelijk) — max. één idee per zin.',
    'Recap: check welke stap de feedback “mist” — voeg die stap expliciet toe in je volgende poging.',
  ]
  return { positive, improve, coachingHooks }
}
