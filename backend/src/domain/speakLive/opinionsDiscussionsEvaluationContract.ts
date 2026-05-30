import type {
  ScenarioEvaluationContract,
  ScenarioRuntimeConfig,
  ScenarioRuntimeGoal,
} from '../../models/contracts'

export const OPINIONS_DISCUSSIONS_SCENARIO_ID = 'opinions_discussions' as const

export type OpinionsDiscussionsLevel = 'A1' | 'A2' | 'B1'
export type OpinionsDiscussionsSubtype = 'casual_opinion' | 'work_discussion' | 'social_debate'
export type OpinionsDiscussionsVariation = 'agree_disagree' | 'give_reasons'

export const OPINIONS_DISCUSSIONS_GOAL_IDS = {
  stance: 'od_stance_clear',
  reasoning: 'od_reason_given',
  structure: 'od_turn_structure',
} as const

export function buildOpinionsDiscussionsRuntimeGoals(): ScenarioRuntimeGoal[] {
  return [
    {
      id: OPINIONS_DISCUSSIONS_GOAL_IDS.stance,
      label:
        'Geef duidelijk aan of je het eens bent, oneens bent, of genuanceerd — blijf respectvol en op het onderwerp.',
      weight: 34,
      required: false,
      skill: 'stance',
    },
    {
      id: OPINIONS_DISCUSSIONS_GOAL_IDS.reasoning,
      label: 'Geef minstens één reden of toelichting (bijv. “omdat”, “want”, “ik vind dat …”).',
      weight: 33,
      required: false,
      skill: 'reasoning',
    },
    {
      id: OPINIONS_DISCUSSIONS_GOAL_IDS.structure,
      label: 'Houd je beurt leesbaar: kort standpunt, dan uitleg — geen persoonlijke aanval.',
      weight: 33,
      required: false,
      skill: 'structure',
    },
  ]
}

function rubric(): NonNullable<ScenarioEvaluationContract['goalRubrics']> {
  return {
    [OPINIONS_DISCUSSIONS_GOAL_IDS.stance]: {
      pass: 'Clear agree / disagree / nuanced stance, respectful.',
      partial: 'Vague stance or only “ja/nee”.',
      fail: 'No position or off-topic.',
    },
    [OPINIONS_DISCUSSIONS_GOAL_IDS.reasoning]: {
      pass: 'At least one reason or example with a linker (omdat/want/daardoor).',
      partial: 'Opinion only, thin “because”.',
      fail: 'No reasoning when challenged.',
    },
    [OPINIONS_DISCUSSIONS_GOAL_IDS.structure]: {
      pass: 'Short claim + support; responds to one question at a time.',
      partial: 'Rambling or stacked questions answered unclearly.',
      fail: 'Overwhelming or hostile tone.',
    },
  }
}

export function buildOpinionsDiscussionsEvaluationContract(params: {
  level: OpinionsDiscussionsLevel
  subType: OpinionsDiscussionsSubtype
  variation: OpinionsDiscussionsVariation
}): ScenarioEvaluationContract {
  const varNl =
    params.variation === 'agree_disagree'
      ? 'A — eens / oneens / zacht oneens (toon)'
      : 'B — redenen geven (“omdat …”, “ik vind … omdat …”)'
  const subNl =
    params.subType === 'casual_opinion'
      ? 'luchtig alledaags onderwerp'
      : params.subType === 'work_discussion'
        ? 'werk / collega-gesprek'
        : 'sociaal / lifestyle (licht)'

  return {
    schemaVersion: 1,
    variationId: `${params.subType}__${params.variation}`,
    variationTitle: `Meningen & discussie — ${subNl} · ${varNl}`,
    userGoalSummary:
      'In het Nederlands je mening geven, (on)eens zijn met argumenten, en kort reageren op een lichte tegenspraak — neutraal, respectvol, geen zware politiek.',
    completionRequiredPassGoalIds: [OPINIONS_DISCUSSIONS_GOAL_IDS.stance],
    recapHooksPositive: [
      'Je gaf een duidelijke positie — dat maakt een discussie volgbaar.',
      'Je onderbouwde met een reden; dat klinkt overtuigender.',
    ],
    recapHooksImprove: [
      'Voeg één korte reden toe: “Ik vind dat omdat …” of “Ik ben het niet eens, want …”.',
      'Reageer eerst op de vraag (“eens/oneens”), daarna pas je uitleg — zo blijft het rustig.',
    ],
    coachingHooks: [
      'Zinnen-set: “Ik ben het eens” / “Ik ben het niet helemaal eens” / “Ik snap je punt, maar …”.',
      'Redenering: “omdat”, “daarom”, “bovendien” — max. twee redenen per beurt op B1.',
    ],
    goalRubrics: rubric(),
  }
}

