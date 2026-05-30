/**
 * Enrichment-driven hints for “From your day” packs beyond single saved words.
 * Client mirror: `src/features/quick-capture/capturePackHints.ts`
 */
import { extractWordPackHints, type WordPackHints } from './wordRepPackHints'

export type PhrasePackHints = WordPackHints

export function extractPhrasePackHints(
  enrichedJson: string | null | undefined,
  bodySecondary: string | null | undefined,
  primary: string,
): PhrasePackHints {
  const base = extractWordPackHints(enrichedJson, bodySecondary, primary)
  const p = primary.trim()
  if (!p.includes(' ')) return base

  const examples: string[] = []
  const short = p.length > 90 ? `${p.slice(0, 90)}…` : p
  examples.push(`Zo zeg je het compact: “${short}”.`)
  const canonLine = base.exampleLinesNl.find((l) => l.includes('Je hoort ook wel'))
  if (canonLine) examples.push(canonLine)
  examples.push(`Herhaal de hele frase in één adem — langzaam, dan op tempo.`)
  return {
    meaningEn: base.meaningEn,
    usageWhenEn: base.usageWhenEn,
    exampleLinesNl: examples.slice(0, 3),
  }
}

export type TextCapturePracticeHints = {
  shortExplanationEn: string | null
  keyVocabOrTags: string[]
  anchorPhraseNl: string
}

function firstSentenceNl(text: string, maxLen: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  const cut = t.slice(0, maxLen)
  const end = cut.search(/[.!?]\s/)
  if (end > 20) return cut.slice(0, end + 1).trim()
  return cut.trim()
}

export function extractTextCapturePracticeHints(
  enrichedJson: string | null | undefined,
  bodySecondary: string | null | undefined,
  primary: string,
): TextCapturePracticeHints {
  const p = primary.replace(/\s+/g, ' ').trim()
  let shortExplanationEn: string | null = null
  let anchorPhraseNl = firstSentenceNl(p, 160)
  const keyVocabOrTags: string[] = []

  if (enrichedJson?.trim()) {
    try {
      const j = JSON.parse(enrichedJson) as Record<string, unknown>
      const gloss = typeof j.englishGloss === 'string' ? j.englishGloss.trim() : ''
      const lm = typeof j.likelyMeaning === 'string' ? j.likelyMeaning.trim() : ''
      const notes = typeof j.enrichmentNotes === 'string' ? j.enrichmentNotes.trim().slice(0, 220) : ''
      shortExplanationEn = gloss || lm || notes || null
      const canon = typeof j.dutchCanonical === 'string' ? j.dutchCanonical.trim() : ''
      if (canon.length > 2) anchorPhraseNl = canon.slice(0, 220)
      const tags = Array.isArray(j.tags) ? (j.tags as unknown[]).filter((x): x is string => typeof x === 'string') : []
      for (const t of tags) {
        const s = t.trim()
        if (s && !keyVocabOrTags.includes(s)) keyVocabOrTags.push(s)
      }
    } catch {
      /* ignore */
    }
  }
  const where = bodySecondary?.trim()
  if (!shortExplanationEn && where) shortExplanationEn = `Your note: ${where.slice(0, 200)}`
  if (!anchorPhraseNl && p) anchorPhraseNl = p.slice(0, 160)

  return {
    shortExplanationEn,
    keyVocabOrTags: keyVocabOrTags.slice(0, 8),
    anchorPhraseNl: anchorPhraseNl || p.slice(0, 160),
  }
}

export type StrugglePracticeHints = {
  likelyIssueEn: string | null
}

export function extractStrugglePracticeHints(
  enrichedJson: string | null | undefined,
  primary: string,
): StrugglePracticeHints {
  let likelyIssueEn: string | null = null
  const signals: string[] = []
  if (enrichedJson?.trim()) {
    try {
      const j = JSON.parse(enrichedJson) as Record<string, unknown>
      const ss = Array.isArray(j.struggleSignals)
        ? (j.struggleSignals as unknown[]).filter((x): x is string => typeof x === 'string')
        : []
      for (const s of ss) {
        const t = s.trim()
        if (t) signals.push(t)
      }
      const lm = typeof j.likelyMeaning === 'string' ? j.likelyMeaning.trim() : ''
      if (lm) likelyIssueEn = lm
    } catch {
      /* ignore */
    }
  }
  if (!likelyIssueEn && signals.length) likelyIssueEn = signals.slice(0, 3).join(' · ')
  if (!likelyIssueEn && primary.trim()) likelyIssueEn = 'Something in this moment felt hard to navigate in Dutch.'
  return { likelyIssueEn }
}

export type VoiceNotePracticeHints = {
  transcriptSummaryEn: string | null
  themeOrIssueEn: string | null
  polishedPhraseNl: string | null
  coachSeedNl: string | null
  scenarioSlugGuess: string | null
  scenarioSeedNl: string | null
}

