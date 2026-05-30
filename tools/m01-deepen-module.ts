/**
 * Deepens Module 1 (People & daily rhythm): interaction density, practice_loop,
 * multi-MCQ listening, preview engagement, writing steps, richer recaps.
 *
 * Run from repo root:
 *   npx tsx --tsconfig tsconfig.json tools/m01-deepen-module.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MODULE_PATH = join(ROOT, 'content/modules/a2-m01-people-daily/module.json')

type AnyStep = Record<string, unknown> & { id: string; type: string; exercises?: unknown[]; content?: unknown }
type AnyLesson = Record<string, unknown> & { id: string; steps: AnyStep[] }

function mcq(
  id: string,
  question: string,
  options: [string, string, string],
  correctAnswer: string,
  difficulty: 'A2_low' | 'A2_mid' = 'A2_low'
) {
  return {
    id,
    type: 'multiple_choice',
    question,
    options: [...options],
    correctAnswer,
    difficulty,
    metadata: {},
  }
}

function fill(id: string, question: string, options: string[], correctAnswer: string) {
  return {
    id,
    type: 'fill_blank',
    question,
    options,
    correctAnswer,
    difficulty: 'A2_low' as const,
    metadata: {},
  }
}

function ro(id: string, tokens: string[], correctAnswer: string) {
  return {
    id,
    type: 'reorder',
    question: 'Zet in de juiste volgorde.',
    options: [...tokens],
    correctAnswer,
    difficulty: 'A2_low' as const,
    metadata: {},
  }
}

function requireAllPreview(steps: AnyStep[]): AnyStep[] {
  return steps.map((s) => {
    if (s.type !== 'preview') return s
    return {
      ...s,
      interactionConfig: { ...(typeof s.interactionConfig === 'object' && s.interactionConfig ? s.interactionConfig : {}), requireAllPreviewPlayed: true },
    }
  })
}

function insertAfter(steps: AnyStep[], afterId: string, toInsert: AnyStep[]): AnyStep[] {
  const i = steps.findIndex((s) => s.id === afterId)
  if (i < 0) return steps
  return [...steps.slice(0, i + 1), ...toInsert, ...steps.slice(i + 1)]
}

function patchListeningExercises(steps: AnyStep[], stepId: string, append: unknown[]): AnyStep[] {
  return steps.map((s) => {
    if (s.id !== stepId || (s.type !== 'listening' && s.type !== 'listen_read')) return s
    const ex = Array.isArray(s.exercises) ? [...s.exercises] : []
    const mcqs = ex.filter((e: { type?: string }) => e && typeof e === 'object' && (e as { type: string }).type === 'multiple_choice')
    const rest = ex.filter((e: { type?: string }) => !e || typeof e !== 'object' || (e as { type: string }).type !== 'multiple_choice')
    const merged = [...append, ...mcqs, ...rest]
    return { ...s, exercises: merged }
  })
}

function setDuration(lesson: AnyLesson, n: number): AnyLesson {
  return { ...lesson, durationEstimate: n }
}

function deepenLesson(lesson: AnyLesson): AnyLesson {
  let steps = requireAllPreview([...lesson.steps]) as AnyStep[]
  const id = lesson.id

  if (id === 'a2-m01-l01-listening-friendly-chats-gist') {
    steps = patchListeningExercises(steps, 'm01-l01-step-listen-hook', [
      mcq(
        'm01-l01-ex-listen-gist',
        'Eerst globaal: waar gaat dit gesprek vooral over?',
        ['Korte, vriendelijke plannen voor vandaag', 'Een doktersafspraak', 'Werk op kantoor alleen'],
        'Korte, vriendelijke plannen voor vandaag'
      ),
      mcq(
        'm01-l01-ex-listen-sam',
        'Wat doet Sam vandaag nog (na het werk)?',
        ['Hij gaat sporten', 'Hij gaat slapen', 'Hij gaat studeren'],
        'Hij gaat sporten'
      ),
      mcq(
        'm01-l01-ex-listen-keyword',
        'Welke zin zegt Kim over haar plan met werk?',
        ['Ik ga werken', 'Ik ga sporten', 'Hoe gaat het?'],
        'Ik ga werken'
      ),
    ])
    steps = insertAfter(steps, 'm01-l01-step-discovery', [
      {
        id: 'm01-l01-step-notice-loop',
        type: 'practice_loop',
        prompt: 'Patroon herkennen (6×)',
        content: { lemmas: ['gaan', 'vandaag', 'werken'] },
        feedbackConfig: { errorTags: ['grammar'], hint: 'Let op vraagzin vs zin.' },
        interactionConfig: { delimiter: ' ' },
        exercises: [
          mcq('m01-l01-pl-1', 'Welke zin is een vraag?', ['Wat doe je vandaag?', 'Ik ga werken.', 'Goed, dank je.'], 'Wat doe je vandaag?', 'A2_mid'),
          mcq('m01-l01-pl-2', 'Welke reactie past bij *Hoe gaat het?*', ['Goed, dank je!', 'Ik ga vandaag werken.', 'Tot straks!'], 'Goed, dank je!', 'A2_mid'),
          fill('m01-l01-pl-3', 'Vul in: ___ gaat het?', ['Hoe', 'Wat', 'Waar'], 'Hoe'),
          ro('m01-l01-pl-4', ['vandaag', 'Ik', 'ga', 'werken'], 'Ik ga vandaag werken'),
          mcq('m01-l01-pl-5', 'Betere versie?', ['Ik ga vandaag werken.', 'Ik vandaag ga werken.', 'Werken ik vandaag ga.'], 'Ik ga vandaag werken.', 'A2_mid'),
          fill('m01-l01-pl-6', '___ doe je vandaag?', ['Wat', 'Hoe', 'Waar'], 'Wat'),
        ],
        metadata: {},
      },
    ])
    steps = insertAfter(steps, 'm01-l01-step-speak', [
      {
        id: 'm01-l01-step-speak-2',
        type: 'speaking',
        prompt: 'Herhaal en verbeter: antwoord op de groet',
        content: {
          targetNl: 'Goed, dank je!',
          acceptable: ['Goed dank je', 'goed dank je', 'Goed, dank je'],
          maxRecordingSeconds: 28,
        },
        interactionConfig: { requiresMicrophone: false, mockTranscript: 'Goed dank je' },
        feedbackConfig: { pronunciationTips: 'Kort en vriendelijk.' },
        metadata: {},
      },
      {
        id: 'm01-l01-step-speak-3',
        type: 'speaking',
        prompt: 'Variatie: stel dezelfde vraag',
        content: {
          targetNl: 'En jij?',
          acceptable: ['En jij', 'en jij'],
          maxRecordingSeconds: 20,
        },
        interactionConfig: { requiresMicrophone: false, mockTranscript: 'En jij' },
        feedbackConfig: {},
        metadata: {},
      },
    ])
    const recapIdx = steps.findIndex((s) => s.id === 'm01-l01-step-recap')
    if (recapIdx >= 0) {
      const r = steps[recapIdx] as AnyStep & { content?: { tasks?: unknown[] } }
      const tasks = [...(r.content?.tasks ?? [])]
      tasks.push(
        {
          kind: 'fill_blank',
          sentence: 'Ik ga vandaag ___.',
          options: ['werken', 'moe', 'thuis'],
          correctAnswer: 'werken',
        },
        {
          kind: 'listen_mcq',
          question: 'Welke toon past bij een vriend?',
          snippetNl: 'Hoe gaat het?',
          options: ['Informeel en kort.', 'Zeer formeel.', 'Alleen zakelijk.'],
          correctAnswer: 'Informeel en kort.',
        }
      )
      steps[recapIdx] = { ...r, content: { ...r.content, tasks } }
    }
    return setDuration({ ...lesson, steps }, 15)
  }

  if (id === 'a2-m01-l02-listening-intro-routines') {
    steps = steps.map((s) => {
      if (s.id !== 'm01-l02-listen') return s
      const c = { ...(typeof s.content === 'object' && s.content ? (s.content as object) : {}), hideTranscriptUntilPlayed: false }
      return { ...s, type: 'listen_read', content: c }
    })
    steps = patchListeningExercises(steps, 'm01-l02-listen', [
      mcq(
        'm01-l02-ex-gist',
        'Globaal: waar gaat dit gesprek over?',
        ['Kennismaken + werk/studie + wonen', 'Alleen het weer', 'Een treinkaartje'],
        'Kennismaken + werk/studie + wonen'
      ),
      mcq(
        'm01-l02-ex-detail',
        'Waar woont Tim?',
        ['In Utrecht', 'In Amsterdam', 'In Rotterdam'],
        'In Utrecht'
      ),
      mcq(
        'm01-l02-ex-noa',
        'Wat doet Noa (studie)?',
        ['Ze studeert nog', 'Ze werkt in een winkel', 'Ze is met pensioen'],
        'Ze studeert nog'
      ),
    ])
    steps = insertAfter(steps, 'm01-l02-discovery', [
      {
        id: 'm01-l02-phrase-loop',
        type: 'practice_loop',
        prompt: 'Zinnen uit het gesprek (5×)',
        content: { lemmas: ['naam', 'werken', 'thuis'] },
        feedbackConfig: { errorTags: ['vocab'] },
        interactionConfig: { delimiter: ' ' },
        exercises: [
          mcq('m01-l02-pl-1', 'Betere introductie?', ['Ik ben Tim.', 'Ben ik Tim.', 'Tim ik ben.'], 'Ik ben Tim.', 'A2_mid'),
          fill('m01-l02-pl-2', 'Ik werk in een ___.', ['winkel', 'trein', 'ochtend'], 'winkel'),
          ro('m01-l02-pl-3', ['studeer', 'Ik', 'nog'], 'Ik studeer nog'),
          mcq('m01-l02-pl-4', 'Natuurlijke vraag over wonen?', ['Waar woon je?', 'Waar je woont?', 'Woon waar je?'], 'Waar woon je?', 'A2_mid'),
          fill('m01-l02-pl-5', 'Ik ben vaak ___.', ['thuis', 'werk', 'naam'], 'thuis'),
        ],
        metadata: {},
      },
    ])
    steps = insertAfter(steps, 'm01-l02-mcq', [
      {
        id: 'm01-l02-fix',
        type: 'mcq',
        prompt: 'Kies de betere versie',
        feedbackConfig: { errorTags: ['word-order'] },
        exercises: [
          mcq('m01-l02-fix-ex', 'Welke zin klinkt natuurlijker?', ['Ik werk vandaag thuis.', 'Ik vandaag werk thuis.', 'Werk ik thuis vandaag.'], 'Ik werk vandaag thuis.', 'A2_mid'),
        ],
        metadata: {},
      },
    ])
    const recapIdx = steps.findIndex((s) => s.id === 'm01-l02-recap')
    if (recapIdx >= 0) {
      const r = steps[recapIdx] as AnyStep & { content?: { tasks?: unknown[] } }
      const tasks = [
        ...(r.content?.tasks ?? []),
        {
          kind: 'listen_mcq',
          question: 'Tim zegt over zijn werk:',
          snippetNl: 'Ik werk in een winkel met een collega.',
          options: ['Hij werkt.', 'Hij studeert.', 'Hij slaapt.'],
          correctAnswer: 'Hij werkt.',
        },
      ]
      steps[recapIdx] = { ...r, content: { ...r.content, tasks } }
    }
    return setDuration({ ...lesson, steps }, 15)
  }

  if (id === 'a2-m01-l03-grammar-present-daily-verbs') {
    steps = insertAfter(steps, 'm01-l03-grammar', [
      {
        id: 'm01-l03-discovery-mini',
        type: 'discovery',
        prompt: 'Tik — merk het werkwoord',
        content: {
          phrases: [
            { nl: 'Ik ga vandaag werken.', en: "I'm going to work today.", focus: 'ga' },
            { nl: 'Ga je vandaag werken?', en: 'Are you going to work today?', focus: 'Ga' },
            { nl: 'Ik ga zo eten.', en: "I'm going to eat soon.", focus: 'eten' },
          ],
        },
        metadata: {},
      },
      {
        id: 'm01-l03-drill',
        type: 'practice_loop',
        prompt: 'Present — transform & fix (8×)',
        content: { lemmas: ['gaan', 'werken', 'eten', 'slapen', 'vandaag'] },
        feedbackConfig: { errorTags: ['grammar', 'word-order'] },
        interactionConfig: { delimiter: ' ' },
        exercises: [
          mcq('m01-l03-d1', 'Welke zin is een vraag?', ['Ga je naar huis?', 'Ik ga naar huis.', 'Naar huis ga ik.'], 'Ga je naar huis?', 'A2_mid'),
          ro('m01-l03-d2', ['vandaag', 'Ik', 'werk', 'thuis'], 'Ik werk vandaag thuis'),
          fill('m01-l03-d3', '___ je vandaag vrij?', ['Ben', 'Heb', 'Ga'], 'Ben'),
          mcq('m01-l03-d4', 'Juiste zin?', ['Ik ga zo eten.', 'Ik eten zo ga.', 'Zo ga ik eten fout.'], 'Ik ga zo eten.', 'A2_mid'),
          ro('m01-l03-d5', ['slapen', 'Ik', 'ga', 'zo'], 'Ik ga zo slapen'),
          fill('m01-l03-d6', 'Ik ___ naar huis. (ik-wijs)', ['ga', 'ben', 'heb'], 'ga'),
          mcq('m01-l03-d7', 'Welke zin heeft goede woordvolgorde?', ['Morgen ga ik werken.', 'Ik morgen ga werken.', 'Ga ik morgen werken fout.'], 'Morgen ga ik werken.', 'A2_mid'),
          fill('m01-l03-d8', '___ ga je vandaag doen?', ['Wat', 'Hoe', 'Waar'], 'Wat'),
        ],
        metadata: {},
      },
    ])
    const recapIdx = steps.findIndex((s) => s.id === 'm01-l03-recap')
    if (recapIdx >= 0) {
      const r = steps[recapIdx] as AnyStep & { content?: { tasks?: unknown[] } }
      const tasks = [
        ...(r.content?.tasks ?? []),
        { kind: 'listen_mcq', question: 'Welk plan?', snippetNl: 'Ik ga zo eten.', options: ['Eten.', 'Slapen.', 'Werken.'], correctAnswer: 'Eten.' },
        { kind: 'fill_blank', sentence: '___ je naar huis?', options: ['Ga', 'Ben', 'Heb'], correctAnswer: 'Ga' },
      ]
      steps[recapIdx] = { ...r, content: { ...r.content, tasks } }
    }
    return setDuration({ ...lesson, steps }, 15)
  }

  if (id === 'a2-m01-l04-practice-questions-word-order') {
    steps = insertAfter(steps, 'm01-l04-discovery', [
      {
        id: 'm01-l04-notice',
        type: 'practice_loop',
        prompt: 'Vraagvorm — snel herkennen (5×)',
        content: { lemmas: ['wat', 'waar', 'hoe', 'wanneer'] },
        feedbackConfig: { errorTags: ['grammar'] },
        interactionConfig: { delimiter: ' ' },
        exercises: [
          mcq('m01-l04-n1', 'Welk woord start meestal een WH-vraag over plek?', ['Waar', 'Hoe', 'Goed'], 'Waar', 'A2_mid'),
          mcq('m01-l04-n2', 'Welk woord past bij “op welk moment”?', ['Wanneer', 'Waar', 'Wat'], 'Wanneer', 'A2_mid'),
          fill('m01-l04-n3', '___ woon je?', ['Waar', 'Wat', 'Hoe'], 'Waar'),
          mcq('m01-l04-n4', 'Betere vraag?', ['Wat doe je?', 'Doe wat je?', 'Je wat doe?'], 'Wat doe je?', 'A2_mid'),
          ro('m01-l04-n5', ['het?', 'gaat', 'Hoe'], 'Hoe gaat het?'),
        ],
        metadata: {},
      },
    ])
    steps = insertAfter(steps, 'm01-l04-mcq-2', [
      {
        id: 'm01-l04-fix-loop',
        type: 'practice_loop',
        prompt: 'Verbeter de zin (4×)',
        feedbackConfig: { errorTags: ['word-order'] },
        interactionConfig: { delimiter: ' ' },
        exercises: [
          mcq('m01-l04-f1', 'Welke vraag is goed?', ['Waar woon je?', 'Woon je waar?', 'Je waar woon?'], 'Waar woon je?', 'A2_mid'),
          mcq('m01-l04-f2', 'Welke vraag is goed?', ['Wanneer ben je vrij?', 'Ben wanneer je vrij?', 'Vrij ben je wanneer?'], 'Wanneer ben je vrij?', 'A2_mid'),
          ro('m01-l04-f3', ['je', 'vandaag', 'Wat', 'doe', '?'], 'Wat doe je vandaag?'),
          fill('m01-l04-f4', '___ gaat het met je?', ['Hoe', 'Wat', 'Waar'], 'Hoe'),
        ],
        metadata: {},
      },
    ])
    steps = insertAfter(steps, 'm01-l04-speak', [
      {
        id: 'm01-l04-speak-2',
        type: 'speaking',
        prompt: 'Variatie: vraag naar “waar”',
        content: {
          targetNl: 'Waar woon je?',
          acceptable: ['Waar woon je', 'waar woon je'],
          maxRecordingSeconds: 24,
        },
        interactionConfig: { requiresMicrophone: false, mockTranscript: 'Waar woon je' },
        feedbackConfig: {},
        metadata: {},
      },
    ])
    const recapIdx = steps.findIndex((s) => s.id === 'm01-l04-recap')
    if (recapIdx >= 0) {
      const r = steps[recapIdx] as AnyStep & { content?: { tasks?: unknown[] } }
      const tasks = [
        ...(r.content?.tasks ?? []),
        { kind: 'reorder', tokens: ['vandaag', 'doe', 'je', 'Wat', '?'], correctAnswer: 'Wat doe je vandaag?' },
        { kind: 'speak', prompt: 'Zeg: *Wanneer ben je vrij?*', targetNl: 'Wanneer ben je vrij?', mockPass: true },
      ]
      steps[recapIdx] = { ...r, content: { ...r.content, tasks } }
    }
    return setDuration({ ...lesson, steps }, 15)
  }

  if (id === 'a2-m01-l05-speaking-daily-routine') {
    steps = patchListeningExercises(steps, 'm01-l05-listen', [
      mcq('m01-l05-l1', 'Wat doet Lisa ’s avonds?', ['Ze gaat uit eten', 'Ze werkt thuis', 'Ze gaat slapen'], 'Ze gaat uit eten'),
      mcq('m01-l05-l2', 'Welk deel gaat over overdag?', ['Vandaag werk ik thuis', 'Met een vriend', 'Uit eten'], 'Vandaag werk ik thuis'),
      mcq('m01-l05-l3', 'Welk woord geeft “later op de dag”?', ["'s Avonds", 'Vandaag', 'Nu'], "'s Avonds"),
    ])
    steps = insertAfter(steps, 'm01-l05-mcq', [
      {
        id: 'm01-l05-loop',
        type: 'practice_loop',
        prompt: 'Routine — mini-drill (5×)',
        content: { lemmas: ['vandaag', 'avond', 'thuis', 'werken'] },
        feedbackConfig: { errorTags: ['word-order'] },
        interactionConfig: { delimiter: ' ' },
        exercises: [
          mcq('m01-l05-p1', 'Natuurlijker?', ['Vandaag werk ik thuis.', 'Ik werk thuis vandaag fout.', 'Vandaag ik werk thuis.'], 'Vandaag werk ik thuis.', 'A2_mid'),
          ro('m01-l05-p2', ['eten', 'ga', 'ik', "'s Avonds", 'uit'], "'s Avonds ga ik uit eten"),
          fill('m01-l05-p3', '___ werk ik thuis.', ['Vandaag', 'Avond', 'Straks'], 'Vandaag'),
          mcq('m01-l05-p4', 'Welke tijd hoort bij ochtend?', ['ochtend', 'vanavond', 'straks'], 'ochtend'),
          fill('m01-l05-p5', 'In de ___ drink ik koffie.', ['ochtend', 'werk', 'huis'], 'ochtend'),
        ],
        metadata: {},
      },
    ])
    steps = insertAfter(steps, 'm01-l05-speak-2', [
      {
        id: 'm01-l05-speak-3',
        type: 'speaking',
        prompt: 'Vrije mini-respons: jouw echte dag (1 zin)',
        content: {
          targetNl: 'Vandaag werk ik en vanavond ontspan ik.',
          acceptable: [
            'Vandaag werk ik',
            'vandaag werk ik',
            'Ik werk vandaag',
            'ik werk vandaag',
            'Vandaag ben ik druk',
            'vandaag ben ik druk',
          ],
          maxRecordingSeconds: 32,
        },
        interactionConfig: { requiresMicrophone: false, mockTranscript: 'Vandaag werk ik' },
        feedbackConfig: { upgradeSuggestion: 'Mag kort en eerlijk — geen perfect nodig.' },
        metadata: {},
      },
    ])
    const recapIdx = steps.findIndex((s) => s.id === 'm01-l05-recap')
    if (recapIdx >= 0) {
      const r = steps[recapIdx] as AnyStep & { content?: { tasks?: unknown[] } }
      const tasks = [
        ...(r.content?.tasks ?? []),
        { kind: 'fill_blank', sentence: 'In de ___ kijk ik tv.', options: ['avond', 'ochtend', 'werk'], correctAnswer: 'avond' },
      ]
      steps[recapIdx] = { ...r, content: { ...r.content, tasks } }
    }
    return setDuration({ ...lesson, steps }, 15)
  }

  if (id === 'a2-m01-l06-listening-variation-plans') {
    steps = patchListeningExercises(steps, 'm01-l06-listen', [
      mcq('m01-l06-l1', 'Globaal: waar gaat het gesprek over?', ['Plannen met tijdwoorden', 'Het weer op vakantie', 'Sportuitslagen'], 'Plannen met tijdwoorden'),
      mcq('m01-l06-l2', 'Wat doet Jasper ná het sporten?', ['Koffie met een collega', 'Naar huis zonder iets', 'Naar bed'], 'Koffie met een collega'),
      mcq('m01-l06-l3', 'Wanneer bezoekt Eva familie?', ['Morgen', 'Vanavond', 'Straks'], 'Morgen'),
    ])
    steps = insertAfter(steps, 'm01-l06-mcq', [
      {
        id: 'm01-l06-match-loop',
        type: 'practice_loop',
        prompt: 'Tijdwoord + zin (5×)',
        content: { lemmas: ['vanavond', 'straks', 'morgen'] },
        feedbackConfig: { errorTags: ['vocab'] },
        interactionConfig: { delimiter: ' ' },
        exercises: [
          mcq('m01-l06-p1', 'Welk woord: “later vandaag”?', ['straks', 'morgen', 'gisteren'], 'straks'),
          mcq('m01-l06-p2', 'Welk woord: “de avond van vandaag”?', ['vanavond', 'ochtend', 'weekend'], 'vanavond'),
          fill('m01-l06-p3', '___ werk ik op kantoor.', ['Morgen', 'Straks', 'Nu'], 'Morgen'),
          ro('m01-l06-p4', ['boodschappen', 'Straks', 'ik', 'ga', 'doen'], 'Straks ga ik boodschappen doen'),
          mcq('m01-l06-p5', 'Welke zin klopt?', ['Vanavond ben ik thuis.', 'Ik ben thuis vanavond fout.', 'Thuis ben ik vanavond.'], 'Vanavond ben ik thuis.', 'A2_mid'),
        ],
        metadata: {},
      },
    ])
    const recapIdx = steps.findIndex((s) => s.id === 'm01-l06-recap')
    if (recapIdx >= 0) {
      const r = steps[recapIdx] as AnyStep & { content?: { tasks?: unknown[] } }
      const tasks = [
        ...(r.content?.tasks ?? []),
        { kind: 'fill_blank', sentence: '___ ga ik sporten.', options: ['Straks', 'Morgen', 'Gisteren'], correctAnswer: 'Straks' },
        { kind: 'reorder', tokens: ['thuis', 'Vanavond', 'ben', 'ik'], correctAnswer: 'Vanavond ben ik thuis' },
      ]
      steps[recapIdx] = { ...r, content: { ...r.content, tasks } }
    }
    return setDuration({ ...lesson, steps }, 15)
  }

  if (id === 'a2-m01-l07-grammar-zijn-hebben') {
    steps = insertAfter(steps, 'm01-l07-gc', [
      {
        id: 'm01-l07-notice',
        type: 'discovery',
        prompt: 'Tik — *ben* of *heb*?',
        content: {
          phrases: [
            { nl: 'Ik ben moe.', en: "I'm tired.", focus: 'ben' },
            { nl: 'Ik heb tijd.', en: 'I have time.', focus: 'heb' },
            { nl: 'Ik ben druk vandaag.', en: "I'm busy today.", focus: 'ben' },
          ],
        },
        metadata: {},
      },
      {
        id: 'm01-l07-drill',
        type: 'practice_loop',
        prompt: 'Zijn / hebben — drill (7×)',
        content: { lemmas: ['ben', 'heb', 'moe', 'tijd'] },
        feedbackConfig: { errorTags: ['grammar'] },
        interactionConfig: { delimiter: ' ' },
        exercises: [
          mcq('m01-l07-d1', 'Je bent moe. Wat zeg je?', ['Ik ben moe.', 'Ik heb moe.', 'Ik ga moe.'], 'Ik ben moe.', 'A2_mid'),
          mcq('m01-l07-d2', 'Je hebt een vraag. Wat zeg je?', ['Ik heb een vraag.', 'Ik ben een vraag.', 'Ik ga een vraag.'], 'Ik heb een vraag.', 'A2_mid'),
          fill('m01-l07-d3', 'Ik ___ tijd vanavond.', ['heb', 'ben', 'ga'], 'heb'),
          fill('m01-l07-d4', 'Ik ___ moe.', ['ben', 'heb', 'ga'], 'ben'),
          mcq('m01-l07-d5', 'Welke zin is fout?', ['Ik heb moe.', 'Ik heb tijd.', 'Ik heb een vriend.'], 'Ik heb moe.', 'A2_mid'),
          ro('m01-l07-d6', ['druk', 'Ik', 'ben', 'vandaag'], 'Ik ben vandaag druk'),
          fill('m01-l07-d7', 'Mijn zus ___ een kat.', ['heeft', 'is', 'ben'], 'heeft'),
        ],
        metadata: {},
      },
    ])
    const recapIdx = steps.findIndex((s) => s.id === 'm01-l07-recap')
    if (recapIdx >= 0) {
      const r = steps[recapIdx] as AnyStep & { content?: { tasks?: unknown[] } }
      const tasks = [
        ...(r.content?.tasks ?? []),
        { kind: 'reorder', tokens: ['tijd', 'Ik', 'heb'], correctAnswer: 'Ik heb tijd' },
        { kind: 'fill_blank', sentence: 'Wij ___ een afspraak.', options: ['hebben', 'zijn', 'gaan'], correctAnswer: 'hebben' },
      ]
      steps[recapIdx] = { ...r, content: { ...r.content, tasks } }
    }
    return setDuration({ ...lesson, steps }, 15)
  }

  if (id === 'a2-m01-l08-writing-short-update') {
    steps = insertAfter(steps, 'm01-l08-model', [
      {
        id: 'm01-l08-write-1',
        type: 'writing',
        prompt: 'Typ je update',
        content: {
          prompt: 'Schrijf in 4–8 woorden: vandaag + werk + thuis of kantoor.',
          acceptable: [
            'Ik werk vandaag thuis',
            'ik werk vandaag thuis',
            'Vandaag werk ik thuis',
            'vandaag werk ik thuis',
            'Ik werk thuis vandaag',
            'ik werk thuis vandaag',
            'Vandaag werk ik op kantoor',
            'vandaag werk ik op kantoor',
          ],
          modelNl: 'Ik werk vandaag thuis.',
          minChars: 10,
        },
        feedbackConfig: { errorTags: ['spelling', 'word-order'] },
        metadata: {},
      },
      {
        id: 'm01-l08-write-2',
        type: 'writing',
        prompt: 'Herschrijf iets vriendelijker',
        content: {
          prompt: 'Maak vriendelijk: begin met *Hoi!* en zeg dat je nu druk bent.',
          acceptable: [
            'Hoi ik ben nu druk',
            'Hoi, ik ben nu druk',
            'Hoi ik ben druk nu',
            'Hoi, ik ben druk',
          ],
          modelNl: 'Hoi! Ik ben nu druk.',
          minChars: 8,
        },
        feedbackConfig: { errorTags: ['register'] },
        metadata: {},
      },
    ])
    steps = insertAfter(steps, 'm01-l08-fill', [
      {
        id: 'm01-l08-loop',
        type: 'practice_loop',
        prompt: 'Korte lijntjes (4×)',
        content: { lemmas: ['vandaag', 'nu', 'ga'] },
        feedbackConfig: { errorTags: ['grammar'] },
        interactionConfig: { delimiter: ' ' },
        exercises: [
          ro('m01-l08-l1', ['thuis', 'Ik', 'vandaag', 'werk'], 'Ik werk vandaag thuis'),
          fill('m01-l08-l2', 'Nu ___ ik koffie halen.', ['ga', 'ben', 'heb'], 'ga'),
          mcq('m01-l08-l3', 'Betere app-regel?', ['Ik ga nu lunchen.', 'Nu ga ik lunchen.', 'Beide kunnen in chat.'], 'Beide kunnen in chat.', 'A2_mid'),
          fill('m01-l08-l4', '___ ben ik vrij.', ['Morgen', 'Nu', 'Vandaag'], 'Morgen'),
        ],
        metadata: {},
      },
    ])
    const recapIdx = steps.findIndex((s) => s.id === 'm01-l08-recap')
    if (recapIdx >= 0) {
      const r = steps[recapIdx] as AnyStep & { content?: { tasks?: unknown[] } }
      const tasks = [
        ...(r.content?.tasks ?? []),
        { kind: 'listen_mcq', question: 'Welke zin klinkt als update?', snippetNl: 'Vandaag werk ik thuis.', options: ['Korte status.', 'Formele brief.', 'Lange speech.'], correctAnswer: 'Korte status.' },
        { kind: 'fill_blank', sentence: '___ ga ik naar de supermarkt.', options: ['Straks', 'Gisteren', 'Ooit'], correctAnswer: 'Straks' },
      ]
      steps[recapIdx] = { ...r, content: { ...r.content, tasks } }
    }
    return setDuration({ ...lesson, steps, mistakeFocus: ['word-order', 'spelling', 'register'] }, 15)
  }

  if (id === 'a2-m01-l09-task-chat-scaffolded') {
    steps = patchListeningExercises(steps, 'm01-l09-listen', [
      mcq('m01-l09-l1', 'Wat is de toon van het gesprek?', ['Vriendelijk informeel', 'Juridisch', 'Zeer boos'], 'Vriendelijk informeel'),
      mcq('m01-l09-l2', 'Hoe begint Mila?', ['Hoi! Hoe gaat het?', 'Dag meneer.', 'Tot ziens.'], 'Hoi! Hoe gaat het?'),
    ])
    steps = insertAfter(steps, 'm01-l09-mcq-reply', [
      {
        id: 'm01-l09-scaffold',
        type: 'practice_loop',
        prompt: 'Mini-chat: kies de volgende zin (4×)',
        content: { lemmas: ['hoe', 'wat', 'straks'] },
        feedbackConfig: { errorTags: ['register'] },
        interactionConfig: { delimiter: ' ' },
        exercises: [
          mcq('m01-l09-s1', 'Antwoord op *Hoe gaat het?*', ['Goed! En met jou?', 'Tot ziens.', 'Dag meneer.'], 'Goed! En met jou?', 'A2_mid'),
          mcq('m01-l09-s2', 'Na *Wat doe je vandaag?* — natuurlijk antwoord:', ['Ik ga straks sporten.', 'Ik ben vandaag.', 'Wat is vandaag?'], 'Ik ga straks sporten.', 'A2_mid'),
          mcq('m01-l09-s3', 'Vervolgvraag?', ['En jij?', 'Tot ziens.', 'Dag.'], 'En jij?', 'A2_mid'),
          ro('m01-l09-s4', ['het?', 'Hoe', 'gaat'], 'Hoe gaat het?'),
        ],
        metadata: {},
      },
    ])
    steps = insertAfter(steps, 'm01-l09-speak', [
      {
        id: 'm01-l09-speak-2',
        type: 'speaking',
        prompt: 'Herhaal: korte beurt (alleen jij)',
        content: {
          targetNl: 'Goed! Wat doe je vandaag?',
          acceptable: ['Goed wat doe je vandaag', 'goed wat doe je vandaag'],
          maxRecordingSeconds: 28,
        },
        interactionConfig: { requiresMicrophone: false, mockTranscript: 'Goed wat doe je vandaag' },
        feedbackConfig: {},
        metadata: {},
      },
    ])
    const recapIdx = steps.findIndex((s) => s.id === 'm01-l09-recap')
    if (recapIdx >= 0) {
      const r = steps[recapIdx] as AnyStep & { content?: { tasks?: unknown[] } }
      const tasks = [
        ...(r.content?.tasks ?? []),
        { kind: 'listen_mcq', question: 'Mila vraagt:', snippetNl: 'Wat doe je vandaag?', options: ['Naar plannen.', 'Naar een naam.', 'Naar het weer.'], correctAnswer: 'Naar plannen.' },
        { kind: 'reorder', tokens: ['je', 'Wat', 'vandaag', 'doe', '?'], correctAnswer: 'Wat doe je vandaag?' },
      ]
      steps[recapIdx] = { ...r, content: { ...r.content, tasks } }
    }
    return setDuration({ ...lesson, steps }, 15)
  }

  if (id === 'a2-m01-l10-task-mini-dialogue') {
    steps = patchListeningExercises(steps, 'm01-l10-listen', [
      mcq('m01-l10-l1', 'Wat vraagt Omar eerst?', ['Wat doe je dit weekend?', 'Hoe gaat het?', 'Waar woon je?'], 'Wat doe je dit weekend?'),
      mcq('m01-l10-l2', 'Wat doet Sara vanavond?', ['Ze werkt', 'Ze gaat naar familie', 'Ze gaat sporten'], 'Ze werkt'),
    ])
    steps = insertAfter(steps, 'm01-l10-ro', [
      {
        id: 'm01-l10-task-loop',
        type: 'practice_loop',
        prompt: 'Weekend — fix & bouw (5×)',
        content: { lemmas: ['weekend', 'familie', 'morgen', 'vanavond'] },
        feedbackConfig: { errorTags: ['word-order', 'vocab'] },
        interactionConfig: { delimiter: ' ' },
        exercises: [
          mcq('m01-l10-p1', 'Betere vraag?', ['Wat doe je dit weekend?', 'Weekend wat doe je?', 'Doe je weekend wat?'], 'Wat doe je dit weekend?', 'A2_mid'),
          ro('m01-l10-p2', ['familie', 'naar', 'mijn', 'ga', 'Morgen', 'ik'], 'Morgen ga ik naar mijn familie'),
          fill('m01-l10-p3', '___ werk ik. (avond van vandaag)', ['Vanavond', 'Morgen', 'Straks'], 'Vanavond'),
          mcq('m01-l10-p4', 'Welke afsluiting past op vrijdag?', ['Fijn weekend!', 'Goedemorgen!', 'Tot morgenochtend!'], 'Fijn weekend!', 'A2_mid'),
          mcq('m01-l10-p5', 'Welke zin gebruikt *gaan + naar* goed?', ['Ik ga naar mijn familie.', 'Ik ga mijn familie.', 'Ik naar ga familie.'], 'Ik ga naar mijn familie.', 'A2_mid'),
        ],
        metadata: {},
      },
    ])
    steps = insertAfter(steps, 'm01-l10-speak', [
      {
        id: 'm01-l10-speak-2',
        type: 'speaking',
        prompt: 'Variatie: stel de vraag zelf',
        content: {
          targetNl: 'Wat doe jij dit weekend?',
          acceptable: ['Wat doe jij dit weekend', 'wat doe jij dit weekend'],
          maxRecordingSeconds: 26,
        },
        interactionConfig: { requiresMicrophone: false, mockTranscript: 'Wat doe jij dit weekend' },
        feedbackConfig: {},
        metadata: {},
      },
    ])
    const recapIdx = steps.findIndex((s) => s.id === 'm01-l10-recap')
    if (recapIdx >= 0) {
      const r = steps[recapIdx] as AnyStep & { content?: { tasks?: unknown[] } }
      const tasks = [
        ...(r.content?.tasks ?? []),
        { kind: 'speak', prompt: 'Zeg: *Fijn weekend!*', targetNl: 'Fijn weekend!', mockPass: true },
        { kind: 'fill_blank', sentence: '___ ga ik naar mijn familie.', options: ['Morgen', 'Gisteren', 'Nu'], correctAnswer: 'Morgen' },
      ]
      steps[recapIdx] = { ...r, content: { ...r.content, tasks } }
    }
    return setDuration({ ...lesson, steps }, 15)
  }

  if (id === 'a2-m01-l11-mixed-review') {
    steps = insertAfter(steps, 'm01-l11-preview', [
      {
        id: 'm01-l11-listen-review',
        type: 'listening',
        prompt: 'Luister — snelle context',
        content: {
          dialogue: [
            { speaker: 'Alex', nl: 'Hoi! Hoe gaat het?', en: 'Hi! How are you?' },
            { speaker: 'Bo', nl: 'Goed! Wat doe je straks?', en: 'Good! What are you doing later?' },
            { speaker: 'Alex', nl: 'Ik ga naar huis. Tot morgen!', en: "I'm going home. See you tomorrow!" },
          ],
          hideTranscriptUntilPlayed: true,
        },
        feedbackConfig: { errorTags: ['listening'] },
        exercises: [
          mcq(
            'm01-l11-lr0',
            'Eerst globaal: wat is dit mini-gesprek?',
            ['Een korte, vriendelijke check-in + afscheid', 'Een sollicitatiegesprek', 'Een doktersbezoek'],
            'Een korte, vriendelijke check-in + afscheid'
          ),
          mcq('m01-l11-lr1', 'Wat vraagt Bo?', ['Wat doe je straks?', 'Hoe gaat het?', 'Waar woon je?'], 'Wat doe je straks?'),
          mcq('m01-l11-lr2', 'Wat gaat Alex doen?', ['Naar huis', 'Sporten', 'Studeren'], 'Naar huis'),
          mcq('m01-l11-lr3', 'Hoe sluit Alex af?', ['Tot morgen!', 'Goedemorgen!', 'Tot gisteren!'], 'Tot morgen!'),
        ],
        metadata: {},
      },
      {
        id: 'm01-l11-mega-loop',
        type: 'practice_loop',
        prompt: 'Gemengd — even alles (8×)',
        content: { lemmas: ['hoe', 'wat', 'vandaag', 'straks', 'ben', 'ga'] },
        feedbackConfig: { errorTags: ['grammar', 'vocab'] },
        interactionConfig: { delimiter: ' ' },
        exercises: [
          mcq('m01-l11-m1', 'Welke groet past om 18:00?', ['Goedenavond!', 'Goedemorgen!', 'Goedenacht!'], 'Goedenavond!', 'A2_mid'),
          fill('m01-l11-m2', '___ gaat het?', ['Hoe', 'Wat', 'Waar'], 'Hoe'),
          ro('m01-l11-m3', ['thuis', 'Ik', 'werk', 'vandaag'], 'Ik werk vandaag thuis'),
          fill('m01-l11-m4', 'Ik ___ moe.', ['ben', 'heb', 'ga'], 'ben'),
          mcq('m01-l11-m5', 'Tijdwoord: later vandaag', ['straks', 'morgen', 'ooit'], 'straks'),
          mcq('m01-l11-m6', 'Welke vraag klopt?', ['Wat doe je vandaag?', 'Wat je doe vandaag?', 'Doe wat je vandaag?'], 'Wat doe je vandaag?', 'A2_mid'),
          fill('m01-l11-m7', '___ ga ik naar huis.', ['Straks', 'Gisteren', 'Nooit'], 'Straks'),
          ro('m01-l11-m8', ['je', 'met', 'Hoe', 'gaat', 'het', '?'], 'Hoe gaat het met je?'),
        ],
        metadata: {},
      },
    ])
    const recapIdx = steps.findIndex((s) => s.id === 'm01-l11-recap')
    if (recapIdx >= 0) {
      const r = steps[recapIdx] as AnyStep & { content?: { tasks?: unknown[] } }
      const tasks = [
        ...(r.content?.tasks ?? []),
        { kind: 'listen_mcq', question: 'Welke zin is een plan?', snippetNl: 'Straks ga ik naar huis.', options: ['Straks.', 'Gisteren.', 'Nooit.'], correctAnswer: 'Straks.' },
      ]
      steps[recapIdx] = { ...r, content: { ...r.content, tasks } }
    }
    return setDuration({ ...lesson, steps }, 16)
  }

  // Default: preview only
  return setDuration({ ...lesson, steps }, Math.max(14, Number(lesson.durationEstimate) || 14))
}

function main() {
  const raw = JSON.parse(readFileSync(MODULE_PATH, 'utf8')) as { lessons: AnyLesson[] }
  raw.lessons = raw.lessons.map(deepenLesson)
  writeFileSync(MODULE_PATH, `${JSON.stringify(raw, null, 2)}\n`, 'utf8')
  console.log('[m01-deepen-module] updated', MODULE_PATH)
}

main()
