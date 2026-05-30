import type { ChatMessage } from '../../prompts/buildTurnMessages'
import type {
  ExerciseBlockType,
  ExercisePackLevel,
  McOption,
  StoredExerciseBlock,
} from '../../domain/generatedExercisePack/generatedExercisePackTypes'
import { newId } from '../../shared/ids'
import { azureOpenAiChatCompletionJson } from '../azureOpenAi/azureOpenAiRestClient'
import { extractWordPackHints } from '../quick-capture/wordRepPackHints'
import {
  buildSavedWordPackUserMessage,
  GEZELLIG_SPECIAL_APPENDIX,
  SAVED_WORD_PACK_SYSTEM,
} from './prompts/savedWordPackPromptTemplates'

const ALLOWED_TYPES = new Set<ExerciseBlockType>([
  'explanation_card',
  'multiple_choice_meaning',
  'hear_and_repeat',
  'multiple_choice_usage',
  'choose_best_phrase',
  'build_a_sentence',
  'write_your_own_line',
  'say_it_aloud',
  'record_and_compare',
  'scenario_jumpoff',
  'read_aloud_rep',
])

export type SavedWordPackGenerationResult = {
  title: string
  subtitle: string
  theme: string
  estimatedMinutes: number
  xpPotential: number
  level: ExercisePackLevel
  blocks: StoredExerciseBlock[]
  usedLlm: boolean
  /** When falling back or trimming invalid LLM output. */
  generationNote?: string
}

function normWord(w: string): string {
  return w.trim().toLowerCase()
}

function validateMcOptions(options: unknown): options is McOption[] {
  if (!Array.isArray(options) || options.length !== 4) return false
  let correct = 0
  for (const o of options) {
    if (!o || typeof o !== 'object') return false
    const r = o as Record<string, unknown>
    if (typeof r.id !== 'string' || typeof r.label !== 'string' || typeof r.isCorrect !== 'boolean') return false
    if (r.isCorrect) correct += 1
  }
  return correct === 1
}

function asBlockConfig(_type: ExerciseBlockType, config: unknown): unknown {
  if (!config || typeof config !== 'object') return null
  return config
}

function sanitizeBlock(raw: Record<string, unknown>, sourceCaptureIds: string[], lemma: string): StoredExerciseBlock | null {
  const type = raw.type as ExerciseBlockType
  if (!ALLOWED_TYPES.has(type)) return null
  const cfg = asBlockConfig(type, raw.config)
  if (cfg == null) return null
  const skillTags = Array.isArray(raw.skillTags)
    ? (raw.skillTags as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 8)
    : ['vocabulary']
  const estimatedSeconds =
    typeof raw.estimatedSeconds === 'number' && Number.isFinite(raw.estimatedSeconds)
      ? Math.min(240, Math.max(20, Math.round(raw.estimatedSeconds)))
      : 55

  if (type === 'multiple_choice_meaning' || type === 'multiple_choice_usage' || type === 'choose_best_phrase') {
    const c = cfg as Record<string, unknown>
    if (!validateMcOptions(c.options)) return null
  }

  if (type === 'explanation_card') {
    const c = cfg as Record<string, unknown>
    if (typeof c.dutch !== 'string' || typeof c.englishMeaning !== 'string') return null
    if (!Array.isArray(c.exampleLines) || c.exampleLines.length < 1) return null
  }

  if (type === 'write_your_own_line') {
    const c = cfg as Record<string, unknown>
    if (typeof c.prompt !== 'string' || typeof c.targetWordOrPhrase !== 'string') return null
    if (c.evaluationMode !== 'llm') return null
  }

  if (type === 'build_a_sentence') {
    const c = cfg as Record<string, unknown>
    if (typeof c.prompt !== 'string' || !Array.isArray(c.requiredWords)) return null
    const rw = (c.requiredWords as unknown[]).filter((x): x is string => typeof x === 'string')
    if (!rw.map((x) => x.toLowerCase()).includes(lemma.toLowerCase())) return null
    if (c.evaluationMode !== 'rule_based' && c.evaluationMode !== 'llm') return null
  }

  if (type === 'hear_and_repeat' || type === 'say_it_aloud' || type === 'record_and_compare') {
    const c = cfg as Record<string, unknown>
    if (typeof (c.targetText ?? c.targetNl) !== 'string') return null
  }

  if (type === 'scenario_jumpoff') {
    const c = cfg as Record<string, unknown>
    if (typeof c.scenarioId !== 'string' || typeof c.ctaLabel !== 'string' || typeof c.reason !== 'string') return null
  }

  if (type === 'read_aloud_rep') {
    const c = cfg as Record<string, unknown>
    if (typeof c.textNl !== 'string' || typeof c.readAloudHref !== 'string') return null
  }

  return {
    id: newId(),
    type,
    title: typeof raw.title === 'string' ? raw.title.slice(0, 120) : undefined,
    subtitle: typeof raw.subtitle === 'string' ? raw.subtitle.slice(0, 200) : undefined,
    instruction: typeof raw.instruction === 'string' ? raw.instruction.slice(0, 400) : undefined,
    sourceCaptureIds,
    skillTags: skillTags.length ? skillTags : ['vocabulary'],
    estimatedSeconds,
    config: cfg,
  }
}

