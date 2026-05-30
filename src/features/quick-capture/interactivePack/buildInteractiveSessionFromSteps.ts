import type { DayPracticeStep, PracticePackMode } from '@/features/quick-capture/personalizedPracticePackBuilder.client'
import {
  APP_EXAM_HUB,
  APP_LANGUAGE_COACH,
  APP_READ_ALOUD,
  APP_TALK_HUB,
  readAloudEntryHref,
  speakLiveRunHref,
} from '@/lib/routing/appRoutes'
import {
  alignListeningPassageForMc,
  dutchListeningDistractors,
  dutchPhraseFoil,
  meaningDistractors,
  seededShuffle,
  stripLeadingExamExerciseLabel,
  usageSituationDistractors,
} from './distractors'
import {
  INTERACTIVE_PACK_SCHEMA_VERSION,
  type ExplanationCardExercise,
  type InteractiveExercise,
  type InteractiveSessionPackV1,
} from './types'

function bid(stepId: string, part: string): string {
  return `${stepId}:${part}`
}

function isWarmUpExplanationCard(ex: InteractiveExercise): ex is ExplanationCardExercise {
  return ex.kind === 'explanation_card' && ex.phase === 'warm_up'
}

/** Merge consecutive warm-up read cards (recap + thread anchors) into one beat so reps start sooner. */
function mergeWarmUpExplanationGroup(group: ExplanationCardExercise[]): ExplanationCardExercise {
  const first = group[0]!
  const paragraphDedupe = new Set<string>()
  const paragraphs: string[] = []
  for (const ex of group) {
    for (const p of ex.paragraphs) {
      const t = p.trim()
      if (!t) continue
      const key = t.toLowerCase()
      if (paragraphDedupe.has(key)) continue
      paragraphDedupe.add(key)
      paragraphs.push(t)
    }
  }
  const bulletDedupe = new Set<string>()
  const bullets: string[] = []
  for (const ex of group) {
    if (ex.bullets?.length) {
      for (const b of ex.bullets) {
        const t = b.trim()
        if (!t) continue
        const key = t.toLowerCase()
        if (bulletDedupe.has(key)) continue
        bulletDedupe.add(key)
        bullets.push(t)
      }
    } else {
      const lead = ex.paragraphs.map((p) => p.trim()).find(Boolean) ?? ''
      const line = ex.title && lead ? `${ex.title}: ${lead}` : ex.title?.trim() || lead || null
      if (line) {
        const key = line.toLowerCase()
        if (!bulletDedupe.has(key)) {
          bulletDedupe.add(key)
          bullets.push(line)
        }
      }
    }
  }
  const recapCard = group.find((x) => x.eyebrow === 'Warm-up')
  const mergedTitle = recapCard?.title?.trim() || first.title?.trim() || 'This session'

  return {
    id: `${first.id}:warmup-merged`,
    kind: 'explanation_card',
    phase: 'warm_up',
    sourceStepId: first.sourceStepId,
    captureId: first.captureId,
    eyebrow: 'Warm-up',
    title: mergedTitle,
    paragraphs: paragraphs.length ? paragraphs : ['Keep going — interactive reps start on the next beat.'],
    bullets: bullets.length ? bullets : undefined,
  }
}

function collapseConsecutiveWarmUpExplanationCards(exercises: InteractiveExercise[]): InteractiveExercise[] {
  const out: InteractiveExercise[] = []
  const buffer: ExplanationCardExercise[] = []

  const flush = () => {
    if (buffer.length === 0) return
    if (buffer.length === 1) {
      out.push(buffer[0]!)
    } else {
      out.push(mergeWarmUpExplanationGroup(buffer))
    }
    buffer.length = 0
  }

  for (const ex of exercises) {
    if (isWarmUpExplanationCard(ex)) {
      buffer.push(ex)
    } else {
      flush()
      out.push(ex)
    }
  }
  flush()
  return out
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** One-token cloze from a passage for light “phrase extraction” practice. */
function deriveClozeFromPassage(text: string, seed: string): { sentenceNl: string; answer: string } | null {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length < 24) return null
  const sentences = normalized.split(/(?<=[.!?])\s+/).filter((x) => x.length > 24)
  const sentence = (sentences[0] ?? normalized.slice(0, 200)).trim()
  const tokens = sentence.split(/\s+/).filter((t) => {
    const core = t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    return core.length >= 5
  })
  if (tokens.length < 2) return null
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 997
  const rawTok = tokens[h % tokens.length] ?? tokens[0]!
  const answer = rawTok.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
  if (answer.length < 4) return null
  const re = new RegExp(`\\b${escapeRegExp(answer)}\\b`, 'iu')
  if (!re.test(sentence)) return null
  const sentenceNl = sentence.replace(re, '_____')
  if (sentenceNl === sentence) return null
  return { sentenceNl, answer }
}

