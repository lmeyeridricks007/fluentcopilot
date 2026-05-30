import type { ReadAloudEvaluateResult } from '../../../services/read-aloud/readAloudEvaluateTypes'
import {
  dedupeEvidenceItems,
  mapIssueSeverity,
  mapPronunciationIssueFamily,
  normalizePatternId,
  normalizePronunciationTarget,
  normalizeWordKey,
} from '../learningInsightNormalization'
import { hesitationDeltaToIssues } from '../sessionInsightHesitationBuilder'
import type {
  HesitationDelta,
  SessionInsightHesitation,
  SessionInsightPronunciation,
  SessionInsightStrength,
  SessionInsightWeakPattern,
  SessionInsightWeakWord,
} from '../sessionLearningInsightTypes'
import type { Score01 } from '../userLearningProfileDocument'

export type ReadAloudInsightChunk = {
  weakWords: SessionInsightWeakWord[]
  weakPatterns: SessionInsightWeakPattern[]
  pronunciationIssues: SessionInsightPronunciation[]
  hesitationIssues: SessionInsightHesitation[]
  strengths: SessionInsightStrength[]
  confidenceParts: string[]
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

export function extractReadAloudSessionInsightChunk(params: {
  sessionId: string
  result: ReadAloudEvaluateResult
}): ReadAloudInsightChunk {
  const weakWords: SessionInsightWeakWord[] = []
  const pronunciationIssues: SessionInsightPronunciation[] = []
  const weakPatterns: SessionInsightWeakPattern[] = []
  const strengths: SessionInsightStrength[] = []
  const confidenceParts = [
    `read_aloud:${params.result.evaluationMode ?? 'unknown'}`,
    `weakSegments=${params.result.weakSegments?.length ?? 0}`,
  ]

  if (params.result.coaching?.summary?.trim()) {
    pushStrength(
      strengths,
      params.result.coaching.summary.trim().slice(0, 200),
      'read_aloud_coaching_summary',
      0.62,
      [`session:${params.sessionId}`, 'coaching_summary'],
      null,
    )
  }
  if (params.result.coaching?.focusArea?.trim()) {
    weakPatterns.push({
      patternId: normalizePatternId(`Read-aloud focus: ${params.result.coaching.focusArea}`),
      label: `Read-aloud focus: ${params.result.coaching.focusArea.trim()}`.slice(0, 120),
      explanation: null,
      source: 'read_aloud_coaching',
      severity: 2,
      severityScore: 2,
      confidence: 0.58,
      evidenceRefs: dedupeEvidenceItems([`session:${params.sessionId}`, 'focus_area']),
      supportingText: null,
    })
  }
  for (const line of params.result.coaching?.feedbackLines ?? []) {
    if (line?.trim()) {
      weakPatterns.push({
        patternId: normalizePatternId(line),
        label: line.trim().slice(0, 120),
        explanation: null,
        source: 'read_aloud_coaching_line',
        severity: 1,
        severityScore: 1,
        confidence: 0.5,
        evidenceRefs: dedupeEvidenceItems([`session:${params.sessionId}`, 'feedback_line']),
        supportingText: null,
      })
    }
  }

  const dims = params.result.dimensions
  if (dims) {
    for (const key of ['pronunciation', 'clarity', 'fluency', 'pacing', 'expression', 'readingAccuracy', 'levelFit'] as const) {
      const block = dims[key]
      if (!block?.supported || typeof block.score !== 'number') continue
      const ref = `session:${params.sessionId}:dim:${key}`
      if (block.score >= 78 && block.label) {
        pushStrength(strengths, `${key}: ${block.label}`, 'read_aloud_dimension', 0.55 + (block.score - 78) / 220, [ref], block.evidence?.slice(0, 240) ?? null)
      } else if (block.score < 68 && block.label) {
        const sev = mapIssueSeverity({ numeric: (80 - block.score) / 25 })
        weakPatterns.push({
          patternId: normalizePatternId(`read_aloud_${key}_${block.label}`),
          label: `${key}: ${block.label}`.slice(0, 120),
          explanation: block.detail ?? null,
          source: 'read_aloud_dimension_gap',
          severity: sev,
          severityScore: sev,
          confidence: 0.52,
          evidenceRefs: dedupeEvidenceItems([ref]),
          supportingText: block.evidence?.slice(0, 240) ?? null,
        })
      }
    }
  }

  for (const w of params.result.weakWords ?? []) {
    const t = w.trim()
    if (t.length < 2) continue
    const sev = 1
    weakWords.push({
      normalizedKey: normalizeWordKey(t),
      displayText: t,
      category: 'read_aloud_weak_word',
      source: 'read_aloud_weak_word_list',
      severity: sev,
      severityScore: sev,
      confidence: 0.72,
      evidenceRefs: dedupeEvidenceItems([`session:${params.sessionId}`, 'weak_word_list']),
      supportingText: null,
    })
  }

  for (const seg of params.result.weakSegments ?? []) {
    const conf = typeof seg.confidence === 'number' ? Math.max(0.25, Math.min(0.95, seg.confidence)) : 0.55
    for (const hint of seg.wordHints ?? []) {
      const h = hint.trim()
      if (h.length < 2) continue
      weakWords.push({
        normalizedKey: normalizeWordKey(h),
        displayText: h,
        category: seg.issue?.slice(0, 64) || 'read_aloud_segment',
        source: 'read_aloud_segment_hint',
        severity: 1,
        severityScore: 1,
        confidence: conf * 0.85,
        evidenceRefs: dedupeEvidenceItems([`session:${params.sessionId}`, `segment:${seg.id}`]),
        supportingText: seg.transcript?.slice(0, 200) ?? null,
      })
    }
    for (const pt of seg.pronunciationTargets ?? []) {
      const fam = mapPronunciationIssueFamily(pt.tip)
      const sev = mapIssueSeverity({ numeric: pt.accuracyScore < 55 ? 2.5 : 1.2 })
      pronunciationIssues.push({
        targetKey: normalizePronunciationTarget(pt.word, fam),
        issueType: fam,
        source: 'read_aloud_segment_pronunciation',
        severity: sev,
        severityScore: sev,
        confidence: conf * 0.88,
        evidenceRefs: dedupeEvidenceItems([`session:${params.sessionId}`, seg.id]),
        supportingText: pt.tip?.slice(0, 200) ?? null,
      })
    }
    if (seg.issue?.trim()) {
      weakPatterns.push({
        patternId: `pat_read_${normalizeWordKey(seg.issue).replace(/[^a-z0-9]+/g, '_').slice(0, 40)}`,
        label: seg.issue.trim().slice(0, 120),
        explanation: seg.suggestion ?? null,
        source: 'read_aloud_weak_segment',
        severity: 1,
        severityScore: 1,
        confidence: conf * 0.65,
        evidenceRefs: dedupeEvidenceItems([`session:${params.sessionId}`, seg.id]),
        supportingText: seg.likelyIntendedPhrase?.slice(0, 200) ?? null,
      })
    }
  }

  const hz: HesitationDelta = {}
  const ad = params.result.audioCoverage
  if (ad && ad.pauseLikeSec > 2.5) hz.longPauses = Math.min(6, Math.round(ad.pauseLikeSec))
  if (ad && ad.longUnmatchedSec > 1.8) hz.restarts = Math.min(4, Math.round(ad.longUnmatchedSec))
  const hesitationIssues = hesitationDeltaToIssues(Object.keys(hz).length ? hz : null, null, params.sessionId, {
    source: 'read_aloud_audio_coverage',
    baseConfidence: 0.44,
  })

  return {
    weakWords,
    weakPatterns,
    pronunciationIssues,
    hesitationIssues,
    strengths,
    confidenceParts,
  }
}
