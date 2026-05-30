import { describe, expect, it } from 'vitest'
import { examDateToIso, examDateToIsoOrNull, parseExamJson } from './examJson'

describe('parseExamJson', () => {
  it('returns fallback on empty or invalid', () => {
    expect(parseExamJson(null, { a: 1 })).toEqual({ a: 1 })
    expect(parseExamJson('', [1])).toEqual([1])
    expect(parseExamJson('{', { ok: true })).toEqual({ ok: true })
  })

  it('parses valid JSON', () => {
    expect(parseExamJson('{"x":2}', {})).toEqual({ x: 2 })
  })
})

describe('examDateToIso', () => {
  it('formats Date and ISO strings', () => {
    expect(examDateToIso(new Date('2020-01-02T03:04:05.000Z'))).toBe('2020-01-02T03:04:05.000Z')
    expect(examDateToIso('2020-01-02T03:04:05.000Z')).toBe('2020-01-02T03:04:05.000Z')
    expect(examDateToIsoOrNull(null)).toBeNull()
  })
})