function mcOptionsFromLabels(
  correct: string,
  wrong: string[],
  seed: string,
): { options: { id: string; label: string }[]; correctOptionId: string } {
  const labeled = [
    { id: `${seed}:0`, label: correct, ok: true as const },
    ...wrong.slice(0, 3).map((label, i) => ({ id: `${seed}:${i + 1}`, label, ok: false as const })),
  ]
  const shuffled = seededShuffle(labeled, seed)
  const correctOptionId = shuffled.find((x) => x.ok)?.id ?? shuffled[0]!.id
  return {
    options: shuffled.map(({ id, label }) => ({ id, label })),
    correctOptionId,
  }
}

function expandWordRep(s: Extract<DayPracticeStep, { kind: 'word_rep' }>, mode: PracticePackMode): InteractiveExercise[] {
  const out: InteractiveExercise[] = []
  const dutch = stripLeadingExamExerciseLabel(s.dutch.replace(/\s+/g, ' ').trim())
  const contextBits: string[] = []
  if (s.meaningEn?.trim()) contextBits.push(s.meaningEn.trim())
  if (s.usageWhenEn?.trim()) contextBits.push(`When to use it: ${s.usageWhenEn.trim()}`)
  if (s.hintEn?.trim()) contextBits.push(`Your note: ${s.hintEn.trim()}`)
  const hearHelper = [`Target: “${dutch}”.`, ...contextBits, 'Listen twice, then repeat out loud.'].join(' ').slice(0, 520)

  const gloss = (s.meaningEn ?? 'A useful Dutch expression from your day.').trim()
  const wrongMean = meaningDistractors(gloss, 3)
  const mc = mcOptionsFromLabels(gloss, wrongMean, bid(s.id, 'mc-mean-seed'))

  const line =
    s.exampleLinesNl?.find((x) => x.trim().length > 4)?.trim() ??
    `Dit is ${dutch} — zo zeg je het in één korte zin.`

  out.push({
    id: bid(s.id, 'hear'),
    kind: 'hear_and_repeat',
    phase: 'core',
    sourceStepId: s.id,
    captureId: s.captureId,
    textNl: line,
    helperEn: hearHelper,
    exampleLinesNl: s.exampleLinesNl
      ?.map((x) => stripLeadingExamExerciseLabel(x.trim()))
      .filter((x) => x.length > 2),
  })

  out.push({
    id: bid(s.id, 'mc-mean'),
    kind: 'multiple_choice_meaning',
    phase: 'core',
    sourceStepId: s.id,
    captureId: s.captureId,
    questionEn: 'Pick the closest meaning.',
    options: mc.options,
    correctOptionId: mc.correctOptionId,
    incorrectFeedbackStyle: 'meaning',
  })

  if (mode !== 'quick_rep') {
    const passageListen = alignListeningPassageForMc(line, 280)
    const examplePool = (s.exampleLinesNl ?? []).map((x) => stripLeadingExamExerciseLabel(x.replace(/\s+/g, ' ').trim()))
    const wrongNl = dutchListeningDistractors(passageListen, examplePool, 3)
    const lmc = mcOptionsFromLabels(passageListen, wrongNl, bid(s.id, 'listen-mc'))
    out.push({
      id: bid(s.id, 'listen'),
      kind: 'listening_burst',
      phase: 'core',
      sourceStepId: s.id,
      captureId: s.captureId,
      textNl: passageListen,
      playsRecommended: 2,
      questionEn: 'Pick the closest match.',
      options: lmc.options,
      correctOptionId: lmc.correctOptionId,
      correctExplanationEn: 'This line repeats what you heard — opener and details should match.',
    })
  }

  if (mode === 'standard' || mode === 'deeper_debrief') {
    out.push({
      id: bid(s.id, 'write'),
      kind: 'write_your_own_line',
      phase: 'core',
      sourceStepId: s.id,
      captureId: s.captureId,
      promptEn: 'Use it in your own line — one Dutch sentence from your day.',
      promptNl: s.writingPromptNl ?? undefined,
      minChars: 8,
    })
    out.push({
      id: bid(s.id, 'say'),
      kind: 'say_it_aloud',
      phase: 'transfer',
      sourceStepId: s.id,
      captureId: s.captureId,
      instructionEn: 'Say this naturally — your new sentence, out loud.',
      targetNl: line,
      exampleLinesNl: s.exampleLinesNl?.filter((x) => x.trim().length > 2),
    })
  }

  if (mode === 'deeper_debrief' && s.exampleLinesNl && s.exampleLinesNl.length >= 2) {
    const choices = s.exampleLinesNl.filter((x) => x.trim().length > 3).slice(0, 4)
    const extra = dutchPhraseFoil(choices, Math.max(0, 4 - choices.length))
    const pool = [...choices, ...extra].slice(0, 4)
    const correctLine = choices[0]!
    const foils = pool.filter((x) => x.trim() !== correctLine.trim()).slice(0, 3)
    const best = mcOptionsFromLabels(correctLine, foils, bid(s.id, 'best-seed'))
    out.push({
      id: bid(s.id, 'best'),
      kind: 'choose_best_phrase',
      phase: 'transfer',
      sourceStepId: s.id,
      captureId: s.captureId,
      questionEn: 'Which line would you say aloud?',
      options: best.options,
      correctOptionId: best.correctOptionId,
    })
    out.push({
      id: bid(s.id, 'record'),
      kind: 'record_and_compare',
      phase: 'transfer',
      sourceStepId: s.id,
      captureId: s.captureId,
      instructionEn: 'Optional: record the line you picked and listen once.',
      targetNl: correctLine,
      maxRecordingSeconds: 28,
    })
  }

  return out
}

