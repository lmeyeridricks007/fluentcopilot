/**
 * Deterministic assembly of session headline scores and per-turn merged scores from:
 * structured scenario-dialogue JSON, Azure Speech batch metrics, and scenario goal weights.
 *
 * Call after {@link applyMergedSpeakingReportToLiveSessionEvaluation} so insights lists stay rich;
 * this pass overwrites headline scores and merged numeric surfaces to match the versioned formula.
 */
import type { ScenarioDialogueStructuredOutput } from './speakLiveScenarioDialogueStructured.schema'
import type { AssessUserTurnsSpeechBatchResult, UserTurnSpeechAssessmentMetrics } from './speakLiveAssessUserTurnsSpeechBatch'
import type { NormalizedSpeakLiveSession } from './speakLiveNormalizedConversation'
import {
  SCENARIO_REPORT_SCORE_FORMULA_VERSION,
  type LiveSessionEvaluation,
  type ScenarioReportComponentScoresV1,
  type ScenarioReportPerTurnMergedScoreV1,
  type ScenarioReportScoringDiagnosticsV1,
  type ScenarioReportSpeechComponentScoresV1,
  type TurnEvaluation,
} from './liveVoiceEvaluationTypes'
import { MergedSpeakingReportV1Schema } from './speakLiveMergedSpeakingReport.schema'

const LANG_W = {
  grammar: 0.25,
  vocabulary: 0.2,
  sentenceStructure: 0.2,
  naturalness: 0.2,
  conversationFlowTaskRelevance: 0.15,
} as const

const SPEECH_W = {
  pronunciation: 0.35,
  fluency: 0.25,
  pacing: 0.15,
  prosody: 0.15,
  completeness: 0.1,
} as const

const SESSION_WITH_SPEECH = { scenario: 0.35, language: 0.35, speech: 0.3 } as const
const SESSION_NO_SPEECH = { scenario: 0.45, language: 0.55, speech: 0 } as const

const TURN_WITH_SPEECH = { scenario: 0.35, language: 0.35, speech: 0.3 } as const
const TURN_NO_SPEECH = { scenario: 0.45, language: 0.55, speech: 0 } as const

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function normKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 160)
}

function dedupeStrings(lines: string[], max: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of lines) {
    const t = raw?.trim()
    if (!t) continue
    const k = normKey(t)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t.slice(0, 400))
    if (out.length >= max) break
  }
  return out
}

function languageCompositeFromParts(p: ScenarioReportComponentScoresV1['language']): number {
  return clamp100(
    p.grammar * LANG_W.grammar +
      p.vocabulary * LANG_W.vocabulary +
      p.sentenceStructure * LANG_W.sentenceStructure +
      p.naturalness * LANG_W.naturalness +
      p.conversationFlowTaskRelevance * LANG_W.conversationFlowTaskRelevance,
  )
}

function languageTurnFromStructuredRow(row: ScenarioDialogueStructuredOutput['turns'][number]): number {
  const ls = row.languageScores
  return languageCompositeFromParts({
    grammar: ls.grammar,
    vocabulary: ls.vocabulary,
    sentenceStructure: ls.sentenceStructure,
    naturalness: ls.naturalness,
    conversationFlowTaskRelevance: ls.taskRelevance,
  })
}

function languageTurnFromEvaluation(t: TurnEvaluation): number {
  const le = t.languageEvaluation
  const tc = t.transcriptCoaching
  const grammar = clamp100(
    le?.grammarScore ?? (typeof tc?.grammarScore === 'number' ? tc.grammarScore : t.languageScores.grammaticalStability),
  )
  const vocabulary = clamp100((t.languageScores.naturalness + t.languageScores.registerFit) / 2)
  const sentenceStructure = clamp100(
    le?.sentenceConstructionScore ?? (t.languageScores.contextualFit + t.languageScores.grammaticalStability) / 2,
  )
  const naturalness = clamp100(t.languageScores.naturalness)
  const conversationFlowTaskRelevance = clamp100(
    (t.languageScores.contextualFit + t.scenarioGoalFit.alignmentScore) / 2,
  )
  return languageCompositeFromParts({
    grammar,
    vocabulary,
    sentenceStructure,
    naturalness,
    conversationFlowTaskRelevance,
  })
}

