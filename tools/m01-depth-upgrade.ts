/**
 * One-shot depth upgrade for Module 1 (a2-m01-people-daily):
 * - Inserts a practice_loop (6 exercises) before each lesson's recap step
 * - Sets durationEstimate + lessonDepth metadata
 *
 * Run: npx tsx --tsconfig tsconfig.json tools/m01-depth-upgrade.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MODULE_PATH = join(ROOT, 'content/modules/a2-m01-people-daily/module.json')

type Ex = {
  id: string
  question: string
  difficulty: 'A2_low' | 'A2_mid' | 'A2_high'
  metadata: Record<string, unknown>
  type: 'multiple_choice' | 'fill_blank' | 'reorder'
  options: string[]
  correctAnswer: string
}

function loopStep(
  lessonKey: string,
  prompt: string,
  lemmas: string[],
  exercises: Ex[],
  errorTags: string[]
): Record<string, unknown> {
  return {
    id: `m01-${lessonKey}-depth-v2`,
    prompt,
    content: { lemmas },
    interactionConfig: { delimiter: ' ' },
    feedbackConfig: { errorTags },
    exercises,
    metadata: { depthLayer: 'm01-v2' },
    type: 'practice_loop',
  }
}

const DEPTH: Record<string, { prompt: string; lemmas: string[]; exercises: Ex[]; tags: string[] }> = {
  l01: {
    prompt: 'Nog een ronde — vriendelijke chat (6×)',
    lemmas: ['vriend', 'vandaag', 'gaan', 'werken'],
    tags: ['listening', 'vocab'],
    exercises: [
      mcq('m01-l01-dv2-1', 'Welke zin is een groet?', ['Hoe gaat het?', 'Ik ga werken.', 'Vandaag ben ik moe.'], 'Hoe gaat het?'),
      mcq('m01-l01-dv2-2', 'Natuurlijk antwoord op *Hoe gaat het?*', ['Goed!', 'Tot ziens.', 'Waar woon je?'], 'Goed!'),
      fill('m01-l01-dv2-3', 'Ik ___ vandaag werken.', ['ga', 'ben', 'heb'], 'ga'),
      reorder('m01-l01-dv2-4', ['Ik', 'ga', 'vandaag', 'werken'], 'Ik ga vandaag werken'),
      mcq('m01-l01-dv2-5', 'Wat is *vandaag*?', ['een dag-deel', 'een naam', 'een werkwoord'], 'een dag-deel'),
      fill('m01-l01-dv2-6', '___ gaat het met je?', ['Hoe', 'Wat', 'Waar'], 'Hoe'),
    ],
  },
  l02: {
    prompt: 'Herhaal & varieer — introducties (6×)',
    lemmas: ['naam', 'werk', 'thuis', 'studeer'],
    tags: ['grammar', 'vocab'],
    exercises: [
      mcq('m01-l02-dv2-1', 'Welke zin stelt je voor?', ['Ik ben Noa.', 'Waar woon je?', 'Tot straks.'], 'Ik ben Noa.'),
      fill('m01-l02-dv2-2', 'Ik werk in een ___.', ['winkel', 'naam', 'thuis'], 'winkel'),
      reorder('m01-l02-dv2-3', ['ben', 'Ik', 'Tim'], 'Ik ben Tim'),
      mcq('m01-l02-dv2-4', 'Betere vraag over wonen?', ['Waar woon je?', 'Waar je woont?', 'Woon je waar?'], 'Waar woon je?'),
      fill('m01-l02-dv2-5', 'Ik studeer ___.', ['nog', 'niet', 'gisteren'], 'nog'),
      mcq('m01-l02-dv2-6', 'Wat betekent *collega* ongeveer?', ['iemand van werk', 'alleen familie', 'een vakantie'], 'iemand van werk'),
    ],
  },
  l03: {
    prompt: 'Extra present-tense — snelle mix (6×)',
    lemmas: ['gaan', 'werken', 'eten', 'slapen'],
    tags: ['grammar', 'word-order'],
    exercises: [
      mcq('m01-l03-dv2-1', 'Welke zin klinkt als plan?', ['Ik ga zo eten.', 'Ik eten zo ga.', 'Zo eten ik ga.'], 'Ik ga zo eten.'),
      fill('m01-l03-dv2-2', '___ je vandaag thuis?', ['Ben', 'Ga', 'Heb'], 'Ben'),
      reorder('m01-l03-dv2-3', ['Ik', 'slapen', 'ga', 'zo'], 'Ik ga zo slapen'),
      mcq('m01-l03-dv2-4', 'Welke zin is een ja/nee-vraag?', ['Ga je mee?', 'Ik ga mee.', 'Mee ga ik.'], 'Ga je mee?'),
      fill('m01-l03-dv2-5', 'Ik ___ vandaag vrij.', ['ben', 'ga', 'heb'], 'ben'),
      mcq('m01-l03-dv2-6', 'Beste woordvolgorde?', ['Ik ga vandaag werken.', 'Ik vandaag ga werken.', 'Werken ik ga vandaag.'], 'Ik ga vandaag werken.'),
    ],
  },
  l04: {
    prompt: 'Vragen — nog een drill (6×)',
    lemmas: ['wat', 'hoe', 'waar', 'wanneer'],
    tags: ['grammar', 'word-order'],
    exercises: [
      mcq('m01-l04-dv2-1', 'Welke zin is een echte vraag?', ['Wat doe je?', 'Ik doe wat.', 'Wat ik doe.'], 'Wat doe je?'),
      fill('m01-l04-dv2-2', '___ woon je?', ['Waar', 'Waarom', 'Wanneer'], 'Waar'),
      reorder('m01-l04-dv2-r1', ['Hoe', 'gaat', 'het', '?'], 'Hoe gaat het?'),
      mcq('m01-l04-dv2-4b', 'Welke vraag hoort bij *tijd*?', ['Wanneer?', 'Waar?', 'Wie?'], 'Wanneer?'),
      fill('m01-l04-dv2-5', '___ doe je vanavond?', ['Wat', 'Hoe', 'Waar'], 'Wat'),
      mcq('m01-l04-dv2-6', 'Welke zin heeft goede woordvolgorde?', ['Waar kom je vandaan?', 'Waar vandaan kom je?', 'Kom je waar vandaan?'], 'Waar kom je vandaan?'),
    ],
  },
  l05: {
    prompt: 'Routine — luisteren & kiezen (6×)',
    lemmas: ['vandaag', 'ochtend', 'avond', 'werken'],
    tags: ['listening', 'vocab'],
    exercises: [
      mcq('m01-l05-dv2-1', 'Welk deel gaat over *later op de dag*?', ['\'s Avonds', '\'s Ochtends', 'Vorig jaar'], '\'s Avonds'),
      fill('m01-l05-dv2-2', 'Vandaag ___ ik thuis.', ['werk', 'werken', 'werkt'], 'werk'),
      mcq('m01-l05-dv2-3', 'Welke zin is over *plan*?', ['Ik ga uit eten.', 'Ik ben moe.', 'Het is koud.'], 'Ik ga uit eten.'),
      reorder('m01-l05-dv2-4', ['werk', 'Ik', 'thuis', 'Vandaag'], 'Vandaag werk ik thuis'),
      fill('m01-l05-dv2-5', '___ avond ga ik naar huis.', ['\'s', 'In', 'Op'], '\'s'),
      mcq('m01-l05-dv2-6', 'Synoniem voor *later vandaag* (informeel)?', ['straks', 'gisteren', 'ooit'], 'straks'),
    ],
  },
  l06: {
    prompt: 'Plannen — vandaag / vanavond (6×)',
    lemmas: ['vandaag', 'vanavond', 'straks', 'morgen'],
    tags: ['listening', 'vocab'],
    exercises: [
      mcq('m01-l06-dv2-1', 'Welke zin gaat over *later vandaag*?', ['Vanavond ga ik uit.', 'Gisteren ging ik uit.', 'Morgen ga ik uit.'], 'Vanavond ga ik uit.'),
      fill('m01-l06-dv2-2', '___ ga ik sporten.', ['Straks', 'Gisteren', 'Ooit'], 'Straks'),
      mcq('m01-l06-dv2-3', 'Wat is *vandaag*?', ['de dag waar nu is', 'alleen morgen', 'alleen gisteren'], 'de dag waar nu is'),
      reorder('m01-l06-dv2-4', ['werk', 'Ik', 'vandaag', 'thuis'], 'Ik werk vandaag thuis'),
      fill('m01-l06-dv2-5', 'Tot ___.', ['morgen', 'gisteren', 'nooit'], 'morgen'),
      mcq('m01-l06-dv2-6', 'Welke vraag hoort bij plannen?', ['Wat doe je vanavond?', 'Wat is je naam?', 'Waar is het toilet?'], 'Wat doe je vanavond?'),
    ],
  },
  l07: {
    prompt: 'Zijn / hebben / gaan — extra (6×)',
    lemmas: ['ben', 'heb', 'ga', 'is'],
    tags: ['grammar', 'vocab'],
    exercises: [
      mcq('m01-l07-dv2-1', 'Welke zin is over *toestand*?', ['Ik ben moe.', 'Ik ga moe.', 'Ik heb moe.'], 'Ik ben moe.'),
      fill('m01-l07-dv2-2', 'Ik ___ tijd.', ['heb', 'ben', 'ga'], 'heb'),
      mcq('m01-l07-dv2-3', 'Welke zin is over *plan*?', ['Ik ga naar huis.', 'Ik ben naar huis.', 'Ik heb naar huis.'], 'Ik ga naar huis.'),
      reorder('m01-l07-dv2-4', ['tijd', 'Ik', 'heb', 'geen'], 'Ik heb geen tijd'),
      fill('m01-l07-dv2-5', 'Het ___ druk. (het-weer)', ['is', 'ben', 'heb'], 'is'),
      mcq('m01-l07-dv2-6', 'Welke vraag hoort bij *hoe je je voelt*?', ['Hoe gaat het?', 'Waar ga je?', 'Wat heb je?'], 'Hoe gaat het?'),
    ],
  },
  l08: {
    prompt: 'Schrijven — micro-herhaling (6×)',
    lemmas: ['vandaag', 'nu', 'morgen', 'thuis'],
    tags: ['grammar', 'word-order'],
    exercises: [
      mcq('m01-l08-dv2-1', 'Welke app-regel is meest natuurlijk?', ['Ik werk vandaag thuis.', 'Ik vandaag werk thuis.', 'Werk ik thuis vandaag fout.'], 'Ik werk vandaag thuis.'),
      fill('m01-l08-dv2-2', 'Nu ___ ik koffie halen.', ['ga', 'ben', 'heb'], 'ga'),
      reorder('m01-l08-dv2-3', ['ben', 'Ik', 'morgen', 'vrij'], 'Ik ben morgen vrij'),
      mcq('m01-l08-dv2-4', 'Welke zin is vriendelijk open?', ['Hoi! Ik ben nu druk.', 'Dag meneer de koning.', 'Ik ben een tafel.'], 'Hoi! Ik ben nu druk.'),
      fill('m01-l08-dv2-5', '___ werk ik thuis.', ['Vandaag', 'Gisteren', 'Nooit'], 'Vandaag'),
      mcq('m01-l08-dv2-6', 'Wat betekent *straks* hier?', ['later', 'gisteren', 'nooit'], 'later'),
    ],
  },
  l09: {
    prompt: 'Chat — volgende beurt (6×)',
    lemmas: ['hoe', 'wat', 'straks', 'goed'],
    tags: ['register', 'vocab'],
    exercises: [
      mcq('m01-l09-dv2-1', 'Welke reactie past bij *Hoe gaat het?*', ['Goed! En met jou?', 'Tot ziens.', 'Dag meneer.'], 'Goed! En met jou?'),
      mcq('m01-l09-dv2-2', 'Natuurlijk antwoord op *Wat doe je vandaag?*', ['Ik ga straks sporten.', 'Ik ben vandaag.', 'Wat is vandaag?'], 'Ik ga straks sporten.'),
      fill('m01-l09-dv2-3', '___ gaat het?', ['Hoe', 'Wat', 'Waar'], 'Hoe'),
      reorder('m01-l09-dv2-4', ['doe', 'je', 'Wat', 'vandaag', '?'], 'Wat doe je vandaag?'),
      mcq('m01-l09-dv2-5', 'Wat is *vandaag*?', ['de dag waar nu is', 'alleen morgen', 'alleen gisteren'], 'de dag waar nu is'),
      mcq('m01-l09-dv2-6', 'Welke zin sluit een kort chatje af?', ['Tot straks!', 'Goedemorgen!', 'Hoe gaat het?'], 'Tot straks!'),
    ],
  },
  l10: {
    prompt: 'Weekend — mini-drill (6×)',
    lemmas: ['weekend', 'familie', 'vanavond', 'morgen'],
    tags: ['listening', 'vocab'],
    exercises: [
      mcq('m01-l10-dv2-1', 'Welke vraag hoort bij weekend?', ['Wat doe je dit weekend?', 'Wat is je adres?', 'Hoe lang is je haar?'], 'Wat doe je dit weekend?'),
      fill('m01-l10-dv2-2', 'Vanavond ___ ik.', ['werk', 'werken', 'werkt'], 'werk'),
      mcq('m01-l10-dv2-3', 'Welke zin is beleefd afsluiten?', ['Fijn weekend!', 'Tot gisteren!', 'Ik ben een tafel.'], 'Fijn weekend!'),
      reorder('m01-l10-dv2-4', ['Ik', 'ga', 'morgen', 'werken'], 'Ik ga morgen werken'),
      fill('m01-l10-dv2-5', '___ weekend!', ['Fijn', 'Slecht', 'Oud'], 'Fijn'),
      mcq('m01-l10-dv2-6', 'Welke zin gaat over *later vandaag*?', ['Vanavond werk ik.', 'Gisteren werk ik.', 'Ik werk altijd.'], 'Vanavond werk ik.'),
    ],
  },
}

function mcq(id: string, question: string, options: string[], correct: string): Ex {
  return {
    id,
    question,
    difficulty: 'A2_mid',
    metadata: {},
    type: 'multiple_choice',
    options,
    correctAnswer: correct,
  }
}

function fill(id: string, question: string, options: string[], correct: string): Ex {
  return {
    id,
    question,
    difficulty: 'A2_low',
    metadata: {},
    type: 'fill_blank',
    options,
    correctAnswer: correct,
  }
}

function reorder(id: string, options: string[], correct: string): Ex {
  return {
    id,
    question: 'Zet in de juiste volgorde.',
    difficulty: 'A2_low',
    metadata: {},
    type: 'reorder',
    options,
    correctAnswer: correct,
  }
}

const LESSON_ORDER: { id: string; key: string }[] = [
  { id: 'a2-m01-l01-listening-friendly-chats-gist', key: 'l01' },
  { id: 'a2-m01-l02-listening-intro-routines', key: 'l02' },
  { id: 'a2-m01-l03-grammar-present-daily-verbs', key: 'l03' },
  { id: 'a2-m01-l04-practice-questions-word-order', key: 'l04' },
  { id: 'a2-m01-l05-speaking-daily-routine', key: 'l05' },
  { id: 'a2-m01-l06-listening-variation-plans', key: 'l06' },
  { id: 'a2-m01-l07-grammar-zijn-hebben', key: 'l07' },
  { id: 'a2-m01-l08-writing-short-update', key: 'l08' },
  { id: 'a2-m01-l09-task-chat-scaffolded', key: 'l09' },
  { id: 'a2-m01-l10-task-mini-dialogue', key: 'l10' },
]

function main(): void {
  const raw = JSON.parse(readFileSync(MODULE_PATH, 'utf8')) as {
    lessons: Array<{
      id: string
      durationEstimate?: number
      metadata?: Record<string, unknown>
      steps: Array<{ type: string; id: string }>
    }>
  }

  for (const { id, key } of LESSON_ORDER) {
    const lesson = raw.lessons.find((l) => l.id === id)
    if (!lesson) throw new Error(`Missing lesson ${id}`)
    const spec = DEPTH[key]
    if (!spec) throw new Error(`Missing depth spec ${key}`)

    const recapIdx = lesson.steps.findIndex((s) => s.type === 'recap')
    if (recapIdx < 0) throw new Error(`No recap in ${id}`)

    const step = loopStep(key, spec.prompt, spec.lemmas, spec.exercises, spec.tags)
    const exists = lesson.steps.some((s) => s.id === (step.id as string))
    if (!exists) {
      lesson.steps.splice(recapIdx, 0, step as never)
    }

    lesson.durationEstimate = 14
    lesson.metadata = {
      ...(lesson.metadata ?? {}),
      lessonDepth: { m01: 'v2', targetMicroInteractions: '28-38' },
    }
  }

  // Mixed review l11: append exercises to mega-loop + recap tasks
  const l11 = raw.lessons.find((l) => l.id === 'a2-m01-l11-mixed-review')
  if (!l11) throw new Error('Missing l11')
  const mega = l11.steps.find((s) => s.id === 'm01-l11-mega-loop') as
    | { exercises?: Ex[]; prompt?: string }
    | undefined
  if (mega?.exercises) {
    const extra: Ex[] = [
      mcq('m01-l11-m9', 'Welke zin is een korte status?', ['Ik ben moe.', 'Ik ben een tafel.', 'Ik ben een adres.'], 'Ik ben moe.'),
      fill('m01-l11-m10', '___ ga je naar huis?', ['Straks', 'Gisteren', 'Nooit'], 'Straks'),
      mcq('m01-l11-m11', 'Welke vraag hoort bij *plannen*?', ['Wat doe je straks?', 'Wat is je naam?', 'Waar is het toilet?'], 'Wat doe je straks?'),
      reorder('m01-l11-m12', ['werk', 'Ik', 'vandaag', 'thuis'], 'Ik werk vandaag thuis'),
    ]
    const has = new Set(mega.exercises.map((e) => e.id))
    for (const e of extra) {
      if (!has.has(e.id)) mega.exercises.push(e)
    }
    mega.prompt = 'Gemengd — even alles (12×)'
  }

  const recapL11 = l11.steps.find((s) => s.id === 'm01-l11-recap') as
    | { content?: { tasks?: unknown[] } }
    | undefined
  if (recapL11?.content?.tasks) {
    const tasks = recapL11.content.tasks as Array<{ sentence?: string }>
    if (!tasks.some((t) => typeof t?.sentence === 'string' && t.sentence.includes('met je werk'))) {
      tasks.push({
        kind: 'fill_blank',
        sentence: '___ gaat het met je werk?',
        options: ['Hoe', 'Wat', 'Waar'],
        correctAnswer: 'Hoe',
      })
      tasks.push({
        kind: 'listen_mcq',
        question: 'Welke zin is een groet?',
        snippetNl: 'Hoi! Hoe gaat het?',
        options: ['Een groet.', 'Een adres.', 'Een weerbericht.'],
        correctAnswer: 'Een groet.',
      })
    }
  }

  l11.durationEstimate = 16
  l11.metadata = { ...(l11.metadata ?? {}), lessonDepth: { m01: 'v2', targetMicroInteractions: '32-40' } }

  writeFileSync(MODULE_PATH, JSON.stringify(raw, null, 2), 'utf8')
  console.log(`[m01-depth-upgrade] wrote ${MODULE_PATH}`)
}

main()
