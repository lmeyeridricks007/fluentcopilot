import type {
  NormalizedAudioPronunciationAssessment,
  NormalizedWordAssessment,
  PronunciationRetryHints,
} from '@/lib/speech/audioPronunciationTypes'

function normText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Strip punctuation / quotes around a single token (keeps letters and digits, incl. diacritics). */
function stripOuterNonWordChars(s: string): string {
  return s.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
}

/** Small grammar / function words — poor save targets and weak “retry one word” picks. */
const DUTCH_NON_LEXEME = new Set(
  [
    'a',
    'aan',
    'al',
    'als',
    'bij',
    'ben',
    'daar',
    'dan',
    'dat',
    'de',
    'die',
    'dit',
    'doch',
    'dus',
    'een',
    'eens',
    'en',
    'er',
    'ergens',
    'even',
    'geen',
    'haar',
    'hier',
    'hij',
    'hun',
    'ik',
    'in',
    'is',
    'je',
    'jij',
    'maar',
    'me',
    'men',
    'met',
    'mij',
    'mijn',
    'na',
    'naar',
    'niet',
    'noch',
    'nog',
    'nu',
    'of',
    'om',
    'ons',
    'onze',
    'ook',
    'op',
    'over',
    'te',
    'tot',
    'u',
    'uit',
    'uw',
    'van',
    'veel',
    'via',
    'voor',
    'want',
    'was',
    'wat',
    'we',
    'wel',
    'wij',
    'ze',
    'zijn',
    'zo',
    'zou',
    'zouden',
  ].map((s) => s.toLowerCase())
)

/** True for articles, pronouns, light auxiliaries, etc. — not good “save this word” targets. */
export function isDutchNonLexemeToken(raw: string): boolean {
  const t = stripOuterNonWordChars(raw.trim()).toLowerCase()
  if (!t) return true
  if (t.length <= 1) return true
  return DUTCH_NON_LEXEME.has(t)
}

function lexemicWorstWords(ctx: CoachingContext, max: number): string[] {
  return ctx.worstWords.map((w) => w.word.trim()).filter((x) => x && !isDutchNonLexemeToken(x)).slice(0, max)
}

/** Short quoted snippet for learner-facing coaching (ASCII quotes for reliable UI fonts). */
function quoteLineForUi(line: string): string {
  const t = line.trim().replace(/\s+/g, ' ')
  if (!t) return 'your line'
  if (t.length <= 64) return `"${t}"`
  return `"${t.slice(0, 62)}…"`
}

type CoachingContext = {
  quotedSpoken: string
  rawSpoken: string
  quotedReference: string | null
  worstWords: { word: string; accuracyScore: number }[]
  /** Up to two weakest tokens with scores, e.g. `"trein" (71) and "tijd" (68)`. */
  worstJoin: string
  minWord: number | null
  /** Overall headline looks strong but at least one word is clearly weak. */
  headlineWordMismatch: boolean
}

function buildCoachingContext(a: NormalizedAudioPronunciationAssessment): CoachingContext {
  const rawSpoken = a.recognizedText.trim() || a.referenceTextUsed.trim()
  const rawRef = a.referenceTextUsed.trim()
  const quotedSpoken = quoteLineForUi(rawSpoken)
  const quotedReference =
    rawRef && rawSpoken && normText(rawRef) !== normText(rawSpoken) ? quoteLineForUi(rawRef) : null

  const worstWords = [...a.words]
    .filter((w) => w.word.trim())
    .sort((x, y) => x.accuracyScore - y.accuracyScore)
    .slice(0, 3)

  const minWord = a.words.length ? Math.min(...a.words.map((w) => w.accuracyScore)) : null

  const weakOnly = worstWords.filter((w) => w.accuracyScore < 76)
  const forJoin = weakOnly.length > 0 ? weakOnly.slice(0, 2) : worstWords.slice(0, 2)
  const worstJoin = forJoin.map((w) => `"${w.word.trim()}" (${Math.round(w.accuracyScore)})`).join(' and ')

  const headlineWordMismatch = Boolean(
    minWord !== null && a.words.length >= 2 && a.overallScore >= 76 && minWord < 68
  )

  return { quotedSpoken, rawSpoken, quotedReference, worstWords, worstJoin, minWord, headlineWordMismatch }
}