function expandPhraseRep(s: Extract<DayPracticeStep, { kind: 'phrase_rep' }>, mode: PracticePackMode): InteractiveExercise[] {
  const out: InteractiveExercise[] = []
  const phrase = stripLeadingExamExerciseLabel(s.dutch.replace(/\s+/g, ' ').trim()).slice(0, 400)
  const meaning = s.meaningEn?.trim() ?? null
  const usage = s.usageWhenEn?.trim() ?? null
  const examples = (s.exampleLinesNl ?? [])
    .map((x) => stripLeadingExamExerciseLabel(x.replace(/\s+/g, ' ').trim()))
    .filter(Boolean)
  const paragraphs: string[] = []
  if (meaning) paragraphs.push(meaning)
  if (usage) paragraphs.push(`When to use it: ${usage}`)
  if (s.hintEn?.trim()) paragraphs.push(`Your note: ${s.hintEn.trim()}`)
  if (!paragraphs.length) paragraphs.push('From your capture — listen, then repeat out loud.')
  const hearHelper = paragraphs.join(' ').slice(0, 520)

  out.push({
    id: bid(s.id, 'hear'),
    kind: 'hear_and_repeat',
    phase: 'core',
    sourceStepId: s.id,
    captureId: s.captureId,
    textNl: phrase,
    helperEn: hearHelper,
    exampleLinesNl: examples.length ? examples : undefined,
  })

  if (meaning) {
    const wrongMean = meaningDistractors(meaning, 3)
    const mc = mcOptionsFromLabels(meaning, wrongMean, bid(s.id, 'mc-mean'))
    out.push({
      id: bid(s.id, 'mc-mean'),
      kind: 'multiple_choice_meaning',
      phase: 'core',
      sourceStepId: s.id,
      captureId: s.captureId,
      questionEn: 'Pick the closest meaning.',
      options: mc.options,
      correctOptionId: mc.correctOptionId,
      incorrectFeedbackStyle: 'meaning',
    })
  }

  if (usage && mode !== 'quick_rep') {
    const wrongU = usageSituationDistractors(usage, 3)
    const umc = mcOptionsFromLabels(usage, wrongU, bid(s.id, 'mc-use'))
    out.push({
      id: bid(s.id, 'mc-use'),
      kind: 'multiple_choice_usage',
      phase: 'core',
      sourceStepId: s.id,
      captureId: s.captureId,
      questionEn: 'Where does this phrase fit best?',
      options: umc.options,
      correctOptionId: umc.correctOptionId,
      incorrectFeedbackStyle: 'usage',
    })
  }

  const line =
    examples.find((x) => x.length > 4 && x.toLowerCase() !== phrase.toLowerCase())?.trim() ??
    phrase.slice(0, 220)

  if (mode !== 'quick_rep') {
    const toks = phrase
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 14)
    if (toks.length >= 3) {
      const correctSentenceNl = toks.join(' ')
      out.push({
        id: bid(s.id, 'reorder'),
        kind: 'reorder_sentence',
        phase: 'core',
        sourceStepId: s.id,
        captureId: s.captureId,
        tokens: seededShuffle(toks, bid(s.id, 'tok')),
        correctSentenceNl,
      })
    }
    const passageListen = alignListeningPassageForMc(line, 280)
    const wrongNl = dutchListeningDistractors(passageListen, [...examples, phrase, line], 3)
    const lmc = mcOptionsFromLabels(passageListen, wrongNl, bid(s.id, 'listen-mc'))
    out.push({
      id: bid(s.id, 'listen'),
      kind: 'listening_burst',
      phase: 'core',
      sourceStepId: s.id,
      captureId: s.captureId,
      textNl: passageListen,
      playsRecommended: 2,
      questionEn: 'Pick the closest match.',
      options: lmc.options,
      correctOptionId: lmc.correctOptionId,
      correctExplanationEn: 'This line repeats what you heard — opener and details should match.',
    })
  }

  if (examples.length >= 2 && mode !== 'quick_rep') {
    const choices = examples.filter((x) => x.length > 3).slice(0, 4)
    const extra = dutchPhraseFoil(choices, Math.max(0, 4 - choices.length))
    const pool = [...choices, ...extra].slice(0, 4)
    const correctLine = choices[0]!
    const foils = pool.filter((x) => x.trim() !== correctLine.trim()).slice(0, 3)
    const dlg = mcOptionsFromLabels(correctLine, foils, bid(s.id, 'dialogue'))
    out.push({
      id: bid(s.id, 'dialogue'),
      kind: 'mini_dialogue_choice',
      phase: 'core',
      sourceStepId: s.id,
      captureId: s.captureId,
      questionEn: 'Best next line in this moment?',
      options: dlg.options,
      correctOptionId: dlg.correctOptionId,
    })
  }

  const cloze = deriveClozeFromPassage(phrase.length > 40 ? phrase : `${phrase} ${line}`, bid(s.id, 'cloze'))
  if (cloze && mode !== 'quick_rep') {
    out.push({
      id: bid(s.id, 'cloze'),
      kind: 'fill_in_blank',
      phase: 'core',
      sourceStepId: s.id,
      captureId: s.captureId,
      promptEn: 'Fill the blank — one word from your phrase.',
      sentenceNl: cloze.sentenceNl,
      acceptableAnswers: [cloze.answer],
      caseInsensitive: true,
    })
  }

  if (mode === 'standard' || mode === 'deeper_debrief') {
    out.push({
      id: bid(s.id, 'write'),
      kind: 'write_your_own_line',
      phase: 'transfer',
      sourceStepId: s.id,
      captureId: s.captureId,
      promptEn: 'Rewrite or extend: one new Dutch sentence using this phrase in a fresh situation.',
      promptNl: s.writingPromptNl ?? undefined,
      minChars: 10,
    })
    out.push({
      id: bid(s.id, 'say'),
      kind: 'say_it_aloud',
      phase: 'transfer',
      sourceStepId: s.id,
      captureId: s.captureId,
      instructionEn: 'Say this naturally — out loud.',
      targetNl: line,
      exampleLinesNl: examples.length ? examples : undefined,
    })
  }

  if (mode === 'deeper_debrief') {
    const choices = examples.length ? examples : [line]
    const pick = choices.filter((x) => x.trim().length > 3).slice(0, 4)
    const correctLine = pick[0] ?? line
    const foils = dutchPhraseFoil([correctLine], 3)
    const best = mcOptionsFromLabels(correctLine, foils, bid(s.id, 'best'))
    out.push({
      id: bid(s.id, 'best'),
      kind: 'choose_best_phrase',
      phase: 'transfer',
      sourceStepId: s.id,
      captureId: s.captureId,
      questionEn: 'Which line would you say aloud?',
      options: best.options,
      correctOptionId: best.correctOptionId,
    })
    out.push({
      id: bid(s.id, 'record'),
      kind: 'record_and_compare',
      phase: 'transfer',
      sourceStepId: s.id,
      captureId: s.captureId,
      instructionEn: 'Optional: one quick recording of the line you picked.',
      targetNl: correctLine,
      maxRecordingSeconds: 28,
    })
  }

  return out
}

