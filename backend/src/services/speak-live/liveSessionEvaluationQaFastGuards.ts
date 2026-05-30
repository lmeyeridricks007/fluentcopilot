import type { LiveSessionEvaluation, TurnEvaluation } from './liveVoiceEvaluationTypes'

export type FastGuardIssueCode =
  | 'missing_core_section'
  | 'score_out_of_range'
  | 'no_user_turn_evaluation'
  | 'impossible_goal_percentage'
  | 'duplicate_feedback_block'
  | 'missing_improved_version_for_major_issue'
  | 'speech_scoring_unavailable_unmarked'
  | 'empty_main_focus'
  | 'assistant_turn_scored'

export type FastGuardIssue = {
  code: FastGuardIssueCode
  severity: 'rerun' | 'warn'
  message: string
  turnId?: string
  goalId?: string
}

/** Codes that justify rebuilding the full report (expensive). Keep this list tight. */
export const ORCHESTRATOR_RERUN_ISSUE_CODES = new Set<FastGuardIssueCode>([
  'missing_core_section',
  'score_out_of_range',
  'no_user_turn_evaluation',
])

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function isScoreFieldInvalid(n: unknown): boolean {
  return typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 100
}

/**
 * Deterministic numeric hygiene: clamp 0–100 everywhere we surface bounded scores.
 * Does not clear NaN sources that need a rebuild — those are flagged separately.
 */
export function clampReportScoresInPlace(evaluation: LiveSessionEvaluation, rulesTriggered: string[]): string[] {
  const fixes: string[] = []

  const clampObj = (label: string, obj: Record<string, unknown> | null | undefined, keys: string[]) => {
    if (!obj) return
    for (const k of keys) {
      const v = obj[k]
      if (typeof v !== 'number' || !Number.isFinite(v)) continue
      if (v < 0 || v > 100) {
        const next = clamp100(v)
        if (next !== v) {
          obj[k] = next
          fixes.push(`Clamped ${label}.${k} to 0–100.`)
          rulesTriggered.push(`repair:clamp_score:${label}.${k}`)
        }
      }
    }
  }

  clampObj('overall', evaluation.overall as unknown as Record<string, unknown>, ['overallScore'])
  clampObj(
    'overallScores',
    evaluation.overallScores as unknown as Record<string, unknown>,
    [
      'overallVoiceScore',
      'pronunciationScore',
      'fluencyScore',
      'rhythmScore',
      'clarityScore',
      'naturalnessScore',
      'scenarioCompletionScore',
      'confidenceEstimate',
      'conversationScore',
      'vocabularyScore',
      'grammarScore',
      'pacingScore',
    ],
  )

  if (evaluation.taskOutcome) {
    const t = evaluation.taskOutcome as unknown as Record<string, unknown>
    clampObj('taskOutcome', t, ['weightedCompletion', 'goalChecklistPercent'])
  }

  for (const turn of evaluation.turnEvaluations) {
    clampObj(`turn[${turn.turnIndex}].combinedScores`, turn.combinedScores as unknown as Record<string, unknown>, [
      'overallTurnScore',
      'clarityScore',
      'dutchLikenessScore',
    ])
    if (turn.audioScores) {
      clampObj(`turn[${turn.turnIndex}].audioScores`, turn.audioScores as unknown as Record<string, unknown>, [
        'pronunciation',
        'fluency',
        'rhythm',
        'completeness',
        'clarity',
      ])
    }
    if (turn.languageScores) {
      clampObj(`turn[${turn.turnIndex}].languageScores`, turn.languageScores as unknown as Record<string, unknown>, [
        'naturalness',
        'contextualFit',
        'registerFit',
        'grammaticalStability',
      ])
    }
    if (turn.scenarioGoalFit) {
      clampObj(`turn[${turn.turnIndex}].scenarioGoalFit`, turn.scenarioGoalFit as unknown as Record<string, unknown>, [
        'alignmentScore',
      ])
    }
    for (const d of turn.dimensions ?? []) {
      const o = d as unknown as Record<string, unknown>
      if (typeof o.score === 'number' && Number.isFinite(o.score) && (o.score < 0 || o.score > 100)) {
        o.score = clamp100(o.score)
        fixes.push(`Clamped dimension score for turn ${turn.turnIndex + 1}.`)
        rulesTriggered.push(`repair:clamp_score:turn[${turn.turnIndex}].dimension`)
      }
    }
  }

  for (const d of evaluation.overall?.dimensions ?? []) {
    const o = d as unknown as Record<string, unknown>
    if (typeof o.score === 'number' && Number.isFinite(o.score) && (o.score < 0 || o.score > 100)) {
      o.score = clamp100(o.score)
      fixes.push('Clamped overall dimension score.')
      rulesTriggered.push('repair:clamp_score:overall.dimension')
    }
  }

  return fixes
}

