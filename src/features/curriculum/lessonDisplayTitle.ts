/**
 * Strip legacy “{Unit title} — …” prefixes when lessons are listed under that unit
 * (the accordion header already shows the unit name).
 */
export function lessonTitleInUnitContext(lessonTitle: string, unitTitle: string): string {
  const u = unitTitle.trim()
  if (!u) return lessonTitle
  for (const sep of [' — ', ' – ', ' - ']) {
    const prefix = `${u}${sep}`
    if (lessonTitle.startsWith(prefix)) return lessonTitle.slice(prefix.length).trim()
  }
  return lessonTitle
}