function expandCorrection(s: Extract<DayPracticeStep, { kind: 'correction_rep' }>, mode: PracticePackMode): InteractiveExercise[] {
  const out: InteractiveExercise[] = []
  out.push({
    id: bid(s.id, 'sit'),
    kind: 'explanation_card',
    phase: 'core',
    sourceStepId: s.id,
    captureId: s.captureId,
    eyebrow: 'Smooth the line',
    title: 'What likely went wrong',
    paragraphs: [s.situation, 'Calmer line to keep ready:'],
    bullets: [s.correctedNl],
  })
  out.push({
    id: bid(s.id, 'fill'),
    kind: 'fill_in_blank',
    phase: 'core',
    sourceStepId: s.id,
    captureId: s.captureId,
    promptEn: 'Type the calm line you want to keep.',
    sentenceNl: s.correctedNl.trim(),
    acceptableAnswers: [s.correctedNl.trim()],
    caseInsensitive: true,
  })
  out.push({
    id: bid(s.id, 'say'),
    kind: 'say_it_aloud',
    phase: 'transfer',
    sourceStepId: s.id,
    captureId: s.captureId,
    instructionEn: 'Say this naturally — the calm line, twice, slower the second time.',
    targetNl: s.correctedNl,
  })
  if (mode !== 'quick_rep') {
    out.push({
      id: bid(s.id, 'record'),
      kind: 'record_and_compare',
      phase: 'transfer',
      sourceStepId: s.id,
      captureId: s.captureId,
      instructionEn: 'Optional: record once and listen back.',
      targetNl: s.correctedNl.trim(),
      maxRecordingSeconds: 24,
    })
  }
  return out
}

