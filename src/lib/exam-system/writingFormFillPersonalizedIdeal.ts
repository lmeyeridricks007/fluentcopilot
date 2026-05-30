import { synthesizeWritingReportExampleForTask } from './a2WritingExamSynthesizedExamples'
import {
  effectiveWritingFormBullets,
  extractWritingFormSlotBodies,
  isPlausibleFormFillSlotContent,
  writingExamTaskLooksFormFill,
} from './writingExamFillInCompose'
import { isWritingExamGibberish } from './scoringEngine'
import type { ExamTaskInstance } from './types'

/** Fix common A2 mistakes in a damage-report sentence while keeping the learner’s story. */
export function idealizeDamageNarrativeSlot(userBody: string): string {
  const t = userBody.trim()
  const hasNeighbor = /\bbuurman|buurvrouw|buur\b/i.test(t)
  const hasWall = /\bmuur\b/i.test(t)
  const hasVehicle = /\bauto|bus|fiets|scooter|voertuig\b/i.test(t)

  let when = 'gisteren'
  const whenMatch = t.match(
    /\b(gisteren|vandaag|eergisteren|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|\d{1,2}[-/.]\d{1,2}(?:[-/.]\d{2,4})?)\b/i,
  )
  if (whenMatch?.[1]) when = whenMatch[1].toLowerCase()

  if (hasNeighbor && hasWall && (hasVehicle || /\b(tegen|gereden|gerijden|aangereden)\b/i.test(t))) {
    return `Mijn buurman heeft met zijn auto tegen mijn muur gereden. Dit gebeurde ${when}. Mijn muur is nu beschadigd.`
  }

  let fixed = t
    .replace(/\bheb\s+(zijn|haar|hun|uw|de|het)\b/gi, 'heeft $1')
    .replace(/\bteen\b/gi, 'tegen')
    .replace(/\bmij\s+muur\b/gi, 'mijn muur')
    .replace(/\bgerijden\b/gi, 'gereden')
    .replace(/\s+/g, ' ')
    .trim()

  if (fixed && !/[.!?]$/.test(fixed)) fixed += '.'
  const sentences = fixed.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (sentences.length < 2 && fixed.length >= 8) {
    return `${fixed} Dit gebeurde ${when}.`
  }
  return fixed || `Mijn buurman heeft met zijn auto tegen mijn muur gereden. Dit gebeurde ${when}. Mijn muur is nu beschadigd.`
}

function idealizeSlotBody(label: string, userBody: string, task: ExamTaskInstance, allBullets: string[]): string {
  const labelLow = label.toLowerCase()
  const body = userBody.trim()

  if (/\bgebeurd|schade|wanneer|twee korte/i.test(labelLow)) {
    return idealizeDamageNarrativeSlot(body)
  }

  if (/\bnaam|voor- en achternaam|achternaam\b/i.test(labelLow) && body.length >= 3 && !isWritingExamGibberish(body)) {
    return body
  }

  if (/\bpolis/i.test(labelLow) && (isPlausibleFormFillSlotContent(label, body) || (body.length >= 3 && !isWritingExamGibberish(body)))) {
    return body
  }

  if (/\bbibli|reden|motiv/i.test(labelLow) && body.length >= 6 && !isWritingExamGibberish(body)) {
    if (body.length < 20 && /\b(lees|lezen|boek)\b/i.test(body)) {
      return 'Ik wil graag boeken lenen om mijn Nederlands te oefenen.'
    }
    return body
  }

  if (body.length >= 2 && !isWritingExamGibberish(body)) return body

  const generic = synthesizeWritingReportExampleForTask({
    ...task,
    writingFillInBulletsNl: allBullets,
  })
  const genericSlots = extractWritingFormSlotBodies(generic.text, allBullets)
  const idx = allBullets.indexOf(label)
  return (idx >= 0 ? genericSlots[idx] : genericSlots[0])?.trim() || body
}

/**
 * Build a sample answer that keeps the learner’s situation but shows ideal A2 Dutch per field.
 */
export function personalizeWritingFormFillIdealAnswer(
  task: ExamTaskInstance,
  userAnswer: string,
): { text: string; isPersonalized: boolean } {
  if (task.taskType !== 'writing_task_exam' || !writingExamTaskLooksFormFill(task, userAnswer)) {
    const syn = synthesizeWritingReportExampleForTask(task)
    return { text: syn.text, isPersonalized: false }
  }

  const bullets = effectiveWritingFormBullets(task, userAnswer)
  if (!bullets.length) {
    const syn = synthesizeWritingReportExampleForTask(task)
    return { text: syn.text, isPersonalized: false }
  }

  const slots = extractWritingFormSlotBodies(userAnswer, bullets)
  const hasUserContent = slots.some((s) => s.trim().length >= 2 && !isWritingExamGibberish(s))
  if (!hasUserContent) {
    const syn = synthesizeWritingReportExampleForTask(task)
    return { text: syn.text, isPersonalized: false }
  }

  const blocks = bullets.map((label, i) => {
    const ideal = idealizeSlotBody(label, slots[i] ?? '', task, bullets)
    return `${label}:\n${ideal}`
  })

  return { text: blocks.join('\n\n'), isPersonalized: true }
}
