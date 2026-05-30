import type { ConversationSummary, FeedbackItem } from '../../../models/contracts'
import type { SkillId } from '../skillTypes'
import type { SkillEvidenceAtom } from '../skillEvidenceAtomTypes'
import { matchSkillsFromFreeText } from '../sessionSkillEvidenceMapper'
import { clamp01 } from '../skillEvidenceReportMappingCore'

export type ChatSkillEvidenceParams = {
  userId: string
  sessionId: string
  createdAt: string
  summary: ConversationSummary
  feedback: FeedbackItem[]
}

function feedbackCategorySkills(category: string): SkillId[] {
  const c = category.toLowerCase()
  if (c.includes('pronun')) return ['pronunciation', 'fluency']
  if (c.includes('grammar')) return ['grammar', 'sentence_structure']
  if (c.includes('rhythm') || c.includes('pace')) return ['pacing', 'fluency']
  if (c.includes('fluency')) return ['fluency', 'pacing']
  if (c.includes('natural')) return ['natural_dutch', 'word_choice']
  if (c.includes('scenario')) return ['keeping_flow', 'asking_questions']
  if (c.includes('prosody')) return ['fluency', 'pronunciation']
  return matchSkillsFromFreeText(category)
}

function feedbackSeverity01(sev: string | undefined): number {
  const t = (sev ?? '').toLowerCase()
  if (/high|major|ernstig/.test(t)) return 0.82
  if (/medium|moderate/.test(t)) return 0.58
  if (/low|minor|licht/.test(t)) return 0.38
  return 0.5
}

export function extractSkillEvidenceFromChatReport(params: ChatSkillEvidenceParams): SkillEvidenceAtom[] {
  const out: SkillEvidenceAtom[] = []
  const base = {
    userId: params.userId,
    sessionId: params.sessionId,
    sessionType: 'text_conversation' as const,
    createdAt: params.createdAt,
  }
  const sum = params.summary

  for (const line of sum.whatToImprove ?? []) {
    for (const skillId of matchSkillsFromFreeText(line).slice(0, 3)) {
      out.push({
        ...base,
        skillId,
        evidenceType: 'chat_summary_improve',
        scoreDeltaCandidate: -0.75,
        confidence: 0.48,
        severity: 1.85,
        positiveOrNegative: 'negative',
        sourceSummary: line.slice(0, 260),
      })
    }
  }

  for (const line of sum.whatWentWell ?? []) {
    for (const skillId of matchSkillsFromFreeText(line).slice(0, 3)) {
      out.push({
        ...base,
        skillId,
        evidenceType: 'chat_summary_strength',
        scoreDeltaCandidate: 0.65,
        confidence: 0.44,
        severity: 1.25,
        positiveOrNegative: 'positive',
        sourceSummary: line.slice(0, 260),
      })
    }
  }

  for (const line of sum.languageNotes ?? []) {
    for (const skillId of matchSkillsFromFreeText(line).slice(0, 3)) {
      out.push({
        ...base,
        skillId,
        evidenceType: 'chat_language_note',
        scoreDeltaCandidate: -0.55,
        confidence: 0.42,
        severity: 1.6,
        positiveOrNegative: 'negative',
        sourceSummary: line.slice(0, 260),
      })
    }
  }

  for (const line of sum.dutchUpgrade ?? []) {
    for (const skillId of matchSkillsFromFreeText(line).slice(0, 3)) {
      out.push({
        ...base,
        skillId,
        evidenceType: 'chat_dutch_upgrade',
        scoreDeltaCandidate: -0.5,
        confidence: 0.4,
        severity: 1.5,
        positiveOrNegative: 'negative',
        sourceSummary: line.slice(0, 260),
      })
    }
  }

  const nextStep = (sum.recommendedNextStep ?? sum.suggestedNextAction ?? '').trim()
  if (nextStep) {
    for (const skillId of matchSkillsFromFreeText(nextStep).slice(0, 2)) {
      out.push({
        ...base,
        skillId,
        evidenceType: 'chat_next_step',
        scoreDeltaCandidate: -0.45,
        confidence: 0.36,
        severity: 1.45,
        positiveOrNegative: 'negative',
        sourceSummary: nextStep.slice(0, 260),
      })
    }
  }

  for (const ph of sum.pronunciationHighlights ?? []) {
    const bundle = `${ph.phrase} ${ph.tip}`
    out.push({
      ...base,
      skillId: 'pronunciation',
      evidenceType: 'chat_pronunciation_highlight',
      scoreDeltaCandidate: -0.6,
      confidence: 0.5,
      severity: 1.7,
      positiveOrNegative: 'negative',
      sourceSummary: bundle.slice(0, 260),
    })
  }

  for (const fb of params.feedback) {
    const skills = feedbackCategorySkills(fb.category)
    const skillIds = skills.length ? skills : matchSkillsFromFreeText(`${fb.explanation} ${fb.correctedText}`)
    const conf = feedbackSeverity01(fb.severity)
    const sev = 1.2 + conf * 1.6
    for (const skillId of skillIds.slice(0, 3)) {
      out.push({
        ...base,
        skillId,
        evidenceType: 'chat_turn_feedback',
        scoreDeltaCandidate: -0.7,
        confidence: clamp01(conf),
        severity: Math.min(3, sev),
        positiveOrNegative: 'negative',
        sourceSummary: `${fb.category}: ${fb.explanation}`.slice(0, 280),
      })
    }
  }

  return out
}
