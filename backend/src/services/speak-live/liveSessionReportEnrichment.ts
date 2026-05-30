/**
 * Evidence-based report enrichment: conservative score display, wrong-token hints,
 * compare coaching copy, and sentence-card coaching fields. Does not touch audio URLs or playback.
 */

import type { ConfidenceLevel, ScoredDimension } from './liveVoiceEvaluationTypes'
import type { ImprovementAction, TurnEvaluation, TurnLanguageEvaluation, WrongWordDetection } from './liveVoiceEvaluationTypes'
import type { NormalizedWordAssessment } from '../speech/pronunciationAssessmentContracts'
import type { TimingAnalysis } from '../../domain/speaking-assessment/speakingAssessmentCanonical'
import { maybeStripCrossPhraseWordPairs } from './liveSessionRecommendationVerifyLlm'
import { filterAssessmentsForPronunciationCopy } from './liveSessionReportWordGrounding'

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

/**
 * Trust-first display score: pulls inflated Azure/LLM numbers toward believable bands.
 * Philosophy: 90+ is exceptional; most learner turns sit 58–84 after evidence.
 */
export function calibrateDisplayScore(
  raw: number,
  kind: 'audio' | 'language' | 'task' | 'blended',
  opts?: { transcriptConfidence?: ConfidenceLevel | null; weakWordCount?: number; rushedEnding?: boolean },
): number {
  if (raw <= 0) return raw
  const conf = opts?.transcriptConfidence
  const confPenalty = conf === 'low' ? 7 : conf === 'medium' ? 3 : 0
  const weak = Math.min(10, opts?.weakWordCount ?? 0)
  const isAudioish = kind === 'audio' || kind === 'blended'
  const weakPenalty = isAudioish ? weak * 4 + Math.round(weak * 0.5) : Math.round(weak * 1.8)
  const rush = isAudioish && opts?.rushedEnding ? 7 : 0

  let x = raw
  const isLang = kind === 'language' || kind === 'task'
  const firstK = kind === 'task' ? 0.14 : kind === 'blended' ? 0.22 : isLang ? 0.18 : 0.24
  const secondK = kind === 'task' ? 0.1 : kind === 'blended' ? 0.16 : isLang ? 0.14 : 0.18
  x -= Math.max(0, x - 62) * firstK
  x -= Math.max(0, x - 82) * secondK
  x -= confPenalty + weakPenalty + rush

  // Global trust curve: compress the “everything is high 80s” plateau
  if (x > 72) {
    x = 72 + (x - 72) * 0.78
  }
  if (x > 84) {
    x = 84 + (x - 84) * 0.62
  }
  if (x > 91) {
    x = 91 + (x - 91) * 0.42
  }

  return clamp100(x)
}

/** Verdict labels aligned with UI bands (Strong / Solid / Developing / Needs focus). */
export function verdictForDisplayScore(score: number | null): string {
  if (score == null) return ''
  if (score >= 87) return 'Strong'
  if (score >= 72) return 'Solid'
  if (score >= 56) return 'Developing'
  return 'Needs focus'
}

function stripToken(t: string): string {
  return t
    .toLowerCase()
    .replace(/^[«»""'„‚'`]+|[«»""'„‚'`.,?!;:…]+$/g, '')
    .trim()
}

