import type { ReadAloudEvaluateResult } from '../../../services/read-aloud/readAloudEvaluateTypes'
import type { SkillEvidenceAtom } from '../skillEvidenceAtomTypes'
import {
  clamp01,
  polarityFromQualityScore100,
  scoreDeltaFromQuality,
  severityFromQualityScore100,
  skillIdsForReadAloudDimensionKey,
} from '../skillEvidenceReportMappingCore'

export type ReadAloudSkillEvidenceParams = {
  userId: string
  sessionId: string
  createdAt: string
  result: ReadAloudEvaluateResult
}

function pushDimensionAtoms(
  out: SkillEvidenceAtom[],
  params: ReadAloudSkillEvidenceParams,
  key: keyof ReadAloudEvaluateResult['dimensions'],
  evidenceType: string,
): void {
  const block = params.result.dimensions[key]
  if (!block?.supported || block.score == null) return
  const pol = polarityFromQualityScore100(block.score)
  if (pol === 'neutral') return
  const sev = severityFromQualityScore100(block.score)
  const conf = block.score01 != null ? clamp01(block.score01) : clamp01((block.score ?? 50) / 100)
  const skillIds = skillIdsForReadAloudDimensionKey(String(key))
  const summary = `${key}: ${block.label} (${block.score})`.slice(0, 280)
  for (const skillId of skillIds) {
    out.push({
      userId: params.userId,
      sessionId: params.sessionId,
      sessionType: 'read_aloud',
      skillId,
      evidenceType,
      scoreDeltaCandidate: scoreDeltaFromQuality(block.score),
      confidence: Math.max(0.22, conf),
      severity: Math.min(3, sev * (skillIds.length > 1 ? 0.88 : 1)),
      positiveOrNegative: pol,
      sourceSummary: summary,
      createdAt: params.createdAt,
    })
  }
}