/** Shown under the headline when per-word scores disagree with a strong overall. */
export function wordScoreGapNote(a: NormalizedAudioPronunciationAssessment): string | null {
  const ctx = buildCoachingContext(a)
  if (!ctx.headlineWordMismatch) return null
  const detail = ctx.worstJoin || (ctx.minWord != null ? `weakest token about ${Math.round(ctx.minWord)}/100` : '')
  return `Automatic scores can read generous while specific words still score low (${detail}). If this take felt harder than the headline, trust your ear and the word breakdown below more than the overall number.`
}

function tailWordsFromRaw(raw: string): string | null {
  const u = raw
    .trim()
    .replace(/[?.!…]+$/u, '')
    .split(/\s+/)
    .filter(Boolean)
  if (!u.length) return null
  if (u.length <= 3) return u.join(' ')
  return u.slice(-3).join(' ')
}

export type CoachQualityTag = 'strong' | 'steady' | 'careful' | 'building' | 'rushed'

export type CoachDimensionRow = {
  id: string
  title: string
  /** 0–100 (intonation uses a pace/clarity estimate when prosody is not returned). */
  score: number | null
  tag: CoachQualityTag
  hint: string
  /** Plain-language read on what drove this row. */
  why: string
  /** One concrete practice move. */
  tryNext: string
}

function tagFromScore(score: number): CoachQualityTag {
  if (score >= 82) return 'strong'
  if (score >= 72) return 'steady'
  if (score >= 62) return 'careful'
  if (score >= 52) return 'building'
  return 'rushed'
}

function whyTryPronunciation(
  a: NormalizedAudioPronunciationAssessment,
  ctx: CoachingContext
): { why: string; tryNext: string } {
  const s = a.pronunciationScore
  const drill = lexemicWorstWords(ctx, 2)
  const w0 = drill[0] ?? ctx.worstWords[0]?.word.trim() ?? ''
  const w1 = drill[1] ?? ctx.worstWords[1]?.word.trim() ?? ''

  let why: string
  if (ctx.headlineWordMismatch && ctx.worstJoin) {
    why = `For ${ctx.quotedSpoken}, the overall score (${Math.round(s)}/100) looks strong next to your weakest scored words (${ctx.worstJoin}). That usually means a few spots still need work even when the average is high.`
  } else if (s >= 78) {
    why = `For ${ctx.quotedSpoken}, most sounds come through clearly enough that people can follow you.`
    if (ctx.worstJoin) why += ` Softer spots: ${ctx.worstJoin}.`
  } else if (s >= 64) {
    why = `For ${ctx.quotedSpoken}, many sounds are fine, but a few are softer than typical short Dutch.`
    if (ctx.worstJoin) why += ` Lowest scores: ${ctx.worstJoin}.`
  } else {
    why = `For ${ctx.quotedSpoken}, several sounds run together or drop, so people have to work harder to follow.`
    if (ctx.worstJoin) why += ` Hardest words: ${ctx.worstJoin}.`
  }

  let tryNext: string
  if (w0 && w1 && w0 !== w1) {
    tryNext = `Say ${ctx.quotedSpoken} once at normal speed, then three times stretching only "${w0}" and "${w1}" (clear vowels, tidy endings), then say the whole sentence once more at normal speed.`
  } else if (w0) {
    tryNext = `Say ${ctx.quotedSpoken} once normally, then three times where only "${w0}" is loud and clear while the other words stay soft, then say the full sentence evenly again.`
  } else {
    tryNext = `Split ${ctx.quotedSpoken} in half at a natural pause; say each half slowly with tidy word endings, then say the whole line in one go without an extra breath in the middle.`
  }

  return { why, tryNext }
}

function whyTryRhythm(
  a: NormalizedAudioPronunciationAssessment,
  rhythmProxy: number,
  ctx: CoachingContext
): { why: string; tryNext: string } {
  const f = a.fluencyScore
  const p = a.prosodyScore
  const bump = lexemicWorstWords(ctx, 1)[0] ?? ctx.worstWords[0]?.word.trim()

  let why: string
  if (ctx.headlineWordMismatch) {
    why = `For ${ctx.quotedSpoken}, the timing score (${rhythmProxy}/100) can still look smooth while a few words drag — pauses often sit next to ${bump ? `"${bump}"` : 'the weakest spots'}.`
  } else if (rhythmProxy >= 76) {
    why = `For ${ctx.quotedSpoken}, you move through the words at a fairly even speed for short Dutch.`
  } else if (rhythmProxy >= 62) {
    why = `For ${ctx.quotedSpoken}, timing is OK but there are still small gaps or uneven little pauses between words.`
  } else {
    why = `For ${ctx.quotedSpoken}, pauses and speed changes make the line feel less smooth than relaxed Dutch.`
  }
  if (typeof p === 'number' && Number.isFinite(p) && p < 68 && f >= 72) {
    why += ' Your speed is steady; the tune and emphasis side of the score is what drags this row.'
  }

  const tryNext = bump
    ? `Tap a slow beat and say ${ctx.quotedSpoken} on the beat; when you say "${bump}", start that word right on a tap with no little pause before it.`
    : `Tap four slow beats; fit ${ctx.quotedSpoken} across those beats without extra tiny pauses, then try again a little faster.`

  return { why, tryNext }
}

