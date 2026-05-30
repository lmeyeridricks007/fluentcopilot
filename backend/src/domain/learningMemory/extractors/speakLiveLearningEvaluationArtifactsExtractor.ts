import type { LiveSessionEvaluation } from '../../../services/speak-live/liveVoiceEvaluationTypes'
import type { SpeakLiveLearningEvaluationArtifactsV1 } from '../speakLiveLearningEvaluationArtifacts.schema'
import { SpeakLiveLearningEvaluationArtifactsV1Schema } from '../speakLiveLearningEvaluationArtifacts.schema'

function dedupeCap(lines: string[], max: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of lines) {
    const t = raw?.trim()
    if (!t) continue
    const k = t.toLowerCase().slice(0, 160)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t.slice(0, 400))
    if (out.length >= max) break
  }
  return out
}

function collectWrongWordCorrections(ev: LiveSessionEvaluation): SpeakLiveLearningEvaluationArtifactsV1['recurringCorrections'] {
  const out: SpeakLiveLearningEvaluationArtifactsV1['recurringCorrections'] = []
  for (const t of ev.turnEvaluations ?? []) {
    for (const w of t.wrongWordDetections ?? []) {
      const obs = w.observedToken?.trim()
      if (!obs) continue
      out.push({
        observed: obs.slice(0, 120),
        suggested: w.suggestedCorrection?.trim().slice(0, 200) ?? null,
        classification: w.classification?.trim().slice(0, 80) ?? null,
      })
      if (out.length >= 24) return out
    }
  }
  return out
}

function collectPronunciationFindingLines(ev: LiveSessionEvaluation): string[] {
  const lines: string[] = []
  for (const t of ev.turnEvaluations ?? []) {
    for (const f of t.audioFindings ?? []) {
      if (f?.trim()) lines.push(f.trim())
    }
    for (const p of t.pronunciationIssues ?? []) {
      const s = `${p.word}: ${p.issue}`.trim()
      if (s) lines.push(s.slice(0, 300))
    }
  }
  const merged = ev.mergedSpeakingReportV1?.insights?.weakWords?.length
    ? ev.mergedSpeakingReportV1.insights.weakWords.map((w) => `Weak word: ${w}`)
    : []
  return dedupeCap([...lines, ...merged], 16)
}

/**
 * Builds a bounded, schema-valid artifact snapshot from a completed {@link LiveSessionEvaluation}.
 */
export function buildSpeakLiveLearningEvaluationArtifactsV1(
  ev: LiveSessionEvaluation,
  opts?: { scenarioSlug?: string | null },
): SpeakLiveLearningEvaluationArtifactsV1 {
  const os = ev.overallScores
  const merged = ev.mergedSpeakingReportV1
  const pacing =
    typeof os.pacingScore === 'number' && Number.isFinite(os.pacingScore)
      ? Math.round(os.pacingScore)
      : merged?.mergedScores?.pacing != null
        ? merged.mergedScores.pacing
        : os.rhythmScore != null
          ? Math.round(os.rhythmScore)
          : null
  const grammarSession =
    typeof os.grammarScore === 'number' && Number.isFinite(os.grammarScore)
      ? Math.round(os.grammarScore)
      : ev.sessionInsights?.overallGrammarSentenceScore != null
        ? Math.round(ev.sessionInsights.overallGrammarSentenceScore)
        : null

  const weakWords = dedupeCap(
    [
      ...(merged?.insights?.weakWords ?? []),
      ...(ev.turnEvaluations ?? []).flatMap((t) => t.focusWords ?? []),
    ],
    36,
  )

  const hesitationPatterns = dedupeCap(
    [...(merged?.insights?.hesitationPatterns ?? []), ...(merged?.adaptiveLearningSignalsV1?.pacingIssues ?? [])],
    16,
  )

  const pacingIssues = dedupeCap([...(merged?.adaptiveLearningSignalsV1?.pacingIssues ?? [])], 16)

  const grammarPatterns = dedupeCap(
    [
      ...(merged?.insights?.recurringGrammarIssues ?? []),
      ...(merged?.adaptiveLearningSignalsV1?.weakPatterns ?? []),
    ],
    20,
  )

  const pronunciationFindingLines = collectPronunciationFindingLines(ev)

  const draft: SpeakLiveLearningEvaluationArtifactsV1 = {
    version: 1,
    capturedAt: new Date().toISOString(),
    scenarioId: ev.scenarioId?.slice(0, 80) ?? null,
    scenarioSlug: opts?.scenarioSlug?.trim().slice(0, 120) ?? null,
    cefr: {
      practicedLevel: ev.practicedLevel?.trim().slice(0, 16) ?? null,
      observedLevel: ev.observedLevel?.trim().slice(0, 16) ?? null,
      targetLevel: ev.targetLevel?.trim().slice(0, 16) ?? null,
      learnerLevel: ev.learnerLevel?.trim().slice(0, 16) ?? null,
    },
    sessionScoreSnapshot: {
      overallVoiceScore: Math.round(os.overallVoiceScore),
      pronunciationScore: os.pronunciationScore != null ? Math.round(os.pronunciationScore) : null,
      fluencyScore: os.fluencyScore != null ? Math.round(os.fluencyScore) : null,
      pacingScore: pacing,
      grammarSessionScore: grammarSession,
      confidenceEstimate: Math.round(os.confidenceEstimate),
      scenarioCompletionScore: Math.round(os.scenarioCompletionScore),
    },
    transcriptEval: {
      coachSummarySnippet: ev.overallSummary?.coachSummary?.trim().slice(0, 600) ?? null,
      whatToTryNext: (ev.overallSummary?.whatToTryNext ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 8),
      strongestAreas: (ev.sessionInsights?.strongestAreas ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 12),
      weakestAreas: (ev.sessionInsights?.weakestAreas ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 12),
    },
    pronunciationEval: {
      pronunciationFindingLines,
      mergedPronunciationScore: merged?.mergedScores?.pronunciation != null ? Math.round(merged.mergedScores.pronunciation) : null,
    },
    weakWords,
    hesitationPatterns,
    pacingIssues,
    grammarPatterns,
    recurringCorrections: collectWrongWordCorrections(ev),
  }

  const parsed = SpeakLiveLearningEvaluationArtifactsV1Schema.safeParse(draft)
  if (!parsed.success) {
    console.warn('[SpeakLiveArtifacts] validation failed, returning minimal artifact', parsed.error.flatten())
    return SpeakLiveLearningEvaluationArtifactsV1Schema.parse({
      ...draft,
      pronunciationEval: { pronunciationFindingLines: [], mergedPronunciationScore: null },
      weakWords: [],
      hesitationPatterns: [],
      pacingIssues: [],
      grammarPatterns: [],
      recurringCorrections: [],
    })
  }
  return parsed.data
}