export function extractSkillEvidenceFromReadAloudReport(params: ReadAloudSkillEvidenceParams): SkillEvidenceAtom[] {
  const out: SkillEvidenceAtom[] = []
  pushDimensionAtoms(out, params, 'pronunciation', 'read_aloud_dimension')
  pushDimensionAtoms(out, params, 'fluency', 'read_aloud_dimension')
  pushDimensionAtoms(out, params, 'pacing', 'read_aloud_dimension')
  pushDimensionAtoms(out, params, 'clarity', 'read_aloud_dimension')
  pushDimensionAtoms(out, params, 'readingAccuracy', 'read_aloud_dimension')
  pushDimensionAtoms(out, params, 'expression', 'read_aloud_dimension')
  pushDimensionAtoms(out, params, 'levelFit', 'read_aloud_dimension')

  const pa = params.result.pronunciationAssessment
  if (pa && typeof pa.pronunciationScore === 'number') {
    const pol = polarityFromQualityScore100(pa.pronunciationScore)
    if (pol !== 'neutral') {
      out.push({
        userId: params.userId,
        sessionId: params.sessionId,
        sessionType: 'read_aloud',
        skillId: 'pronunciation',
        evidenceType: 'read_aloud_pronunciation_assessment',
        scoreDeltaCandidate: scoreDeltaFromQuality(pa.pronunciationScore),
        confidence: 0.72,
        severity: severityFromQualityScore100(pa.pronunciationScore),
        positiveOrNegative: pol,
        sourceSummary: `Azure-style pronunciation aggregate (${pa.pronunciationScore})`.slice(0, 280),
        createdAt: params.createdAt,
      })
    }
  }

  const chunks = params.result.audioChunks ?? []
  if (chunks.length >= 2) {
    const scored = chunks.filter((c) => c.pronunciationScore != null)
    if (scored.length >= 2) {
      const avg = scored.reduce((s, c) => s + (c.pronunciationScore ?? 0), 0) / scored.length
      const pol = polarityFromQualityScore100(avg)
      if (pol !== 'neutral') {
        out.push({
          userId: params.userId,
          sessionId: params.sessionId,
          sessionType: 'read_aloud',
          skillId: 'pronunciation',
          evidenceType: 'read_aloud_chunk_pronunciation_mean',
          scoreDeltaCandidate: scoreDeltaFromQuality(avg),
          confidence: 0.55,
          severity: severityFromQualityScore100(avg) * 0.9,
          positiveOrNegative: pol,
          sourceSummary: `Chunk-level pronunciation mean ~${Math.round(avg)} over ${scored.length} clips`,
          createdAt: params.createdAt,
        })
      }
    }
  }

  const coverage = params.result.audioCoverage
  if (coverage && coverage.totalSec > 5) {
    const pauseRatio = clamp01(coverage.pauseLikeSec / coverage.totalSec)
    if (pauseRatio >= 0.22) {
      out.push({
        userId: params.userId,
        sessionId: params.sessionId,
        sessionType: 'read_aloud',
        skillId: 'pacing',
        evidenceType: 'read_aloud_pause_ratio',
        scoreDeltaCandidate: -1.2,
        confidence: 0.48,
        severity: Math.min(3, 1.2 + pauseRatio * 3),
        positiveOrNegative: 'negative',
        sourceSummary: `Elevated pause-like time (${Math.round(pauseRatio * 100)}% of audio)`,
        createdAt: params.createdAt,
      })
      out.push({
        userId: params.userId,
        sessionId: params.sessionId,
        sessionType: 'read_aloud',
        skillId: 'fluency',
        evidenceType: 'read_aloud_pause_ratio',
        scoreDeltaCandidate: -0.9,
        confidence: 0.44,
        severity: Math.min(3, 1.0 + pauseRatio * 2.6),
        positiveOrNegative: 'negative',
        sourceSummary: `Pause-heavy delivery vs. passage length`,
        createdAt: params.createdAt,
      })
    }
  }

  for (const seg of params.result.weakSegments ?? []) {
    const conf = clamp01(seg.confidence)
    if (seg.pronunciationTargets?.length) {
      for (const t of seg.pronunciationTargets.slice(0, 2)) {
        if (t.accuracyScore >= 72) continue
        out.push({
          userId: params.userId,
          sessionId: params.sessionId,
          sessionType: 'read_aloud',
          skillId: 'pronunciation',
          evidenceType: 'read_aloud_weak_segment_word',
          scoreDeltaCandidate: scoreDeltaFromQuality(t.accuracyScore),
          confidence: Math.max(0.3, conf),
          severity: severityFromQualityScore100(t.accuracyScore),
          positiveOrNegative: 'negative',
          sourceSummary: `Weak pronunciation target “${t.word}” in segment`,
          createdAt: params.createdAt,
        })
      }
    }
    if (seg.pauseGuidance?.trim()) {
      out.push({
        userId: params.userId,
        sessionId: params.sessionId,
        sessionType: 'read_aloud',
        skillId: 'pacing',
        evidenceType: 'read_aloud_weak_segment_pause',
        scoreDeltaCandidate: -0.8,
        confidence: Math.max(0.35, conf * 0.9),
        severity: 2.1,
        positiveOrNegative: 'negative',
        sourceSummary: seg.pauseGuidance.trim().slice(0, 240),
        createdAt: params.createdAt,
      })
    }
    if (seg.naturalnessNote?.trim()) {
      out.push({
        userId: params.userId,
        sessionId: params.sessionId,
        sessionType: 'read_aloud',
        skillId: 'natural_dutch',
        evidenceType: 'read_aloud_naturalness',
        scoreDeltaCandidate: -0.7,
        confidence: Math.max(0.32, conf * 0.85),
        severity: 1.9,
        positiveOrNegative: 'negative',
        sourceSummary: seg.naturalnessNote.trim().slice(0, 240),
        createdAt: params.createdAt,
      })
    }
  }

  return out
}
