/** Template distractors for meaning / usage MC when we have no LLM in the loop. */

const EN_MEANING_FOILS = [
  'It only means “goodbye” in formal letters.',
  'It is almost never used in spoken Dutch.',
  'It refers only to weather and temperature.',
  'It is strictly slang for “expensive”.',
  'It only describes food texture, not people or places.',
  'It is archaic — modern speakers avoid it.',
]

const USAGE_SITUATION_FOILS_EN = [
  'Only when you are writing a formal complaint email.',
  'Exclusively during sports commentary on television.',
  'When you are alone at home sorting recycling instructions.',
  'Strictly in academic essays about medieval history.',
  'When negotiating a car lease with technical jargon.',
  'During a passport interview when listing previous addresses.',
]

const NL_PHRASE_FOILS = [
  'Tot ziens, fijne dag verder.',
  'Mag ik het bonnetje, alstublieft?',
  'Waar is het dichtstbijzijnde toilet?',
  'Ik begrijp het nog niet helemaal.',
]

export function meaningDistractors(correctEn: string, count: number): string[] {
  const c = correctEn.trim().toLowerCase()
  const pool = EN_MEANING_FOILS.filter((x) => x.toLowerCase() !== c)
  const out: string[] = []
  let i = 0
  while (out.length < count && i < pool.length) {
    out.push(pool[i]!)
    i += 1
  }
  while (out.length < count) {
    out.push(EN_MEANING_FOILS[out.length % EN_MEANING_FOILS.length]!)
  }
  return out.slice(0, count)
}

export function usageSituationDistractors(correctEn: string, count: number): string[] {
  const c = correctEn.trim().toLowerCase()
  const pool = USAGE_SITUATION_FOILS_EN.filter((x) => x.toLowerCase() !== c)
  const out: string[] = []
  let i = 0
  while (out.length < count && i < pool.length) {
    out.push(pool[i]!)
    i += 1
  }
  while (out.length < count) {
    out.push(USAGE_SITUATION_FOILS_EN[out.length % USAGE_SITUATION_FOILS_EN.length]!)
  }
  return out.slice(0, count)
}

export function dutchPhraseFoil(lines: string[], count: number): string[] {
  const set = new Set(lines.map((x) => x.trim().toLowerCase()).filter(Boolean))
  const pool = NL_PHRASE_FOILS.filter((x) => !set.has(x.toLowerCase()))
  const out = [...pool]
  while (out.length < count) {
    out.push(NL_PHRASE_FOILS[out.length % NL_PHRASE_FOILS.length]!)
  }
  return out.slice(0, count)
}

/** Strip common exam-task labels accidentally pasted into captures (e.g. "Schrijven A2 …"). */
export function stripLeadingExamExerciseLabel(text: string): string {
  return text.replace(/^\s*(?:schrijven|spreken|luisteren|lezen)\s+[AB][12]\b\s*/iu, '').trimStart()
}

/**
 * Listening MC must use the exact same Dutch string for TTS and the keyed correct option.
 * Long lines are clipped at a word boundary so the clip and choices stay aligned.
 */
export function alignListeningPassageForMc(passage: string, maxLen = 280): string {
  const t = passage.replace(/\s+/g, ' ').trim()
  if (t.length <= maxLen) return t
  const slice = t.slice(0, maxLen)
  const lastSpace = slice.lastIndexOf(' ')
  return (lastSpace > 48 ? slice.slice(0, lastSpace) : slice).trim()
}

/**
 * Prefer other lines from the same capture as foils so “listen and pick” stays on-register;
 * fall back to {@link dutchPhraseFoil} for short pools.
 */
export function dutchListeningDistractors(correct: string, poolLines: readonly string[], count: number): string[] {
  const correctKey = correct.trim().toLowerCase()
  const taken = new Set<string>([correctKey])
  const out: string[] = []
  for (const raw of poolLines) {
    const line = raw.replace(/\s+/g, ' ').trim()
    if (line.length < 8) continue
    const key = line.toLowerCase()
    if (taken.has(key)) continue
    taken.add(key)
    out.push(line)
    if (out.length >= count) return out.slice(0, count)
  }
  const foilNeed = count - out.length
  if (foilNeed > 0) {
    out.push(...dutchPhraseFoil([correct, ...out], foilNeed))
  }
  return out.slice(0, count)
}

/** Deterministic shuffle so interactive packs stay stable across renders (reopen same pack). */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const a = [...items]
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  for (let i = a.length - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) >>> 0
    const j = h % (i + 1)
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}
