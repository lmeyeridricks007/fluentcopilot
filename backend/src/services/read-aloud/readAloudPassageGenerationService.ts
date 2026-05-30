import OpenAI from 'openai'
import { z } from 'zod'
import { ApiError } from '../../shared/errors'
import { getOpenAiDirectConfig, getOpenAiEnrichmentModel } from '../ai/config/aiProviderConfig'

const ResponseSchema = z.object({
  title: z.string().min(1).max(200),
  passage: z.string().min(20).max(12_000),
})

export type ReadAloudGenreId =
  | 'everyday_conversation'
  | 'story'
  | 'news_style'
  | 'travel'
  | 'work'
  | 'practical_instructions'
  | 'social_chat'
  | 'description'
  | 'opinion'
  | 'custom_topic'

const GENRE_LABELS: Record<ReadAloudGenreId, string> = {
  everyday_conversation: 'everyday conversation',
  story: 'short narrative story',
  news_style: 'neutral news-style report',
  travel: 'travel / trip context',
  work: 'workplace / colleague context',
  practical_instructions: 'clear practical instructions (steps)',
  social_chat: 'informal social chat',
  description: 'descriptive paragraph (people, place, scene)',
  opinion: 'short opinion piece',
  custom_topic: 'topic given by the user',
}

/** How the passage should read for each genre (Dutch voice, structure). */
function genreConstraints(genre: ReadAloudGenreId): string {
  switch (genre) {
    case 'everyday_conversation':
      return 'Dialogue or short turns are OK but write as continuous prose (no script labels like A: B:). Sound like natural spoken Dutch you might hear in shops, home, or on the street.'
    case 'story':
      return 'One small narrative arc: setting → event → simple outcome. Concrete senses (what you see/hear). Past or present allowed; keep time references simple.'
    case 'news_style':
      return 'Neutral, factual tone: wie, wat, waar, wanneer. No sensationalism. Short lead, then supporting detail. No headlines inside the passage — plain paragraphs only.'
    case 'travel':
      return 'Practical travel flavour: transport, tickets, directions, hotel, or sightseeing. Concrete places; prefer common Dutch city names if needed.'
    case 'work':
      return 'Office or workplace context: meetings, email tone, tasks, breaks, or polite requests. Professional but readable aloud.'
    case 'practical_instructions':
      return 'Numbered or clear step order in prose (e.g. Eerst… Daarna…). Imperatives and short sentences. Goal: someone could follow aloud without dense jargon.'
    case 'social_chat':
      return 'Relaxed, friendly register (je/jij where natural). Small talk: weekend, weather, plans — still full sentences, not fragment chat logs.'
    case 'description':
      return 'Paint one clear scene: person, room, street, or meal. Use sensory detail but keep sentences speakable; avoid poetic overload.'
    case 'opinion':
      return 'One clear stance with 1–2 reasons, polite tone. Suitable for learners to argue aloud without slang storms.'
    case 'custom_topic':
      return 'Match the learner topic closely; if topic is vague, pick one concrete angle and stay with it.'
    default:
      return 'Natural Dutch suitable for reading aloud.'
  }
}

function lengthGuidance(len: 'short' | 'medium' | 'long'): string {
  switch (len) {
    case 'short':
      return 'Length: about 55–95 words. Roughly 4–7 sentences. Stay within this band.'
    case 'medium':
      return 'Length: about 110–180 words. Roughly 7–12 sentences. Stay within this band.'
    case 'long':
      return 'Length: about 200–320 words. Roughly 12–18 sentences. Stay within this band.'
    default:
      return 'Length: about 110–160 words.'
  }
}

function levelRules(level: 'A1' | 'A2' | 'B1' | 'B2'): string {
  switch (level) {
    case 'A1':
      return [
        'CEFR A1: very high-frequency words only; almost no idioms.',
        'Mostly short sentences (often 4–9 words). Prefer present tense and concrete situations.',
        'Avoid abstract concepts (democracy, philosophy). No subclauses stacked more than once.',
        'Names: at most one simple Dutch or common city name.',
      ].join(' ')
    case 'A2':
      return [
        'CEFR A2: everyday practical vocabulary; familiar situations (school, shop, transport, family).',
        'Mix short and medium sentences; light connectors (want, omdat, maar, dus).',
        'Stay concrete; if you use an idiom, keep it extremely common.',
      ].join(' ')
    case 'B1':
      return [
        'CEFR B1: natural connected text; varied sentence length; common connectors (hoewel, daardoor, volgens).',
        'Some opinion or mild abstraction OK if still speakable in one breath per sentence.',
        'Interesting but not dense; avoid rare literary vocabulary.',
      ].join(' ')
    case 'B2':
      return [
        'CEFR B2: nuanced, fluent Dutch; subtle stance or contrast OK.',
        'Still optimised for reading aloud: avoid tongue-twisters, extreme alliteration, or 40-word piles.',
        'Vocabulary can be richer but remain natural for educated daily use, not academic paper style.',
      ].join(' ')
    default:
      return levelRules('A2')
  }
}