function hasTurnEvaluationShell(turn: TurnEvaluation): boolean {
  return Boolean(turn.combinedScores && typeof turn.combinedScores.overallTurnScore === 'number')
}

/**
 * Normalized check that maps both `language_coach` and `language-coach` slug variants to the
 * same shape signal. Kept local to avoid a cross-package import from `ai/config` into the QA
 * guards (this module must stay deterministic with zero AI-config dependency).
 */
function scenarioIdMarksLanguageCoach(scenarioId: string | null | undefined): boolean {
  if (!scenarioId) return false
  return scenarioId.trim().toLowerCase().replace(/-/g, '_') === 'language_coach'
}

/**
 * `languageCoachDebrief` is set exclusively by the Language Coach session evaluator
 * (`languageCoachSessionEvaluation.ts`) — never by the voice-scenario orchestrator. Its presence
 * is therefore a deterministic, ground-truth signal that this report uses the **free-form coach
 * shape** rather than the per-turn voice-scenario shape.
 *
 * Why this matters for QA: Language Coach reports legitimately publish `turnEvaluations: []`
 * because free-form chat has no per-turn scoring — its insights live in `languageCoachDebrief`
 * (`strengths`, `weakPatterns`, `coachOneLiner`, `voiceImprovementFindings`, …) plus
 * `overallScores`. Using the per-turn structural checks here would unconditionally fail every
 * coach session (observed live as “Report QA failed after retry: Report is missing
 * turnEvaluations.”). This helper lets the structural pass apply the right invariants to each
 * shape instead of papering over the difference with fabricated turn data.
 *
 * Defense in depth: `scenarioId === 'language_coach'` is a secondary, redundant signal so a
 * persisted-JSON corruption or a future producer regression that loses `languageCoachDebrief`
 * still routes the report through the correct (coach-shape) structural checks instead of
 * collapsing back to the voice-scenario rules that previously caused the outage. Both signals
 * are set together by the only producer that exists today, so the OR keeps current behavior
 * identical for healthy payloads while widening coverage of broken ones.
 */
export function isLanguageCoachReport(evaluation: LiveSessionEvaluation): boolean {
  if (evaluation.languageCoachDebrief != null) return true
  if (scenarioIdMarksLanguageCoach(evaluation.scenarioId)) return true
  return false
}

/** Learner turn has numeric shell, transcript layer, coaching text, or an explicit “why no audio” note. */
function turnHasEvaluationOrDocumentedSkip(turn: TurnEvaluation): boolean {
  if (hasTurnEvaluationShell(turn)) return true
  if ((turn.voiceAnalysisUnavailableMessage ?? '').trim().length >= 8) return true
  const tc = turn.transcriptCoaching
  if (
    tc.meaningClarityScore != null ||
    tc.grammarScore != null ||
    tc.naturalnessScore != null ||
    tc.levelFitScore != null ||
    (tc.strengths?.length ?? 0) > 0 ||
    (tc.issues?.length ?? 0) > 0
  ) {
    return true
  }
  if ((turn.mainFixLine ?? '').trim().length > 0) return true
  if ((turn.dutchLikenessNarrative ?? '').trim().length > 0) return true
  if ((turn.keyStrengths?.length ?? 0) + (turn.keyProblems?.length ?? 0) > 0) return true
  if ((turn.feedbackItems?.length ?? 0) > 0) return true
  return false
}

