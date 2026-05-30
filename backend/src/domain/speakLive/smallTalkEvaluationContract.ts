import type {
  ScenarioEvaluationContract,
  ScenarioRuntimeConfig,
  ScenarioRuntimeGoal,
} from '../../models/contracts'

export const SMALL_TALK_SCENARIO_ID = 'small_talk' as const

export type SmallTalkLevel = 'A1' | 'A2' | 'B1'
export type SmallTalkSubtype = 'meeting_someone' | 'casual_chat' | 'social_checkin'
export type SmallTalkVariation = 'meeting_someone' | 'talking_about_weekend' | 'talking_about_weather'

export const SMALL_TALK_GOAL_IDS = {
  stayInFlow: 'small_talk_stay_in_flow',
  naturalReaction: 'small_talk_natural_reaction',
  followUpOrBridge: 'small_talk_follow_up_or_bridge',
} as const

export function buildSmallTalkRuntimeGoals(): ScenarioRuntimeGoal[] {
  return [
    {
      id: SMALL_TALK_GOAL_IDS.stayInFlow,
      label: 'Blijf in het gesprek — korte reacties zijn prima.',
      weight: 34,
      required: false,
      skill: 'flow',
    },
    {
      id: SMALL_TALK_GOAL_IDS.naturalReaction,
      label: 'Reageer natuurlijk (oh leuk, interessant, even doorvragen).',
      weight: 33,
      required: false,
      skill: 'phrasing',
    },
    {
      id: SMALL_TALK_GOAL_IDS.followUpOrBridge,
      label: 'Stel een kleine vervolgvraag of maak een zachte brug naar iets nieuws.',
      weight: 33,
      required: false,
      skill: 'follow_up',
    },
  ]
}

function rubric(): NonNullable<ScenarioEvaluationContract['goalRubrics']> {
  return {
    [SMALL_TALK_GOAL_IDS.stayInFlow]: {
      pass: 'Learner keeps answering; conversation does not stall.',
      partial: 'Very short answers only.',
      fail: 'No meaningful participation.',
    },
    [SMALL_TALK_GOAL_IDS.naturalReaction]: {
      pass: 'Sounds social — reactions, small questions, or fillers that fit Dutch small talk.',
      partial: 'Correct but stiff or telegraphic.',
      fail: 'No natural social signal.',
    },
    [SMALL_TALK_GOAL_IDS.followUpOrBridge]: {
      pass: 'At least one follow-up, bridge, or topic nudge appears across the session.',
      partial: 'Only echoes without moving the chat.',
      fail: 'No follow-up energy.',
    },
  }
}

export function buildSmallTalkEvaluationContract(params: {
  level: SmallTalkLevel
  subType: SmallTalkSubtype
  variation: SmallTalkVariation
}): ScenarioEvaluationContract {
  const topicNl =
    params.variation === 'meeting_someone'
      ? 'iemand ontmoeten — voorstellen en simpele vragen'
      : params.variation === 'talking_about_weekend'
        ? 'weekend — plannen en reacties'
        : 'weer — opener en doorpraten'
  const modeNl =
    params.subType === 'meeting_someone'
      ? 'ontmoeting'
      : params.subType === 'casual_chat'
        ? 'informeel praten'
        : 'even checken hoe het gaat'

  return {
    schemaVersion: 1,
    variationId: `${params.subType}__${params.variation}`,
    variationTitle: `Small talk — ${modeNl} · ${topicNl}`,
    userGoalSummary:
      'Natuurlijk Nederlands small talk: niet transactioneel, geen les — gewoon even praten. Foutjes mogen; het gaat om flow en moed.',
    /** Single soft “contract” so recap stays compatible — met when learner participated enough. */
    completionRequiredPassGoalIds: [SMALL_TALK_GOAL_IDS.stayInFlow],
    recapHooksPositive: [
      'Je hield het gesprek in beweging zonder te forceren.',
      'Je klonk sociaal — korte tussenstukjes en echte interesse.',
    ],
    recapHooksImprove: [
      'Voeg een kleine vervolgvraag toe (“En hoe was het weer bij jullie?”).',
      'Varieer je reactie iets (“Oh leuk — wat deed je precies?”).',
    ],
    coachingHooks: [
      'Mini-drill: herhaal de laatste assistentzin en zeg ‘natuurlijker’ in je eigen woorden.',
      'Probeer één filler + vraag: “Oh nice — en wat nu?”',
    ],
    goalRubrics: rubric(),
  }
}

