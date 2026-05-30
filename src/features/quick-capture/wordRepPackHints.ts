/**
 * Shared helpers for richer “word of the day” steps in From your day packs.
 * Kept framework-free so the backend pack builder can mirror the same logic.
 */

export type WordPackHints = {
  meaningEn: string | null
  usageWhenEn: string | null
  exampleLinesNl: string[]
}

const READ_ALOUD_MIN_CHARS = 48

export function extractWordPackHints(
  enrichedJson: string | null | undefined,
  bodySecondary: string | null | undefined,
  primary: string,
): WordPackHints {
  let meaningEn: string | null = null
  let usageWhenEn: string | null = null
  const exampleLinesNl: string[] = []
  const w = primary.trim()
  if (enrichedJson?.trim()) {
    try {
      const j = JSON.parse(enrichedJson) as Record<string, unknown>
      const gloss = typeof j.englishGloss === 'string' ? j.englishGloss.trim() : ''
      const lm = typeof j.likelyMeaning === 'string' ? j.likelyMeaning.trim() : ''
      meaningEn = gloss || lm || null
      const scen = typeof j.likelyScenario === 'string' ? j.likelyScenario.trim() : ''
      const place = typeof j.likelyPlaceType === 'string' ? j.likelyPlaceType.trim() : ''
      const bits = [scen, place].filter(Boolean)
      if (bits.length) usageWhenEn = bits.join(' · ')
      const canon = typeof j.dutchCanonical === 'string' ? j.dutchCanonical.trim() : ''
      if (canon && w && canon.toLowerCase() !== w.toLowerCase()) {
        exampleLinesNl.push(`Je hoort ook wel: ${canon} — in dezelfde buurt als “${w}”.`)
      }
    } catch {
      /* ignore */
    }
  }
  const where = bodySecondary?.trim()
  if (!usageWhenEn && where) usageWhenEn = `You linked this capture to: ${where}`

  if (w) {
    if (exampleLinesNl.length < 3) exampleLinesNl.push(`Het was zo ${w} op het feest.`)
    if (exampleLinesNl.length < 3) exampleLinesNl.push(`Ik vond de sfeer heel ${w}, en jij?`)
    if (exampleLinesNl.length < 3) exampleLinesNl.push(`Wil je mee? Het wordt vast weer ${w}.`)
  }
  return { meaningEn, usageWhenEn, exampleLinesNl: exampleLinesNl.slice(0, 3) }
}

export function buildWordRepExercisePrompt(word: string, lines: string[]): string {
  const w = word.trim()
  const examples =
    lines.length > 0
      ? `\n\nExample lines — read each silently once, then say it aloud once:\n${lines.map((l) => `– ${l}`).join('\n')}`
      : ''
  return (
    `Work through each beat in order. Check the step only after you have actually said or written something out loud or on paper — not when you “sort of thought about it”.${examples}\n\n` +
    `1) Listen — whisper “${w}”, then say it at a clear speaking volume twice.\n` +
    `2) Pronounce — split the word into syllables if it helps; stress the vowels once slowly, then say it naturally twice.\n` +
    `3) Speak — invent a brand-new Dutch sentence with “${w}” (different wording from the examples).\n` +
    `4) Write — write that sentence down; fix one spelling or word order tweak if needed.`
  )
}

export function buildListeningBurstText(word: string, lines: string[]): string {
  const w = word.trim()
  return (lines[0] ?? `Ik vond de avond heel ${w} — en jij?`).slice(0, 400)
}

export function buildReadAloudPassageForWord(word: string, lines: string[], usageWhenEn: string | null): string {
  const w = word.trim()
  const ex = lines.slice(0, 2).join(' ')
  const ctx = usageWhenEn?.trim() ? ` Context you noted: ${usageWhenEn.trim()}.` : ''
  let body = `Vandaag oefen je het woord “${w}”. ${ex}${ctx}\n\n`
  body +=
    `Lees de zinnen hierboven hardop. Let op hoe je "${w}" aan het begin en in het midden van een zin uitspreekt. ` +
    `Sluit af met één eigen zin (hardop) waarin je het woord opnieuw gebruikt — anders dan in de voorbeelden.`
  if (body.length < READ_ALOUD_MIN_CHARS) {
    body +=
      `\n\nExtra leesritme: tel langzaam tot drie tussen elke zin, en spreek "${w}" telkens iets duidelijker uit. ` +
      `Dit helpt je hersenen het woord te koppelen aan een warme, sociale situatie — precies waar je het later wilt gebruiken.`
  }
  return body.slice(0, 1100)
}