function collectInvalidBoundedScores(evaluation: LiveSessionEvaluation, rulesTriggered: string[]): FastGuardIssue[] {
  const out: FastGuardIssue[] = []
  const push = (label: string, v: unknown) => {
    if (v == null) return
    if (!isScoreFieldInvalid(v)) return
    out.push({
      code: 'score_out_of_range',
      severity: 'rerun',
      message: `${label} is invalid (${String(v)}).`,
    })
    rulesTriggered.push(`issue:score_out_of_range:${label}`)
  }

  push('overall.overallScore', evaluation.overall?.overallScore)
  const osKeys = [
    'overallVoiceScore',
    'pronunciationScore',
    'fluencyScore',
    'rhythmScore',
    'clarityScore',
    'naturalnessScore',
    'scenarioCompletionScore',
    'confidenceEstimate',
    'conversationScore',
    'vocabularyScore',
    'grammarScore',
    'pacingScore',
  ] as const
  const os = evaluation.overallScores as Record<string, unknown> | null | undefined
  if (os) {
    for (const k of osKeys) push(`overallScores.${k}`, os[k])
  }

  for (const turn of evaluation.turnEvaluations) {
    const idx = turn.turnIndex + 1
    push(`turn[${idx}].combinedScores.overallTurnScore`, turn.combinedScores?.overallTurnScore)
    push(`turn[${idx}].combinedScores.clarityScore`, turn.combinedScores?.clarityScore)
    push(`turn[${idx}].combinedScores.dutchLikenessScore`, turn.combinedScores?.dutchLikenessScore)
    push(`turn[${idx}].scenarioGoalFit.alignmentScore`, turn.scenarioGoalFit?.alignmentScore)
    const as = turn.audioScores as Record<string, unknown> | undefined
    if (as) {
      for (const k of ['pronunciation', 'fluency', 'rhythm', 'completeness', 'clarity'] as const) {
        push(`turn[${idx}].audioScores.${k}`, as[k])
      }
    }
    const ls = turn.languageScores as Record<string, unknown> | undefined
    if (ls) {
      for (const k of ['naturalness', 'contextualFit', 'registerFit', 'grammaticalStability'] as const) {
        push(`turn[${idx}].languageScores.${k}`, ls[k])
      }
    }
    for (const d of turn.pronunciationIssues ?? []) {
      if (typeof d.score === 'number') push(`turn[${idx}].pronunciationIssues[].score`, d.score)
    }
  }

  return out
}

