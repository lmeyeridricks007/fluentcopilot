/**
 * Maps structured transcript JSON into the legacy `LiveEvalLlmSession` envelope
 * so the rest of the Speak Live orchestrator stays unchanged.
 */
import type { LiveEvalLlmSession, LiveEvalLlmTurn, LiveEvalLlmTurnInput } from './liveSessionEvaluationLlm'
import type { SpeakLiveStructuredTranscriptEvalRoot } from './speakLiveStructuredTranscriptEvalSchema'

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)))
}

function buildImprovementActionsForTurn(params: {
  corrections: { from: string; to: string; note?: string }[]
  scenarioTitle: string
  turnIndex: number
}): LiveEvalLlmTurn['improvementActions'] {
  const out: LiveEvalLlmTurn['improvementActions'] = []
  for (const c of params.corrections.slice(0, 4)) {
    out.push({
      type: 'save_natural_phrasing',
      title: `Replace “${c.from.slice(0, 40)}${c.from.length > 40 ? '…' : ''}” → “${c.to.slice(0, 40)}${c.to.length > 40 ? '…' : ''}”`,
      detail: (c.note ?? 'Structured transcript correction.').slice(0, 900),
      targetPhrase: c.to.slice(0, 500),
    })
  }
  if (out.length === 0) {
    out.push({
      type: 'scenario_follow_up',
      title: `Practice one line in ${params.scenarioTitle}`,
      detail: `Turn ${params.turnIndex + 1}: repeat the scenario focusing on clearer Dutch phrasing.`,
    })
  }
  return out.slice(0, 10)
}

