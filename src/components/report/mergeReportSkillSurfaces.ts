import type { ReportLearningMemoryRibbon, ReportMemorySurfaces } from '@/lib/api/apiTypes'

export type MergedReportSkillSurface = {
  kicker: string
  body: string
  tone: 'neutral' | 'growth'
}

function normKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 96)
}

function bodyOverlapsExisting(body: string, existing: MergedReportSkillSurface[]): boolean {
  const nb = normKey(body)
  if (!nb) return true
  for (const row of existing) {
    const na = normKey(row.body)
    if (!na) continue
    if (na === nb) return true
    const pref = 26
    if (na.slice(0, pref) === nb.slice(0, pref)) return true
    if (na.length >= 18 && nb.length >= 18 && (na.includes(nb.slice(0, 20)) || nb.includes(na.slice(0, 20)))) return true
  }
  return false
}

function pushUnique(
  out: MergedReportSkillSurface[],
  kicker: string,
  body: string,
  tone: 'neutral' | 'growth',
  max: number,
): void {
  const t = body.trim()
  if (!t || out.length >= max) return
  if (bodyOverlapsExisting(t, out)) return
  out.push({ kicker, body: t, tone })
}

/**
 * Merges ribbon surfaces, skill insight lines, and next-step into **at most `max`**
 * non-redundant rows for report UIs (Speak Live, Coach, Read aloud).
 */
export function mergeReportSkillSurfaces(ribbon: ReportLearningMemoryRibbon, max = 3): MergedReportSkillSurface[] {
  const out: MergedReportSkillSurface[] = []
  const s: ReportMemorySurfaces | null | undefined = ribbon.surfaces

  /** Session echo first so the top row is what you just practiced, not generic continuity copy. */
  if (out.length < max && s?.sessionEcho?.trim()) {
    pushUnique(out, 'This session', s.sessionEcho.trim(), 'neutral', max)
  }

  if (ribbon.nextStep?.subtitle?.trim()) {
    const title = ribbon.nextStep.title?.trim() || 'Best next step'
    pushUnique(out, title, ribbon.nextStep.subtitle.trim(), 'neutral', max)
  }

  const insights = ribbon.skillInsights ?? []
  for (let i = 0; i < insights.length && out.length < max; i++) {
    const line = insights[i]
    if (!line?.trim()) continue
    const kicker = i === 0 ? 'Your trajectory' : 'Momentum'
    pushUnique(out, kicker, line, 'growth', max)
  }

  if (out.length < max && s?.improving?.trim()) {
    pushUnique(out, 'On the rise', s.improving.trim(), 'growth', max)
  }
  if (out.length < max && s?.currentFocus?.trim()) {
    pushUnique(out, 'Working on', s.currentFocus.trim(), 'neutral', max)
  }
  if (out.length < max && s?.recurringPattern?.trim()) {
    pushUnique(out, 'Across sessions', s.recurringPattern.trim(), 'neutral', max)
  }

  if (out.length < max && (ribbon.lines?.length ?? 0) > 0) {
    const kickers = ['From recent practice', 'Also worth noting', 'Continuity']
    let i = 0
    for (const line of ribbon.lines ?? []) {
      if (out.length >= max) break
      pushUnique(out, kickers[Math.min(i, kickers.length - 1)]!, line, 'neutral', max)
      i += 1
    }
  }

  return out.slice(0, max)
}

export function mergedSkillSurfacesHaveContent(
  ribbon: ReportLearningMemoryRibbon,
  merged: MergedReportSkillSurface[],
): boolean {
  if (merged.length > 0) return true
  if (ribbon.confidenceNote?.trim()) return true
  return Boolean(ribbon.nextPractice?.href?.trim())
}
