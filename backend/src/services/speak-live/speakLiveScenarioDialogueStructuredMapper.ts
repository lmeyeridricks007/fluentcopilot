/**
 * Maps {@link ScenarioDialogueStructuredOutput} into {@link LiveEvalLlmSession} for the existing orchestrator.
 * Only **user** turns appear in `structured.turns`; order must match `userTurnInputs`.
 */
import type { LiveEvalLlmSession, LiveEvalLlmTurn, LiveEvalLlmTurnInput } from './liveSessionEvaluationLlm'
import type { ScenarioDialogueStructuredOutput } from './speakLiveScenarioDialogueStructured.schema'

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)))
}

function isGenericMainFix(s: string): boolean {
  const t = s.trim().toLowerCase()
  if (!t) return true
  return (
    t === 'cover this scenario goal.' ||
    t === 'cover this scenario goal' ||
    t === 'cover the scenario goal.' ||
    t === 'cover the scenario goal' ||
    t.includes('cover this scenario goal')
  )
}

function resolveMainFix(params: {
  mainFix: string
  strongerNaturalLine: string
  correctedLine: string
  learnerTranscript: string
}): string {
  const raw = params.mainFix.trim()
  if (!isGenericMainFix(raw)) return raw
  const line = (params.strongerNaturalLine || params.correctedLine || '').trim()
  if (line) {
    return `Use this clearer Dutch line for your intent: “${line.slice(0, 220)}${line.length > 220 ? '…' : ''}”.`
  }
  if (params.learnerTranscript.trim()) {
    return 'Keep your meaning, but tighten word choice to match this scenario naturally in Dutch.'
  }
  return ''
}

function mapPracticeTypeToFollowUp(
  t: ScenarioDialogueStructuredOutput['recommendations']['suggestedPracticeType'],
): LiveEvalLlmSession['recommendedFollowUps'][number]['type'] {
  switch (t) {
    case 'scenario_retry':
      return 'repeat_scenario'
    case 'word_drill':
      return 'library_word'
    case 'sentence_drill':
      return 'sentence_drill'
    case 'coach':
      return 'coach_followup'
    case 'read_aloud':
      return 'phrase_drill'
    case 'listening':
      return 'phrase_drill'
    default:
      return 'coach_followup'
  }
}