function normalizeSurfaceText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[«»""'„‚'`.,?!;:…]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function sameSurface(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalizeSurfaceText(a ?? '') === normalizeSurfaceText(b ?? '')
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** True if observedToken appears in the learner utterance (word-boundary; multi-word uses substring). */
export function wrongWordObservedAppearsInLearnerLine(learnerTranscript: string, d: WrongWordDetection): boolean {
  const L = (learnerTranscript ?? '').trim()
  if (!L) return false
  const obs = (d.observedToken ?? '').trim()
  if (!obs) return false
  if (/\s/.test(obs)) {
    return L.toLowerCase().includes(obs.toLowerCase())
  }
  try {
    return new RegExp(`\\b${escapeRegExp(obs)}\\b`, 'iu').test(L)
  } catch {
    return false
  }
}

/**
 * Drop wrong-word rows whose observedToken does not appear in the learner line.
 * Stops incoherent UI ("use X instead of Y" when Y was never said) from LLM or mis-aligned reference diffing.
 */
export function filterWrongWordDetectionsGroundedInLearner(
  learnerTranscript: string | null | undefined,
  dets: WrongWordDetection[],
): WrongWordDetection[] {
  if (!dets.length) return dets
  const L = (learnerTranscript ?? '').trim()
  if (!L) return dets
  return dets.filter((d) => wrongWordObservedAppearsInLearnerLine(L, d))
}

/**
 * Best learner-facing Dutch line for this turn (coach rewrite beats raw reference when both exist).
 */
export function canonicalLearnerDutchLine(turn: TurnEvaluation): string {
  return (
    turn.languageEvaluation?.improvedVersion?.trim() ||
    turn.naturalRewrite?.improved?.trim() ||
    turn.referenceSentence?.trim() ||
    ''
  )
}

export function applySingleWrongWordSwapLine(learner: string, w: WrongWordDetection): string {
  const trimmed = learner.trim()
  if (!trimmed) return trimmed
  const re = new RegExp(`\\b${escapeRegExp(w.observedToken)}\\b`, 'i')
  if (!re.test(trimmed)) return trimmed
  return trimmed.replace(re, w.suggestedCorrection)
}

/** True when replacing the flagged token once yields the same surface as the canonical line. */
export function singleWrongWordSwapMatchesCanonical(
  learner: string,
  w: WrongWordDetection,
  canonical: string,
): boolean {
  const c = canonical.trim()
  if (!c) return false
  const swapped = applySingleWrongWordSwapLine(learner, w).replace(/\s+/g, ' ').trim()
  return sameSurface(swapped, c)
}

type DeterministicLanguageRepair = {
  wrongDetections: WrongWordDetection[]
  grammarIssues: string[]
  sentenceStructureIssues: string[]
  improvedVersion: string | null
  whyItIsBetter: string
  whyThisIsMoreNatural: string
  learnerFacingGrammarLine: string
  nextPatternToPractice: string
  referenceSentenceReason: string
  referenceKind: 'reference_pronunciation' | 'more_natural_dutch'
  naturalnessCap?: number
  grammarCap?: number
  structureCap?: number
}

function isOrderingFoodScenario(title?: string | null, slug?: string | null): boolean {
  const s = (slug ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (s === 'ordering_food') return true
  const t = (title ?? '').toLowerCase()
  return (t.includes('ordering') && (t.includes('food') || t.includes('drink'))) || /\bfood\s*\/\s*drinks?\b/.test(t)
}

function isSmallTalkScenario(title?: string | null, slug?: string | null): boolean {
  const s = (slug ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (s === 'small_talk') return true
  const t = (title ?? '').toLowerCase()
  return t.includes('small talk')
}

/** "Wat was je weekend" is a common model/ASR mistake for the standard opener "Hoe was je weekend?" */
function replaceWatWasWeekendWithHoe(s: string): string {
  return s.replace(/\bWat\s+was\s+je\s+weekend\b/gi, 'Hoe was je weekend')
}

function compactDutchLetters(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
}

function rewriteSuspiciousPublicTransportDestination(
  text: string | null | undefined,
  expectedDestination: string | null | undefined,
): string | undefined {
  const raw = text ?? ''
  const destination = (expectedDestination ?? '').trim()
  if (!raw.trim() || !destination) return undefined

  const expectedCompact = compactDutchLetters(destination)
  if (expectedCompact.length < 5) return undefined

  const next = raw.replace(/\b([A-Za-zÀ-ÿ]{4,}station)\b/gu, (match) => {
    const observedCompact = compactDutchLetters(match)
    if (!observedCompact || observedCompact === expectedCompact) return match
    // Only repair station-like compounds that are not the scene destination.
    return destination
  })

  return next === raw ? undefined : next
}

/**
 * Public-transport reports already know the scenario destination. Use that context to
 * avoid preserving ASR-looking station compounds in learner-facing recommended lines.
 */
export function sanitizePublicTransportDestinationReferences(
  turn: TurnEvaluation,
  expectedDestination: string | null | undefined,
): void {
  const destination = (expectedDestination ?? '').trim()
  if (!destination) return

  const refNext = rewriteSuspiciousPublicTransportDestination(turn.referenceSentence, destination)
  if (refNext !== undefined) turn.referenceSentence = refNext

  if (turn.languageEvaluation?.improvedVersion) {
    const iv = rewriteSuspiciousPublicTransportDestination(turn.languageEvaluation.improvedVersion, destination)
    const le = turn.languageEvaluation
    const patchText = (value: string | undefined): string | undefined =>
      rewriteSuspiciousPublicTransportDestination(value, destination) ?? value
    const patchList = (items: string[] | undefined): string[] | undefined =>
      items?.map((item) => patchText(item) ?? item)

    const nextLanguageEvaluation = {
      ...le,
      improvedVersion: iv ?? le.improvedVersion,
      whyItIsBetter: patchText(le.whyItIsBetter) ?? le.whyItIsBetter,
      whyThisIsMoreNatural: patchText(le.whyThisIsMoreNatural) ?? le.whyThisIsMoreNatural,
      learnerFacingGrammarLine: patchText(le.learnerFacingGrammarLine) ?? le.learnerFacingGrammarLine,
      levelBasedComment: patchText(le.levelBasedComment) ?? le.levelBasedComment,
      nextPatternToPractice: patchText(le.nextPatternToPractice) ?? le.nextPatternToPractice,
      grammarIssues: patchList(le.grammarIssues) ?? le.grammarIssues,
      sentenceStructureIssues: patchList(le.sentenceStructureIssues) ?? le.sentenceStructureIssues,
      wordOrderNotes: patchList(le.wordOrderNotes) ?? le.wordOrderNotes,
      questionFormNotes: patchList(le.questionFormNotes) ?? le.questionFormNotes,
      verbTenseNotes: patchList(le.verbTenseNotes) ?? le.verbTenseNotes,
      agreementNotes: patchList(le.agreementNotes) ?? le.agreementNotes,
    }
    turn.languageEvaluation = nextLanguageEvaluation
  }

  if (turn.naturalRewrite?.improved) {
    const nw = rewriteSuspiciousPublicTransportDestination(turn.naturalRewrite.improved, destination)
    if (nw !== undefined) {
      turn.naturalRewrite = { ...turn.naturalRewrite, improved: nw }
    }
  }
}

/**
 * Fix coaching copy that used "wat" instead of "hoe" for the weekend check-in (small_talk).
 * Runs even when the live coaching LLM succeeded, so mis-scored references do not propagate.
 */
export function sanitizeSmallTalkWeekendHowReferences(turn: TurnEvaluation, scenarioSlug?: string | null): void {
  if (!isSmallTalkScenario(null, scenarioSlug)) return

  const maybeFix = (s: string | null | undefined): string | undefined => {
    if (!s?.trim()) return undefined
    const next = replaceWatWasWeekendWithHoe(s)
    return next === s ? undefined : next
  }

  const refNext = maybeFix(turn.referenceSentence)
  if (refNext !== undefined) turn.referenceSentence = refNext

  if (turn.languageEvaluation?.improvedVersion) {
    const iv = maybeFix(turn.languageEvaluation.improvedVersion)
    if (iv !== undefined) {
      turn.languageEvaluation = { ...turn.languageEvaluation, improvedVersion: iv }
    }
  }
  if (turn.naturalRewrite?.improved) {
    const nw = maybeFix(turn.naturalRewrite.improved)
    if (nw !== undefined) {
      turn.naturalRewrite = { ...turn.naturalRewrite, improved: nw }
    }
  }
}

/** STT often writes "We was" or models suggest "Wat was" for Dutch "Hoe was je weekend?" */
function inferSmallTalkWeekendHowRepair(transcript: string): DeterministicLanguageRepair | null {
  const raw = transcript.trim()
  if (!raw) return null
  if (!/\b(we|wat)\s+was\s+je\s+weekend\b/i.test(raw)) return null
  if (/\bhoe\s+was\s+je\s+weekend\b/i.test(raw)) return null

  const improved = raw.replace(/\b(we|wat)\s+was\s+je\s+weekend\b/gi, 'Hoe was je weekend')
  if (improved === raw) return null

  const observedToken = (raw.match(/\b(we|wat)\s+was\b/i)?.[1] ?? 'We').trim()

  return {
    wrongDetections: [
      {
        observedToken,
        classification: 'likely_misrecognition',
        suggestedCorrection: 'Hoe',
        whyItMatters:
          'Dutch asks “Hoe was je weekend?” (how). “We was…” is usually “hoe” misheard; “Wat was…” would read as “what”, not the usual weekend opener.',
        severity: 'high',
        uncertainHearing: true,
      },
    ],
    grammarIssues: ['Use “hoe” when you mean how — “Hoe was je weekend?” is the natural weekend check-in.'],
    sentenceStructureIssues: [],
    improvedVersion: improved,
    whyItIsBetter:
      'This keeps your small-talk flow, but uses the standard Dutch question people expect after a quick “het gaat goed”.',
    whyThisIsMoreNatural:
      '“Hoe was je weekend?” is the high-frequency casual opener; “wat was…” is the wrong question word for this moment.',
    learnerFacingGrammarLine:
      'Swap the question word to “hoe” here — it matches what Dutch speakers ask in weekend small talk.',
    nextPatternToPractice: 'Weekend check-ins: “Hoe was je weekend?” / “Wat heb je gedaan?”',
    referenceSentenceReason: 'Natural Dutch weekend question (how, not what).',
    referenceKind: 'more_natural_dutch',
    naturalnessCap: 72,
    grammarCap: 70,
    structureCap: 72,
  }
}

/**
 * Common Speak Live STT confusions in Dutch café lines — infer intent and give a natural target line.
 * (e.g. "gruttenkoffie" → grote koffie, "harde/harder melk" → havermelk, "Hepté …" → Hebt u …)
 */
function inferOrderingFoodAsrRepair(transcript: string): DeterministicLanguageRepair | null {
  const raw = transcript.trim()
  const lower = raw.toLowerCase()
  if (!raw) return null

  const baseWhyAsr =
    'Speech recognition often blurs similar Dutch sounds; the line below is what you were most likely trying to say in a café order.'

  // "Een gruttenkoffie …" / grotte koffie → grote koffie
  if (/\b(gruttenkoffie|grutten\s+koffie|grotte\s+koffie)\b/i.test(lower)) {
    const observed = raw.match(/\b(gruttenkoffie|grutten\s+koffie|grotte\s+koffie)\b/i)?.[0] ?? 'gruttenkoffie'
    const fixed = raw
      .replace(/\bgruttenkoffie\b/gi, 'grote koffie')
      .replace(/\bgrutten\s+koffie\b/gi, 'grote koffie')
      .replace(/\bgrotte\s+koffie\b/gi, 'grote koffie')
      .replace(/\bEen\s+een\s+grote\b/gi, 'Een grote')
    return {
      wrongDetections: [
        {
          observedToken: observed.replace(/\s+/g, ' ').trim(),
          classification: 'likely_misrecognition',
          suggestedCorrection: 'grote koffie',
          whyItMatters:
            '“Gruttenkoffie” is not Dutch — it is very often “grote koffie” (a large coffee) misheard as one word.',
          severity: 'high',
          uncertainHearing: true,
        },
      ],
      grammarIssues: ['Likely intent: a large coffee (“een grote koffie”), not a nonsense compound in the transcript.'],
      sentenceStructureIssues: [],
      improvedVersion: fixed.trim(),
      whyItIsBetter: 'This keeps your politeness and order, but uses the standard Dutch phrase for a large coffee.',
      whyThisIsMoreNatural: `${baseWhyAsr} Staff hear “een grote koffie” hundreds of times a day.`,
      learnerFacingGrammarLine:
        'Your idea was clear; the transcript mangled “grote koffie”. Try the corrected line slowly, then at café speed.',
      nextPatternToPractice: 'Size + drink: “een kleine / grote koffie”',
      referenceSentenceReason: 'Natural Dutch for ordering a large coffee after an ASR-merge mishear.',
      referenceKind: 'more_natural_dutch',
      naturalnessCap: 62,
      grammarCap: 58,
      structureCap: 62,
    }
  }

  // "Hepté harde melk" etc. → Hebt u havermelk?  (avoid \\b on tokens with accents — JS word chars are ASCII-only)
  if (/hept[eé]\s+(harde|harder)\s+melk\b/i.test(lower)) {
    return {
      wrongDetections: [
        {
          observedToken: raw.match(/hept[eé]+/i)?.[0] ?? 'Hepté',
          classification: 'likely_misrecognition',
          suggestedCorrection: 'Hebt u',
          whyItMatters: '“Hepté” is not Dutch — it commonly comes from “Hebt u” in fast café speech.',
          severity: 'high',
          uncertainHearing: true,
        },
        {
          observedToken: raw.match(/\b(harde|harder)\s+melk\b/i)?.[0] ?? 'harde melk',
          classification: 'likely_misrecognition',
          suggestedCorrection: 'havermelk',
          whyItMatters:
            '“Harde melk” / “harder melk” is not idiomatic; next to a drink order it is very often “havermelk” (oat milk).',
          severity: 'high',
          uncertainHearing: true,
        },
      ],
      grammarIssues: ['Likely intent: asking whether they have oat milk (“Hebt u havermelk?”).'],
      sentenceStructureIssues: [],
      improvedVersion: 'Hebt u havermelk?',
      whyItIsBetter: 'This is the compact, natural way to check for oat milk before you order your drink.',
      whyThisIsMoreNatural: `${baseWhyAsr} Dutch staff expect “havermelk”, not “harde melk”.`,
      learnerFacingGrammarLine:
        'The transcript looks like two recognition slips (“Hebt u” and “havermelk”); practise the corrected question.',
      nextPatternToPractice: 'Short stock check: “Hebt u … ?” + ingredient noun',
      referenceSentenceReason: 'Likely intended question about oat milk availability.',
      referenceKind: 'more_natural_dutch',
      naturalnessCap: 64,
      grammarCap: 60,
      structureCap: 66,
    }
  }

  // "Mag ik harder/harde melk … koffie"
  if (/\bmag\s+ik\s+(harde|harder)\s+melk\b/i.test(lower)) {
    let fixed = raw.replace(/\b(harde|harder)\s+melk\b/gi, 'havermelk')
    fixed = fixed.replace(/\bmet\s+mij\s+koffie\b/gi, 'met mijn koffie')
    return {
      wrongDetections: [
        {
          observedToken: raw.match(/\b(harde|harder)\s+melk\b/i)?.[0] ?? 'harder melk',
          classification: 'likely_misrecognition',
          suggestedCorrection: 'havermelk',
          whyItMatters:
            '“Harder melk” / “harde melk” is not natural Dutch in a coffee order — “havermelk” (oat milk) is the usual target.',
          severity: 'high',
          uncertainHearing: true,
        },
      ],
      grammarIssues: ['Likely intent: asking to have oat milk with your coffee.'],
      sentenceStructureIssues: [],
      improvedVersion: fixed.trim(),
      whyItIsBetter: 'This keeps your request structure but swaps in the word Dutch speakers actually use for oat milk.',
      whyThisIsMoreNatural: `${baseWhyAsr} “Havermelk” sounds close to “harder melk” for many ASR engines.`,
      learnerFacingGrammarLine:
        'You were probably saying “havermelk”; the report line shows a natural way to phrase it with your coffee.',
      nextPatternToPractice: 'Dietary add-ons: “met havermelk”, “zonder suiker”',
      referenceSentenceReason: 'Natural Dutch for oat milk + coffee after ASR confusion.',
      referenceKind: 'more_natural_dutch',
      naturalnessCap: 64,
      grammarCap: 60,
      structureCap: 64,
    }
  }

  // "Hebt u harde melk?" (no mangled "Hepté")
  if (/\bhebt\s+u\b/i.test(lower) && /\b(harde|harder)\s+melk\b/i.test(lower) && !/havermelk/i.test(lower)) {
    const fixed = raw.replace(/\b(harde|harder)\s+melk\b/gi, 'havermelk')
    return {
      wrongDetections: [
        {
          observedToken: raw.match(/\b(harde|harder)\s+melk\b/i)?.[0] ?? 'harde melk',
          classification: 'likely_misrecognition',
          suggestedCorrection: 'havermelk',
          whyItMatters: 'In a café, “harde melk” is almost always a mishearing of “havermelk”.',
          severity: 'high',
          uncertainHearing: true,
        },
      ],
      grammarIssues: ['Likely intent: “Hebt u havermelk?”'],
      sentenceStructureIssues: [],
      improvedVersion: fixed.trim(),
      whyItIsBetter: 'Same question form you used, with the word Dutch speakers expect for oat milk.',
      whyThisIsMoreNatural: baseWhyAsr,
      learnerFacingGrammarLine: 'Swap “harde melk” for “havermelk” — that is the word you were aiming for.',
      nextPatternToPractice: 'Stock questions: “Hebt u lactosevrije / sojamelk?”',
      referenceSentenceReason: 'Corrected likely target for oat-milk availability question.',
      referenceKind: 'more_natural_dutch',
      naturalnessCap: 66,
      grammarCap: 62,
      structureCap: 66,
    }
  }

  // Any other café line with “harde/harder melk” but no “havermelk” yet (e.g. “Ik wil harder melk …”)
  if (/\b(harde|harder)\s+melk\b/i.test(lower) && !/havermelk/i.test(lower)) {
    const observed = raw.match(/\b(harde|harder)\s+melk\b/i)?.[0] ?? 'harder melk'
    const fixed = raw.replace(/\b(harde|harder)\s+melk\b/gi, 'havermelk')
    return {
      wrongDetections: [
        {
          observedToken: observed.replace(/\s+/g, ' ').trim(),
          classification: 'likely_misrecognition',
          suggestedCorrection: 'havermelk',
          whyItMatters:
            'In drink orders, “harde melk” / “harder melk” is very often “havermelk” (oat milk) misheard by speech recognition.',
          severity: 'high',
          uncertainHearing: true,
        },
      ],
      grammarIssues: ['Likely intent: oat milk (“havermelk”) — the transcript may have misheard that word.'],
      sentenceStructureIssues: [],
      improvedVersion: fixed.trim(),
      whyItIsBetter: 'This keeps your sentence shape but swaps in the word Dutch speakers use for oat milk.',
      whyThisIsMoreNatural: `${baseWhyAsr} “Haver-” and “harder” sound similar in fast speech.`,
      learnerFacingGrammarLine:
        'If you meant oat milk, say “havermelk”; if the transcript shows “harder melk”, treat it as a recognition slip.',
      nextPatternToPractice: 'Add-ons: “met havermelk”, “halfvolle melk”',
      referenceSentenceReason: 'Likely oat-milk wording after harde/harder melk in the transcript.',
      referenceKind: 'more_natural_dutch',
      naturalnessCap: 64,
      grammarCap: 60,
      structureCap: 64,
    }
  }

  return null
}

function scenarioPartnerLabel(scenarioTitle: string | null | undefined): string {
  const title = (scenarioTitle ?? '').trim().toLowerCase()
  if (!title) return 'the other person'
  if (title.includes('train') || title.includes('station') || title.includes('rail')) return 'station staff'
  if (title.includes('hotel') || title.includes('check-in') || title.includes('reception')) return 'reception staff'
  if (title.includes('restaurant') || title.includes('cafe') || title.includes('coffee') || title.includes('order food')) return 'the server'
  if (title.includes('doctor') || title.includes('pharmacy') || title.includes('medical')) return 'the doctor'
  if (title.includes('interview') || title.includes('job')) return 'the interviewer'
  if (title.includes('shop') || title.includes('store') || title.includes('supermarket')) return 'shop staff'
  if (title.includes('taxi') || title.includes('airport') || title.includes('flight')) return 'the driver'
  return 'the other person'
}

function adaptScenarioCopy(text: string, scenarioTitle: string | null | undefined): string {
  const raw = text.trim()
  if (!raw) return raw

  const partner = scenarioPartnerLabel(scenarioTitle)
  const isTrain = partner === 'station staff'

  let next = raw
    .replace(/\bthe assistant\b/gi, partner)
    .replace(/\bassistant\b/gi, partner)
    .replace(/\bservice staff\b/gi, partner)

  if (isTrain) {
    next = next
      .replace(/directly engages with station staff about your travel needs\.?/i, 'directly asks station staff about your train question.')
      .replace(/about your travel needs\.?/i, 'about your train question.')
      .replace(/\bstaff\b/gi, 'station staff')
      .replace(/after getting help/gi, 'after speaking to station staff')
      .replace(/in this situation/gi, 'at the station')
      .replace(/\bstation station staff\b/gi, 'station staff')
  }

  return next
}

const DUTCH_VERB_HINTS = new Set([
  'ben', 'bent', 'is', 'zijn', 'heb', 'hebt', 'heeft', 'hebben',
  'ga', 'gaat', 'gaan', 'kom', 'komt', 'komen',
  'vertrek', 'vertrekt', 'vertrekken', 'vraag', 'vraagt', 'vragen',
  'wil', 'wilt', 'willen', 'kan', 'kunt', 'kunnen', 'moet', 'moeten',
  'zou', 'zult', 'zullen', 'rijdt', 'rijden',
])

function toLearnerFriendlyFix(s: string): string {
  const text = s.trim()
  if (!text) return text
  return text
    .replace(/^Incorrect question structure\.?$/i, 'Ask this as one direct question.')
    .replace(/^Missing auxiliary verb for clarity\.?$/i, 'Use the full question form so it sounds complete.')
    .replace(/^This line is a fragment, not a complete Dutch question\.?$/i, 'Turn this fragment into one full Dutch question.')
    .replace(/^Ask the departure time directly instead of describing the question\.?$/i, 'Ask the departure time directly.')
    .replace(/^Not directly related to the scenario\.?$/i, 'This line does not match what the station conversation needed yet.')
    .replace(/^Incorrect word choice(?: with .+)?\.?$/i, 'Use the more natural Dutch word here.')
}

export function inferDeterministicLanguageRepair(
  turn: TurnEvaluation,
  scenarioTitle?: string | null,
  scenarioSlug?: string | null,
  /**
   * When false, skip train/station phrase templates only.
   * Ordering-food ASR repairs (e.g. harder melk → havermelk) still run in ordering scenarios so hints show even when the live coaching LLM succeeded.
   */
  allowScenarioSpecificRepairs = true,
): DeterministicLanguageRepair | null {
  const transcript = (turn.learnerTranscript || turn.transcriptOriginal || '').trim()
  const norm = normalizeSurfaceText(transcript)
  if (!transcript || !norm) return null

  if (norm === 'denk je wel') {
    return {
      wrongDetections: [{
        observedToken: 'denk',
        classification: 'wrong_word_choice',
        suggestedCorrection: 'dank',
        whyItMatters: 'Use “Dank je wel” to thank someone. “Denk je wel” changes the meaning and does not work as a polite closing.',
        severity: 'high',
      }],
      grammarIssues: ['Say “Dank je wel” here, not “Denk je wel”.'],
      sentenceStructureIssues: [],
      improvedVersion: 'Dank je wel.',
      whyItIsBetter: 'Dutch uses “Dank je wel” as the natural thank-you phrase in this moment.',
      whyThisIsMoreNatural: '“Dank je wel” is the standard Dutch closing after getting help; “Denk je wel” is the wrong word and sounds off immediately.',
      learnerFacingGrammarLine: 'This is a word-choice mistake, not a pronunciation issue: use “Dank je wel”.',
      nextPatternToPractice: 'Common service closings: “Dank u wel” / “Dank je wel”',
      referenceSentenceReason: 'Corrected Dutch thank-you phrase for this service closing.',
      referenceKind: 'more_natural_dutch',
      naturalnessCap: 35,
      grammarCap: 42,
      structureCap: 48,
    }
  }

  if (isOrderingFoodScenario(scenarioTitle, scenarioSlug)) {
    const cafeRepair = inferOrderingFoodAsrRepair(transcript)
    if (cafeRepair) return cafeRepair
  }

  if (isSmallTalkScenario(scenarioTitle, scenarioSlug)) {
    const weekendHow = inferSmallTalkWeekendHowRepair(transcript)
    if (weekendHow) return weekendHow
  }

  if (!allowScenarioSpecificRepairs) {
    return null
  }

  const departureMatch = /^ik vraag jou wat de tijd naar ([a-zà-ÿ' -]+)$/i.exec(transcript.replace(/[?.!,;:…]+$/g, '').trim())
  if (departureMatch) {
    const destination = departureMatch[1].trim()
    return {
      wrongDetections: [],
      grammarIssues: [],
      sentenceStructureIssues: ['Ask the departure time directly.'],
      improvedVersion: `Hoe laat vertrekt de trein naar ${destination}?`,
      whyItIsBetter: 'A Dutch speaker asks the departure time directly here instead of saying “I ask you what the time is”.',
      whyThisIsMoreNatural: 'The corrected version uses a normal station-question structure that staff can answer immediately.',
      learnerFacingGrammarLine: 'Clearer Dutch here is one direct question: ask the departure time directly.',
      nextPatternToPractice: 'Direct question form for departure times',
      referenceSentenceReason: 'Natural Dutch question form for asking departure time.',
      referenceKind: 'more_natural_dutch',
      naturalnessCap: 52,
      grammarCap: 54,
      structureCap: 48,
    }
  }

  const tokens = tokenizeForAlignment(transcript)
  const hasStation = tokens.includes('station')
  const hasVerb = tokens.some((t) => DUTCH_VERB_HINTS.has(t))
  if (hasStation && tokens.length <= 4 && !hasVerb) {
    const middle = tokens[1]
    const wrongDetections: WrongWordDetection[] =
      middle && middle !== 'welk'
        ? [{
            observedToken: middle,
            classification: 'likely_misrecognition',
            suggestedCorrection: 'welk',
            whyItMatters: 'To ask about the station clearly here, Dutch needs “welk” in a full question, not this loose fragment.',
            severity: 'medium',
            uncertainHearing: true,
          }]
        : []
    return {
      wrongDetections,
      grammarIssues: [],
      sentenceStructureIssues: ['Turn this fragment into one full Dutch question.'],
      improvedVersion: 'Van welk station vertrekt de trein?',
      whyItIsBetter: 'The corrected version is a full Dutch station question instead of a loose word fragment.',
      whyThisIsMoreNatural: 'Dutch service staff expect one complete question here; the fragment is too broken to answer naturally.',
      learnerFacingGrammarLine: 'Build a full station question first; then work on the pronunciation inside it.',
      nextPatternToPractice: 'Full question form with “van welk … ?”',
      referenceSentenceReason: 'Complete Dutch station question replacing the fragment.',
      referenceKind: 'more_natural_dutch',
      naturalnessCap: 40,
      grammarCap: 44,
      structureCap: 32,
    }
  }

  return null
}

export function applyDeterministicLanguageRepair(
  turn: TurnEvaluation,
  repair: DeterministicLanguageRepair,
): void {
  const le: TurnLanguageEvaluation = turn.languageEvaluation ?? {
    grammarScore: clamp100(turn.languageScores.grammaticalStability),
    sentenceConstructionScore: clamp100((turn.languageScores.grammaticalStability + turn.languageScores.contextualFit) / 2),
    naturalnessScore: clamp100(turn.languageScores.naturalness),
    levelFitScore: clamp100(turn.languageScores.registerFit),
    whatWorked: [],
    grammarIssues: [],
    sentenceStructureIssues: [],
    improvedVersion: turn.learnerTranscript,
    whyItIsBetter: '',
    levelBasedComment: '',
  }

  const pushUnique = (arr: string[], value: string) => {
    const v = value.trim()
    if (!v) return
    if (!arr.some((x) => normalizeSurfaceText(x) === normalizeSurfaceText(v))) arr.unshift(v)
  }

  for (const issue of repair.grammarIssues) pushUnique(le.grammarIssues, toLearnerFriendlyFix(issue))
  for (const issue of repair.sentenceStructureIssues) pushUnique(le.sentenceStructureIssues, toLearnerFriendlyFix(issue))

  if (repair.improvedVersion && (!le.improvedVersion.trim() || sameSurface(le.improvedVersion, turn.learnerTranscript))) {
    le.improvedVersion = repair.improvedVersion
  }
  if (!le.whyItIsBetter.trim() || sameSurface(le.improvedVersion, turn.learnerTranscript)) {
    le.whyItIsBetter = repair.whyItIsBetter
  }
  le.whyThisIsMoreNatural = repair.whyThisIsMoreNatural
  le.learnerFacingGrammarLine = repair.learnerFacingGrammarLine
  le.nextPatternToPractice = repair.nextPatternToPractice

  if (typeof repair.naturalnessCap === 'number') {
    le.naturalnessScore = Math.min(le.naturalnessScore, repair.naturalnessCap)
    turn.languageScores.naturalness = Math.min(turn.languageScores.naturalness, repair.naturalnessCap)
    turn.languageScores.contextualFit = Math.min(turn.languageScores.contextualFit, repair.naturalnessCap + 2)
  }
  if (typeof repair.grammarCap === 'number') {
    le.grammarScore = Math.min(le.grammarScore, repair.grammarCap)
    turn.languageScores.grammaticalStability = Math.min(turn.languageScores.grammaticalStability, repair.grammarCap)
  }
  if (typeof repair.structureCap === 'number') {
    le.sentenceConstructionScore = Math.min(le.sentenceConstructionScore, repair.structureCap)
  }

  if (repair.improvedVersion) {
    turn.referenceSentence = repair.improvedVersion
    turn.referenceKind = repair.referenceKind
    turn.referenceSentenceReason = repair.referenceSentenceReason
  }

  turn.languageEvaluation = le
}

export function tokenizeForAlignment(s: string): string[] {
  return s
    .split(/\s+/)
    .map(stripToken)
    .filter(Boolean)
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

const SKIP_WORDS = new Set([
  'de',
  'het',
  'een',
  'te',
  'en',
  'of',
  'maar',
  'naar',
  'van',
  'op',
  'in',
  'aan',
  'bij',
  'met',
  'voor',
  'is',
  'er',
  'ik',
  'u',
  'je',
  'hij',
  'ze',
  'we',
  'mijn',
  'uw',
  'dit',
  'dat',
])

/**
 * Align learner vs reference tokens and flag likely wrong/misheard words.
 */
export function detectWrongWordsFromReference(
  learnerTranscript: string,
  referenceSentence: string,
  transcriptConfidence: ConfidenceLevel | null,
): WrongWordDetection[] {
  const a = tokenizeForAlignment(learnerTranscript)
  const b = tokenizeForAlignment(referenceSentence)
  if (a.length === 0 || b.length === 0) return []

  const meaningfulA = a.filter((tok) => !SKIP_WORDS.has(tok))
  const meaningfulB = b.filter((tok) => !SKIP_WORDS.has(tok))
  const sharedMeaningful = meaningfulA.filter((tok) => meaningfulB.includes(tok))
  if (
    meaningfulA.length >= 2 &&
    meaningfulB.length >= 2 &&
    sharedMeaningful.length <= 1
  ) {
    // If the learner line and reference barely share any content words,
    // they are probably different scenario intents rather than word-level variants
    // of the same sentence. In that case, do not invent token swaps.
    return []
  }

  const uncertain = transcriptConfidence === 'medium' || transcriptConfidence === 'low'

  const pairs: { lw: string; rw: string }[] = []
  if (a.length === b.length) {
    for (let i = 0; i < a.length; i++) pairs.push({ lw: a[i], rw: b[i] })
  } else {
    // Simple window match: for each learner token, best reference token within ±2 index (scaled)
    const scale = b.length / Math.max(1, a.length)
    for (let i = 0; i < a.length; i++) {
      const j0 = Math.max(0, Math.floor(i * scale) - 2)
      const j1 = Math.min(b.length - 1, Math.ceil(i * scale) + 2)
      let bestJ = Math.min(b.length - 1, Math.round(i * scale))
      let bestD = 999
      for (let j = j0; j <= j1; j++) {
        const d = levenshtein(a[i], b[j])
        if (d < bestD) {
          bestD = d
          bestJ = j
        }
      }
      pairs.push({ lw: a[i], rw: b[bestJ] })
    }
  }

  const out: WrongWordDetection[] = []
  const seen = new Set<string>()

  for (const { lw, rw } of pairs) {
    if (lw === rw) continue
    if (lw.length < 3 || rw.length < 3) continue
    if (SKIP_WORDS.has(lw) && SKIP_WORDS.has(rw)) continue
    const ed = levenshtein(lw, rw)
    if (ed > 3) continue
    if (ed === 0) continue

    const key = lw
    if (seen.has(key)) continue
    seen.add(key)

    const likelySoundAlikes = ed <= 2 && lw.length >= 4 && rw.length >= 4
    const classification: WrongWordDetection['classification'] =
      ed === 1 && likelySoundAlikes && uncertain ? 'likely_misrecognition' : ed <= 2 ? 'wrong_word_choice' : 'misspelling'

    const severity: WrongWordDetection['severity'] =
      ed === 1 && Math.max(lw.length, rw.length) >= 5 ? 'high' : ed === 2 ? 'medium' : 'low'

    const why =
      classification === 'likely_misrecognition'
        ? `In this situation the Dutch target is probably “${rw}”, not “${lw}”.`
        : `“${rw}” is the expected Dutch here — “${lw}” does not match standard wording for this meaning.`

    out.push({
      observedToken: lw,
      classification,
      suggestedCorrection: rw,
      whyItMatters: why,
      severity,
      uncertainHearing: classification === 'likely_misrecognition',
    })
    if (out.length >= 5) break
  }

  return out
}

export function mergeWrongWordDetections(
  llm: WrongWordDetection[] | undefined,
  deterministic: WrongWordDetection[],
): WrongWordDetection[] {
  const out: WrongWordDetection[] = []
  const seen = new Set<string>()
  const push = (d: WrongWordDetection) => {
    const k = `${d.observedToken.toLowerCase()}::${d.suggestedCorrection.toLowerCase()}`
    if (seen.has(k)) return
    seen.add(k)
    out.push(d)
  }
  for (const d of llm ?? []) push(d)
  for (const d of deterministic) push(d)
  return out.slice(0, 8)
}

export function buildCompareListenFor(params: {
  hasAudio: boolean
  weakWords: string[]
  strongWords: string[]
  pronunciationIssueWords: string[]
  rushedEnding: boolean
  referenceSentence: string
  wrongWords: WrongWordDetection[]
  scenarioTitle?: string
  scenarioSlug?: string
}): string[] {
  const lines: string[] = []
  const topWeak = params.weakWords[0]
  const ww = params.wrongWords[0]
  const ordering = isOrderingFoodScenario(params.scenarioTitle, params.scenarioSlug)

  if (ww?.suggestedCorrection) {
    lines.push(
      params.wrongWords.some((w) => w.uncertainHearing)
        ? ordering
          ? `Listen for “${ww.suggestedCorrection}” in the reference — speech recognition often confuses similar café words (for example haver- vs harder- sounds).`
          : `Listen for the intended station word “${ww.suggestedCorrection}” in the reference — it may sound sharper than what was picked up from your mic.`
        : `Notice how the reference lands on “${ww.suggestedCorrection}” — that is the Dutch target in this line.`,
    )
  }
  if (topWeak) {
    lines.push(`Listen for clearer stress and a slightly longer vowel on “${topWeak}”.`)
  }
  if (params.pronunciationIssueWords[0] && params.pronunciationIssueWords[0] !== topWeak) {
    lines.push(`Pay attention to how the native line finishes “${params.pronunciationIssueWords[0]}” — aim for the same consonant clarity.`)
  }
  if (params.rushedEnding) {
    lines.push('Notice the small pause and full length on the final detail in the reference.')
  }
  if (lines.length === 0 && params.hasAudio && params.referenceSentence) {
    lines.push('Listen for overall pacing: the reference keeps an even speed through the whole question.')
  }
  return lines.slice(0, 4)
}

/** Coach copy that flags verbosity / length without always naming a rewrite. */
function coachMentionsLengthTightening(parts: string[]): boolean {
  const blob = parts.join(' ').toLowerCase()
  return /\b(shorter|shorten|phrase length|length could|too long|longer than|longer|long|wordy|verbose|unnecessary|compact|tight|kort|korter|beknopt|bondiger)\b/.test(
    blob,
  )
}

function pickMainLanguageFix(turn: TurnEvaluation, wrong: WrongWordDetection[]): string {
  const canonical = canonicalLearnerDutchLine(turn)
  const learner = turn.learnerTranscript?.trim() ?? ''
  if (wrong[0] && canonical && !sameSurface(canonical, learner)) {
    if (!singleWrongWordSwapMatchesCanonical(learner, wrong[0], canonical)) {
      return `Use this Dutch line: “${canonical}”.`
    }
  }
  if (wrong[0]) {
    const w = wrong[0]
    return `Use “${w.suggestedCorrection}”, not “${w.observedToken}”.`
  }
  const le = turn.languageEvaluation
  const g = le?.grammarIssues?.[0] || le?.sentenceStructureIssues?.[0]
  if (g) return toLearnerFriendlyFix(g).slice(0, 120) + (g.length > 120 ? '…' : '')
  const imp = le?.improvedVersion?.trim() ?? ''
  const ref = turn.referenceSentence?.trim() ?? ''
  if (coachMentionsLengthTightening(turn.keyProblems)) {
    const shorter = imp && !sameSurface(imp, learner) ? imp : ref && !sameSurface(ref, learner) ? ref : ''
    if (shorter) return `Prefer this tighter Dutch line: “${shorter}”.`
  }
  const kp = turn.keyProblems.map((s) => s.trim()).find(Boolean)
  if (kp) return toLearnerFriendlyFix(kp).slice(0, 160)
  if (turn.naturalRewrite?.improved && turn.naturalRewrite.improved.trim() !== turn.learnerTranscript.trim()) {
    return 'Polish the phrasing to match the natural Dutch line below.'
  }
  if (ref && learner && !sameSurface(ref, learner)) {
    return `Say “${ref}” — it matches the natural Dutch in the reference for this beat.`
  }
  return 'Keep this wording; focus on delivery confidence.'
}

function pickMainVoiceFix(turn: TurnEvaluation, words: NormalizedWordAssessment[], timing: TimingAnalysis | null): string {
  const hasAudio = turn.signalSources.audioMetrics === 'azure_audio'
  if (!hasAudio) return 'Turn on your mic next time so we can judge pacing and pronunciation on this line.'
  const w = words.filter((x) => x.accuracyScore < 68 && x.word.trim()).sort((a, b) => a.accuracyScore - b.accuracyScore)[0]
  if (w) {
    return `Slow down and open up the vowels on “${w.word.trim()}” — it was the least clear word in this sentence.`
  }
  if (timing?.rushedEnding) {
    const last = words[words.length - 1]?.word?.trim()
    return last
      ? `The final word “${last}” was rushed — let the vowel carry a little longer.`
      : 'The ending sounded compressed — give the last phrase the same time as the opening.'
  }
  const fi = turn.fluencyIssues[0]
  if (fi) return `Smooth the pause in “${fi.segment}” so the phrase moves as one unit.`

  if (words.length > 0) {
    const minScore = Math.min(...words.map((x) => x.accuracyScore))
    if (minScore >= 86) {
      return 'Word-level clarity already looks strong on this clip — keep this same delivery energy.'
    }
  }
  return 'Keep this delivery; refine small stresses to match the reference.'
}

export function buildVoiceDrillInstruction(turn: TurnEvaluation, words: NormalizedWordAssessment[]): string {
  const w = words.filter((x) => x.accuracyScore < 72 && x.word.trim()).sort((a, b) => a.accuracyScore - b.accuracyScore)[0]
  if (w) {
    return `Say “${w.word.trim()}” slowly 5 times, then put it back into the full sentence once.`
  }
  if (turn.chunkingRhythmSuggestion?.trim()) return turn.chunkingRhythmSuggestion.trim()
  return 'Speak the whole line in two chunks with only one small breath between them.'
}

export function buildSentenceGroundedReview(
  turn: TurnEvaluation,
  wrong: WrongWordDetection[],
  words: NormalizedWordAssessment[],
  timing: TimingAnalysis | null,
  scenarioTitle?: string,
  /** When set, voice hints ignore ungrounded ASR tokens (see {@link filterAssessmentsForPronunciationCopy}). */
  wordsForVoiceFix?: NormalizedWordAssessment[],
) {
  const le = turn.languageEvaluation
  const learnerTranscript = turn.learnerTranscript.trim()
  const improved =
    le?.improvedVersion?.trim() ||
    turn.naturalRewrite?.improved?.trim() ||
    turn.referenceSentence?.trim() ||
    ''
  const lengthCoach = coachMentionsLengthTightening(turn.keyProblems)
  const hasMeaningfulLanguageIssue =
    Boolean(wrong[0]) ||
    Boolean(le?.grammarIssues?.length) ||
    Boolean(le?.sentenceStructureIssues?.length) ||
    Boolean(le?.improvedVersion?.trim() && !sameSurface(le.improvedVersion, learnerTranscript)) ||
    Boolean(turn.referenceSentence.trim() && !sameSurface(turn.referenceSentence, learnerTranscript)) ||
    (lengthCoach && Boolean(improved && !sameSurface(improved, learnerTranscript)))
  const nativePhrase =
    hasMeaningfulLanguageIssue && improved && !sameSurface(improved, learnerTranscript)
      ? improved
      : ''

  const whatWorked = (le?.whatWorked?.length ? le.whatWorked : turn.keyStrengths).slice(0, 3).map((s) => s.trim()).filter(Boolean)
  const whatToFix: string[] = []
  if (wrong[0]) {
    const canon = canonicalLearnerDutchLine(turn)
    if (
      canon &&
      !sameSurface(canon, learnerTranscript) &&
      !singleWrongWordSwapMatchesCanonical(learnerTranscript, wrong[0], canon)
    ) {
      whatToFix.push(`The line works better as: “${canon}” (a one-word swap is not enough here).`)
    } else {
      whatToFix.push(`Key word: “${wrong[0].observedToken}” should be “${wrong[0].suggestedCorrection}” in Dutch here.`)
    }
  }
  if (lengthCoach && improved && !sameSurface(improved, learnerTranscript)) {
    whatToFix.push(`Shorter Dutch for the same intent: “${improved}”.`)
  }
  for (const g of le?.grammarIssues ?? []) {
    if (whatToFix.length >= 3) break
    whatToFix.push(g)
  }
  for (const s of le?.sentenceStructureIssues ?? []) {
    if (whatToFix.length >= 3) break
    whatToFix.push(s)
  }

  const whyBetter =
    adaptScenarioCopy(
      (le?.whyThisIsMoreNatural || le?.whyItIsBetter || turn.naturalRewrite?.whyMoreNatural || turn.referenceSentenceReason || '').trim() ||
      'The reference version matches how Dutch speakers ask in this situation.',
      scenarioTitle,
    ) ||
    `The reference version matches how Dutch speakers ask here — clearer for ${scenarioPartnerLabel(scenarioTitle)}.`

  const pattern = le?.nextPatternToPractice?.trim() || turn.transcriptCoaching.patternToReuse || null

  return {
    mainFix: pickMainLanguageFix(turn, wrong),
    mainVoiceFix: pickMainVoiceFix(turn, wordsForVoiceFix ?? words, timing),
    whatWorked: whatWorked.length ? whatWorked : ['Your meaning came through in this scenario.'],
    whatToFix,
    nativePhrase,
    whyBetter,
    pattern,
  }
}

/** Fewer, higher-leverage save actions per sentence */
export function focusImprovementActions(turn: TurnEvaluation): ImprovementAction[] {
  const acts = turn.improvementActions ?? []
  const wrong = turn.wrongWordDetections ?? []
  const hasWrong = wrong.length > 0
  const hasAudio = turn.signalSources.audioMetrics === 'azure_audio'
  const improved = (turn.languageEvaluation?.improvedVersion ?? turn.referenceSentence ?? '').trim()
  const sameAsLearner =
    improved && turn.learnerTranscript.trim() && improved.toLowerCase() === turn.learnerTranscript.trim().toLowerCase()

  const priority: ImprovementAction['type'][] = [
    'save_phrase',
    'save_improved_version',
    'save_pronunciation_word',
    'save_rhythm_drill',
    'sentence_drill',
    'scenario_follow_up',
    'save_natural_phrasing',
    'review_queue',
    'coach_followup',
    'speaking_drill',
  ]

  const out: ImprovementAction[] = []
  const seen = new Set<string>()
  const push = (a: ImprovementAction) => {
    const k = `${a.type}:${(a.targetWord ?? a.targetPhrase ?? a.title).slice(0, 48).toLowerCase()}`
    if (seen.has(k)) return
    seen.add(k)
    out.push(a)
  }

  for (const t of priority) {
    for (const a of acts) {
      if (a.type !== t) continue
      if (t === 'save_natural_phrasing') {
        if (sameAsLearner) continue
        if (hasWrong) continue
      }
      if (t === 'save_pronunciation_word' && !hasAudio) continue
      if (t === 'save_rhythm_drill' && !hasAudio) continue
      push(a)
    }
  }

  if (hasWrong) {
    const corr = wrong[0].suggestedCorrection
    const drillWord = acts.find(
      a => a.type === 'save_pronunciation_word' && (a.targetWord === corr || a.title.toLowerCase().includes(corr.toLowerCase())),
    )
    if (drillWord && !out.some(o => o === drillWord)) out.unshift(drillWord)
  }

  return out.slice(0, 4)
}

export function enrichTurnReportFields(input: {
  turn: TurnEvaluation
  words: NormalizedWordAssessment[]
  timing: TimingAnalysis | null
  llmWrongWords?: WrongWordDetection[]
  scenarioTitle?: string
  scenarioSlug?: string
  publicTransportExpectedDestination?: string | null
  /** When true, the live coaching LLM ran — skip scenario-specific deterministic transcript repairs here. */
  coachingLlmSucceeded?: boolean
  /**
   * When true, wrong-word hints already passed the recommendation verify LLM — do not re-merge
   * `detectWrongWordsFromReference` (it can reintroduce misaligned token swaps).
   */
  skipDeterministicWrongWordsFromReference?: boolean
}): void {
  const {
    turn,
    words,
    timing,
    scenarioTitle,
    scenarioSlug,
    publicTransportExpectedDestination,
    coachingLlmSucceeded,
    skipDeterministicWrongWordsFromReference,
  } = input
  const allowScenarioSpecificRepairs = coachingLlmSucceeded !== true
  const contextualRepair = inferDeterministicLanguageRepair(turn, scenarioTitle, scenarioSlug, allowScenarioSpecificRepairs)
  if (contextualRepair) {
    applyDeterministicLanguageRepair(turn, contextualRepair)
  }
  sanitizeSmallTalkWeekendHowReferences(turn, scenarioSlug)
  sanitizePublicTransportDestinationReferences(turn, publicTransportExpectedDestination)
  const detMerged = maybeStripCrossPhraseWordPairs(
    turn.learnerTranscript,
    mergeWrongWordDetections(
      input.llmWrongWords,
      [
        ...(contextualRepair || skipDeterministicWrongWordsFromReference
          ? []
          : detectWrongWordsFromReference(turn.learnerTranscript, turn.referenceSentence, turn.transcriptConfidence)),
        ...(contextualRepair?.wrongDetections ?? []),
      ],
    ),
  )
  const det = filterWrongWordDetectionsGroundedInLearner(turn.learnerTranscript, detMerged)
  turn.wrongWordDetections = det.length ? det : undefined

  const hasAudio = turn.signalSources.audioMetrics === 'azure_audio'
  const piw = (turn.pronunciationIssues ?? []).map((p) => p.word)
  const learnerTrim = turn.learnerTranscript?.trim() ?? ''
  const referenceTrim = turn.referenceSentence?.trim() ?? ''
  const wordsForPronunciationCopy = filterAssessmentsForPronunciationCopy(
    words,
    learnerTrim,
    referenceTrim,
    det,
    piw,
  )

  turn.sentenceGroundedReview = buildSentenceGroundedReview(
    turn,
    det,
    words,
    timing,
    scenarioTitle,
    wordsForPronunciationCopy,
  )
  const weakWords = wordsForPronunciationCopy.filter((w) => w.accuracyScore < 65 && w.word.trim()).map((w) => w.word.trim())
  const strongWords = wordsForPronunciationCopy.filter((w) => w.accuracyScore >= 85).map((w) => w.word.trim())

  turn.compareListenFor =
    hasAudio && turn.referenceAudioUrl
      ? buildCompareListenFor({
          hasAudio,
          weakWords,
          strongWords,
          pronunciationIssueWords: piw,
          rushedEnding: Boolean(timing?.rushedEnding),
          referenceSentence: turn.referenceSentence,
          wrongWords: det,
          scenarioTitle,
          scenarioSlug,
        })
      : undefined

  const langFix = turn.sentenceGroundedReview.mainFix
  const voiceFix = pickMainVoiceFix(turn, wordsForPronunciationCopy, timing)
  const wrongFirst = det[0]
  const le = turn.languageEvaluation
  const canonical = canonicalLearnerDutchLine(turn)
  const hasMeaningfulLanguageFix =
    Boolean(wrongFirst) ||
    Boolean(le?.grammarIssues?.length) ||
    Boolean(le?.sentenceStructureIssues?.length) ||
    (turn.referenceSentence.trim() !== '' && !sameSurface(turn.referenceSentence, turn.learnerTranscript))

  const useNaiveWordSwapMainFix =
    Boolean(wrongFirst) &&
    Boolean(canonical) &&
    !sameSurface(canonical, learnerTrim) &&
    singleWrongWordSwapMatchesCanonical(learnerTrim, wrongFirst, canonical)

  if (hasMeaningfulLanguageFix && wrongFirst && useNaiveWordSwapMainFix) {
    turn.mainFixLine = `Main fix: use “${wrongFirst.suggestedCorrection}” instead of “${wrongFirst.observedToken}”.`
  } else if (hasMeaningfulLanguageFix && wrongFirst && canonical && !sameSurface(canonical, learnerTrim)) {
    turn.mainFixLine = `Main fix: use this phrasing — “${canonical}”.`
  } else if (hasMeaningfulLanguageFix) {
    turn.mainFixLine = `Main fix: ${langFix.charAt(0).toLowerCase()}${langFix.slice(1)}`
  } else if (voiceFix.startsWith('Slow down') || voiceFix.includes('rushed')) {
    turn.mainFixLine = `Main fix: ${voiceFix.charAt(0).toLowerCase()}${voiceFix.slice(1)}`
  } else if (langFix.startsWith('Keep')) {
    turn.mainFixLine = 'Main fix: keep this wording — focus on pronunciation.'
  } else {
    turn.mainFixLine = `Main fix: ${langFix.charAt(0).toLowerCase()}${langFix.slice(1)}`
  }

  turn.voiceDrillInstruction = buildVoiceDrillInstruction(turn, wordsForPronunciationCopy)

  turn.improvementActions = focusImprovementActions(turn)
}

/** Pull language scores down when evidence shows clear word-choice issues */
export function applyWrongWordLanguagePenalty(lang: import('./liveVoiceEvaluationTypes').LanguageScores, wrong: WrongWordDetection[]) {
  if (!wrong.length) return lang
  const high = wrong.filter((w) => w.severity === 'high').length
  const med = wrong.filter((w) => w.severity === 'medium').length
  const low = Math.max(0, wrong.length - high - med)
  const pen = high * 16 + med * 10 + low * 6
  let naturalness = clamp100(lang.naturalness - pen)
  let contextualFit = clamp100(lang.contextualFit - Math.round(pen * 0.95))
  let registerFit = clamp100(lang.registerFit - Math.round(pen * 0.65))
  let grammaticalStability = clamp100(lang.grammaticalStability - Math.round(pen * 0.55))
  // Hard caps so wrong tokens cannot coexist with “near-perfect” naturalness
  const maxNat = high > 0 ? 72 : med > 0 ? 78 : 82
  const maxCtx = high > 0 ? 74 : med > 0 ? 80 : 85
  naturalness = Math.min(naturalness, maxNat)
  contextualFit = Math.min(contextualFit, maxCtx)
  return { naturalness, contextualFit, registerFit, grammaticalStability }
}

function applyPerTurnTrustCaps(
  dims: ScoredDimension[],
  ctx: { wrongN: number; weakCt: number; rushed: boolean; weakestAcc: number | null },
): void {
  const hasIssue = ctx.wrongN > 0 || ctx.weakCt > 0 || ctx.rushed
  if (!hasIssue) return

  const scored = dims.map(d => d.score).filter((s): s is number => s != null)
  if (scored.length === 0) return
  const minDim = Math.min(...scored)
  if (minDim <= 73) return

  const byId = new Map(dims.map(d => [d.id, d]))

  if (ctx.wrongN > 0) {
    const nd = byId.get('natural_dutch')
    if (nd?.score != null) nd.score = Math.min(nd.score, 70)
    const u = byId.get('understandability')
    if (u?.score != null) u.score = Math.min(u.score, 82)
  }
  if (ctx.weakCt > 0) {
    const pr = byId.get('pronunciation')
    if (pr?.score != null) {
      const anchor = ctx.weakestAcc != null ? Math.min(86, Math.round(ctx.weakestAcc + 9)) : 78
      pr.score = Math.min(pr.score, anchor, 86 - Math.min(10, ctx.weakCt * 5))
    }
    const u = byId.get('understandability')
    if (u?.score != null && ctx.weakestAcc != null && ctx.weakestAcc < 68) {
      u.score = Math.min(u.score, 84)
    }
  }
  if (ctx.rushed) {
    const rh = byId.get('rhythm')
    if (rh?.score != null) rh.score = Math.min(rh.score, 74)
  }
}

export function buildTurnScoredDimensions(
  turn: TurnEvaluation,
  weakWordCount: number,
  rushedEnding: boolean,
  words: NormalizedWordAssessment[],
): ScoredDimension[] {
  const hasAudio = turn.signalSources.audioMetrics === 'azure_audio'
  const conf = turn.transcriptConfidence
  const wrongN = turn.wrongWordDetections?.length ?? 0
  const weakestAcc =
    words.length > 0 ? Math.min(...words.map(w => (w.word.trim() ? w.accuracyScore : 100))) : null

  let clarity = calibrateDisplayScore(turn.combinedScores.clarityScore, 'blended', {
    transcriptConfidence: conf,
    weakWordCount: weakWordCount + wrongN * 3,
    rushedEnding,
  })
  let dutchLikeness = calibrateDisplayScore(turn.combinedScores.dutchLikenessScore, 'language', {
    transcriptConfidence: conf,
    weakWordCount: wrongN * 3,
    rushedEnding: false,
  })
  if (wrongN > 0) {
    dutchLikeness = Math.min(dutchLikeness, wrongN >= 2 ? 66 : 71)
    clarity = Math.min(clarity, 83)
  }

  const dims: ScoredDimension[] = [
    {
      id: 'understandability',
      label: 'Understandability',
      score: clarity,
      confidence: hasAudio ? 'high' : conf === 'low' ? 'low' : 'medium',
      evidenceType: hasAudio ? 'mixed' : 'transcript',
      verdict: '',
      meaning:
        weakWordCount > 0
          ? `Most of the line was clear, but ${weakWordCount === 1 ? 'one word' : 'a few words'} needed sharper articulation.`
          : wrongN > 0
            ? 'The idea reads clearly, but a key Dutch word does not match what listeners expect here.'
            : 'Listeners can follow what you meant without much re-listening.',
    },
    {
      id: 'natural_dutch',
      label: 'Natural Dutch',
      score: dutchLikeness,
      confidence: wrongN > 0 || conf === 'low' ? 'medium' : 'high',
      evidenceType: 'transcript',
      verdict: '',
      meaning:
        wrongN > 0
          ? 'The intent works, but at least one word choice pulls the line away from natural Dutch for this scene.'
          : 'Wording is mostly appropriate; polish is about sounding smoother, not rewriting everything.',
    },
  ]

  if (hasAudio) {
    let pron = calibrateDisplayScore(turn.audioScores.pronunciation, 'audio', {
      transcriptConfidence: conf,
      weakWordCount,
      rushedEnding,
    })
    if (weakWordCount > 0 && weakestAcc != null) {
      const anchor = Math.min(84, Math.round(weakestAcc + 8))
      pron = Math.min(pron, anchor, 88 - weakWordCount * 6)
    }
    let rhythm = calibrateDisplayScore(turn.audioScores.rhythm, 'audio', {
      transcriptConfidence: conf,
      weakWordCount,
      rushedEnding,
    })
    if (rushedEnding) {
      rhythm = Math.min(rhythm, 76)
    }
    dims.push(
      {
        id: 'pronunciation',
        label: 'Pronunciation',
        score: pron,
        confidence: weakWordCount >= 3 ? 'medium' : 'high',
        evidenceType: 'audio',
        verdict: '',
        meaning:
          weakWordCount > 0
            ? `Most words were clear, but ${weakWordCount === 1 ? 'one key word lost clarity' : 'several words lost clarity'} compared with the rest of the sentence.`
            : 'Consonants and vowels were generally easy to pick out without strain.',
      },
      {
        id: 'rhythm',
        label: 'Rhythm & flow',
        score: rhythm,
        confidence: rushedEnding ? 'medium' : 'high',
        evidenceType: 'audio',
        verdict: '',
        meaning: rushedEnding
          ? 'Your pacing was mostly steady, but the sentence ending sounded rushed.'
          : 'Pacing stayed fairly even across the line — minor polish only.',
      },
    )
  }

  applyPerTurnTrustCaps(dims, { wrongN, weakCt: weakWordCount, rushed: rushedEnding, weakestAcc })

  for (const d of dims) {
    if (!d.verdict && d.score != null) {
      d.verdict = verdictForDisplayScore(d.score)
    }
  }
  return dims
}

export function sessionCoachHeadline(input: {
  scenarioTitle: string
  sessionHasAudio: boolean
  wrongWordTurns: number
  avgAlignment: number
  goalsDone: number
  goalsTotal: number
  weakestAreaLabel: string | null
}): string {
  const { scenarioTitle, sessionHasAudio, wrongWordTurns, avgAlignment, goalsDone, goalsTotal } = input
  const scene = scenarioTitle.trim() || 'this scenario'
  const taskClear = goalsDone >= goalsTotal
  if (wrongWordTurns > 0) {
    return `Your Dutch worked in ${scene}, but ${wrongWordTurns === 1 ? 'one important word choice needs correction' : 'a few important word choices need correction'} before it sounds fully reliable.`
  }
  if (taskClear && sessionHasAudio && avgAlignment >= 72) {
    return `You completed the ${scene} task clearly; your next gain is sounding more natural on the details that still cost clarity.`
  }
  if (!sessionHasAudio) {
    return `We could follow your Dutch from text in ${scene}; record next time so voice feedback can match what you meant.`
  }
  if (input.weakestAreaLabel) {
    return `You were understandable throughout; now focus on ${input.weakestAreaLabel.toLowerCase()}.`
  }
  return `Solid work in ${scene} — tighten the weakest line once, then rerun the scenario for a cleaner second pass.`
}