function whyTrySentenceStress(
  _a: NormalizedAudioPronunciationAssessment,
  stressBlend: number,
  ctx: CoachingContext
): { why: string; tryNext: string } {
  const drill = lexemicWorstWords(ctx, 2)
  const w0 = drill[0] ?? ctx.worstWords[0]?.word.trim() ?? ''
  const w1 = drill[1] ?? ctx.worstWords[1]?.word.trim() ?? ''

  let why: string
  if (ctx.headlineWordMismatch && ctx.worstJoin) {
    why = `For ${ctx.quotedSpoken}, which words get stress still looks uneven where ${ctx.worstJoin} — listeners notice those first.`
  } else if (stressBlend >= 76) {
    why = `For ${ctx.quotedSpoken}, which words you stress is easy to follow.`
  } else if (stressBlend >= 62) {
    why = `For ${ctx.quotedSpoken}, stress is understandable, but a few words sound a bit too light compared with everyday Dutch.`
  } else {
    why = `For ${ctx.quotedSpoken}, many words sound equally heavy, so the natural “louder spot” in the line is hard to hear.`
  }

  let tryNext: string
  if (w0 && w1 && w0 !== w1) {
    tryNext = `Whisper all of ${ctx.quotedSpoken} except "${w0}" and "${w1}" — make those two a bit longer and a bit higher, then say the full sentence at normal volume with the same pattern.`
  } else if (w0) {
    tryNext = `Say ${ctx.quotedSpoken} three times with only "${w0}" clearly louder and longer; the fourth time keep that pattern but bring the volume back to normal everywhere.`
  } else {
    tryNext = `Pick the main content word in ${ctx.quotedSpoken}; say it alone three times with a clear bump in loudness, then put it back in the full line.`
  }

  return { why, tryNext }
}

function whyTryIntonation(
  a: NormalizedAudioPronunciationAssessment,
  intonationScore: number,
  hasDirectProsodyScore: boolean,
  ctx: CoachingContext
): { why: string; tryNext: string } {
  const tail = tailWordsFromRaw(ctx.rawSpoken)
  const lineProbe = `${a.referenceTextUsed} ${a.recognizedText}`.trim()
  const looksQuestion = /\?\s*$/.test(lineProbe)

  let why: string
  if (!hasDirectProsodyScore) {
    if (intonationScore >= 72) {
      why = `For ${ctx.quotedSpoken}, we did not get a separate tune score; this number guesses from your speed and clarity — treat it as a light hint.`
    } else if (intonationScore >= 62) {
      why = `For ${ctx.quotedSpoken}, we did not get a separate tune score; the guess still suggests your melody could use a bit more shape.`
    } else {
      why = `For ${ctx.quotedSpoken}, we did not get a separate tune score; from speed and clarity it still looks like intonation needs gentle work.`
    }
  } else if (intonationScore >= 76) {
    why = `For ${ctx.quotedSpoken}, melody, stress, and pacing look supportive for short everyday Dutch.`
  } else if (intonationScore >= 62) {
    why = `For ${ctx.quotedSpoken}, melody is OK but still a bit flat or uneven next to confident service Dutch.`
  } else {
    why = `For ${ctx.quotedSpoken}, melody and stress still sound quite “learner” — more polish on rises and falls will help.`
  }

  let tryNext: string
  if (looksQuestion && tail) {
    tryNext = `Practice only the ending "${tail}" from ${ctx.quotedSpoken} like a short question: keep volume steady and lift a little after the stressed part, then say the full sentence again.`
  } else if (tail) {
    tryNext = `Hum a smooth line over "${tail}" in ${ctx.quotedSpoken}, then speak on that same shape without hitting every word with the same force.`
  } else {
    tryNext = `Hum once through ${ctx.quotedSpoken}, then speak on the same shape with real words — keep volume even.`
  }

  return { why, tryNext }
}