export function extractVoiceNotePracticeHints(
  enrichedJson: string | null | undefined,
  transcript: string | null | undefined,
  primary: string,
): VoiceNotePracticeHints {
  const line =
    (typeof transcript === 'string' && transcript.trim() ? transcript.trim() : primary.trim()).slice(0, 2000) ||
    primary.trim()
  let transcriptSummaryEn: string | null = null
  let themeOrIssueEn: string | null = null
  let polishedPhraseNl: string | null = null
  let coachSeedNl: string | null = null
  let scenarioSlugGuess: string | null = null
  let scenarioSeedNl: string | null = null

  if (enrichedJson?.trim()) {
    try {
      const j = JSON.parse(enrichedJson) as Record<string, unknown>
      const scen = typeof j.likelyScenario === 'string' ? j.likelyScenario.trim() : ''
      const place = typeof j.likelyPlaceType === 'string' ? j.likelyPlaceType.trim() : ''
      const bits = [scen, place].filter(Boolean)
      if (bits.length) themeOrIssueEn = bits.join(' · ')

      const vna = j.voiceNoteAnalysis as Record<string, unknown> | undefined
      if (vna && typeof vna === 'object') {
        const cs = typeof vna.contextSummaryEn === 'string' ? vna.contextSummaryEn.trim() : ''
        if (cs) transcriptSummaryEn = cs
      }

      const vps = j.voicePracticeSurface as Record<string, unknown> | undefined
      if (vps && typeof vps === 'object') {
        const pol = typeof vps.polishedDutch === 'string' ? vps.polishedDutch.trim() : ''
        const ph = typeof vps.phrasePracticeNl === 'string' ? vps.phrasePracticeNl.trim() : ''
        const wtn = typeof vps.whatToSayNextNl === 'string' ? vps.whatToSayNextNl.trim() : ''
        const eg = typeof vps.englishGloss === 'string' ? vps.englishGloss.trim() : ''
        const coach = typeof vps.coachDebriefSeed === 'string' ? vps.coachDebriefSeed.trim() : ''
        const slug = typeof vps.miniScenarioSlugGuess === 'string' ? vps.miniScenarioSlugGuess.trim() : ''
        const seed = typeof vps.miniScenarioSeedNl === 'string' ? vps.miniScenarioSeedNl.trim() : ''
        polishedPhraseNl = pol || ph || wtn || line.slice(0, 220) || null
        if (eg && !transcriptSummaryEn) transcriptSummaryEn = eg
        coachSeedNl = coach || null
        scenarioSlugGuess = slug || null
        scenarioSeedNl = seed || null
      }
    } catch {
      /* ignore */
    }
  }

  if (!polishedPhraseNl && line) polishedPhraseNl = line.slice(0, 220)
  if (!transcriptSummaryEn && themeOrIssueEn) transcriptSummaryEn = themeOrIssueEn

  return {
    transcriptSummaryEn,
    themeOrIssueEn,
    polishedPhraseNl,
    coachSeedNl,
    scenarioSlugGuess,
    scenarioSeedNl,
  }
}

export function buildPhraseExercisePrompt(phrase: string, exampleLinesNl: string[]): string {
  const p = phrase.trim()
  const ex =
    exampleLinesNl.length > 0
      ? `\n\nNatuurlijke voorbeelden — lees ze stil, zeg ze daarna hardop:\n${exampleLinesNl.map((l) => `– ${l}`).join('\n')}`
      : ''
  return (
    `Kernfrase: “${p.slice(0, 200)}${p.length > 200 ? '…' : ''}”.${ex}\n\n` +
    `1) Betekenis — check of de Engelse gloss klopt met wat jij bedoelde.\n` +
    `2) Gebruik — kies de situatie die het beste past.\n` +
    `3) Uitspraak — zeg de frase twee keer rustig, dan één keer op gesprekstempo.\n` +
    `4) Mini-dialoog — antwoord alsof je echt in die situatie zit.`
  )
}

export function buildReadAloudPassageForPhrase(
  phrase: string,
  exampleLinesNl: string[],
  usageWhenEn: string | null,
): string {
  const p = phrase.trim()
  const ex = exampleLinesNl.slice(0, 2).join(' ')
  const ctx = usageWhenEn?.trim() ? ` Situatie: ${usageWhenEn.trim()}.` : ''
  let body = `Je oefent deze frase uit je dag: “${p}”. ${ex}${ctx}\n\n`
  body +=
    `Lees de frase hardop, tel tot twee, lees opnieuw met iets meer intonatie. ` +
    `Sluit af met één eigen zin waarin je dezelfde frase opnieuw gebruikt — net iets andere woorden eromheen.`
  if (body.length < 72) {
    body += `\n\nExtra: spreek de frase opgedeeld in kleine brokken, en plak ze daarna weer aan elkaar.`
  }
  return body.slice(0, 1100)
}

export function buildPhraseListeningBurstText(phrase: string, exampleLinesNl: string[]): string {
  const p = phrase.trim()
  return (exampleLinesNl[0] ?? `Even oefenen: “${p}” — zo zeg je het straks ook.`).slice(0, 400)
}

export function buildStruggleReadAloudPassage(situation: string, correctedNl: string): string {
  const s = situation.trim().slice(0, 420)
  const c = correctedNl.trim().slice(0, 220)
  return (
    `Wat er speelde:\n${s}\n\n` +
    `Kalme lijn om te onthouden:\n“${c}”\n\n` +
    `Lees beide blokken één keer stil, daarna hardop de kalme lijn drie keer — steeds iets zekerder.`
  ).slice(0, 900)
}
