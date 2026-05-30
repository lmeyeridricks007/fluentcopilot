import OpenAI from 'openai'
import { z } from 'zod'
import { ApiError } from '../../shared/errors'
import { parseSpeakLiveState } from '../../domain/speakLive/speakLiveFsm'
import * as messageRepo from '../../repositories/conversationMessageRepository'
import * as personaRepo from '../../repositories/personaRepository'
import * as scenarioRepo from '../../repositories/scenarioRepository'
import * as threadRepo from '../../repositories/conversationThreadRepository'
import * as userRepo from '../../repositories/userRepository'
import { getOpenAiDirectConfig, getOpenAiEnrichmentModel, getResolvedAiProviderId } from '../ai/config/aiProviderConfig'
import { getSqlPool } from '../sql/sqlPool'

const StuckHintsResponseSchema = z.object({
  suggestions: z.array(z.string().min(2).max(240)).min(2).max(6),
})

export type SpeakLiveStuckHintsResult = {
  suggestions: string[]
  source: 'llm' | 'fallback'
}

function normalizeSuggestions(raw: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const s of raw) {
    const t = s.replace(/\s+/g, ' ').trim()
    if (t.length < 2) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t.slice(0, 200))
    if (out.length >= 5) break
  }
  return out
}

/** When the LLM is unavailable, still return usable Dutch lines for Speak Live. */
export function buildDeterministicStuckHints(input: {
  scenarioSlug: string
  goals: string[]
  lastAssistant: string
}): string[] {
  const slug = input.scenarioSlug.toLowerCase()
  const last = input.lastAssistant.toLowerCase()
  const trainish = slug.includes('train') || slug.includes('station') || /perron|trein|vertrek|ns\b/i.test(last)

  if (trainish) {
    return [
      'Op welk perron vertrekt de trein naar Amsterdam?',
      'Hoe laat vertrekt de volgende trein?',
      'Is er vertraging op deze trein?',
      'Moet ik overstappen in Utrecht?',
      'Dank u wel voor uw hulp.',
    ]
  }

  const foodish =
    slug.includes('ordering') ||
    slug.includes('food') ||
    /bestell|koffie|eten|drink|menu|rekening|afhaal|balie|smakelijk/i.test(last)

  if (foodish) {
    return [
      'Mag ik een koffie met melk, alstublieft?',
      'Wat raadt u aan vandaag?',
      'Zit er lactose in deze soep?',
      'Ik neem graag een broodje kaas om mee te nemen.',
      'Kunt u dat herhalen, iets langzamer?',
    ]
  }

  const shopish =
    slug.includes('supermarket') ||
    slug.includes('shop') ||
    /kassa|bon|gangpad|schap|melk|winkel|tasje|pinnen/i.test(last)

  if (shopish) {
    return [
      'Waar vind ik de melk, alstublieft?',
      'Mag ik een bonnetje?',
      'Ik pin graag contactloos.',
      'Hoeveel kost deze kaas?',
      'Kunt u dat herhalen, iets langzamer?',
    ]
  }

  const g = (input.goals ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 2)
  if (g.length) {
    return [
      `Ik wil graag helpen met: ${g[0]}.`,
      'Kunt u dat nog een keer zeggen?',
      'Wat is de volgende stap voor mij?',
      'Dank u wel, dat is duidelijk.',
    ]
  }

  return [
    'Kunt u dat herhalen, alstublieft?',
    'Ik begrijp het niet helemaal — wat bedoelt u precies?',
    'Wat raadt u mij aan?',
    'Dank u wel voor uw uitleg.',
  ]
}

function parseJsonObject(raw: string): unknown {
  const t = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  return JSON.parse(t) as unknown
}

async function requirePool() {
  const pool = await getSqlPool()
  if (!pool) throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'SQL database not configured')
  return pool
}

/**
 * LLM-backed Dutch phrase ideas for the learner’s next turn (Speak Live).
 * Does not persist messages; read-only context from the thread.
 */
