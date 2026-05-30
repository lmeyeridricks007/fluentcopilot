/**
 * Stage 6: build full 11-lesson module `a2-m01-people-daily` (People & daily rhythm, A2.1).
 * Run: npx tsx --tsconfig tsconfig.json tools/build-stage6-a2-m01-module.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { moduleSchema } from '../src/lib/schemas/module.schema'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MODULE_PATH = join(ROOT, 'content/modules/a2-m01-people-daily/module.json')

type Step = Record<string, unknown>

function prefixLessonIds(lesson: Record<string, unknown>, pre: string): void {
  const steps = lesson.steps as Step[]
  for (const step of steps) {
    if (typeof step.id === 'string') step.id = `${pre}${step.id}`
    const ex = step.exercises as Array<{ id: string }> | undefined
    if (ex) for (const e of ex) e.id = `${pre}${e.id}`
    const c = step.content as { previewItems?: Array<{ id?: string }> } | undefined
    if (c?.previewItems) for (const p of c.previewItems) if (p.id) p.id = `${pre}${p.id}`
  }
}

function mcq(
  id: string,
  prompt: string,
  q: string,
  options: string[],
  correct: string,
  feedback?: { errorTags?: string[]; hint?: string; incorrectFeedback?: string }
): Step {
  return {
    id,
    type: 'mcq',
    prompt,
    exercises: [
      {
        id: `${id}-ex`,
        type: 'multiple_choice',
        question: q,
        options,
        correctAnswer: correct,
        difficulty: 'A2_mid',
        metadata: {},
      },
    ],
    feedbackConfig: feedback ?? {},
    metadata: {},
  }
}

function listening(
  id: string,
  prompt: string,
  dialogue: { speaker: string; nl: string; en: string }[],
  mcqQ: string,
  mcqOpts: string[],
  mcqCorrect: string,
  hint?: string
): Step {
  return {
    id,
    type: 'listening',
    prompt,
    content: { dialogue, hideTranscriptUntilPlayed: true },
    exercises: [
      {
        id: `${id}-ex`,
        type: 'multiple_choice',
        question: mcqQ,
        options: mcqOpts,
        correctAnswer: mcqCorrect,
        difficulty: 'A2_low',
        metadata: {},
      },
    ],
    feedbackConfig: { hint: hint ?? 'Luister nog een keer.', errorTags: ['listening'] },
    metadata: {},
  }
}

function speak(id: string, prompt: string, targetNl: string, acceptable: string[], tips?: string): Step {
  return {
    id,
    type: 'speaking',
    prompt,
    content: { targetNl, acceptable, maxRecordingSeconds: 28 },
    interactionConfig: { requiresMicrophone: false, mockTranscript: acceptable[0] ?? targetNl },
    feedbackConfig: tips ? { pronunciationTips: tips } : {},
    metadata: {},
  }
}

function reorderStep(
  id: string,
  prompt: string,
  tokens: string[],
  correct: string,
  fb?: { incorrectFeedback?: string; errorTags?: string[] }
): Step {
  return {
    id,
    type: 'reorder',
    prompt,
    exercises: [
      {
        id: `${id}-ex`,
        type: 'reorder',
        question: 'Zet in de juiste volgorde.',
        options: tokens,
        correctAnswer: correct,
        difficulty: 'A2_low',
        metadata: {},
      },
    ],
    interactionConfig: { delimiter: ' ' },
    feedbackConfig: fb ?? { errorTags: ['word-order'] },
    metadata: {},
  }
}

function fill(
  id: string,
  prompt: string,
  question: string,
  options: string[],
  correct: string,
  fb?: { errorTags?: string[]; hint?: string }
): Step {
  return {
    id,
    type: 'fill_blank',
    prompt,
    exercises: [
      {
        id: `${id}-ex`,
        type: 'fill_blank',
        question,
        options,
        correctAnswer: correct,
        difficulty: 'A2_low',
        metadata: {},
      },
    ],
    feedbackConfig: fb ?? {},
    metadata: {},
  }
}

function recapStep(id: string, prompt: string, lemmas: string[], tasks: unknown[]): Step {
  return {
    id,
    type: 'recap',
    prompt,
    content: { lemmas, tasks },
    metadata: {},
  }
}

function previewStep(id: string, prompt: string, items: Array<{ id: string; word: string; lemma: string; translationEn: string; emoji: string }>): Step {
  return {
    id,
    type: 'preview',
    prompt,
    content: { previewItems: items },
    metadata: {},
  }
}

function discoveryStep(id: string, prompt: string, phrases: { nl: string; en: string; focus?: string }[]): Step {
  return {
    id,
    type: 'discovery',
    prompt,
    content: { phrases },
    metadata: {},
  }
}

function grammarCard(
  id: string,
  prompt: string,
  title: string,
  summary: string,
  examples: { nl: string; en: string }[],
  hint?: string
): Step {
  return {
    id,
    type: 'grammar_card',
    prompt,
    content: { title, summary, examples },
    feedbackConfig: hint ? { hint } : {},
    metadata: {},
  }
}

const GRAMMAR = [
  {
    id: 'a2.1-present-tense',
    name: 'Present tense & word order',
    description: 'Simple statements: subject — verb — rest. Questions: finite verb first.',
    examples: [
      { nl: 'Ik ga vandaag werken.', en: "I'm going to work today." },
      { nl: 'Wat doe je vandaag?', en: 'What are you doing today?' },
      { nl: 'Hoe gaat het?', en: 'How are you?' },
    ],
    cefrLevel: 'A2' as const,
    rules: { statement: 'Subject + finite verb + …', question: 'Finite verb + subject + …' },
    metadata: { module: 'a2-m01' },
  },
  {
    id: 'a2.1-zijn-hebben',
    name: 'Zijn & hebben (present)',
    description: 'High-frequency copula and possession in short lines about routines and state.',
    examples: [
      { nl: 'Ik ben moe.', en: "I'm tired." },
      { nl: 'Ik heb tijd.', en: 'I have time.' },
      { nl: 'Het is druk vandaag.', en: "It's busy today." },
    ],
    cefrLevel: 'A2' as const,
    rules: { note: 'ben/bent/is — heb/hebt/hebben' },
    metadata: { module: 'a2-m01' },
  },
  {
    id: 'a2.1-questions-basics',
    name: 'WH-questions & yes/no',
    description: 'Wat / wie / waar / hoe / wanneer + verb-second in main clauses.',
    examples: [
      { nl: 'Waar woon je?', en: 'Where do you live?' },
      { nl: 'Wie is dat?', en: 'Who is that?' },
      { nl: 'Ga je mee?', en: 'Are you coming along?' },
    ],
    cefrLevel: 'A2' as const,
    rules: {},
    metadata: { module: 'a2-m01' },
  },
  {
    id: 'a2.1-time-phrases',
    name: 'Time phrases',
    description: 'vandaag, morgen, straks, vanavond, in de ochtend — placement in the clause.',
    examples: [
      { nl: 'Straks ga ik sporten.', en: "Later I'm going to exercise." },
      { nl: 'Vanavond ben ik thuis.', en: "Tonight I'm home." },
      { nl: 'Morgen werk ik thuis.', en: 'Tomorrow I work from home.' },
    ],
    cefrLevel: 'A2' as const,
    rules: {},
    metadata: { module: 'a2-m01' },
  },
]

const VOCAB = [
  { id: 'lemma-vriend', word: 'vriend', lemma: 'vriend', translation: 'friend', partOfSpeech: 'noun', example: { nl: 'Dit is mijn vriend.', en: 'This is my friend.' }, tags: ['people', 'A2.1'], metadata: {} },
  { id: 'lemma-vandaag', word: 'vandaag', lemma: 'vandaag', translation: 'today', partOfSpeech: 'adverb', example: { nl: 'Wat doe je vandaag?', en: 'What are you doing today?' }, tags: ['time', 'A2.1'], metadata: {} },
  { id: 'lemma-werken', word: 'werken', lemma: 'werken', translation: 'to work', partOfSpeech: 'verb', example: { nl: 'Ik ga werken.', en: "I'm going to work." }, tags: ['work', 'A2.1'], metadata: {} },
  { id: 'lemma-gaan', word: 'gaan', lemma: 'gaan', translation: 'to go', partOfSpeech: 'verb', example: { nl: 'Ik ga naar huis.', en: "I'm going home." }, tags: ['motion', 'A2.1'], metadata: {} },
  { id: 'lemma-hoe', word: 'hoe', lemma: 'hoe', translation: 'how', partOfSpeech: 'pronoun', example: { nl: 'Hoe gaat het?', en: 'How are you?' }, tags: ['chat', 'A2.1'], metadata: {} },
  { id: 'lemma-ochtend', word: 'ochtend', lemma: 'ochtend', translation: 'morning', partOfSpeech: 'noun', example: { nl: 'Goedemorgen!', en: 'Good morning!' }, tags: ['time', 'A2.1'], metadata: {} },
  { id: 'lemma-avond', word: 'avond', lemma: 'avond', translation: 'evening', partOfSpeech: 'noun', example: { nl: 'Goedenavond.', en: 'Good evening.' }, tags: ['time', 'A2.1'], metadata: {} },
  { id: 'lemma-straks', word: 'straks', lemma: 'straks', translation: 'later; in a bit', partOfSpeech: 'adverb', example: { nl: 'Tot straks!', en: 'See you in a bit!' }, tags: ['chat', 'A2.1'], metadata: {} },
  { id: 'lemma-morgen', word: 'morgen', lemma: 'morgen', translation: 'tomorrow', partOfSpeech: 'noun', example: { nl: 'Tot morgen!', en: 'See you tomorrow!' }, tags: ['time', 'A2.1'], metadata: {} },
  { id: 'lemma-naam', word: 'naam', lemma: 'naam', translation: 'name', partOfSpeech: 'noun', example: { nl: 'Mijn naam is Sam.', en: 'My name is Sam.' }, tags: ['people', 'A2.1'], metadata: {} },
  { id: 'lemma-thuis', word: 'thuis', lemma: 'thuis', translation: 'at home', partOfSpeech: 'adverb', example: { nl: 'Ik ben thuis.', en: "I'm home." }, tags: ['daily', 'A2.1'], metadata: {} },
  { id: 'lemma-studeren', word: 'studeren', lemma: 'studeren', translation: 'to study', partOfSpeech: 'verb', example: { nl: 'Ik studeer Nederlands.', en: 'I study Dutch.' }, tags: ['work', 'A2.1'], metadata: {} },
  { id: 'lemma-moe', word: 'moe', lemma: 'moe', translation: 'tired', partOfSpeech: 'adjective', example: { nl: 'Ik ben moe.', en: "I'm tired." }, tags: ['state', 'A2.1'], metadata: {} },
  { id: 'lemma-druk', word: 'druk', lemma: 'druk', translation: 'busy', partOfSpeech: 'adjective', example: { nl: 'Het is druk.', en: "It's busy." }, tags: ['state', 'A2.1'], metadata: {} },
  { id: 'lemma-collega', word: 'collega', lemma: 'collega', translation: 'colleague', partOfSpeech: 'noun', example: { nl: 'Dit is mijn collega.', en: 'This is my colleague.' }, tags: ['work', 'A2.1'], metadata: {} },
  { id: 'lemma-familie', word: 'familie', lemma: 'familie', translation: 'family', partOfSpeech: 'noun', example: { nl: 'Hoe gaat het met je familie?', en: 'How is your family?' }, tags: ['people', 'A2.1'], metadata: {} },
  { id: 'lemma-vanavond', word: 'vanavond', lemma: 'vanavond', translation: 'this evening; tonight', partOfSpeech: 'adverb', example: { nl: 'Wat doe je vanavond?', en: 'What are you doing tonight?' }, tags: ['time', 'A2.1'], metadata: {} },
  { id: 'lemma-weekend', word: 'weekend', lemma: 'weekend', translation: 'weekend', partOfSpeech: 'noun', example: { nl: 'Fijn weekend!', en: 'Have a nice weekend!' }, tags: ['time', 'A2.1'], metadata: {} },
  { id: 'lemma-nu', word: 'nu', lemma: 'nu', translation: 'now', partOfSpeech: 'adverb', example: { nl: 'Ik ga nu weg.', en: "I'm leaving now." }, tags: ['time', 'A2.1'], metadata: {} },
  { id: 'lemma-wat', word: 'wat', lemma: 'wat', translation: 'what', partOfSpeech: 'pronoun', example: { nl: 'Wat doe je?', en: 'What are you doing?' }, tags: ['chat', 'A2.1'], metadata: {} },
  { id: 'lemma-waar', word: 'waar', lemma: 'waar', translation: 'where', partOfSpeech: 'pronoun', example: { nl: 'Waar woon je?', en: 'Where do you live?' }, tags: ['chat', 'A2.1'], metadata: {} },
  { id: 'lemma-wanneer', word: 'wanneer', lemma: 'wanneer', translation: 'when', partOfSpeech: 'pronoun', example: { nl: 'Wanneer ben je vrij?', en: 'When are you free?' }, tags: ['time', 'A2.1'], metadata: {} },
  { id: 'lemma-leuk', word: 'leuk', lemma: 'leuk', translation: 'nice; fun', partOfSpeech: 'adjective', example: { nl: 'Leuk om je te zien.', en: 'Nice to see you.' }, tags: ['chat', 'A2.1'], metadata: {} },
  { id: 'lemma-eten', word: 'eten', lemma: 'eten', translation: 'to eat; food', partOfSpeech: 'verb', example: { nl: 'Ik ga eten.', en: "I'm going to eat." }, tags: ['daily', 'A2.1'], metadata: {} },
  { id: 'lemma-slapen', word: 'slapen', lemma: 'slapen', translation: 'to sleep', partOfSpeech: 'verb', example: { nl: 'Ik ga slapen.', en: "I'm going to sleep." }, tags: ['daily', 'A2.1'], metadata: {} },
  { id: 'lemma-koffie', word: 'koffie', lemma: 'koffie', translation: 'coffee', partOfSpeech: 'noun', example: { nl: 'Koffie?', en: 'Coffee?' }, tags: ['daily', 'A2.1'], metadata: {} },
  { id: 'lemma-boodschappen', word: 'boodschappen', lemma: 'boodschappen', translation: 'groceries; errands', partOfSpeech: 'noun', example: { nl: 'Ik ga boodschappen doen.', en: "I'm going grocery shopping." }, tags: ['daily', 'A2.1'], metadata: {} },
]

const L01_FINAL_ID = 'a2-m01-l01-listening-friendly-chats-gist' as const

function buildLessons(l1: Record<string, unknown>): Record<string, unknown>[] {
  const lessons: Record<string, unknown>[] = []

  // Idempotent rebuild: module on disk already has L01 with prefixed step ids.
  if (l1.id !== L01_FINAL_ID) {
    prefixLessonIds(l1, 'm01-l01-')
  }
  lessons.push({
    ...l1,
    id: L01_FINAL_ID,
    title: 'Listening · Short friendly chats · catch the gist',
    lessonType: 'input',
    order: 0,
    durationEstimate: 15,
    reviewItemRefs: [],
    metadata: { ...(l1.metadata as object), archetype: 'input_a', stage6: true },
  })

  lessons.push({
    id: 'a2-m01-l02-listening-intro-routines',
    moduleId: 'a2-m01-people-daily',
    title: 'Listening · Light introductions · routines',
    lessonType: 'input',
    order: 1,
    cefrLevel: 'A2',
    durationEstimate: 13,
    grammarTargets: ['a2.1-present-tense'],
    vocabTargets: ['lemma-naam', 'lemma-thuis', 'lemma-werken', 'lemma-studeren', 'lemma-collega'],
    canDoStatements: ['I can catch a name and one routine fact in a short clip.', 'I can recognise “ik werk / ik studeer / ik ben thuis”.'],
    mistakeFocus: ['listening', 'vocab'],
    metadata: { theme: 'people_daily_rhythm', stage6: true, archetype: 'input_b' },
    steps: [
      previewStep('m01-l02-preview', 'Drie woorden', [
        { id: 'pv-n', word: 'naam', lemma: 'naam', translationEn: 'name', emoji: '🏷️' },
        { id: 'pv-w', word: 'werk', lemma: 'werken', translationEn: 'work', emoji: '💼' },
        { id: 'pv-h', word: 'thuis', lemma: 'thuis', translationEn: 'at home', emoji: '🏠' },
      ]),
      listening(
        'm01-l02-listen',
        'Luister — korte intro.',
        [
          { speaker: 'Noa', nl: 'Hoi! Ik ben Noa. Wat is jouw naam?', en: "Hi! I'm Noa. What's your name?" },
          { speaker: 'Tim', nl: 'Ik ben Tim. Ik werk in een winkel met een collega.', en: "I'm Tim. I work in a shop with a colleague." },
          { speaker: 'Noa', nl: 'Leuk! Ik studeer nog. Waar woon je?', en: "Nice! I'm still studying. Where do you live?" },
          { speaker: 'Tim', nl: 'In Utrecht. En jij?', en: 'In Utrecht. And you?' },
          { speaker: 'Noa', nl: 'Ik woon ook in Utrecht. Ik ben vaak thuis.', en: "I also live in Utrecht. I'm often home." },
        ],
        'Wat doet Tim?',
        ['Hij studeert.', 'Hij werkt in een winkel.', 'Hij is op vakantie.'],
        'Hij werkt in een winkel.',
        'Zoek het werkwoord bij Tim.'
      ),
      discoveryStep('m01-l02-discovery', 'Tik op een zin', [
        { nl: 'Ik ben Tim.', en: "I'm Tim.", focus: 'ben' },
        { nl: 'Ik werk in een winkel.', en: 'I work in a shop.', focus: 'werk' },
        { nl: 'Ik studeer nog.', en: "I'm still studying.", focus: 'studeer' },
      ]),
      mcq(
        'm01-l02-mcq',
        'Kies het beste antwoord',
        'Noa vraagt: “Wat is jouw naam?” Jij antwoordt informeel:',
        ['Ik ben Sam.', 'Goedemorgen.', 'Tot straks.'],
        'Ik ben Sam.',
        { errorTags: ['register'] }
      ),
      speak('m01-l02-speak', 'Zeg hardop', 'Ik werk thuis.', ['Ik werk thuis', 'ik werk thuis'], 'Korte *ik* + *werk*.'),
      recapStep('m01-l02-recap', 'Check', ['naam', 'werk', 'thuis'], [
        { kind: 'listen_mcq', question: 'Tim zegt:', snippetNl: 'Ik werk in een winkel.', options: ['Hij werkt.', 'Hij studeert.', 'Hij slaapt.'], correctAnswer: 'Hij werkt.' },
        { kind: 'fill_blank', sentence: 'Ik ___ Tim.', options: ['ben', 'heb', 'ga'], correctAnswer: 'ben' },
        { kind: 'reorder', tokens: ['studeer', 'Ik', 'Nog'], correctAnswer: 'Ik studeer nog' },
      ]),
    ],
    reviewItemRefs: [],
  })

  lessons.push({
    id: 'a2-m01-l03-grammar-present-daily-verbs',
    moduleId: 'a2-m01-people-daily',
    title: 'Grammar & patterns · Present tense · daily verbs',
    lessonType: 'pattern',
    order: 2,
    cefrLevel: 'A2',
    durationEstimate: 14,
    grammarTargets: ['a2.1-present-tense'],
    vocabTargets: ['lemma-gaan', 'lemma-werken', 'lemma-eten', 'lemma-slapen', 'lemma-vandaag'],
    canDoStatements: ['I can place the verb correctly in a short present-tense line.', 'I can spot a question vs a statement.'],
    mistakeFocus: ['word-order', 'grammar'],
    metadata: { stage6: true, archetype: 'pattern_1' },
    steps: [
      grammarCard(
        'm01-l03-grammar',
        'Mini-regel',
        'Tegenwoordige tijd — korte zin',
        'Stelling: **ik** + **werkwoord** + rest. Ja/nee-vraag: **werkwoord** eerst.',
        [
          { nl: 'Ik ga vandaag werken.', en: "I'm going to work today." },
          { nl: 'Ga je vandaag werken?', en: 'Are you going to work today?' },
          { nl: 'Ik ga zo eten.', en: "I'm going to eat soon." },
          { nl: 'Ik ga slapen.', en: "I'm going to sleep." },
        ],
        'Tel: waar staat *ga*?'
      ),
      reorderStep('m01-l03-reorder-1', 'Maak de stelling', ['vandaag', 'Ik', 'werk', 'thuis'], 'Ik werk vandaag thuis', {
        incorrectFeedback: 'Begin met *Ik*.',
        errorTags: ['word-order'],
      }),
      mcq(
        'm01-l03-mcq-q',
        'Vraag of zin?',
        'Welke zin is een vraag?',
        ['Ik ga naar huis.', 'Ga je naar huis?', 'Hij gaat naar huis.'],
        'Ga je naar huis?',
        { errorTags: ['grammar'] }
      ),
      fill(
        'm01-l03-fill',
        'Vul in',
        'Vul in: ___ je vandaag vrij?',
        ['Ben', 'Ga', 'Heb'],
        'Ben',
        { errorTags: ['grammar'], hint: 'We gebruiken *zijn* + *vrij*.' }
      ),
      speak('m01-l03-speak', 'Zeg de zin', 'Ik ga vandaag werken.', ['Ik ga vandaag werken'], 'Rustig tempo.'),
      recapStep('m01-l03-recap', 'Mini-check', ['gaan', 'werken'], [
        { kind: 'reorder', tokens: ['je', 'naar', 'Ga', 'huis?'], correctAnswer: 'Ga je naar huis?' },
        { kind: 'fill_blank', sentence: 'Ik ga zo ___.', options: ['slapen', 'eten', 'werken'], correctAnswer: 'slapen' },
        { kind: 'speak', prompt: 'Zeg: *Ik werk thuis.*', targetNl: 'Ik werk thuis.', mockPass: true },
      ]),
    ],
    reviewItemRefs: [],
  })

  lessons.push({
    id: 'a2-m01-l04-practice-questions-word-order',
    moduleId: 'a2-m01-people-daily',
    title: 'Controlled practice · Questions · word order',
    lessonType: 'practice',
    order: 3,
    cefrLevel: 'A2',
    durationEstimate: 13,
    grammarTargets: ['a2.1-questions-basics', 'a2.1-present-tense'],
    vocabTargets: ['lemma-wat', 'lemma-waar', 'lemma-hoe', 'lemma-wanneer', 'lemma-vandaag'],
    canDoStatements: ['I can form a simple WH-question in Dutch.', 'I can fix basic word order in a short line.'],
    mistakeFocus: ['word-order'],
    metadata: { stage6: true, archetype: 'practice_controlled' },
    steps: [
      discoveryStep('m01-l04-discovery', 'Vraagwoorden', [
        { nl: 'Wat doe je?', en: 'What are you doing?' },
        { nl: 'Waar woon je?', en: 'Where do you live?' },
        { nl: 'Hoe gaat het?', en: 'How are you?' },
        { nl: 'Wanneer ben je vrij?', en: 'When are you free?' },
      ]),
      mcq(
        'm01-l04-mcq-1',
        'Welk vraagwoord?',
        'Je wilt weten waar iemand woont. Wat vraag je?',
        ['Wat?', 'Waar?', 'Hoe?'],
        'Waar?',
        { errorTags: ['vocab'] }
      ),
      mcq(
        'm01-l04-mcq-2',
        'Welk vraagwoord?',
        'Je wilt weten op welk moment iemand iets doet. Wat vraag je?',
        ['Waar?', 'Wanneer?', 'Wat?'],
        'Wanneer?',
        { errorTags: ['vocab'] }
      ),
      reorderStep('m01-l04-reorder', 'Maak de vraag', ['woon', 'je', 'Waar', '?'], 'Waar woon je?', { errorTags: ['word-order'] }),
      fill(
        'm01-l04-fill',
        'Vul in',
        '___ gaat het?',
        ['Hoe', 'Wat', 'Waar'],
        'Hoe',
        { hint: 'Vaste groet.' }
      ),
      speak('m01-l04-speak', 'Stel de vraag', 'Wat doe je vandaag?', ['Wat doe je vandaag'], 'Intonatie: vraagtoon aan het eind.'),
      recapStep('m01-l04-recap', 'Snelle check', ['wat', 'waar'], [
        { kind: 'fill_blank', sentence: '___ woon je?', options: ['Waar', 'Wat', 'Hoe'], correctAnswer: 'Waar' },
        { kind: 'listen_mcq', question: 'Welke vraag hoor je?', snippetNl: 'Hoe gaat het?', options: ['Hoe gaat het?', 'Wat is dat?', 'Waar ben je?'], correctAnswer: 'Hoe gaat het?' },
      ]),
    ],
    reviewItemRefs: [],
  })

  lessons.push({
    id: 'a2-m01-l05-speaking-daily-routine',
    moduleId: 'a2-m01-people-daily',
    title: 'Speaking · Daily routine · talk about your day',
    lessonType: 'speaking',
    order: 4,
    cefrLevel: 'A2',
    durationEstimate: 14,
    grammarTargets: ['a2.1-present-tense'],
    vocabTargets: ['lemma-vandaag', 'lemma-ochtend', 'lemma-avond', 'lemma-werken', 'lemma-thuis', 'lemma-eten'],
    canDoStatements: ['I can say one sentence about what I do today.', 'I can use a time word naturally.'],
    mistakeFocus: ['pronunciation', 'word-order'],
    metadata: { stage6: true, archetype: 'speaking' },
    steps: [
      previewStep('m01-l05-preview', 'Tijd van de dag', [
        { id: 'pv1', word: 'ochtend', lemma: 'ochtend', translationEn: 'morning', emoji: '🌅' },
        { id: 'pv2', word: 'avond', lemma: 'avond', translationEn: 'evening', emoji: '🌙' },
        { id: 'pv3', word: 'vandaag', lemma: 'vandaag', translationEn: 'today', emoji: '📅' },
      ]),
      listening(
        'm01-l05-listen',
        'Voorbeeld — korte routine',
        [
          {
            speaker: 'Lisa',
            nl: "Vandaag werk ik thuis. 's Avonds ga ik uit eten met een vriend.",
            en: 'Today I work from home. This evening I am going out for dinner with a friend.',
          },
        ],
        'Wat doet Lisa vandaag overdag?',
        ['Ze gaat sporten.', 'Ze werkt thuis.', 'Ze slaapt.'],
        'Ze werkt thuis.'
      ),
      mcq(
        'm01-l05-mcq',
        'Natuurlijke zin',
        'Kies een natuurlijke zin over vandaag.',
        ['Ik ga vandaag werken.', 'Ik vandaag ga werken.', 'Werken ik vandaag ga.'],
        'Ik ga vandaag werken.',
        { errorTags: ['word-order'] }
      ),
      speak('m01-l05-speak-1', 'Jouw beurt (1)', 'Vandaag werk ik thuis.', ['Vandaag werk ik thuis', 'ik werk vandaag thuis'], ''),
      speak('m01-l05-speak-2', 'Jouw beurt (2)', "'s Avonds ga ik eten.", ['s Avonds ga ik eten', 'Avonds ga ik eten'], ''),
      recapStep('m01-l05-recap', 'Afronden', ['vandaag', 'thuis'], [
        { kind: 'speak', prompt: 'Zeg in het Nederlands: *Today I work.*', targetNl: 'Vandaag werk ik.', mockPass: true },
        { kind: 'reorder', tokens: ['thuis', 'Ik', 'werk', 'vandaag'], correctAnswer: 'Ik werk vandaag thuis' },
      ]),
    ],
    reviewItemRefs: [],
  })

  lessons.push({
    id: 'a2-m01-l06-listening-variation-plans',
    moduleId: 'a2-m01-people-daily',
    title: 'Listening · Variation · plans for today / tonight',
    lessonType: 'input',
    order: 5,
    cefrLevel: 'A2',
    durationEstimate: 13,
    grammarTargets: ['a2.1-time-phrases', 'a2.1-present-tense'],
    vocabTargets: ['lemma-vanavond', 'lemma-straks', 'lemma-morgen', 'lemma-boodschappen', 'lemma-koffie'],
    canDoStatements: ['I can follow simple plans with vanavond / straks / morgen.', 'I can pick the main plan from two options.'],
    mistakeFocus: ['listening', 'vocab'],
    metadata: { stage6: true, archetype: 'variation' },
    steps: [
      discoveryStep('m01-l06-discovery', 'Tijdwoorden', [
        { nl: 'Vanavond ben ik thuis.', en: "Tonight I'm home." },
        { nl: 'Straks ga ik boodschappen doen.', en: "Later I'm going grocery shopping." },
        { nl: 'Morgen werk ik op kantoor.', en: 'Tomorrow I work at the office.' },
      ]),
      listening(
        'm01-l06-listen',
        'Luister — plannen',
        [
          { speaker: 'Eva', nl: 'Wat doe je vanavond?', en: 'What are you doing tonight?' },
          { speaker: 'Jasper', nl: 'Straks ga ik sporten. Daarna koffie met een collega.', en: "Later I'm going to exercise. Then coffee with a colleague." },
          { speaker: 'Eva', nl: 'Leuk! Ik ga morgen mijn familie bezoeken.', en: "Nice! I'm visiting my family tomorrow." },
        ],
        'Wat doet Jasper straks eerst?',
        ['Koffie drinken.', 'Sporten.', 'Familie bezoeken.'],
        'Sporten.'
      ),
      mcq(
        'm01-l06-mcq',
        'Welk tijdwoord past?',
        'Je plant iets later vandaag, niet morgenochtend. Typisch woord:',
        ['morgen', 'straks', 'gisteren'],
        'straks',
        { errorTags: ['vocab'] }
      ),
      fill(
        'm01-l06-fill',
        'Vul in',
        '___ ga ik naar huis. (vanavond)',
        ['Vanavond', 'Morgen', 'Straks'],
        'Vanavond',
        {}
      ),
      speak('m01-l06-speak', 'Zeg je plan', 'Straks ga ik boodschappen doen.', ['Straks ga ik boodschappen doen'], ''),
      recapStep('m01-l06-recap', 'Check', ['vanavond', 'straks'], [
        { kind: 'listen_mcq', question: 'Eva zegt:', snippetNl: 'Ik ga morgen familie bezoeken.', options: ['Morgen.', 'Vandaag.', 'Nu.'], correctAnswer: 'Morgen.' },
      ]),
    ],
    reviewItemRefs: [],
  })

  lessons.push({
    id: 'a2-m01-l07-grammar-zijn-hebben',
    moduleId: 'a2-m01-people-daily',
    title: 'Grammar & patterns · Zijn / hebben · short lines',
    lessonType: 'pattern',
    order: 6,
    cefrLevel: 'A2',
    durationEstimate: 13,
    grammarTargets: ['a2.1-zijn-hebben', 'a2.1-present-tense'],
    vocabTargets: ['lemma-moe', 'lemma-druk', 'lemma-thuis', 'lemma-vriend', 'lemma-familie'],
    canDoStatements: ['I can use *ik ben* vs *ik heb* in a simple line about state or possession.', 'I can avoid mixing *hebben* with adjectives like *moe*.'],
    mistakeFocus: ['grammar', 'vocab'],
    metadata: { stage6: true, archetype: 'pattern_2' },
    steps: [
      grammarCard(
        'm01-l07-gc',
        'Kern',
        'Zijn = state; hebben = possession/time',
        '**Ik ben moe.** **Ik heb tijd.** Niet: *Ik heb moe.*',
        [
          { nl: 'Ik ben druk vandaag.', en: "I'm busy today." },
          { nl: 'Ik heb een vraag.', en: 'I have a question.' },
        ],
        'Let op *ben* + bijvoeglijk naamwoord.'
      ),
      mcq(
        'm01-l07-mcq',
        'Kies de goede zin',
        'Je bent moe. Wat zeg je?',
        ['Ik ben moe.', 'Ik heb moe.', 'Ik ben niet moe.'],
        'Ik ben moe.',
        { errorTags: ['grammar'] }
      ),
      fill(
        'm01-l07-fill-1',
        'Vul in',
        'Ik ___ tijd vanavond.',
        ['heb', 'ben', 'ga'],
        'heb',
        {}
      ),
      fill(
        'm01-l07-fill-2',
        'Vul in',
        'Mijn familie ___ groot.',
        ['is', 'heb', 'ben'],
        'is',
        { hint: 'Derde persoon enkelvoud.' }
      ),
      reorderStep('m01-l07-ro', 'Maak de zin', ['druk', 'Ik', 'ben', 'vandaag'], 'Ik ben vandaag druk', { errorTags: ['word-order'] }),
      speak(
        'm01-l07-spk',
        'Zeg één zin: moe, maar wel tijd.',
        'Ik ben moe, maar ik heb tijd.',
        ['Ik ben moe, maar ik heb tijd.', 'Ik ben moe maar ik heb tijd'],
        'Gebruik *ben* bij *moe* en *heb* bij *tijd*.'
      ),
      recapStep('m01-l07-recap', 'Check', ['ben', 'heb'], [
        { kind: 'fill_blank', sentence: 'Ik ___ moe.', options: ['ben', 'heb', 'ga'], correctAnswer: 'ben' },
        { kind: 'speak', prompt: 'Zeg: *I have time.*', targetNl: 'Ik heb tijd.', mockPass: true },
      ]),
    ],
    reviewItemRefs: [],
  })

  lessons.push({
    id: 'a2-m01-l08-writing-short-update',
    moduleId: 'a2-m01-people-daily',
    title: 'Writing · Short update · about your day',
    lessonType: 'writing',
    order: 7,
    cefrLevel: 'A2',
    durationEstimate: 12,
    grammarTargets: ['a2.1-present-tense', 'a2.1-time-phrases'],
    vocabTargets: ['lemma-vandaag', 'lemma-nu', 'lemma-werken', 'lemma-thuis', 'lemma-leuk'],
    canDoStatements: ['I can build a 4–6 word Dutch line about my day (with support).', 'I can self-check word order on a short line.'],
    mistakeFocus: ['word-order', 'spelling'],
    metadata: { stage6: true, archetype: 'writing_proxy', note: 'Uses fill/reorder/speak; full typing UI is future.' },
    steps: [
      grammarCard(
        'm01-l08-model',
        'Modelzin',
        'Een korte update',
        'Combineer tijd + ik + werkwoord.',
        [
          { nl: 'Vandaag werk ik thuis.', en: 'Today I work from home.' },
          { nl: 'Nu ga ik koffie halen.', en: "Now I'm going to get coffee." },
        ],
        ''
      ),
      reorderStep('m01-l08-ro', 'Bouw je update', ['thuis', 'Ik', 'vandaag', 'werk'], 'Ik werk vandaag thuis', { errorTags: ['word-order'] }),
      fill(
        'm01-l08-fill',
        'Vul het werkwoord',
        'Nu ___ ik naar de supermarkt.',
        ['ga', 'ben', 'heb'],
        'ga',
        {}
      ),
      speak(
        'm01-l08-speak',
        'Zeg je update hardop (zoals een app-berichtje)',
        'Vandaag ben ik druk, maar het gaat goed.',
        ['Vandaag ben ik druk maar het gaat goed'],
        'Natuurlijke pauzes zijn oké.'
      ),
      recapStep('m01-l08-recap', 'Laatste check', ['vandaag', 'nu'], [
        { kind: 'reorder', tokens: ['koffie', 'Ik', 'nu', 'ga', 'halen'], correctAnswer: 'Ik ga nu koffie halen' },
      ]),
    ],
    reviewItemRefs: [],
  })

  lessons.push({
    id: 'a2-m01-l09-task-chat-scaffolded',
    moduleId: 'a2-m01-people-daily',
    title: 'Task · Short chat · scaffolded choices',
    lessonType: 'task',
    order: 8,
    cefrLevel: 'A2',
    durationEstimate: 14,
    grammarTargets: ['a2.1-present-tense', 'a2.1-questions-basics'],
    vocabTargets: ['lemma-hoe', 'lemma-wat', 'lemma-vandaag', 'lemma-leuk', 'lemma-straks'],
    canDoStatements: ['I can choose an appropriate reply in a short chat.', 'I can ask one follow-up question.'],
    mistakeFocus: ['register', 'vocab'],
    metadata: { stage6: true, archetype: 'task_scaffolded' },
    steps: [
      listening(
        'm01-l09-listen',
        'Context',
        [
          { speaker: 'Mila', nl: 'Hoi! Hoe gaat het?', en: 'Hi! How are you?' },
          { speaker: 'You', nl: 'Goed! En met jou?', en: 'Good! And you?' },
          { speaker: 'Mila', nl: 'Ook goed. Wat doe je vandaag?', en: 'Also good. What are you doing today?' },
        ],
        'Wat vraagt Mila als tweede vraag?',
        ['Hoe gaat het?', 'Wat doe je vandaag?', 'Waar woon je?'],
        'Wat doe je vandaag?',
        ''
      ),
      mcq(
        'm01-l09-mcq-reply',
        'Kies een natuurlijke reactie',
        'Mila: “Wat doe je vandaag?”',
        ['Ik ga straks sporten.', 'Ik ben vandaag.', 'Wat is vandaag?'],
        'Ik ga straks sporten.',
        { errorTags: ['register'] }
      ),
      mcq(
        'm01-l09-mcq-followup',
        'Stel een vervolgvraag',
        'Welke vraag past na haar antwoord?',
        ['En jij?', 'Tot ziens.', 'Dank je wel.'],
        'En jij?',
        {}
      ),
      speak('m01-l09-speak', 'Speel het mini-gesprek na', 'Hoi! Hoe gaat het? Goed! Wat doe je vandaag?', ['Hoi hoe gaat het'], ''),
      recapStep('m01-l09-recap', 'Klaar', ['hoe', 'wat'], [
        { kind: 'fill_blank', sentence: '___ gaat het?', options: ['Hoe', 'Wat', 'Waar'], correctAnswer: 'Hoe' },
      ]),
    ],
    reviewItemRefs: [],
  })

  lessons.push({
    id: 'a2-m01-l10-task-mini-dialogue',
    moduleId: 'a2-m01-people-daily',
    title: 'Task · Mini-dialogue · less scaffolding',
    lessonType: 'task',
    order: 9,
    cefrLevel: 'A2',
    durationEstimate: 14,
    grammarTargets: ['a2.1-present-tense', 'a2.1-time-phrases'],
    vocabTargets: ['lemma-weekend', 'lemma-morgen', 'lemma-vanavond', 'lemma-werken', 'lemma-familie'],
    canDoStatements: ['I can handle a 3-turn chat about weekend plans with minimal prompts.', 'I can close politely.'],
    mistakeFocus: ['vocab', 'register'],
    metadata: { stage6: true, archetype: 'task_full' },
    steps: [
      discoveryStep('m01-l10-discovery', 'Handige brokken', [
        { nl: 'Wat doe je dit weekend?', en: 'What are you doing this weekend?' },
        { nl: 'Ik ga mijn familie bezoeken.', en: "I'm going to visit my family." },
        { nl: 'Fijn weekend!', en: 'Have a nice weekend!' },
      ]),
      listening(
        'm01-l10-listen',
        'Luister — weekend',
        [
          { speaker: 'Omar', nl: 'Wat doe je dit weekend?', en: 'What are you doing this weekend?' },
          { speaker: 'Sara', nl: 'Vanavond werk ik. Morgen ga ik naar mijn familie.', en: "Tonight I'm working. Tomorrow I'm going to my family." },
          { speaker: 'Omar', nl: 'Leuk! Fijn weekend.', en: 'Nice! Have a nice weekend.' },
        ],
        'Wat doet Sara morgen?',
        ['Ze werkt.', 'Ze gaat naar familie.', 'Ze gaat sporten.'],
        'Ze gaat naar familie.'
      ),
      reorderStep('m01-l10-ro', 'Maak de vraag', ['weekend', 'je', 'Wat', 'doe', 'dit', '?'], 'Wat doe je dit weekend?', { errorTags: ['word-order'] }),
      speak('m01-l10-speak', 'Jouw antwoord', 'Morgen ga ik naar mijn familie.', ['Morgen ga ik naar mijn familie'], ''),
      mcq(
        'm01-l10-mcq-close',
        'Sluit af',
        'Welke afsluiting past bij een collega op vrijdag?',
        ['Fijn weekend!', 'Tot straks!', 'Goedemorgen!'],
        'Fijn weekend!',
        { errorTags: ['register'] }
      ),
      recapStep('m01-l10-recap', 'Check', ['weekend', 'familie'], [
        { kind: 'listen_mcq', question: 'Sara zegt:', snippetNl: 'Morgen ga ik naar mijn familie.', options: ['Morgen.', 'Vandaag.', 'Gisteren.'], correctAnswer: 'Morgen.' },
      ]),
    ],
    reviewItemRefs: [],
  })

  lessons.push({
    id: 'a2-m01-l11-mixed-review',
    moduleId: 'a2-m01-people-daily',
    title: 'Mixed review · People & daily rhythm',
    lessonType: 'review',
    order: 10,
    cefrLevel: 'A2',
    durationEstimate: 16,
    grammarTargets: ['a2.1-present-tense', 'a2.1-zijn-hebben', 'a2.1-questions-basics', 'a2.1-time-phrases'],
    vocabTargets: ['lemma-vandaag', 'lemma-hoe', 'lemma-gaan', 'lemma-werken', 'lemma-thuis', 'lemma-straks', 'lemma-morgen'],
    canDoStatements: ['I can mix greetings, questions, and time phrases in short bursts.', 'I can self-check common daily patterns.'],
    mistakeFocus: ['word-order', 'vocab', 'grammar'],
    metadata: { stage6: true, archetype: 'review_mixed' },
    steps: [
      previewStep('m01-l11-preview', 'Snelle herhaling', [
        { id: 'p1', word: 'Hoe', lemma: 'hoe', translationEn: 'how', emoji: '❓' },
        { id: 'p2', word: 'vandaag', lemma: 'vandaag', translationEn: 'today', emoji: '📅' },
        { id: 'p3', word: 'straks', lemma: 'straks', translationEn: 'later', emoji: '⏱️' },
      ]),
      mcq(
        'm01-l11-mcq-1',
        'Groet kiezen',
        'Je ziet een buur om 18:00. Wat zeg je?',
        ['Goedemorgen!', 'Goedenavond!', 'Tot morgen!'],
        'Goedenavond!',
        { errorTags: ['register'] }
      ),
      fill(
        'm01-l11-fill',
        'Vul in',
        '___ gaat het met je familie?',
        ['Hoe', 'Wat', 'Waar'],
        'Hoe',
        {}
      ),
      reorderStep('m01-l11-ro', 'Zin', ['vandaag', 'thuis', 'Ik', 'werk'], 'Ik werk vandaag thuis', {}),
      speak('m01-l11-speak', 'Zeg hardop', 'Straks ga ik naar huis.', ['Straks ga ik naar huis'], ''),
      recapStep('m01-l11-recap', 'Laatste ronde', ['dagelijks'], [
        { kind: 'listen_mcq', question: 'Welk antwoord hoort bij *Hoe gaat het?*', snippetNl: 'Goed, dank je!', options: ['Goed, dank je!', 'Ik ga werken.', 'Tot straks!'], correctAnswer: 'Goed, dank je!' },
        { kind: 'fill_blank', sentence: 'Ik ___ moe.', options: ['ben', 'heb', 'ga'], correctAnswer: 'ben' },
        { kind: 'reorder', tokens: ['je', 'Wat', 'vandaag', 'doe', '?'], correctAnswer: 'Wat doe je vandaag?' },
        { kind: 'speak', prompt: 'Sluit vriendelijk af: see you tomorrow', targetNl: 'Tot morgen!', mockPass: true },
      ]),
    ],
    reviewItemRefs: [],
  })

  return lessons
}

function main(): void {
  const raw = JSON.parse(readFileSync(MODULE_PATH, 'utf8')) as { lessons: Record<string, unknown>[] }
  const l1src =
    raw.lessons.find((l) => l.id === 'schema-people-daily-chat-01') ??
    raw.lessons.find((l) => l.id === L01_FINAL_ID)
  if (!l1src) {
    throw new Error(
      'Expected L01 seed lesson (schema-people-daily-chat-01 or a2-m01-l01-listening-friendly-chats-gist) in module',
    )
  }
  const l1 = JSON.parse(JSON.stringify(l1src)) as Record<string, unknown>

  const lessons = buildLessons(l1)

  const moduleJson = {
    id: 'a2-m01-people-daily',
    title: 'People & daily rhythm',
    band: 'A2.1',
    description:
      'Practical A2.1 Dutch for daily social life: greetings, light introductions, routines, today/tonight plans, present tense, zijn/hebben, questions, and short chats. Stage 6 reference module (11 lessons).',
    order: 0,
    learningGoals: [
      'Handle short friendly chats about today and tonight',
      'Introduce yourself lightly and ask simple follow-up questions',
      'Use present tense, zijn/hebben, and basic WH-questions in short lines',
      'Close conversations with natural phrases (straks, morgen, weekend)',
      'Build confidence for mobile, high-density practice sessions',
    ],
    grammarTargets: GRAMMAR,
    vocabTargets: VOCAB,
    lessons,
    metadata: {
      contentFormatVersion: 1,
      spine: 'a2-m01',
      stage6ReferenceModule: true,
      generatedAt: new Date().toISOString(),
    },
  }

  const parsed = moduleSchema.safeParse(moduleJson)
  if (!parsed.success) {
    console.error(parsed.error.flatten())
    process.exit(1)
  }

  mkdirSync(dirname(MODULE_PATH), { recursive: true })
  writeFileSync(MODULE_PATH, JSON.stringify(parsed.data, null, 2), 'utf8')
  console.log('[build-stage6] wrote', MODULE_PATH, 'lessons:', lessons.length)
}

main()
