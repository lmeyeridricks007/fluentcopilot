import { describe, expect, it } from 'vitest'
import { splitReadingExamMcqPrompt } from '../readingExamMcqPromptSplit'

describe('splitReadingExamMcqPrompt', () => {
  it('splits Dutch source block from exam question using typographic quotes', () => {
    const nl = `Lees deze e-mail.

“Beste mevrouw Jansen, uw pakket wordt morgen bezorgd.”

Wanneer wordt het pakket bezorgd?`
    const passageEn = 'Dear Ms Jansen, your parcel will be delivered tomorrow.'
    const r = splitReadingExamMcqPrompt(nl, 'Read the email. When will the parcel be delivered?', passageEn)
    expect(r).not.toBeNull()
    expect(r!.questionNl).toBe('Wanneer wordt het pakket bezorgd?')
    expect(r!.sourceBlockNl).toContain('Lees deze e-mail')
    expect(r!.sourceBlockNl).toContain('Beste mevrouw Jansen')
    expect(r!.sourceHintEn).toBe('Read the email.')
    expect(r!.passageEn).toBe(passageEn)
    expect(r!.questionEn).toBe('When will the parcel be delivered?')
  })

  it('returns null when typographic quote pattern is missing', () => {
    expect(splitReadingExamMcqPrompt('Geen aanhalingstekens hier.\n\nVraag?', 'No quotes.')).toBeNull()
  })
})