export function mapScenarioDialogueStructuredToLiveEvalLlmSession(params: {
  structured: ScenarioDialogueStructuredOutput
  scenarioTitle: string
  scenarioGoals: string[]
  learnerLevel: string
  userTurnInputs: LiveEvalLlmTurnInput[]
}): LiveEvalLlmSession {
  const { structured, scenarioTitle, scenarioGoals, learnerLevel, userTurnInputs } = params
  if (structured.turns.length !== userTurnInputs.length) {
    throw new Error(
      `scenarioDialogue.turns length ${structured.turns.length} !== user turns ${userTurnInputs.length}`,
    )
  }
  for (let i = 0; i < userTurnInputs.length; i++) {
    if (structured.turns[i]!.turnId !== userTurnInputs[i]!.turnId) {
      throw new Error(
        `turnId mismatch at ${i}: model=${structured.turns[i]!.turnId} expected=${userTurnInputs[i]!.turnId}`,
      )
    }
  }

  const o = structured.overall
  const mappedTurns: LiveEvalLlmTurn[] = userTurnInputs.map((t, i) => {
    const st = structured.turns[i]!
    const ls = st.languageScores
    const ref = (st.strongerNaturalLine || st.correctedLine || t.learnerTranscript).trim().slice(0, 4000)
    const resolvedMainFix = resolveMainFix({
      mainFix: st.mainFix,
      strongerNaturalLine: st.strongerNaturalLine,
      correctedLine: st.correctedLine,
      learnerTranscript: t.learnerTranscript,
    })
    const keyStrengths = st.whatLanded.map((s) => s.trim()).filter(Boolean).slice(0, 8)
    const keyProblems = [
      ...st.tightenNext.map((s) => s.trim()).filter(Boolean),
      ...st.weakPatterns.map((w) => w.trim()).filter(Boolean),
      resolvedMainFix ? `Main fix: ${resolvedMainFix}` : '',
    ]
      .filter(Boolean)
      .slice(0, 10)

    const lang = {
      naturalness: clamp100(ls.naturalness),
      contextualFit: clamp100((ls.vocabulary + ls.taskRelevance) / 2),
      registerFit: clamp100((ls.naturalness + ls.grammar) / 2),
      grammaticalStability: clamp100(ls.grammar),
    }

    const improvementActions: LiveEvalLlmTurn['improvementActions'] = []
    if (st.saveablePhrase?.trim()) {
      improvementActions.push({
        type: 'save_phrase',
        title: `Save: “${st.saveablePhrase.trim().slice(0, 48)}${st.saveablePhrase.length > 48 ? '…' : ''}”`,
        detail: st.practiceNext.trim().slice(0, 900) || 'Add this phrase to your practice queue.',
        targetPhrase: st.saveablePhrase.trim().slice(0, 500),
      })
    }
    improvementActions.push({
      type: 'scenario_follow_up',
      title: st.practiceNext.trim().slice(0, 240) || `One focus for ${scenarioTitle}`,
      detail: resolvedMainFix.slice(0, 900) || 'Repeat the scenario applying the main fix above.',
    })

    const turnEval: LiveEvalLlmTurn = {
      turnId: st.turnId as LiveEvalLlmTurn['turnId'],
      referenceSentence: ref,
      referenceKind: st.strongerNaturalLine.trim().length > 0 ? 'more_natural_dutch' : 'reference_pronunciation',
      referenceSentenceReason: o.primaryFocus.why.slice(0, 1500),
      scenarioGoalFit: {
        summary: o.summary.slice(0, 900),
        alignmentScore: clamp100((ls.taskRelevance + o.taskCompletionScore) / 2),
        relevantGoals: scenarioGoals.slice(0, 8),
      },
      languageScores: lang,
      keyStrengths: keyStrengths.length ? keyStrengths : t.learnerTranscript.trim() ? ['You used Dutch in this moment.'] : [],
      keyProblems: keyProblems.length ? keyProblems : [],
      chunkingRhythmSuggestion: '',
      focusWords: st.weakPatterns.map((w) => w.slice(0, 80)).filter(Boolean).slice(0, 14),
      dutchLikenessNarrative: `Grammar ${clamp100(ls.grammar)} · vocab ${clamp100(ls.vocabulary)} · naturalness ${clamp100(ls.naturalness)} · task fit ${clamp100(ls.taskRelevance)}.`.slice(0, 380),
      improvementActions: improvementActions.slice(0, 10),
      wrongWordDetections: undefined,
      turnLanguageEvaluation: {
        grammarScore: clamp100(ls.grammar),
        sentenceConstructionScore: clamp100(ls.sentenceStructure),
        naturalnessScore: clamp100(ls.naturalness),
        levelFitScore: clamp100((ls.grammar + ls.naturalness + ls.vocabulary) / 3),
        whatWorked: st.whatLanded.slice(0, 6),
        grammarIssues: st.weakPatterns.filter((w) => /grammar|agreement|tense|verb|article|word order/i.test(w)).slice(0, 8),
        sentenceStructureIssues: st.weakPatterns
          .filter((w) => !/grammar|agreement|tense|verb|article|word order/i.test(w))
          .slice(0, 8),
        wordOrderNotes: [],
        questionFormNotes: [],
        verbTenseNotes: [],
        agreementNotes: [],
        improvedVersion: ref.slice(0, 4000),
        whyItIsBetter: resolvedMainFix.slice(0, 2000) || o.primaryFocus.why.slice(0, 2000),
        whyThisIsMoreNatural: o.primaryFocus.example.slice(0, 2000),
        nextPatternToPractice: o.primaryFocus.pattern.slice(0, 800),
        learnerFacingGrammarLine: resolvedMainFix.slice(0, 900) || o.primaryFocus.title.slice(0, 900),
        levelBasedComment: `Estimated ${structured.overall.estimatedLevel} vs target ${learnerLevel}: ${o.summary.slice(0, 400)}`.slice(
          0,
          2000,
        ),
        nextStepBeyondLevel: structured.recommendations.nextDrillReason.slice(0, 1200),
      },
    }
    return turnEval
  })

  const rec = structured.recommendations
  const recommendedFollowUps: LiveEvalLlmSession['recommendedFollowUps'] = [
    {
      type: mapPracticeTypeToFollowUp(rec.suggestedPracticeType),
      title: rec.nextDrillTitle.slice(0, 400),
      reason: rec.nextDrillReason.slice(0, 1200),
      linkedScenarioIdOptional: rec.suggestedScenarioId,
      linkedPhraseOptional: null,
      linkedWordOptional: null,
    },
  ]

  const goalLines = structured.goals.map((g) => `${g.title}: ${g.status} (${clamp100(g.score)})`).join(' · ')

  return {
    overallCoachSummary: o.summary.slice(0, 2000),
    grammarConstructionSessionSummary: `Session grammar ${clamp100(o.grammarScore)} · vocabulary ${clamp100(o.vocabularyScore)} · naturalness ${clamp100(o.naturalnessScore)}.`.slice(0, 2000),
    fluencyRhythmSummary: `Flow ${clamp100(o.conversationFlowScore)} · outcome ${clamp100(o.scenarioOutcomeScore)}.`.slice(0, 1200),
    pronunciationSummary: `Language bundle ${clamp100(o.languageScore)} · confidence ${clamp100(o.confidence)}.`.slice(0, 1200),
    whatToTryNext: [rec.nextDrillTitle, o.primaryFocus.title, ...structured.goals.map((g) => g.tryNext)].map((s) => s.trim()).filter(Boolean).slice(0, 10).map((s) => s.slice(0, 500)),
    strongestAreas: [o.primaryFocus.title, ...structured.goals.filter((g) => g.status === 'completed').map((g) => g.title)].slice(0, 8).map((s) => s.slice(0, 200)),
    weakestAreas: structured.goals.filter((g) => g.status === 'missed').map((g) => g.title).slice(0, 8).map((s) => s.slice(0, 200)),
    mostImportantNextStep: o.primaryFocus.title.slice(0, 1200),
    savedTrainingRecommendationsSummary: goalLines.slice(0, 2000),
    turns: mappedTurns,
    recommendedFollowUps,
  }
}