function expandListeningBurst(s: Extract<DayPracticeStep, { kind: 'listening_burst' }>): InteractiveExercise[] {
  const raw = s.text.replace(/\s+/g, ' ').trim().slice(0, 400)
  const t = stripLeadingExamExerciseLabel(raw)
  const passage = alignListeningPassageForMc(t, 280)
  const wrongNl = dutchListeningDistractors(passage, [], 3)
  const lmc = mcOptionsFromLabels(passage, wrongNl, bid(s.id, 'lmc'))
  return [
    {
      id: bid(s.id, 'listen'),
      kind: 'listening_burst',
      phase: 'core',
      sourceStepId: s.id,
      captureId: s.captureId,
      textNl: passage,
      playsRecommended: 2,
      questionEn: 'Pick the closest match.',
      options: lmc.options,
      correctOptionId: lmc.correctOptionId,
      correctExplanationEn: 'This line repeats what you heard — opener and details should match.',
    },
    {
      id: bid(s.id, 'shadow'),
      kind: 'say_it_aloud',
      phase: 'transfer',
      sourceStepId: s.id,
      captureId: s.captureId,
      instructionEn: 'Say this naturally — same line you heard.',
      targetNl: passage,
    },
  ]
}

function expandReadAloud(s: Extract<DayPracticeStep, { kind: 'read_aloud' }>, mode: PracticePackMode): InteractiveExercise[] {
  const t = s.text.replace(/\s+/g, ' ').trim().slice(0, 800)
  const vocab = s.keyVocabEn?.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()) ?? []
  const out: InteractiveExercise[] = [
    {
      id: bid(s.id, 'card'),
      kind: 'explanation_card',
      phase: 'core',
      sourceStepId: s.id,
      captureId: s.captureId,
      eyebrow: 'Read aloud',
      title: 'From your capture',
      paragraphs: [s.prompt],
      bullets: [
        ...(vocab.length ? [`Themes: ${vocab.slice(0, 8).join(' · ')}.`] : []),
        t.slice(0, 280) + (t.length > 280 ? '…' : ''),
      ],
    },
    {
      id: bid(s.id, 'rep'),
      kind: 'read_aloud_rep',
      phase: 'core',
      sourceStepId: s.id,
      captureId: s.captureId,
      textNl: t,
      readAloudHref: readAloudEntryHref(`from-your-day-pack:${encodeURIComponent(s.id)}`),
      afterReadPromptEn: 'Read twice here, or open Read aloud — then tap done below.',
      optionalDeepLinks: [
        { label: 'Language Coach', href: `${APP_LANGUAGE_COACH}?focus=${encodeURIComponent(t.slice(0, 100))}` },
        { label: 'Open in Talk', href: APP_TALK_HUB },
        { label: 'Speaking prep', href: APP_EXAM_HUB },
      ],
    },
  ]
  if (mode !== 'quick_rep') {
    const gloss = vocab[0]?.trim()
    if (gloss) {
      const wrongMean = meaningDistractors(gloss, 3)
      const mc = mcOptionsFromLabels(gloss, wrongMean, bid(s.id, 'text-mc'))
      out.push({
        id: bid(s.id, 'text-mc'),
        kind: 'multiple_choice_meaning',
        phase: 'core',
        sourceStepId: s.id,
        captureId: s.captureId,
        questionEn: 'Pick the closest meaning.',
        options: mc.options,
        correctOptionId: mc.correctOptionId,
        incorrectFeedbackStyle: 'meaning',
      })
    }
  }
  const cloze = deriveClozeFromPassage(t, bid(s.id, 'ra-cloze'))
  if (cloze && mode !== 'quick_rep') {
    out.push({
      id: bid(s.id, 'cloze'),
      kind: 'fill_in_blank',
      phase: 'transfer',
      sourceStepId: s.id,
      captureId: s.captureId,
      promptEn: 'Fill the blank from the passage.',
      sentenceNl: cloze.sentenceNl,
      acceptableAnswers: [cloze.answer],
      caseInsensitive: true,
    })
  }
  if (mode === 'deeper_debrief') {
    out.push({
      id: bid(s.id, 'say-sum'),
      kind: 'say_it_aloud',
      phase: 'transfer',
      sourceStepId: s.id,
      captureId: s.captureId,
      instructionEn: 'Say one Dutch sentence that sums up the passage.',
      targetNl: t.slice(0, 220),
    })
  }
  return out
}

