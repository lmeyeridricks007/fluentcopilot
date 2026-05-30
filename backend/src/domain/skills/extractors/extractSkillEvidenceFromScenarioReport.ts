import type { LiveSessionEvaluation } from '../../../services/speak-live/liveVoiceEvaluationTypes'
import type { SkillId } from '../skillTypes'
import type { SkillEvidenceAtom } from '../skillEvidenceAtomTypes'
import { matchSkillsFromFreeText } from '../sessionSkillEvidenceMapper'
import {
  confidenceFromScoredDimension,
  polarityFromQualityScore100,
  scoreDeltaFromQuality,
  severityFromQualityScore100,
  skillIdsForScoredDimension,
} from '../skillEvidenceReportMappingCore'

export type ScenarioSkillEvidenceParams = {
  userId: string
  sessionId: string
  createdAt: string
  evaluation: LiveSessionEvaluation
}

function pushComposite(
  out: SkillEvidenceAtom[],
  p: ScenarioSkillEvidenceParams,
  score: number | null | undefined,
  evidenceType: string,
  summary: string,
  skillIds: SkillId[],
): void {
  if (score == null || !Number.isFinite(score)) return
  const pol = polarityFromQualityScore100(score)
  if (pol === 'neutral') return
  const sev = severityFromQualityScore100(score)
  const conf = 0.62
  for (const skillId of skillIds.slice(0, 3)) {
    out.push({
      userId: p.userId,
      sessionId: p.sessionId,
      sessionType: 'speak_live',
      skillId,
      evidenceType,
      scoreDeltaCandidate: scoreDeltaFromQuality(score),
      confidence: conf,
      severity: Math.min(3, sev * (skillIds.length > 1 ? 0.9 : 1)),
      positiveOrNegative: pol,
      sourceSummary: summary.slice(0, 280),
      createdAt: p.createdAt,
    })
  }
}

