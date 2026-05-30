export type GapSegment = { type: 'text'; value: string } | { type: 'gap' }

const GAP_TOKEN = /_{3,}/

export function textHasFillableGaps(text: string): boolean {
  return GAP_TOKEN.test(text)
}

/** Split copy into alternating text / gap markers (gaps shown as inputs in the UI). */
export function splitTextWithGaps(text: string): GapSegment[] {
  const parts = text.split(/(_{3,})/)
  const out: GapSegment[] = []
  for (const p of parts) {
    if (!p) continue
    if (GAP_TOKEN.test(p)) out.push({ type: 'gap' })
    else out.push({ type: 'text', value: p })
  }
  return out
}

export function countGaps(text: string): number {
  return (text.match(/_{3,}/g) ?? []).length
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/[.,!?;:]+$/, '')
}

/**
 * Best-effort expected answers per gap (null = any non-empty text counts as “tried”).
 */
export function inferExpectedAnswersForGaps(block: string): (string[] | null)[] {
  const n = countGaps(block)
  const out: (string[] | null)[] = Array.from({ length: n }, () => null)
  if (n === 0) return out

  if (/stem:\s*Ik\s*\*\*[^*]+\*\*/i.test(block) && n === 1) {
    const stemM = block.match(/stem:\s*Ik\s*\*\*([^*]+)\*\*/i)
    if (stemM?.[1]) out[0] = [norm(stemM[1])]
    return out
  }

  const hintM = block.match(/hint:\s*\*\*([^*]+)\*\*/i)
  if (hintM?.[1] && n === 1) {
    out[0] = [norm(hintM[1])]
    return out
  }

  if (/Met vriendelijke\s+_{3,}/i.test(block) && n === 1) {
    out[0] = ['groet', 'groeten']
    return out
  }

  if (/fietsen veel mensen,\s*_{3,}\s*het is plat/i.test(block) && n === 1) {
    out[0] = ['want', 'omdat']
    return out
  }

  return out
}

export function evaluateGapAnswers(
  values: string[],
  expected: (string[] | null)[]
): { allFilled: boolean; scoreLabel: 'ok' | 'partial' | 'unknown'; messages: string[] } {
  const messages: string[] = []
  let ok = 0
  let graded = 0

  for (let i = 0; i < values.length; i += 1) {
    const v = norm(values[i] ?? '')
    const exp = expected[i]
    if (!v) {
      messages.push(`Gap ${i + 1} is still empty.`)
      continue
    }
    if (exp && exp.length > 0) {
      graded += 1
      if (exp.some((e) => norm(e) === v)) {
        ok += 1
      } else {
        messages.push(`Gap ${i + 1}: try **${exp[0]}**${exp.length > 1 ? ` (or: ${exp.slice(1).join(', ')})` : ''}.`)
      }
    }
  }

  const allFilled = values.every((v) => norm(v).length > 0)
  if (!allFilled) {
    return { allFilled: false, scoreLabel: 'partial', messages }
  }
  if (graded === 0) {
    return {
      allFilled: true,
      scoreLabel: 'unknown',
      messages: ['All gaps filled — compare with your teacher or the phrase bank. (No auto-check for this item.)'],
    }
  }
  if (ok === graded) {
    return {
      allFilled: true,
      scoreLabel: 'ok',
      messages: ['All checked gaps match the model answer(s).'],
    }
  }
  return { allFilled: true, scoreLabel: 'partial', messages }
}
