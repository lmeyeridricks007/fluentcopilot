import type { ConversationThread } from '@/features/feature1-chat/types'
import { TRAIN_STATION_SCENARIO_ID } from '@/features/feature1-chat/mock/mockScenarioConfigs'
import type { SavedPhraseItem, SavedWordItem } from '@/mocks/personalLibrarySeed'
import type { MicroWin } from '@/lib/product/microWins'
import { MICRO_WIN_COPY } from '@/lib/product/microWins'

const ENGLISH_LEAK = /\b(please|sorry|thanks|thank you|yes|no|hello|okay|ok)\b/i

function norm(s: string): string {
  return s.trim().toLowerCase()
}

function userLinesFromThread(t: ConversationThread): string[] {
  const out: string[] = []
  for (const m of t.messages) {
    if (m.sender !== 'user') continue
    const line = (m.metadata?.originalTranscript?.trim() || m.content.trim()) ?? ''
    if (line) out.push(line)
  }
  return out
}

/** Recent Train-station user lines (typed + STT) for lightweight library matching. */
export function gatherTrainStationUserScanText(threads: ConversationThread[], maxThreads = 5): string {
  const relevant = threads
    .filter(
      (t) =>
        t.scenarioId === TRAIN_STATION_SCENARIO_ID &&
        (t.status === 'completed' || t.status === 'active' || t.status === 'paused'),
    )
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, maxThreads)
  const lines: string[] = []
  for (const t of relevant) {
    lines.push(...userLinesFromThread(t))
  }
  return lines.join('\n').slice(0, 12_000)
}

function tokenizeForMatch(blob: string): Set<string> {
  const n = norm(blob)
  const parts = n.split(/[^a-z0-9\u00C0-\u024F']+/gi).filter((p) => p.length >= 3)
  return new Set(parts)
}

function wordAppearsInBlob(wordNl: string, haystackNorm: string, tokens: Set<string>): boolean {
  const w = norm(wordNl)
  if (w.length < 3) return false
  if (tokens.has(w)) return true
  if (w.length >= 5 && haystackNorm.includes(w)) return true
  return false
}

function phraseAppearsInBlob(phraseNl: string, haystackNorm: string): boolean {
  const p = norm(phraseNl).replace(/\s+/g, ' ')
  if (p.length < 6) return false
  return haystackNorm.includes(p)
}

function findMentionedBankTerms(
  scanNorm: string,
  words: SavedWordItem[],
  phrases: SavedPhraseItem[],
): { words: string[]; phrases: string[] } {
  const tokens = tokenizeForMatch(scanNorm)
  const hitWords: string[] = []
  const seen = new Set<string>()
  for (const w of words) {
    const nl = w.nl?.trim()
    if (!nl || seen.has(norm(nl))) continue
    if (wordAppearsInBlob(nl, scanNorm, tokens)) {
      seen.add(norm(nl))
      hitWords.push(nl)
      if (hitWords.length >= 6) break
    }
  }
  const hitPhrases: string[] = []
  for (const p of phrases) {
    const nl = p.nl?.trim()
    if (!nl || seen.has(norm(nl))) continue
    if (phraseAppearsInBlob(nl, scanNorm)) {
      seen.add(norm(nl))
      hitPhrases.push(nl)
      if (hitPhrases.length >= 3) break
    }
  }
  return { words: hitWords, phrases: hitPhrases }
}

function lastUserQuestionSnippet(scanLines: string): string | null {
  const lines = scanLines.split('\n').map((l) => l.trim()).filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!
    if (line.includes('?')) {
      const t = line.length > 72 ? `${line.slice(0, 69)}…` : line
      return t
    }
  }
  return null
}

/**
 * Builds up to three Coach micro-wins with optional `mentions` when we can infer them
 * from recent Train-station (text) threads + the Library.
 */
export function buildCoachMicroWinsDisplay(input: {
  trainThreads: ConversationThread[]
  words: SavedWordItem[]
  phrases: SavedPhraseItem[]
}): MicroWin[] {
  const scan = gatherTrainStationUserScanText(input.trainThreads)
  const scanNorm = norm(scan)
  const out: MicroWin[] = []
  const usedIds = new Set<string>()

  const { words: hitW, phrases: hitP } = findMentionedBankTerms(scanNorm, input.words, input.phrases)
  const bankMentions = [...hitW, ...hitP.map((p) => (p.length > 36 ? `${p.slice(0, 33)}…` : p))]

  if (bankMentions.length) {
    usedIds.add('saved_word_used')
    out.push({
      ...MICRO_WIN_COPY.saved_word_used,
      body: 'Your saved Dutch showed up in recent Train-station lines — nice carry-over from your word bank.',
      mentions: bankMentions.slice(0, 8),
    })
  }

  if (scanNorm.length > 24) {
    const q = lastUserQuestionSnippet(scan)
    if (q) {
      usedIds.add('natural_follow_up')
      out.push({
        ...MICRO_WIN_COPY.natural_follow_up,
        body: 'You moved the scene forward with a real follow-up question.',
        mentions: [q],
      })
    }
  }

  if (scanNorm.length > 55 && !ENGLISH_LEAK.test(scan)) {
    usedIds.add('no_english_switch')
    out.push({
      ...MICRO_WIN_COPY.no_english_switch,
    })
  }

  const fillOrder: Array<keyof typeof MICRO_WIN_COPY> = [
    'saved_word_used',
    'natural_follow_up',
    'no_english_switch',
    'self_corrected_word_order',
    'more_natural_than_last',
  ]
  for (const key of fillOrder) {
    if (out.length >= 3) break
    if (usedIds.has(key)) continue
    usedIds.add(key)
    out.push({ ...MICRO_WIN_COPY[key] })
  }

  if (!bankMentions.length && out.some((w) => w.id === 'saved_word_used')) {
    const recentWords = [...input.words]
      .sort((a, b) => norm(b.savedAt).localeCompare(norm(a.savedAt)))
      .slice(0, 4)
      .map((w) => w.nl.trim())
      .filter(Boolean)
    const idx = out.findIndex((w) => w.id === 'saved_word_used')
    if (idx >= 0 && recentWords.length) {
      out[idx] = {
        ...out[idx]!,
        body: 'We have not spotted a saved word in recent Train-station lines yet — here is what you are collecting. Try weaving one into your next reply.',
        mentions: recentWords,
      }
    }
  }

  return out.slice(0, 3)
}
