import type { LiveSessionEvaluation, TurnEvaluation } from './liveVoiceEvaluationTypes'
import type { SpeakLiveAzureSpeechTurnEvaluationV1 } from './speakLiveAzureSpeechEvaluationArtifact.schema'
import {
  MERGED_OVERALL_SCORE_WEIGHTS,
  MergedSpeakingReportV1Schema,
  mergedOverallWeightsSummary,
  type MergedSpeakingReportV1,
} from './speakLiveMergedSpeakingReport.schema'

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function avgFinite(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function normKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 160)
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

function isAzureSpeechV1(x: unknown): x is SpeakLiveAzureSpeechTurnEvaluationV1 {
  return Boolean(x && typeof x === 'object' && (x as { version?: unknown }).version === 1)
}

function turnFluencyScore(t: TurnEvaluation): number {
  const az = t.azureSpeechEvaluation
  if (isAzureSpeechV1(az)) {
    let base = az.fluency
    const pen = Math.min(14, (az.hesitationCount ?? 0) * 2.5) + (az.pacingDetail?.rushedEnding ? 6 : 0)
    return clamp100(base - pen)
  }
  if (t.signalSources.audioMetrics === 'azure_audio') {
    return clamp100(t.audioScores.fluency)
  }
  return clamp100((t.languageScores.naturalness * 0.55 + t.languageScores.contextualFit * 0.45))
}

function turnPronunciationScore(t: TurnEvaluation): number | null {
  const az = t.azureSpeechEvaluation
  if (isAzureSpeechV1(az)) return clamp100(az.pronunciation)
  if (t.signalSources.audioMetrics === 'azure_audio') return clamp100(t.audioScores.pronunciation)
  return null
}

function turnPacingScore(t: TurnEvaluation): number {
  const az = t.azureSpeechEvaluation
  if (isAzureSpeechV1(az)) return clamp100(az.pacing)
  if (t.signalSources.audioMetrics === 'azure_audio') return clamp100((t.audioScores.rhythm + t.audioScores.fluency) / 2)
  return clamp100(t.audioScores.rhythm)
}

function turnGrammarScore(t: TurnEvaluation): number {
  const le = t.languageEvaluation
  if (le) return clamp100(le.grammarScore)
  const tg = t.transcriptCoaching?.grammarScore
  if (typeof tg === 'number' && Number.isFinite(tg)) return clamp100(tg)
  return clamp100(t.languageScores.grammaticalStability)
}

function turnConversationScore(t: TurnEvaluation): number {
  return clamp100(
    t.languageScores.contextualFit * 0.62 + t.scenarioGoalFit.alignmentScore * 0.38,
  )
}

function turnVocabularyScore(t: TurnEvaluation, wrongWordPenalty: number): number {
  const base = (t.languageScores.naturalness + t.languageScores.registerFit) / 2
  return clamp100(base - wrongWordPenalty)
}

function coachingOneLiner(t: TurnEvaluation): string | null {
  const mf = t.mainFixLine?.trim()
  if (mf) return mf.slice(0, 320)
  const kp = t.keyProblems?.find((x) => x?.trim())
  if (kp) return kp.trim().slice(0, 320)
  const gl = t.languageEvaluation?.learnerFacingGrammarLine?.trim()
  if (gl) return gl.slice(0, 320)
  return null
}

