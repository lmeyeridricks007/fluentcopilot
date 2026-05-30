/** Relative “last worked” line for exam-prep surfaces (NL). */
export function formatExamLastWorkedNl(iso: string, now = new Date()): string {
  const d = new Date(iso)
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000)
  if (diffDays === 0) return 'Laatst gewerkt: vandaag'
  if (diffDays === 1) return 'Laatst gewerkt: gisteren'
  if (diffDays > 1 && diffDays < 7) return `Laatst gewerkt: ${diffDays} dagen geleden`
  return `Laatst gewerkt: ${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}`
}