export async function generateSpeakLiveStuckHints(params: {
  externalUserId: string
  threadId: string
  level?: string
}): Promise<SpeakLiveStuckHintsResult> {
  const pool = await requirePool()
  const internalUserId = await userRepo.ensureUser(pool, params.externalUserId)
  const thread = await threadRepo.getThreadById(pool, params.threadId)
  if (!thread) throw new ApiError(404, 'NOT_FOUND', 'Thread not found')
  if (thread.userId !== internalUserId) throw new ApiError(403, 'VALIDATION_ERROR', 'Forbidden')
  if (thread.conversationSurface !== 'speak_live') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Phrase ideas are only available for Speak Live sessions.')
  }

  const [scenario, recent] = await Promise.all([
    scenarioRepo.getScenarioById(pool, thread.scenarioId),
    messageRepo.listRecentMessagesForThread(pool, thread.id, 18),
  ])

  let persona: Awaited<ReturnType<typeof personaRepo.getPersonaById>> | null = null
  try {
    persona = await personaRepo.getPersonaById(pool, thread.personaId)
  } catch {
    persona = null
  }

  const transcriptLines = recent
    .filter((m) => (m.sender === 'user' || m.sender === 'assistant') && m.messageType === 'text')
    .map((m) => {
      const who = m.sender === 'user' ? 'Learner' : 'Staff'
      return `${who}: ${m.content.trim()}`
    })
    .filter((l) => l.length > 6)

  const sl = parseSpeakLiveState(thread.speakLiveStateJson)
  const runtimeCtx =
    (scenario.runtimeConfig?.context ?? '').trim() ||
    (typeof sl?.scenarioRuntimeConfig?.context === 'string' ? sl.scenarioRuntimeConfig.context.trim() : '')
  const rolling = (sl?.rollingSummaryEnglish ?? '').trim()
  const lastAssistant =
    [...recent].reverse().find((m) => m.sender === 'assistant' && m.content.trim())?.content.trim() ?? ''

  const slug = scenario.slug?.toLowerCase() ?? ''
  const cefr =
    params.level === 'A1' || params.level === 'A2' || params.level === 'B1' ? params.level : 'A2'

  const fallbackPack = (): SpeakLiveStuckHintsResult => ({
    suggestions: normalizeSuggestions(
      buildDeterministicStuckHints({
        scenarioSlug: slug,
        goals: scenario.goals ?? [],
        lastAssistant,
      }),
    ),
    source: 'fallback',
  })

  const providerId = getResolvedAiProviderId()
  const cfg = getOpenAiDirectConfig()
  if (providerId === 'mock' || !cfg.apiKey) {
    return fallbackPack()
  }

  const model = getOpenAiEnrichmentModel()
  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
    organization: cfg.organization,
    maxRetries: 0,
    timeout: 22_000,
  })

  const payload = {
    scenarioTitle: scenario.title,
    scenarioSlug: scenario.slug,
    scenarioDescription: (scenario.description ?? '').slice(0, 900),
    scenarioContextDutch: runtimeCtx.slice(0, 1400),
    learnerLevelCefr: cefr,
    scenarioGoals: (scenario.goals ?? []).slice(0, 14),
    personaName: persona?.displayName ?? null,
    personaRole: persona?.role ?? null,
    rollingSummaryEnglish: rolling.slice(0, 1000),
    recentTranscript: transcriptLines.join('\n').slice(0, 5000),
    lastStaffDutchLine: lastAssistant.slice(0, 900),
  }

  let completion: Awaited<ReturnType<typeof client.chat.completions.create>>
  try {
    completion = await client.chat.completions.create({
      model,
      temperature: 0.35,
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You help Dutch learners in a live role-play. Return JSON only: {"suggestions":["...", ...]}.\n' +
            'Rules:\n' +
            '- suggestions: 3 to 5 short Dutch sentences the LEARNER could say as their NEXT reply.\n' +
            '- Match the scenario, the staff persona, and especially the LAST staff line — respond to that moment (question, offer, or prompt).\n' +
            '- CEFR ' +
            cefr +
            ': vocabulary and grammar should fit that level; A1 shorter and simpler.\n' +
            '- Natural spoken Dutch; polite where appropriate (u / u-forms in service contexts).\n' +
            '- Do NOT copy the staff line verbatim; give learner options.\n' +
            '- No English inside suggestions; no numbering or bullets inside strings; no markdown.',
        },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    })
  } catch {
    return fallbackPack()
  }

  const raw = completion.choices[0]?.message?.content?.trim()
  if (!raw) return fallbackPack()

  let parsed: z.infer<typeof StuckHintsResponseSchema>
  try {
    parsed = StuckHintsResponseSchema.parse(parseJsonObject(raw))
  } catch {
    return fallbackPack()
  }

  const suggestions = normalizeSuggestions(parsed.suggestions)
  if (suggestions.length < 2) return fallbackPack()

  return { suggestions, source: 'llm' }
}