/** Extra LLM contract block appended to scenario context for Speak Live. */
export function buildSmallTalkSpeakLiveLlmContract(runtime: ScenarioRuntimeConfig): string {
  const p = runtime.persona && typeof runtime.persona === 'object' ? (runtime.persona as Record<string, string>) : {}
  const setting = typeof p.setting === 'string' ? p.setting : 'mixed setting'
  const personality = typeof p.personality === 'string' ? p.personality : 'neutral'
  const path = typeof p.conversationPath === 'string' ? p.conversationPath : 'balanced'
  return [
    'SPEAK LIVE — SMALL TALK (Nederlands, taaloefening):',
    `- Geen docent: geen grammaticauitleg in assistantText; geen woordenlijsten; geen “laten we oefenen”.`,
    `- Flow-first: 6–10 wisselingen in gedachten; korte beurten; max één vraag per beurt tenzij de oefenaar heel kort antwoordt.`,
    `- Setting/persona/pad (intern): ${setting} · ${personality} · ${path} — laat dit subtiel doorschemeren, niet als briefing voorlezen.`,
    `- Geheugen / doorbouwen: pak minstens één concreet detail uit de laatste 1–2 gebruikersbeurten (wat, waar, met wie, hoe) kort terug — niet herhalen als echo, wel laten merken dat je het gehoord hebt.`,
    `- Vervolgvraag: stel minstens één echte vervolgvraag binnen elke twee assistent-beurten. Uitzondering: als de gebruiker net een directe vraag stelt, antwoord eerst kort (1 zin), daarna weer volgens de 2-beurten-regel.`,
    `- Reactie eerst: begin vaak met een korte emotionele reactie (2–6 woordjes: “Oh nice!”, “Ah cool”, “Echt?”, “Ah mooi”) vóór vraag of nieuw stukje — overweg Nederlands, mag licht Engels mengen als het sociaal klinkt.`,
    `- Onderwerp: mag licht verschuiven (weekend ↔ weer ↔ plannen), maar altijd met een zachte brug (“trouwens…”, “en jij…”, of iets dat aan hun laatste zin hangt) — nooit abrupt wisselen; geen interview.`,
    `- Lichte sociale wrijving max één tegelijk: iets korter antwoord, mini-pauze, of klein misverstand; daarna vriendelijk door.`,
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

export function smallTalkCompletionContractSatisfied(
  runtime: ScenarioRuntimeConfig | null | undefined,
  completedGoalLabels: string[],
): boolean {
  if (runtime?.id !== SMALL_TALK_SCENARIO_ID) return false
  const goals = runtime.goals ?? []
  if (!goals.length) return false
  const completed = new Set(completedGoalLabels.map(norm))
  const ec = runtime.evaluationContract ?? buildSmallTalkEvaluationContract({
    level: (runtime.level as SmallTalkLevel) ?? 'A2',
    subType: (runtime.subType as SmallTalkSubtype) ?? 'casual_chat',
    variation: (runtime.variation as SmallTalkVariation) ?? 'meeting_someone',
  })
  for (const id of ec.completionRequiredPassGoalIds) {
    if (!hasCompletedLabel(completed, goals, id)) return false
  }
  return ec.completionRequiredPassGoalIds.length > 0
}

export function inferSmallTalkGoalLabelsFromUserText(
  scenarioGoals: string[],
  userMessageTexts: string[],
): string[] {
  const joined = userMessageTexts.join(' ').trim()
  const charCt = joined.length
  const turnCt = userMessageTexts.filter((t) => t.trim()).length
  const out: string[] = []
  const lower = joined.toLowerCase()

  const goalContaining = (frag: string) => scenarioGoals.find((x) => x.toLowerCase().includes(frag.toLowerCase()))

  if (turnCt >= 2 || charCt >= 40) {
    const g = goalContaining('blijf in het gesprek')
    if (g) out.push(g)
  }

  if (/\b(oh|ah|nice|leuk|echt|interessant|grappig|jammer|fijn|prima)\b/i.test(joined) || turnCt >= 3) {
    const g = goalContaining('reageer natuurlijk')
    if (g) out.push(g)
  }

  if (/\?/.test(joined) || /\b(en jij|hoe bij jou|wat ga je|vertel|hoezo|waarom)\b/i.test(lower) || turnCt >= 4) {
    const g = goalContaining('vervolgvraag')
    if (g) out.push(g)
  }

  return [...new Set(out)]
}

export function buildSmallTalkRecapHookBundle(params: {
  contractMet: boolean
  completedGoalLabels: string[]
  missedGoalLabels: string[]
}): { positive: string[]; improve: string[]; coachingHooks: string[] } {
  const positive: string[] = []
  const improve: string[] = []
  if (params.contractMet) {
    positive.push('Je zat goed in het small talk-ritme voor deze sessie.')
  } else {
    improve.push('Probeer nog 1–2 korte beurten: reageren + een mini-vraag — perfectionisme hoeft niet.')
  }
  if (params.completedGoalLabels.some((g) => /vervolg/i.test(g))) {
    positive.push('Je stuurde het gesprek een beetje verder — precies wat small talk nodig heeft.')
  }
  return {
    positive,
    improve,
    coachingHooks: [
      'Luister-deelnemer: herhaal de laatste zin van de ander zachtjes mee (ritme), daarna antwoord in eigen woorden.',
      'Vervolgvraag-booster: kies “En …?” / “Oh ja — hoe …?” en houd het kort.',
    ],
  }
}
