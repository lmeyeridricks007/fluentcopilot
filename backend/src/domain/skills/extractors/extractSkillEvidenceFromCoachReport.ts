import type { LiveSessionEvaluation } from '../../../services/speak-live/liveVoiceEvaluationTypes'
import type { SkillId } from '../skillTypes'
import type { SkillEvidenceAtom } from '../skillEvidenceAtomTypes'
import { matchSkillsFromFreeText } from '../sessionSkillEvidenceMapper'
import { clamp01 } from '../skillEvidenceReportMappingCore'

export type CoachSkillEvidenceParams = {
  userId: string
  sessionId: string
  createdAt: string
  evaluation: LiveSessionEvaluation
}

function severityFromCoachSeverity(s: string | undefined): number {
  const t = (s ?? '').toLowerCase()
  if (/high|strong|ernstig|zwaar/.test(t)) return 2.6
  if (/medium|matig/.test(t)) return 1.9
  if (/low|licht|mild/.test(t)) return 1.2
  return 1.65
}

function mapNudgeTypes(types: string[]): SkillId[] {
  const out: SkillId[] = []
  for (const raw of types) {
    const t = raw.toLowerCase()
    if (/pronun|sound|audio|woordstress/.test(t)) out.push('pronunciation', 'fluency')
    else if (/grammar|werkwoord|vorm/.test(t)) out.push('grammar', 'sentence_structure')
    else if (/woord|vocab|natural|phrasing/.test(t)) out.push('vocabulary', 'natural_dutch', 'word_choice')
    else if (/pause|pacing|fluency|flow|ritme/.test(t)) out.push('fluency', 'pacing', 'keeping_flow')
    else if (/question|follow|doorvrag/.test(t)) out.push('follow_up_questions', 'asking_questions')
    else if (/clarif|repair|repeat/.test(t)) out.push('repair_clarification')
    else out.push(...matchSkillsFromFreeText(raw))
  }
  return [...new Set(out)].slice(0, 4)
}

export function extractSkillEvidenceFromCoachReport(params: CoachSkillEvidenceParams): SkillEvidenceAtom[] {
  const debrief = params.evaluation.languageCoachDebrief
  if (!debrief) return []

  const out: SkillEvidenceAtom[] = []
  const base = {
    userId: params.userId,
    sessionId: params.sessionId,
    sessionType: 'speak_live' as const,
    createdAt: params.createdAt,
  }

  for (const w of debrief.weakPatterns ?? []) {
    const skills = matchSkillsFromFreeText(w)
    const skillIds = skills.length ? skills : (['natural_dutch', 'fluency'] as SkillId[])
    for (const skillId of skillIds.slice(0, 3)) {
      out.push({
        ...base,
        skillId,
        evidenceType: 'coach_debrief_weak_pattern',
        scoreDeltaCandidate: -0.85,
        confidence: 0.52,
        severity: 2.0,
        positiveOrNegative: 'negative',
        sourceSummary: w.slice(0, 260),
      })
    }
  }

  for (const s of debrief.strengths ?? []) {
    for (const skillId of matchSkillsFromFreeText(s).slice(0, 3)) {
      out.push({
        ...base,
        skillId,
        evidenceType: 'coach_debrief_strength',
        scoreDeltaCandidate: 0.75,
        confidence: 0.46,
        severity: 1.3,
        positiveOrNegative: 'positive',
        sourceSummary: s.slice(0, 260),
      })
    }
  }

  for (const row of debrief.nudgeSessionLog ?? []) {
    const skills = mapNudgeTypes(row.detectedIssueTypes ?? [])
    if (!skills.length) continue
    const sev = severityFromCoachSeverity(row.severity)
    const recovered = row.learnerRecoveredLater === true
    for (const skillId of skills.slice(0, 3)) {
      out.push({
        ...base,
        skillId,
        evidenceType: 'coach_nudge_log',
        scoreDeltaCandidate: recovered ? -0.25 : -0.9,
        confidence: clamp01(0.35 + (row.detectedIssueTypes?.length ?? 0) * 0.06),
        severity: recovered ? sev * 0.65 : sev,
        positiveOrNegative: recovered ? 'neutral' : 'negative',
        sourceSummary: `${row.nudgeType}: ${row.learnerOriginal}`.slice(0, 260),
      })
    }
  }

  for (const item of debrief.voiceWordCompareItems ?? []) {
    const acc = item.weakWord?.trim()
    if (!acc) continue
    out.push({
      ...base,
      skillId: 'vocabulary',
      evidenceType: 'coach_voice_word_compare',
      scoreDeltaCandidate: -0.7,
      confidence: 0.55,
      severity: 1.95,
      positiveOrNegative: 'negative',
      sourceSummary: `Weak word “${item.weakWord}” vs model: ${item.modelDutch}`.slice(0, 280),
    })
    out.push({
      ...base,
      skillId: 'pronunciation',
      evidenceType: 'coach_voice_word_compare',
      scoreDeltaCandidate: -0.55,
      confidence: 0.42,
      severity: 1.6,
      positiveOrNegative: 'negative',
      sourceSummary: `Clip phrasing: ${item.yourLine}`.slice(0, 220),
    })
  }

  const pf = debrief.pronunciationFluencyNote?.trim()
  if (pf) {
    for (const skillId of matchSkillsFromFreeText(pf).slice(0, 3)) {
      out.push({
        ...base,
        skillId,
        evidenceType: 'coach_pronunciation_fluency_note',
        scoreDeltaCandidate: null,
        confidence: 0.44,
        severity: 1.55,
        positiveOrNegative: /limit|unclear|weinig|geen audio|moeilijk te beoordelen/i.test(pf) ? 'neutral' : 'negative',
        sourceSummary: pf.slice(0, 260),
      })
    }
  }

  for (const line of debrief.followUpSuggestions ?? []) {
    const skills = matchSkillsFromFreeText(line)
    const skillIds = (skills.length ? skills : (['follow_up_questions', 'keeping_flow'] as SkillId[])).slice(0, 3)
    const soundsPositive = /goed gedaan|nice|strong|sterk|already|al goed/i.test(line)
    for (const skillId of skillIds) {
      out.push({
        ...base,
        skillId,
        evidenceType: 'coach_follow_up_suggestion',
        scoreDeltaCandidate: soundsPositive ? 0.4 : -0.55,
        confidence: 0.42,
        severity: soundsPositive ? 1.15 : 1.75,
        positiveOrNegative: soundsPositive ? 'positive' : 'negative',
        sourceSummary: line.slice(0, 260),
      })
    }
  }

  for (const line of debrief.voiceImprovementFindings ?? []) {
    for (const skillId of matchSkillsFromFreeText(line).slice(0, 3)) {
      out.push({
        ...base,
        skillId,
        evidenceType: 'coach_voice_improvement',
        scoreDeltaCandidate: -0.65,
        confidence: 0.48,
        severity: 1.75,
        positiveOrNegative: 'negative',
        sourceSummary: line.slice(0, 260),
      })
    }
  }

  const handoff = debrief.sessionHandoff
  if (handoff?.mostRepeatedWeakPattern?.trim()) {
    for (const skillId of matchSkillsFromFreeText(handoff.mostRepeatedWeakPattern).slice(0, 3)) {
      out.push({
        ...base,
        skillId,
        evidenceType: 'coach_handoff_weak_pattern',
        scoreDeltaCandidate: -1,
        confidence: 0.5,
        severity: 2.2,
        positiveOrNegative: 'negative',
        sourceSummary: handoff.mostRepeatedWeakPattern.slice(0, 260),
      })
    }
  }

  return out
}
