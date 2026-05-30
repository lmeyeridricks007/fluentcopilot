import type { ConversationSummary, FeedbackItem } from '../../../models/contracts'
import {
  dedupeEvidenceItems,
  mapIssueConfidence,
  mapIssueSeverity,
  normalizePatternId,
  normalizeWordKey,
} from '../learningInsightNormalization'
import type { SessionInsightStrength, SessionInsightWeakPattern, SessionInsightWeakWord } from '../sessionLearningInsightTypes'
import type { ScenarioPerformanceSummary, Score01 } from '../userLearningProfileDocument'

export type ChatSessionInsightChunk = {
  weakWords: SessionInsightWeakWord[]
  weakPatterns: SessionInsightWeakPattern[]
  strengths: SessionInsightStrength[]
  scenarioPerformance: ScenarioPerformanceSummary
  confidenceParts: string[]
}

function pushWord(
  bucket: SessionInsightWeakWord[],
  text: string,
  category: string,
  source: string,
  severityLabel: 'high' | 'medium' | 'low',
  confidence: Score01,
  refs: string[],
  supportingText?: string | null,
): void {
  const w = text.trim()
  if (w.length < 2 || w.length > 120) return
  const sev = mapIssueSeverity({ label: severityLabel })
  bucket.push({
    normalizedKey: normalizeWordKey(w),
    displayText: w,
    category,
    source,
    severity: sev,
    severityScore: sev,
    confidence,
    evidenceRefs: dedupeEvidenceItems(refs),
    supportingText: supportingText ?? null,
  })
}

function pushPattern(
  bucket: SessionInsightWeakPattern[],
  label: string,
  explanation: string | null,
  source: string,
  severityLabel: 'high' | 'medium' | 'low',
  confidence: Score01,
  refs: string[],
  supportingText?: string | null,
): void {
  const humanLabel = label.trim().slice(0, 200)
  if (!humanLabel) return
  const sev = mapIssueSeverity({ label: severityLabel })
  bucket.push({
    patternId: normalizePatternId(humanLabel),
    label: humanLabel.slice(0, 120),
    explanation,
    source,
    severity: sev,
    severityScore: sev,
    confidence,
    evidenceRefs: dedupeEvidenceItems(refs),
    supportingText: supportingText ?? null,
  })
}

function pushStrength(
  bucket: SessionInsightStrength[],
  label: string,
  source: string,
  confidence: Score01,
  refs: string[],
  supportingText?: string | null,
): void {
  const t = label.trim().slice(0, 220)
  if (t.length < 2) return
  const sev = Math.min(3, Math.max(1, Math.round(1 + confidence * 2)))
  bucket.push({
    label: t,
    source,
    severity: sev,
    severityScore: sev,
    confidence,
    evidenceRefs: dedupeEvidenceItems(refs),
    supportingText: supportingText ?? null,
  })
}

export function extractChatSessionInsightChunk(params: {
  sessionId: string
  summary: ConversationSummary
  feedback: FeedbackItem[]
  scenarioId: string
  scenarioSlug: string | null
}): ChatSessionInsightChunk {
  const extractedAt = new Date().toISOString()
  const weakWords: SessionInsightWeakWord[] = []
  const weakPatterns: SessionInsightWeakPattern[] = []
  const strengths: SessionInsightStrength[] = []
  const baseConf = mapIssueConfidence({ level: 'medium', audioBacked: false, transcriptOnlyPenalty: 1 })

  for (const line of params.summary.whatWentWell ?? []) {
    if (line?.trim()) {
      pushStrength(strengths, line, 'text_summary_what_went_well', baseConf * 0.55, [`thread:${params.sessionId}`, 'summary_well'], null)
    }
  }
  for (const line of params.summary.languageNotes ?? []) {
    if (line?.trim()) {
      pushPattern(
        weakPatterns,
        line.trim().slice(0, 120),
        null,
        'text_language_notes',
        'medium',
        baseConf * 0.48,
        [`thread:${params.sessionId}`, 'language_notes'],
        null,
      )
    }
  }
  for (const line of params.summary.dutchUpgrade ?? []) {
    if (line?.trim()) {
      pushStrength(strengths, `Dutch upgrade: ${line.trim()}`, 'text_dutch_upgrade', baseConf * 0.52, [`thread:${params.sessionId}`, 'dutch_upgrade'], null)
    }
  }
  for (const gid of params.summary.goalsCompleted ?? []) {
    if (gid?.trim()) {
      pushStrength(strengths, `Goal met: ${gid}`, 'text_scenario_goal', 0.5, [`thread:${params.sessionId}`, `goal:${gid}`], null)
    }
  }

  for (const f of params.feedback) {
    const sev: 'high' | 'medium' | 'low' = f.severity === 'high' ? 'high' : 'medium'
    pushWord(weakWords, f.originalText, f.category ?? 'feedback', 'text_feedback_row', sev, sev === 'high' ? 0.58 : 0.45, [`thread:${params.sessionId}`, 'feedback_row'], f.explanation ?? null)
    const lab = `${f.category}: correction pattern`
    pushPattern(
      weakPatterns,
      lab,
      f.explanation ?? null,
      'text_feedback_pattern',
      sev,
      sev === 'high' ? 0.58 : 0.45,
      [`thread:${params.sessionId}`, 'feedback_row'],
      f.correctedText ? `Suggested: ${f.correctedText}`.slice(0, 240) : null,
    )
  }

  for (const cp of params.summary.correctedPhrases ?? []) {
    pushWord(weakWords, cp.original, 'corrected_phrase', 'text_corrected_phrase', 'medium', 0.5, [`thread:${params.sessionId}`, 'corrected_phrase'], cp.note ?? null)
    pushPattern(
      weakPatterns,
      (cp.note || 'Phrasing').slice(0, 120),
      cp.note ?? null,
      'text_corrected_phrase',
      'medium',
      0.5,
      [`thread:${params.sessionId}`, 'corrected_phrase'],
      cp.corrected ? `Natural: ${cp.corrected}`.slice(0, 240) : null,
    )
  }

  for (const line of params.summary.whatToImprove ?? []) {
    if (!line.trim()) continue
    pushPattern(
      weakPatterns,
      line.trim().slice(0, 120),
      null,
      'text_summary_improve',
      'medium',
      0.42,
      [`thread:${params.sessionId}`, 'summary_improve'],
      null,
    )
  }

  const scenarioPerformance: ScenarioPerformanceSummary = {
    scenarioId: params.scenarioId,
    scenarioSlug: params.scenarioSlug,
    attempts: 1,
    rollingScore: null,
    recentScore: null,
    confidence: 0.4,
    strongSubskills: (params.summary.whatWentWell ?? []).slice(0, 4),
    weakSubskills: (params.summary.whatToImprove ?? []).slice(0, 4),
    lastAttemptAt: extractedAt,
  }

  const confidenceParts = [
    'text:transcript_feedback_only',
    `feedbackRows=${params.feedback.length}`,
    `correctedPhrases=${params.summary.correctedPhrases?.length ?? 0}`,
  ]

  return { weakWords, weakPatterns, strengths, scenarioPerformance, confidenceParts }
}
