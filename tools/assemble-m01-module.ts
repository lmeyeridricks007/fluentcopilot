/**
 * One-off assembler: merges people-daily sample lesson + adds l02/l03 into canonical module.json.
 * Run: npx tsx --tsconfig tsconfig.json tools/assemble-m01-module.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import peopleDaily from '../content/samples/people-daily-lesson.json'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT = join(ROOT, 'content/modules/a2-m01-people-daily/module.json')

const extraVocab = [
  {
    id: 'lemma-ochtend',
    word: 'ochtend',
    lemma: 'ochtend',
    translation: 'morning',
    partOfSpeech: 'noun',
    example: { nl: 'Goedemorgen!', en: 'Good morning!' },
    tags: ['time', 'A2.1'],
    metadata: {},
  },
  {
    id: 'lemma-avond',
    word: 'avond',
    lemma: 'avond',
    translation: 'evening',
    partOfSpeech: 'noun',
    example: { nl: 'Goedenavond.', en: 'Good evening.' },
    tags: ['time', 'A2.1'],
    metadata: {},
  },
  {
    id: 'lemma-straks',
    word: 'straks',
    lemma: 'straks',
    translation: 'later; in a bit',
    partOfSpeech: 'adverb',
    example: { nl: 'Tot straks!', en: 'See you in a bit!' },
    tags: ['chat', 'A2.1'],
    metadata: {},
  },
  {
    id: 'lemma-morgen',
    word: 'morgen',
    lemma: 'morgen',
    translation: 'tomorrow',
    partOfSpeech: 'noun',
    example: { nl: 'Tot morgen!', en: 'See you tomorrow!' },
    tags: ['time', 'A2.1'],
    metadata: {},
  },
] as const

const lesson02 = {
  id: 'a2-m01-l02-morning-evening',
  moduleId: 'a2-m01-people-daily',
  title: 'Morning & evening greetings',
  lessonType: 'practice',
  order: 1,
  cefrLevel: 'A2',
  durationEstimate: 12,
  grammarTargets: ['a2.1-present-tense'],
  vocabTargets: ['lemma-ochtend', 'lemma-avond', 'lemma-hoe', 'lemma-vandaag'],
  canDoStatements: ['I can greet someone in the morning or evening.', 'I can say what part of the day it is.'],
  reviewItemRefs: [] as string[],
  mistakeFocus: ['vocab', 'register'],
  metadata: { theme: 'people_daily_rhythm', schemaPlayer: true },
  steps: [
    {
      id: 'l2-preview',
      type: 'preview',
      prompt: 'Two quick words',
      content: {
        previewItems: [
          { id: 'pv-o', word: 'ochtend', lemma: 'ochtend', translationEn: 'morning', emoji: '🌅' },
          { id: 'pv-a', word: 'avond', lemma: 'avond', translationEn: 'evening', emoji: '🌙' },
        ],
      },
      metadata: {},
    },
    {
      id: 'l2-listen',
      type: 'listening',
      prompt: 'Luister — twee begroetingen.',
      content: {
        dialogue: [
          { speaker: 'Alex', nl: 'Goedemorgen! Hoe gaat het?', en: 'Good morning! How are you?' },
          { speaker: 'Bo', nl: 'Goedemorgen! Goed, dank je.', en: 'Good morning! Fine, thanks.' },
          { speaker: 'Alex', nl: 'Goedenavond!', en: 'Good evening!' },
          { speaker: 'Bo', nl: 'Goedenavond, tot straks.', en: 'Good evening, see you later.' },
        ],
      },
      exercises: [
        {
          id: 'ex-l2-mcq',
          type: 'multiple_choice',
          question: 'Wanneer zeg je “Goedenavond”?',
          options: ['In de avond', 'In de ochtend', 'Alleen in het weekend'],
          correctAnswer: 'In de avond',
          difficulty: 'A2_low',
          metadata: {},
        },
      ],
      feedbackConfig: { hint: 'Denk aan de zon en de maan.', errorTags: ['listening'] },
      metadata: {},
    },
    {
      id: 'l2-mcq',
      type: 'mcq',
      prompt: 'Kies het beste antwoord',
      exercises: [
        {
          id: 'ex-l2-reg',
          type: 'multiple_choice',
          question: 'Je ziet je buurman om 08:00. Wat zeg je?',
          options: ['Goedenavond!', 'Goedemorgen!', 'Tot morgen!'],
          correctAnswer: 'Goedemorgen!',
          difficulty: 'A2_mid',
          metadata: {},
        },
      ],
      feedbackConfig: { errorTags: ['register'] },
      metadata: {},
    },
    {
      id: 'l2-speak',
      type: 'speaking',
      prompt: 'Zeg hardop',
      content: {
        targetNl: 'Goedenavond!',
        acceptable: ['Goedenavond', 'goedenavond'],
        maxRecordingSeconds: 25,
      },
      interactionConfig: { requiresMicrophone: false, mockTranscript: 'Goedenavond' },
      feedbackConfig: { pronunciationTips: 'Klemtoon op *goe* en *avond*.' },
      metadata: {},
    },
    {
      id: 'l2-recap',
      type: 'recap',
      prompt: 'Check',
      content: {
        lemmas: ['ochtend', 'avond'],
        tasks: [
          {
            kind: 'fill_blank',
            sentence: '___ ! (’s avonds)',
            options: ['Goedenavond', 'Goedemorgen'],
            correctAnswer: 'Goedenavond',
          },
        ],
      },
      metadata: {},
    },
  ],
}

const lesson03 = {
  id: 'a2-m01-l03-see-you-soon',
  moduleId: 'a2-m01-people-daily',
  title: 'See you soon — straks & morgen',
  lessonType: 'practice',
  order: 2,
  cefrLevel: 'A2',
  durationEstimate: 11,
  grammarTargets: ['a2.1-present-tense'],
  vocabTargets: ['lemma-straks', 'lemma-morgen', 'lemma-gaan'],
  canDoStatements: ['I can close a chat with a simple “see you” phrase.'],
  reviewItemRefs: [] as string[],
  mistakeFocus: ['vocab'],
  metadata: { theme: 'people_daily_rhythm', schemaPlayer: true },
  steps: [
    {
      id: 'l3-discovery',
      type: 'discovery',
      prompt: 'Tik en luister',
      content: {
        phrases: [
          { nl: 'Tot straks!', en: 'See you in a bit!' },
          { nl: 'Tot morgen!', en: 'See you tomorrow!' },
          { nl: 'Tot zo!', en: 'See you soon!' },
        ],
      },
      metadata: {},
    },
    {
      id: 'l3-mcq',
      type: 'mcq',
      prompt: 'Welke afsluiting past?',
      exercises: [
        {
          id: 'ex-l3-1',
          type: 'multiple_choice',
          question: 'Je gaat nu weg en ziet je vriend vanavond weer.',
          options: ['Tot morgen!', 'Tot straks!', 'Goedemorgen!'],
          correctAnswer: 'Tot straks!',
          difficulty: 'A2_mid',
          metadata: {},
        },
      ],
      feedbackConfig: { errorTags: ['vocab'] },
      metadata: {},
    },
    {
      id: 'l3-reorder',
      type: 'reorder',
      prompt: 'Maak de zin',
      exercises: [
        {
          id: 'ex-l3-ro',
          type: 'reorder',
          question: 'Zet in de juiste volgorde.',
          options: ['Tot', 'morgen!'],
          correctAnswer: 'Tot morgen!',
          difficulty: 'A2_low',
          metadata: {},
        },
      ],
      interactionConfig: { delimiter: ' ' },
      feedbackConfig: { errorTags: ['word-order'] },
      metadata: {},
    },
    {
      id: 'l3-speak',
      type: 'speaking',
      prompt: 'Zeg het in één keer',
      content: {
        targetNl: 'Tot straks!',
        acceptable: ['Tot straks'],
        maxRecordingSeconds: 20,
      },
      interactionConfig: { requiresMicrophone: false, mockTranscript: 'Tot straks' },
      feedbackConfig: { pronunciationTips: 'Korte *t* in *straks*.' },
      metadata: {},
    },
    {
      id: 'l3-recap',
      type: 'recap',
      prompt: 'Laatste check',
      content: {
        lemmas: ['straks', 'morgen'],
        tasks: [
          {
            kind: 'mcq',
            question: 'Welk woord = tomorrow?',
            options: ['morgen', 'vandaag', 'straks'],
            correctAnswer: 'morgen',
          },
        ],
      },
      metadata: {},
    },
  ],
}

const catalog = peopleDaily.moduleCatalog as { grammarTargets: unknown[]; vocabTargets: unknown[] }
const lesson01 = peopleDaily.lesson as object

const moduleJson = {
  id: 'a2-m01-people-daily',
  title: 'People & daily rhythm',
  band: 'A2.1',
  description: 'Greetings, small talk about your day, simple closures (straks / morgen).',
  order: 0,
  learningGoals: [
    'Handle short friendly chats about today',
    'Use basic greetings by time of day',
    'Close a conversation naturally',
  ],
  grammarTargets: catalog.grammarTargets,
  vocabTargets: [...catalog.vocabTargets, ...extraVocab],
  lessons: [lesson01, lesson02, lesson03],
  metadata: {
    contentFormatVersion: 1,
    spine: 'a2-m01',
  },
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(moduleJson, null, 2), 'utf8')
console.log('Wrote', OUT)
