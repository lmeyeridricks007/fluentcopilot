import type {
  ScenarioEvaluationContract,
  ScenarioRuntimeConfig,
  ScenarioRuntimeGoal,
} from '../../models/contracts'

export const STORYTELLING_SCENARIO_ID = 'storytelling' as const

export type StorytellingLevel = 'A1' | 'A2' | 'B1'
export type StorytellingSubtype = 'daily_story' | 'travel_story' | 'personal_experience'
export type StorytellingVariation = 'what_you_did_yesterday' | 'travel_story'

export const STORYTELLING_GOAL_IDS = {
  opening: 'st_story_opening',
  middle: 'st_story_middle',
  ending: 'st_story_ending',
} as const

export function buildStorytellingRuntimeGoals(): ScenarioRuntimeGoal[] {
  return [
    {
      id: STORYTELLING_GOAL_IDS.opening,
      label: 'Begin met wanneer/waar of de setting — het begin van je verhaal.',
      weight: 34,
      required: false,
      skill: 'opening',
    },
    {
      id: STORYTELLING_GOAL_IDS.middle,
      label: 'Vertel wat er gebeurde — middenstuk met minstens twee momenten of details.',
      weight: 33,
      required: false,
      skill: 'middle',
    },
    {
      id: STORYTELLING_GOAL_IDS.ending,
      label: 'Sluit af met een gevolg of gevoel — einde van je verhaal.',
      weight: 33,
      required: false,
      skill: 'ending',
    },
  ]
}

function rubric(): NonNullable<ScenarioEvaluationContract['goalRubrics']> {
  return {
    [STORYTELLING_GOAL_IDS.opening]: {
      pass: 'Clear time/place or context for the story.',
      partial: 'Vague start or missing when/where.',
      fail: 'No recognizable opening.',
    },
    [STORYTELLING_GOAL_IDS.middle]: {
      pass: 'Two or more events or concrete details in logical flow.',
      partial: 'Thin middle or one event only.',
      fail: 'Almost no narrative content.',
    },
    [STORYTELLING_GOAL_IDS.ending]: {
      pass: 'Result, feeling, or takeaway is stated.',
      partial: 'Abrupt stop or unclear ending.',
      fail: 'No ending or off-topic.',
    },
  }
}

export function buildStorytellingEvaluationContract(params: {
  level: StorytellingLevel
  subType: StorytellingSubtype
  variation: StorytellingVariation
}): ScenarioEvaluationContract {
  const varNl =
    params.variation === 'what_you_did_yesterday'
      ? 'A — wat je gisteren / recent deed (eenvoudige verleden tijd + volgorde)'
      : 'B — reis- of belevenisverhaal (details + emotie + verhaallijn)'
  const subNl =
    params.subType === 'daily_story'
      ? 'dagelijks verhaal'
      : params.subType === 'travel_story'
        ? 'reisverhaal'
        : 'persoonlijke ervaring'

  return {
    schemaVersion: 1,
    variationId: `${params.subType}__${params.variation}`,
    variationTitle: `Verhalen vertellen — ${subNl} · ${varNl}`,
    userGoalSummary:
      'In het Nederlands een kort verhaal vertellen over iets uit het verleden: begin (wanneer/waar), midden (wat gebeurde), einde (gevoel of slot) — met verleden tijd en natuurlijke opvolgvragen van een geïnteresseerde luisteraar.',
    completionRequiredPassGoalIds: [STORYTELLING_GOAL_IDS.opening],
    recapHooksPositive: [
      'Je had een duidelijk begin met tijd of plek — dat helpt de luisteraar meteen mee.',
      'Je middenstuk had herkenbare momenten; dat maakt het verhaal levend.',
    ],
    recapHooksImprove: [
      'Voeg een korte afsluiting toe: wat vond je ervan, of wat gebeurde er uiteindelijk?',
      'Gebruik verleden tijd en signaalwoorden: “toen”, “daarna”, “op het eind”, “het was …”.',
    ],
    coachingHooks: [
      'Drie-zinnen-truc: 1) setting + tijd, 2) twee dingen die gebeurden, 3) slot met gevoel of les.',
      'Neem één detail (geluid, weer, eten) en zeg het hardop in twee varianten.',
    ],
    goalRubrics: rubric(),
  }
}