function whyTryNaturalness(
  a: NormalizedAudioPronunciationAssessment,
  naturalnessProxy: number,
  ctx: CoachingContext
): { why: string; tryNext: string } {
  const refNote =
    ctx.quotedReference && ctx.quotedSpoken !== ctx.quotedReference
      ? ` Compare in your head with the target ${ctx.quotedReference}.`
      : ''

  let why: string
  if (naturalnessProxy >= 76) {
    why = `For ${ctx.quotedSpoken}, clarity, speed, and finishing the line together feel close to a natural short service line.${refNote}`
  } else if (naturalnessProxy >= 62) {
    why = `For ${ctx.quotedSpoken}, people can follow you, but it still sounds a bit like a textbook line instead of relaxed Dutch.${refNote}`
  } else {
    why = `For ${ctx.quotedSpoken}, even when people understand you, the mix of sounds and pauses still sounds careful rather than relaxed.${refNote}`
  }
  if (a.completenessScore < 72) why += ' You also stop or soften early on some endings.'

  const tryNext =
    a.completenessScore < 72
      ? `Finish the last word in ${ctx.quotedSpoken} fully (especially the last consonants), then say the whole sentence again without stopping early.`
      : `Record ${ctx.quotedSpoken}, listen once, then say it again as one smooth thought — same words, fewer little “steps” between them.`

  return { why, tryNext }
}

/** Human headline + one line — no “native” claims. */
export function buildSpeakingTopVerdict(a: NormalizedAudioPronunciationAssessment): {
  headline: string
  summary: string
} {
  const ctx = buildCoachingContext(a)
  const { overallScore, pronunciationScore, fluencyScore, completenessScore } = a
  const paceHint = fluencyScore >= 76 ? 'fairly even pace' : fluencyScore >= 62 ? 'careful pace' : 'uneven or hesitant pace'
  const clarityHint = pronunciationScore >= 78 ? 'clear sounds' : pronunciationScore >= 64 ? 'mostly clear sounds' : 'sounds still forming'

  let headline = 'Good learner Dutch'
  if (overallScore >= 82 && fluencyScore >= 74) headline = 'Clear learner Dutch'
  else if (overallScore >= 74) headline = 'Solid learner Dutch'
  else if (overallScore >= 62) headline = 'Understandable learner Dutch'
  else headline = 'Building Dutch clarity'

  if (fluencyScore < 60 && completenessScore >= 78) headline = 'Understandable, careful Dutch'
  if (pronunciationScore >= 80 && fluencyScore < 66) headline = 'Clear words, flow still learning'

  if (ctx.headlineWordMismatch) {
    headline = 'Strong average, uneven words'
  }

  let summary = `Overall ${Math.round(overallScore)}/100 — ${clarityHint}, ${paceHint}.`
  if (ctx.headlineWordMismatch && ctx.worstJoin) {
    summary += ` Weakest scored tokens: ${ctx.worstJoin} — prioritize those in ${ctx.quotedSpoken} even though the headline number looks high.`
  } else {
    summary += ' Keep short reps focused on endings listeners care about.'
  }

  return { headline, summary }
}

/**
 * Five UX rows from pronunciation snapshot (no full speaking-assessment stack).
 * Intonation prefers a direct prosody score when present; otherwise a fluency/pronunciation estimate so the row is not empty.
 */
