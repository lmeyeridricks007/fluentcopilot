import type {
  ScenarioEvaluationContract,
  ScenarioRuntimeConfig,
  ScenarioRuntimeGoal,
} from '../../models/contracts'

export const MEETING_NEW_PEOPLE_SCENARIO_ID = 'meeting_new_people' as const

export type MeetingNewPeopleLevel = 'A1' | 'A2' | 'B1'
export type MeetingNewPeopleSubtype = 'social_event' | 'work_introduction' | 'casual_meeting'
export type MeetingNewPeopleVariation = 'introductions' | 'background' | 'follow_up_questions'

export const MEETING_NEW_PEOPLE_GOAL_IDS = {
  introBalance: 'mnp_intro_balance',
  background: 'mnp_background',
  followUp: 'mnp_follow_up',
} as const

export function buildMeetingNewPeopleRuntimeGoals(): ScenarioRuntimeGoal[] {
  return [
    {
      id: MEETING_NEW_PEOPLE_GOAL_IDS.introBalance,
      label: 'Stel jezelf kort voor en houd beurten in balans — niet alleen jij, niet alleen zij.',
      weight: 34,
      required: false,
      skill: 'introductions',
    },
    {
      id: MEETING_NEW_PEOPLE_GOAL_IDS.background,
      label: 'Vertel iets over jezelf (woonplaats, werk, of context) op jouw niveau.',
      weight: 33,
      required: false,
      skill: 'identity',
    },
    {
      id: MEETING_NEW_PEOPLE_GOAL_IDS.followUp,
      label: 'Stel een relevante vervolgvraag of reageer met echte nieuwsgierigheid.',
      weight: 33,
      required: false,
      skill: 'follow_up',
    },
  ]
}

function rubric(): NonNullable<ScenarioEvaluationContract['goalRubrics']> {
  return {
    [MEETING_NEW_PEOPLE_GOAL_IDS.introBalance]: {
      pass: 'Clear self-intro and natural turn-taking.',
      partial: 'Intro present but one-sided or very thin.',
      fail: 'No usable introduction.',
    },
    [MEETING_NEW_PEOPLE_GOAL_IDS.background]: {
      pass: 'Shares plausible personal context (place, work, or situation).',
      partial: 'Very generic or single-word answers only.',
      fail: 'No background signal.',
    },
    [MEETING_NEW_PEOPLE_GOAL_IDS.followUp]: {
      pass: 'Follow-up question or engaged reaction that moves the chat.',
      partial: 'Only short acknowledgements.',
      fail: 'No follow-up curiosity.',
    },
  }
}

export function buildMeetingNewPeopleEvaluationContract(params: {
  level: MeetingNewPeopleLevel
  subType: MeetingNewPeopleSubtype
  variation: MeetingNewPeopleVariation
}): ScenarioEvaluationContract {
  const varNl =
    params.variation === 'introductions'
      ? 'A — voorstellen en basisinfo'
      : params.variation === 'background'
        ? 'B — achtergrond en context'
        : 'C — vervolgvragen en doorpraten'
  const subNl =
    params.subType === 'social_event'
      ? 'sociaal feest / netwerk'
      : params.subType === 'work_introduction'
        ? 'werk — eerste kennismaking'
        : 'informele ontmoeting'

  return {
    schemaVersion: 1,
    variationId: `${params.subType}__${params.variation}`,
    variationTitle: `Nieuwe mensen ontmoeten — ${subNl} · ${varNl}`,
    userGoalSummary:
      'Realistisch iemand nieuw leren kennen in het Nederlands: voorstellen, kort over jezelf, en natuurlijk doorvragen — gestructureerder dan small talk, maar geen harde checklist.',
    completionRequiredPassGoalIds: [MEETING_NEW_PEOPLE_GOAL_IDS.introBalance],
    recapHooksPositive: [
      'Je stelde jezelf helder voor en bleef in het gesprek.',
      'Je gaf genoeg context zodat de ander kon inhaken.',
    ],
    recapHooksImprove: [
      'Voeg één concrete vervolgvraag toe (“Hoe lang woon je hier al?”).',
      'Zeg achtergrond in een volle zin (“Ik woon in Amsterdam”) i.p.v. losse woorden.',
    ],
    coachingHooks: [
      'Mini-drill: zeg je intro in 2 zinnen — naam + één feitje.',
      'Oefen 3 vervolgvragen hardop: “Wat doe je precies?”, “Werk je hier in de buurt?”, “Hoe bevalt het hier?”.',
    ],
    goalRubrics: rubric(),
  }
}

