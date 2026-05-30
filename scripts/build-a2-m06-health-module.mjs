/**
 * Generates content/modules/a2-m06-health-doctor/module.json
 * Run: node scripts/build-a2-m06-health-module.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { makeLessonsL2to11 } from './m06-lessons-L2-L11.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '../content/modules/a2-m06-health-doctor')
const outFile = path.join(outDir, 'module.json')

const MC = (id, q, opts, ans) => ({
  id,
  question: q,
  difficulty: 'A2_low',
  metadata: {},
  type: 'multiple_choice',
  options: opts,
  correctAnswer: ans,
})
const FB = (id, q, opts, ans) => ({
  id,
  question: q,
  difficulty: 'A2_low',
  metadata: {},
  type: 'fill_blank',
  options: opts,
  correctAnswer: ans,
})
const RO = (id, tokens, ans) => ({
  id,
  question: 'Zet in de juiste volgorde.',
  difficulty: 'A2_low',
  metadata: {},
  type: 'reorder',
  options: tokens,
  correctAnswer: ans,
})

function previewStep(id, prompt, words) {
  return {
    id: `${id}-preview`,
    prompt,
    content: {
      previewItems: words.map((w, i) => ({
        id: `${id}-pv-${i + 1}`,
        word: w.word,
        lemma: w.lemma,
        translationEn: w.en,
        emoji: w.emoji,
      })),
    },
    interactionConfig: { requireAllPreviewPlayed: true },
    metadata: {},
    type: 'preview',
  }
}

function listeningStep(id, prompt, dialogue, exercises, hide = true) {
  return {
    id: `${id}-listen`,
    prompt,
    content: { dialogue, ...(hide ? { hideTranscriptUntilPlayed: true } : {}) },
    feedbackConfig: { errorTags: ['listening'] },
    exercises,
    metadata: {},
    type: 'listening',
  }
}

function listenReadStep(id, prompt, dialogue, exercises) {
  return {
    id: `${id}-lr`,
    prompt,
    content: { dialogue },
    feedbackConfig: { errorTags: ['listening'] },
    exercises,
    metadata: {},
    type: 'listen_read',
  }
}

function discoveryStep(id, prompt, phrases) {
  return {
    id: `${id}-disc`,
    prompt,
    content: { phrases },
    metadata: {},
    type: 'discovery',
  }
}

function practiceLoop(id, prompt, lemmas, exercises, layer = 'm06-v1') {
  return {
    id,
    prompt,
    content: { lemmas },
    interactionConfig: { delimiter: ' ' },
    feedbackConfig: { errorTags: ['grammar'] },
    exercises,
    metadata: { depthLayer: layer },
    type: 'practice_loop',
  }
}

function grammarCard(id, prompt, title, summary, examples) {
  return {
    id,
    prompt,
    content: { title, summary, examples },
    feedbackConfig: { hint: 'Korte, duidelijke zinnen. Bij arts/apotheek: vaak u + alstublieft.' },
    metadata: {},
    type: 'grammar_card',
  }
}

function speak(id, prompt, targetNl, acceptable, mock) {
  return {
    id,
    prompt,
    content: { targetNl, acceptable, maxRecordingSeconds: 28 },
    interactionConfig: { requiresMicrophone: false, mockTranscript: mock },
    metadata: {},
    type: 'speaking',
  }
}

function writingStep(id, prompt, wprompt, acceptable, modelNl, minChars) {
  return {
    id,
    prompt,
    content: { prompt: wprompt, acceptable, modelNl, minChars },
    metadata: {},
    type: 'writing',
  }
}

function scenarioChat(id, prompt, dialogue, exercises) {
  return {
    id,
    prompt,
    content: { dialogue },
    interactionConfig: { mode: 'text_only' },
    feedbackConfig: { errorTags: ['listening'] },
    exercises,
    metadata: {},
    type: 'scenario_chat',
  }
}

function recapStep(id, lemmas, tasks) {
  return {
    id: `${id}-recap`,
    prompt: 'Recap — even herhalen',
    content: { lemmas, tasks },
    metadata: {},
    type: 'recap',
  }
}

const MID = 'a2-m06-health-doctor'
const meta = { stage6: true, schemaPlayer: true, lessonDepth: { m06: 'v1', targetMicroInteractions: '26-40' } }

function lessonBase(i, rest) {
  return {
    moduleId: MID,
    cefrLevel: 'A2',
    durationEstimate: 14,
    metadata: meta,
    mistakeFocus: ['word-order', 'vocab', 'listening-gist'],
    ...rest,
    order: i,
  }
}

// ——— Lesson 1: At the doctor — gist
const L1 = lessonBase(0, {
  id: 'a2-m06-l01-listening-doctor-gist',
  title: 'Listening · At the doctor · catch the situation',
  lessonType: 'input',
  grammarTargets: ['a2.2-health-symptoms', 'a2.2-health-questions'],
  vocabTargets: ['lemma-voelen', 'lemma-ziek', 'lemma-pijn', 'lemma-huisarts', 'lemma-hoofdpijn'],
  canDoStatements: [
    'I can follow a short doctor-patient exchange and identify the main problem and next step.',
  ],
  steps: [
    previewStep('m06-l01', 'Warm-up — 5 woorden (rustig aan)', [
      { word: 'voelen', lemma: 'voelen', en: 'to feel', emoji: '🙂' },
      { word: 'ziek', lemma: 'ziek', en: 'ill / sick', emoji: '🤒' },
      { word: 'pijn', lemma: 'pijn', en: 'pain', emoji: '⚡' },
      { word: 'huisarts', lemma: 'huisarts', en: 'GP', emoji: '👩‍⚕️' },
      { word: 'hoofdpijn', lemma: 'hoofdpijn', en: 'headache', emoji: '🧠' },
    ]),
    listeningStep(
      'm06-l01',
      'Input — spreekuur (neem de tijd)',
      [
        { speaker: 'Huisarts', nl: 'Goedemiddag. Wat kan ik voor u doen?', en: 'Good afternoon. What can I do for you?' },
        { speaker: 'Jeroen', nl: 'Ik voel me niet lekker. Ik heb al twee dagen hoofdpijn.', en: "I don't feel well. I've had a headache for two days already." },
        { speaker: 'Huisarts', nl: 'Oké. Heeft u ook koorts?', en: 'Okay. Do you also have a fever?' },
        { speaker: 'Jeroen', nl: 'Ja, gisteren wel. Vannacht heb ik slecht geslapen.', en: 'Yes, yesterday I did. Last night I slept badly.' },
        { speaker: 'Huisarts', nl: 'Waar doet het precies pijn?', en: 'Where exactly does it hurt?' },
        { speaker: 'Jeroen', nl: 'Vooral hier, bij mijn voorhoofd.', en: 'Mainly here, on my forehead.' },
        { speaker: 'Huisarts', nl: 'Begrijpelijk. U mag even rusten en veel water drinken. Belt u terug als het erger wordt.', en: "Understood. You may rest and drink plenty of water. Call back if it gets worse." },
      ],
      [
        MC('m06-l01-l1', 'Waar is het gesprek?', ['Bij de huisarts / spreekuur', 'In de supermarkt', 'Op het station'], 'Bij de huisarts / spreekuur'),
        MC('m06-l01-l2', 'Wat is het hoofdprobleem van Jeroen?', ['Hij voelt zich niet lekker + hoofdpijn', 'Hij wil op vakantie', 'Hij zoekt werk'], 'Hij voelt zich niet lekker + hoofdpijn'),
        MC('m06-l01-l3', 'Hoe lang al hoofdpijn?', ['Al twee dagen', 'Eén minuut', 'Eén jaar'], 'Al twee dagen'),
        MC('m06-l01-l4', 'Vraagt de arts over koorts?', ['Ja', 'Nee, over de auto', 'Nee, over voetbal'], 'Ja'),
        MC('m06-l01-l5', 'Wat zegt Jeroen over slapen?', ['Slecht geslapen vannacht', 'Perfect geslapen', 'Hij werkt nachtdienst'], 'Slecht geslapen vannacht'),
        MC('m06-l01-l6', 'Wat adviseert de arts als eerste?', ['Rust + water drinken; bellen als het erger wordt', 'Direct naar het ziekenhuis', 'Niets'], 'Rust + water drinken; bellen als het erger wordt'),
      ]
    ),
    discoveryStep('m06-l01', 'Herken bruikbare zinnen', [
      { nl: 'Ik voel me niet lekker.', en: "I don't feel well.", focus: 'voelen' },
      { nl: 'Ik heb hoofdpijn.', en: 'I have a headache.', focus: 'hebben' },
      { nl: 'Heeft u ook koorts?', en: 'Do you also have a fever?', focus: 'vraag' },
      { nl: 'Waar doet het pijn?', en: 'Where does it hurt?', focus: 'pijn' },
    ]),
    practiceLoop(
      'm06-l01-pl1',
      'Practice — 6×',
      ['hoofdpijn', 'koorts', 'voelen'],
      [
        MC('m06-l01-a1', 'Natuurlijke openingszin bij de arts', ['Ik voel me niet lekker.', 'Ik koop een fiets.', 'Het weer is mooi.'], 'Ik voel me niet lekker.'),
        FB('m06-l01-a2', 'Ik heb ___ . (hoofd)', ['hoofdpijn', 'brood', 'trein'], 'hoofdpijn'),
        RO('m06-l01-a3', ['lekker.', 'niet', 'voel', 'Ik', 'me'], 'Ik voel me niet lekker.'),
        MC('m06-l01-a4', '“Koorts” betekent', ['Verhoging / je bent warm-ziek', 'Je bent blij', 'Je bent te laat'], 'Verhoging / je bent warm-ziek'),
        MC('m06-l01-a5', 'Beleefde patiënt', ['Ja, sinds gisteren.', 'Ja, en jij bent raar.', 'Nee, nooit.'], 'Ja, sinds gisteren.'),
        MC('m06-l01-a6', 'Wie is “huisarts”?', ['Eerste dokter in de buurt / GP', 'Tandarts', 'Kapper'], 'Eerste dokter in de buurt / GP'),
      ]
    ),
    practiceLoop(
      'm06-l01-pl2',
      'Variatie — 7×',
      ['pijn', 'rust', 'drinken'],
      [
        FB('m06-l01-b1', 'Waar doet het ___?', ['pijn', 'brood', 'boek'], 'pijn'),
        RO('m06-l01-b2', ['dagen.', 'twee', 'al', 'Ik heb', 'hoofdpijn'], 'Ik heb al twee dagen hoofdpijn.'),
        MC('m06-l01-b3', '“U mag rust nemen” ≈', ['U mag uitrusten', 'U moet rennen', 'U mag niet slapen'], 'U mag uitrusten'),
        MC('m06-l01-b4', 'Goede check-vraag van arts', ['Hoe lang al?', 'Wat is uw lievelingskleur?', 'Waar woont u precies?'], 'Hoe lang al?'),
        MC('m06-l01-b5', 'Jeroen: waar pijn?', ['Voorhoofd', 'In de tas', 'Op het dak'], 'Voorhoofd'),
        FB('m06-l01-b6', 'Ik heb slecht ___. (slapen)', ['geslapen', 'gegeten', 'gewerkt'], 'geslapen'),
        MC('m06-l01-b7', 'Wat is slim om te doen?', ['Veel water drinken', 'Geen water', 'Alleen koffie'], 'Veel water drinken'),
      ]
    ),
    speak('m06-l01-sp1', 'Zeg hardop', 'Ik voel me niet lekker.', ['Ik voel me niet lekker', 'ik voel me niet lekker'], 'Ik voel me niet lekker'),
    speak('m06-l01-sp2', 'Zeg hardop', 'Ik heb hoofdpijn.', ['Ik heb hoofdpijn', 'ik heb hoofdpijn'], 'Ik heb hoofdpijn'),
    speak('m06-l01-sp3', 'Zeg hardop', 'Heeft u ook koorts?', ['Heeft u ook koorts', 'heeft u ook koorts'], 'Heeft u ook koorts'),
    recapStep('m06-l01', ['hoofdpijn', 'voelen', 'huisarts'], [
      { kind: 'fill_blank', sentence: 'Ik ___ me niet lekker.', options: ['voel', 'eet', 'koop'], correctAnswer: 'voel' },
      { kind: 'reorder', tokens: ['hoofdpijn.', 'heb', 'Ik'], correctAnswer: 'Ik heb hoofdpijn.' },
      { kind: 'speak', prompt: 'Zeg: *Waar doet het pijn?*', targetNl: 'Waar doet het pijn?', mockPass: true },
      { kind: 'fill_blank', sentence: 'Ik heb al twee ___ hoofdpijn.', options: ['dagen', 'katten', 'treinen'], correctAnswer: 'dagen' },
      { kind: 'listen_mcq', question: 'Snippet:', snippetNl: 'U mag even rusten.', options: ['Advies om uit te rusten', 'U moet werken', 'Bel de politie'], correctAnswer: 'Advies om uit te rusten' },
      { kind: 'speak', prompt: 'Zeg: *Ik heb ook koorts.*', targetNl: 'Ik heb ook koorts.', mockPass: true },
    ]),
  ],
})

const helperBag = {
  MC,
  FB,
  RO,
  previewStep,
  listeningStep,
  listenReadStep,
  discoveryStep,
  practiceLoop,
  grammarCard,
  speak,
  writingStep,
  scenarioChat,
  recapStep,
  lessonBase,
  MID,
}

const lessons = [L1, ...makeLessonsL2to11(helperBag)]

const grammarTargets = [
  {
    id: 'a2.2-health-symptoms',
    name: 'Symptomen: ik heb … / ik voel me …',
    description: 'Hoofdpijn, buikpijn, moe, ziek voelen; korte klachten.',
    examples: [
      { nl: 'Ik heb keelpijn.', en: 'I have a sore throat.' },
      { nl: 'Ik voel me moe.', en: 'I feel tired.' },
    ],
    cefrLevel: 'A2',
    rules: { pattern: 'Ik heb + ziekte; Ik voel me + bijvoeglijk naamwoord.' },
    metadata: { module: MID },
  },
  {
    id: 'a2.2-health-questions',
    name: 'Vragen bij de arts: sinds wanneer, waar, hoe lang',
    description: 'Sinds wanneer? Waar doet het pijn? Hoe lang al?',
    examples: [
      { nl: 'Sinds wanneer heeft u dit?', en: 'Since when have you had this?' },
      { nl: 'Hoe lang al?', en: 'How long already?' },
    ],
    cefrLevel: 'A2',
    rules: {},
    metadata: { module: MID },
  },
  {
    id: 'a2.2-health-modals',
    name: 'Moet / mag / kan (advies en instructie)',
    description: 'U moet …, u mag …, u kunt … in eenvoudige adviezen.',
    examples: [
      { nl: 'U moet rust nemen.', en: 'You must rest.' },
      { nl: 'U mag twee tabletten per dag.', en: 'You may take two tablets a day.' },
    ],
    cefrLevel: 'A2',
    rules: {},
    metadata: { module: MID },
  },
  {
    id: 'a2.2-health-perfectum-light',
    name: 'Perfectum (licht): slecht geslapen, gehad',
    description: 'Hoge frequentie: ik heb … gehad / geslapen.',
    examples: [
      { nl: 'Ik heb slecht geslapen.', en: 'I slept badly.' },
      { nl: 'Ik heb al koorts gehad.', en: 'I have already had a fever.' },
    ],
    cefrLevel: 'A2',
    rules: {},
    metadata: { module: MID },
  },
  {
    id: 'a2.2-health-clarify',
    name: 'Hulp vragen: herhalen, langzamer, begrijpen',
    description: 'Kunt u dat herhalen? Ik begrijp het niet.',
    examples: [
      { nl: 'Kunt u dat herhalen, alstublieft?', en: 'Could you repeat that, please?' },
      { nl: 'Kunt u langzamer praten?', en: 'Can you speak more slowly?' },
    ],
    cefrLevel: 'A2',
    rules: {},
    metadata: { module: MID },
  },
]

const vocabTargets = [
  { id: 'lemma-voelen', word: 'voelen', lemma: 'voelen', translation: 'to feel', partOfSpeech: 'verb', metadata: { module: MID } },
  { id: 'lemma-ziek', word: 'ziek', lemma: 'ziek', translation: 'ill / sick', partOfSpeech: 'adj', metadata: { module: MID } },
  { id: 'lemma-pijn', word: 'pijn', lemma: 'pijn', translation: 'pain', partOfSpeech: 'noun', metadata: { module: MID } },
  { id: 'lemma-huisarts', word: 'huisarts', lemma: 'huisarts', translation: 'GP / family doctor', partOfSpeech: 'noun', metadata: { module: MID } },
  { id: 'lemma-hoofdpijn', word: 'hoofdpijn', lemma: 'hoofdpijn', translation: 'headache', partOfSpeech: 'noun', metadata: { module: MID } },
  { id: 'lemma-buikpijn', word: 'buikpijn', lemma: 'buikpijn', translation: 'stomach ache', partOfSpeech: 'noun', metadata: { module: MID } },
  { id: 'lemma-keelpijn', word: 'keelpijn', lemma: 'keelpijn', translation: 'sore throat', partOfSpeech: 'noun', metadata: { module: MID } },
  { id: 'lemma-moe', word: 'moe', lemma: 'moe', translation: 'tired', partOfSpeech: 'adj', metadata: { module: MID } },
  { id: 'lemma-koorts', word: 'koorts', lemma: 'koorts', translation: 'fever', partOfSpeech: 'noun', metadata: { module: MID } },
  { id: 'lemma-niesen', word: 'niesen', lemma: 'niesen', translation: 'to sneeze', partOfSpeech: 'verb', metadata: { module: MID } },
  { id: 'lemma-hoesten', word: 'hoesten', lemma: 'hoesten', translation: 'to cough', partOfSpeech: 'verb', metadata: { module: MID } },
  { id: 'lemma-apotheek', word: 'apotheek', lemma: 'apotheek', translation: 'pharmacy', partOfSpeech: 'noun', metadata: { module: MID } },
  { id: 'lemma-medicijn', word: 'medicijn', lemma: 'medicijn', translation: 'medicine', partOfSpeech: 'noun', metadata: { module: MID } },
  { id: 'lemma-tablet', word: 'tablet', lemma: 'tablet', translation: 'tablet / pill', partOfSpeech: 'noun', metadata: { module: MID } },
  { id: 'lemma-recept', word: 'recept', lemma: 'recept', translation: 'prescription', partOfSpeech: 'noun', metadata: { module: MID } },
  { id: 'lemma-afspraak-m6', word: 'afspraak', lemma: 'afspraak', translation: 'appointment', partOfSpeech: 'noun', metadata: { module: MID } },
  { id: 'lemma-rust', word: 'rust', lemma: 'rust', translation: 'rest', partOfSpeech: 'noun', metadata: { module: MID } },
  { id: 'lemma-herhalen', word: 'herhalen', lemma: 'herhalen', translation: 'to repeat', partOfSpeech: 'verb', metadata: { module: MID } },
  { id: 'lemma-begrijpen-m6', word: 'begrijpen', lemma: 'begrijpen', translation: 'to understand', partOfSpeech: 'verb', metadata: { module: MID } },
  { id: 'lemma-drinken-m6', word: 'drinken', lemma: 'drinken', translation: 'to drink', partOfSpeech: 'verb', metadata: { module: MID } },
  { id: 'lemma-eten-m6', word: 'eten', lemma: 'eten', translation: 'to eat / food', partOfSpeech: 'verb', metadata: { module: MID } },
  { id: 'lemma-sinds', word: 'sinds', lemma: 'sinds', translation: 'since', partOfSpeech: 'prep', metadata: { module: MID } },
  { id: 'lemma-gisteren-m6', word: 'gisteren', lemma: 'gisteren', translation: 'yesterday', partOfSpeech: 'adv', metadata: { module: MID } },
  { id: 'lemma-vannacht', word: 'vannacht', lemma: 'vannacht', translation: 'last night', partOfSpeech: 'adv', metadata: { module: MID } },
  { id: 'lemma-lichaam', word: 'lichaam', lemma: 'lichaam', translation: 'body', partOfSpeech: 'noun', metadata: { module: MID } },
  { id: 'lemma-rug', word: 'rug', lemma: 'rug', translation: 'back', partOfSpeech: 'noun', metadata: { module: MID } },
  { id: 'lemma-keel', word: 'keel', lemma: 'keel', translation: 'throat', partOfSpeech: 'noun', metadata: { module: MID } },
  { id: 'lemma-maag', word: 'maag', lemma: 'maag', translation: 'stomach', partOfSpeech: 'noun', metadata: { module: MID } },
  { id: 'lemma-ochtend', word: 'ochtend', lemma: 'ochtend', translation: 'morning', partOfSpeech: 'noun', metadata: { module: MID } },
  { id: 'lemma-avond', word: 'avond', lemma: 'avond', translation: 'evening', partOfSpeech: 'noun', metadata: { module: MID } },
  { id: 'lemma-moeten-m6', word: 'moeten', lemma: 'moeten-m6', translation: 'must / have to', partOfSpeech: 'verb', metadata: { module: MID } },
  { id: 'lemma-mogen-m6', word: 'mogen', lemma: 'mogen-m6', translation: 'may / be allowed', partOfSpeech: 'verb', metadata: { module: MID } },
  { id: 'lemma-kunnen-m6', word: 'kunnen', lemma: 'kunnen-m6', translation: 'can / be able', partOfSpeech: 'verb', metadata: { module: MID } },
  { id: 'lemma-uitleggen-m6', word: 'uitleggen', lemma: 'uitleggen-m6', translation: 'to explain', partOfSpeech: 'verb', metadata: { module: MID } },
  { id: 'lemma-duidelijk-m6', word: 'duidelijk', lemma: 'duidelijk-m6', translation: 'clear', partOfSpeech: 'adj', metadata: { module: MID } },
  { id: 'lemma-langzaam-m6', word: 'langzaam', lemma: 'langzaam-m6', translation: 'slow', partOfSpeech: 'adj', metadata: { module: MID } },
  { id: 'lemma-bericht-m6', word: 'bericht', lemma: 'bericht-m6', translation: 'message', partOfSpeech: 'noun', metadata: { module: MID } },
  { id: 'lemma-morgen-m6', word: 'morgen', lemma: 'morgen-m6', translation: 'tomorrow', partOfSpeech: 'adv', metadata: { module: MID } },
]

function buildModule(allLessons) {
  return {
    id: MID,
    title: 'Health & doctor visits',
    band: 'A2.2',
    description:
      'A2.2 Independence: symptoms, GP and pharmacy talk, appointments, simple instructions (moet/mag), clarifying questions — calm, practical Dutch for expats.',
    order: 5,
    lessons: allLessons,
    grammarTargets,
    vocabTargets,
    learningGoals: [
      'Describe simple symptoms and say what hurts in Dutch',
      'Handle a short GP or pharmacy conversation with confidence',
      'Ask for repetition and understand basic medicine instructions',
    ],
    metadata: {
      stage6: true,
      schemaPlayer: true,
      lessonDepth: { m06: 'v1', targetMicroInteractions: '26-40' },
      contentVersion: 'm06-v1',
      generatedAt: new Date().toISOString(),
    },
  }
}

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outFile, JSON.stringify(buildModule(lessons), null, 2), 'utf8')
console.log('Wrote', outFile, 'lessons:', lessons.length)
