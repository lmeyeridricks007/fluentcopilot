/**
 * Seeded A2 Dutch speaking training items — validated against `speakingTrainingItemSchema`.
 */
import { speakingTrainingItemSchema, type SpeakingTrainingItem } from '@/lib/schemas/exam/speakingTrainingItem.schema'

const RAW: unknown[] = [
  {
    id: 'st-speaking-pref-01',
    subtype: 'preference',
    exerciseSubtypeKey: 'preference_question',
    promptDutch: 'Reist u liever met de trein of met de auto? Vertel ook waarom.',
    instructionNl: 'Beantwoord in het Nederlands. Geef een voorkeur en een korte reden.',
    trainingTipsNl: 'Gebruik bijvoorbeeld: Ik ga liever met … omdat …',
    modelAnswerDutch:
      'Ik ga liever met de trein, omdat dat rustiger is en ik geen parkeerplaats hoef te zoeken. Met de auto ben ik soms sneller, maar de trein is prettiger voor mij.',
    modelAnswerNoteEn: 'States a clear preference and gives two concrete reasons — typical A2 depth.',
    topicKeywords: ['trein', 'auto', 'reizen'],
    expectsReason: true,
    scenarioGroupId: 'transport',
    difficultyBand: 2,
  },
  {
    id: 'st-speaking-pref-02',
    subtype: 'preference',
    exerciseSubtypeKey: 'preference_question',
    promptDutch: 'Wat voor fruit eet u graag? Vertel ook hoe vaak u fruit eet.',
    instructionNl: 'Noem voorkeur en frequentie (bijvoorbeeld elke dag / twee keer per week).',
    trainingTipsNl: 'Combineer: Ik eet graag … en ik eet bijna elke dag fruit.',
    modelAnswerDutch:
      'Ik eet graag appels en bananen. Ik eet bijna elke dag een stuk fruit, meestal bij de lunch.',
    modelAnswerNoteEn: 'Answers both parts of the prompt directly.',
    topicKeywords: ['fruit', 'eten', 'appel', 'banaan'],
    expectsReason: true,
    scenarioGroupId: 'daily_life',
    difficultyBand: 1,
  },
  {
    id: 'st-speaking-routine-01',
    subtype: 'routine',
    exerciseSubtypeKey: 'daily_life_question',
    promptDutch: 'Wat doet u meestal in het weekend? Vertel ook met wie u dat doet.',
    instructionNl: 'Beschrijf uw weekend in een paar zinnen.',
    trainingTipsNl: 'Denk aan: rust, familie, boodschappen, sport.',
    modelAnswerDutch:
      'In het weekend rust ik vaak uit. Op zaterdag ga ik meestal boodschappen doen met mijn partner. Op zondag bezoeken we soms familie.',
    topicKeywords: ['weekend', 'zaterdag', 'zondag', 'rust'],
    expectsReason: false,
    scenarioGroupId: 'daily_life',
    difficultyBand: 2,
  },
  {
    id: 'st-speaking-routine-02',
    subtype: 'routine',
    exerciseSubtypeKey: 'daily_life_question',
    promptDutch: 'Hoe ziet uw ochtend eruit op een werkdag? Vertel ook hoe laat u ongeveer vertrekt.',
    instructionNl: 'Loop uw ochtend kort door (ontbijt, reis, tijd).',
    trainingTipsNl: 'Gebruik simpele tijdsaanduidingen: om acht uur, daarna, dan …',
    modelAnswerDutch:
      'Ik sta om half zeven op en drink koffie. Daarna douche ik en ontbijt ik. Rond half negen vertrek ik naar mijn werk met de bus.',
    topicKeywords: ['ochtend', 'werk', 'ontbijt', 'vertrek'],
    expectsReason: false,
    scenarioGroupId: 'work',
    difficultyBand: 2,
  },
  {
    id: 'st-speaking-opinion-01',
    subtype: 'opinion',
    exerciseSubtypeKey: 'opinion_with_reason',
    promptDutch: 'Hoe vindt u het weer in Nederland? Vertel ook hoe het weer in uw eigen land is.',
    instructionNl: 'Geef uw mening en vergelijk kort met uw land.',
    trainingTipsNl: 'Structuur: In Nederland vind ik … In mijn land is het vaak …',
    modelAnswerDutch:
      'Ik vind het weer in Nederland vaak wisselvallig, met veel regen. In mijn land is het meestal warmer en zonniger, vooral in de zomer.',
    topicKeywords: ['weer', 'nederland', 'land', 'regen'],
    expectsReason: true,
    scenarioGroupId: 'weather',
    difficultyBand: 3,
  },
  {
    id: 'st-speaking-opinion-02',
    subtype: 'opinion',
    exerciseSubtypeKey: 'opinion_with_reason',
    promptDutch: 'Wat vindt u van openbaar vervoer in uw stad? Leg uit waarom.',
    instructionNl: 'Geef een duidelijke mening met minstens één reden.',
    trainingTipsNl: 'Structuur: Ik vind … omdat … / Ik ben tevreden omdat …',
    modelAnswerDutch:
      'Ik vind het openbaar vervoer hier best goed, omdat de bus vaak op tijd is en de haltes dichtbij zijn. Soms is het druk, maar over het algemeen ben ik tevreden.',
    topicKeywords: ['openbaar', 'vervoer', 'bus', 'stad'],
    expectsReason: true,
    scenarioGroupId: 'transport',
    difficultyBand: 3,
  },
  {
    id: 'st-speaking-explain-01',
    subtype: 'explanation',
    exerciseSubtypeKey: 'situational_answer',
    promptDutch: 'Wat wilt u leren? Vertel ook waar u dat wilt leren.',
    instructionNl: 'Noem een leerdoel en een plek of manier (cursus, werk, online).',
    trainingTipsNl: 'Bijvoorbeeld: Ik wil beter Nederlands leren op een cursus in …',
    modelAnswerDutch:
      'Ik wil beter Nederlands spreken. Ik leer nu op een cursus bij het buurtcentrum en ik oefen thuis met apps.',
    topicKeywords: ['leren', 'nederlands', 'cursus'],
    expectsReason: true,
    scenarioGroupId: 'dutch_life',
    difficultyBand: 3,
  },
  {
    id: 'st-speaking-explain-02',
    subtype: 'explanation',
    exerciseSubtypeKey: 'situational_answer',
    promptDutch: 'Waarom is het belangrijk voor u om Nederlands te leren? Geef twee redenen.',
    instructionNl: 'Schrijf of spreek twee duidelijke redenen in het Nederlands.',
    trainingTipsNl: 'Gebruik: Eerst … Daarnaast … of … en ook …',
    modelAnswerNoteEn: 'Explicitly counts two reasons — matches exam-style instruction.',
    modelAnswerDutch:
      'Nederlands is belangrijk voor mij omdat ik hier wil werken en met collega’s wil praten. Ook wil ik beter integreren en de gemeente begrijpen.',
    topicKeywords: ['nederlands', 'leren', 'belangrijk', 'werk'],
    expectsReason: true,
    scenarioGroupId: 'dutch_life',
    difficultyBand: 4,
  },
  {
    id: 'st-speaking-transport-03',
    subtype: 'routine',
    exerciseSubtypeKey: 'daily_life_question',
    promptDutch: 'Hoe gaat u meestal naar de supermarkt? Vertel ook waarom u dat zo doet.',
    instructionNl: 'Noem een manier van vervoer (lopen, fiets, bus, auto) en een korte reden.',
    trainingTipsNl: 'Bijvoorbeeld: Ik ga meestal … omdat …',
    modelAnswerDutch:
      'Ik ga meestal lopend naar de supermarkt, omdat die dichtbij is en ik geen auto nodig heb. Als het veel boodschappen zijn, neem ik soms de bus.',
    topicKeywords: ['supermarkt', 'lopen', 'bus', 'dichtbij'],
    expectsReason: true,
    scenarioGroupId: 'transport',
    difficultyBand: 1,
  },
  {
    id: 'st-speaking-weather-02',
    subtype: 'opinion',
    exerciseSubtypeKey: 'opinion_with_reason',
    promptDutch: 'Vindt u veel regen in Nederland lastig? Leg kort uit.',
    instructionNl: 'Geef uw mening en een korte uitleg.',
    trainingTipsNl: 'Structuur: Ja/nee … omdat …',
    modelAnswerDutch:
      'Ja, soms vind ik het lastig, omdat ik graag buiten ben en het dan snel nat wordt. Maar ik ben ook gewend aan regen en ik draag een jas.',
    topicKeywords: ['regen', 'nederland', 'lastig'],
    expectsReason: true,
    scenarioGroupId: 'weather',
    difficultyBand: 2,
  },
  {
    id: 'st-speaking-weather-03',
    subtype: 'routine',
    exerciseSubtypeKey: 'daily_life_question',
    promptDutch: 'Wat doet u graag als het mooi weer is? Zeg ook met wie u dat meestal doet.',
    instructionNl: 'Noem een activiteit en personen (alleen, familie, vrienden).',
    trainingTipsNl: 'Twee korte zinnen volstaan.',
    modelAnswerDutch:
      'Als het mooi weer is, wandel ik graag in het park met mijn partner. Soms picknicken we of drinken we koffie op een terras.',
    topicKeywords: ['weer', 'park', 'partner', 'wandelen'],
    expectsReason: false,
    scenarioGroupId: 'weather',
    difficultyBand: 3,
  },
  {
    id: 'st-speaking-dutch-03',
    subtype: 'opinion',
    exerciseSubtypeKey: 'opinion_with_reason',
    promptDutch: 'Wat vindt u prettig aan leven in Nederland? Noem één ding en leg kort uit.',
    instructionNl: 'Kies één punt (veiligheid, mensen, fietsen, regels) en motiveer.',
    trainingTipsNl: 'Eerst wat u prettig vindt, daarna waarom.',
    modelAnswerDutch:
      'Ik vind het prettig dat Nederland over het algemeen veilig en georganiseerd is. Daardoor voel ik me rustiger in het dagelijks leven.',
    topicKeywords: ['nederland', 'prettig', 'leven', 'veilig'],
    expectsReason: true,
    scenarioGroupId: 'dutch_life',
    difficultyBand: 1,
  },
]

function parseBank(): SpeakingTrainingItem[] {
  const out: SpeakingTrainingItem[] = []
  for (const row of RAW) {
    const p = speakingTrainingItemSchema.safeParse(row)
    if (p.success) out.push(p.data)
  }
  return out
}

export const SPEAKING_TRAINING_BANK: SpeakingTrainingItem[] = parseBank()

export const SPEAKING_TRAINING_SUBTYPE_LABELS: Record<
  SpeakingTrainingItem['subtype'],
  { nl: string; en: string }
> = {
  preference: { nl: 'Voorkeur', en: 'Preference' },
  routine: { nl: 'Routine / dagelijks leven', en: 'Daily routine' },
  opinion: { nl: 'Mening', en: 'Opinion' },
  explanation: { nl: 'Uitleg', en: 'Explanation' },
}