export function buildCoachDimensionsFromPronunciation(a: NormalizedAudioPronunciationAssessment): CoachDimensionRow[] {
  const ctx = buildCoachingContext(a)
  const stressBlend = Math.round(a.pronunciationScore * 0.55 + a.accuracyScore * 0.45)
  const rhythmProxy = Math.round(a.fluencyScore * 0.55 + (a.prosodyScore ?? a.fluencyScore) * 0.45)
  const naturalnessProxy = Math.round(
    a.pronunciationScore * 0.34 + a.fluencyScore * 0.33 + a.completenessScore * 0.33
  )

  const hasDirectProsodyScore = typeof a.prosodyScore === 'number' && Number.isFinite(a.prosodyScore)
  /** Some clips omit `ProsodyScore` — show a bounded proxy so the row is not blank. */
  const intonationProxy = Math.round(a.fluencyScore * 0.56 + a.pronunciationScore * 0.44)
  const intonationScore = hasDirectProsodyScore ? Math.round(a.prosodyScore!) : intonationProxy
  const intonationTag = tagFromScore(intonationScore)

  const pCoach = whyTryPronunciation(a, ctx)
  const rCoach = whyTryRhythm(a, rhythmProxy, ctx)
  const sCoach = whyTrySentenceStress(a, stressBlend, ctx)
  const iCoach = whyTryIntonation(a, intonationScore, hasDirectProsodyScore, ctx)
  const nCoach = whyTryNaturalness(a, naturalnessProxy, ctx)

  return [
    {
      id: 'pronunciation',
      title: 'Pronunciation',
      score: a.pronunciationScore,
      tag: tagFromScore(a.pronunciationScore),
      hint: 'How clearly each sound comes through.',
      ...pCoach,
    },
    {
      id: 'rhythm',
      title: 'Rhythm',
      score: rhythmProxy,
      tag: tagFromScore(rhythmProxy),
      hint: 'How smoothly the sentence moves in time.',
      ...rCoach,
    },
    {
      id: 'sentenceStress',
      title: 'Sentence stress',
      score: stressBlend,
      tag: tagFromScore(stressBlend),
      hint: 'Which words sound stressed and clear in the line.',
      ...sCoach,
    },
    {
      id: 'intonation',
      title: 'Intonation guidance',
      score: intonationScore,
      tag: intonationTag,
      hint: hasDirectProsodyScore
        ? 'Melody and emphasis from your recording.'
        : 'Estimated from pace and clarity — no separate tune score was returned for this clip.',
      ...iCoach,
    },
    {
      id: 'naturalness',
      title: 'Naturalness',
      score: naturalnessProxy,
      tag: tagFromScore(naturalnessProxy),
      hint: 'How smooth and “Dutch-shaped” the line feels overall.',
      ...nCoach,
    },
  ]
}

export function buildWhatWentWellFromPayload(
  a: NormalizedAudioPronunciationAssessment,
  summaryFeedback: string | null
): string[] {
  const ctx = buildCoachingContext(a)
  const out: string[] = []
  if (ctx.headlineWordMismatch) {
    out.push(`You produced ${ctx.quotedSpoken} — good practice even when automatic scores look generous.`)
  }
  if (a.completenessScore >= 78) out.push('Listeners can follow what you meant — completeness is there.')
  if (a.pronunciationScore >= 74 && !ctx.headlineWordMismatch) {
    out.push('Several sounds land clearly enough for everyday Dutch.')
  }
  if (a.fluencyScore >= 72) out.push('Pace is steady enough to work with in short service lines.')
  if (summaryFeedback?.trim()) out.push(summaryFeedback.trim())
  if (out.length === 0) out.push(`You recorded ${ctx.quotedSpoken} — that habit alone drives measurable progress.`)
  return out.slice(0, 5)
}

export function buildImproveNextFromPayload(
  a: NormalizedAudioPronunciationAssessment,
  recommendedNextStep: string | null
): string[] {
  const ctx = buildCoachingContext(a)
  const out: string[] = []
  const w0 = lexemicWorstWords(ctx, 1)[0] ?? ctx.worstWords[0]?.word.trim()
  if (w0) {
    out.push(
      `In ${ctx.quotedSpoken}, practice "${w0}" first: five slow reps, then five at normal speed inside the full sentence.`
    )
  }
  if (a.fluencyScore < 68) {
    out.push(`Inside ${ctx.quotedSpoken}, use only tiny pauses between ideas so it does not sound like separate words stuck together.`)
  }
  if (a.pronunciationScore < 70) {
    out.push(`Slow the trickiest 2–3 words in ${ctx.quotedSpoken}, then slot them back at conversation speed.`)
  }
  if (a.completenessScore < 72) {
    out.push(`Finish key endings in ${ctx.quotedSpoken} — Dutch listeners often cue politeness from the tail.`)
  }
  if (recommendedNextStep?.trim()) out.unshift(recommendedNextStep.trim())
  if (out.length === 0) {
    out.push(`Pick the last three words of ${ctx.quotedSpoken} and loop them until easy, then run the full line again.`)
  }
  return [...new Set(out)].slice(0, 6)
}

export type WordCoachBand = 'strong' | 'okay' | 'work'

export function wordCoachBand(w: { accuracyScore: number }): WordCoachBand {
  if (w.accuracyScore >= 85) return 'strong'
  if (w.accuracyScore >= 65) return 'okay'
  return 'work'
}

export function pickRetryFullLine(a: NormalizedAudioPronunciationAssessment, compareText: string): string {
  const c = compareText.trim()
  if (c) return c
  return a.referenceTextUsed.trim() || a.recognizedText.trim()
}

function wordTimelineKey(w: NormalizedWordAssessment, stableIdx: number): number {
  if (typeof w.startMs === 'number' && Number.isFinite(w.startMs)) return w.startMs
  return 1e9 + stableIdx
}