function expandMiniScenario(s: Extract<DayPracticeStep, { kind: 'mini_scenario' }>): InteractiveExercise[] {
  const href = speakLiveRunHref({ scenarioId: s.scenarioSlug, level: 'A2' })
  return [
    {
      id: bid(s.id, 'ctx'),
      kind: 'explanation_card',
      phase: 'core',
      sourceStepId: s.id,
      captureId: s.captureId,
      eyebrow: 'Scenario',
      title: s.scenarioSlug.replace(/-/g, ' '),
      paragraphs: [s.prompt, `Seed: ${s.seedLine}`],
    },
    {
      id: bid(s.id, 'jump'),
      kind: 'scenario_jumpoff',
      phase: 'transfer',
      sourceStepId: s.id,
      captureId: s.captureId,
      title: 'Speak live rehearsal',
      descriptionEn: 'Open in Talk for a live drill — or skip and stay in this pack.',
      href,
      linkLabel: 'Open in Talk',
      confirmLabel: 'Done in Talk or skipping',
      optionalDeepLinks: [
        { label: 'Language Coach', href: APP_LANGUAGE_COACH },
        { label: 'Read aloud', href: APP_READ_ALOUD },
        { label: 'Speaking prep', href: APP_EXAM_HUB },
      ],
    },
  ]
}