export function buildOpinionsDiscussionsSpeakLiveLlmContract(runtime: ScenarioRuntimeConfig): string {
  const p = runtime.persona && typeof runtime.persona === 'object' ? (runtime.persona as Record<string, string>) : {}
  const topicCategory = typeof p.topicCategory === 'string' ? p.topicCategory : 'casual'
  const promptNl = typeof p.promptNl === 'string' ? p.promptNl : 'Bespreek een licht onderwerp in het Nederlands.'
  const variation = typeof p.variation === 'string' ? p.variation : 'agree_disagree'
  const subType = typeof p.subType === 'string' ? p.subType : 'casual_opinion'
  return [
    'SPEAK LIVE — MENINGEN & DISCUSSIE (Nederlands, taaloefening):',
    `- Jij bent een GESPREKSPARTNER met een duidelijke mening: neutraal-direct, respectvol, geen aanval op de persoon.`,
    `- Flow: (1) Jij zegt kort jouw standpunt over het onderwerp (één zin). (2) De oefenaar reageert (eens/oneens + eventueel kort). (3) Jij daagt licht uit met max. ÉÉN vraag (“Waarom?” / “Hoe bedoel je?”). (4) De oefenaar geeft een reden. (5) Jij reageer kort of geeft een zachte tegenspraak — geen monoloog.`,
    `- Variatie (intern): ${variation} — “agree_disagree” = focus op standpunt + zachte nuance; “give_reasons” = focus op “omdat/want” en korte argumentatie.`,
    `- Subtype (intern): ${subType} — casual / werk / sociaal; blijf bij lichte, niet-politieke onderwerpen.`,
    `- Thema (intern): ${topicCategory} — concrete insteek: ${promptNl}`,
    `- Wrijving: soms oneens of vraag door; nooit agressief; geen “gotcha”; max. één vraag per beurt na de oefenaar.`,
    `- Geen docent-uitleg; Nederlands alleen in assistantText; korte zinnen.`,
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

export function opinionsDiscussionsCompletionContractSatisfied(
  runtime: ScenarioRuntimeConfig | null | undefined,
  completedGoalLabels: string[],
): boolean {
  if (runtime?.id !== OPINIONS_DISCUSSIONS_SCENARIO_ID) return false
  const goals = runtime.goals ?? []
  const completed = new Set(completedGoalLabels.map(norm))
  const req = runtime.evaluationContract?.completionRequiredPassGoalIds ?? []
  for (const id of req) {
    if (!hasCompletedLabel(completed, goals, id)) return false
  }
  return true
}

export function inferOpinionsDiscussionsGoalLabelsFromUserText(scenarioGoals: string[], userLines: string[]): string[] {
  const joined = userLines.join(' ').toLowerCase()
  const out = new Set<string>()
  for (const g of scenarioGoals) {
    const gl = g.toLowerCase()
    if (gl.includes('eens') || gl.includes('standpunt') || gl.includes('respect')) {
      if (
        /\b(eens|oneens|niet eens|niet helemaal|daar ben ik het|klopt|mee oneens|snap ik|begrijp ik)\b/i.test(joined) ||
        joined.length > 40
      ) {
        out.add(g)
      }
    }
    if (gl.includes('reden') || gl.includes('omdat') || gl.includes('want')) {
      if (
        /\b(omdat|want|daarom|daardoor|reden|bovendien|ten eerste|ten tweede)\b/i.test(joined) ||
        joined.length > 85
      ) {
        out.add(g)
      }
    }
    if (gl.includes('structuur') || gl.includes('beurt') || gl.includes('aanval')) {
      if (userLines.length >= 2 || joined.length > 70) {
        out.add(g)
      }
    }
  }
  return [...out]
}

export function buildOpinionsDiscussionsRecapHookBundle(params: {
  contractMet: boolean
  completedGoalLabels: string[]
  missedGoalLabels: string[]
}): { positive: string[]; improve: string[]; coachingHooks: string[] } {
  const positive: string[] = []
  const improve: string[] = []
  if (params.contractMet) {
    positive.push('Je standpunt was in de recap duidelijk — goed voor echte discussies.')
  } else {
    improve.push('Begin met één zin: eens / (niet) eens — dan pas je uitleg.')
  }
  if (params.completedGoalLabels.some((g) => g.toLowerCase().includes('reden'))) {
    positive.push('Je gaf een herkenbare onderbouwing.')
  } else {
    improve.push('Voeg “omdat …” of “want …” toe als de ander “waarom?” vraagt.')
  }
  if (params.completedGoalLabels.some((g) => g.toLowerCase().includes('structuur'))) {
    positive.push('Je beurt bleef leesbaar en respectvol.')
  } else {
    improve.push('Kort antwoord op de vraag eerst — daarna max. één extra zin uitleg.')
  }
  const coachingHooks = [
    'Oefen 30 seconden: stelling → eens/oneens → één reden → afsluiting.',
    'Recap: welk doel mist — vul die zin expliciet in bij je volgende poging.',
  ]
  return { positive, improve, coachingHooks }
}