export function collectFastStructuralQaIssues(
  evaluation: LiveSessionEvaluation,
  rulesTriggered: string[],
): FastGuardIssue[] {
  const issues: FastGuardIssue[] = []
  /**
   * Language Coach reports are a different shape than voice-scenario reports (no per-turn
   * scoring). Branch on this once so the structural checks below apply the right invariants to
   * the right shape without fabricating defaults to satisfy the wrong schema. See
   * {@link isLanguageCoachReport} for why we do not just gate on `turnEvaluations.length`.
   */
  const isLanguageCoach = isLanguageCoachReport(evaluation)
  if (isLanguageCoach) rulesTriggered.push('qa:report_shape:language_coach')

  issues.push(...collectInvalidBoundedScores(evaluation, rulesTriggered))

  if (!evaluation.keyTakeaway?.message?.trim()) {
    issues.push({
      code: 'missing_core_section',
      severity: 'rerun',
      message: 'Report is missing keyTakeaway.message.',
    })
    rulesTriggered.push('issue:missing_core_section:keyTakeaway')
  }

  if (!isLanguageCoach && !evaluation.turnEvaluations?.length) {
    /**
     * Voice scenarios MUST have per-turn evaluations. Language Coach reports legitimately
     * publish `turnEvaluations: []` — they are validated via the LC-specific checks below.
     */
    issues.push({
      code: 'missing_core_section',
      severity: 'rerun',
      message: 'Report is missing turnEvaluations.',
    })
    rulesTriggered.push('issue:missing_core_section:turnEvaluations')
  }

  if (isLanguageCoach) {
    /**
     * Language Coach equivalent of the per-turn structural checks: the report MUST surface
     * something the learner can act on after a free-form coach session. Without `coachOneLiner`
     * the debrief renders blank; without `focusAreaLabel` the "what to practice next" card has
     * no anchor. Both are populated by `languageCoachSessionEvaluation.ts` from real session
     * signals, so a missing value here means the upstream coach evaluator failed — which is
     * exactly the kind of issue that should trigger an orchestrator rerun.
     *
     * `languageCoachDebrief` itself can be absent when this code path was entered via the
     * defense-in-depth scenarioId signal (corrupt JSON / future producer regression). Treat
     * that as a "both fields missing" case so the orchestrator rerun has a clear, specific
     * reason to log instead of crashing on a non-null assertion.
     */
    const debrief = evaluation.languageCoachDebrief ?? null
    const coachOneLiner = debrief?.coachOneLiner?.trim() ?? ''
    const focusAreaLabel = debrief?.focusAreaLabel?.trim() ?? ''
    if (!coachOneLiner) {
      issues.push({
        code: 'missing_core_section',
        severity: 'rerun',
        message:
          debrief == null
            ? 'Language Coach report is missing languageCoachDebrief entirely (no coachOneLiner).'
            : 'Language Coach report is missing languageCoachDebrief.coachOneLiner.',
      })
      rulesTriggered.push('issue:missing_core_section:languageCoachDebrief.coachOneLiner')
    }
    if (!focusAreaLabel) {
      issues.push({
        code: 'missing_core_section',
        severity: 'rerun',
        message:
          debrief == null
            ? 'Language Coach report is missing languageCoachDebrief entirely (no focusAreaLabel).'
            : 'Language Coach report is missing languageCoachDebrief.focusAreaLabel.',
      })
      rulesTriggered.push('issue:missing_core_section:languageCoachDebrief.focusAreaLabel')
    }
  }

  if (!evaluation.taskOutcome) {
    issues.push({
      code: 'missing_core_section',
      severity: 'rerun',
      message: 'Report is missing taskOutcome.',
    })
    rulesTriggered.push('issue:missing_core_section:taskOutcome')
  }

  if (!evaluation.overall) {
    issues.push({
      code: 'missing_core_section',
      severity: 'rerun',
      message: 'Report is missing overall.',
    })
    rulesTriggered.push('issue:missing_core_section:overall')
  }

  const summary = evaluation.overallSummary as Record<string, unknown> | undefined
  if (!summary || typeof summary.coachSummary !== 'string' || !String(summary.coachSummary).trim()) {
    issues.push({
      code: 'missing_core_section',
      severity: 'rerun',
      message: 'Report is missing overallSummary.coachSummary.',
    })
    rulesTriggered.push('issue:missing_core_section:overallSummary.coachSummary')
  }

  const wc = evaluation.taskOutcome?.weightedCompletion
  if (wc != null && (typeof wc !== 'number' || !Number.isFinite(wc) || wc < 0 || wc > 100)) {
    issues.push({
      code: 'score_out_of_range',
      severity: 'rerun',
      message: `taskOutcome.weightedCompletion is invalid (${String(wc)}).`,
    })
    rulesTriggered.push('issue:score_out_of_range:weightedCompletion')
  }
  const gc = evaluation.taskOutcome?.goalChecklistPercent
  if (gc != null && (typeof gc !== 'number' || !Number.isFinite(gc) || gc < 0 || gc > 100)) {
    issues.push({
      code: 'score_out_of_range',
      severity: 'rerun',
      message: `taskOutcome.goalChecklistPercent is invalid (${String(gc)}).`,
    })
    rulesTriggered.push('issue:score_out_of_range:goalChecklistPercent')
  }

  const weights = (evaluation.taskOutcome?.goalEvidence ?? []).map((g) => g.weight).filter((w) => w != null) as number[]
  const sumW = weights.reduce((a, b) => a + b, 0)
  if (weights.length > 0 && (sumW < 0.98 || sumW > 1.02)) {
    issues.push({
      code: 'impossible_goal_percentage',
      severity: 'warn',
      message: `Goal weights sum to ${sumW.toFixed(3)} (expected ~1.0).`,
    })
    rulesTriggered.push('issue:impossible_goal_percentage:weight_sum')
  }

  /**
   * For voice scenarios the presence of learner turns without any per-turn evaluations means the
   * orchestrator dropped them — that is a rerun-worthy bug. Language Coach evaluations report a
   * non-zero `learnerTurnCount` (the chat had learner messages) but no per-turn evaluations by
   * design; for that shape this check would always fire, so skip it.
   */
  const learnerTurnsExpected = Math.max(0, evaluation.evidenceSummary?.totalLearnerTurnCount ?? evaluation.learnerTurnCount ?? 0)
  if (!isLanguageCoach && learnerTurnsExpected > 0 && evaluation.turnEvaluations.length === 0) {
    issues.push({
      code: 'no_user_turn_evaluation',
      severity: 'rerun',
      message: 'Session has learner turns but report contains no turn evaluations.',
    })
    rulesTriggered.push('issue:no_user_turn_evaluation:empty_turns')
  }

  for (const turn of evaluation.turnEvaluations) {
    const tx = (turn.learnerTranscript ?? '').trim()
    const looksUser = tx.length >= 2 || Boolean(turn.learnerAudioUrl ?? turn.originalAudioUrl)
    const hasAssistantCtx = (turn.assistantContext ?? '').trim().length > 12
    const hasAudio = Boolean(turn.learnerAudioUrl ?? turn.originalAudioUrl)
    const emptyLearner = tx.length < 2

    if (emptyLearner && hasAssistantCtx && !hasAudio && (turn.combinedScores?.overallTurnScore ?? 0) > 5) {
      issues.push({
        code: 'assistant_turn_scored',
        severity: 'warn',
        message: `Turn ${turn.turnIndex + 1} has little/no learner speech but assistant context and a non-trivial score.`,
        turnId: turn.turnId,
      })
      rulesTriggered.push(`issue:assistant_turn_scored:turn:${turn.turnId}`)
    }

    if (!looksUser) continue

    if (!turnHasEvaluationOrDocumentedSkip(turn)) {
      issues.push({
        code: 'no_user_turn_evaluation',
        severity: 'rerun',
        message: `Turn ${turn.turnIndex + 1} has learner content but no per-turn evaluation or documented skip reason.`,
        turnId: turn.turnId,
      })
      rulesTriggered.push(`issue:no_user_turn_evaluation:turn:${turn.turnId}`)
    }
  }

  const mainFixes = evaluation.turnEvaluations
    .map((t) => (t.mainFixLine ?? '').trim().toLowerCase())
    .filter(Boolean)
  const counts = new Map<string, number>()
  for (const m of mainFixes) counts.set(m, (counts.get(m) ?? 0) + 1)
  for (const [line, c] of counts) {
    if (c >= 2 && line.length > 12) {
      issues.push({
        code: 'duplicate_feedback_block',
        severity: 'warn',
        message: `Repeated main fix line appears on ${c} turns.`,
      })
      rulesTriggered.push('issue:duplicate_feedback_block:mainFixLine')
      break
    }
  }

  const hasHeavyGrammar = (turn: TurnEvaluation) =>
    (turn.languageEvaluation?.grammarIssues?.length ?? 0) > 0 ||
    (turn.keyProblems ?? []).some((p) => /grammar|woord|werkwoord|zin\b/i.test(p))

  for (const turn of evaluation.turnEvaluations) {
    if (!hasHeavyGrammar(turn)) continue
    const improved = (turn.languageEvaluation?.improvedVersion ?? '').trim()
    if (!improved) {
      issues.push({
        code: 'missing_improved_version_for_major_issue',
        severity: 'warn',
        message: `Turn ${turn.turnIndex + 1} flags grammar/vocab issues but is missing improvedVersion.`,
        turnId: turn.turnId,
      })
      rulesTriggered.push(`issue:missing_improved_version_for_major_issue:turn:${turn.turnId}`)
    }
  }

  const es = evaluation.evidenceSummary
  const azure = es?.azurePronunciationTurnCount ?? 0
  const sessionClaimsAudio = evaluation.sessionAudioMetricsAvailable
  if (sessionClaimsAudio && azure === 0 && (es?.audioTurnCount ?? 0) > 0) {
    issues.push({
      code: 'speech_scoring_unavailable_unmarked',
      severity: 'warn',
      message: 'Session claims audio metrics but Azure assessed zero pronunciation turns — clarify transcript-only state.',
    })
    rulesTriggered.push('issue:speech_scoring_unavailable_unmarked')
  }

  const focusLabel = (evaluation.focusArea?.label ?? evaluation.coachHeadline ?? '').trim()
  const hasCoachPressure =
    (evaluation.turnEvaluations ?? []).some((t) => (t.keyProblems?.length ?? 0) > 0) ||
    (evaluation.taskOutcome?.goalEvidence ?? []).some((g) => g.status === 'missed' && g.tier !== 'stretch')
  if (!focusLabel && hasCoachPressure) {
    issues.push({
      code: 'empty_main_focus',
      severity: 'warn',
      message: 'Report has coaching pressure but no focusArea.label or coachHeadline.',
    })
    rulesTriggered.push('issue:empty_main_focus')
  }

  return issues
}
