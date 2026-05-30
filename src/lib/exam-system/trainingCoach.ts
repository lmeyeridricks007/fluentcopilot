import type { ExamLevel, ExamScoringDimension, ExamTaskType, ExamTrainingSupport } from './types'
import { coachingVerbosity } from './trainingSupportPolicy'

export function trainingGoalLine(taskType: ExamTaskType, _level: ExamLevel): string {
  const byType: Partial<Record<ExamTaskType, string>> = {
    practical_request: 'Be clear, polite, and complete the request in Dutch.',
    short_response: 'Answer the question directly in one or two focused sentences.',
    roleplay: 'Stay in role and respond as you would in the situation.',
    follow_up_response: 'React naturally and carry the conversation forward.',
    give_opinion: 'State your view and add at least one short reason.',
    justify_reason: 'Give a clear reason chain (claim → because → example).',
    compare_options: 'Weigh pros and cons briefly, then commit to a choice with justification.',
    describe_situation: 'Paint a clear picture: who, what, where, what next.',
    explain_process: 'Use clear order words (eerst, dan, tot slot).',
    storytelling: 'Keep time order clear and end with a small wrap-up.',
    sequencing: 'Put steps in order and say them out loud logically.',
    knowledge_mcq:
      'Answer the KNM question: sometimes one option is correct, sometimes several; images may be part of the question.',
    read_aloud_exam: 'Speak clearly; keep pace steady and pronounce endings.',
    listening_response_exam: 'Listen first, then answer in Dutch — stay close to what you heard.',
    listening_mcq_exam: 'Listen to the full dialogue, then pick the answer that fits best.',
    writing_task_exam: 'Match register (formal/informal) and keep sentences tight and complete.',
  }
  return byType[taskType] ?? 'Answer in natural Dutch, on-topic and complete.'
}

export function structurePatternLine(taskType: ExamTaskType): string | null {
  const map: Partial<Record<ExamTaskType, string>> = {
    practical_request: 'Pattern: greeting (optional) + request + “alstublieft” if fitting.',
    give_opinion: 'Pattern: “Ik vind … omdat …” (one reason).',
    justify_reason: 'Pattern: “Het belangrijkste is … Daarom …”',
    follow_up_response: 'Pattern: acknowledge + add one new piece of information.',
    compare_options: 'Pattern: A vs B → voordeel/nadeel → keuze.',
    explain_process: 'Pattern: eerst → dan → daarna → tot slot.',
  }
  return map[taskType] ?? null
}

function lowestDimensions(scores: Partial<Record<ExamScoringDimension, number>>, take = 2): ExamScoringDimension[] {
  const entries = Object.entries(scores) as [ExamScoringDimension, number][]
  entries.sort((a, b) => a[1] - b[1])
  return entries.slice(0, take).map(([k]) => k)
}

export function coachingFeedbackLines(params: {
  composite: number
  scores: Partial<Record<ExamScoringDimension, number>>
  support: ExamTrainingSupport
}): string[] {
  const v = coachingVerbosity(params.support)
  const weak = lowestDimensions(params.scores, v === 'full' ? 3 : 2)
  const lines: string[] = []
  if (params.composite >= 0.72) {
    lines.push('Strong attempt — keep this clarity under a timer next time.')
  } else if (params.composite >= 0.55) {
    lines.push('Good foundation — tighten structure and add one concrete detail.')
  } else {
    lines.push('Try a longer answer with clearer sentences and more task-specific vocabulary.')
  }
  if (weak.length && v !== 'minimal') {
    lines.push(`Focus next rep on: ${weak.join(', ')}.`)
  }
  if (v === 'full') {
    lines.push('Read the structure pattern on the next task before you write.')
  }
  return lines
}

export function buildCorrectedExampleNl(answer: string, taskType: ExamTaskType): string {
  const t = answer.trim()
  if (!t) return 'Schrijf minstens één volledige zin in het Nederlands, passend bij de opdracht.'
  if (t.length > 220) return `${t.slice(0, 220)}…`
  if (taskType === 'practical_request' && !/\b(alstublieft|mag ik|graag)\b/i.test(t)) {
    return `${t} Voeg desnoods “alstublieft” toe voor een natuurlijker verzoek.`
  }
  return `${t} — let op: nog één korte zin met een concrete detail maakt dit examensterker.`
}
