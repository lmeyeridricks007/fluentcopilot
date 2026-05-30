import type { NormalizedWordAssessment } from '../speech/pronunciationAssessmentContracts'
import type { TimingAnalysis } from '../../domain/speaking-assessment/speakingAssessmentCanonical'
import { AUDIO_ONLY_FEEDBACK_TYPES } from './liveVoiceEvaluationTypes'
import type { FeedbackItem, FluencyIssue, ImprovementAction, PronunciationIssue, RecommendedFollowUp } from './liveVoiceEvaluationTypes'

export const VOICE_ANALYSIS_UNAVAILABLE_MESSAGE =
  'No recording was stored for this turn, so pronunciation and rhythm feedback are not included. The coaching below is based on what you wrote.'

export const SESSION_VOICE_ANALYSIS_UNAVAILABLE_MESSAGE =
  'No recordings were stored this session, so pronunciation and rhythm scores are not included. Try speaking into the mic next time for full voice feedback.'

const SPEECHISH_PROBLEM = /pronunciation|rhythm|fluency|pacing|pause|hesitat|mumbl|unclear speech|how you sounded|mic\b|recording\b|audio clip|out loud|chunking|word stress|syllable|articulation/i

const SPEECHISH_STRENGTH = /\bpronunciation\b|\brhythm\b|out loud|audio recording|how you sounded/i

const DUTCH_LIKENESS_BANNED_WHEN_NO_AUDIO =
  /mumbl|unclear speech|\brhythm\b|\bpacing\b|\bpronunciation\b|hesitat|how you sounded|word stress|syllable|chunking|mic\b|recording\b|clip\b|out loud/i

export function filterKeyProblemsWhenNoAudio(problems: string[]): string[] {
  return problems.map((p) => p.trim()).filter(Boolean).filter((p) => !SPEECHISH_PROBLEM.test(p))
}

export function filterStrengthsWhenNoAudio(strengths: string[]): string[] {
  return strengths.map((s) => s.trim()).filter(Boolean).filter((s) => !SPEECHISH_STRENGTH.test(s))
}

export function sanitizeDutchLikenessForTranscriptOnly(narrative: string, scenarioTitle: string): string {
  const t = narrative.trim()
  if (!t || DUTCH_LIKENESS_BANNED_WHEN_NO_AUDIO.test(t)) return transcriptOnlyCoachLine(scenarioTitle)
  return t
}

export function filterImprovementActionsForAudioPresence(
  hasAudio: boolean,
  actions: ImprovementAction[]
): ImprovementAction[] {
  if (hasAudio) return actions
  return actions.filter((a) => a.type !== 'save_pronunciation_word' && a.type !== 'save_rhythm_drill')
}

export function filterRecommendedFollowUpsForSessionAudio(
  sessionHasAudio: boolean,
  followUps: RecommendedFollowUp[]
): RecommendedFollowUp[] {
  if (sessionHasAudio) return followUps
  return followUps.filter((f) => f.type !== 'pronunciation_drill' && f.type !== 'rhythm_drill')
}

export function transcriptOnlyCoachLine(scenarioTitle: string): string {
  const s = scenarioTitle.trim() || 'this scenario'
  return `We only have your transcript for this turn in “${s}”. Coaching below reflects wording and grammar from text, not how you sounded out loud.`
}

function wordIssueLine(w: NormalizedWordAssessment): string {
  const word = w.word.trim()
  const t = (w.errorType ?? '').trim().toLowerCase()
  if (t === 'stress') return `“${word}” did not land clearly because the stress was off.`
  if (t === 'vowel') return `The vowel in “${word}” was hard to catch.`
  if (t === 'consonant') return `The ending of “${word}” was hard to catch.`
  if (t && t !== 'none') return `“${word}” was less clear than the rest of the sentence.`
  return `“${word}” was less clear than the rest of the sentence.`
}

export function buildPronunciationIssuesFromAzure(params: {
  words: NormalizedWordAssessment[]
  referenceAudioUrl: string | null
  threshold?: number
}): PronunciationIssue[] {
  const th = params.threshold ?? 72
  const out: PronunciationIssue[] = []
  for (const w of params.words) {
    const word = w.word.trim()
    if (!word || w.accuracyScore >= th) continue
    out.push({
      word,
      score: Math.round(Math.max(0, Math.min(100, w.accuracyScore))),
      issue: wordIssueLine(w),
      fix: `Listen to the reference, repeat “${word}” on its own, then say the full sentence once at that slower pace.`,
      referenceAudioUrl: params.referenceAudioUrl,
      startMs: w.startMs ?? null,
      endMs: w.endMs ?? null,
    })
  }
  return out.slice(0, 8)
}