function speechCompositeFromMetrics(m: UserTurnSpeechAssessmentMetrics): number | null {
  if (!m.assessmentOk || m.skipped) return null
  const pr = m.pronunciationScore
  const fl = m.fluencyScore
  const pa = m.pacingScore
  const comp = m.completenessScore
  const pros = m.prosodyScore ?? clamp100(pr * 0.5 + pa * 0.5)
  return clamp100(
    pr * SPEECH_W.pronunciation +
      fl * SPEECH_W.fluency +
      pa * SPEECH_W.pacing +
      pros * SPEECH_W.prosody +
      comp * SPEECH_W.completeness,
  )
}

function aggregateSpeechComponents(metricsList: UserTurnSpeechAssessmentMetrics[]): ScenarioReportSpeechComponentScoresV1 | null {
  const usable = metricsList.filter((m) => m.assessmentOk && !m.skipped)
  if (!usable.length) return null
  const pick = (fn: (m: UserTurnSpeechAssessmentMetrics) => number) =>
    clamp100(usable.reduce((s, m) => s + fn(m), 0) / usable.length)
  return {
    pronunciation: pick((m) => m.pronunciationScore),
    fluency: pick((m) => m.fluencyScore),
    pacing: pick((m) => m.pacingScore),
    prosody: pick((m) => m.prosodyScore ?? (m.pronunciationScore * 0.5 + m.pacingScore * 0.5)),
    completeness: pick((m) => m.completenessScore),
  }
}

function speechSessionFromComponents(c: ScenarioReportSpeechComponentScoresV1): number {
  return clamp100(
    c.pronunciation * SPEECH_W.pronunciation +
      c.fluency * SPEECH_W.fluency +
      c.pacing * SPEECH_W.pacing +
      c.prosody * SPEECH_W.prosody +
      c.completeness * SPEECH_W.completeness,
  )
}

function scenarioTaskFromStructured(
  structured: ScenarioDialogueStructuredOutput | undefined | null,
  fallbackScenarioCompletion: number,
): { score: number; usedGoalWeights: boolean } {
  if (!structured) {
    return { score: clamp100(fallbackScenarioCompletion), usedGoalWeights: false }
  }
  const goals = structured.goals ?? []
  const wSum = goals.reduce((s, g) => s + g.weight, 0)
  if (goals.length > 0 && wSum > 0) {
    const weighted = goals.reduce((s, g) => s + g.score * g.weight, 0) / wSum
    return { score: clamp100(weighted), usedGoalWeights: true }
  }
  return { score: clamp100(structured.overall.taskCompletionScore), usedGoalWeights: false }
}

function sessionLanguageFromStructured(structured: ScenarioDialogueStructuredOutput): ScenarioReportComponentScoresV1['language'] {
  const o = structured.overall
  const sentenceAvg =
    structured.turns.length > 0
      ? clamp100(structured.turns.reduce((s, t) => s + t.languageScores.sentenceStructure, 0) / structured.turns.length)
      : clamp100(o.grammarScore)
  return {
    grammar: clamp100(o.grammarScore),
    vocabulary: clamp100(o.vocabularyScore),
    sentenceStructure: sentenceAvg,
    naturalness: clamp100(o.naturalnessScore),
    conversationFlowTaskRelevance: clamp100(o.conversationFlowScore),
  }
}