/** Extra LLM contract block appended to scenario context for Speak Live. */
export function buildMeetingNewPeopleSpeakLiveLlmContract(runtime: ScenarioRuntimeConfig): string {
  const p = runtime.persona && typeof runtime.persona === 'object' ? (runtime.persona as Record<string, string>) : {}
  const setting = typeof p.setting === 'string' ? p.setting : 'mixed setting'
  const personType = typeof p.personType === 'string' ? p.personType : 'peer'
  const contextHint = typeof p.contextHint === 'string' ? p.contextHint : 'neutral'
  const variation = typeof p.variation === 'string' ? p.variation : 'introductions'
  return [
    'SPEAK LIVE — NIEUWE MENSEN ONTMOETEN (Nederlands, taaloefening):',
    `- Geen docent: geen grammaticauitleg in assistantText; geen woordenlijsten; geen “laten we oefenen”.`,
    `- Kennismaking: in je eerste of vroege assistent-beurt noem je je eigen voornaam (“Hoi, ik ben …”) vóór je vraagt hoe iemand hier is gekomen of alleen doorvraagt — modelleer wat de oefenaar in het echt zou horen, tenzij Mem+recent je naam al vastlegt.`,
    `- Geheugen (Mem + recent): als de oefenaar naam, herkomst of werk al noemde, onthoud dat impliciet — kort terugverwijzen (“Ah, Zuid-Afrika — …”) i.p.v. opnieuw “waar kom je vandaan?” of “hoe heet je?” te vragen; stel een nieuwe, aansluitende vraag.`,
    `- Wederkerigheid: als de oefenaar jou een vraag stelt (ook informeel), antwoord eerst kort in de rol; ga niet door met alleen een nieuwe vraag. Een beurt met alleen reactie + korte opmerking (zonder nieuwe vraag) is oké — geen interviewrobot.`,
    `- Zachte boog (geen dwangvolgorde): opening → korte achtergrond → vervolgvraag → eventueel rustig afsluiten — stappen mogen overslaan of herhalen als het natuurlijk voelt.`,
    `- Setting / type / context (intern): ${setting} · ${personType} · ${contextHint} — subtiel laten merken, niet als script voorlezen.`,
    `- Variatie-focus (intern): ${variation} — laat dit de toon sturen (meer voorstellen vs meer doorvragen), maar forceer geen strak schema.`,
    `- Vervolgvraag: minstens één echte vervolgvraag binnen elke twee assistent-beurten (tenzij de gebruiker net een directe vraag stelt — antwoord eerst kort).`,
    `- Reactie eerst: vaak korte sociale reactie (“Oh leuk”, “Ah nice”, “Interessant”) vóór een nieuwe vraag.`,
    `- Balans: laat de oefenaar ook praten — geen interview; max één vraag per beurt tenzij het antwoord heel kort is.`,
    `- Lichte wrijving (max één tegelijk): iets korter antwoord, neutrale toon, mini-pauze, of klein misverstand — daarna vriendelijk door.`,
    `- Niveau: volg runtime level hints in context — A1 korter en langzamer; B1 vlotter met lichte topic-shifts.`,
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

export function meetingNewPeopleCompletionContractSatisfied(
  runtime: ScenarioRuntimeConfig | null | undefined,
  completedGoalLabels: string[],
): boolean {
  if (runtime?.id !== MEETING_NEW_PEOPLE_SCENARIO_ID) return false
  const goals = runtime.goals ?? []
  const completed = new Set(completedGoalLabels.map(norm))
  const req = runtime.evaluationContract?.completionRequiredPassGoalIds ?? []
  for (const id of req) {
    if (!hasCompletedLabel(completed, goals, id)) return false
  }
  return true
}

export function inferMeetingNewPeopleGoalLabelsFromUserText(scenarioGoals: string[], userLines: string[]): string[] {
  const joined = userLines.join(' ').toLowerCase()
  const out = new Set<string>()
  for (const g of scenarioGoals) {
    const gl = g.toLowerCase()
    if (gl.includes('voorstel') || gl.includes('beurt')) {
      if (/\b(ik ben|mijn naam|hoi|hallo|dag|heet je|kennis|leuk je)\b/i.test(joined)) out.add(g)
    }
    if (gl.includes('achtergrond') || gl.includes('woon') || gl.includes('werk')) {
      if (/\b(woon|werk|kom uit|verhuis|studie|it|kantoor|amsterdam|rotterdam|hier)\b/i.test(joined)) out.add(g)
    }
    if (gl.includes('vervolg') || gl.includes('nieuwsgierig')) {
      if (/\?/.test(joined) || /\b(hoe lang|wat doe|waar werk|vind je|bevalt|precies)\b/i.test(joined)) out.add(g)
    }
  }
  return [...out]
}

export function buildMeetingNewPeopleRecapHookBundle(params: {
  contractMet: boolean
  completedGoalLabels: string[]
  missedGoalLabels: string[]
}): { positive: string[]; improve: string[]; coachingHooks: string[] } {
  const positive: string[] = []
  const improve: string[] = []
  if (params.contractMet) {
    positive.push('Je haalde de basis: je bleef actief in het gesprek.')
  } else {
    improve.push('Probeer minstens twee korte beurten achter elkaar mee te doen — dan voelt de kennismaking echt.')
  }
  if (params.completedGoalLabels.some((g) => g.toLowerCase().includes('vervolg'))) {
    positive.push('Je stuurde met een vervolgvraag of echte interesse — goed voor nieuwe contacten.')
  } else {
    improve.push('Voeg een gerichte vervolgvraag toe op wat ze net zeiden.')
  }
  if (params.completedGoalLabels.some((g) => g.toLowerCase().includes('achtergrond'))) {
    positive.push('Je gaf genoeg houvast over jezelf (plek/werk/situatie).')
  } else {
    improve.push('Noem kort waar je vandaan komt of wat je doet — één heldere zin is genoeg.')
  }
  const coachingHooks = [
    'Herhaal de laatste assistentvraag en beantwoord die in twee korte zinnen.',
    'Noteer drie “B1”-vervolgvragen en kies er één voor je volgende sessie.',
  ]
  return { positive, improve, coachingHooks }
}