export function buildFluencyIssuesFromTiming(params: {
  words: NormalizedWordAssessment[]
  timing: TimingAnalysis
}): FluencyIssue[] {
  const { words, timing } = params
  const out: FluencyIssue[] = []
  for (const h of timing.hesitationMoments.slice(0, 5)) {
    const a = words[h.afterWordIndex]
    const b = words[h.afterWordIndex + 1]
    if (!a || !b) continue
    const seg = `${a.word.trim()} … ${b.word.trim()}`
    out.push({
      segment: seg,
      issue: `You paused too long between “${a.word.trim()}” and “${b.word.trim()}”.`,
      fix: `Say “${a.word.trim()} ${b.word.trim()}” as one chunk so the question keeps moving.`,
      pauseMs: Math.round(h.pauseMs),
      afterWordIndex: h.afterWordIndex,
    })
  }
  if (out.length === 0 && timing.rushedEnding) {
    out.push({
      segment: words.length >= 2 ? `${words[words.length - 2]?.word?.trim() ?? ''} ${words[words.length - 1]?.word?.trim() ?? ''}`.trim() : 'final words',
      issue: 'The ending came too fast.',
      fix: 'Give the last phrase the same time and weight as the opening words.',
      pauseMs: null,
      afterWordIndex: null,
    })
  }
  return out.slice(0, 6)
}

function grammarItem(
  transcript: string,
  text: string,
  explanation: string
): FeedbackItem | null {
  const issue = text.trim()
  if (!issue) return null
  const snippet = transcript.trim().slice(0, 500)
  if (!snippet) return null
  return {
    type: 'grammar',
    source: 'transcript',
    evidence: {
      transcriptSnippet: snippet,
      phrase: issue.slice(0, 200),
    },
    issue,
    fix: 'See the improved version and grammar notes in the structured section.',
    explanation: explanation || 'Fixing this makes your Dutch sound more natural in similar situations.',
  }
}

export function buildTranscriptFeedbackItems(params: {
  transcript: string
  grammarIssues: string[]
  sentenceStructureIssues: string[]
  naturalnessNotes: string[]
}): FeedbackItem[] {
  const { transcript, grammarIssues, sentenceStructureIssues, naturalnessNotes } = params
  const out: FeedbackItem[] = []
  for (const g of grammarIssues) {
    const it = grammarItem(transcript, g, 'Grammar clarity helps listeners follow you with less effort.')
    if (it) out.push(it)
  }
  for (const s of sentenceStructureIssues) {
    const it = grammarItem(transcript, s, 'Sentence shape affects how “Dutch” the line feels, even with good vocabulary.')
    if (it) out.push(it)
  }
  for (const n of naturalnessNotes) {
    const it = grammarItem(transcript, n, 'Small phrasing shifts often matter more than single-word swaps.')
    if (it) out.push({ ...it, type: 'naturalness' })
  }
  return out
}

export function buildAudioFeedbackItems(params: {
  transcript: string
  pronunciationIssues: PronunciationIssue[]
  fluencyIssues: FluencyIssue[]
}): FeedbackItem[] {
  const snippet = params.transcript.trim().slice(0, 500)
  const out: FeedbackItem[] = []
  if (!snippet) return out
  for (const p of params.pronunciationIssues) {
    out.push({
      type: 'pronunciation',
      source: 'audio',
      evidence: {
        word: p.word,
        transcriptSnippet: snippet,
        timestampMsStart: p.startMs,
        timestampMsEnd: p.endMs,
      },
      issue: p.issue,
      fix: p.fix,
      explanation: 'This comes from Azure word-level scores on your recording.',
    })
  }
  for (const f of params.fluencyIssues) {
    out.push({
      type: 'rhythm',
      source: 'audio',
      evidence: {
        phrase: f.segment,
        transcriptSnippet: snippet,
        timestampMsStart: null,
        timestampMsEnd: null,
      },
      issue: f.issue,
      fix: f.fix,
      explanation: 'Timing gaps were measured between recognized words in your audio.',
    })
  }
  return out
}

/**
 * Hard validation: drops any item that violates audio-vs-transcript policy or lacks evidence.
 * This is the LAST gate before a feedback item reaches the API response or persistence layer.
 */
export function validateAndFilterFeedbackItems(items: FeedbackItem[]): FeedbackItem[] {
  return items.filter((it) => {
    if (AUDIO_ONLY_FEEDBACK_TYPES.has(it.type) && it.source !== 'audio') return false
    const ev = it.evidence
    if (!ev?.transcriptSnippet?.trim()) return false
    return true
  })
}

/**
 * Validate a full turn evaluation's feedback items, returning rejection reasons for logging.
 * Call before API response to catch regressions — does not throw, returns diagnostics.
 */
export function diagnoseFeedbackViolations(items: FeedbackItem[]): string[] {
  const violations: string[] = []
  for (const it of items) {
    if (AUDIO_ONLY_FEEDBACK_TYPES.has(it.type) && it.source !== 'audio') {
      violations.push(`REJECTED: ${it.type} requires source=audio but got source=${it.source}`)
    }
    if (!it.evidence?.transcriptSnippet?.trim()) {
      violations.push(`REJECTED: ${it.type} (${it.source}) has no transcriptSnippet evidence`)
    }
  }
  return violations
}