function sessionLanguageFromTurns(turns: TurnEvaluation[]): ScenarioReportComponentScoresV1['language'] {
  if (!turns.length) {
    return {
      grammar: 0,
      vocabulary: 0,
      sentenceStructure: 0,
      naturalness: 0,
      conversationFlowTaskRelevance: 0,
    }
  }
  const parts: ScenarioReportComponentScoresV1['language'][] = turns.map((t) => {
    const le = t.languageEvaluation
    const tc = t.transcriptCoaching
    return {
      grammar: clamp100(
        le?.grammarScore ?? (typeof tc?.grammarScore === 'number' ? tc.grammarScore : t.languageScores.grammaticalStability),
      ),
      vocabulary: clamp100((t.languageScores.naturalness + t.languageScores.registerFit) / 2),
      sentenceStructure: clamp100(
        le?.sentenceConstructionScore ?? (t.languageScores.contextualFit + t.languageScores.grammaticalStability) / 2,
      ),
      naturalness: clamp100(t.languageScores.naturalness),
      conversationFlowTaskRelevance: clamp100(
        (t.languageScores.contextualFit + t.scenarioGoalFit.alignmentScore) / 2,
      ),
    }
  })
  const avg = (k: keyof (typeof parts)[number]) =>
    clamp100(parts.reduce((s, p) => s + p[k], 0) / parts.length)
  return {
    grammar: avg('grammar'),
    vocabulary: avg('vocabulary'),
    sentenceStructure: avg('sentenceStructure'),
    naturalness: avg('naturalness'),
    conversationFlowTaskRelevance: avg('conversationFlowTaskRelevance'),
  }
}

export type MergeScenarioReportEvaluationInput = {
  normalizedSession: NormalizedSpeakLiveSession
  evaluation: LiveSessionEvaluation
  structuredDialogue?: ScenarioDialogueStructuredOutput | null
  azureBatch: AssessUserTurnsSpeechBatchResult
  referenceTts: { ms: number; cacheHits: number; cacheMisses: number }
  /** Optional echo of configured scenario goals (diagnostics only). */
  scenarioMetadata?: { slug: string; title: string; goals: string[] }
}

/**
 * Mutates `evaluation` in place: headline {@link LiveSessionEvaluation.overall.overallScore},
 * {@link LiveSessionEvaluation.overallScores.overallVoiceScore}, {@link LiveSessionEvaluation.taskOutcome.weightedCompletion},
 * per-turn {@link TurnEvaluation.combinedScores.overallTurnScore}, coaching hooks from structured rows,
 * {@link LiveSessionEvaluation.mergedSpeakingReportV1} numeric summary, and attaches {@link LiveSessionEvaluation.scenarioReportScoringDiagnosticsV1}.
 */