export function pickRetryDifficultPhrase(a: NormalizedAudioPronunciationAssessment): string | null {
  if (!a.words.length) return null
  const indexed = a.words.map((w, i) => ({ w, i }))
  const worst = [...indexed].sort((a, b) => a.w.accuracyScore - b.w.accuracyScore).slice(0, 3)
  worst.sort((a, b) => wordTimelineKey(a.w, a.i) - wordTimelineKey(b.w, b.i))
  const low = worst.map((x) => x.w.word.trim()).filter(Boolean)
  if (low.length === 0) return null
  return low.join(' ')
}

export function pickRetryDifficultWord(a: NormalizedAudioPronunciationAssessment): string | null {
  const sorted = [...a.words].sort((x, y) => x.accuracyScore - y.accuracyScore)
  const lex = sorted.find((x) => {
    const t = x.word?.trim()
    return t && !isDutchNonLexemeToken(t)
  })
  if (lex) return lex.word.trim()
  const w = sorted[0]?.word?.trim()
  return w || null
}

export function pickPhraseFromRetryHints(
  retryHints: PronunciationRetryHints | null | undefined,
  fallbackPhrase: string | null
): string | null {
  if (!retryHints?.phraseTargets?.length) return fallbackPhrase
  const multi = retryHints.phraseTargets.find((p) => /\s/.test(p.text.trim()))
  if (multi?.text.trim()) return multi.text.trim()
  return retryHints.phraseTargets[0]?.text.trim() ?? fallbackPhrase
}

export function pickWordFromRetryHints(
  retryHints: PronunciationRetryHints | null | undefined,
  fallbackWord: string | null
): string | null {
  const preferLex = (w: string | null | undefined): string | null => {
    const t = w?.trim()
    if (!t || /\s/.test(t)) return null
    if (!isDutchNonLexemeToken(t)) return t
    if (fallbackWord && !isDutchNonLexemeToken(fallbackWord)) return fallbackWord.trim()
    return t
  }

  const rt = retryHints?.coaching?.retryTarget?.trim()
  if (rt && !/\s/.test(rt)) {
    const p = preferLex(rt)
    if (p) return p
  }
  const single = retryHints?.phraseTargets?.find((p) => !/\s/.test(p.text.trim()))?.text.trim()
  if (single) {
    const p = preferLex(single)
    if (p) return p
  }
  return fallbackWord
}

/** Drives retry CTAs from `retryHints` when present (else heuristics from word scores). */
export function resolveRetryUi(
  a: NormalizedAudioPronunciationAssessment,
  compareLine: string,
  retryHints?: PronunciationRetryHints | null
): {
  fullLine: string
  phrase: string | null
  word: string | null
  primary: 'full' | 'phrase' | 'word'
  coachingRetry: string | null
  coachingWhy: string | null
} {
  const fullLine = pickRetryFullLine(a, compareLine)
  const fbPhrase = pickRetryDifficultPhrase(a)
  const fbWord = pickRetryDifficultWord(a)
  let phrase = pickPhraseFromRetryHints(retryHints, fbPhrase)
  const word = pickWordFromRetryHints(retryHints, fbWord)
  const coachingRetry = retryHints?.coaching?.retryTarget?.trim() ?? null
  const coachingWhy = retryHints?.coaching?.retryWhy?.trim() ?? null
  if (coachingRetry && /\s/.test(coachingRetry)) {
    phrase = coachingRetry
  }

  let primary: 'full' | 'phrase' | 'word' = 'full'
  if (coachingRetry) {
    if (normText(coachingRetry) === normText(fullLine)) primary = 'full'
    else if (/\s/.test(coachingRetry)) primary = 'phrase'
    else primary = 'word'
  } else {
    const w =
      Boolean(word) &&
      a.words.some((x) => x.word.trim().toLowerCase() === word!.trim().toLowerCase() && x.accuracyScore < 62)
    if (w) primary = 'word'
    else if (fbPhrase && a.fluencyScore < 66) primary = 'phrase'
    else primary = 'full'
  }

  return { fullLine, phrase, word, primary, coachingRetry, coachingWhy }
}

export function pickShadowPracticeChunk(retry: ReturnType<typeof resolveRetryUi>): string {
  const { phrase, word, fullLine, coachingRetry } = retry
  if (coachingRetry?.trim()) return coachingRetry.trim()
  return phrase?.trim() || word?.trim() || fullLine.trim()
}