export function mapStructuredTranscriptEvalToLiveEvalLlmSession(params: {
  structured: SpeakLiveStructuredTranscriptEvalRoot
  scenarioTitle: string
  scenarioGoals: string[]
  learnerLevel: string
  turns: LiveEvalLlmTurnInput[]
}): LiveEvalLlmSession {
  const { structured, scenarioTitle, scenarioGoals, learnerLevel, turns } = params
  if (structured.turns.length !== turns.length) {
    throw new Error(`structured.turns length ${structured.turns.length} !== input.turns ${turns.length}`)
  }
  for (let i = 0; i < turns.length; i++) {
    if (structured.turns[i]!.turnId !== turns[i]!.turnId) {
      throw new Error(`turnId mismatch at index ${i}: ${structured.turns[i]!.turnId} vs ${turns[i]!.turnId}`)
    }
  }

  const o = structured.overall
  const mappedTurns: LiveEvalLlmTurn[] = turns.map((t, i) => {
    const st = structured.turns[i]!
    const tx = t.learnerTranscript.trim()
    const ref =
      (st.strongerAlternative ?? '').trim() ||
      st.corrections[0]?.to?.trim() ||
      t.learnerTranscriptNormalized.trim() ||
      tx ||
      '…'
    const keyStrengths = st.feedback.slice(0, 4).filter(Boolean)
    const keyProblems = [
      ...st.weakPatterns.map((w) => w.trim()).filter(Boolean),
      ...st.corrections.map((c) => `${c.from} → ${c.to}`.trim()),
    ]
      .filter(Boolean)
      .slice(0, 10)

    const lang = {
      naturalness: clamp100(st.naturalnessScore),
      contextualFit: clamp100((st.vocabularyScore + st.sentenceStructureScore) / 2),
      registerFit: clamp100((st.naturalnessScore + st.grammarScore) / 2),
      grammaticalStability: clamp100(st.grammarScore),
    }

    const turnEval: LiveEvalLlmTurn = {
      turnId: st.turnId,
      referenceSentence: ref.slice(0, 4000),
      referenceKind: st.strongerAlternative?.trim() ? 'more_natural_dutch' : 'reference_pronunciation',
      referenceSentenceReason:
        'Structured transcript evaluation: alternative phrasing grounded in your line and the scenario.',
      scenarioGoalFit: {
        summary: `Alignment with scenario goals (structured pass).`,
        alignmentScore: clamp100(o.taskCompletion * 0.6 + st.naturalnessScore * 0.4),
        relevantGoals: scenarioGoals.slice(0, 8),
      },
      languageScores: lang,
      keyStrengths: keyStrengths.length ? keyStrengths : tx ? ['You produced Dutch in this turn.'] : [],
      keyProblems: keyProblems.length ? keyProblems : tx ? [] : ['No usable transcript for this turn.'],
      chunkingRhythmSuggestion: '',
      focusWords: st.weakPatterns.map((w) => w.slice(0, 80)).filter(Boolean).slice(0, 14),
      dutchLikenessNarrative: `Vocab ${clamp100(st.vocabularyScore)} · structure ${clamp100(st.sentenceStructureScore)} · naturalness ${clamp100(st.naturalnessScore)}.`.slice(
        0,
        380,
      ),
      improvementActions: buildImprovementActionsForTurn({
        corrections: st.corrections,
        scenarioTitle,
        turnIndex: t.turnIndex,
      }),
      wrongWordDetections: undefined,
      turnLanguageEvaluation: {
        grammarScore: clamp100(st.grammarScore),
        sentenceConstructionScore: clamp100(st.sentenceStructureScore),
        naturalnessScore: clamp100(st.naturalnessScore),
        levelFitScore: clamp100((st.grammarScore + st.naturalnessScore + st.vocabularyScore) / 3),
        whatWorked: st.feedback.slice(0, 6),
        grammarIssues: st.weakPatterns.filter((w) => /grammar|agreement|tense|verb|word order|article/i.test(w)).slice(0, 8),
        sentenceStructureIssues: st.weakPatterns
          .filter((w) => !/grammar|agreement|tense|verb|word order|article/i.test(w))
          .slice(0, 8),
        wordOrderNotes: [],
        questionFormNotes: [],
        verbTenseNotes: [],
        agreementNotes: [],
        improvedVersion: ref.slice(0, 4000),
        whyItIsBetter: st.feedback[0]?.slice(0, 2000) ?? 'See corrections and strongerAlternative for why this reads more naturally.',
        whyThisIsMoreNatural: st.feedback[1]?.slice(0, 2000),
        nextPatternToPractice: st.weakPatterns[0]?.slice(0, 800),
        learnerFacingGrammarLine: st.feedback.slice(0, 2).join(' ').slice(0, 900),
        levelBasedComment: `Structured evaluation vs target ${learnerLevel}; model estimate ${structured.overall.estimatedCEFR}.`.slice(
          0,
          2000,
        ),
        nextStepBeyondLevel: o.coachingPriorities[0]?.slice(0, 1200),
      },
    }
    return turnEval
  })

  const priorities = o.coachingPriorities.filter(Boolean)
  const recommendedFollowUps = priorities.slice(0, 8).map((p, idx) => ({
    type: 'coach_followup' as const,
    title: p.slice(0, 400),
    reason: `Coaching priority ${idx + 1} from structured transcript evaluation.`,
    linkedScenarioIdOptional: null,
    linkedPhraseOptional: null,
    linkedWordOptional: null,
  }))

  return {
    overallCoachSummary: priorities.slice(0, 3).join(' · ').slice(0, 2000) || `Session summary for ${scenarioTitle}.`,
    grammarConstructionSessionSummary: `Grammar (structured overall): ${clamp100(o.grammarOverall)}. Vocabulary: ${clamp100(o.vocabularyOverall)}.`.slice(
      0,
      2000,
    ),
    fluencyRhythmSummary: `Conversation flow (structured): ${clamp100(o.conversationFlow)}.`.slice(0, 1200),
    pronunciationSummary: `Follow-up quality (structured): ${clamp100(o.followUpQuality)}. Confidence: ${clamp100(o.confidence)}.`.slice(0, 1200),
    whatToTryNext: priorities.slice(0, 10).map((s) => s.slice(0, 500)),
    strongestAreas: o.strengths.map((s) => s.slice(0, 200)).slice(0, 8),
    weakestAreas: o.weaknesses.map((s) => s.slice(0, 200)).slice(0, 8),
    mostImportantNextStep: priorities[0]?.slice(0, 1200) ?? 'Retry the scenario once with the priority fixes above.',
    savedTrainingRecommendationsSummary: 'Save 1–2 corrected phrases from the turns above for spaced repetition.',
    turns: mappedTurns,
    recommendedFollowUps,
  }
}
