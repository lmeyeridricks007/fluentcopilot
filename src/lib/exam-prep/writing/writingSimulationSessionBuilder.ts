/**
 * Fixed A2 writing exam simulation: 1 form → 2 messages → 1 text for everyone.
 *
 * @see docs/product/exam-prep-architecture.md
 */
import { getWritingTrainingTaskById, listWritingTasksBySubtype } from '@/lib/exam-prep/writing/writingTaskBuilder'
import type { WritingTrainingItem } from '@/lib/schemas/exam/writingTrainingItem.schema'

export const WRITING_SIMULATION_TASK_COUNT = 4

/** DUO-oriented total: 40 minutes pooled across four tasks (weights below sum to 40 min). */
export const WRITING_SIMULATION_TOTAL_DURATION_SEC = 40 * 60
export const WRITING_SIMULATION_SECONDS_FORM = 8 * 60
export const WRITING_SIMULATION_SECONDS_MESSAGE = 11 * 60
export const WRITING_SIMULATION_SECONDS_TEXT_AUDIENCE = 10 * 60

const _sum =
  WRITING_SIMULATION_SECONDS_FORM +
  WRITING_SIMULATION_SECONDS_MESSAGE +
  WRITING_SIMULATION_SECONDS_MESSAGE +
  WRITING_SIMULATION_SECONDS_TEXT_AUDIENCE
if (_sum !== WRITING_SIMULATION_TOTAL_DURATION_SEC) {
  throw new Error('Writing simulation per-part seconds must sum to WRITING_SIMULATION_TOTAL_DURATION_SEC')
}

export function durationSecForWritingSimulationItem(item: WritingTrainingItem): number {
  switch (item.subtype) {
    case 'form':
      return WRITING_SIMULATION_SECONDS_FORM
    case 'message':
      return WRITING_SIMULATION_SECONDS_MESSAGE
    case 'text_to_audience':
      return WRITING_SIMULATION_SECONDS_TEXT_AUDIENCE
    default:
      return WRITING_SIMULATION_SECONDS_MESSAGE
  }
}

export type WritingSimulationPlanTask = {
  /** 0-based */
  index: number
  /** e.g. Task 1 of 4 */
  progressCurrent: number
  progressTotal: number
  /** Short exam part label */
  partLabelNl: string
  durationSec: number
  item: WritingTrainingItem
}

export type WritingSimulationSessionPlan = {
  sessionId: string
  /** Seed used to draw tasks from the bank (`0` for fixed practice exams). */
  seed: number
  taskCount: number
  tasks: WritingSimulationPlanTask[]
  titleNl: string
  subtitleNl: string
  /** Total session seconds (sum of per-part budgets; one global exam clock). */
  totalDurationSec: number
}

function newSessionId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `w-sim-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function pickDistinctMessages(seed: number): [WritingTrainingItem, WritingTrainingItem] {
  const messages = listWritingTasksBySubtype('message')
  if (messages.length < 2) {
    throw new Error('Writing bank needs at least 2 message tasks for simulation')
  }
  const i0 = Math.abs(Math.floor(Math.sin(seed + 11) * 10000)) % messages.length
  const i1 = (i0 + 1) % messages.length
  return [messages[i0]!, messages[i1]!]
}

/**
 * Builds the fixed four-part exam. `seed` rotates concrete tasks from the training bank.
 */
export function buildWritingSimulationSessionPlan(seed: number = Date.now()): WritingSimulationSessionPlan {
  const forms = listWritingTasksBySubtype('form')
  const audiences = listWritingTasksBySubtype('text_to_audience')
  if (forms.length === 0) throw new Error('No form tasks in writing bank')
  if (audiences.length === 0) throw new Error('No text_to_audience tasks in writing bank')

  const formItem = forms[Math.abs(Math.floor(Math.sin(seed + 3) * 10000)) % forms.length]!
  const [msgA, msgB] = pickDistinctMessages(seed)
  const audienceItem = audiences[Math.abs(Math.floor(Math.sin(seed + 29) * 10000)) % audiences.length]!

  const items: { partLabelNl: string; item: WritingTrainingItem }[] = [
    { partLabelNl: 'Formulier', item: formItem },
    { partLabelNl: 'Bericht', item: msgA },
    { partLabelNl: 'Bericht', item: msgB },
    { partLabelNl: 'Tekst voor iedereen', item: audienceItem },
  ]

  const tasks: WritingSimulationPlanTask[] = items.map((row, index) => ({
    index,
    progressCurrent: index + 1,
    progressTotal: WRITING_SIMULATION_TASK_COUNT,
    partLabelNl: row.partLabelNl,
    durationSec: durationSecForWritingSimulationItem(row.item),
    item: row.item,
  }))
  const totalDurationSec = tasks.reduce((acc, t) => acc + t.durationSec, 0)

  return {
    sessionId: newSessionId(),
    seed,
    taskCount: tasks.length,
    tasks,
    titleNl: 'Schrijfexamen (simulatie A2)',
    subtitleNl:
      'Vier opdrachten achter elkaar, zoals op het examen: formulier, twee berichten, één algemene tekst. Geen uitleg of modelantwoord tussendoor — alleen aan het eind een volledig rapport.',
    totalDurationSec,
  }
}

/** Fixed practice exam: form → two messages → audience, by stable training item ids. */
export function buildWritingSimulationPlanFromItemIds(
  ids: readonly [string, string, string, string],
  titleNl: string,
  subtitleNl: string
): WritingSimulationSessionPlan {
  const labels: string[] = ['Formulier', 'Bericht', 'Bericht', 'Tekst voor iedereen']
  const items = ids.map((id, index) => {
    const item = getWritingTrainingTaskById(id)
    if (!item) throw new Error(`Writing practice exam: unknown task id ${id}`)
    return { partLabelNl: labels[index]!, item }
  })
  const tasks: WritingSimulationPlanTask[] = items.map((row, index) => ({
    index,
    progressCurrent: index + 1,
    progressTotal: WRITING_SIMULATION_TASK_COUNT,
    partLabelNl: row.partLabelNl,
    durationSec: durationSecForWritingSimulationItem(row.item),
    item: row.item,
  }))
  const totalDurationSec = tasks.reduce((acc, t) => acc + t.durationSec, 0)
  return {
    sessionId: newSessionId(),
    seed: 0,
    taskCount: tasks.length,
    tasks,
    titleNl,
    subtitleNl,
    totalDurationSec,
  }
}