export function mergeScenarioReportEvaluation(
  input: MergeScenarioReportEvaluationInput,
): { scoringDiagnostics: ScenarioReportScoringDiagnosticsV1 } {
  const ev = input.evaluation
  const turns = ev.turnEvaluations ?? []
  const metricsByTurnId = new Map(input.azureBatch.perTurnMetrics.map((m) => [m.turnId, m]))
  const structured = input.structuredDialogue ?? undefined

  const { score: scenarioTask, usedGoalWeights } = scenarioTaskFromStructured(
    structured,
    ev.overallScores.scenarioCompletionScore,
  )

  const langParts = structured ? sessionLanguageFromStructured(structured) : sessionLanguageFromTurns(turns)
  const languageQuality = languageCompositeFromParts(langParts)

  const speechComponents = aggregateSpeechComponents(input.azureBatch.perTurnMetrics)
  const speechSession = speechComponents ? speechSessionFromComponents(speechComponents) : null

  const hadAudioTurns = input.azureBatch.turnResults.filter((r) => r.turnTiming.hadAudio).length
  const assessed = input.azureBatch.batch.assessedTurnCount
  const speechUnavailable = assessed === 0 || speechSession == null
  const speechPartial = !speechUnavailable && assessed > 0 && assessed < hadAudioTurns

  const scenarioWeight = speechUnavailable ? SESSION_NO_SPEECH.scenario : SESSION_WITH_SPEECH.scenario
  const languageWeight = speechUnavailable ? SESSION_NO_SPEECH.language : SESSION_WITH_SPEECH.language
  const speechWeight = speechUnavailable ? SESSION_NO_SPEECH.speech : SESSION_WITH_SPEECH.speech

  const finalOverallScore = clamp100(
    scenarioWeight * scenarioTask + languageWeight * languageQuality + speechWeight * (speechSession ?? 0),
  )

  const missingComponents: string[] = []
  if (!structured) missingComponents.push('structured_dialogue')
  if (!usedGoalWeights && structured?.goals?.length) missingComponents.push('goal_weight_sum_zero')
  if (speechUnavailable) missingComponents.push('speech_quality')
  if (!structured?.turns?.length && turns.length) missingComponents.push('structured_turn_rows')

  const diagnosticWarnings: string[] = []
  if (speechUnavailable) {
    diagnosticWarnings.push(
      'Speech quality unavailable — headline score uses 45% scenario / 55% language (no Azure-assessed turns).',
    )
  } else if (speechPartial) {
    diagnosticWarnings.push(
      `Speech quality partial — only ${assessed} of ${hadAudioTurns} audio turns were Azure-assessed; session speech score averages assessed turns only.`,
    )
  }

  const speechQualityStatus: ScenarioReportScoringDiagnosticsV1['speechQualityStatus'] = speechUnavailable
    ? 'unavailable'
    : speechPartial
      ? 'partial'
      : 'available'

  const structuredTurnById = new Map((structured?.turns ?? []).map((r) => [r.turnId, r]))

  const perTurnMergedScores: ScenarioReportPerTurnMergedScoreV1[] = []

  for (const t of turns) {
    const row = structuredTurnById.get(t.turnId)
    const languageTurn = row ? languageTurnFromStructuredRow(row) : languageTurnFromEvaluation(t)
    const m = metricsByTurnId.get(t.turnId)
    const speechTurn = m ? speechCompositeFromMetrics(m) : null
    const scenarioTurn = clamp100(row?.languageScores.taskRelevance ?? t.scenarioGoalFit.alignmentScore)

    const turnOverall = speechTurn != null
      ? clamp100(
          TURN_WITH_SPEECH.scenario * scenarioTurn +
            TURN_WITH_SPEECH.language * languageTurn +
            TURN_WITH_SPEECH.speech * speechTurn,
        )
      : clamp100(TURN_NO_SPEECH.scenario * scenarioTurn + TURN_NO_SPEECH.language * languageTurn)

    const mainFix = (row?.mainFix?.trim() || t.mainFixLine?.trim() || t.keyProblems?.find((x) => x?.trim()) || '').slice(
      0,
      500,
    )
    const correctedLine = (
      row?.correctedLine?.trim() ||
      t.languageEvaluation?.improvedVersion?.trim() ||
      ''
    ).slice(0, 2000)
    const strongerNaturalLine = (
      row?.strongerNaturalLine?.trim() ||
      t.naturalRewrite?.improved?.trim() ||
      ''
    ).slice(0, 2000)
    const practiceNext = (row?.practiceNext?.trim() || t.voiceDrillInstruction?.trim() || '').slice(0, 500)
    const wrongTokens = (t.wrongWordDetections ?? [])
      .map((w) => w.observedToken?.trim())
      .filter((x): x is string => Boolean(x))
    const weakWords = dedupeStrings(
      [
        ...(row?.weakPatterns ?? []),
        ...(m?.weakWords ?? []),
        ...(t.focusWords ?? []),
        ...wrongTokens,
      ],
      12,
    )

    t.combinedScores = {
      ...t.combinedScores,
      overallTurnScore: turnOverall,
    }
    if (row?.mainFix?.trim()) {
      t.mainFixLine = row.mainFix.trim().slice(0, 500)
    }

    if (!row) {
      missingComponents.push(`structured_turn:${t.turnId}`)
    }

    perTurnMergedScores.push({
      turnId: t.turnId,
      turnIndex: t.turnIndex,
      languageQualityTurn: languageTurn,
      speechQualityTurn: speechTurn,
      scenarioTaskTurn: scenarioTurn,
      turnOverall,
      mainFix,
      correctedLine,
      strongerNaturalLine,
      weakWords,
      practiceNext,
    })
  }

  const componentScores: ScenarioReportComponentScoresV1 = {
    scenarioTask,
    languageQuality,
    speechQuality: speechSession,
    language: langParts,
    speech: speechComponents,
  }

  const scoringDiagnostics: ScenarioReportScoringDiagnosticsV1 = {
    version: 1,
    finalOverallScore,
    scoreFormulaVersion: SCENARIO_REPORT_SCORE_FORMULA_VERSION,
    scenarioWeight,
    languageWeight,
    speechWeight,
    speechQualityStatus,
    componentScores,
    missingComponents: [...new Set(missingComponents)],
    fallbackWeightsUsed: speechUnavailable,
    diagnosticWarnings,
    referenceTts: { ...input.referenceTts },
    perTurnMergedScores,
  }

  ev.scenarioReportScoringDiagnosticsV1 = scoringDiagnostics
  ev.overall.overallScore = finalOverallScore
  ev.overallScores = {
    ...ev.overallScores,
    overallVoiceScore: finalOverallScore,
    pronunciationScore: speechComponents?.pronunciation ?? ev.overallScores.pronunciationScore ?? 0,
    fluencyScore: speechComponents?.fluency ?? ev.overallScores.fluencyScore ?? 0,
    conversationScore: langParts.conversationFlowTaskRelevance,
    vocabularyScore: langParts.vocabulary,
    grammarScore: langParts.grammar,
    pacingScore: speechComponents?.pacing ?? ev.overallScores.pacingScore ?? ev.overallScores.rhythmScore ?? 0,
  }
  ev.taskOutcome = {
    ...ev.taskOutcome,
    weightedCompletion: scenarioTask,
  }

  if (structured?.overall.primaryFocus) {
    const pf = structured.overall.primaryFocus
    ev.focusArea = {
      label: pf.title.trim().slice(0, 120),
      why: `Next session: ${pf.why.trim()}`.slice(0, 600),
      exampleLine: pf.example.trim().slice(0, 500),
      cta: 'practice_now',
    }
  }

  const coachBits = [`Score ${finalOverallScore}/100`, `task ${scenarioTask}`, `language ${languageQuality}`]
  coachBits.push(speechSession != null ? `speech ${speechSession}` : 'speech n/a')
  ev.coachSummaryLine = coachBits.join(' · ').slice(0, 320)

  const mergedBase = ev.mergedSpeakingReportV1
  if (mergedBase) {
    const patched = {
      ...mergedBase,
      mergedScores: {
        ...mergedBase.mergedScores,
        overall: finalOverallScore,
        scenarioSuccess: scenarioTask,
      },
      weightsSummary: `${SCENARIO_REPORT_SCORE_FORMULA_VERSION}: overall=${Math.round(scenarioWeight * 100)}%scenario+${Math.round(languageWeight * 100)}%language+${Math.round(speechWeight * 100)}%speech; merged_surface=legacy_dims`,
    }
    const parsed = MergedSpeakingReportV1Schema.safeParse(patched)
    if (parsed.success) {
      ev.mergedSpeakingReportV1 = parsed.data
    }
  }

  if (ev.generationDiagnostics?.parallelOrchestrationV1 && diagnosticWarnings.length) {
    const prev = ev.generationDiagnostics.parallelOrchestrationV1.warnings ?? []
    ev.generationDiagnostics.parallelOrchestrationV1.warnings = [
      ...new Set([...prev, ...diagnosticWarnings]),
    ]
  }

  if (input.normalizedSession.userTurns.length !== turns.length) {
    scoringDiagnostics.missingComponents.push('normalized_user_turn_count_mismatch')
    scoringDiagnostics.missingComponents = [...new Set(scoringDiagnostics.missingComponents)]
  }

  return { scoringDiagnostics }
}