function expandCoach(s: Extract<DayPracticeStep, { kind: 'coach_debrief' }>): InteractiveExercise[] {
  const focus = encodeURIComponent(s.summary.slice(0, 120))
  return [
    {
      id: bid(s.id, 'card'),
      kind: 'explanation_card',
      phase: 'core',
      sourceStepId: s.id,
      captureId: s.captureId,
      eyebrow: 'Coach moment',
      title: 'Short debrief',
      paragraphs: [s.prompt, s.summary],
    },
    {
      id: bid(s.id, 'jump'),
      kind: 'scenario_jumpoff',
      phase: 'transfer',
      sourceStepId: s.id,
      captureId: s.captureId,
      title: 'Language Coach',
      descriptionEn: 'Optional — continue in Coach with this focus.',
      href: `${APP_LANGUAGE_COACH}?focus=${focus}`,
      linkLabel: 'Open Coach',
      confirmLabel: 'Done in Coach or skipping',
      optionalDeepLinks: [
        { label: 'Open in Talk', href: APP_TALK_HUB },
        { label: 'Read aloud', href: APP_READ_ALOUD },
        { label: 'Speaking prep', href: APP_EXAM_HUB },
      ],
    },
  ]
}

function expandStrongestNext(s: Extract<DayPracticeStep, { kind: 'strongest_next' }>): InteractiveExercise[] {
  const paragraphs = [s.actionLabel ? `${s.prompt} (${s.actionLabel})` : s.prompt]
  return [
    {
      id: bid(s.id, 'finish'),
      kind: 'explanation_card',
      phase: 'finish',
      sourceStepId: s.id,
      captureId: s.captureId,
      eyebrow: 'Wrap-up',
      title: 'Good next step',
      paragraphs,
    },
    {
      id: bid(s.id, 'save'),
      kind: 'save_to_library_action',
      phase: 'finish',
      sourceStepId: s.id,
      captureId: s.captureId,
      bodyEn: 'Your captures stay in Library — open a card anytime to replay or practice that day again.',
    },
  ]
}

function expandStep(s: DayPracticeStep, mode: PracticePackMode): InteractiveExercise[] {
  switch (s.kind) {
    case 'pack_meta':
      return []
    case 'short_recap':
      return [
        {
          id: bid(s.id, 'recap'),
          kind: 'explanation_card',
          phase: 'warm_up',
          sourceStepId: s.id,
          captureId: s.captureId,
          eyebrow: 'Warm-up',
          title: s.headline,
          paragraphs: [s.prompt],
          bullets: s.bullets,
        },
      ]
    case 'theme_anchor':
      return [
        {
          id: bid(s.id, 'thread'),
          kind: 'explanation_card',
          phase: 'warm_up',
          sourceStepId: s.id,
          captureId: s.captureId,
          eyebrow: 'Thread',
          title: s.themeTitle,
          paragraphs: [s.prompt],
        },
      ]
    case 'word_rep':
      return expandWordRep(s, mode)
    case 'phrase_rep':
      return expandPhraseRep(s, mode)
    case 'correction_rep':
      return expandCorrection(s, mode)
    case 'listening_burst':
      return expandListeningBurst(s)
    case 'read_aloud':
      return expandReadAloud(s, mode)
    case 'mini_scenario':
      return expandMiniScenario(s)
    case 'coach_debrief':
      return expandCoach(s)
    case 'strongest_next':
      return expandStrongestNext(s)
    default:
      return []
  }
}

export function buildInteractiveSessionFromSteps(
  steps: DayPracticeStep[],
  params: { packTitle: string; mode: PracticePackMode },
): InteractiveSessionPackV1 {
  const work = steps.filter((s) => s.kind !== 'pack_meta')
  const exercises: InteractiveExercise[] = []
  for (const s of work) {
    exercises.push(...expandStep(s, params.mode))
  }
  return {
    schemaVersion: INTERACTIVE_PACK_SCHEMA_VERSION,
    title: params.packTitle,
    subtitle: 'Short interactive reps from your captures.',
    exercises: collapseConsecutiveWarmUpExplanationCards(exercises),
  }
}