export function extractSkillEvidenceFromScenarioReport(params: ScenarioSkillEvidenceParams): SkillEvidenceAtom[] {
  const out: SkillEvidenceAtom[] = []
  const ev = params.evaluation

  for (const dim of ev.overall?.dimensions ?? []) {
    if (dim.score == null) continue
    const pol = polarityFromQualityScore100(dim.score)
    if (pol === 'neutral') continue
    const skillIds = skillIdsForScoredDimension(dim)
    const conf = confidenceFromScoredDimension(dim.confidence)
    const sev = severityFromQualityScore100(dim.score)
    for (const skillId of skillIds.slice(0, 3)) {
      out.push({
        userId: params.userId,
        sessionId: params.sessionId,
        sessionType: 'speak_live',
        skillId,
        evidenceType: 'live_dimension',
        scoreDeltaCandidate: scoreDeltaFromQuality(dim.score),
        confidence: Math.max(0.28, conf * 0.95),
        severity: Math.min(3, sev * (skillIds.length > 1 ? 0.88 : 1)),
        positiveOrNegative: pol,
        sourceSummary: `${dim.id}: ${dim.label} (${dim.score})`.slice(0, 280),
        createdAt: params.createdAt,
      })
    }
  }

  const os = ev.overallScores
  if (os) {
    if (os.pronunciationScore != null) {
      pushComposite(
        out,
        params,
        os.pronunciationScore,
        'live_overall_scores_pronunciation',
        `Legacy pronunciationScore=${os.pronunciationScore}`,
        ['pronunciation', 'fluency'],
      )
    }
    if (os.fluencyScore != null) {
      pushComposite(out, params, os.fluencyScore, 'live_overall_scores_fluency', `fluencyScore=${os.fluencyScore}`, [
        'fluency',
        'pacing',
      ])
    }
    if (os.rhythmScore != null) {
      pushComposite(out, params, os.rhythmScore, 'live_overall_scores_rhythm', `rhythmScore=${os.rhythmScore}`, [
        'pacing',
        'fluency',
      ])
    }
    if (os.naturalnessScore != null) {
      pushComposite(
        out,
        params,
        os.naturalnessScore,
        'live_overall_scores_naturalness',
        `naturalnessScore=${os.naturalnessScore}`,
        ['natural_dutch', 'word_choice'],
      )
    }
    if (os.clarityScore != null) {
      pushComposite(out, params, os.clarityScore, 'live_overall_scores_clarity', `clarityScore=${os.clarityScore}`, [
        'fluency',
        'pronunciation',
      ])
    }
  }

  const st = ev.storytellingPerformance
  if (st?.compositeStorytellingScore != null) {
    pushComposite(
      out,
      params,
      st.compositeStorytellingScore,
      'live_storytelling_composite',
      `Storytelling composite ${st.compositeStorytellingScore}`,
      ['storytelling', 'sequencing', 'fluency'],
    )
  }

  const op = ev.opinionsDiscussionsPerformance
  if (op?.compositeOpinionsDiscussionsScore != null) {
    pushComposite(
      out,
      params,
      op.compositeOpinionsDiscussionsScore,
      'live_opinions_composite',
      `Opinions / discussions composite ${op.compositeOpinionsDiscussionsScore}`,
      ['opinions', 'reasoning', 'nuance'],
    )
  }

  for (const line of ev.scenarioOutcome?.whatToImproveNext ?? []) {
    const skills = matchSkillsFromFreeText(line)
    if (!skills.length) continue
    for (const skillId of skills.slice(0, 3)) {
      out.push({
        userId: params.userId,
        sessionId: params.sessionId,
        sessionType: 'speak_live',
        skillId,
        evidenceType: 'live_scenario_outcome_improve',
        scoreDeltaCandidate: -0.8,
        confidence: 0.5,
        severity: 1.85,
        positiveOrNegative: 'negative',
        sourceSummary: line.slice(0, 260),
        createdAt: params.createdAt,
      })
    }
  }

  for (const line of ev.scenarioOutcome?.whatWentWell ?? []) {
    const skills = matchSkillsFromFreeText(line)
    if (!skills.length) continue
    for (const skillId of skills.slice(0, 3)) {
      out.push({
        userId: params.userId,
        sessionId: params.sessionId,
        sessionType: 'speak_live',
        skillId,
        evidenceType: 'live_scenario_outcome_strength',
        scoreDeltaCandidate: 0.7,
        confidence: 0.48,
        severity: 1.35,
        positiveOrNegative: 'positive',
        sourceSummary: line.slice(0, 260),
        createdAt: params.createdAt,
      })
    }
  }

  const si = ev.sessionInsights
  if (si) {
    for (const area of si.weakestAreas ?? []) {
      for (const skillId of matchSkillsFromFreeText(area).slice(0, 3)) {
        out.push({
          userId: params.userId,
          sessionId: params.sessionId,
          sessionType: 'speak_live',
          skillId,
          evidenceType: 'live_session_insights_weak',
          scoreDeltaCandidate: -0.6,
          confidence: 0.42,
          severity: 1.9,
          positiveOrNegative: 'negative',
          sourceSummary: `Weakest area: ${area}`.slice(0, 260),
          createdAt: params.createdAt,
        })
      }
    }
    for (const area of si.strongestAreas ?? []) {
      for (const skillId of matchSkillsFromFreeText(area).slice(0, 3)) {
        out.push({
          userId: params.userId,
          sessionId: params.sessionId,
          sessionType: 'speak_live',
          skillId,
          evidenceType: 'live_session_insights_strong',
          scoreDeltaCandidate: 0.55,
          confidence: 0.4,
          severity: 1.25,
          positiveOrNegative: 'positive',
          sourceSummary: `Strongest area: ${area}`.slice(0, 260),
          createdAt: params.createdAt,
        })
      }
    }
  }

  const gsum = ev.overallSummary?.grammarConstructionSessionSummary
  if (gsum?.trim()) {
    for (const skillId of matchSkillsFromFreeText(gsum).slice(0, 3)) {
      out.push({
        userId: params.userId,
        sessionId: params.sessionId,
        sessionType: 'speak_live',
        skillId,
        evidenceType: 'live_grammar_session_summary',
        scoreDeltaCandidate: null,
        confidence: 0.45,
        severity: 1.7,
        positiveOrNegative: 'negative',
        sourceSummary: gsum.trim().slice(0, 260),
        createdAt: params.createdAt,
      })
    }
  }

  for (const line of ev.overallSummary?.whatToTryNext ?? []) {
    for (const skillId of matchSkillsFromFreeText(line).slice(0, 3)) {
      out.push({
        userId: params.userId,
        sessionId: params.sessionId,
        sessionType: 'speak_live',
        skillId,
        evidenceType: 'live_coach_what_to_try',
        scoreDeltaCandidate: -0.5,
        confidence: 0.38,
        severity: 1.55,
        positiveOrNegative: 'negative',
        sourceSummary: line.slice(0, 260),
        createdAt: params.createdAt,
      })
    }
  }

  return out
}
