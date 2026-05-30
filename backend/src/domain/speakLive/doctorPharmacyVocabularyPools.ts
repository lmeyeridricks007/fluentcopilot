/**
 * Structured Dutch vocabulary for Doctor / pharmacy — symptoms, body wording,
 * help requests, instruction phrases, and learner starters by variation × level.
 */

export type DoctorPharmacyLearnerLevel = 'A1' | 'A2' | 'B1'

export type DoctorPharmacyStarterVariation = 'symptoms' | 'asking_for_help' | 'understanding_instructions'

/** Part 1 — symptom lexicon (realistic, short). */
export const DOCTOR_PHARMACY_SYMPTOM_TERMS_NL = [
  'hoofdpijn',
  'keelpijn',
  'buikpijn',
  'hoest',
  'koorts',
  'misselijk',
  'duizelig',
  'moe',
  'verkouden',
  'allergie',
] as const

/** Part 2 — body / problem wording (phrases). */
export const DOCTOR_PHARMACY_BODY_PROBLEM_PHRASES_NL = [
  'mijn keel',
  'mijn hoofd',
  'mijn buik',
  'ik voel me niet goed',
  'ik heb pijn',
  'het doet pijn',
] as const

/** Part 3 — help request fragments (for prompts + hulpcontext-style lines). */
export const DOCTOR_PHARMACY_HELP_REQUEST_PHRASES_NL = [
  'iets tegen hoofdpijn',
  'afspraak maken',
  'hulp nodig',
  'wat kan ik doen',
  'moet ik naar de dokter',
  'kan ik dit zonder recept kopen',
  'iets tegen hoest',
  'medicijn nodig',
  'kort advies',
] as const

/** Part 4 — instruction / usage language. */
export const DOCTOR_PHARMACY_INSTRUCTION_PHRASES_NL = [
  'twee keer per dag',
  'na het eten',
  'voor het slapen',
  'morgen terugkomen',
  'rust nemen',
  'met water innemen',
  'één tablet',
  'bij koorts',
] as const

/** Help-context lines rolled into “hulpcontext: …” (first line of runtime context). */
export const DOCTOR_PHARMACY_HELP_CONTEXT_SNIPPETS_NL: readonly string[] = [
  'medicijn nodig',
  'afspraak nodig',
  'kort advies wat te doen',
  'vragen of een product helpt',
  'begrijpen wat de volgende stap is',
  'iets tegen hoofdpijn nodig',
  'afspraak maken',
  'hulp nodig',
  'wat kan ik doen',
  'moet ik naar de dokter',
  'kan ik dit zonder recept kopen',
]

function dedupeHints(lines: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const l of lines) {
    const k = l.trim().toLowerCase()
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(l.trim())
  }
  return out
}

/**
 * Part 5 — starter phrases by variation × level (A1 shorter, A2 = core practice lines, B1 richer).
 * Core A2 lines match product examples; A1/B1 adapt from the same pools.
 */
export const DOCTOR_PHARMACY_LEARNER_STARTERS: Record<
  DoctorPharmacyStarterVariation,
  Record<DoctorPharmacyLearnerLevel, readonly string[]>
> = {
  symptoms: {
    A1: [
      'Ik heb hoofdpijn.',
      'Keelpijn.',
      'Ik hoest.',
      'Ik ben misselijk.',
      'Ik ben moe.',
    ],
    A2: [
      'Ik heb hoofdpijn.',
      'Mijn keel doet pijn.',
      'Ik hoest.',
      'Ik ben misselijk.',
      'Ik ben verkouden.',
    ],
    B1: [
      'Ik heb al een paar dagen last van hoofdpijn en licht misselijk.',
      'Mijn keel doet pijn en ik ben verkouden.',
      'Ik hoest sinds gisteren en het wordt niet echt beter.',
      'Ik voel me niet goed en ik denk dat ik koorts heb.',
      'Ik heb buikpijn en misschien een allergie voor iets.',
    ],
  },
  asking_for_help: {
    A1: ['Help.', 'Medicijn?', 'Afspraak?', 'Wat moet ik doen?', 'Hoofdpijn — iets ervoor?'],
    A2: [
      'Kunt u mij helpen?',
      'Heeft u iets tegen hoest?',
      'Kan ik een afspraak maken?',
      'Wat kan ik doen?',
      'Moet ik naar de dokter?',
    ],
    B1: [
      'Ik zoek iets tegen mijn hoofdpijn — wat raadt u aan?',
      'Kan ik dit zonder recept kopen, of heb ik een recept nodig?',
      'Ik wil een afspraak maken; wat is de eerste mogelijkheid?',
      'Wat kan ik het beste doen als het erger wordt?',
      'Heeft u iets tegen mijn verkoudheid en keelpijn?',
    ],
  },
  understanding_instructions: {
    A1: ['Twee keer?', 'Na eten?', 'Morgen?', 'Met water?', 'Rust?'],
    A2: [
      'Twee keer per dag?',
      'Na het eten?',
      'Dus ik kom morgen terug?',
      'Met water?',
      'Moet ik rust nemen?',
    ],
    B1: [
      'Dus voor het slapen innemen, klopt dat?',
      'Mag ik dit combineren met paracetamol, of liever niet?',
      'Als ik het goed begrijp: na het eten en met water — zo?',
      'Wat moet ik doen als ik een dosis vergeet?',
      'Kunt u nog een keer langzaam herhalen hoe vaak ik het moet nemen?',
    ],
  },
}

export function getDoctorPharmacyStarterHintsForRuntime(
  level: DoctorPharmacyLearnerLevel,
  variation?: DoctorPharmacyStarterVariation
): string[] {
  const v = variation ?? 'symptoms'
  const primary = DOCTOR_PHARMACY_LEARNER_STARTERS[v][level]
  return dedupeHints(primary).slice(0, 5)
}

/** Compact reference block appended to runtime context for the LLM (no RNG — stable catalog). */
export function doctorPharmacyVocabularyReferenceForPrompt(): string {
  const join = (xs: readonly string[]) => xs.join(', ')
  return [
    '--- Woordenschat-pools (referentie voor de assistent) ---',
    `Symptomen (termen): ${join(DOCTOR_PHARMACY_SYMPTOM_TERMS_NL)}.`,
    `Lichaam / probleem (voorbeelden): ${join(DOCTOR_PHARMACY_BODY_PROBLEM_PHRASES_NL)}.`,
    `Hulp vragen (fragmenten): ${join(DOCTOR_PHARMACY_HELP_REQUEST_PHRASES_NL)}.`,
    `Instructietaal (fragmenten): ${join(DOCTOR_PHARMACY_INSTRUCTION_PHRASES_NL)}.`,
    'Gebruik deze lijsten alleen als inspiratie; formuleer zinnen die passen bij de run en het niveau.',
  ].join('\n')
}
