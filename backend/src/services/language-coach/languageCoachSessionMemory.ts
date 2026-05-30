import type { LanguageCoachPersistedBlob } from '../../domain/speakLive/languageCoachSessionTypes'

const MAX_TOPIC_TOKENS = 20
const MAX_VOCAB_KEYS = 28

const STOP = new Set([
  'would',
  'could',
  'should',
  'about',
  'there',
  'their',
  'think',
  'really',
  'something',
  'nothing',
  'gewoon',
  'eigenlijk',
  'natuurlijk',
  'misschien',
  'heel',
  'veel',
  'even',
  'toen',
  'want',
  'maar',
  'dus',
  'alleen',
  'nog',
  'niet',
  'wel',
  'deze',
  'die',
  'dat',
  'het',
  'een',
])

function tokenizeForTopics(text: string): string[] {
  const raw = text.toLowerCase().match(/[a-zà-ÿ]{4,}/gi) ?? []
  const out: string[] = []
  const seen = new Set<string>()
  for (const w of raw) {
    const t = w.toLowerCase()
    if (STOP.has(t) || seen.has(t)) continue
    seen.add(t)
    out.push(t)
    if (out.length >= 5) break
  }
  return out
}

export function mergeTopicsTokensMentioned(prev: string[], userText: string): string[] {
  const add = tokenizeForTopics(userText)
  const set = new Set(prev)
  for (const t of add) set.add(t)
  return [...set].slice(-MAX_TOPIC_TOKENS)
}

export function mergeVocabStemHits(prev: Record<string, number>, userText: string): Record<string, number> {
  const next = { ...prev }
  for (const t of tokenizeForTopics(userText)) {
    next[t] = (next[t] ?? 0) + 1
  }
  const keys = Object.keys(next)
  if (keys.length <= MAX_VOCAB_KEYS) return next
  keys.sort((a, b) => (next[a] ?? 0) - (next[b] ?? 0))
  const drop = keys.slice(0, keys.length - MAX_VOCAB_KEYS)
  for (const k of drop) delete next[k]
  return next
}

/** Bump lightweight session-level signals (O(tags) per turn). */
export function bumpSessionSignals(
  prev: Record<string, number>,
  tags: string[],
  opts: { wordCount: number; charCount: number; isSpeechInput: boolean }
): Record<string, number> {
  const s = { ...prev }
  const bump = (k: string, n = 1) => {
    s[k] = Math.min(500, (s[k] ?? 0) + n)
  }
  const grammarTags = tags.filter((t) => ['past_tense', 'word_order', 'article', 'question_form'].includes(t))
  if (grammarTags.length >= 2) bump('grammar_instability', 2)
  else if (grammarTags.length === 1) bump('grammar_instability', 1)

  if (tags.includes('past_tense')) bump('tense_repeat', 1)
  if (tags.includes('word_order')) bump('word_order_repeat', 1)
  if (tags.includes('short_fragments') || tags.includes('low_clarity')) bump('very_short_answer', 1)
  if (tags.includes('follow_up_gap')) bump('weak_follow_up', 1)
  if (tags.includes('hesitation')) bump('hesitation_fragmentation', 1)

  const wc = opts.wordCount
  if (wc > 0 && wc < 4) bump('low_initiative', 1)
  if (opts.isSpeechInput && (tags.includes('low_clarity') || tags.includes('short_fragments'))) {
    bump('speech_fragmentation_hint', 1)
  }

  if (!tags.length && opts.charCount >= 28) bump('clean_natural_turn', 1)
  if (!tags.length && opts.charCount >= 55) bump('fluent_stretch_turn', 1)

  return s
}

export function topOverusedStems(vocabStemHits: Record<string, number>, minCount = 3): string[] {
  return Object.entries(vocabStemHits)
    .filter(([, c]) => c >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k)
}

export function buildSteeringPromptBlock(
  lc: LanguageCoachPersistedBlob,
  learnerLevelCefr: string | null
): string {
  const lines: string[] = []
  const sig = lc.sessionSignals ?? {}
  const tense = sig.tense_repeat ?? 0
  const fu = sig.weak_follow_up ?? 0
  const conf = lc.conversationGoal === 'confidence'
  const grammar = lc.conversationGoal === 'grammar'
  const fluency = lc.conversationGoal === 'fluency'
  const fuGoal = lc.conversationGoal === 'follow_up_questions'
  const pron = lc.conversationGoal === 'pronunciation'
  const story = lc.conversationGoal === 'storytelling'
  const cefr = (learnerLevelCefr ?? '').toUpperCase()

  lines.push('--- Adaptive steering (English; internal only) ---')

  if (topicsTokensMentionedSummary(lc)) {
    lines.push(`Topics / keywords already in play (do not re-open unless learner returns to them): ${topicsTokensMentionedSummary(lc)}`)
  }
  if (lc.recentCoachLeadIns?.length) {
    lines.push(`Avoid paraphrasing the same opening as your last lines: ${lc.recentCoachLeadIns.slice(-3).join(' | ')}`)
  }

  const overused = topOverusedStems(lc.vocabStemHits ?? {})
  if (overused.length) {
    lines.push(`Learner leans heavily on: ${overused.join(', ')} — gently diversify vocabulary in your Dutch, without naming this.`)
  }

  if (tense >= 2) {
    lines.push('Steer topic toward past-time Dutch practice: gisteren, afgelopen weekend, vorige week, wat heb je gedaan / hoe was het?')
  }
  if (fu >= 2 || fuGoal) {
    lines.push(
      'Invite reciprocal curiosity: end with a hook the learner can mirror with their own question back (e.g. “En jij?” only if natural).'
    )
  }
  if (conf || (sig.very_short_answer ?? 0) >= 2) {
    lines.push('Keep your next Dutch question simpler and safer; one clause; affirm before you probe.')
  }
  if (grammar) {
    lines.push('Prefer implicit recasts + one targeted follow-up that elicits the missing form (no rule lecture).')
  }
  if (fluency) {
    lines.push('Prioritise rhythm: slightly shorter turns, fewer stacked sub-questions, keep the ball rolling.')
  }
  if (pron) {
    lines.push('Naturally recycle 1–2 useful Dutch keywords from the learner’s last line in your reply (clear model, no drilling).')
  }
  if (story) {
    lines.push('Nudge toward mini-narrative: volgorde (toen → daarna), klein detail, gevoel.')
  }
  if (cefr === 'A1' || cefr === 'A2') {
    lines.push('CEFR low band: shorter Dutch sentences, high-frequency words, one question max.')
  }
  if (cefr === 'B2') {
    lines.push('CEFR higher band: allow slightly richer clauses if the learner is producing length.')
  }

  if (lines.length <= 1) {
    lines.push('No strong steering flags yet — stay curious and responsive.')
  }

  return lines.join('\n')
}

function topicsTokensMentionedSummary(lc: LanguageCoachPersistedBlob): string | null {
  const t = lc.topicsTokensMentioned ?? []
  if (!t.length) return null
  return t.slice(-10).join(', ')
}