function parseLlmPackJson(
  raw: string,
  sourceCaptureIds: string[],
  lemma: string,
): Omit<SavedWordPackGenerationResult, 'usedLlm' | 'level'> | null {
  let j: Record<string, unknown>
  try {
    j = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
  const title = typeof j.title === 'string' ? j.title.trim().slice(0, 200) : ''
  const subtitle = typeof j.subtitle === 'string' ? j.subtitle.trim().slice(0, 400) : ''
  const theme = typeof j.theme === 'string' ? j.theme.trim().slice(0, 200) : 'Vocabulary'
  const estimatedMinutes =
    typeof j.estimatedMinutes === 'number' && j.estimatedMinutes >= 2 && j.estimatedMinutes <= 20
      ? Math.round(j.estimatedMinutes)
      : 6
  const xpPotential =
    typeof j.xpPotential === 'number' && j.xpPotential >= 10 && j.xpPotential <= 120
      ? Math.round(j.xpPotential)
      : Math.min(80, 28 + (Array.isArray(j.blocks) ? j.blocks.length * 8 : 32))

  const rawBlocks = j.blocks
  if (!Array.isArray(rawBlocks) || rawBlocks.length < 4 || rawBlocks.length > 7) return null

  const blocks: StoredExerciseBlock[] = []
  for (const b of rawBlocks) {
    if (!b || typeof b !== 'object') return null
    const row = sanitizeBlock(b as Record<string, unknown>, sourceCaptureIds, normWord(lemma))
    if (!row) return null
    blocks.push(row)
  }

  if (blocks.length < 4) return null
  return { title, subtitle, theme, estimatedMinutes, xpPotential, blocks }
}

export function buildFallbackSavedWordPack(input: {
  word: string
  sourceCaptureIds: string[]
  level: ExercisePackLevel
  enrichedJson?: string | null
  bodySecondary?: string | null
}): SavedWordPackGenerationResult {
  const lemma = input.word.trim()
  const hints = extractWordPackHints(input.enrichedJson ?? null, input.bodySecondary ?? null, lemma)
  const isGezellig = normWord(lemma) === 'gezellig'
  const captureIds = input.sourceCaptureIds.length ? input.sourceCaptureIds : []

  const meaning =
    hints.meaningEn?.trim() ||
    (isGezellig
      ? 'Warm, sociable vibe — good company, not “efficient” or “strictly formal”.'
      : 'A useful Dutch word from your day.')
  const usage =
    hints.usageWhenEn?.trim() ||
    (isGezellig
      ? 'Use for people, evenings, cafés, homes — “het was gezellig” is a classic line.'
      : 'Use it in short, real sentences you might actually say.')

  const examples: { dutch: string; english?: string }[] = []
  if (isGezellig) {
    examples.push(
      { dutch: 'Het was heel gezellig gisteravond.', english: 'It was really nice last night (good company).' },
      { dutch: 'Zullen we ergens gezellig gaan zitten?', english: 'Shall we sit somewhere cosy / relaxed?' },
      { dutch: 'Ik vond het café erg gezellig.', english: 'I found the café really cosy / friendly.' },
    )
  } else {
    for (const nl of hints.exampleLinesNl.slice(0, 3)) {
      examples.push({ dutch: nl })
    }
    if (examples.length < 2) {
      examples.push({ dutch: `Het was zo ${lemma} bij ons thuis.` }, { dutch: `Wil je mee? Het wordt vast ${lemma}.` })
    }
  }

  const hearLine = examples[0]?.dutch ?? `Ik vond het heel ${lemma}.`

  const mcMeaningWrong: McOption[] = isGezellig
    ? [
        { id: 'w1', label: 'Only “strictly efficient” or productive time', isCorrect: false },
        { id: 'w2', label: 'Only used for bad weather warnings', isCorrect: false },
        { id: 'w3', label: 'A formal legal warning', isCorrect: false },
      ]
    : [
        { id: 'w1', label: 'A formal synonym for “angry”', isCorrect: false },
        { id: 'w2', label: 'Almost never used in spoken Dutch', isCorrect: false },
        { id: 'w3', label: 'Only describes fast movement', isCorrect: false },
      ]

  const mcMeaning: McOption[] = seededMcShuffle(
    [
      { id: 'ok', label: meaning, isCorrect: true },
      ...mcMeaningWrong,
    ],
    lemma,
  ).slice(0, 4)

  const usageOptions: McOption[] = isGezellig
    ? seededMcShuffle(
        [
          { id: 'u1', label: 'Het was heel gezellig — lekker bijgepraat.', isCorrect: true },
          { id: 'u2', label: 'Het was heel gezellig — dus we werkten snel door.', isCorrect: false },
          { id: 'u3', label: 'Het was gezellig — ik vond het te duur.', isCorrect: false },
          { id: 'u4', label: 'Gezellig — dus ik wilde meteen naar huis.', isCorrect: false },
        ],
        `${lemma}-usage`,
      )
    : seededMcShuffle(
        [
          { id: 'u1', label: `Ik zei: "Het voelt ${lemma} zo."`, isCorrect: true },
          { id: 'u2', label: `Ik gebruik ${lemma} alleen in een sollicitatiebrief.`, isCorrect: false },
          { id: 'u3', label: `${lemma} — dus ik bedoelde: het regent hard.`, isCorrect: false },
          { id: 'u4', label: `${lemma} — dus: ik wil graag een bonnetje.`, isCorrect: false },
        ],
        `${lemma}-usage`,
      )

  const blocks: StoredExerciseBlock[] = [
    {
      id: newId(),
      type: 'explanation_card',
      title: `“${lemma}”`,
      sourceCaptureIds: captureIds,
      skillTags: ['vocabulary', 'register'],
      estimatedSeconds: 70,
      config: {
        dutch: lemma,
        englishMeaning: meaning,
        shortUsageNote: usage,
        exampleLines: examples,
      },
    },
    {
      id: newId(),
      type: 'multiple_choice_meaning',
      instruction: 'Pick the closest meaning in real life.',
      sourceCaptureIds: captureIds,
      skillTags: ['vocabulary'],
      estimatedSeconds: 45,
      config: {
        prompt: `What does “${lemma}” usually communicate in conversation?`,
        options: mcMeaning,
        correctExplanation: isGezellig
          ? 'Gezellig is about warmth and company — not efficiency.'
          : 'Pick the gloss that matches how people actually use the word.',
      },
    },
    {
      id: newId(),
      type: 'hear_and_repeat',
      sourceCaptureIds: captureIds,
      skillTags: ['listening', 'speaking'],
      estimatedSeconds: 50,
      config: {
        targetText: hearLine,
        referenceAudioUrl: undefined,
        hint: 'Use device audio — listen once, repeat twice.',
        repeatCount: 2,
      },
    },
    {
      id: newId(),
      type: 'choose_best_phrase',
      instruction: 'Which line sounds natural?',
      sourceCaptureIds: captureIds,
      skillTags: ['usage'],
      estimatedSeconds: 50,
      config: {
        prompt: 'Which usage fits everyday Dutch best?',
        options: usageOptions,
        correctExplanation: isGezellig
          ? 'Gezellig pairs with social warmth, not “we worked fast”.'
          : 'Choose the line a Dutch speaker might plausibly say.',
      },
    },
    {
      id: newId(),
      type: 'write_your_own_line',
      sourceCaptureIds: captureIds,
      skillTags: ['writing', 'production'],
      estimatedSeconds: 120,
      config: {
        prompt: `Write one Dutch sentence with “${lemma}” about your real day (not copied from the examples).`,
        targetWordOrPhrase: lemma,
        evaluationMode: 'llm',
        feedbackStyle: 'light',
        minChars: 8,
      },
    },
    {
      id: newId(),
      type: 'say_it_aloud',
      sourceCaptureIds: captureIds,
      skillTags: ['speaking'],
      estimatedSeconds: 40,
      config: {
        instruction: 'Say your new sentence out loud twice — relaxed shoulders.',
        targetNl: hearLine,
      },
    },
    {
      id: newId(),
      type: 'scenario_jumpoff',
      title: 'Go deeper',
      sourceCaptureIds: captureIds,
      skillTags: ['transfer'],
      estimatedSeconds: 35,
      config: {
        scenarioId: 'cafe-chat',
        ctaLabel: 'Open Talk for a short live rep',
        reason: 'When you want feedback on tone and word choice, a live drill helps.',
        href: '/app/talk',
      },
    },
  ]

  return {
    title: `Pack: ${lemma}`,
    subtitle: isGezellig ? 'Warm-up → meaning → usage → your line' : 'Meaning → recognition → usage → say it',
    theme: isGezellig ? 'Social vibe / company' : 'Saved word',
    estimatedMinutes: 6,
    xpPotential: 44,
    level: input.level,
    blocks,
    usedLlm: false,
    generationNote: 'Deterministic fallback pack (LLM unavailable or parse failed).',
  }
}

/** Deterministic shuffle for MC option order (stable per lemma seed). */
function seededMcShuffle(options: McOption[], seed: string): McOption[] {
  const a = [...options]
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  for (let i = a.length - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) >>> 0
    const j = h % (i + 1)
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export async function generateSavedWordExercisePack(params: {
  word: string
  sourceCaptureIds: string[]
  level?: ExercisePackLevel
  enrichedJson?: string | null
  bodySecondary?: string | null
}): Promise<SavedWordPackGenerationResult> {
  const level = params.level ?? 'A2'
  const lemma = params.word.trim()
  if (!lemma) {
    throw new Error('generateSavedWordExercisePack: word is required')
  }

  const hints = extractWordPackHints(params.enrichedJson ?? null, params.bodySecondary ?? null, lemma)
  const isGezellig = normWord(lemma) === 'gezellig'
  const system = isGezellig ? `${SAVED_WORD_PACK_SYSTEM}\n${GEZELLIG_SPECIAL_APPENDIX}` : SAVED_WORD_PACK_SYSTEM
  const user = buildSavedWordPackUserMessage({
    word: lemma,
    level,
    meaningHint: hints.meaningEn,
    usageHint: hints.usageWhenEn,
    exampleLinesNl: hints.exampleLinesNl,
    captureContext: params.bodySecondary?.trim() ?? null,
  })

  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]

  try {
    const raw = await azureOpenAiChatCompletionJson(messages, { maxTokens: 2200 })
    const parsed = parseLlmPackJson(raw, params.sourceCaptureIds, lemma)
    if (!parsed || !parsed.title) {
      return {
        ...buildFallbackSavedWordPack({
          word: lemma,
          sourceCaptureIds: params.sourceCaptureIds,
          level,
          enrichedJson: params.enrichedJson,
          bodySecondary: params.bodySecondary,
        }),
        generationNote: 'LLM output failed validation; used fallback pack.',
      }
    }
    return { ...parsed, level, usedLlm: true }
  } catch {
    return buildFallbackSavedWordPack({
      word: lemma,
      sourceCaptureIds: params.sourceCaptureIds,
      level,
      enrichedJson: params.enrichedJson,
      bodySecondary: params.bodySecondary,
    })
  }
}