function countGrammarIssueFrequency(turns: TurnEvaluation[]): string[] {
  const counts = new Map<string, number>()
  const bump = (raw: string | null | undefined) => {
    const s = raw?.trim()
    if (!s || s.length < 4) return
    const k = normKey(s)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  for (const t of turns) {
    for (const g of t.languageEvaluation?.grammarIssues ?? []) bump(g)
    for (const s of t.languageEvaluation?.sentenceStructureIssues ?? []) bump(s)
    for (const issue of t.transcriptCoaching?.issues ?? []) {
      const area = issue.area?.toLowerCase() ?? ''
      if (area.includes('grammar') || area.includes('word order') || area.includes('verb')) {
        bump(`${issue.area}: ${issue.issue}`)
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, c]) => c >= 2)
    .slice(0, 12)
    .map(([label]) => label.slice(0, 280))
}

function collectHesitationPatterns(turns: TurnEvaluation[]): string[] {
  const out: string[] = []
  for (const t of turns) {
    const az = t.azureSpeechEvaluation
    if (!isAzureSpeechV1(az)) continue
    const idx = t.turnIndex + 1
    if (az.hesitationCount >= 3) {
      out.push(
        `Turn ${idx}: several short pauses (${az.hesitationCount}) — plan the next phrase before you speak.`,
      )
    }
    const pd = az.pacingDetail
    if (pd && pd.pauseCount >= 4 && pd.avgPauseMs >= 550) {
      out.push(
        `Turn ${idx}: longer thinking pauses (avg ${Math.round(pd.avgPauseMs)} ms) — one breath, then continue.`,
      )
    }
    if (pd?.rushedEnding) {
      out.push(`Turn ${idx}: last words sound rushed — add a micro-pause before the final stress.`)
    }
  }
  return dedupeStrings(out, 10)
}

function collectWeakWords(turns: TurnEvaluation[]): string[] {
  const words: string[] = []
  for (const t of turns) {
    const az = t.azureSpeechEvaluation
    if (isAzureSpeechV1(az)) {
      for (const w of az.weakWords ?? []) words.push(w)
      for (const pi of az.phonemeIssues ?? []) words.push(pi.word)
    }
    for (const w of t.focusWords ?? []) words.push(w)
    for (const w of t.audioCoaching?.evidence?.weakWords ?? []) words.push(w)
    for (const ww of t.wrongWordDetections ?? []) {
      if (ww.observedToken?.trim()) words.push(ww.observedToken.trim())
    }
  }
  return dedupeStrings(words, 40)
}

function collectPronunciationIssueLines(turns: TurnEvaluation[]): string[] {
  const lines: string[] = []
  for (const t of turns) {
    const az = t.azureSpeechEvaluation
    if (isAzureSpeechV1(az)) {
      for (const pi of az.phonemeIssues ?? []) {
        lines.push(`${pi.word}: ${pi.phoneme} (${Math.round(pi.accuracyScore)})`)
      }
    }
    for (const p of t.pronunciationIssues ?? []) {
      lines.push(`${p.word} — ${p.issue}`)
    }
  }
  return dedupeStrings(lines, 20)
}

function collectPacingIssueLines(turns: TurnEvaluation[]): string[] {
  const lines: string[] = []
  for (const t of turns) {
    const az = t.azureSpeechEvaluation
    if (!isAzureSpeechV1(az)) continue
    const pd = az.pacingDetail
    if (pd?.rushedEnding) lines.push(`Rushed ending (turn ${t.turnIndex + 1})`)
    if (pd && pd.longestPauseMs >= 1400) {
      lines.push(`Very long pause ~${Math.round(pd.longestPauseMs)} ms (turn ${t.turnIndex + 1})`)
    }
  }
  return dedupeStrings(lines, 12)
}

function collectVocabularyGaps(turns: TurnEvaluation[]): string[] {
  const gaps: string[] = []
  for (const t of turns) {
    for (const ww of t.wrongWordDetections ?? []) {
      const obs = ww.observedToken?.trim()
      const sug = ww.suggestedCorrection?.trim()
      if (obs && sug) gaps.push(`${obs} → ${sug}`)
      else if (obs) gaps.push(obs)
    }
  }
  return dedupeStrings(gaps, 28)
}

function collectSuggestedDrills(ev: LiveSessionEvaluation): string[] {
  const drills: string[] = []
  for (const t of ev.turnEvaluations ?? []) {
    for (const d of t.recommendedDrills ?? []) {
      if (d.title?.trim()) drills.push(d.title.trim())
    }
    for (const a of t.improvementActions ?? []) {
      if (a.title?.trim()) drills.push(a.title.trim())
    }
  }
  for (const line of ev.overallSummary?.whatToTryNext ?? []) {
    if (line?.trim()) drills.push(line.trim())
  }
  for (const f of ev.recommendedFollowUps ?? []) {
    if (f.title?.trim()) drills.push(f.title.trim())
  }
  return dedupeStrings(drills, 18)
}

function collectNextScenarios(ev: LiveSessionEvaluation): string[] {
  const titles: string[] = []
  for (const f of ev.recommendedFollowUps ?? []) {
    const t = f.type?.toLowerCase() ?? ''
    if (t.includes('scenario') || f.linkedScenarioIdOptional) {
      if (f.title?.trim()) titles.push(f.title.trim())
    }
  }
  return dedupeStrings(titles, 10)
}

function blendedOverall(scores: MergedSpeakingReportV1['mergedScores']): number {
  const w = MERGED_OVERALL_SCORE_WEIGHTS
  return clamp100(
    scores.pronunciation * w.pronunciation +
      scores.fluency * w.fluency +
      scores.conversation * w.conversation +
      scores.vocabulary * w.vocabulary +
      scores.grammar * w.grammar +
      scores.pacing * w.pacing +
      scores.scenarioSuccess * w.scenarioSuccess,
  )
}

/**
 * Compose unified premium report from transcript evaluation, Azure Speech, and scenario signals.
 */
export function composeMergedSpeakingReportV1(ev: LiveSessionEvaluation): MergedSpeakingReportV1 {
  const turns = ev.turnEvaluations ?? []
  const pronVals: number[] = []
  const fluVals: number[] = []
  const convVals: number[] = []
  const vocabVals: number[] = []
  const gramVals: number[] = []
  const paceVals: number[] = []

  const turnLevelSnapshots: MergedSpeakingReportV1['turnLevelSnapshots'] = []

  for (const t of turns) {
    const wrongN = t.wrongWordDetections?.length ?? 0
    const wrongPen = Math.min(18, wrongN * 5)
    const pr = turnPronunciationScore(t)
    if (pr !== null) pronVals.push(pr)
    const fl = turnFluencyScore(t)
    fluVals.push(fl)
    const conv = turnConversationScore(t)
    convVals.push(conv)
    vocabVals.push(turnVocabularyScore(t, wrongPen))
    gramVals.push(turnGrammarScore(t))
    const pace = turnPacingScore(t)
    paceVals.push(pace)

    turnLevelSnapshots.push({
      turnId: t.turnId,
      turnIndex: t.turnIndex,
      pronunciation: pr,
      fluency: fl,
      conversation: conv,
      grammar: turnGrammarScore(t),
      pacing: pace,
      scenarioAlignment: clamp100(t.scenarioGoalFit.alignmentScore),
      coachingOneLiner: coachingOneLiner(t),
    })
  }

  const scenarioSuccess = clamp100(ev.overallScores.scenarioCompletionScore)
  const pronunciation = pronVals.length ? clamp100(avgFinite(pronVals)) : clamp100(ev.overallScores.pronunciationScore ?? ev.overallScores.clarityScore)
  const fluency = fluVals.length ? clamp100(avgFinite(fluVals)) : clamp100(ev.overallScores.fluencyScore ?? ev.overallScores.naturalnessScore)
  const conversation = convVals.length ? clamp100(avgFinite(convVals)) : clamp100(ev.sessionInsights?.overallNaturalness ?? ev.overallScores.naturalnessScore)
  const vocabulary = vocabVals.length ? clamp100(avgFinite(vocabVals)) : clamp100(ev.overallScores.naturalnessScore)
  const grammar = gramVals.length ? clamp100(avgFinite(gramVals)) : clamp100(ev.sessionInsights?.overallGrammarSentenceScore ?? ev.overallScores.naturalnessScore)
  const pacing = paceVals.length ? clamp100(avgFinite(paceVals)) : clamp100(ev.overallScores.rhythmScore ?? ev.overallScores.fluencyScore ?? 60)

  let mergedScores: MergedSpeakingReportV1['mergedScores'] = {
    overall: 0,
    pronunciation,
    fluency,
    conversation,
    vocabulary,
    grammar,
    pacing,
    scenarioSuccess,
  }
  mergedScores = { ...mergedScores, overall: blendedOverall(mergedScores) }

  const si = ev.sessionInsights
  const strengths = dedupeStrings(
    [
      ...(si?.strongestAreas ?? []),
      ...(ev.scenarioOutcome?.whatWentWell ?? []),
      ...turns.flatMap((t) => t.keyStrengths ?? []),
    ],
    12,
  )
  const weaknesses = dedupeStrings(
    [
      ...(si?.weakestAreas ?? []),
      ...(ev.scenarioOutcome?.whatToImproveNext ?? []),
      ...turns.flatMap((t) => t.keyProblems ?? []),
    ],
    16,
  )

  const weakWords = collectWeakWords(turns)
  const recurringGrammarIssues = countGrammarIssueFrequency(turns)
  const hesitationPatterns = collectHesitationPatterns(turns)
  const suggestedDrills = collectSuggestedDrills(ev)
  const recommendedNextScenarios = collectNextScenarios(ev)

  const adaptiveLearningSignalsV1: MergedSpeakingReportV1['adaptiveLearningSignalsV1'] = {
    weakPatterns: dedupeStrings(weaknesses, 20).slice(0, 20),
    pronunciationIssues: collectPronunciationIssueLines(turns),
    pacingIssues: collectPacingIssueLines(turns),
    vocabularyGaps: collectVocabularyGaps(turns),
  }

  return {
    version: 1,
    mergedAt: new Date().toISOString(),
    mergedScores,
    insights: {
      strengths,
      weaknesses,
      weakWords,
      recurringGrammarIssues,
      hesitationPatterns,
      suggestedDrills,
      recommendedNextScenarios,
    },
    adaptiveLearningSignalsV1,
    turnLevelSnapshots,
    weightsSummary: mergedOverallWeightsSummary(),
  }
}

/**
 * Validates, attaches {@link LiveSessionEvaluation.mergedSpeakingReportV1}, and extends {@link LiveSessionEvaluation.overallScores}
 * with merged dimension scores for optional UI / analytics.
 */
export function applyMergedSpeakingReportToLiveSessionEvaluation(ev: LiveSessionEvaluation): void {
  const composed = composeMergedSpeakingReportV1(ev)
  const parsed = MergedSpeakingReportV1Schema.safeParse(composed)
  if (!parsed.success) {
    console.warn('[MergedSpeakingReport] schema validation failed', parsed.error.flatten())
    return
  }
  ev.mergedSpeakingReportV1 = parsed.data
  ev.overallScores = {
    ...ev.overallScores,
    conversationScore: parsed.data.mergedScores.conversation,
    vocabularyScore: parsed.data.mergedScores.vocabulary,
    grammarScore: parsed.data.mergedScores.grammar,
    pacingScore: parsed.data.mergedScores.pacing,
  }
}
