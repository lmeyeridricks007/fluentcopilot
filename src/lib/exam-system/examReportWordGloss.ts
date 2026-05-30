import { z } from 'zod'
import { getApiBaseUrl } from '@/lib/api/apiConfig'
import { buildSimulationQuestionBreakdown } from './reportBuilder'
import type { ExamProfile, ExamSampleAnswerWordGloss, ExamSessionRecord } from './types'
import { buildWordGlossCacheKey, tokenKeyForMatch } from '@/features/speak-live/evaluation/dutchWordGlossSupport'

const PhraseGlossBatchSchema = z.object({
  entries: z.array(
    z.object({
      token: z.string().min(1).max(80),
      glossEn: z.string().min(1).max(520),
      glossNl: z.string().min(1).max(520),
    }),
  ),
})

const MAX_TOKENS_PER_PHRASE = 36
const PHRASE_CONCURRENCY = 3
const BACKEND_GLOSS_CONCURRENCY = 6

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1))}…`
}

function uniqueTokensForPhrase(phrase: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of phrase.split(/\s+/)) {
    const core = tokenKeyForMatch(raw)
    if (!core || core.length < 2 || seen.has(core)) continue
    seen.add(core)
    out.push(core)
    if (out.length >= MAX_TOKENS_PER_PHRASE) break
  }
  return out
}

function modelForWordGloss(): string {
  return (
    process.env.OPENAI_MODEL_SPEAKING_ASSESSMENT?.trim() ||
    process.env.OPENAI_MODEL_ENRICHMENT?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    'gpt-4o-mini'
  )
}

async function fetchPhraseWordGlossBatch(input: {
  phrase: string
  tokens: string[]
  apiKey: string
  model: string
}): Promise<Record<string, ExamSampleAnswerWordGloss>> {
  const phrase = clip(input.phrase, 900)
  const tokens = input.tokens
  const out: Record<string, ExamSampleAnswerWordGloss> = {}
  if (!phrase || !tokens.length) return out

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45_000)
  let res: Response
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: input.model,
        temperature: 0.12,
        max_tokens: 2200,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You help Dutch learners read exam sample answers. Return JSON only: {"entries":[{"token":"...","glossEn":"...","glossNl":"..."}]}. ' +
              'For EACH token in the user list, explain what that word means **in this exact Dutch sentence**. ' +
              'glossEn: plain English (1–2 short sentences). glossNl: simple Dutch explanation (1–2 short sentences, A2-friendly). ' +
              'Do not skip tokens from the list. No markdown.',
          },
          {
            role: 'user',
            content: JSON.stringify({ sentence: phrase, tokens }),
          },
        ],
      }),
    })
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) return out

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const raw = data.choices?.[0]?.message?.content?.trim()
  if (!raw) return out

  let json: unknown
  try {
    json = JSON.parse(raw) as unknown
  } catch {
    return out
  }

  const parsed = PhraseGlossBatchSchema.safeParse(json)
  if (!parsed.success) return out

  for (const row of parsed.data.entries) {
    const core = tokenKeyForMatch(row.token)
    if (!core) continue
    out[core] = { glossEn: row.glossEn.trim(), glossNl: row.glossNl.trim() }
  }
  return out
}

/** Per-token gloss via Azure Functions (`POST /api/speak-live/word-gloss`) — uses backend OPENAI_API_KEY. */
async function fetchGlossFromBackend(
  userId: string,
  word: string,
  phrase: string,
): Promise<ExamSampleAnswerWordGloss | null> {
  const base = getApiBaseUrl()
  if (!base || !userId.trim()) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 22_000)
  try {
    const res = await fetch(`${base}/api/speak-live/word-gloss`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId.trim(),
      },
      body: JSON.stringify({
        word,
        phraseContext: phrase.trim().slice(0, 420) || undefined,
      }),
    })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      console.warn('[examReportWordGloss] backend gloss HTTP', res.status, word, err.slice(0, 120))
      return null
    }
    const data = (await res.json()) as { glossEn?: string; glossNl?: string; gloss?: string }
    const glossEn = (data.glossEn ?? data.gloss ?? '').trim()
    const glossNl = (data.glossNl ?? '').trim()
    if (!glossEn) return null
    return { glossEn, glossNl: glossNl || glossEn }
  } catch (e) {
    console.warn('[examReportWordGloss] backend gloss failed', word, e)
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function fetchPhraseWordGlossBatchViaBackend(
  userId: string,
  phrase: string,
  tokens: string[],
): Promise<Record<string, ExamSampleAnswerWordGloss>> {
  const phraseClipped = clip(phrase, 900)
  const out: Record<string, ExamSampleAnswerWordGloss> = {}
  if (!phraseClipped || !tokens.length) return out

  let index = 0
  const workers = Math.min(BACKEND_GLOSS_CONCURRENCY, tokens.length)
  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (index < tokens.length) {
        const core = tokens[index++]
        const gloss = await fetchGlossFromBackend(userId, core, phraseClipped)
        if (gloss) out[core] = gloss
      }
    }),
  )
  return out
}

/**
 * LLM-generate word glosses for every sample answer on a completed simulation session.
 * Runs during report generation (complete / evaluate-answers / reprocess), not on tap.
 */
export async function generateSampleAnswerWordGlossesForSession(
  session: ExamSessionRecord,
  profile: ExamProfile,
): Promise<Record<string, ExamSampleAnswerWordGloss>> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  const backendBase = getApiBaseUrl()
  if (!apiKey && !backendBase) {
    console.warn(
      '[examReportWordGloss] No OPENAI_API_KEY on Next.js and no NEXT_PUBLIC_API_BASE_URL — sample-answer glosses skipped',
    )
    return {}
  }

  const breakdown =
    session.report?.kind === 'simulation' && session.report.questionBreakdown?.length
      ? session.report.questionBreakdown
      : buildSimulationQuestionBreakdown(session, profile)

  const phrases = [
    ...new Set(
      breakdown
        .map((q) => q.modelAnswerNl?.trim())
        .filter((t): t is string => Boolean(t && t.length >= 8)),
    ),
  ]

  const model = modelForWordGloss()
  const merged: Record<string, ExamSampleAnswerWordGloss> = {}
  const userId = session.userId

  const phraseConcurrency = apiKey ? PHRASE_CONCURRENCY : 1
  for (let i = 0; i < phrases.length; i += phraseConcurrency) {
    const chunk = phrases.slice(i, i + phraseConcurrency)
    const batch = await Promise.all(
      chunk.map(async (phrase) => {
        const tokens = uniqueTokensForPhrase(phrase)
        const byCore = apiKey
          ? await fetchPhraseWordGlossBatch({ phrase, tokens, apiKey, model })
          : await fetchPhraseWordGlossBatchViaBackend(userId, phrase, tokens)
        const keyed: Record<string, ExamSampleAnswerWordGloss> = {}
        for (const [core, gloss] of Object.entries(byCore)) {
          keyed[buildWordGlossCacheKey(core, phrase)] = gloss
        }
        if (apiKey && backendBase && Object.keys(byCore).length < tokens.length) {
          const missing = tokens.filter((t) => !byCore[t])
          if (missing.length) {
            const extra = await fetchPhraseWordGlossBatchViaBackend(userId, phrase, missing)
            for (const [core, gloss] of Object.entries(extra)) {
              keyed[buildWordGlossCacheKey(core, phrase)] = gloss
            }
          }
        }
        return keyed
      }),
    )
    for (const part of batch) {
      Object.assign(merged, part)
    }
  }

  if (!Object.keys(merged).length && phrases.length) {
    console.warn('[examReportWordGloss] No glosses produced for', phrases.length, 'sample-answer phrase(s)')
  }

  return merged
}

export async function attachSampleAnswerWordGlossesToSession(
  session: ExamSessionRecord,
  profile: ExamProfile,
): Promise<ExamSessionRecord> {
  if (session.mode !== 'simulation') return session
  const glosses = await generateSampleAnswerWordGlossesForSession(session, profile)
  return {
    ...session,
    sampleAnswerWordGlosses: glosses,
    updatedAt: new Date().toISOString(),
  }
}