/** Extra LLM contract block appended to scenario context for Speak Live. */
export function buildStorytellingSpeakLiveLlmContract(runtime: ScenarioRuntimeConfig): string {
  const p = runtime.persona && typeof runtime.persona === 'object' ? (runtime.persona as Record<string, string>) : {}
  const topicCategory = typeof p.topicCategory === 'string' ? p.topicCategory : 'daily'
  const promptNl = typeof p.promptNl === 'string' ? p.promptNl : 'Vertel een kort verhaal in het Nederlands.'
  const variation = typeof p.variation === 'string' ? p.variation : 'what_you_did_yesterday'
  const subType = typeof p.subType === 'string' ? p.subType : 'daily_story'
  return [
    'SPEAK LIVE — VERHALEN VERTELLEN (Nederlands, taaloefening):',
    `- Dit is narratief: de oefenaar mag LANGER antwoorden (3–6 zinnen; op B1 iets rijker).`,
    `- Jij bent een GEÏNTERESSEERDE LUISTERAAR: warm, nieuwsgierig; korte tussenreacties; geen docent-monoloog.`,
    `- Verhaalstructuur (subtiel begeleiden): begin = context (wanneer/waar); midden = wat er gebeurde; einde = gevoel/resultaat.`,
    `- Rondes: (1) Jij geeft ÉÉN duidelijke prompt in het Nederlands. (2) De oefenaar vertelt. (3) Jij stelt max. ÉÉN vervolgvraag (detail, gevoel, “en toen?”) — niet alles tegelijk. (4) Optioneel: tweede korte ronde.`,
    `- Variatie (intern): ${variation} — “what_you_did_yesterday” = dagelijks/gisteren; “travel_story” = reis of belevenis met detail + emotie.`,
    `- Subtype (intern): ${subType} — beïnvloelt welke prompt/hint; blijf in rol.`,
    `- Thema (intern): ${topicCategory} — concrete prompt: ${promptNl}`,
    `- Wrijving (licht): vraag naar een mistend detail (“Waar was je precies?”), of “Hoe voelde dat?”, of parafraseer kort om te checken.`,
    `- Moedig verleden tijd aan (perfectum/imperfectum) waar passend; geen grammaticale uitleg in assistantText.`,
    `- Nederlands alleen in assistantText; max. één vraag per beurt na een verhaal van de oefenaar.`,
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

export function storytellingCompletionContractSatisfied(
  runtime: ScenarioRuntimeConfig | null | undefined,
  completedGoalLabels: string[],
): boolean {
  if (runtime?.id !== STORYTELLING_SCENARIO_ID) return false
  const goals = runtime.goals ?? []
  const completed = new Set(completedGoalLabels.map(norm))
  const req = runtime.evaluationContract?.completionRequiredPassGoalIds ?? []
  for (const id of req) {
    if (!hasCompletedLabel(completed, goals, id)) return false
  }
  return true
}

export function inferStorytellingGoalLabelsFromUserText(scenarioGoals: string[], userLines: string[]): string[] {
  const joined = userLines.join(' ').toLowerCase()
  const out = new Set<string>()
  for (const g of scenarioGoals) {
    const gl = g.toLowerCase()
    if (gl.includes('begin') || gl.includes('setting') || gl.includes('wanneer')) {
      if (
        /\b(gisteren|vandaag|vorige week|weekend|ochtend|avond|toen|in de|bij de|in het|eerst)\b/i.test(joined) ||
        joined.length > 35
      ) {
        out.add(g)
      }
    }
    if (gl.includes('midden') || gl.includes('gebeurde') || gl.includes('twee')) {
      if (
        /\b(daarna|toen|vervolgens|daardoor|we|ik|hebben|ging|at|zag|ontmoette|bezocht)\b/i.test(joined) ||
        userLines.length >= 2 ||
        joined.length > 90
      ) {
        out.add(g)
      }
    }
    if (gl.includes('af') || gl.includes('gevoel') || gl.includes('einde')) {
      if (
        /\b(uiteindelijk|tot slot|daarom|het was|vond ik|fijn|moeilijk|leuk|geweldig|jammer|blij)\b/i.test(joined) ||
        (userLines.length >= 2 && joined.length > 120)
      ) {
        out.add(g)
      }
    }
  }
  return [...out]
}

export function buildStorytellingRecapHookBundle(params: {
  contractMet: boolean
  completedGoalLabels: string[]
  missedGoalLabels: string[]
}): { positive: string[]; improve: string[]; coachingHooks: string[] } {
  const positive: string[] = []
  const improve: string[] = []
  if (params.contractMet) {
    positive.push('Je begin was in de recap duidelijk — goed voor luisteraars in het echt.')
  } else {
    improve.push('Start met één zin: wanneer en waar (of “gisteren …”) — dan weet iedereen het kader.')
  }
  if (params.completedGoalLabels.some((g) => g.toLowerCase().includes('midden'))) {
    positive.push('Je middenstuk had genoeg gebeurtenissen of details om te volgen.')
  } else {
    improve.push('Voeg nog één concreet moment toe in het midden (“toen …”, “daarna …”).')
  }
  if (params.completedGoalLabels.some((g) => g.toLowerCase().includes('af') || g.toLowerCase().includes('gevoel'))) {
    positive.push('Je sloot af met een gevoel of resultaat — dat maakt het verhaal af.')
  } else {
    improve.push('Eindig met één zin over hoe je het vond of wat het opleverde.')
  }
  const coachingHooks = [
    'Verhaal-boog: kader → twee momenten → slotgevoel — oefen hardop in 30 seconden.',
    'Recap: kijk welk stuk (begin/midden/einde) mist — vul die zin expliciet in bij je volgende poging.',
  ]
  return { positive, improve, coachingHooks }
}