function globalReadAloudRules(): string {
  return [
    'Write entirely in Dutch. No English, no meta instructions inside the passage.',
    'The text must sound natural when read aloud: clear rhythm, not crammed with commas, avoid tongue-twisters.',
    'Prefer common proper nouns only (e.g. Amsterdam, Utrecht, Marie); do not overload with rare brands or English loanwords unless level B2.',
    'Use normal paragraph breaks (blank line between paragraphs) only if length is medium or long; for short, usually one paragraph.',
    'Interesting enough to care about, but never at the cost of clarity for the stated CEFR level.',
  ].join(' ')
}

function temperatureFor(genre: ReadAloudGenreId): number {
  if (genre === 'story' || genre === 'opinion' || genre === 'social_chat') return 0.52
  if (genre === 'news_style' || genre === 'practical_instructions') return 0.36
  return 0.44
}

export async function generateReadAloudPassage(input: {
  level: 'A1' | 'A2' | 'B1' | 'B2'
  genre: ReadAloudGenreId
  topic?: string | null
  length: 'short' | 'medium' | 'long'
  /** Optional English instructions from the learning-memory layer (internal authoring hints). */
  personalizationEnglish?: string | null
}): Promise<{ title: string; passage: string }> {
  const cfg = getOpenAiDirectConfig()
  if (!cfg.apiKey) {
    throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'OpenAI is not configured for passage generation.', {
      passage: 'Service unavailable',
    })
  }

  const model = getOpenAiEnrichmentModel()
  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
    organization: cfg.organization,
    maxRetries: 0,
    timeout: 55_000,
  })

  const genreLabel = GENRE_LABELS[input.genre] ?? GENRE_LABELS.custom_topic
  const topicLine =
    input.genre === 'custom_topic' && input.topic?.trim()
      ? `The learner chose this custom topic — centre the passage on it: ${input.topic.trim().slice(0, 240)}`
      : input.topic?.trim()
        ? `Optional focus — weave in lightly if it fits the genre (do not force): ${input.topic.trim().slice(0, 240)}`
        : 'No extra topic from the learner — invent a concrete, genre-appropriate situation.'

  const system = [
    'You are a senior Dutch language-learning content architect.',
    'You write original Dutch reading passages for the Read Aloud practice mode.',
    'Output JSON only, one object: {"title":"...","passage":"..."}.',
    'title = short Dutch title (max ~8 words), no quotes inside.',
    'passage = only the reading text, no title repeated inside.',
    globalReadAloudRules(),
  ].join(' ')

  const personalization =
    input.personalizationEnglish?.trim() ?
      `\n\nLearner-specific weaving hints (English; internal — output stays Dutch only):\n${input.personalizationEnglish.trim().slice(0, 2200)}`
    : ''

  const user = [
    `Genre (style label): ${genreLabel}.`,
    `Genre execution: ${genreConstraints(input.genre)}`,
    levelRules(input.level),
    lengthGuidance(input.length),
    topicLine,
    personalization,
  ].join('\n\n')

  let completion: Awaited<ReturnType<typeof client.chat.completions.create>>
  try {
    completion = await client.chat.completions.create({
      model,
      temperature: temperatureFor(input.genre),
      max_tokens: 2_800,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new ApiError(502, 'LLM_ERROR', `Passage generation failed: ${msg}`)
  }

  const raw = completion.choices[0]?.message?.content?.trim()
  if (!raw) {
    throw new ApiError(502, 'LLM_ERROR', 'Passage generation returned empty content.')
  }

  let parsed: z.infer<typeof ResponseSchema>
  try {
    parsed = ResponseSchema.parse(JSON.parse(raw))
  } catch {
    throw new ApiError(502, 'LLM_ERROR', 'Passage generation response was not valid JSON.')
  }

  const title = parsed.title.trim()
  const passage = parsed.passage.trim()
  if (!passage.includes(' ') && passage.length < 40) {
    throw new ApiError(502, 'LLM_ERROR', 'Generated passage was too short or invalid.')
  }

  return { title, passage }
}
